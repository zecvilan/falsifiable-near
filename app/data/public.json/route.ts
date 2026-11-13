import snapshot from '@/data/public.json'

export const dynamic = 'force-static'

export function GET() {
  return Response.json(snapshot, {
    headers: { 'Content-Disposition': 'inline; filename="near-thesis-public.json"' },
  })
}
