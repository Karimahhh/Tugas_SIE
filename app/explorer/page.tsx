import type { Metadata } from 'next'
import { DrillDownExplorer } from '@/components/dashboard/drill-down-explorer'

export const metadata: Metadata = { title: 'Drill-Down Explorer – NCR Ride Bookings' }

export default function Page() {
  return <DrillDownExplorer />
}
