import { ArrowDown, ArrowRight, Download } from 'lucide-react'
import type { ThesisData } from '@/lib/data'
import { fmtChange, fmtPct, fmtRatio, fmtUsd } from '@/lib/format'
import { Stat, toneOf } from './primitives'
import { LivePulse } from './live-pulse'
import { VerdictCard } from './verdict-card'

export function Hero({ data }: { data: ThesisData }) {
  const m = data.metrics
  const weeks = Math.max(data.history.length - 1, 0)
  const resultOf = (id: string) => data.tests.find((t) => t.id === id)?.result
  const takeRateBps = m.intents_take_rate_90d != null ? `${(m.intents_take_rate_90d * 10_000).toFixed(2)} bps` : '—'

  return (
    <section id="top" aria-labelledby="hero-title" className="border-b border-border">
      <div className="mx-auto flex max-w-7xl flex-col px-4 pb-12 md:px-8 md:pb-16">
        <div className="label-mono flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-b border-border py-6">
          <p>NEAR Hackathon · Investment Thesis Track</p>
          <p>A 3–5 year thesis, scored in public</p>
        </div>

        <h1
          id="hero-title"
          className="pt-12 text-[clamp(2.5rem,8vw,6.5rem)] font-medium leading-[1.04] tracking-[-0.05em] md:pt-16"
        >
          A NEAR thesis that <br className="hidden sm:block" />
          can <span className="marker">fail in public.</span>
        </h1>

        <div className="grid grid-cols-1 items-start gap-x-16 gap-y-12 pt-10 [&>*]:min-w-0 md:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]">
          <div className="flex flex-col gap-10 lg:gap-14">
            <p className="max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl md:leading-relaxed">
              <span className="text-foreground">
                The claim: NEAR&apos;s value engine has moved from blockspace to Intents, and captured Intents revenue
                can grow faster than token dilution.
              </span>{' '}
              We split that into six plain claims, each with a frozen pass/fail rule, and re-grade them on public data
              every day. Failing claims stay on the page.
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <a
                href="#scorecard"
                className="group inline-flex h-12 items-center justify-center gap-2.5 bg-foreground px-5 font-medium text-background transition-colors hover:bg-foreground/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                See the evidence
                <ArrowDown aria-hidden="true" className="size-4 transition-transform group-hover:translate-y-0.5" />
              </a>
              <a
                href="#track-record"
                className="group inline-flex h-12 items-center gap-2.5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                <span className="border-b-2 border-primary pb-0.5 transition-colors group-hover:border-foreground">
                  {weeks}-week track record
                </span>
                <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="/thesis.md"
                download="falsifiable-near-thesis.md"
                className="group inline-flex h-12 items-center gap-2.5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                <span className="border-b-2 border-primary pb-0.5 transition-colors group-hover:border-foreground">
                  Download the thesis
                </span>
                <Download aria-hidden="true" className="size-4 transition-transform group-hover:translate-y-0.5" />
              </a>
            </div>

            <dl className="grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-3">
              <Stat flush label="Intents volume, 12 months" value={fmtUsd(m.intents_volume_usd_1y)} detail={`${fmtChange(m.intents_volume_yoy_90d)} YoY (90d window)`} tone={toneOf(resultOf('T1'))} />
              <Stat flush label="Captured revenue, annualised" value={fmtUsd(m.intents_holders_revenue_annualized_90d)} detail={`${fmtChange(m.intents_holders_revenue_qoq_90d)} vs prior 90d`} tone={toneOf(resultOf('T2'))} />
              <Stat flush label="Take rate reaching holders" value={takeRateBps} detail="Of Intents swap volume, trailing 90d" />
              <Stat flush label="Daily active accounts" value={fmtChange(m.active_accounts_yoy_ratio)} detail="Trailing 90d vs a year earlier" tone={toneOf(resultOf('T3'))} />
              <Stat flush label="Holder value ÷ dilution" value={fmtRatio(m.value_accrual_coverage_90d)} detail="Needs ≥ 1.00× to offset issuance" tone={toneOf(resultOf('T5'))} />
              <Stat flush label="Gross issuance, 12 months" value={fmtPct(m.gross_issuance_rate_1y, 2)} detail="Of total supply minted per year" />
            </dl>
          </div>

          <VerdictCard tests={data.tests} asOf={data.asOf} firstPoint={data.history[0]} />
        </div>

        <div className="pt-12 md:pt-16">
          <LivePulse snapshotPrice={m.price_usd_7d} />
        </div>
      </div>
    </section>
  )
}
