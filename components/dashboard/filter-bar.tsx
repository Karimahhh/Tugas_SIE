'use client'

import { useId } from 'react'
import { BOOKING_STATUSES, MONTHS, monthLabel, PAYMENT_METHODS, VEHICLE_TYPES } from '@/lib/data'
import { ALL, DEFAULT_FILTERS, type Filters } from '@/lib/filters'
import { useFilters } from './filter-provider'

interface SelectFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded border border-input bg-card px-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

const monthOptions = MONTHS.map((m) => ({ value: m, label: monthLabel(m) }))
const withAll = (items: string[], allLabel: string) => [
  { value: ALL, label: allLabel },
  ...items.map((v) => ({ value: v, label: v })),
]

function countActive(filters: Filters) {
  return (Object.keys(filters) as (keyof Filters)[]).filter(
    (k) => filters[k] !== DEFAULT_FILTERS[k],
  ).length
}

export function FilterBar() {
  const { draft, setDraft, apply, reset, applied, analytics, totalBookings, loading, error } = useFilters()
  const update = (key: keyof Filters) => (value: string) => setDraft({ ...draft, [key]: value })
  const pending = JSON.stringify(draft) !== JSON.stringify(applied)
  const activeCount = countActive(applied)

  return (
    <section aria-label="Filter global" className="border-b border-border bg-card">
      <form
        className="grid grid-cols-2 gap-3 px-4 py-3 md:grid-cols-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto] lg:px-6"
        onSubmit={(e) => {
          e.preventDefault()
          apply()
        }}
      >
        <SelectField label="Dari Bulan" value={draft.monthFrom} onChange={update('monthFrom')} options={monthOptions} />
        <SelectField label="Sampai Bulan" value={draft.monthTo} onChange={update('monthTo')} options={monthOptions} />
        <SelectField
          label="Tipe Kendaraan"
          value={draft.vehicleType}
          onChange={update('vehicleType')}
          options={withAll(VEHICLE_TYPES, 'Semua Kendaraan')}
        />
        <SelectField
          label="Status Booking"
          value={draft.bookingStatus}
          onChange={update('bookingStatus')}
          options={withAll(BOOKING_STATUSES, 'Semua Status')}
        />
        <SelectField
          label="Metode Pembayaran"
          value={draft.paymentMethod}
          onChange={update('paymentMethod')}
          options={withAll(PAYMENT_METHODS, 'Semua Metode')}
        />
        <div className="col-span-2 flex items-end gap-2 md:col-span-1">
          <button
            type="submit"
            className="h-9 flex-1 rounded bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 xl:flex-none"
          >
            Terapkan Filter
          </button>
          <button
            type="button"
            onClick={reset}
            className="h-9 flex-1 rounded border border-border bg-card px-4 text-sm font-medium hover:bg-muted xl:flex-none"
          >
            Reset Filter
          </button>
        </div>
      </form>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-muted/60 px-4 py-1.5 text-xs text-muted-foreground lg:px-6">
        <span>
          Filter aktif: <strong className="text-foreground">{activeCount}</strong>
        </span>
        <span>
          Baris data cocok:{' '}
          <strong className="text-foreground">{analytics.summary.totalBookings.toLocaleString('id-ID')}</strong> dari{' '}
          {totalBookings.toLocaleString('id-ID')}
        </span>
        {loading && <span role="status">Memuat data...</span>}
        {error && <span role="alert" className="font-medium text-destructive">{error}</span>}
        {pending && <span className="font-medium text-primary">Ada perubahan filter yang belum diterapkan.</span>}
      </div>
    </section>
  )
}
