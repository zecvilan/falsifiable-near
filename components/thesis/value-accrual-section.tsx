import type { Metrics, ValueAccrualPoint } from '@/lib/data'
import { fmtChange, fmtNum, fmtPct, fmtRatio, fmtUsd } from '@/lib/format'
import { Callout, Section, Stat } from './primitives'
import { ValueAccrualChart } from './charts/value-accrual-chart'

export function ValueAccrualSection({ series, metrics: m }: { series: ValueAccrualPoint[]; metrics: Metrics }) {
  const gapMultiple = m.value_accrual_coverage_90d ? 1 / m.value_accrual_coverage_90d : null

  return (
    <Section
      id="value-accrual"
      eyebrow="Pillar 3 · Value accrual · T5"
      title="The gap that decides the thesis: holder value vs dilution"
      lede={
        <p>
          NEAR mints new supply every year. Holders are compensated by two flows: 70% of gas fees are burned, and
          captured Intents revenue is spent on buybacks. Coverage compares those flows with the dollar value of new
          issuance. Below 1.0×, a non-staking holder is being diluted.
        </p>
      }
    >
      <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col panel p-4">
          <p className="mb-1 text-sm font-medium">Monthly holder value vs value of new issuance</p>
          <p className="mb-4 text-xs text-muted-foreground">
            Issuance = Δ total supply + burned NEAR, at monthly average price · complete months only
          </p>
          <div className="min-h-72 flex-1"><ValueAccrualChart data={series} /></div>
        </div>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <Stat label="Gross issuance, 12m" value={`${fmtNum(m.gross_issuance_near_1y)} NEAR`} detail={`${fmtPct(m.gross_issuance_rate_1y, 2)} of supply · ${fmtUsd(m.issuance_value_usd_annual)} at today's price`} />
          <Stat label="Holder value, annualised" value={fmtUsd((m.intents_holders_revenue_annualized_90d ?? 0) + (m.burn_usd_annualized_90d ?? 0))} detail={`Buybacks ${fmtUsd(m.intents_holders_revenue_annualized_90d)} + burn ${fmtUsd(m.burn_usd_annualized_90d)}`} />
          <Stat label="Coverage" value={fmtRatio(m.value_accrual_coverage_90d)} detail={gapMultiple ? `Holder value must grow ${gapMultiple.toFixed(1)}× to offset dilution` : undefined} tone="fail" />
          <Stat label="Market cap ÷ holder value" value={m.market_cap_to_holder_value_annualized ? `${m.market_cap_to_holder_value_annualized.toFixed(0)}×` : '—'} detail={`Market cap ${fmtUsd(m.market_cap_usd)}`} />
        </dl>
      </div>
      <div className="mt-4">
        <Callout title="Reading the gap">
          The level is low, but the trend matters more: captured revenue changed {fmtChange(m.intents_holders_revenue_qoq_90d)} over
          the last 90 days compared with the prior 90.
          The scenario model below shows how much Intents growth closes the gap within five years, and which levers
          (take rate, issuance) matter most.
        </Callout>
      </div>
    </Section>
  )
}
