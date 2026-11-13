'use client'

import { Bar, CartesianGrid, ComposedChart, Line, ReferenceDot, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { ValueAccrualPoint } from '@/lib/data'
import { fmtMonth, fmtUsd } from '@/lib/format'
import { AXIS_PROPS, GRID_PROPS, annotationLabel } from './theme'

const config = {
  holderValue: { label: 'Intents buybacks', color: 'var(--chart-1)' },
  burn: { label: 'Gas burn', color: 'var(--chart-2)' },
  issuanceValue: { label: 'New issuance value', color: 'var(--chart-4)' },
} satisfies ChartConfig

export function ValueAccrualChart({ data }: { data: ValueAccrualPoint[] }) {
  const latest = [...data].reverse().find((d) => d.issuanceValue != null)

  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full lg:h-full lg:min-h-72">
      <ComposedChart data={data} margin={{ left: 0, right: 8, top: 24 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis {...AXIS_PROPS} dataKey="period" minTickGap={24} tickFormatter={(v: string) => fmtMonth(v)} />
        <YAxis {...AXIS_PROPS} width={52} tickFormatter={(v: number) => fmtUsd(v)} />
        <ChartTooltip
          cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => fmtMonth(String(payload?.[0]?.payload?.period ?? ''))}
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
        <Bar dataKey="holderValue" stackId="value" fill="var(--color-holderValue)" />
        <Bar dataKey="burn" stackId="value" fill="var(--color-burn)" />
        <Line dataKey="issuanceValue" stroke="var(--color-issuanceValue)" strokeWidth={2} strokeDasharray="5 4" dot={false} type="monotone" connectNulls />
        {latest && latest.issuanceValue != null ? (
          <ReferenceDot
            x={latest.period}
            y={latest.issuanceValue}
            r={4}
            fill="var(--chart-4)"
            stroke="var(--background)"
            strokeWidth={2}
            label={{ ...annotationLabel('var(--chart-4)', 'top'), value: `dilution ${fmtUsd(latest.issuanceValue)}` }}
          />
        ) : null}
      </ComposedChart>
    </ChartContainer>
  )
}
