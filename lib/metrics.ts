import { type Booking, isRevenue, MONTHS, monthLabel, SCALE_FACTOR } from './data'

export interface SummaryMetrics {
  totalBookings: number
  totalRevenue: number
  revenueLeakage: number
  completionRate: number
  avgBookingValue: number
  avgCustomerRating: number
  avgDriverRating: number
}

export interface CountMetric {
  name: string
  value: number
}

export interface DashboardAnalytics {
  summary: SummaryMetrics
  statusData: CountMetric[]
  trend: { month: string; bookings: number; revenue: number }[]
  driverReasons: CountMetric[]
  customerReasons: CountMetric[]
  cancellationCounts: { driver: number; customer: number }
  cancellationByVehicle: { name: string; count: number; driver: number; customer: number }[]
  revenueByVehicle: { name: string; revenue: number }[]
  paymentData: CountMetric[]
  driverLoss: number
  noDriverLoss: number
}

export function formatINRCompact(value: number) {
  const format = (amount: number, divisor: number, suffix: string, digits: number) =>
    `INR ${new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(amount / divisor)}${suffix}`
  const amount = Math.abs(value)
  if (amount >= 1_000_000_000) return format(value, 1_000_000_000, 'B', 2)
  if (amount >= 1_000_000) return format(value, 1_000_000, 'M', 2)
  if (amount >= 1_000) return format(value, 1_000, 'K', 1)
  return formatINR(value)
}

export function formatINR(value: number) {
  return `INR ${Math.round(value).toLocaleString('en-US')}`
}

export function formatNumber(value: number) {
  return Math.round(value).toLocaleString('id-ID')
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`
}

export function computeSummary(rows: Booking[]) {
  const completed = rows.filter(isRevenue)
  const revenueSample = completed.reduce((acc, b) => acc + b.bookingValue, 0)
  const leakageSample = rows.filter((b) => !isRevenue(b)).reduce((acc, b) => acc + b.bookingValue, 0)
  const rated = completed.filter((b) => b.customerRating !== null)
  const driverRated = completed.filter((b) => b.driverRatings !== null)

  return {
    totalBookings: rows.length * SCALE_FACTOR,
    sampleBookings: rows.length,
    totalRevenue: revenueSample * SCALE_FACTOR,
    revenueLeakage: leakageSample * SCALE_FACTOR,
    completionRate: rows.length ? (completed.length / rows.length) * 100 : 0,
    avgBookingValue: completed.length ? revenueSample / completed.length : 0,
    avgCustomerRating: rated.length
      ? rated.reduce((acc, b) => acc + (b.customerRating ?? 0), 0) / rated.length
      : 0,
    avgDriverRating: driverRated.length
      ? driverRated.reduce((acc, b) => acc + (b.driverRatings ?? 0), 0) / driverRated.length
      : 0,
  }
}

export function countBy<T extends string>(rows: Booking[], key: (b: Booking) => T | null) {
  const counts = new Map<T, number>()
  for (const row of rows) {
    const k = key(row)
    if (k === null || k === '') continue
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, value: count * SCALE_FACTOR }))
    .sort((a, b) => b.value - a.value)
}

export function monthlyTrend(rows: Booking[], monthsInRange: string[] = MONTHS) {
  return monthsInRange.map((month) => {
    const inMonth = rows.filter((b) => b.date.startsWith(month))
    const revenue = inMonth.filter(isRevenue).reduce((acc, b) => acc + b.bookingValue, 0)
    return {
      month: monthLabel(month),
      bookings: inMonth.length * SCALE_FACTOR,
      revenue: revenue * SCALE_FACTOR,
    }
  })
}
