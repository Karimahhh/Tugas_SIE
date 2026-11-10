import { BOOKING_STATUSES, MONTHS, PAYMENT_METHODS, VEHICLE_TYPES } from './data'

export interface Filters {
  monthFrom: string
  monthTo: string
  vehicleType: string
  bookingStatus: string
  paymentMethod: string
}

export const ALL = 'all'

export const DEFAULT_FILTERS: Filters = {
  monthFrom: MONTHS[0],
  monthTo: MONTHS[MONTHS.length - 1],
  vehicleType: ALL,
  bookingStatus: ALL,
  paymentMethod: ALL,
}

function contains(items: readonly string[], value: string) {
  return items.includes(value)
}

export function parseFilters(params: URLSearchParams): Filters | null {
  const filters: Filters = {
    monthFrom: params.get('monthFrom') ?? DEFAULT_FILTERS.monthFrom,
    monthTo: params.get('monthTo') ?? DEFAULT_FILTERS.monthTo,
    vehicleType: params.get('vehicleType') ?? ALL,
    bookingStatus: params.get('bookingStatus') ?? ALL,
    paymentMethod: params.get('paymentMethod') ?? ALL,
  }

  if (!MONTHS.includes(filters.monthFrom) || !MONTHS.includes(filters.monthTo)) return null
  if (filters.vehicleType !== ALL && !contains(VEHICLE_TYPES, filters.vehicleType)) {
    return null
  }
  if (filters.bookingStatus !== ALL && !contains(BOOKING_STATUSES, filters.bookingStatus)) {
    return null
  }
  if (filters.paymentMethod !== ALL && !contains(PAYMENT_METHODS, filters.paymentMethod)) {
    return null
  }

  return filters
}

export const EXPLORER_PAGE_SIZE = 15
