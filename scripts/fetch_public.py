#!/usr/bin/env python3
"""Rebuild data/public.json from keyless public sources (NearBlocks + DefiLlama).

Standard library only. Anyone can re-run it:

    python scripts/fetch_public.py            # default 730-day window
    python scripts/fetch_public.py --days 365

Every number shown on the dashboard is derived here, and every test is evaluated here (thresholds frozen at tag thresholds-v1), so the website only renders this file.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "public.json"
YOCTO = 1e24

SOURCES = {
    "nearblocks_charts": "https://api.nearblocks.io/v1/charts",
    "llama_chain_fees": "https://api.llama.fi/summary/fees/near?dataType=dailyFees",
    "llama_chain_burn": "https://api.llama.fi/summary/fees/near?dataType=dailyRevenue",
    "llama_intents_volume": "https://api.llama.fi/summary/dexs/near-intents?dataType=dailyVolume",
    "llama_intents_fees": "https://api.llama.fi/summary/fees/near-intents?dataType=dailyFees",
    "llama_intents_holders_revenue": "https://api.llama.fi/summary/fees/near-intents?dataType=dailyHoldersRevenue",
}


# ---------------------------------------------------------------- thresholds
#
# Frozen. These were chosen after the author had seen the 2026-11-12 snapshot,
# so results on that snapshot are in-sample. They were frozen at git tag
# `thresholds-v1`; every later rebuild is graded with exactly these numbers,
# and test_thresholds_are_frozen fails CI if any of them change.

THRESHOLDS: dict[str, dict[str, float]] = {
    "T1": {"pass_at": 1.50, "fail_below": 1.00},
    "T2": {"pass_at": 1.10, "fail_below": 0.90},
    "T3": {"pass_at": 0.90, "fail_below": 0.75},
    "T4": {"pass_at": 1.00, "fail_below": 0.80},
    "T5": {"pass_at": 1.00, "fail_below": 0.25},
    "T6": {"max_lag_weeks": 4, "bonferroni_z": 2.50},
}
THRESHOLDS_TAG = "thresholds-v1"
THRESHOLDS_FROZEN_ON = "2026-11-14"
IN_SAMPLE_SNAPSHOT = "2026-11-12"


def thresholds_sha256() -> str:
    canonical = json.dumps(THRESHOLDS, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


def rule_text(test_id: str) -> str:
    t = THRESHOLDS[test_id]
    return f"pass ≥ {t['pass_at']:.2f}x · fail < {t['fail_below']:.2f}x · otherwise inconclusive"


def grade_test(test_id: str, value: float | None) -> str:
    t = THRESHOLDS[test_id]
    return grade(value, t["pass_at"], t["fail_below"])


# ---------------------------------------------------------------- fetching


def fetch_json(url: str, attempts: int = 3) -> object:
    request = Request(url, headers={"Accept": "application/json", "User-Agent": "near-thesis/1.0"})
    for attempt in range(attempts):
        try:
            with urlopen(request, timeout=60) as response:
                return json.loads(response.read())
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
            if attempt == attempts - 1:
                raise RuntimeError(f"{url}: {error}") from error
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"{url}: unreachable")


def llama_series(payload: object) -> dict[str, float]:
    chart = payload.get("totalDataChart", []) if isinstance(payload, dict) else []
    out: dict[str, float] = {}
    for ts, value in chart:
        day = datetime.fromtimestamp(int(ts), tz=timezone.utc).date().isoformat()
        out[day] = float(value)
    return out


def to_float(value: object) -> float | None:
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


# ---------------------------------------------------------------- math helpers


def mean(values: list[float | None]) -> float | None:
    clean = [v for v in values if v is not None]
    return sum(clean) / len(clean) if clean else None


def total(values: list[float | None]) -> float | None:
    clean = [v for v in values if v is not None]
    return sum(clean) if clean else None


def ratio(a: float | None, b: float | None) -> float | None:
    if a is None or b in (None, 0):
        return None
    return a / b  # type: ignore[operator]


def pearson(xs: list[float], ys: list[float]) -> float | None:
    n = len(xs)
    if n < 8:
        return None
    mx, my = sum(xs) / n, sum(ys) / n
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    sxx = sum((x - mx) ** 2 for x in xs)
    syy = sum((y - my) ** 2 for y in ys)
    if sxx == 0 or syy == 0:
        return None
    return sxy / math.sqrt(sxx * syy)


def window(rows: list[dict], field: str, start: int, end: int | None) -> list[float | None]:
    return [r.get(field) for r in rows[start:end]]


def r2(value: float | None, digits: int = 4) -> float | None:
    return None if value is None else round(value, digits)


# ---------------------------------------------------------------- build


def build_daily(raw: dict[str, object], start: date, end: date) -> list[dict]:
    charts = raw["nearblocks_charts"].get("charts", [])  # type: ignore[union-attr]
    nb = {row["date"][:10]: row for row in charts}
    fees = llama_series(raw["llama_chain_fees"])
    burn = llama_series(raw["llama_chain_burn"])
    iv = llama_series(raw["llama_intents_volume"])
    ifees = llama_series(raw["llama_intents_fees"])
    ihr = llama_series(raw["llama_intents_holders_revenue"])

    rows: list[dict] = []
    day = start
    while day <= end:
        key = day.isoformat()
        n = nb.get(key, {})
        price = to_float(n.get("near_price"))
        supply = to_float(n.get("total_supply"))
        burn_usd = burn.get(key)
        rows.append({
            "date": key,
            "txns": to_float(n.get("txns")),
            "active_accounts": to_float(n.get("active_accounts")),
            "new_accounts": to_float(n.get("new_accounts")),
            "price_usd": price if price else None,
            "market_cap_usd": to_float(n.get("market_cap")) or None,
            "total_supply_near": supply / YOCTO if supply else None,
            "gas_fees_usd": fees.get(key),
            "burn_usd": burn_usd,
            "burn_near": (burn_usd / price) if burn_usd is not None and price else None,
            "intents_volume_usd": iv.get(key),
            "intents_fees_usd": ifees.get(key),
            "intents_holders_revenue_usd": ihr.get(key),
        })
        day += timedelta(days=1)
    return rows


def aggregate(rows: list[dict], key_len: int | None = None, weekly: bool = False) -> list[dict]:
    buckets: dict[str, list[dict]] = {}
    for row in rows:
        d = date.fromisoformat(row["date"])
        key = (d - timedelta(days=d.weekday())).isoformat() if weekly else row["date"][:key_len]
        buckets.setdefault(key, []).append(row)
    out = []
    for key, group in sorted(buckets.items()):
        out.append({
            "period": key,
            "days": len(group),
            "txns_avg": r2(mean([g["txns"] for g in group]), 0),
            "active_accounts_avg": r2(mean([g["active_accounts"] for g in group]), 0),
            "new_accounts": r2(total([g["new_accounts"] for g in group]), 0),
            "price_usd": r2(mean([g["price_usd"] for g in group]), 4),
            "total_supply_near": r2(group[-1]["total_supply_near"], 0),
            "gas_fees_usd": r2(total([g["gas_fees_usd"] for g in group]), 2),
            "burn_usd": r2(total([g["burn_usd"] for g in group]), 2),
            "intents_volume_usd": r2(total([g["intents_volume_usd"] for g in group]), 0),
            "intents_fees_usd": r2(total([g["intents_fees_usd"] for g in group]), 2),
            "intents_holders_revenue_usd": r2(total([g["intents_holders_revenue_usd"] for g in group]), 2),
        })
    return out


def lead_lag(weekly: list[dict], max_lag: int | None = None) -> dict:
    """Pre-registered: corr(Δlog Intents volume_t, Δlog NEAR price_{t+lag}), weekly, complete weeks only."""
    if max_lag is None:
        max_lag = int(THRESHOLDS["T6"]["max_lag_weeks"])
    complete = [w for w in weekly if w["days"] == 7 and w["intents_volume_usd"] and w["price_usd"]]
    vol = [math.log(w["intents_volume_usd"]) for w in complete]
    px = [math.log(w["price_usd"]) for w in complete]
    dv = [b - a for a, b in zip(vol, vol[1:])]
    dp = [b - a for a, b in zip(px, px[1:])]
    lags = []
    for lag in range(-max_lag, max_lag + 1):
        if lag >= 0:
            xs, ys = dv[: len(dv) - lag], dp[lag:]
        else:
            xs, ys = dv[-lag:], dp[: len(dp) + lag]
        r = pearson(xs, ys)
        lags.append({"lag_weeks": lag, "r": r2(r), "n": len(xs)})
    n = len(dv)
    # Bonferroni over the 4 positive (Intents-leads) lags: two-sided alpha 0.05/4 -> z ≈ 2.50
    critical = THRESHOLDS["T6"]["bonferroni_z"] / math.sqrt(n) if n else None
    leading = [l for l in lags if l["lag_weeks"] > 0 and l["r"] is not None]
    best = max(leading, key=lambda l: l["r"], default=None)
    supported = bool(best and critical and best["r"] > critical)
    return {
        "method": "Pearson correlation of week-over-week log changes; positive lag = Intents volume leads NEAR price. Complete ISO weeks only. Bonferroni-adjusted critical |r| for 4 leading lags (alpha 0.05).",
        "weeks": n,
        "critical_r": r2(critical),
        "lags": lags,
        "best_leading": best,
        "contemporaneous_r": next((l["r"] for l in lags if l["lag_weeks"] == 0), None),
        "supported": supported,
    }


def grade(value: float | None, pass_at: float, fail_below: float) -> str:
    if value is None:
        return "insufficient_data"
    if value >= pass_at:
        return "pass"
    if value < fail_below:
        return "fail"
    return "inconclusive"


def evaluate(rows: list[dict], ll: dict) -> tuple[dict, list[dict], dict]:
    last90, prev90, yoy90 = (-90, None), (-180, -90), (-455, -365)
    last30 = (-30, None)

    def avg(field, w):
        return mean(window(rows, field, *w))

    def tot(field, w):
        return total(window(rows, field, *w))

    price_now = mean(window(rows, "price_usd", -7, None))
    supply_now = rows[-1]["total_supply_near"]
    supply_1y = rows[-366]["total_supply_near"] if len(rows) >= 366 else None
    burned_near_1y = tot("burn_near", (-365, None)) or 0.0
    net_issuance_1y = (supply_now - supply_1y) if supply_now and supply_1y else None
    gross_issuance_1y = (net_issuance_1y + burned_near_1y) if net_issuance_1y is not None else None
    issuance_rate = ratio(gross_issuance_1y, supply_1y)
    issuance_value_usd = gross_issuance_1y * price_now if gross_issuance_1y and price_now else None

    holders_rev_90_ann = (tot("intents_holders_revenue_usd", last90) or 0) * 365 / 90
    holders_rev_30_ann = (tot("intents_holders_revenue_usd", last30) or 0) * 365 / 30
    burn_90_ann = (tot("burn_usd", last90) or 0) * 365 / 90
    intents_vol_90 = tot("intents_volume_usd", last90)
    intents_vol_90_ann = intents_vol_90 * 365 / 90 if intents_vol_90 else None
    take_rate = ratio(tot("intents_holders_revenue_usd", last90), intents_vol_90)
    coverage = ratio(holders_rev_90_ann + burn_90_ann, issuance_value_usd)
    market_cap = rows[-1]["market_cap_usd"] or (price_now * supply_now if price_now and supply_now else None)

    fpa_now = ratio(avg("gas_fees_usd", last90), avg("active_accounts", last90))
    fpa_yoy = ratio(avg("gas_fees_usd", yoy90), avg("active_accounts", yoy90))

    metrics = {
        "price_usd_7d": r2(price_now),
        "market_cap_usd": r2(market_cap, 0),
        "total_supply_near": r2(supply_now, 0),
        "net_issuance_near_1y": r2(net_issuance_1y, 0),
        "burned_near_1y": r2(burned_near_1y, 0),
        "gross_issuance_near_1y": r2(gross_issuance_1y, 0),
        "gross_issuance_rate_1y": r2(issuance_rate, 5),
        "issuance_value_usd_annual": r2(issuance_value_usd, 0),
        "intents_volume_usd_1y": r2(tot("intents_volume_usd", (-365, None)), 0),
        "intents_volume_usd_90d": r2(intents_vol_90, 0),
        "intents_volume_usd_90d_annualized": r2(intents_vol_90_ann, 0),
        "intents_volume_yoy_90d": r2(ratio(intents_vol_90, tot("intents_volume_usd", yoy90))),
        "intents_volume_qoq_90d": r2(ratio(intents_vol_90, tot("intents_volume_usd", prev90))),
        "intents_fees_usd_1y": r2(tot("intents_fees_usd", (-365, None)), 0),
        "intents_holders_revenue_usd_1y": r2(tot("intents_holders_revenue_usd", (-365, None)), 0),
        "intents_holders_revenue_usd_90d": r2(tot("intents_holders_revenue_usd", last90), 0),
        "intents_holders_revenue_qoq_90d": r2(ratio(tot("intents_holders_revenue_usd", last90), tot("intents_holders_revenue_usd", prev90))),
        "intents_holders_revenue_annualized_90d": r2(holders_rev_90_ann, 0),
        "intents_holders_revenue_annualized_30d": r2(holders_rev_30_ann, 0),
        "intents_take_rate_90d": r2(take_rate, 6),
        "gas_fees_usd_1y": r2(tot("gas_fees_usd", (-365, None)), 0),
        "burn_usd_1y": r2(tot("burn_usd", (-365, None)), 0),
        "burn_usd_annualized_90d": r2(burn_90_ann, 0),
        "value_accrual_coverage_90d": r2(coverage),
        "txns_avg_90d": r2(avg("txns", last90), 0),
        "txns_avg_90d_yoy": r2(avg("txns", yoy90), 0),
        "active_accounts_avg_90d": r2(avg("active_accounts", last90), 0),
        "active_accounts_avg_90d_yoy": r2(avg("active_accounts", yoy90), 0),
        "active_accounts_yoy_ratio": r2(ratio(avg("active_accounts", last90), avg("active_accounts", yoy90))),
        "txns_yoy_ratio": r2(ratio(avg("txns", last90), avg("txns", yoy90))),
        "gas_fees_per_active_account_90d": r2(fpa_now, 6),
        "gas_fees_per_active_account_yoy_ratio": r2(ratio(fpa_now, fpa_yoy)),
        "market_cap_to_intents_volume_annualized": r2(ratio(market_cap, intents_vol_90_ann)),
        "market_cap_to_holder_value_annualized": r2(ratio(market_cap, holders_rev_90_ann + burn_90_ann), 1),
    }

    tests = [
        {
            "id": "T1", "claim": "More money is swapping through NEAR Intents than a year ago", "pillar": "Demand", "name": "Intents demand is compounding",
            "metric": "Intents volume, trailing 90d vs same 90d one year earlier",
            "value": metrics["intents_volume_yoy_90d"], "unit": "x",
            "rule": rule_text("T1"),
            "result": grade_test("T1", metrics["intents_volume_yoy_90d"]),
        },
        {
            "id": "T2", "claim": "NEAR is capturing more of that flow as revenue", "pillar": "Monetisation", "name": "Captured Intents revenue is rising",
            "metric": "NEAR holders revenue (buyback-directed), trailing 90d vs prior 90d",
            "value": metrics["intents_holders_revenue_qoq_90d"], "unit": "x",
            "rule": rule_text("T2"),
            "result": grade_test("T2", metrics["intents_holders_revenue_qoq_90d"]),
        },
        {
            "id": "T3", "claim": "People still use the NEAR base layer", "pillar": "Adoption", "name": "Base-layer usage is retained",
            "metric": "Avg daily active accounts, trailing 90d vs same 90d one year earlier",
            "value": metrics["active_accounts_yoy_ratio"], "unit": "x",
            "rule": rule_text("T3"),
            "result": grade_test("T3", metrics["active_accounts_yoy_ratio"]),
        },
        {
            "id": "T4", "claim": "Each remaining user pays more in fees", "pillar": "Activity quality", "name": "Remaining activity is economically denser",
            "metric": "Gas fees per active account, trailing 90d vs one year earlier",
            "value": metrics["gas_fees_per_active_account_yoy_ratio"], "unit": "x",
            "rule": rule_text("T4"),
            "result": grade_test("T4", metrics["gas_fees_per_active_account_yoy_ratio"]),
        },
        {
            "id": "T5", "claim": "Buybacks and burn outweigh new token issuance", "pillar": "Value accrual", "name": "Holder value offsets dilution",
            "metric": "(Annualised Intents holders revenue + gas burn) / annual gross issuance value",
            "value": metrics["value_accrual_coverage_90d"], "unit": "x",
            "rule": rule_text("T5"),
            "result": grade_test("T5", metrics["value_accrual_coverage_90d"]),
        },
        {
            "id": "T6", "claim": "Intents activity moves before the NEAR price", "pillar": "Market signal", "name": "Intents volume leads NEAR price",
            "metric": "Max weekly lead correlation (1–4w) vs Bonferroni critical r",
            "value": (ll.get("best_leading") or {}).get("r"), "unit": "r",
            "rule": f"pass if best leading r > critical r ({ll.get('critical_r')}) over {ll.get('weeks')} weeks · otherwise fail",
            "result": "insufficient_data" if not ll.get("weeks") else ("pass" if ll["supported"] else "fail"),
        },
    ]

    model = {
        "price_usd": metrics["price_usd_7d"],
        "total_supply_near": metrics["total_supply_near"],
        "issuance_rate": metrics["gross_issuance_rate_1y"],
        "intents_volume_usd_annual": metrics["intents_volume_usd_90d_annualized"],
        "intents_take_rate": metrics["intents_take_rate_90d"],
        "burn_usd_annual": metrics["burn_usd_annualized_90d"],
        "intents_volume_yoy_90d": metrics["intents_volume_yoy_90d"],
    }
    return metrics, tests, model


HISTORY_WEEKS = 26


def history(rows: list[dict], weeks: int = HISTORY_WEEKS) -> list[dict]:
    """Grade every test as of each of the last `weeks` weekly cut-offs, using today's frozen rules.

    Backfilled: the rules were chosen in November 2026, so every point up to the
    in-sample snapshot is look-ahead and must be read as descriptive only.
    """
    points = []
    for back in range(weeks, -1, -1):
        cut = len(rows) - 7 * back
        if cut < 456:
            continue
        sub = rows[:cut]
        _, tests, _ = evaluate(sub, lead_lag(aggregate(sub, weekly=True)))
        as_of = sub[-1]["date"]
        points.append({
            "asOf": as_of,
            "in_sample": as_of <= IN_SAMPLE_SNAPSHOT,
            "passed": sum(t["result"] == "pass" for t in tests),
            "results": {t["id"]: t["result"] for t in tests},
            "values": {t["id"]: t["value"] for t in tests},
        })
    return points


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--days", type=int, default=730, help="Window length in days (default 730, min 456 for YoY tests).")
    parser.add_argument("--out", type=Path, default=OUTPUT)
    args = parser.parse_args()
    if not 456 <= args.days <= 2000:
        parser.error("--days must be between 456 and 2000 so year-over-year tests have data")

    raw: dict[str, object] = {}
    source_meta: dict[str, dict] = {}
    for name, url in SOURCES.items():
        print(f"fetching {name} …", flush=True)
        try:
            raw[name] = fetch_json(url)
            source_meta[name] = {"url": url, "status": "ok"}
        except RuntimeError as error:
            print(f"FAILED {error}", file=sys.stderr)
            return 1

    # As-of date = latest day present in every core source (drops partial "today" rows).
    latest = [
        max(r["date"][:10] for r in raw["nearblocks_charts"]["charts"]),  # type: ignore[index]
        max(llama_series(raw["llama_chain_fees"])),
        max(llama_series(raw["llama_intents_volume"])),
        max(llama_series(raw["llama_intents_holders_revenue"])),
    ]
    end = min(date.fromisoformat(d) for d in latest)
    start = end - timedelta(days=args.days - 1)
    rows = build_daily(raw, start, end)
    for name in source_meta:
        source_meta[name]["methodology"] = raw[name].get("methodology") if isinstance(raw[name], dict) else None  # type: ignore[union-attr]

    weekly = aggregate(rows, weekly=True)
    monthly = aggregate(rows, key_len=7)
    ll = lead_lag(weekly)
    metrics, tests, model = evaluate(rows, ll)
    track = history(rows)

    limitations = [
        "NearBlocks 'active_accounts' counts distinct signer accounts, not humans; part of the year-over-year decline reflects the end of high-volume incentive and bot campaigns, which this data cannot separate from organic churn.",
        "DefiLlama Intents volume counts swap input notional; it is not revenue. Holders revenue is NEAR's captured share swept to revenue wallets and, since 2026-02-23, used for open-market buybacks (DefiLlama methodology). Buybacks are treated as holder value in USD, not as burned supply.",
        "Issuance is measured from the change in total supply plus burned NEAR; staking rewards are a transfer to stakers, so non-staked holders bear the dilution measured here.",
        "NearBlocks circulating supply appears static; total supply is used for all supply calculations.",
        "The lead/lag test is correlational over a short history and says nothing about causality. Its lags, frequency and critical value were set after the 2026-11-12 snapshot had been seen and are frozen since tag thresholds-v1; changing them would invalidate it.",
        "Only keyless public aggregators are used here. The BigQuery pipeline (scripts/rebuild.py) gives contract-level detail from raw chain data and needs Google Cloud credentials.",
    ]

    output = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "asOf": end.isoformat(),
        "window": {"start": start.isoformat(), "end": end.isoformat(), "days": args.days},
        "sources": source_meta,
        "metrics": metrics,
        "tests": tests,
        "leadLag": ll,
        "model": model,
        "history": track,
        "weekly": weekly,
        "monthly": monthly,
        "daily": [{k: (r2(v, 4) if isinstance(v, float) else v) for k, v in row.items()} for row in rows],
        "limitations": limitations,
        "preregistration": {
            "thresholds_tag": THRESHOLDS_TAG,
            "thresholds_sha256": thresholds_sha256(),
            "frozen_on": THRESHOLDS_FROZEN_ON,
            "in_sample_snapshot": IN_SAMPLE_SNAPSHOT,
            "out_of_sample": end.isoformat() > IN_SAMPLE_SNAPSHOT,
        },
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, indent=1) + "\n")
    passed = sum(t["result"] == "pass" for t in tests)
    print(f"Wrote {args.out.relative_to(ROOT) if args.out.is_relative_to(ROOT) else args.out}: {len(rows)} days, as of {end}.")
    for t in tests:
        print(f"  {t['id']} {t['result'].upper():<17} {t['name']}: {t['value']}")
    print(f"{passed}/{len(tests)} tests pass (thresholds frozen at {THRESHOLDS_TAG}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
