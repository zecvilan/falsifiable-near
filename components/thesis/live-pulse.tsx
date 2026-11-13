'use client'

import useSWR from 'swr'
import { fmtNum, fmtUsd } from '@/lib/format'
import type { LiveData } from '@/lib/live'

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json() as Promise<LiveData>
  })

export function LivePulse({ snapshotPrice, initial }: { snapshotPrice: number | null; initial?: LiveData }) {
  const { data, error, isLoading } = useSWR('/api/live', fetcher, {
    refreshInterval: 60_000,
    fallbackData: initial && initial.errors.length < 2 ? initial : undefined,
  })

  const items = [
    { label: 'NEAR price', value: data?.priceUsd != null ? `$${data.priceUsd.toFixed(2)}` : '—' },
    {
      label: '24h change',
      value: data?.change24hPct != null ? `${data.change24hPct >= 0 ? '+' : ''}${data.change24hPct.toFixed(1)}%` : '—',
      tone: data?.change24hPct != null ? (data.change24hPct >= 0 ? 'text-pass-ink' : 'text-fail') : '',
    },
    { label: 'Intents volume 24h', value: fmtUsd(data?.intents24hUsd) },
    { label: 'Intents volume 7d', value: fmtUsd(data?.intents7dUsd) },
    { label: 'Chain TPS', value: data?.tps != null ? String(data.tps) : '—' },
    { label: 'All-time txns', value: fmtNum(data?.totalTxns) },
  ]

  return (
    <div className="panel overflow-hidden bg-card/60" aria-live="polite" aria-busy={isLoading}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border px-4 py-2.5">
        <p className="label-mono flex items-center gap-2 !text-foreground">
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${error ? 'bg-fail' : 'animate-pulse bg-pass motion-reduce:animate-none'}`}
          />
          Live pulse
        </p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {error
            ? 'Live sources unreachable; snapshot below is unaffected'
            : data
              ? `Updated ${data.fetchedAt.slice(11, 16)} UTC · refreshes every 60s`
              : 'Loading…'}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-6">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-1 bg-card px-4 py-3">
            <dt className="label-mono !text-[10px]">{item.label}</dt>
            <dd className={`font-mono text-base font-medium tabular-nums ${item.tone ?? ''}`}>{item.value}</dd>
          </div>
        ))}
      </dl>
      {snapshotPrice != null && data?.priceUsd != null ? (
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          Snapshot model uses a 7-day average price of ${snapshotPrice.toFixed(2)}. Live values are shown for context and
          do not change any test result until the snapshot is rebuilt.
        </p>
      ) : null}
    </div>
  )
}
