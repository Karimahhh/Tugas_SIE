import { getBookingsPage } from '@/lib/database'
import { EXPLORER_PAGE_SIZE, parseFilters } from '@/lib/filters'

export function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const filters = parseFilters(params)
  const page = Number(params.get('page') ?? '1')
  const query = (params.get('q') ?? '').trim()

  if (!filters) return Response.json({ error: 'Filter tidak valid.' }, { status: 400 })
  if (!Number.isSafeInteger(page) || page < 1 || page > 10_000) {
    return Response.json({ error: 'Nomor halaman tidak valid.' }, { status: 400 })
  }
  if (query.length > 100) return Response.json({ error: 'Pencarian maksimal 100 karakter.' }, { status: 400 })

  return Response.json(
    getBookingsPage(filters, query, page, EXPLORER_PAGE_SIZE),
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
