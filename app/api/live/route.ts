export const revalidate = 300

const NEARBLOCKS_STATS = 'https://api.nearblocks.io/v1/stats'
const INTENTS_SUMMARY = 'https://api.llama.fi/summary/dexs/near-intents?dataType=dailyVolume&excludeTotalDataChart=true'

async function getJson(url: string) {
  const res = await fetch(url, { next: { revalidate: 300 }, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`${new URL(url).host} HTTP ${res.status}`)
  return res.json()
}

const num = (value: unknown) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export async function GET() {
  const [stats, intents] = await Promise.allSettled([getJson(NEARBLOCKS_STATS), getJson(INTENTS_SUMMARY)])
  const errors: string[] = []
  const s = stats.status === 'fulfilled' ? stats.value?.stats?.[0] : (errors.push(String(stats.reason)), null)
  const i = intents.status === 'fulfilled' ? intents.value : (errors.push(String(intents.reason)), null)

  return Response.json(
    {
      fetchedAt: new Date().toISOString(),
      priceUsd: num(s?.near_price),
      change24hPct: num(s?.change_24),
      tps: num(s?.tps),
      totalTxns: num(s?.total_txns),
      intents24hUsd: num(i?.total24h),
      intents7dUsd: num(i?.total7d),
      errors,
    },
    { status: errors.length === 2 ? 502 : 200 },
  )
}
