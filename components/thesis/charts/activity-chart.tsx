'use client'

import { Area, CartesianGrid, ComposedChart, Line, ReferenceDot, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { fmtDate, fmtMonth, fmtNum } from '@/lib/format'
import { AXIS_PROPS, GRID_PROPS, annotationLabel } from './theme'

const config = {
  accounts: { label: 'Active accounts / day', color: 'var(--chart-3)' },
  txns: { label: 'Transactions / day', color: 'var(--chart-4)' },
} satisfies ChartConfig

export function ActivityChart({ data }: { data: { period: string; accounts: number; txns: number }[] }) {
  const latest = data[data.length - 1]
  const peak = data.reduce<(typeof data)[number] | null>((best, d) => (best == null || d.accounts > best.accounts ? d : best), null)

  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full lg:h-full lg:min-h-72">
      <ComposedChart data={data} margin={{ left: 0, right: 0, top: 24 }}>
        <defs>
          <linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis {...AXIS_PROPS} dataKey="period" minTickGap={48} tickFormatter={(v: string) => fmtMonth(v)} />
        <YAxis {...AXIS_PROPS} yAxisId="accounts" width={44} tickFormatter={(v: number) => fmtNum(v)} />
        <YAxis {...AXIS_PROPS} yAxisId="txns" orientation="right" width={44} tickFormatter={(v: number) => fmtNum(v)} />
        <ChartTooltip
          cursor={{ stroke: 'var(--muted-foreground)', strokeDasharray: '3 3' }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => `Week of ${fmtDate(String(payload?.[0]?.payload?.period ?? ''))}`}
              formatter={(value, name) => (
                <div className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">{config[name as keyof typeof config]?.label}</span>
                  <span className="font-mono tabular-nums">{fmtNum(Number(value))}</span>
                </div>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Area yAxisId="accounts" dataKey="accounts" type="monotone" fill="url(#activity-fill)" stroke="var(--color-accounts)" strokeWidth={1.75} />
        <Line yAxisId="txns" dataKey="txns" type="monotone" stroke="var(--color-txns)" strokeWidth={1.75} dot={false} />
        {peak ? (
          <ReferenceDot
            yAxisId="accounts"
            x={peak.period}
            y={peak.accounts}
            r={4}
            fill="var(--background)"
            stroke="var(--chart-3)"
            strokeWidth={2}
            label={{ ...annotationLabel('var(--foreground)', 'right'), value: `peak ${fmtNum(peak.accounts)}` }}
          />
        ) : null}
        {latest && latest !== peak ? (
          <ReferenceDot
            yAxisId="accounts"
            x={latest.period}
            y={latest.accounts}
            r={4}
            fill="var(--chart-4)"
            stroke="var(--background)"
            strokeWidth={2}
            label={{ ...annotationLabel('var(--chart-4)', 'top'), value: `now ${fmtNum(latest.accounts)}` }}
          />
        ) : null}
      </ComposedChart>
    </ChartContainer>
  )
}
