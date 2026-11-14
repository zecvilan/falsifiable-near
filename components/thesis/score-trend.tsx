import type { ThesisData } from '@/lib/data'

const W = 320
const H = 96
const PAD = 10
const MAX = 6

export function ScoreTrend({ history }: { history: ThesisData['history'] }) {
  if (history.length < 2) return null

  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (history.length - 1)
  const y = (v: number) => H - PAD - (v / MAX) * (H - PAD * 2)
  const path = history
    .map((h, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(h.passed).toFixed(1)}`)
    .join(' ')
  const first = history[0]
  const last = history[history.length - 1]

  return (
    <figure className="border border-border p-4">
      <figcaption className="label-mono flex items-baseline justify-between gap-4 pb-3">
        <span>Claims holding, weekly</span>
        <span>
          {first.passed}/{MAX} → {last.passed}/{MAX}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Claims holding per weekly grading: ${first.passed} of ${MAX} on ${first.asOf}, ${last.passed} of ${MAX} on ${last.asOf}`}
        className="block h-auto w-full"
      >
        {[0, 3, 6].map((v) => (
          <line key={v} x1={PAD} x2={W - PAD} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth={1} />
        ))}
        <path d={path} fill="none" className="stroke-foreground" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(history.length - 1)} cy={y(last.passed)} r={4.5} className="fill-primary stroke-foreground" strokeWidth={1.5} />
      </svg>
      <p className="pt-3 text-xs leading-relaxed text-muted-foreground">
        Backfilled with the frozen rules, so descriptive only. Not out-of-sample.
      </p>
    </figure>
  )
}
