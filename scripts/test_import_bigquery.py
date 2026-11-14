import sys
import unittest
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from import_bigquery import build, crosscheck, parse_contracts, parse_rows, summary  # noqa: E402

START = date(2026, 8, 17)  # a Monday


def export(days: int, signers: int, txns: int) -> list[dict]:
    return [
        {"date": (START + timedelta(days=i)).isoformat(), "active_signers": str(signers), "transactions": str(txns), "distinct_receivers": "1"}
        for i in range(days)
    ]


def nearblocks_weeks(weeks: int, active: float, txns: float) -> list[dict]:
    return [
        {"period": (START + timedelta(weeks=w)).isoformat(), "days": 7, "active_accounts_avg": active, "txns_avg": txns}
        for w in range(weeks)
    ]


class ImportBigQueryTest(unittest.TestCase):
    def test_parse_casts_string_integers(self):
        rows = parse_rows(export(2, 10, 20))
        self.assertEqual(rows[0]["active_signers"], 10)
        self.assertEqual(rows[0]["transactions"], 20)

    def test_parse_rejects_duplicate_dates(self):
        with self.assertRaises(ValueError):
            parse_rows(export(1, 1, 1) + export(1, 1, 1))

    def test_parse_contracts_rejects_duplicates(self):
        row = {"date": "2026-08-17", "contract_account": "a.near", "function_call_receipts": "5", "originating_transactions": "4", "initiating_signer_days": "3"}
        self.assertEqual(parse_contracts([row])[0]["function_call_receipts"], 5)
        with self.assertRaises(ValueError):
            parse_contracts([row, row])

    def test_crosscheck_skips_partial_weeks(self):
        rows = parse_rows(export(10, 100, 1000))  # one full week + 3 days
        pairs = crosscheck(rows, nearblocks_weeks(2, 90, 900))
        self.assertEqual([p["period"] for p in pairs], [START.isoformat()])

    def test_summary_counts_exact_weeks_and_ratios(self):
        rows = parse_rows(export(14, 110, 1000))
        s = summary(crosscheck(rows, nearblocks_weeks(2, 100, 1000)))
        self.assertEqual((s["weeks"], s["exact_weeks"]), (2, 0))
        self.assertAlmostEqual(s["signers_ratio"], 1.1)
        self.assertAlmostEqual(s["txns_ratio"], 1.0)

    def test_exact_match_is_disclosed(self):
        out = build(parse_rows(export(14, 100, 1000)), [], nearblocks_weeks(2, 100, 1000))
        self.assertEqual(out["crosscheck"]["summary"]["exact_weeks"], 2)
        self.assertTrue(any("equal NearBlocks exactly" in note for note in out["limitations"]))


if __name__ == "__main__":
    unittest.main()
