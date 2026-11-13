import type { Metrics, Period } from '@/lib/data'
import { fmtChange, fmtNum } from '@/lib/format'
import { Callout, Section, Stat } from './primitives'
import { ActivityChart } from './charts/activity-chart'

export function AdoptionSection({ weekly, metrics: m }: { weekly: Period[]; metrics: Metrics }) {
  const points = weekly
    .filter((w) => w.days === 7)
    .map((w) => ({
      period: w.period,
      accounts: w.active_accounts_avg ?? 0,
      txns: w.txns_avg ?? 0,
    }))

  return (
    <Section
      id="adoption"
      eyebrow="Pillar 2 · Base-layer adoption · T3, T4"
      title="Base-layer activity collapsed, but what remains pays more per account"
      lede={
        <p>
          A thesis that ignored this chart would not survive review. Daily active accounts and transactions are down
          sharply year over year. Gas fees per active account nearly doubled over the same period, which is consistent with
          incentive and bot traffic leaving and higher-value usage staying. The data supports that reading but cannot prove it.
        </p>
      }
    >
      <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col panel p-4">
          <p className="mb-1 text-sm font-medium">Average daily active accounts and transactions, weekly</p>
          <p className="mb-4 text-xs text-muted-foreground">Distinct signer accounts, not humans · NearBlocks</p>
          <div className="min-h-72 flex-1"><ActivityChart data={points} /></div>
        </div>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <Stat label="Active accounts / day, 90d" value={fmtNum(m.active_accounts_avg_90d)} detail={`${fmtChange(m.active_accounts_yoy_ratio)} vs ${fmtNum(m.active_accounts_avg_90d_yoy)} a year ago`} tone="fail" />
          <Stat label="Transactions / day, 90d" value={fmtNum(m.txns_avg_90d)} detail={`${fmtChange(m.txns_yoy_ratio)} vs ${fmtNum(m.txns_avg_90d_yoy)} a year ago`} tone="fail" />
          <Stat label="Gas fees per active account" value={`$${(m.gas_fees_per_active_account_90d ?? 0).toFixed(3)}`} detail={`${fmtChange(m.gas_fees_per_active_account_yoy_ratio)} YoY · daily average`} tone="pass" />
        </dl>
      </div>
      <div className="mt-4">
        <Callout title="Why the thesis survives a failing T3">
          The thesis does not claim NEAR wins on raw blockspace demand. It claims NEAR wins as a coordination layer
          for cross-chain flow. T3 failing is consistent with that claim. A failing T1 or T2 would not be.
        </Callout>
      </div>
    </Section>
  )
}
