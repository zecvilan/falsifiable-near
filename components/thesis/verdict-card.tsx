import type { HistoryPoint, TestResult, ThesisTest } from '@/lib/data'
import { fmtDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ResultBadge } from './primitives'

const SEGMENT: Record<TestResult, string> = {
  pass: 'bg-primary-foreground',
  fail: '',
  inconclusive: 'bg-primary-foreground/35',
  insufficient_data: 'border-dashed',
}

export function VerdictCard({
  tests,
  asOf,
  firstPoint,
}: {
  tests: ThesisTest[]
  asOf: string
  firstPoint?: HistoryPoint
}) {
  const passed = tests.filter((t) => t.result === 'pass').length

  return (
    <aside aria-labelledby="verdict-title" className="border border-foreground bg-card">
      <div className="flex flex-col gap-6 bg-primary p-5 text-primary-foreground md:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="verdict-title" className="label-mono !text-primary-foreground">
            Verdict today
          </h2>
          <time dateTime={asOf} className="label-mono !text-primary-foreground">
            {fmtDate(asOf)}
          </time>
        </div>

        <p className="flex items-end gap-3">
          <span
            aria-hidden="true"
            className="text-[8rem] font-medium leading-[0.78] tracking-[-0.06em] tabular-nums sm:text-[10rem]"
          >
            {passed}
            <span className="text-primary-deep">/{tests.length}</span>
          </span>
          <span aria-hidden="true" className="label-mono pb-1 !leading-relaxed !text-primary-foreground">
            claims
            <br />
            hold
          </span>
          <span className="sr-only">
            {passed} of {tests.length} claims hold.
          </span>
        </p>

        <ol aria-hidden="true" className="flex gap-1">
          {tests.map((t) => (
            <li key={t.id} className={cn('h-2.5 flex-1 border border-primary-foreground', SEGMENT[t.result])} />
          ))}
        </ol>
      </div>

      <ol className="divide-y divide-border">
        {tests.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-5 py-3 text-sm leading-snug md:px-6">
            <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground">{t.id}</span>
            <span className="min-w-0 flex-1 text-pretty">{t.claim}</span>
            <ResultBadge result={t.result} />
          </li>
        ))}
      </ol>

      {firstPoint ? (
        <p className="border-t border-border px-5 py-3 font-mono text-[11px] leading-relaxed text-muted-foreground md:px-6">
          Was {firstPoint.passed}/{tests.length} on {fmtDate(firstPoint.asOf)} under the same rules (backfilled,
          in-sample).
        </p>
      ) : null}
    </aside>
  )
}
