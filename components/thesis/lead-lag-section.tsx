import type { LeadLag } from '@/lib/data'
import { Callout, ResultBadge, Section, Stat } from './primitives'
import { LeadLagChart } from './charts/lead-lag-chart'

export function LeadLagSection({ leadLag }: { leadLag: LeadLag }) {
  const best = leadLag.best_leading
  return (
    <Section
      id="lead-lag"
      eyebrow="Market signal · T6"
      title={`Does Intents activity lead the NEAR price? ${leadLag.supported ? 'Yes, weakly.' : 'Not yet.'}`}
      lede={
        <p>
          The first draft of this thesis listed this question as untested because it had no price history. We added a price series and
          fixed the method in advance: weekly log changes, lags of −4 to +4 weeks, and a Bonferroni-adjusted threshold
          across the four leading lags.{' '}
          {leadLag.supported ? 'At least one leading lag clears the bar.' : 'No lag clears the bar.'}
        </p>
      }
    >
      <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 lg:grid-cols-[2fr_1fr]">
        <div className="panel p-4">
          <p className="mb-1 text-sm font-medium">Correlation by lag (positive = Intents leads price)</p>
          <p className="mb-4 text-xs text-muted-foreground">
            Dashed lines: critical |r| = {leadLag.critical_r?.toFixed(3)} over {leadLag.weeks} weeks
          </p>
          <LeadLagChart lags={leadLag.lags} critical={leadLag.critical_r ?? 0} />
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between panel p-4">
            <span className="text-sm">T6 result</span>
            <ResultBadge result={leadLag.supported ? 'pass' : 'fail'} />
          </div>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <Stat label="Strongest leading lag" value={best ? `${best.lag_weeks}w · r=${best.r?.toFixed(3)}` : '—'} detail={`n=${best?.n ?? 0} weekly pairs`} />
            <Stat label="Same-week correlation" value={leadLag.contemporaneous_r?.toFixed(3) ?? '—'} />
          </dl>
        </div>
      </div>
      <div className="mt-4">
        <Callout title="Why we keep a failing test">
          It stops the thesis from claiming Intents growth will be priced in. If the market starts to price in Intents
          demand, this test should flip on a future rebuild. Changing the method after looking at the results would invalidate it.
        </Callout>
      </div>
    </Section>
  )
}
