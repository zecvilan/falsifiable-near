'use client'

import { Bar, CartesianGrid, ComposedChart, Line, ReferenceDot, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { fmtDate, fmtMonth, fmtUsd } from '@/lib/format'
import { AXIS_PROPS, GRID_PROPS, annotationLabel } from './theme'

const config = {
  volume: { label: 'Swap volume', color: 'var(--chart-1)' },
  revenue: { label: 'Captured revenue', color: 'var(--chart-2)' },
} satisfies ChartConfig

export function IntentsChart({ data }: { data: { period: string; volume: number; revenue: number }[] }) {
  const peak = data.reduce<(typeof data)[number] | null>((best, d) => (best == null || d.volume > best.volume ? d : best), null)
  const latest = data[data.length - 1]

  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full lg:h-full lg:min-h-72">
      <ComposedChart data={data} margin={{ left: 0, right: 0, top: 24 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis {...AXIS_PROPS} dataKey="period" minTickGap={48} tickFormatter={(v: string) => fmtMonth(v)} />
        <YAxis {...AXIS_PROPS} yAxisId="volume" width={52} tickFormatter={(v: number) => fmtUsd(v)} />
        <YAxis {...AXIS_PROPS} yAxisId="revenue" orientation="right" width={52} tickFormatter={(v: number) => fmtUsd(v)} />
        <ChartTooltip
          cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => `Week of ${fmtDate(String(payload?.[0]?.payload?.period ?? ''))}`}
              formatter={(value, name) => (
                <div className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">{config[name as keyof typeof config]?.label}</span>
                  <span className="font-mono tabular-nums">{fmtUsd(Number(value))}</span>
                </div>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar yAxisId="volume" dataKey="volume" fill="var(--color-volume)" />
        <Line yAxisId="revenue" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} type="monotone" />
        {peak ? (
          <ReferenceDot
            yAxisId="volume"
            x={peak.period}
            y={peak.volume}
            r={4}
            fill="var(--chart-1)"
            stroke="var(--background)"
            strokeWidth={2}
            label={{ ...annotationLabel('var(--foreground)'), value: `peak ${fmtUsd(peak.volume)}` }}
          />
        ) : null}
        {latest ? (
          <ReferenceDot
            yAxisId="revenue"
            x={latest.period}
            y={latest.revenue}
            r={4}
            fill="var(--chart-2)"
            stroke="var(--background)"
            strokeWidth={2}
            label={{ ...annotationLabel('var(--chart-2)', 'top'), value: `now ${fmtUsd(latest.revenue)}` }}
          />
        ) : null}
      </ComposedChart>
    </ChartContainer>
  )
}
