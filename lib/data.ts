export type BookingStatus =
  | 'Completed'
  | 'Cancelled by Driver'
  | 'Cancelled by Customer'
  | 'No Driver Found'
  | 'Incomplete'

export type VehicleType =
  | 'Auto'
  | 'Bike'
  | 'eBike'
  | 'Go Mini'
  | 'Go Sedan'
  | 'Premier Sedan'
  | 'Uber XL'

export type PaymentMethod = 'Cash' | 'UPI' | 'Credit Card' | 'Debit Card' | 'Uber Wallet'

export interface Booking {
  date: string
  time: string
  bookingId: string
  bookingStatus: BookingStatus
  customerId: string
  vehicleType: VehicleType
  pickupLocation: string
  dropLocation: string
  avgVTAT: number | null
  avgCTAT: number | null
  cancelledRidesByCustomer: number
  reasonForCancellingByCustomer: string | null
  cancelledRidesByDriver: number
  driverCancellationReason: string | null
  incompleteRides: number
  incompleteRidesReason: string | null
  bookingValue: number
  rideDistance: number | null
  driverRatings: number | null
  customerRating: number | null
  paymentMethod: PaymentMethod | null
}

export const BOOKING_STATUSES: BookingStatus[] = [
  'Completed',
  'Cancelled by Driver',
  'Cancelled by Customer',
  'No Driver Found',
  'Incomplete',
]

export const VEHICLE_TYPES: VehicleType[] = [
  'Auto',
  'Bike',
  'eBike',
  'Go Mini',
  'Go Sedan',
  'Premier Sedan',
  'Uber XL',
]

export const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Uber Wallet']

export const MONTHS = [
  '2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06',
  '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12',
]

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export function monthLabel(month: string) {
  const [year, m] = month.split('-')
  return `${MONTH_LABELS[Number(m) - 1]} ${year}`
}

/** All filtered metrics now use the imported records directly, without sample scaling. */
export const SCALE_FACTOR = 1

export function isRevenue(booking: Booking) {
  return booking.bookingStatus === 'Completed'
}
