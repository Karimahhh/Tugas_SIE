'use client'

import { CartesianGrid, ComposedChart, Legend, Line, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatINRCompact, formatNumber, formatPercent } from '@/lib/metrics'
import { useFilters } from './filter-provider'
import { KpiCard, PageHeader, Panel, EmptyState } from './panel'
import { AXIS_PROPS, DonutChart, TOOLTIP_STYLE } from './chart-utils'

export function ExecutiveSummary() {
  const { analytics } = useFilters()
  const { summary, statusData, trend } = analytics

  return (
    <>
      <PageHeader title="Executive Summary" description="Ringkasan kinerja utama layanan ride-hailing NCR." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Bookings" value={formatNumber(summary.totalBookings)} note="Seluruh status pesanan" />
        <KpiCard label="Total Revenue (INR)" value={formatINRCompact(summary.totalRevenue)} note="Dari booking Completed" tone="primary" />
        <KpiCard label="Completion Rate" value={formatPercent(summary.completionRate)} note="Completed / total bookings" tone="success" />
        <KpiCard label="Revenue Leakage" value={formatINRCompact(summary.revenueLeakage)} note="Nilai booking yang tidak terealisasi (INR)" tone="danger" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Distribusi Status Booking" description="Proporsi pesanan berdasarkan status">
          <DonutChart data={statusData} />
        </Panel>

        <Panel title="Tren Bulanan: Pendapatan vs Jumlah Pesanan" className="xl:col-span-2">
          {summary.totalBookings === 0 ? (
            <EmptyState />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="month" {...AXIS_PROPS} />
                  <YAxis yAxisId="rev" {...AXIS_PROPS} tickFormatter={(v) => formatINRCompact(v).replace('INR ', '')} width={56} />
                  <YAxis yAxisId="cnt" orientation="right" {...AXIS_PROPS} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} width={44} />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    formatter={(value, name) =>
                      name === 'Pendapatan' ? formatINRCompact(Number(value)) : formatNumber(Number(value))
                    }
                  />
                  <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Pendapatan" stroke="#1d4ed8" fill="#dbeafe" strokeWidth={2} />
                  <Line yAxisId="cnt" type="monotone" dataKey="bookings" name="Jumlah Pesanan" stroke="#6b7280" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>
    </>
  )
}
