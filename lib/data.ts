import 'server-only'
import publicSnapshot from '@/data/public.json'
import bigquerySnapshot from '@/data/dashboard.json'

export type TestResult = 'pass' | 'fail' | 'inconclusive' | 'insufficient_data'

export interface ThesisTest {
  id: string
  claim: string
  pillar: string
  name: string
  metric: string
  value: number | null
  unit: string
  rule: string
  result: TestResult
}

export interface Period {
  period: string
  days: number
  txns_avg: number | null
  active_accounts_avg: number | null
  new_accounts: number | null
  price_usd: number | null
  total_supply_near: number | null
  gas_fees_usd: number | null
  burn_usd: number | null
  intents_volume_usd: number | null
  intents_fees_usd: number | null
  intents_holders_revenue_usd: number | null
}

export interface LeadLag {
  method: string
  weeks: number
  critical_r: number | null
  lags: { lag_weeks: number; r: number | null; n: number }[]
  best_leading: { lag_weeks: number; r: number | null; n: number } | null
  contemporaneous_r: number | null
  supported: boolean
}

export interface ModelBaseline {
  price_usd: number
  total_supply_near: number
  issuance_rate: number
  intents_volume_usd_annual: number
  intents_take_rate: number
  burn_usd_annual: number
  intents_volume_yoy_90d: number
}

export type Metrics = Record<string, number | null>

interface PublicSnapshot {
  generatedAt: string
  asOf: string
  window: { start: string; end: string; days: number }
  sources: Record<string, { url: string; status: string }>
  metrics: Metrics
  tests: ThesisTest[]
  leadLag: LeadLag
  model: ModelBaseline
  history: HistoryPoint[]
  weekly: Period[]
  monthly: Period[]
  limitations: string[]
  preregistration: Preregistration
}

export interface HistoryPoint {
  asOf: string
  in_sample: boolean
  passed: number
  results: Record<string, TestResult>
  values: Record<string, number | null>
}

export interface Preregistration {
  thresholds_tag: string
  thresholds_sha256: string
  frozen_on: string
  in_sample_snapshot: string
  out_of_sample: boolean
}

interface BigQuerySnapshot {
  generatedAt: string | null
  window: { start: string; end: string; days: number } | null
  onchain: { date: string; active_signers: number; transactions: number; distinct_receivers?: number }[]
  contracts: {
    date: string
    contract_account: string
    function_call_receipts: number
    originating_transactions: number
    initiating_signer_days: number
  }[]
  intents: { month: string; volume_usd: number; completed_swaps: number }[]
  crosscheck?: {
    weekly: {
      period: string
      days: number
      bigquery_signers_avg: number
      nearblocks_active_avg: number
      bigquery_txns_avg: number
      nearblocks_txns_avg: number
    }[]
    summary: { weeks: number; exact_weeks: number; signers_ratio: number | null; txns_ratio: number | null }
  }
  sources: Record<string, { status: string; message?: string; mode?: string }>
  limitations: string[]
}

const snapshot = publicSnapshot as unknown as PublicSnapshot
const bigquery = bigquerySnapshot as unknown as BigQuerySnapshot

export interface ValueAccrualPoint {
  period: string
  holderValue: number
  burn: number
  issuanceValue: number | null
}

function valueAccrualSeries(monthly: Period[]): ValueAccrualPoint[] {
  return monthly
    .map((month, index) => {
      const previous = monthly[index - 1]
      const burnedNear = month.burn_usd && month.price_usd ? month.burn_usd / month.price_usd : 0
      const netIssued =
        previous?.total_supply_near && month.total_supply_near
          ? month.total_supply_near - previous.total_supply_near
          : null
      return {
        period: month.period,
        days: month.days,
        holderValue: month.intents_holders_revenue_usd ?? 0,
        burn: month.burn_usd ?? 0,
        issuanceValue: netIssued !== null && month.price_usd ? (netIssued + burnedNear) * month.price_usd : null,
      }
    })
    .filter((point, index) => index > 0 && point.days >= 28)
    .map(({ days: _days, ...point }) => point)
}

function topContracts(rows: BigQuerySnapshot['contracts']) {
  const totals = new Map<string, { receipts: number; transactions: number; signerDays: number; days: number }>()
  for (const row of rows) {
    const entry = totals.get(row.contract_account) ?? { receipts: 0, transactions: 0, signerDays: 0, days: 0 }
    entry.receipts += row.function_call_receipts
    entry.transactions += row.originating_transactions
    entry.signerDays += row.initiating_signer_days
    entry.days += 1
    totals.set(row.contract_account, entry)
  }
  return [...totals.entries()]
    .map(([contract, value]) => ({ contract, ...value }))
    .sort((a, b) => b.receipts - a.receipts)
    .slice(0, 10)
}

export function getThesisData() {
  return {
    generatedAt: snapshot.generatedAt,
    asOf: snapshot.asOf,
    window: snapshot.window,
    sources: snapshot.sources,
    metrics: snapshot.metrics,
    tests: snapshot.tests,
    leadLag: snapshot.leadLag,
    model: snapshot.model,
    history: snapshot.history,
    weekly: snapshot.weekly,
    valueAccrual: valueAccrualSeries(snapshot.monthly),
    limitations: snapshot.limitations,
    preregistration: snapshot.preregistration,
    bigquery: {
      status: bigquery.sources.bigquery?.status ?? 'not_run',
      message: bigquery.sources.bigquery?.message,
      intentsStatus: bigquery.sources.intents?.status ?? 'not_configured',
      generatedAt: bigquery.generatedAt,
      window: bigquery.window,
      onchain: bigquery.onchain,
      mode: bigquery.sources.bigquery?.mode ?? 'live',
      topContracts: topContracts(bigquery.contracts),
      crosscheck: bigquery.crosscheck ?? null,
      limitations: bigquery.limitations,
    },
  }
}

export type ThesisData = ReturnType<typeof getThesisData>
