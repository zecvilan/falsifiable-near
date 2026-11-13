'use client'

import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import { Slider } from '@/components/ui/slider'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { ModelBaseline } from '@/lib/data'
import { breakEvenGrowth, HORIZON_YEARS, projectScenario, type ScenarioInputs } from '@/lib/model'
import { fmtPct, fmtRatio, fmtUsd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Section } from './primitives'
import { AXIS_PROPS, GRID_PROPS } from './charts/theme'

const config = { coverage: { label: 'Coverage', color: 'var(--foreground)' } } satisfies ChartConfig

export function ScenarioModel({ baseline, coverageNow }: { baseline: ModelBaseline; coverageNow: number | null }) {
  const measuredTake = Math.round(baseline.intents_take_rate * 10_000 * 4) / 4
  const measuredIssuance = Math.round(baseline.issuance_rate * 1000) / 10

  const presets: { name: string; description: string; inputs: ScenarioInputs }[] = [
    { name: 'Bear', description: 'Intents volume flat, take rate as measured', inputs: { volumeGrowth: 0, takeRateBps: measuredTake, issuanceRate: baseline.issuance_rate, burnGrowth: 0 } },
    { name: 'Base', description: '+50%/yr volume, measured take rate', inputs: { volumeGrowth: 0.5, takeRateBps: measuredTake, issuanceRate: baseline.issuance_rate, burnGrowth: 0.1 } },
    { name: 'Bull', description: '+100%/yr volume, take rate 6 bps', inputs: { volumeGrowth: 1, takeRateBps: 6, issuanceRate: baseline.issuance_rate, burnGrowth: 0.2 } },
  ]

  const [inputs, setInputs] = useState<ScenarioInputs>(presets[1].inputs)
  const years = useMemo(() => projectScenario(baseline, inputs), [baseline, inputs])
  const breakEven = useMemo(() => breakEvenGrowth(baseline, inputs), [baseline, inputs])
  const final = years[HORIZON_YEARS]
  const crossYear = years.find((y) => y.year > 0 && y.coverage >= 1)?.year

  const set = (key: keyof ScenarioInputs) => (value: number | readonly number[]) =>
    setInputs((prev) => ({ ...prev, [key]: Array.isArray(value) ? value[0] : (value as number) }))

  const controls: {
    key: keyof ScenarioInputs
    label: string
    min: number
    max: number
    step: number
    scale: number
    display: (v: number) => string
    hint: string
  }[] = [
    { key: 'volumeGrowth', label: 'Intents volume growth / yr', min: -50, max: 200, step: 5, scale: 100, display: (v) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(0)}%`, hint: `Measured trailing YoY: ${fmtPct((baseline.intents_volume_yoy_90d ?? 1) - 1, 0)}` },
    { key: 'takeRateBps', label: 'Holder take rate (bps of volume)', min: 0, max: 15, step: 0.25, scale: 1, display: (v) => `${v.toFixed(2)} bps`, hint: `Measured 90d: ${measuredTake.toFixed(2)} bps` },
    { key: 'issuanceRate', label: 'Gross issuance / yr', min: 0, max: 5, step: 0.1, scale: 100, display: (v) => fmtPct(v, 1), hint: `Measured 12m: ${measuredIssuance.toFixed(1)}%` },
    { key: 'burnGrowth', label: 'Gas burn growth / yr', min: -50, max: 200, step: 5, scale: 100, display: (v) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(0)}%`, hint: 'Gas burn is small either way' },
  ]

  return (
    <Section
      id="model"
      eyebrow="Scenario model · re-run it yourself"
      title="How fast must Intents grow for holders to stop being diluted?"
      lede={
        <p>
          Year 0 is the measured baseline from the snapshot. Coverage each year is (Intents volume × take rate + gas
          burn) ÷ (supply × issuance rate × price). Price is held constant on purpose: this is a sensitivity analysis
          of the token&apos;s economics, not a price target.
        </p>
      }
    >
      <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-5 panel p-5">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Scenario presets">
            {presets.map((preset) => {
              const active = JSON.stringify(preset.inputs) === JSON.stringify(inputs)
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setInputs(preset.inputs)}
                  aria-pressed={active}
                  title={preset.description}
                  className={cn(
                    'rounded-md border px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
                    active ? 'border-foreground bg-foreground text-background' : 'border-input hover:border-foreground',
                  )}
                >
                  {preset.name}
                </button>
              )
            })}
          </div>
          {controls.map((control) => (
            <div key={control.key} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <label id={`${control.key}-label`} className="text-sm">
                  {control.label}
                </label>
                <span className="font-mono text-sm tabular-nums text-foreground">{control.display(inputs[control.key])}</span>
              </div>
              <Slider
                aria-labelledby={`${control.key}-label`}
                min={control.min}
                max={control.max}
                step={control.step}
                value={[inputs[control.key] * control.scale]}
                onValueChange={(value) => {
                  const raw = Array.isArray(value) ? value[0] : (value as number)
                  set(control.key)(raw / control.scale)
                }}
              />
              <p className="text-xs text-muted-foreground">{control.hint}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-3 gap-3">
            <div className="panel p-4">
              <dt className="label-mono mb-3">Coverage today</dt>
              <dd className="text-3xl font-medium leading-none tabular-nums tracking-[-0.04em]">{fmtRatio(coverageNow ?? years[0].coverage)}</dd>
            </div>
            <div className="panel p-4">
              <dt className="label-mono mb-3">Coverage, year {HORIZON_YEARS}</dt>
              <dd className={cn('text-3xl font-medium leading-none tabular-nums tracking-[-0.04em]', final.coverage >= 1 ? 'text-pass-ink' : 'text-fail')}>
                {fmtRatio(final.coverage)}
              </dd>
            </div>
            <div className="panel p-4">
              <dt className="label-mono mb-3">Break-even growth</dt>
              <dd className="text-3xl font-medium leading-none tabular-nums tracking-[-0.04em]">
                {breakEven == null ? 'n/a' : `${(breakEven * 100).toFixed(0)}%/yr`}
              </dd>
            </div>
          </dl>
          <div className="panel p-4">
            <p className="mb-4 text-sm">
              {crossYear
                ? `Holder value overtakes dilution in year ${crossYear}.`
                : `Holder value does not overtake dilution within ${HORIZON_YEARS} years under these inputs.`}
            </p>
            <ChartContainer config={config} className="aspect-auto h-56 w-full">
              <LineChart data={years.map((y) => ({ year: y.year, coverage: Number(y.coverage.toFixed(3)) }))} margin={{ left: 4, right: 12, top: 8 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis {...AXIS_PROPS} dataKey="year" tickFormatter={(v: number) => `Y${v}`} />
                <YAxis {...AXIS_PROPS} width={44} tickFormatter={(v: number) => `${v}×`} />
                <ReferenceLine y={1} stroke="var(--warn)" strokeDasharray="4 3" label={{ value: 'BREAK-EVEN 1.0×', fill: 'var(--warn)', fontSize: 10, fontFamily: 'var(--font-mono)', position: 'insideTopLeft' }} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => `Year ${p?.[0]?.payload?.year}`} />} />
                <Line dataKey="coverage" stroke="var(--color-coverage)" strokeWidth={2} dot={{ r: 4, fill: 'var(--primary)', stroke: 'var(--foreground)', strokeWidth: 1.5 }} type="monotone" />
              </LineChart>
            </ChartContainer>
          </div>
          <div className="overflow-x-auto panel">
            <table className="w-full text-sm">
              <caption className="sr-only">Scenario projection by year</caption>
              <thead className="label-mono !text-[10px]">
                <tr className="border-b">
                  <th scope="col" className="px-3 py-2 text-left font-normal">Year</th>
                  <th scope="col" className="px-3 py-2 text-right font-normal">Intents volume</th>
                  <th scope="col" className="px-3 py-2 text-right font-normal">Buybacks + burn</th>
                  <th scope="col" className="px-3 py-2 text-right font-normal">Issuance value</th>
                  <th scope="col" className="px-3 py-2 text-right font-normal">Coverage</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {years.map((y) => (
                  <tr key={y.year} className="border-b last:border-0">
                    <th scope="row" className="px-3 py-2 text-left font-normal">Y{y.year}</th>
                    <td className="px-3 py-2 text-right">{fmtUsd(y.volume)}</td>
                    <td className="px-3 py-2 text-right">{fmtUsd(y.holderValue + y.burn)}</td>
                    <td className="px-3 py-2 text-right">{fmtUsd(y.issuanceValue)}</td>
                    <td className={cn('px-3 py-2 text-right', y.coverage >= 1 ? 'text-pass-ink' : 'text-muted-foreground')}>{fmtRatio(y.coverage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Section>
  )
}
