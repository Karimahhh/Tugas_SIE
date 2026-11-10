'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatINR, formatINRCompact } from '@/lib/metrics'
import { useFilters } from './filter-provider'
import { EmptyState, KpiCard, PageHeader, Panel } from './panel'
import { AXIS_PROPS, DonutChart, TOOLTIP_STYLE } from './chart-utils'

export function RevenueAnalytics() {
  const { analytics } = useFilters()
  const { summary, revenueByVehicle, paymentData } = analytics

  return (
    <>
      <PageHeader title="Revenue & Customer Analytics" description="Kinerja pendapatan dan kepuasan pelanggan." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Revenue (INR)" value={formatINRCompact(summary.totalRevenue)} tone="primary" />
        <KpiCard label="Avg Booking Value" value={formatINR(summary.avgBookingValue)} note="INR per perjalanan selesai" />
        <KpiCard
          label="Rating Pelanggan"
          value={summary.avgCustomerRating ? `${summary.avgCustomerRating.toFixed(2)} / 5` : '-'}
          note="Rata-rata Customer Rating"
        />
        <KpiCard
          label="Rating Driver"
          value={summary.avgDriverRating ? `${summary.avgDriverRating.toFixed(2)} / 5` : '-'}
          note="Rata-rata Driver Ratings"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Total Pendapatan per Tipe Kendaraan" className="xl:col-span-2">
          {revenueByVehicle.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByVehicle} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" {...AXIS_PROPS} />
                  <YAxis {...AXIS_PROPS} tickFormatter={(v) => formatINRCompact(v).replace('INR ', '')} width={56} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatINRCompact(Number(v))} cursor={{ fill: '#f3f4f6' }} />
                  <Bar dataKey="revenue" name="Pendapatan" fill="#1d4ed8" barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
        <Panel title="Distribusi Metode Pembayaran" description="Berdasarkan jumlah transaksi">
          <DonutChart data={paymentData} />
        </Panel>
      </div>
    </>
  )
}
