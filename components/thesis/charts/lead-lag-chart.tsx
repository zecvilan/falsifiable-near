'use client'

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { AXIS_PROPS, GRID_PROPS, annotationLabel } from './theme'

const config = {
  r: { label: 'Correlation r', color: 'var(--chart-1)' },
} satisfies ChartConfig

export function LeadLagChart({
  lags,
  critical,
}: {
  lags: { lag_weeks: number; r: number | null; n: number }[]
  critical: number
}) {
  const data = lags.map((l) => ({ lag: l.lag_weeks, r: l.r ?? 0, n: l.n }))
  const bound = Math.max(0.3, critical * 1.2, ...data.map((d) => Math.abs(d.r) * 1.1))
  const strongest = data.reduce<(typeof data)[number] | null>((best, d) => (best == null || Math.abs(d.r) > Math.abs(best.r) ? d : best), null)

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <BarChart data={data} margin={{ left: 0, right: 8, top: 16 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis {...AXIS_PROPS} dataKey="lag" tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v}w`} />
        <YAxis {...AXIS_PROPS} domain={[-bound, bound]} width={40} tickFormatter={(v: number) => v.toFixed(2)} />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.6} />
        <ReferenceLine
          y={critical}
          stroke="var(--warn)"
          strokeDasharray="4 3"
          label={{ ...annotationLabel('var(--warn)', 'right'), value: `+${critical.toFixed(2)} critical`, dy: -8 }}
        />
        <ReferenceLine y={-critical} stroke="var(--warn)" strokeDasharray="4 3" />
        <ChartTooltip
          cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
          content={
            <ChartTooltipContent
              hideIndicator
              labelFormatter={(_, payload) => {
                const lag = Number(payload?.[0]?.payload?.lag ?? 0)
                return lag > 0 ? `Intents leads price by ${lag}w` : lag < 0 ? `Price leads Intents by ${-lag}w` : 'Same week'
              }}
              formatter={(value, _name, item) => (
                <span className="font-mono tabular-nums">
                  r = {Number(value).toFixed(3)} · n = {item?.payload?.n}
                </span>
              )}
            />
          }
        />
        <Bar dataKey="r">
          {data.map((d) => (
            <Cell
              key={d.lag}
              fill={d.lag > 0 ? 'var(--chart-1)' : 'var(--chart-5)'}
              fillOpacity={1}
              stroke={d === strongest ? 'var(--foreground)' : 'none'}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
