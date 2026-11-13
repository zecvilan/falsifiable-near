import type { Metrics, Period } from '@/lib/data'
import { fmtChange, fmtPct, fmtUsd } from '@/lib/format'
import { Callout, Section, Stat } from './primitives'
import { IntentsChart } from './charts/intents-chart'

export function DemandSection({ weekly, metrics: m }: { weekly: Period[]; metrics: Metrics }) {
  const points = weekly
    .filter((w) => w.days === 7 && w.intents_volume_usd != null)
    .map((w) => ({
      period: w.period,
      volume: w.intents_volume_usd ?? 0,
      revenue: w.intents_holders_revenue_usd ?? 0,
    }))

  return (
    <Section
      id="demand"
      eyebrow="Pillar 1 · Demand & monetisation · T1, T2"
      title="Intents demand is compounding, and NEAR is now capturing part of it"
      lede={
        <p>
          NEAR Intents lets users and agents swap assets across chains, with settlement coordinated on NEAR. Weekly
          swap volume is the leading indicator of demand. Captured revenue is the share NEAR sweeps to its revenue
          wallets. Since 23 Feb 2026, that revenue has funded open-market NEAR buybacks.
        </p>
      }
    >
      <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col panel p-4">
          <p className="mb-1 text-sm font-medium">Weekly Intents swap volume vs captured revenue</p>
          <p className="mb-4 text-xs text-muted-foreground">Complete ISO weeks · USD · DefiLlama</p>
          <div className="min-h-72 flex-1"><IntentsChart data={points} /></div>
        </div>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <Stat label="Volume, trailing 90d" value={fmtUsd(m.intents_volume_usd_90d)} detail={`${fmtChange(m.intents_volume_yoy_90d)} YoY · ${fmtChange(m.intents_volume_qoq_90d)} QoQ`} tone="pass" />
          <Stat label="Gross Intents fees, 12m" value={fmtUsd(m.intents_fees_usd_1y)} detail="Protocol + frontend affiliate fees" />
          <Stat label="Captured revenue, 90d" value={fmtUsd(m.intents_holders_revenue_usd_90d)} detail={`${fmtChange(m.intents_holders_revenue_qoq_90d)} vs prior 90d`} tone="pass" />
          <Stat label="Effective take rate" value={fmtPct(m.intents_take_rate_90d, 3)} detail={`${((m.intents_take_rate_90d ?? 0) * 10_000).toFixed(2)} bps of volume reaches holders`} />
        </dl>
      </div>
      <div className="mt-4">
        <Callout title="What this does not prove">
          Volume is swap input notional, not revenue, and part of it may be solver or wash activity. The test asks
          whether demand is growing; whether it is captured is the job of T2 and T5.
        </Callout>
      </div>
    </Section>
  )
}
