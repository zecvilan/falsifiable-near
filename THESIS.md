# Falsifiable NEAR — Long-Term Investment Thesis for NEAR Protocol

<!-- auto:status -->
**Status:** Open hypothesis, 3 of 6 tests pass on the latest snapshot (out-of-sample for the thresholds frozen at `thresholds-v1`). Not an investment recommendation.  
**Horizon:** 3–5 years.  
**Evidence snapshot:** data as of 2026-11-13, `data/public.json`. The numbers in this document are generated from that file by `make docs`, so they cannot drift from the dashboard.
<!-- /auto:status -->

---

## 1. The thesis in one sentence

> NEAR's long-term value now depends less on selling blockspace and more on NEAR Intents, its cross-chain settlement layer. The investment case holds **if and only if** captured Intents revenue grows faster than token dilution.

This is deliberately narrower than "chain abstraction will win." It names a mechanism (Intents revenue funds buybacks), a counterweight (issuance), and a measurable crossing point (coverage ≥ 1.0×).

## 2. What the evidence says today

<!-- auto:evidence -->
| Pillar | Evidence (trailing windows) | Test |
| --- | --- | --- |
| **Demand** | Intents swap volume: **$33.0B** over 12 months; trailing-90d volume **3.07×** the same window a year ago and **1.87×** the prior 90d | T1 **Pass** |
| **Monetisation** | Captured Intents revenue: **$5.2M** in the last 90d, **3.02×** the prior 90d; annualised **≈$21.2M**. Effective take rate **≈4.23 bps** of volume. Directed to open-market NEAR buybacks since 2026-02-23 | T2 **Pass** |
| **Base-layer adoption** | Avg daily active accounts **72k** vs **288k** a year earlier (**−75%**); daily transactions **752k** vs **4.62M** (**−84%**) | T3 **Fail** |
| **Activity quality** | Gas fees per active account **1.98×** year over year | T4 **Pass** |
| **Value accrual** | Gross issuance **32.1M NEAR/yr (2.51%)** ≈ **$115.9M** at $3.61. Holder value (buybacks + 70% gas burn) ≈ **$22.3M/yr**. Coverage **0.19×** | T5 **Fail** |
| **Market signal** | Weekly lead/lag of Intents volume vs NEAR price, lags 1–4w: best r = **0.0792** vs Bonferroni critical **0.2513** (99 weeks) | T6 **Fail** |
<!-- /auto:evidence -->

## 3. Tests with frozen thresholds

**Disclosure.** These tests were *not* pre-registered before any data was seen. The author had already looked at the headline numbers of the 2026-11-12 snapshot when choosing the pass/fail thresholds, so the results on that snapshot are in-sample and should be read as descriptive.

What is fixed is everything after that. The thresholds live in one constant, `THRESHOLDS` in `scripts/fetch_public.py`, and were frozen at git tag `thresholds-v1` (commit `2d75871`, 2026-11-13 22:55 UTC). A unit test pins their SHA-256 hash, so CI fails if anyone tunes them. Every later rebuild, including the daily automated one, is graded with exactly these rules, and the results on data published after the in-sample snapshot are the genuinely out-of-sample evidence. A test may flip in either direction. Any future change requires a new tag and a note in this section.

**Track record.** `data/public.json → history` re-grades all six tests at 27 weekly cut-offs (2026-05-15 to 2026-11-13) with the same frozen rules (score 1/6 in May 2026 → 3/6 in November; T4 flipped to pass in late September). Those backfilled points are look-ahead by construction and are shown only as a description of how the claims would have read. Points after the in-sample snapshot are the out-of-sample record.

<!-- auto:tests -->
| ID | Claim | Metric | Rule | Value | Result |
| --- | --- | --- | --- | --- | --- |
| T1 | More money is swapping through NEAR Intents than a year ago | Intents volume, trailing 90d vs same 90d one year earlier | pass ≥ 1.50x · fail < 1.00x · otherwise inconclusive | 3.07× | **Pass** |
| T2 | NEAR is capturing more of that flow as revenue | NEAR holders revenue (buyback-directed), trailing 90d vs prior 90d | pass ≥ 1.10x · fail < 0.90x · otherwise inconclusive | 3.02× | **Pass** |
| T3 | People still use the NEAR base layer | Avg daily active accounts, trailing 90d vs same 90d one year earlier | pass ≥ 0.90x · fail < 0.75x · otherwise inconclusive | 0.25× | **Fail** |
| T4 | Each remaining user pays more in fees | Gas fees per active account, trailing 90d vs one year earlier | pass ≥ 1.00x · fail < 0.80x · otherwise inconclusive | 1.98× | **Pass** |
| T5 | Buybacks and burn outweigh new token issuance | (Annualised Intents holders revenue + gas burn) / annual gross issuance value | pass ≥ 1.00x · fail < 0.25x · otherwise inconclusive | 0.19× | **Fail** |
| T6 | Intents activity moves before the NEAR price | Max weekly lead correlation (1–4w) vs Bonferroni critical r | pass if best leading r > critical r (0.2513) over 99 weeks · otherwise fail | 0.079 | **Fail** |

Thresholds `sha256:b9548c7a9ca04a4c…` at tag `thresholds-v1`, frozen 2026-11-13.
<!-- /auto:tests -->

Values between pass and fail are graded *inconclusive*. Missing inputs are graded *insufficient data*, never imputed.

### How the thesis would be falsified

The thesis is **wrong** if any of these happen on a future rebuild:

1. **T1 fails.** Intents volume stops growing year over year, so the demand engine has stalled.
2. **T2 fails for two consecutive quarters.** Volume grows but NEAR's captured share does not, so value leaks to solvers and frontends.
3. **T5 stops trending up.** Coverage flat or falling over 4+ quarters means monetisation cannot outrun issuance.

T3 and T6 failing are **consistent** with the thesis. It does not claim base-layer activity wins, and it does not claim the market already prices Intents. They remain on the scorecard so the thesis cannot quietly ignore them.

## 4. Scenario model

`lib/model.ts` (also interactive on the dashboard):

```
coverage_y = (V0·(1+g)^y · take + B0·(1+b)^y) / (S0·(1+i)^(y) · i · P)
```

<!-- auto:model -->
- `V0` annualised trailing-90d Intents volume ($50.2B), `take` measured holder take rate (4.25 bps), `B0` annualised gas burn ($1.08M)
- `S0` total supply (1.31B NEAR), `i` gross issuance rate (2.51%), `P` 7-day average price ($3.61), **held constant on purpose**

| Scenario | Inputs | Coverage Y0 → Y5 | Crosses 1.0× |
| --- | --- | --- | --- |
| Bear | volume flat, measured take | 0.19 → 0.17 | Never |
| Base | +50%/yr volume, measured take, burn +10%/yr | 0.19 → 1.22 | Year 5 |
| Bull | +100%/yr volume, take 6 bps, burn +20%/yr | 0.26 → 7.19 | Year 3 |

**Break-even:** at the measured take rate and issuance (burn +10%/yr), Intents volume must grow **≈44%/yr** for five years to reach coverage 1.0× by year 5. The trailing year-over-year growth rate is ≈207%.
<!-- /auto:model -->

The model is a sensitivity analysis, not a fair-value estimate. It omits discount rates, price changes, staking yield to stakers, and uncertainty bands, and it must not be used to infer a NEAR price target.

**Most important levers, in order:** Intents volume growth > holder take rate > issuance rate. A governance cut to issuance or a higher protocol fee moves the break-even date as much as years of volume growth.

## 5. Risks and open questions

- **Wash or solver-inflated volume.** Swap notional can be recycled. Mitigation to add: per-solver concentration and unique-depositor counts from the Intents Explorer API (`scripts/rebuild.py` supports this with a partner JWT).
- **Take-rate compression.** Competing intent and bridge networks may force fees toward zero. Watch T2 and the effective bps.
- **Attribution.** DefiLlama attributes volume and revenue by methodology. Revenue is reconciled against revenue.near.org and on-chain buyback wallets, but that reconciliation is theirs, not ours.
- **Active-account decline cause.** We hypothesise the end of incentive and bot campaigns. This dataset cannot separate that from organic churn. Cohort retention via BigQuery is the next step.
- **Correlation ≠ causation.** T6 is correlational and short-history by construction.

## 6. Data and reproducibility

| Source | Endpoint | Feeds |
| --- | --- | --- |
| NearBlocks | `api.nearblocks.io/v1/charts` | Transactions, active/new accounts, price, total supply |
| DefiLlama | `summary/fees/near` (`dailyFees`, `dailyRevenue`) | Gas fees, burned share |
| DefiLlama | `summary/dexs/near-intents` (`dailyVolume`) | Intents swap volume |
| DefiLlama | `summary/fees/near-intents` (`dailyFees`, `dailyHoldersRevenue`) | Intents fees, captured revenue |
| BigQuery (optional) | `bigquery-public-data.crypto_near_mainnet_us` | Raw signers, transactions, contract-level receipts |
| Intents Explorer (optional) | `explorer.near-intents.org/api/v0/transactions` | Per-swap rows (partner JWT) |

**Re-run:**

1. `make data`: keyless, standard-library Python. Rewrites `data/public.json` and re-grades all six tests.
2. `make test`: unit tests for the correlation, grading, and aggregation code, including a planted-signal test for the lead/lag detector.
3. `make dev`: dashboard reads only the checked-in snapshot. A "live pulse" panel shows current price and Intents volume for context but never changes a test result.
4. Optional deep-dive: copy `.env.example` → `.env`, set `GOOGLE_CLOUD_PROJECT`, run `make dry-run` to see estimated BigQuery bytes, then `make rebuild` to write `data/dashboard.json`. NEAR covers dataset storage, but Google Cloud bills query processing. All queries filter on the `block_date` partition. Without a billed project, export the two queries from the BigQuery console into `data/bigquery/` and run `make bq-import`. The committed 90-day exports reproduce NearBlocks' daily active accounts and transactions exactly, so T3 is not an aggregator artifact.

**Definitions.** Issuance = Δ total supply + burned NEAR (burn_usd ÷ daily price). Buybacks are treated as holder value in USD, not as supply reduction. NearBlocks circulating supply appears static and is not used. Contract usage (BigQuery) stores the top 25 contracts per day, so totals are lower bounds, and signer counts are signer-days, not unique accounts.

## 7. What would change our mind, and what we would do next

- **Upgrade to "supported":** T5 ≥ 0.5× with T1/T2 still passing; later, coverage ≥ 1.0×.
- **Downgrade to "rejected":** any falsifier in §3 triggers.
- **Next evidence to add:** solver concentration and unique depositors (Explorer API), cohort retention of signers (BigQuery), staking ratio to separate staker vs non-staker dilution.
