import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fetch_public import THRESHOLDS, IN_SAMPLE_SNAPSHOT, aggregate, history, grade, lead_lag, pearson, ratio, thresholds_sha256  # noqa: E402

# Hash of THRESHOLDS at git tag thresholds-v1. Changing a threshold must fail this
# test; a new version needs a new tag and must be disclosed in THESIS.md.
FROZEN_THRESHOLDS_SHA256 = "b9548c7a9ca04a4cedb63863fa554d5da8ed98ce10af8b062592696edb92d4e9"


class AnalysisMathTest(unittest.TestCase):
    def test_pearson_perfect_and_inverse(self):
        xs = [float(i) for i in range(10)]
        self.assertAlmostEqual(pearson(xs, [2 * x + 1 for x in xs]), 1.0)
        self.assertAlmostEqual(pearson(xs, [-x for x in xs]), -1.0)

    def test_pearson_needs_enough_points(self):
        self.assertIsNone(pearson([1, 2, 3], [1, 2, 3]))

    def test_ratio_handles_missing(self):
        self.assertIsNone(ratio(None, 2))
        self.assertIsNone(ratio(1, 0))
        self.assertEqual(ratio(3, 2), 1.5)

    def test_thresholds_are_frozen(self):
        self.assertEqual(sorted(THRESHOLDS), ["T1", "T2", "T3", "T4", "T5", "T6"])
        self.assertEqual(thresholds_sha256(), FROZEN_THRESHOLDS_SHA256)

    def test_history_is_weekly_and_ends_today(self):
        from datetime import date, timedelta

        start = date(2025, 1, 1)
        rows = []
        for i in range(600):
            rows.append({
                "date": (start + timedelta(days=i)).isoformat(),
                "txns": 1000.0, "active_accounts": 100.0 + i, "new_accounts": 5.0,
                "price_usd": 2.0 + 0.001 * i, "market_cap_usd": None, "total_supply_near": 1e9 + 1e5 * i,
                "gas_fees_usd": 50.0, "burn_usd": 35.0, "burn_near": 17.0,
                "intents_volume_usd": 1e6 * (1 + 0.01 * i), "intents_fees_usd": 100.0, "intents_holders_revenue_usd": 40.0,
            })
        points = history(rows, weeks=8)
        self.assertEqual(points[-1]["asOf"], rows[-1]["date"])
        self.assertEqual(len(points), 9)
        gaps = {(date.fromisoformat(b["asOf"]) - date.fromisoformat(a["asOf"])).days for a, b in zip(points, points[1:])}
        self.assertEqual(gaps, {7})
        self.assertEqual(sorted(points[-1]["results"]), ["T1", "T2", "T3", "T4", "T5", "T6"])
        self.assertTrue(all(p["in_sample"] == (p["asOf"] <= IN_SAMPLE_SNAPSHOT) for p in points))

    def test_grade_thresholds(self):
        self.assertEqual(grade(1.6, 1.5, 1.0), "pass")
        self.assertEqual(grade(1.2, 1.5, 1.0), "inconclusive")
        self.assertEqual(grade(0.5, 1.5, 1.0), "fail")
        self.assertEqual(grade(None, 1.5, 1.0), "insufficient_data")

    def test_lead_lag_detects_planted_one_week_lead(self):
        # Intents volume changes are random; price follows them one week later.
        import random

        random.seed(7)
        shocks = [random.gauss(0, 0.2) for _ in range(60)]
        vol, px = [1e8], [3.0]
        for i, s in enumerate(shocks):
            vol.append(vol[-1] * math.exp(s))
            prior = shocks[i - 1] if i > 0 else 0.0
            px.append(px[-1] * math.exp(0.8 * prior + random.gauss(0, 0.02)))
        weekly = [{"days": 7, "intents_volume_usd": v, "price_usd": p} for v, p in zip(vol, px)]
        result = lead_lag(weekly)
        self.assertTrue(result["supported"])
        self.assertEqual(result["best_leading"]["lag_weeks"], 1)

    def test_weekly_aggregation_starts_on_monday(self):
        rows = [
            {"date": d, **{k: 1.0 for k in (
                "txns", "active_accounts", "new_accounts", "price_usd", "total_supply_near",
                "gas_fees_usd", "burn_usd", "intents_volume_usd", "intents_fees_usd", "intents_holders_revenue_usd",
            )}}
            for d in ("2026-11-08", "2026-11-09", "2026-11-10")
        ]
        weeks = aggregate(rows, weekly=True)
        self.assertEqual([w["period"] for w in weeks], ["2026-11-02", "2026-11-09"])
        self.assertEqual(weeks[1]["intents_volume_usd"], 2)


if __name__ == "__main__":
    unittest.main()
