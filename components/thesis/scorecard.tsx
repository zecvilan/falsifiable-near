import { ArrowUpRight } from 'lucide-react'
import type { Preregistration, TestResult, ThesisTest } from '@/lib/data'
import { cn } from '@/lib/utils'
import { ResultBadge, Section } from './primitives'
import { SOURCE_LABELS, TEST_SOURCES } from './sources'
import { formatTestNumber, parseThreshold } from './threshold'

const ANCHORS: Record<string, string> = {
  T1: '#demand',
  T2: '#demand',
  T3: '#adoption',
  T4: '#adoption',
  T5: '#value-accrual',
  T6: '#lead-lag',
}

const ACCENT: Record<TestResult, { bar: string; text: string; rail: string }> = {
  pass: { bar: 'bg-pass', text: 'text-pass-ink', rail: 'bg-pass' },
  fail: { bar: 'bg-fail', text: 'text-fail', rail: 'bg-fail' },
  inconclusive: { bar: 'bg-warn', text: 'text-warn', rail: 'bg-warn' },
  insufficient_data: { bar: 'bg-muted-foreground', text: 'text-muted-foreground', rail: 'bg-border' },
}

function ThresholdMeter({ test }: { test: ThesisTest }) {
  const { passAt, failBelow, passOperator } = parseThreshold(test)
  if (passAt == null || test.value == null) return null

  const max = Math.max(passAt * 1.5, test.value * 1.12)
  const fill = Math.min(Math.max(test.value / max, 0.01), 1) * 100
  const passPos = (passAt / max) * 100
  const failPos = failBelow != null ? (failBelow / max) * 100 : null
  const ratio = Math.round((test.value / passAt) * 100)

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-10">
        <div className="absolute inset-x-0 top-6 h-2 overflow-hidden bg-muted">
          <div className={cn('h-full', ACCENT[test.result].bar)} style={{ width: `${fill}%` }} />
        </div>
        {failPos != null ? (
          <span
            aria-hidden="true"
            className="absolute top-5 h-4 w-px bg-fail"
            style={{ left: `${failPos}%` }}
          />
        ) : null}
        <span
          aria-hidden="true"
          className="absolute top-4 h-6 w-0.5 bg-foreground"
          style={{ left: `calc(${passPos}% - 1px)` }}
        />
        <span
          aria-hidden="true"
          className="absolute top-0 -translate-x-1/2 font-mono text-[10px] leading-none text-foreground"
          style={{ left: `${Math.min(Math.max(passPos, 8), 92)}%` }}
        >
          {passOperator === '≥' ? 'PASS' : 'PASS >'}
        </span>
      </div>
      <p className="flex flex-wrap items-center justify-between gap-x-3 font-mono text-[11px] text-muted-foreground">
        <span className={cn('font-medium', ACCENT[test.result].text)}>{ratio}% of the pass line</span>
        {failBelow != null ? <span>fail &lt; {formatTestNumber(failBelow, test.unit)}</span> : <span>no inconclusive band</span>}
      </p>
    </div>
  )
}

export function Scorecard({
  tests,
  preregistration,
  sources,
}: {
  tests: ThesisTest[]
  preregistration: Preregistration
  sources: Record<string, { url: string; status: string }>
}) {
  return (
    <Section
      id="scorecard"
      eyebrow="Falsification scorecard"
      title={`Six tests, thresholds frozen at ${preregistration.thresholds_tag}`}
      lede={
        <div className="flex flex-col gap-4">
          <p>
            Each test has a numeric threshold in one constant in the pipeline (<code className="font-mono text-foreground">scripts/fetch_public.py</code>).
            A unit test pins its hash, so the rules cannot be tuned without failing CI. Every rebuild is graded with the same
            rules, so a failing test can flip, and so can a passing one.
          </p>
          <p className="rounded-md border border-warn/40 bg-warn/5 px-3 py-2 text-sm">
            <span className="font-medium text-foreground">Disclosure:</span> the thresholds were chosen after a first look at the{' '}
            {preregistration.in_sample_snapshot} snapshot, so results on that snapshot are in-sample. They were frozen on{' '}
            {preregistration.frozen_on}; only results from later snapshots are out-of-sample.{' '}
            <span className="font-mono text-xs text-foreground/80">
              This snapshot: {preregistration.out_of_sample ? 'out-of-sample' : 'in-sample'} · sha256:
              {preregistration.thresholds_sha256.slice(0, 12)}…
            </span>
          </p>
        </div>
      }
    >
      <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tests.map((test) => {
          const { passAt, passOperator } = parseThreshold(test)
          return (
            <li key={test.id} className="flex">
              <article className="panel flex w-full flex-col gap-5 overflow-hidden p-5 transition-colors hover:border-foreground">
                <span aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-0.5', ACCENT[test.result].rail)} />
                <header className="flex items-start justify-between gap-3">
                  <p className="label-mono">
                    <span className="text-foreground">{test.id}</span> · {test.pillar}
                  </p>
                  <ResultBadge result={test.result} />
                </header>
                <h3 className="text-pretty text-xl font-medium leading-snug tracking-[-0.02em]">{test.claim}</h3>

                <dl className="grid grid-cols-2 gap-4 border-y border-border py-4">
                  <div className="flex flex-col gap-1.5">
                    <dt className="label-mono !text-[10px]">Current</dt>
                    <dd className={cn('text-4xl font-medium leading-none tabular-nums tracking-[-0.04em]', ACCENT[test.result].text)}>
                      {formatTestNumber(test.value, test.unit)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <dt className="label-mono !text-[10px]">Frozen threshold</dt>
                    <dd className="text-4xl font-medium leading-none tabular-nums tracking-[-0.04em]">
                      <span className="mr-1 text-muted-foreground">{passOperator}</span>
                      {formatTestNumber(passAt, test.unit)}
                    </dd>
                  </div>
                </dl>

                <ThresholdMeter test={test} />

                <div className="flex flex-col gap-1.5 text-xs leading-relaxed text-muted-foreground">
                  <p>{test.metric}</p>
                  <p className="font-mono text-foreground/80">{test.rule}</p>
                </div>

                <footer className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="label-mono !text-[10px] mr-1">Source</span>
                    {(TEST_SOURCES[test.id] ?? []).map((key) => {
                      const url = sources[key]?.url
                      const label = SOURCE_LABELS[key]?.short ?? key
                      const className =
                        'rounded-none border border-border px-1.5 py-1 font-mono text-[10px] leading-none text-muted-foreground'
                      return url ? (
                        <a
                          key={key}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(className, 'transition-colors hover:border-foreground hover:text-foreground')}
                        >
                          {label}
                        </a>
                      ) : (
                        <span key={key} className={className}>
                          {label}
                        </span>
                      )
                    })}
                  </div>
                  <a
                    href={ANCHORS[test.id] ?? '#scorecard'}
                    className="group inline-flex w-fit items-center gap-1 border-b-2 border-primary pb-0.5 font-mono text-xs uppercase tracking-[0.1em] transition-colors hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                  >
                    See the chart
                    <ArrowUpRight aria-hidden="true" className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </a>
                </footer>
              </article>
            </li>
          )
        })}
      </ol>
    </Section>
  )
}
