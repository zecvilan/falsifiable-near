# Falsifiable NEAR

*A NEAR investment thesis that can fail in public.*

**Live dashboard:** https://falsifiable-near-sand.vercel.app/

Submission for the NEAR hackathon **Investment Thesis** track: *"Make the long-term case. Judged on the evidence, not the conviction."*

- **Thesis:** [`THESIS.md`](./THESIS.md). NEAR's value engine has moved from blockspace to Intents, and the case holds only if captured Intents revenue outgrows dilution.
- **Dashboard:** Next.js app that renders the snapshot: scorecard, charts, lead/lag test, interactive scenario model, and a live pulse.
- **Data:** [`data/public.json`](./data/public.json), produced by one keyless command.

## For judges: verify in 5 steps

1. Open https://falsifiable-near-sand.vercel.app → the **Verdict today** card shows how many of the six claims hold, and the **Live pulse** strip shows current NEAR price, TPS and Intents volume (refreshed every 15 s with a live "updated Xs ago" clock).
2. Scroll to **Falsification scorecard** → each claim shows its current value, its frozen pass/fail threshold and its data source.
3. Open `/data/public.json` on the site → the same numbers as raw JSON. Every figure on the page is read from this file.
4. Locally, run `make data && make test` → the snapshot is rebuilt from public APIs (no keys) and the tests pass, including the hash check that fails if any threshold is edited.
5. Run `make dev` and open the **Scenario model** → change growth, take rate or issuance and watch year-5 coverage and break-even growth update.

<!-- auto:readme-results -->
## Result (snapshot 2026-11-13)

| | Claim | Value | Result |
| --- | --- | --- | --- |
| T1 | More money is swapping through NEAR Intents than a year ago | 3.07× | Pass |
| T2 | NEAR is capturing more of that flow as revenue | 3.02× | Pass |
| T3 | People still use the NEAR base layer | 0.25× | Fail |
| T4 | Each remaining user pays more in fees | 1.98× | Pass |
| T5 | Buybacks and burn outweigh new token issuance | 0.19× | Fail |
| T6 | Intents activity moves before the NEAR price | 0.079 | Fail |

**Track record:** 27 weekly gradings with the same rules, 1/6 on 2026-05-15 → 3/6 on 2026-11-13. 1 of them is out-of-sample; the rest are backfilled and descriptive.

Graded with thresholds frozen at tag `thresholds-v1`; this snapshot is out-of-sample.
<!-- /auto:readme-results -->

## Quick start

```bash
make data   # python3 scripts/fetch_public.py — stdlib only, no keys
make test   # unit tests (including the frozen-threshold hash check)
make docs   # regenerate the numbers in THESIS.md and README.md from data/public.json
make dev    # pnpm install && pnpm dev → http://localhost:3000
```

Optional raw-chain deep-dive (Google Cloud billing required):

```bash
cp .env.example .env            # set GOOGLE_CLOUD_PROJECT (+ optional NEAR_INTENTS_JWT)
gcloud auth application-default login
pip install -r requirements.txt
make dry-run && make rebuild    # writes data/dashboard.json
```

No billed project? Run [`sql/daily_usage.sql`](./sql/daily_usage.sql) in the BigQuery console (the free sandbox works; replace `@start_date`/`@end_date` with literal dates), save the result as JSON to `data/bigquery/daily_usage.raw.json` (and `sql/contract_usage.sql` to `contract_usage.raw.json`), then run `make bq-import`. It writes `data/dashboard.json` with a week-by-week cross-check against NearBlocks. The committed exports (2026-08-15 → 2026-11-12) match NearBlocks' daily active accounts and transactions exactly in all 13 comparable weeks.

## Repository layout

```
THESIS.md                      thesis, tests, falsifiers, model, risks
data/public.json               keyless evidence snapshot (rendered by the dashboard)
data/dashboard.json            BigQuery/Explorer snapshot (empty until make rebuild / bq-import)
scripts/import_bigquery.py     imports a BigQuery console export + NearBlocks cross-check
scripts/fetch_public.py        keyless pipeline + frozen-threshold tests + lead/lag
scripts/render_docs.py         writes the numbers in THESIS.md / README.md from the snapshot
scripts/test_fetch_public.py   unit tests
.github/workflows/refresh.yml  daily rebuild: data → tests → docs → commit
scripts/rebuild.py             BigQuery + Intents Explorer pipeline
sql/daily_usage.sql            daily signers / transactions
sql/contract_usage.sql         top-25 contracts per day by receipts
lib/model.ts                   scenario model (coverage, break-even growth)
app/, components/thesis/       dashboard
app/api/live                   live pulse (NearBlocks stats + DefiLlama, 5-min cache)
```

## Live updates

`.github/workflows/refresh.yml` runs every day at 06:00 UTC (and on demand). It runs `make data`, `make test` and `make docs`, then commits the new snapshot only if the data changed. The commit history of `data/public.json` is therefore a dated record of every grading. Pushes and pull requests also run `make test` and `make docs-check`.

**Out-of-sample status at submission:** the thresholds were frozen on 2026-11-13 and the upstream sources currently end on 2026-11-12, so there are no out-of-sample gradings yet. The first one is committed by the daily job as soon as NearBlocks and DefiLlama publish data past 2026-11-12; every one after it is graded with the same frozen rules.

## Principles

1. **Evidence over conviction:** every claim maps to a metric, a source, and a re-runnable command.
2. **Frozen after a first look, and disclosed:** thresholds were set after a first look at the 2026-11-12 data (disclosed in THESIS.md §3), then frozen at tag `thresholds-v1`. A hash test blocks later tuning, so only gradings on data published after 2026-11-12 count as out-of-sample. Failing tests stay on the page.
3. **No invented data:** an unqueried source renders as unavailable, never as sample data.
4. **No hand-typed numbers:** figures in the documents are generated from the snapshot (`make docs`), and CI fails if they are stale.

## Hackathon disclosure

- **Built for:** NEAR HACKATHON (Nov 2026), track `thesis`. All code and data in this repository were produced during the hackathon window.
- **Thresholds:** frozen at git tag [`thresholds-v1`](../../tree/thresholds-v1); `scripts/test_fetch_public.py` pins their hash.
- **Libraries and tools:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, Recharts, SWR; Python 3 standard library for the keyless pipeline; `google-cloud-bigquery` for the optional raw-chain pipeline. Code was written with AI assistance (v0 by Vercel).
- **Data sources:** NearBlocks API, DefiLlama API, BigQuery public dataset `crypto_near_mainnet_us` (optional), NEAR Intents Explorer API (optional).

## License

[MIT](./LICENSE). Not investment advice.
