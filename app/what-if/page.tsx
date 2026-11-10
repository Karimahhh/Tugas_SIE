import type { Metadata } from 'next'
import { WhatIfAnalysis } from '@/components/dashboard/what-if-analysis'

export const metadata: Metadata = { title: 'What-If Analysis – NCR Ride Bookings' }

export default function Page() {
  return <WhatIfAnalysis />
}
