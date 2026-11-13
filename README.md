# Falsifiable NEAR

*A NEAR investment thesis that can fail in public.*

**Live dashboard:** https://falsifiable-near-sand.vercel.app

Submission for the NEAR hackathon **Investment Thesis** track: *"Make the long-term case. Judged on the evidence, not the conviction."*

- **Thesis:** [`THESIS.md`](./THESIS.md). NEAR's value engine has moved from blockspace to Intents, and the case holds only if captured Intents revenue outgrows dilution.
- **Dashboard:** Next.js app that renders the snapshot: scorecard, charts, lead/lag test, interactive scenario model, and a live pulse.
- **Data:** [`data/public.json`](./data/public.json), produced by one keyless command.

<!-- auto:readme-results -->
## Result (snapshot 2026-11-12)

| | Claim | Value | Result |
| --- | --- | --- | --- |
| T1 | More money is swapping through NEAR Intents than a year ago | 3.13× | Pass |
| T2 | NEAR is capturing more of that flow as revenue | 2.99× | Pass |
| T3 | People still use the NEAR base layer | 0.25× | Fail |
| T4 | Each remaining user pays more in fees | 1.97× | Pass |
| T5 | Buybacks and burn outweigh new token issuance | 0.19× | Fail |
| T6 | Intents activity moves before the NEAR price | 0.079 | Fail |

**Track record:** 27 weekly gradings with the same rules, 1/6 on 2026-05-14 → 3/6 on 2026-11-12. 0 of them are out-of-sample; the rest are backfilled and descriptive.

Graded with thresholds frozen at tag `thresholds-v1`; this snapshot is in-sample (the thresholds were set after seeing the 2026-11-12 snapshot).
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

## Repository layout

```
THESIS.md                    thesis, tests, falsifiers, model, risks
data/public.json             keyless evidence snapshot (rendered by the dashboard)
data/dashboard.json          BigQuery/Explorer snapshot (empty until `make rebuild`)
scripts/fetch_public.py      keyless pipeline + frozen-threshold tests + lead/lag
scripts/render_docs.py       writes the numbers in THESIS.md / README.md from the snapshot
scripts/test_fetch_public.py unit tests
.github/workflows/refresh.yml daily rebuild: data → tests → docs → commit
scripts/rebuild.py           BigQuery + Intents Explorer pipeline
sql/daily_usage.sql          daily signers / transactions
sql/contract_usage.sql       top-25 contracts per day by receipts
lib/model.ts                 scenario model (coverage, break-even growth)
app/, components/thesis/     dashboard
app/api/live                 live pulse (NearBlocks stats + DefiLlama, 5-min cache)
```

## Live updates

`.github/workflows/refresh.yml` runs every day at 06:00 UTC (and on demand). It runs `make data`, `make test` and `make docs`, then commits the new snapshot only if the data changed. The commit history of `data/public.json` is therefore a dated record of every grading. Pushes and pull requests also run `make test` and `make docs-check`.

## Principles

1. **Evidence over conviction:** every claim maps to a metric, a source, and a re-runnable command.
2. **Frozen, not retro-fitted:** thresholds were set after a first look at the 2026-11-12 data (disclosed in THESIS.md §3), then frozen at tag `thresholds-v1`. A hash test blocks later tuning, so every rebuild since is out-of-sample. Failing tests stay on the page.
3. **No invented data:** an unqueried source renders as unavailable, never as sample data.
4. **No hand-typed numbers:** figures in the documents are generated from the snapshot (`make docs`), and CI fails if they are stale.

## License

[MIT](./LICENSE). Not investment advice.
