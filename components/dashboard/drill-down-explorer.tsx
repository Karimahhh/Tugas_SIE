'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import type { Booking, BookingStatus } from '@/lib/data'
import { EXPLORER_PAGE_SIZE } from '@/lib/filters'
import { formatINR, formatNumber } from '@/lib/metrics'
import { cn } from '@/lib/utils'
import { useFilters } from './filter-provider'
import { PageHeader, Panel } from './panel'

const STATUS_STYLES: Record<BookingStatus, string> = {
  Completed: 'border-green-300 bg-green-50 text-green-800',
  'Cancelled by Driver': 'border-red-300 bg-red-50 text-red-800',
  'Cancelled by Customer': 'border-orange-300 bg-orange-50 text-orange-800',
  'No Driver Found': 'border-gray-300 bg-gray-100 text-gray-700',
  Incomplete: 'border-yellow-300 bg-yellow-50 text-yellow-800',
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function DrillDownExplorer() {
  const { applied } = useFilters()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<Booking[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPage(1)
  }, [applied, query])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({
      ...applied,
      q: query.trim(),
      page: String(page),
    })

    async function loadBookings() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/bookings?${params}`, { signal: controller.signal })
        if (!response.ok) throw new Error(`Permintaan transaksi gagal (HTTP ${response.status}).`)
        const data = (await response.json()) as { rows: Booking[]; totalRows: number }
        setRows(data.rows)
        setTotalRows(data.totalRows)
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Terjadi kesalahan saat memuat transaksi.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadBookings()
    return () => controller.abort()
  }, [applied, page, query])

  const totalPages = Math.max(1, Math.ceil(totalRows / EXPLORER_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = totalRows ? (currentPage - 1) * EXPLORER_PAGE_SIZE + 1 : 0
  const end = Math.min(currentPage * EXPLORER_PAGE_SIZE, totalRows)

  return (
    <>
      <PageHeader title="Drill-Down Explorer" description="Telusuri detail transaksi per Booking ID." />

      <Panel title="Data Transaksi" description={`${formatNumber(totalRows)} baris sesuai filter`}>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <label htmlFor="search-booking" className="sr-only">
              Cari Booking ID
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="search-booking"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Cari Booking ID, mis. CNR1234567"
              className="h-9 w-full rounded border border-input bg-card pr-3 pl-8 text-sm focus-visible:outline-2 focus-visible:outline-ring"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Menampilkan {start}–{end} dari {formatNumber(totalRows)}
            {loading && <span role="status" className="ml-2">Memuat...</span>}
          </p>
        </div>

        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="px-3 py-2">Booking ID</th>
                <th scope="col" className="px-3 py-2">Tanggal</th>
                <th scope="col" className="px-3 py-2">Tipe Kendaraan</th>
                <th scope="col" className="px-3 py-2">Status Booking</th>
                <th scope="col" className="px-3 py-2">Metode Pembayaran</th>
                <th scope="col" className="px-3 py-2 text-right">Total Revenue (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {error ? (
                <tr>
                  <td colSpan={6} role="alert" className="px-3 py-8 text-center text-destructive">
                    {error}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    Tidak ada transaksi yang cocok.
                  </td>
                </tr>
              ) : (
                rows.map((b, index) => (
                  <tr key={`${b.bookingId}-${index}`} className="odd:bg-card even:bg-muted/40 hover:bg-accent">
                    <td className="px-3 py-2 font-mono text-xs">{b.bookingId}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDate(b.date)} <span className="text-muted-foreground">{b.time.slice(0, 5)}</span>
                    </td>
                    <td className="px-3 py-2">{b.vehicleType}</td>
                    <td className="px-3 py-2">
                      <span className={cn('inline-block rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap', STATUS_STYLES[b.bookingStatus])}>
                        {b.bookingStatus}
                      </span>
                    </td>
                    <td className="px-3 py-2">{b.paymentMethod ?? <span className="text-muted-foreground">-</span>}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {b.bookingStatus === 'Completed' ? (
                        formatINR(b.bookingValue)
                      ) : (
                        <span className="text-muted-foreground" title="Booking belum menghasilkan revenue">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <nav aria-label="Paginasi" className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex h-8 items-center gap-1 rounded border border-border bg-card px-3 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Sebelumnya
          </button>
          <span className="text-sm text-muted-foreground">
            Halaman <strong className="text-foreground">{currentPage}</strong> dari {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex h-8 items-center gap-1 rounded border border-border bg-card px-3 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Berikutnya
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </nav>
      </Panel>
    </>
  )
}
