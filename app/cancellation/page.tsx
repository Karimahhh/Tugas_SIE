import type { Metadata } from 'next'
import { CancellationAnalysis } from '@/components/dashboard/cancellation-analysis'

export const metadata: Metadata = { title: 'Cancellation Analysis – NCR Ride Bookings' }

export default function Page() {
  return <CancellationAnalysis />
}
