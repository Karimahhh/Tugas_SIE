import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'
import type { Booking, BookingStatus, PaymentMethod, VehicleType } from './data'
import { MONTHS, monthLabel } from './data'
import type { Filters } from './filters'
import type { DashboardAnalytics } from './metrics'

interface DatabaseBooking {
  date: string
  time: string
  booking_id: string
  booking_status: BookingStatus
  customer_id: string
  vehicle_type: VehicleType
  pickup_location: string
  drop_location: string
  avg_vtat: number | null
  avg_ctat: number | null
  cancelled_rides_by_customer: number
  reason_for_cancelling_by_customer: string | null
  cancelled_rides_by_driver: number
  driver_cancellation_reason: string | null
  incomplete_rides: number
  incomplete_rides_reason: string | null
  booking_value: number
  ride_distance: number | null
  driver_ratings: number | null
  customer_rating: number | null
  payment_method: PaymentMethod | null
}

interface AnalyticsRow {
  total_bookings: number
  completed_bookings: number
  total_revenue: number
  revenue_leakage: number
  avg_booking_value: number | null
  avg_customer_rating: number | null
  avg_driver_rating: number | null
  driver_cancellations: number
  customer_cancellations: number
  driver_loss: number
  no_driver_loss: number
}

const databasePath = resolve(process.cwd(), 'data/ncr_ride_bookings.sqlite')
const database = new DatabaseSync(databasePath, { readOnly: true })

function filterWhere(filters: Filters) {
  const [from, to] =
    filters.monthFrom <= filters.monthTo
      ? [filters.monthFrom, filters.monthTo]
      : [filters.monthTo, filters.monthFrom]
  const [year, month] = to.split('-').map(Number)
  const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`
  const clauses = ['date >= ?', 'date < ?']
  const params: (string | number)[] = [`${from}-01`, `${nextMonth}-01`]

  if (filters.vehicleType !== 'all') {
    clauses.push('vehicle_type = ?')
    params.push(filters.vehicleType)
  }
  if (filters.bookingStatus !== 'all') {
    clauses.push('booking_status = ?')
    params.push(filters.bookingStatus)
  }
  if (filters.paymentMethod !== 'all') {
    clauses.push('payment_method = ?')
    params.push(filters.paymentMethod)
  }

  return { where: clauses.join(' AND '), params, from, to }
}

export function getTotalBookings() {
  const result = database.prepare('SELECT COUNT(*) AS count FROM bookings').get() as { count: number }
  return result.count
}

export function getDashboardAnalytics(filters: Filters): DashboardAnalytics {
  const { where, params, from, to } = filterWhere(filters)
  const summary = database.prepare(`
    SELECT
      COUNT(*) AS total_bookings,
      SUM(CASE WHEN booking_status = 'Completed' THEN 1 ELSE 0 END) AS completed_bookings,
      SUM(CASE WHEN booking_status = 'Completed' THEN booking_value ELSE 0 END) AS total_revenue,
      SUM(CASE WHEN booking_status <> 'Completed' THEN booking_value ELSE 0 END) AS revenue_leakage,
      AVG(CASE WHEN booking_status = 'Completed' THEN booking_value END) AS avg_booking_value,
      AVG(CASE WHEN booking_status = 'Completed' THEN customer_rating END) AS avg_customer_rating,
      AVG(CASE WHEN booking_status = 'Completed' THEN driver_ratings END) AS avg_driver_rating,
      SUM(CASE WHEN booking_status = 'Cancelled by Driver' THEN 1 ELSE 0 END) AS driver_cancellations,
      SUM(CASE WHEN booking_status = 'Cancelled by Customer' THEN 1 ELSE 0 END) AS customer_cancellations,
      SUM(CASE WHEN booking_status = 'Cancelled by Driver' THEN booking_value ELSE 0 END) AS driver_loss,
      SUM(CASE WHEN booking_status = 'No Driver Found' THEN booking_value ELSE 0 END) AS no_driver_loss
    FROM bookings WHERE ${where}
  `).get(...params) as unknown as AnalyticsRow
  const total = summary.total_bookings ?? 0
  const completed = summary.completed_bookings ?? 0

  const statusRows = database.prepare(`
    SELECT booking_status AS name, COUNT(*) AS value
    FROM bookings WHERE ${where}
    GROUP BY booking_status ORDER BY value DESC
  `).all(...params) as { name: string; value: number }[]

  const driverReasonRows = database.prepare(`
    SELECT driver_cancellation_reason AS name, COUNT(*) AS value
    FROM bookings WHERE ${where} AND driver_cancellation_reason IS NOT NULL AND driver_cancellation_reason <> ''
    GROUP BY driver_cancellation_reason ORDER BY value DESC
  `).all(...params) as { name: string; value: number }[]

  const customerReasonRows = database.prepare(`
    SELECT reason_for_cancelling_by_customer AS name, COUNT(*) AS value
    FROM bookings WHERE ${where} AND reason_for_cancelling_by_customer IS NOT NULL AND reason_for_cancelling_by_customer <> ''
    GROUP BY reason_for_cancelling_by_customer ORDER BY value DESC
  `).all(...params) as { name: string; value: number }[]

  const cancellationByVehicle = database.prepare(`
    SELECT
      vehicle_type AS name,
      COUNT(*) AS count,
      SUM(CASE WHEN booking_status = 'Cancelled by Driver' THEN 1 ELSE 0 END) AS driver_count,
      SUM(CASE WHEN booking_status = 'Cancelled by Customer' THEN 1 ELSE 0 END) AS customer_count
    FROM bookings WHERE ${where}
    GROUP BY vehicle_type ORDER BY count DESC
  `).all(...params) as { name: string; count: number; driver_count: number; customer_count: number }[]

  const revenueRows = database.prepare(`
    SELECT vehicle_type AS name, SUM(booking_value) AS revenue
    FROM bookings WHERE ${where} AND booking_status = 'Completed'
    GROUP BY vehicle_type ORDER BY revenue DESC
  `).all(...params) as { name: string; revenue: number }[]

  const paymentRows = database.prepare(`
    SELECT payment_method AS name, COUNT(*) AS value
    FROM bookings WHERE ${where} AND payment_method IS NOT NULL AND payment_method <> ''
    GROUP BY payment_method ORDER BY value DESC
  `).all(...params) as { name: string; value: number }[]

  const monthlyRows = database.prepare(`
    SELECT
      substr(date, 1, 7) AS month,
      COUNT(*) AS bookings,
      SUM(CASE WHEN booking_status = 'Completed' THEN booking_value ELSE 0 END) AS revenue
    FROM bookings WHERE ${where}
    GROUP BY month
  `).all(...params) as { month: string; bookings: number; revenue: number }[]
  const byMonth = new Map(monthlyRows.map((row) => [row.month, row]))
  const toCountMetrics = (rows: { name: string; value: number }[]) =>
    rows.map((row) => ({ name: row.name, value: row.value }))

  return {
    summary: {
      totalBookings: total,
      totalRevenue: summary.total_revenue ?? 0,
      revenueLeakage: summary.revenue_leakage ?? 0,
      completionRate: total ? (completed / total) * 100 : 0,
      avgBookingValue: summary.avg_booking_value ?? 0,
      avgCustomerRating: summary.avg_customer_rating ?? 0,
      avgDriverRating: summary.avg_driver_rating ?? 0,
    },
    statusData: toCountMetrics(statusRows),
    trend: MONTHS.filter((month) => month >= from && month <= to).map((month) => {
      const row = byMonth.get(month)
      return {
        month: monthLabel(month),
        bookings: row?.bookings ?? 0,
        revenue: row?.revenue ?? 0,
      }
    }),
    driverReasons: toCountMetrics(driverReasonRows),
    customerReasons: toCountMetrics(customerReasonRows),
    cancellationCounts: {
      driver: summary.driver_cancellations ?? 0,
      customer: summary.customer_cancellations ?? 0,
    },
    cancellationByVehicle: cancellationByVehicle.map((row) => ({
      name: row.name,
      count: row.count,
      driver: Number(((row.driver_count / row.count) * 100).toFixed(1)),
      customer: Number(((row.customer_count / row.count) * 100).toFixed(1)),
    })),
    revenueByVehicle: revenueRows.map((row) => ({ name: row.name, revenue: row.revenue })),
    paymentData: toCountMetrics(paymentRows),
    driverLoss: summary.driver_loss ?? 0,
    noDriverLoss: summary.no_driver_loss ?? 0,
  }
}

function mapBookingRows(rows: DatabaseBooking[]): Booking[] {
  return rows.map((row) => ({
    date: row.date,
    time: row.time,
    bookingId: row.booking_id,
    bookingStatus: row.booking_status,
    customerId: row.customer_id,
    vehicleType: row.vehicle_type,
    pickupLocation: row.pickup_location,
    dropLocation: row.drop_location,
    avgVTAT: row.avg_vtat,
    avgCTAT: row.avg_ctat,
    cancelledRidesByCustomer: row.cancelled_rides_by_customer,
    reasonForCancellingByCustomer: row.reason_for_cancelling_by_customer,
    cancelledRidesByDriver: row.cancelled_rides_by_driver,
    driverCancellationReason: row.driver_cancellation_reason,
    incompleteRides: row.incomplete_rides,
    incompleteRidesReason: row.incomplete_rides_reason,
    bookingValue: row.booking_value,
    rideDistance: row.ride_distance,
    driverRatings: row.driver_ratings,
    customerRating: row.customer_rating,
    paymentMethod: row.payment_method,
  }))
}

export function getBookingsPage(filters: Filters, query: string, page: number, pageSize: number) {
  const { where, params } = filterWhere(filters)
  const searchClause = query ? ' AND instr(upper(booking_id), upper(?)) > 0' : ''
  const searchParams = query ? [...params, query] : params
  const totalResult = database.prepare(`
    SELECT COUNT(*) AS count FROM bookings WHERE ${where}${searchClause}
  `).get(...searchParams) as { count: number }
  const offset = (page - 1) * pageSize
  const rows = database.prepare(`
    SELECT
      date, time, booking_id, booking_status, customer_id, vehicle_type,
      pickup_location, drop_location, avg_vtat, avg_ctat,
      cancelled_rides_by_customer, reason_for_cancelling_by_customer,
      cancelled_rides_by_driver, driver_cancellation_reason, incomplete_rides,
      incomplete_rides_reason, booking_value, ride_distance, driver_ratings,
      customer_rating, payment_method
    FROM bookings
    WHERE ${where}${searchClause}
    ORDER BY date DESC, time DESC, id DESC
    LIMIT ? OFFSET ?
  `).all(...searchParams, pageSize, offset) as unknown as DatabaseBooking[]

  return { rows: mapBookingRows(rows), totalRows: totalResult.count }
}
