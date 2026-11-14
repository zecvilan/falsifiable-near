import 'server-only'

export interface LiveData {
  fetchedAt: string
  priceUsd: number | null
  change24hPct: number | null
  tps: number | null
  totalTxns: number | null
  intents24hUsd: number | null
  intents7dUsd: number | null
  errors: string[]
}

const NEARBLOCKS_STATS = 'https://api.nearblocks.io/v1/stats'
const INTENTS_SUMMARY = 'https://api.llama.fi/summary/dexs/near-intents?dataType=dailyVolume&excludeTotalDataChart=true'

async function getJson(url: string, timeoutMs: number) {
  const res = await fetch(url, {
    next: { revalidate: 10 },
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`${new URL(url).host} HTTP ${res.status}`)
  return res.json()
}

const num = (value: unknown) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export async function getLiveData(timeoutMs = 8000): Promise<LiveData> {
  const [stats, intents] = await Promise.allSettled([
    getJson(NEARBLOCKS_STATS, timeoutMs),
    getJson(INTENTS_SUMMARY, timeoutMs),
  ])
  const errors: string[] = []
  const s = stats.status === 'fulfilled' ? stats.value?.stats?.[0] : (errors.push(String(stats.reason)), null)
  const i = intents.status === 'fulfilled' ? intents.value : (errors.push(String(intents.reason)), null)

  return {
    fetchedAt: new Date().toISOString(),
    priceUsd: num(s?.near_price),
    change24hPct: num(s?.change_24),
    tps: num(s?.tps),
    totalTxns: num(s?.total_txns),
    intents24hUsd: num(i?.total24h),
    intents7dUsd: num(i?.total7d),
    errors,
  }
}
