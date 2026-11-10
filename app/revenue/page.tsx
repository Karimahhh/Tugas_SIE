import type { Metadata } from 'next'
import { RevenueAnalytics } from '@/components/dashboard/revenue-analytics'

export const metadata: Metadata = { title: 'Revenue & Customer – NCR Ride Bookings' }

export default function Page() {
  return <RevenueAnalytics />
}
