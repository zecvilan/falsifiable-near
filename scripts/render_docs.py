#!/usr/bin/env python3
"""Regenerate the numbers in THESIS.md and README.md from data/public.json.

Only text between `<!-- auto:NAME -->` and `<!-- /auto:NAME -->` markers is
rewritten; everything else in the documents is hand-written prose.

    python scripts/render_docs.py          # rewrite the documents
    python scripts/render_docs.py --check  # exit 1 if they are stale (CI)
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "data" / "public.json"
DOCUMENTS = [ROOT / "THESIS.md", ROOT / "README.md"]
HORIZON_YEARS = 5
RESULT_LABEL = {"pass": "Pass", "fail": "Fail", "inconclusive": "Inconclusive", "insufficient_data": "Insufficient data"}


# ---------------------------------------------------------------- formatting


def usd(value: float | None) -> str:
    if value is None:
        return "n/a"
    for size, suffix, digits in ((1e9, "B", 1), (1e6, "M", 1), (1e3, "k", 0)):
        if abs(value) >= size:
            scaled = value / size
            if suffix == "M" and abs(scaled) < 10:
                digits = 2 if abs(scaled) < 2 else 1
            return f"${scaled:.{digits}f}{suffix}"
    return f"${value:.2f}"


def count(value: float | None) -> str:
    if value is None:
        return "n/a"
    if abs(value) >= 1e6:
        return f"{value / 1e6:.2f}M"
    if abs(value) >= 1e3:
        return f"{value / 1e3:.0f}k"
    return f"{value:.0f}"


def times(value: float | None) -> str:
    return "n/a" if value is None else f"{value:.2f}×"


def pct(value: float | None, digits: int = 0) -> str:
    return "n/a" if value is None else f"{value * 100:.{digits}f}%"


def signed_pct(value: float | None) -> str:
    return "n/a" if value is None else f"{value * 100:+.0f}%".replace("-", "−")


# ---------------------------------------------------------------- model (mirrors lib/model.ts)


def project(base: dict, growth: float, take_bps: float, issuance: float, burn_growth: float) -> list[float]:
    take = take_bps / 10_000
    supply = base["total_supply_near"]
    coverage = []
    for year in range(HORIZON_YEARS + 1):
        volume = base["intents_volume_usd_annual"] * (1 + growth) ** year
        burn = base["burn_usd_annual"] * (1 + burn_growth) ** year
        issuance_value = supply * issuance * base["price_usd"]
        coverage.append((volume * take + burn) / issuance_value if issuance_value > 0 else float("inf"))
        supply *= 1 + issuance
    return coverage


def break_even(base: dict, take_bps: float, issuance: float, burn_growth: float) -> float | None:
    at = lambda g: project(base, g, take_bps, issuance, burn_growth)[HORIZON_YEARS]  # noqa: E731
    if at(-0.99) >= 1:
        return -0.99
    if at(20) < 1:
        return None
    low, high = -0.99, 20.0
    for _ in range(80):
        mid = (low + high) / 2
        low, high = (low, mid) if at(mid) >= 1 else (mid, high)
    return high


# ---------------------------------------------------------------- blocks


def by_id(snapshot: dict) -> dict[str, dict]:
    return {t["id"]: t for t in snapshot["tests"]}


def result_word(test: dict) -> str:
    return RESULT_LABEL.get(test["result"], test["result"])


def test_value(test: dict) -> str:
    if test["value"] is None:
        return "n/a"
    return times(test["value"]) if test["unit"] == "x" else f"{test['value']:.3f}"


def block_status(s: dict) -> str:
    tests = s["tests"]
    passed = sum(t["result"] == "pass" for t in tests)
    pre = s.get("preregistration", {})
    sample = "in-sample" if not pre.get("out_of_sample") else "out-of-sample"
    return (
        f"**Status:** Open hypothesis, {passed} of {len(tests)} tests pass on the latest snapshot "
        f"({sample} for the thresholds frozen at `{pre.get('thresholds_tag', 'n/a')}`). Not an investment recommendation.  \n"
        "**Horizon:** 3–5 years.  \n"
        f"**Evidence snapshot:** data as of {s['asOf']}, `data/public.json`. The numbers in this document are generated "
        "from that file by `make docs`, so they cannot drift from the dashboard."
    )


def block_evidence(s: dict) -> str:
    m, t, ll = s["metrics"], by_id(s), s["leadLag"]
    best = ll.get("best_leading") or {}
    rows = [
        ("Demand", f"Intents swap volume: **{usd(m['intents_volume_usd_1y'])}** over 12 months; trailing-90d volume **{times(m['intents_volume_yoy_90d'])}** the same window a year ago and **{times(m['intents_volume_qoq_90d'])}** the prior 90d", t["T1"]),
        ("Monetisation", f"Captured Intents revenue: **{usd(m['intents_holders_revenue_usd_90d'])}** in the last 90d, **{times(m['intents_holders_revenue_qoq_90d'])}** the prior 90d; annualised **≈{usd(m['intents_holders_revenue_annualized_90d'])}**. Effective take rate **≈{m['intents_take_rate_90d'] * 10_000:.2f} bps** of volume. Directed to open-market NEAR buybacks since 2026-02-23", t["T2"]),
        ("Base-layer adoption", f"Avg daily active accounts **{count(m['active_accounts_avg_90d'])}** vs **{count(m['active_accounts_avg_90d_yoy'])}** a year earlier (**{signed_pct(m['active_accounts_yoy_ratio'] - 1)}**); daily transactions **{count(m['txns_avg_90d'])}** vs **{count(m['txns_avg_90d_yoy'])}** (**{signed_pct(m['txns_yoy_ratio'] - 1)}**)", t["T3"]),
        ("Activity quality", f"Gas fees per active account **{times(m['gas_fees_per_active_account_yoy_ratio'])}** year over year", t["T4"]),
        ("Value accrual", f"Gross issuance **{m['gross_issuance_near_1y'] / 1e6:.1f}M NEAR/yr ({pct(m['gross_issuance_rate_1y'], 2)})** ≈ **{usd(m['issuance_value_usd_annual'])}** at ${m['price_usd_7d']:.2f}. Holder value (buybacks + 70% gas burn) ≈ **{usd(m['intents_holders_revenue_annualized_90d'] + m['burn_usd_annualized_90d'])}/yr**. Coverage **{times(m['value_accrual_coverage_90d'])}**", t["T5"]),
        ("Market signal", f"Weekly lead/lag of Intents volume vs NEAR price, lags 1–4w: best r = **{best.get('r', 'n/a')}** vs Bonferroni critical **{ll.get('critical_r')}** ({ll.get('weeks')} weeks)", t["T6"]),
    ]
    lines = ["| Pillar | Evidence (trailing windows) | Test |", "| --- | --- | --- |"]
    lines += [f"| **{pillar}** | {evidence} | {test['id']} **{result_word(test)}** |" for pillar, evidence, test in rows]
    return "\n".join(lines)


def block_tests(s: dict) -> str:
    lines = ["| ID | Claim | Metric | Rule | Value | Result |", "| --- | --- | --- | --- | --- | --- |"]
    for t in s["tests"]:
        lines.append(f"| {t['id']} | {t.get('claim', t['pillar'])} | {t['metric']} | {t['rule']} | {test_value(t)} | **{result_word(t)}** |")
    pre = s.get("preregistration")
    if pre:
        lines += ["", f"Thresholds `sha256:{pre['thresholds_sha256'][:16]}…` at tag `{pre['thresholds_tag']}`, frozen {pre['frozen_on']}."]
    return "\n".join(lines)


def block_model(s: dict) -> str:
    base, m = s["model"], s["metrics"]
    take = round(base["intents_take_rate"] * 10_000 * 4) / 4
    issuance = base["issuance_rate"]
    scenarios = [
        ("Bear", "volume flat, measured take", 0.0, take, 0.0),
        ("Base", "+50%/yr volume, measured take, burn +10%/yr", 0.5, take, 0.1),
        ("Bull", "+100%/yr volume, take 6 bps, burn +20%/yr", 1.0, 6.0, 0.2),
    ]
    lines = [
        f"- `V0` annualised trailing-90d Intents volume ({usd(base['intents_volume_usd_annual'])}), `take` measured holder take rate ({take:.2f} bps), `B0` annualised gas burn ({usd(base['burn_usd_annual'])})",
        f"- `S0` total supply ({base['total_supply_near'] / 1e9:.2f}B NEAR), `i` gross issuance rate ({pct(issuance, 2)}), `P` 7-day average price (${base['price_usd']:.2f}), **held constant on purpose**",
        "",
        "| Scenario | Inputs | Coverage Y0 → Y5 | Crosses 1.0× |",
        "| --- | --- | --- | --- |",
    ]
    for name, desc, growth, take_bps, burn_growth in scenarios:
        cov = project(base, growth, take_bps, issuance, burn_growth)
        cross = next((y for y in range(1, HORIZON_YEARS + 1) if cov[y] >= 1), None)
        lines.append(f"| {name} | {desc} | {cov[0]:.2f} → {cov[-1]:.2f} | {f'Year {cross}' if cross else 'Never'} |")
    be = break_even(base, take, issuance, 0.1)
    trailing = (m.get("intents_volume_yoy_90d") or 1) - 1
    be_text = f"≈{be * 100:.0f}%/yr" if be is not None else "more than 2,000%/yr"
    lines += [
        "",
        f"**Break-even:** at the measured take rate and issuance (burn +10%/yr), Intents volume must grow **{be_text}** for five years "
        f"to reach coverage 1.0× by year 5. The trailing year-over-year growth rate is ≈{trailing * 100:.0f}%.",
    ]
    return "\n".join(lines)


def block_readme_results(s: dict) -> str:
    lines = [f"## Result (snapshot {s['asOf']})", "", "| | Claim | Value | Result |", "| --- | --- | --- | --- |"]
    for t in s["tests"]:
        lines.append(f"| {t['id']} | {t.get('claim', t['name'])} | {test_value(t)} | {result_word(t)} |")
    hist = s.get("history") or []
    if hist:
        lines += ["", f"**Track record:** {len(hist)} weekly gradings with the same rules, {hist[0]['passed']}/6 on {hist[0]['asOf']} → {hist[-1]['passed']}/6 on {hist[-1]['asOf']}. "
                  f"{(n_oos := sum(not p['in_sample'] for p in hist))} of them {'is' if n_oos == 1 else 'are'} out-of-sample; the rest are backfilled and descriptive."]
    pre = s.get("preregistration")
    if pre:
        sample = "out-of-sample" if pre.get("out_of_sample") else f"in-sample (the thresholds were set after seeing the {pre['in_sample_snapshot']} snapshot)"
        lines += ["", f"Graded with thresholds frozen at tag `{pre['thresholds_tag']}`; this snapshot is {sample}."]
    return "\n".join(lines)


BLOCKS = {
    "status": block_status,
    "evidence": block_evidence,
    "tests": block_tests,
    "model": block_model,
    "readme-results": block_readme_results,
}


def render(text: str, snapshot: dict) -> str:
    def replace(match: re.Match) -> str:
        name = match.group(1)
        if name not in BLOCKS:
            raise KeyError(f"unknown auto block: {name}")
        return f"<!-- auto:{name} -->\n{BLOCKS[name](snapshot)}\n<!-- /auto:{name} -->"

    return re.sub(r"<!-- auto:([\w-]+) -->.*?<!-- /auto:\1 -->", replace, text, flags=re.S)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="Exit 1 if any document is out of date.")
    args = parser.parse_args()
    snapshot = json.loads(SNAPSHOT.read_text())
    stale = []
    for path in DOCUMENTS:
        current = path.read_text()
        updated = render(current, snapshot)
        if updated != current:
            stale.append(path.name)
            if not args.check:
                path.write_text(updated)
    if args.check and stale:
        print(f"Out of date: {', '.join(stale)}. Run `make docs`.", file=sys.stderr)
        return 1
    print(f"{'Checked' if args.check else 'Rendered'} {', '.join(p.name for p in DOCUMENTS)} from {SNAPSHOT.name} (as of {snapshot['asOf']}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
