#!/usr/bin/env python3
"""Turn checked-in BigQuery console exports into data/dashboard.json.

`make rebuild` queries BigQuery directly and needs a billed Google Cloud project.
This script is the keyless path: it reads the results of the same versioned SQL,
exported from the BigQuery console, and cross-checks daily usage week by week
against the NearBlocks numbers in data/public.json.

  data/bigquery/daily_usage.raw.json     <- sql/daily_usage.sql     (required)
  data/bigquery/contract_usage.raw.json  <- sql/contract_usage.sql  (optional)
"""

from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "bigquery"
DAILY_RAW = RAW_DIR / "daily_usage.raw.json"
CONTRACT_RAW = RAW_DIR / "contract_usage.raw.json"
PUBLIC = ROOT / "data" / "public.json"
OUTPUT = ROOT / "data" / "dashboard.json"
DATASET = "bigquery-public-data.crypto_near_mainnet_us"


def parse_rows(raw: list[dict]) -> list[dict]:
    """BigQuery JSON exports encode INT64 as strings; cast and sort by date."""
    rows = [
        {
            "date": str(row["date"]),
            "active_signers": int(row["active_signers"]),
            "transactions": int(row["transactions"]),
            "distinct_receivers": int(row["distinct_receivers"]),
        }
        for row in raw
    ]
    rows.sort(key=lambda r: r["date"])
    dates = [r["date"] for r in rows]
    if len(set(dates)) != len(dates):
        raise ValueError("daily export contains duplicate dates")
    return rows


def parse_contracts(raw: list[dict]) -> list[dict]:
    rows = [
        {
            "date": str(row["date"]),
            "contract_account": str(row["contract_account"]),
            "function_call_receipts": int(row["function_call_receipts"]),
            "originating_transactions": int(row["originating_transactions"]),
            "initiating_signer_days": int(row["initiating_signer_days"]),
        }
        for row in raw
    ]
    keys = [(r["date"], r["contract_account"]) for r in rows]
    if len(set(keys)) != len(keys):
        raise ValueError("contract export contains duplicate (date, contract) rows")
    rows.sort(key=lambda r: (r["date"], -r["function_call_receipts"]))
    return rows


def weekly(rows: list[dict]) -> dict[str, dict]:
    """Monday-start weeks, same convention as fetch_public.aggregate(weekly=True)."""
    weeks: dict[str, dict] = {}
    for row in rows:
        d = date.fromisoformat(row["date"])
        key = (d - timedelta(days=d.weekday())).isoformat()
        bucket = weeks.setdefault(key, {"days": 0, "signers": 0, "txns": 0})
        bucket["days"] += 1
        bucket["signers"] += row["active_signers"]
        bucket["txns"] += row["transactions"]
    return weeks


def crosscheck(rows: list[dict], public_weekly: list[dict]) -> list[dict]:
    """Pair BigQuery and NearBlocks weekly averages; keep only weeks covering the same days."""
    bq = weekly(rows)
    out = []
    for week in public_weekly:
        b = bq.get(week["period"])
        if not b or b["days"] != week["days"]:
            continue
        if week.get("active_accounts_avg") is None or week.get("txns_avg") is None:
            continue
        out.append({
            "period": week["period"],
            "days": week["days"],
            "bigquery_signers_avg": round(b["signers"] / b["days"]),
            "nearblocks_active_avg": round(week["active_accounts_avg"]),
            "bigquery_txns_avg": round(b["txns"] / b["days"]),
            "nearblocks_txns_avg": round(week["txns_avg"]),
        })
    return out


def summary(pairs: list[dict]) -> dict:
    def avg(key: str) -> float | None:
        return sum(p[key] for p in pairs) / len(pairs) if pairs else None

    def ratio(a: float | None, b: float | None) -> float | None:
        return round(a / b, 4) if a and b else None

    bq_s, nb_s = avg("bigquery_signers_avg"), avg("nearblocks_active_avg")
    bq_t, nb_t = avg("bigquery_txns_avg"), avg("nearblocks_txns_avg")
    return {
        "weeks": len(pairs),
        "exact_weeks": sum(
            p["bigquery_signers_avg"] == p["nearblocks_active_avg"] and p["bigquery_txns_avg"] == p["nearblocks_txns_avg"]
            for p in pairs
        ),
        "signers_ratio": ratio(bq_s, nb_s),
        "txns_ratio": ratio(bq_t, nb_t),
    }


def build(rows: list[dict], contracts: list[dict], public_weekly: list[dict]) -> dict:
    pairs = crosscheck(rows, public_weekly)
    s = summary(pairs)
    limitations = [
        "Imported from BigQuery console exports of the versioned SQL, not queried by this script. Re-run with `make rebuild` under your own Google Cloud project to reproduce.",
    ]
    if s["weeks"] and s["exact_weeks"] == s["weeks"]:
        limitations.append(
            "Daily signer and transaction counts equal NearBlocks exactly in every comparable week, which indicates NearBlocks counts the same quantities from the same chain. That confirms the aggregator's numbers; it is not a second, differently-defined measurement."
        )
    if contracts:
        limitations.append("Contract usage keeps the top 25 contracts per day, so multi-day totals are lower bounds.")
    else:
        limitations.append("Contract-level usage (sql/contract_usage.sql) is not included in this export.")
    return {
        "window": {"start": rows[0]["date"], "end": rows[-1]["date"], "days": len(rows)},
        "onchain": rows,
        "contracts": contracts,
        "intents": [],
        "intents_daily": [],
        "crosscheck": {"weekly": pairs, "summary": s},
        "sources": {
            "bigquery": {
                "status": "ok",
                "mode": "export",
                "dataset": DATASET,
                "daily_rows": len(rows),
                "contract_rows": len(contracts),
            },
            "intents": {
                "status": "not_configured",
                "message": "Set NEAR_INTENTS_JWT from the Explorer Partner Dashboard to fetch per-swap activity.",
            },
        },
        "limitations": limitations,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="Fail if data/dashboard.json is stale.")
    args = parser.parse_args()

    if not DAILY_RAW.exists():
        print(
            f"{DAILY_RAW.relative_to(ROOT)} not found. Run sql/daily_usage.sql in the BigQuery console "
            "(replace @start_date/@end_date with dates), save the result as JSON to that path, then re-run."
        )
        return 2
    rows = parse_rows(json.loads(DAILY_RAW.read_text()))
    contracts = parse_contracts(json.loads(CONTRACT_RAW.read_text())) if CONTRACT_RAW.exists() else []
    output = build(rows, contracts, json.loads(PUBLIC.read_text())["weekly"])

    if args.check:
        existing = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else {}
        existing.pop("generatedAt", None)
        if existing != output:
            print("data/dashboard.json is stale. Run `make bq-import`.")
            return 1
        print(f"Checked {OUTPUT.relative_to(ROOT)} against {RAW_DIR.relative_to(ROOT)}/.")
        return 0

    output = {"generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), **output}
    OUTPUT.write_text(json.dumps(output, indent=2) + "\n")
    s = output["crosscheck"]["summary"]
    print(f"Wrote {OUTPUT.relative_to(ROOT)}: {len(rows)} days ({rows[0]['date']} – {rows[-1]['date']}), {len(contracts)} contract rows.")
    print(f"  NearBlocks cross-check: {s['exact_weeks']}/{s['weeks']} weeks exact; signers ratio {s['signers_ratio']}, txns ratio {s['txns_ratio']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
