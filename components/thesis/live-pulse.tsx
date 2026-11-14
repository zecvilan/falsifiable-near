'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { fmtNum, fmtUsd } from '@/lib/format'
import type { LiveData } from '@/lib/live'

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json() as Promise<LiveData>
  })

const REFRESH_MS = 15_000

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function statusLine(fetchedAt: string, now: number | null, validating: boolean) {
  const time = `${fetchedAt.slice(11, 19)} UTC`
  if (now == null) return `Updated ${time}`
  if (validating) return `Updated ${time} · refreshing…`
  const age = Math.max(0, Math.floor((now - Date.parse(fetchedAt)) / 1000))
  const ago = age < 60 ? `${age}s ago` : `${Math.floor(age / 60)}m ${age % 60}s ago`
  return `Updated ${time} · ${ago} · refreshes every ${REFRESH_MS / 1000}s`
}

export function LivePulse({ snapshotPrice, initial }: { snapshotPrice: number | null; initial?: LiveData }) {
  const { data, error, isLoading, isValidating } = useSWR('/api/live', fetcher, {
    refreshInterval: REFRESH_MS,
    refreshWhenHidden: false,
    fallbackData: initial && initial.errors.length < 2 ? initial : undefined,
  })
  const now = useNow()

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
        <p className="font-mono text-[11px] tabular-nums text-muted-foreground" aria-live="off">
          {error && !data
            ? 'Live sources unreachable; snapshot below is unaffected'
            : data
              ? statusLine(data.fetchedAt, now, isValidating)
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
