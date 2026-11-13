import { cn } from '@/lib/utils'
import type { TestResult } from '@/lib/data'

const SECTION_INDEX: Record<string, string> = {
  scorecard: '01',
  'track-record': '02',
  demand: '03',
  adoption: '04',
  'value-accrual': '05',
  'lead-lag': '06',
  model: '07',
  'raw-chain': '08',
  methodology: '09',
}

const SECTION_TOTAL = String(Object.keys(SECTION_INDEX).length).padStart(2, '0')

export function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
}: {
  id: string
  eyebrow: string
  title: string
  lede?: React.ReactNode
  children: React.ReactNode
}) {
  const index = SECTION_INDEX[id]
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-32 xl:scroll-mt-20">
      <div className="mb-10 border-t border-foreground md:mb-12">
        <p className="label-mono flex items-center justify-between gap-6 border-b border-border py-4">
          <span className="flex items-center gap-2.5">
            <span aria-hidden="true" className="size-2 shrink-0 bg-primary" />
            <span>{eyebrow}</span>
          </span>
          <span aria-hidden="true" className="shrink-0 tabular-nums">
            <span className="text-foreground">{index}</span> / {SECTION_TOTAL}
          </span>
        </p>
        <div className="flex max-w-4xl flex-col gap-5 pt-8 md:pt-10">
          <h2
            id={`${id}-title`}
            className="text-balance text-3xl font-medium leading-[1.05] tracking-[-0.035em] sm:text-4xl md:text-5xl"
          >
            {title}
          </h2>
          {lede ? <div className="max-w-3xl text-pretty text-lg leading-relaxed text-muted-foreground">{lede}</div> : null}
        </div>
      </div>
      {children}
    </section>
  )
}

const RESULT_STYLES: Record<TestResult, { label: string; className: string }> = {
  pass: { label: 'Holds', className: 'bg-pass text-primary-foreground' },
  fail: { label: 'Fails', className: 'bg-fail text-white' },
  inconclusive: { label: 'Unclear', className: 'bg-warn text-white' },
  insufficient_data: { label: 'No data', className: 'bg-muted text-muted-foreground' },
}

export function ResultBadge({ result, className }: { result: TestResult; className?: string }) {
  const style = RESULT_STYLES[result]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center px-2 py-1 font-mono text-[10px] font-semibold uppercase leading-none tracking-[0.14em]',
        style.className,
        className,
      )}
    >
      {style.label}
    </span>
  )
}

export type Tone = 'default' | 'pass' | 'fail' | 'warn'

export function toneOf(result: TestResult | undefined): Tone {
  if (result === 'pass') return 'pass'
  if (result === 'fail') return 'fail'
  if (result === 'inconclusive') return 'warn'
  return 'default'
}

const TONE_TEXT: Record<Tone, string> = {
  default: '',
  pass: '',
  fail: 'text-fail',
  warn: 'text-warn',
}

const TONE_BG: Record<Tone, string> = {
  default: 'bg-input',
  pass: 'bg-pass',
  fail: 'bg-fail',
  warn: 'bg-warn',
}

export function Stat({
  label,
  value,
  detail,
  tone = 'default',
  flush = false,
}: {
  label: string
  value: string
  detail?: string
  tone?: Tone
  flush?: boolean
}) {
  return (
    <div className={cn('flex flex-col gap-3 p-4 md:p-5', flush ? 'bg-card' : 'panel')}>
      <dt className="label-mono flex items-start gap-2">
        <span aria-hidden="true" className={cn('mt-[3px] size-2 shrink-0', TONE_BG[tone])} />
        {label}
      </dt>
      <dd className={cn('text-3xl font-medium leading-none tabular-nums tracking-[-0.04em] md:text-4xl', TONE_TEXT[tone])}>
        {value}
      </dd>
      {detail ? <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p> : null}
    </div>
  )
}

export function Callout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside className="border border-border border-l-2 border-l-foreground bg-card p-4 text-sm leading-relaxed md:p-5">
      <p className="label-mono mb-2 !text-foreground">{title}</p>
      <div className="max-w-3xl text-muted-foreground">{children}</div>
    </aside>
  )
}

export function Terminal({ title = 'bash', children }: { title?: string; children: string }) {
  return (
    <div className="max-w-full min-w-0 overflow-hidden bg-foreground text-background">
      <div className="flex items-center gap-2.5 border-b border-background/15 px-4 py-2.5">
        <span aria-hidden="true" className="size-2 bg-primary" />
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-background/70">{title}</span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  )
}
