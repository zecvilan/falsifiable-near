import { getLiveData } from '@/lib/live'

export const revalidate = 300

export async function GET() {
  const live = await getLiveData()
  return Response.json(live, { status: live.errors.length === 2 ? 502 : 200 })
}
