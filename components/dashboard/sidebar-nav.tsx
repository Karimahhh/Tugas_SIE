'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Ban, Wallet, SlidersHorizontal, Table2, Car } from 'lucide-react'
import { cn } from '@/lib/utils'

export const NAV_ITEMS = [
  { href: '/', label: 'Executive Summary', icon: BarChart3 },
  { href: '/cancellation', label: 'Cancellation Analysis', icon: Ban },
  { href: '/revenue', label: 'Revenue & Customer', icon: Wallet },
  { href: '/what-if', label: 'What-If Analysis', icon: SlidersHorizontal },
  { href: '/explorer', label: 'Drill-Down Explorer', icon: Table2 },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <aside className="border-b border-border bg-sidebar lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:border-r lg:border-b-0">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex size-8 items-center justify-center rounded bg-primary text-primary-foreground">
          <Car className="size-4" aria-hidden="true" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">NCR Ride Bookings</p>
        </div>
      </div>
      <nav aria-label="Navigasi utama" className="overflow-x-auto">
        <ul className="flex gap-1 p-2 lg:flex-col">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded px-3 py-2 text-sm whitespace-nowrap',
                    active
                      ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                      : 'text-foreground hover:bg-muted',
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
