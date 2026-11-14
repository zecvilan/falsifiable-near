import { getLiveData } from '@/lib/live'

export const dynamic = 'force-dynamic'

export async function GET() {
  const live = await getLiveData()
  return Response.json(live, {
    status: live.errors.length === 2 ? 502 : 200,
    // Short shared cache keeps upstream APIs under their free rate limits while staying near-real-time.
    headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20' },
  })
}
