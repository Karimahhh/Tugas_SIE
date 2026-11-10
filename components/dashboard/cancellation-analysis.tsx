'use client'

import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatNumber, formatPercent } from '@/lib/metrics'
import { useFilters } from './filter-provider'
import { EmptyState, KpiCard, PageHeader, Panel } from './panel'
import { AXIS_PROPS, TOOLTIP_STYLE } from './chart-utils'

function ReasonChart({ data, color }: { data: { name: string; value: number }[]; color: string }) {
  if (data.length === 0) return <EmptyState />
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e5e7eb" horizontal={false} />
          <XAxis type="number" {...AXIS_PROPS} tickFormatter={(v) => (v >= 1000 ? `${Number((v / 1000).toFixed(1))}K` : String(v))} allowDecimals={false} />
          <YAxis type="category" dataKey="name" {...AXIS_PROPS} width={170} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatNumber(Number(v))} cursor={{ fill: '#f3f4f6' }} />
          <Bar dataKey="value" name="Jumlah" fill={color} barSize={20}>
            <LabelList dataKey="value" position="right" fontSize={11} fill="#374151" formatter={(v) => formatNumber(Number(v))} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CancellationAnalysis() {
  const { analytics } = useFilters()
  const { driverReasons, customerReasons, cancellationByVehicle, cancellationCounts } = analytics
  const total = analytics.summary.totalBookings || 1
  const driverCount = cancellationCounts.driver
  const customerCount = cancellationCounts.customer

  return (
    <>
      <PageHeader title="Cancellation Analysis" description="Analisis alasan dan tingkat pembatalan pesanan." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total Cancellation Rate"
          value={formatPercent(((driverCount + customerCount) / total) * 100)}
          note="Driver + customer"
          tone="danger"
        />
        <KpiCard label="Dibatalkan Driver" value={formatPercent((driverCount / total) * 100)} note={`${formatNumber(driverCount)} pesanan`} />
        <KpiCard label="Dibatalkan Customer" value={formatPercent((customerCount / total) * 100)} note={`${formatNumber(customerCount)} pesanan`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Alasan Pembatalan oleh Driver" description="Diurutkan dari yang terbanyak (tanpa nilai kosong)">
          <ReasonChart data={driverReasons} color="#1d4ed8" />
        </Panel>
        <Panel title="Alasan Pembatalan oleh Customer" description="Diurutkan dari yang terbanyak (tanpa nilai kosong)">
          <ReasonChart data={customerReasons} color="#6b7280" />
        </Panel>
      </div>

      <Panel title="Cancellation Rate per Tipe Kendaraan" description="Persentase pembatalan terhadap total pesanan tiap tipe kendaraan" className="mt-4">
        {cancellationByVehicle.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cancellationByVehicle} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" {...AXIS_PROPS} />
                <YAxis {...AXIS_PROPS} tickFormatter={(v) => `${v}%`} width={44} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => `${v}%`} cursor={{ fill: '#f3f4f6' }} />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="driver" name="Oleh Driver" stackId="c" fill="#1d4ed8" />
                <Bar dataKey="customer" name="Oleh Customer" stackId="c" fill="#93c5fd" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
    </>
  )
}
