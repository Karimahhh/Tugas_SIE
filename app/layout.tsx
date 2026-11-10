import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { FilterProvider } from '@/components/dashboard/filter-provider'
import { SidebarNav } from '@/components/dashboard/sidebar-nav'
import { FilterBar } from '@/components/dashboard/filter-bar'
import { DEFAULT_FILTERS } from '@/lib/filters'
import { getDashboardAnalytics, getTotalBookings } from '@/lib/database'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'NCR Ride Bookings',
  description:
    'Ringkasan kinerja operasional dan eksekutif NCR Ride Bookings: KPI, pembatalan, pendapatan, simulasi, dan eksplorasi transaksi.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f3f4f6',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const initialAnalytics = getDashboardAnalytics(DEFAULT_FILTERS)
  const totalBookings = getTotalBookings()

  return (
    <html lang="id" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <FilterProvider initialAnalytics={initialAnalytics} totalBookings={totalBookings}>
          <SidebarNav />
          <div className="lg:pl-60">
            <FilterBar />
            <main className="px-4 py-5 lg:px-6">{children}</main>
          </div>
        </FilterProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
