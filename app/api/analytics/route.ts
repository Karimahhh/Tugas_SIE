import { getDashboardAnalytics } from '@/lib/database'
import { parseFilters } from '@/lib/filters'

export function GET(request: Request) {
  const filters = parseFilters(new URL(request.url).searchParams)
  if (!filters) return Response.json({ error: 'Filter tidak valid.' }, { status: 400 })

  return Response.json(getDashboardAnalytics(filters), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
