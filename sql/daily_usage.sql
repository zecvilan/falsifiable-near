-- Daily base-layer usage from raw NEAR chain data.
-- Parameters: @start_date, @end_date (DATE). block_date is the partition column,
-- so the filter below bounds bytes scanned; run `make dry-run` before widening it.
SELECT
  CAST(t.block_date AS STRING) AS date,
  COUNT(DISTINCT t.signer_account_id) AS active_signers,
  COUNT(DISTINCT t.transaction_hash) AS transactions,
  COUNT(DISTINCT t.receiver_account_id) AS distinct_receivers
FROM `bigquery-public-data.crypto_near_mainnet_us.transactions` AS t
WHERE t.block_date BETWEEN @start_date AND @end_date
GROUP BY t.block_date
ORDER BY t.block_date
