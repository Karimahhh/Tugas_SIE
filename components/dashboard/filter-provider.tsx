'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_FILTERS, type Filters } from '@/lib/filters'
import type { DashboardAnalytics } from '@/lib/metrics'

interface FilterContextValue {
  applied: Filters
  draft: Filters
  setDraft: (filters: Filters) => void
  apply: () => void
  reset: () => void
  analytics: DashboardAnalytics
  totalBookings: number
  loading: boolean
  error: string | null
}

const FilterContext = createContext<FilterContextValue | null>(null)

export function FilterProvider({
  children,
  initialAnalytics,
  totalBookings,
}: {
  children: React.ReactNode
  initialAnalytics: DashboardAnalytics
  totalBookings: number
}) {
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS)
  const [applied, setApplied] = useState<Filters>(DEFAULT_FILTERS)
  const [analytics, setAnalytics] = useState(initialAnalytics)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isInitialRequest = useRef(true)

  useEffect(() => {
    if (isInitialRequest.current) {
      isInitialRequest.current = false
      return
    }

    const controller = new AbortController()
    const params = new URLSearchParams()
    Object.entries(applied).forEach(([key, value]) => params.set(key, value))

    async function loadAnalytics() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/analytics?${params}`, { signal: controller.signal })
        if (!response.ok) throw new Error(`Permintaan data gagal (HTTP ${response.status}).`)
        setAnalytics((await response.json()) as DashboardAnalytics)
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Terjadi kesalahan saat memuat data.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadAnalytics()
    return () => controller.abort()
  }, [applied])

  const value = useMemo<FilterContextValue>(
    () => ({
      applied,
      draft,
      setDraft,
      apply: () => setApplied(draft),
      reset: () => {
        setDraft(DEFAULT_FILTERS)
        setApplied(DEFAULT_FILTERS)
      },
      analytics,
      totalBookings,
      loading,
      error,
    }),
    [analytics, applied, draft, error, loading, totalBookings],
  )

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}

export function useFilters() {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilters must be used within FilterProvider')
  return ctx
}
