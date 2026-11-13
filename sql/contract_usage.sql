SELECT
  CAST(ra.block_date AS STRING) AS date,
  ra.receipt_receiver_account_id AS contract_account,
  COUNT(DISTINCT ra.receipt_id) AS function_call_receipts,
  COUNT(DISTINCT rot.originated_from_transaction_hash) AS originating_transactions,
  COUNT(DISTINCT t.signer_account_id) AS initiating_signer_days
FROM `bigquery-public-data.crypto_near_mainnet_us.receipt_actions` AS ra
JOIN `bigquery-public-data.crypto_near_mainnet_us.receipt_origin_transaction` AS rot
  ON rot.receipt_id = ra.receipt_id
JOIN `bigquery-public-data.crypto_near_mainnet_us.transactions` AS t
  ON t.transaction_hash = rot.originated_from_transaction_hash
WHERE ra.block_date BETWEEN @start_date AND @end_date
  AND rot.block_date BETWEEN @start_date AND @end_date
  AND t.block_date BETWEEN @start_date AND @end_date
  AND ra.action_kind = 'FUNCTION_CALL'
GROUP BY ra.block_date, contract_account
QUALIFY ROW_NUMBER() OVER (PARTITION BY ra.block_date ORDER BY COUNT(DISTINCT ra.receipt_id) DESC) <= 25
ORDER BY ra.block_date, function_call_receipts DESC
