import type { HistoryPoint, Preregistration, TestResult, ThesisTest } from '@/lib/data'
import { fmtDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Section } from './primitives'

const CELL: Record<TestResult, string> = {
  pass: 'bg-pass',
  fail: 'bg-fail',
  inconclusive: 'bg-warn',
  insufficient_data: 'bg-muted',
}

const LABEL: Record<TestResult, string> = {
  pass: 'pass',
  fail: 'fail',
  inconclusive: 'inconclusive',
  insufficient_data: 'no data',
}

function flips(history: HistoryPoint[], id: string) {
  const graded = history.map((p) => p.results[id]).filter((r) => r && r !== 'insufficient_data')
  let count = 0
  for (let i = 1; i < graded.length; i++) {
    if (graded[i] !== graded[i - 1]) count++
  }
  return count
}

export function TrackRecord({
  history,
  tests,
  preregistration,
}: {
  history: HistoryPoint[]
  tests: ThesisTest[]
  preregistration: Preregistration
}) {
  if (history.length === 0) return null
  const first = history[0]
  const last = history[history.length - 1]
  const outOfSample = history.filter((p) => !p.in_sample).length

  return (
    <Section
      id="track-record"
      eyebrow="Track record"
      title={`${history.length} weekly gradings, same frozen rules`}
      lede={
        <div className="flex flex-col gap-3">
          <p>
            Every column re-grades all six claims as of that week&apos;s data, using exactly the thresholds at{' '}
            <code className="font-mono text-foreground">{preregistration.thresholds_tag}</code>. From{' '}
            {fmtDate(first.asOf)} to {fmtDate(last.asOf)} the score moved from {first.passed}/6 to {last.passed}/6.
          </p>
          <p className="rounded-md border border-warn/40 bg-warn/5 px-3 py-2 text-sm">
            <span className="font-medium text-foreground">Read this as descriptive.</span> These weeks are backfilled with
            rules chosen in November 2026, after the data was seen, so they show how the claims would have read, not a
            forecast that came true. Columns after {fmtDate(preregistration.in_sample_snapshot)} are out-of-sample:{' '}
            <span className="font-mono text-foreground">{outOfSample}</span> so far. The weekly grid is anchored to the latest snapshot, so the count grows by one each week; every committed snapshot stays in git history.
          </p>
        </div>
      }
    >
      <div className="panel p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-y-1.5">
            <caption className="sr-only">
              Weekly pass or fail result for each of the six claims from {fmtDate(first.asOf)} to {fmtDate(last.asOf)}
            </caption>
            <thead>
              <tr>
                <th scope="col" className="w-64 pb-2 text-left label-mono !text-[10px] font-normal">
                  Claim
                </th>
                <th scope="col" className="pb-2 text-left label-mono !text-[10px] font-normal">
                  <span className="flex justify-between font-mono">
                    <span>{fmtDate(first.asOf)}</span>
                    <span>{fmtDate(last.asOf)}</span>
                  </span>
                </th>
                <th scope="col" className="w-16 pb-2 text-right label-mono !text-[10px] font-normal">
                  Flips
                </th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => (
                <tr key={test.id}>
                  <th scope="row" className="pr-4 text-left align-middle text-sm font-normal leading-snug">
                    <span className="font-mono text-xs text-muted-foreground">{test.id}</span>{' '}
                    <span className="text-pretty">{test.claim}</span>
                  </th>
                  <td className="align-middle">
                    <div className="flex gap-[3px]">
                      {history.map((p) => {
                        const result = p.results[test.id] ?? 'insufficient_data'
                        return (
                          <span
                            key={p.asOf}
                            title={`${test.id} · ${fmtDate(p.asOf)} · ${LABEL[result]}`}
                            className={cn('h-6 flex-1 rounded-none', CELL[result], p.in_sample && 'opacity-80')}
                          />
                        )
                      })}
                    </div>
                  </td>
                  <td className="text-right align-middle font-mono text-sm tabular-nums text-muted-foreground">
                    {flips(history, test.id)}
                  </td>
                </tr>
              ))}
              <tr>
                <th scope="row" className="pr-4 pt-2 text-left label-mono !text-[10px] font-normal">
                  Claims holding
                </th>
                <td className="pt-2 align-bottom">
                  <div className="flex h-10 items-end gap-[3px]" aria-hidden="true">
                    {history.map((p) => (
                      <span
                        key={p.asOf}
                        title={`${fmtDate(p.asOf)} · ${p.passed}/6`}
                        className="flex-1 rounded-none bg-foreground"
                        style={{ height: `${Math.max(p.passed / 6, 0.04) * 100}%` }}
                      />
                    ))}
                  </div>
                </td>
                <td className="pt-2 text-right align-bottom font-mono text-sm tabular-nums">{last.passed}/6</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
          {(['pass', 'inconclusive', 'fail', 'insufficient_data'] as const).map((r) => (
            <li key={r} className="flex items-center gap-2">
              <span aria-hidden="true" className={cn('size-3 rounded-none', CELL[r])} />
              {LABEL[r]}
            </li>
          ))}
          <li className="ml-auto font-mono">Source: data/public.json · history</li>
        </ul>
      </div>
    </Section>
  )
}
