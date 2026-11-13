#!/usr/bin/env python3
"""Rebuild the research dashboard from NEAR BigQuery and Intents Explorer data."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from google.cloud import bigquery

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "dashboard.json"
INTENTS_URL = "https://explorer.near-intents.org/api/v0/transactions"


def load_env_file() -> None:
    path = ROOT / ".env"
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def run_query(client: bigquery.Client, filename: str, start: date, end: date) -> list[dict]:
    sql = (ROOT / "sql" / filename).read_text()
    config = bigquery.QueryJobConfig(query_parameters=[
        bigquery.ScalarQueryParameter("start_date", "DATE", start),
        bigquery.ScalarQueryParameter("end_date", "DATE", end),
    ])
    return [dict(row) for row in client.query(sql, job_config=config).result()]


ROW_CAP = 1000
MIN_WINDOW = timedelta(hours=1)
REQUEST_GAP_SECONDS = 5.0


class IntentsError(Exception):
    """Raised when the Explorer API cannot be read reliably."""


def day_windows(start: datetime, end: datetime):
    cursor = start
    while cursor < end:
        nxt = min(cursor + timedelta(days=1), end)
        yield cursor, nxt
        cursor = nxt


def request_window(token: str, start: datetime, end: datetime, state: dict) -> list[dict]:
    """One rate-limited Explorer request; retries on HTTP 429."""
    params = urlencode({
        "numberOfTransactions": ROW_CAP,
        "startTimestampUnix": int(start.timestamp()),
        "endTimestampUnix": int(end.timestamp()),
        "showTestTxs": "false",
    })
    request = Request(
        f"{INTENTS_URL}?{params}",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )
    for attempt in range(3):
        wait = REQUEST_GAP_SECONDS - (time.monotonic() - state["last"])
        if wait > 0:
            time.sleep(wait)
        try:
            with urlopen(request, timeout=45) as response:
                payload = json.loads(response.read())
            state["last"] = time.monotonic()
            break
        except HTTPError as error:
            state["last"] = time.monotonic()
            if error.code == 429 and attempt < 2:
                time.sleep(15 * (attempt + 1))
                continue
            raise IntentsError(f"Explorer API returned HTTP {error.code}") from error
        except (URLError, TimeoutError, json.JSONDecodeError) as error:
            raise IntentsError(f"Explorer API request failed: {error}") from error
    else:
        raise IntentsError("Explorer API rate limit persisted after retries")
    rows = payload if isinstance(payload, list) else payload.get("transactions", [])
    if not isinstance(rows, list):
        raise IntentsError("Explorer API response did not contain a transactions array.")
    return rows


def fetch_range(token: str, start: datetime, end: datetime, state: dict, warnings: list[str]) -> list[dict]:
    """Fetch [start, end); if the row cap is hit, split the window in half and retry."""
    rows = request_window(token, start, end, state)
    if len(rows) < ROW_CAP:
        return rows
    if end - start <= MIN_WINDOW:
        warnings.append(
            f"Explorer API still hit the {ROW_CAP}-row cap for a {MIN_WINDOW} window starting {start.isoformat()}; that window is incomplete."
        )
        return rows
    mid = start + (end - start) / 2
    state["splits"] += 1
    return fetch_range(token, start, mid, state, warnings) + fetch_range(token, mid, end, state, warnings)


def get_intents(start: datetime, end: datetime) -> tuple[list[dict], list[dict], dict, list[str]]:
    token = os.getenv("NEAR_INTENTS_JWT")
    if not token:
        return [], [], {"status": "not_configured", "message": "Set NEAR_INTENTS_JWT from the Explorer Partner Dashboard to fetch swap activity."}, []

    results: list[dict] = []
    warnings: list[str] = []
    state = {"last": 0.0, "splits": 0}
    windows = list(day_windows(start, end))
    try:
        for index, (window_start, window_end) in enumerate(windows, 1):
            results.extend(fetch_range(token, window_start, window_end, state, warnings))
            if index % 10 == 0 or index == len(windows):
                print(f"Intents: {index}/{len(windows)} days fetched ({len(results)} rows, {state['splits']} splits)", flush=True)
    except IntentsError as error:
        return [], [], {"status": "error", "message": str(error)}, warnings

    statuses: dict[str, int] = {}
    daily: dict[str, list] = {}
    seen: set[str] = set()
    for row in results:
        status = str(row.get("status", "UNKNOWN")).upper()
        statuses[status] = statuses.get(status, 0) + 1
        if status != "SUCCESS":
            continue
        created_at = row.get("createdAt")
        if not created_at:
            continue
        try:
            instant = datetime.fromisoformat(str(created_at).replace("Z", "+00:00"))
        except ValueError:
            continue
        key = str((row.get("nearTxHashes") or [None])[0] or f"{row.get('depositAddress', '')}:{row.get('depositMemo', '')}")
        if key in seen:
            continue
        seen.add(key)
        try:
            amount = float(row.get("amountInUsd"))
        except (TypeError, ValueError):
            continue
        if amount < 0:
            continue
        bucket = daily.setdefault(instant.strftime("%Y-%m-%d"), [0.0, 0])
        bucket[0] += amount
        bucket[1] += 1

    intents_daily = [
        {"date": day, "volume_usd": round(v, 2), "completed_swaps": n}
        for day, (v, n) in sorted(daily.items())
    ]
    monthly: dict[str, list] = {}
    for item in intents_daily:
        bucket = monthly.setdefault(item["date"][:7], [0.0, 0])
        bucket[0] += item["volume_usd"]
        bucket[1] += item["completed_swaps"]
    intents_monthly = [
        {"month": month, "volume_usd": round(v, 2), "completed_swaps": n}
        for month, (v, n) in sorted(monthly.items())
    ]
    source = {
        "status": "ok",
        "transactions_returned": len(results),
        "unique_completed_swaps": len(seen),
        "statuses": statuses,
        "window_splits": state["splits"],
    }
    return intents_monthly, intents_daily, source, warnings


def dry_run(client: bigquery.Client, start: date, end: date) -> int:
    total = 0
    for filename in ("daily_usage.sql", "contract_usage.sql"):
        config = bigquery.QueryJobConfig(
            dry_run=True,
            use_query_cache=False,
            query_parameters=[
                bigquery.ScalarQueryParameter("start_date", "DATE", start),
                bigquery.ScalarQueryParameter("end_date", "DATE", end),
            ],
        )
        job = client.query((ROOT / "sql" / filename).read_text(), job_config=config)
        total += job.total_bytes_processed or 0
        print(f"{filename}: {(job.total_bytes_processed or 0) / 1e9:.2f} GB estimated")
    print(f"Total: {total / 1e9:.2f} GB estimated. Nothing was executed or written.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--days", type=int, default=365, help="Lookback for daily onchain metrics and contract usage (default: 365).")
    parser.add_argument("--intents-days", type=int, default=90, help="Lookback for Intents Explorer data (default: 90). The API is rate limited to one request per 5s, so 365 days takes 30+ minutes.")
    parser.add_argument("--dry-run", action="store_true", help="Print estimated BigQuery bytes and exit without running queries or writing files.")
    args = parser.parse_args()
    if not 1 <= args.days <= 1825:
        parser.error("--days must be between 1 and 1825")
    if not 1 <= args.intents_days <= args.days:
        parser.error("--intents-days must be between 1 and --days")

    load_env_file()
    end = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    start = end - timedelta(days=args.days - 1)
    start_date, end_date = start.date(), end.date()
    if not os.getenv("GOOGLE_CLOUD_PROJECT"):
        print("GOOGLE_CLOUD_PROJECT is required for BigQuery billing and Application Default Credentials.", file=sys.stderr)
        return 2

    try:
        client = bigquery.Client(project=os.environ["GOOGLE_CLOUD_PROJECT"])
        if args.dry_run:
            return dry_run(client, start_date, end_date)
        onchain = run_query(client, "daily_usage.sql", start_date, end_date)
        contracts = run_query(client, "contract_usage.sql", start_date, end_date)
    except Exception as error:
        print(f"BigQuery rebuild failed: {error}", file=sys.stderr)
        return 1

    intents_start = max(start, end - timedelta(days=args.intents_days - 1))
    intents, intents_daily, intents_source, warnings = get_intents(intents_start, end + timedelta(days=1))
    if intents_source["status"] == "ok":
        intents_source["window"] = {"start": intents_start.date().isoformat(), "end": end_date.isoformat(), "days": args.intents_days}
    output = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "window": {"start": start_date.isoformat(), "end": end_date.isoformat(), "days": args.days},
        "onchain": onchain,
        "contracts": contracts,
        "intents": intents,
        "intents_daily": intents_daily,
        "sources": {
            "bigquery": {"status": "ok", "dataset": "bigquery-public-data.crypto_near_mainnet_us", "daily_rows": len(onchain), "contract_rows": len(contracts)},
            "intents": intents_source,
        },
        "limitations": warnings + ["Token market-price history is not included in the specified sources, so the price-versus-Intents lead/lag hypothesis cannot yet be tested."],
    }
    OUTPUT.write_text(json.dumps(output, indent=2, default=str) + "\n")
    print(f"Wrote {OUTPUT.relative_to(ROOT)}: {len(onchain)} onchain days, {len(contracts)} contract rows, {len(intents)} Intents months ({len(intents_daily)} days).")
    for warning in output["limitations"]:
        print(f"NOTE: {warning}")
    if intents_source["status"] != "ok":
        print(f"NOTE: Intents data: {intents_source['message']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
