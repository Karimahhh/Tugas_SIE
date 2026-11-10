import { cn } from '@/lib/utils'

export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-4">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </header>
  )
}

export function Panel({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded border border-border bg-card', className)}>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function KpiCard({
  label,
  value,
  note,
  tone = 'default',
}: {
  label: string
  value: string
  note?: string
  tone?: 'default' | 'primary' | 'danger' | 'success'
}) {
  return (
    <div className="rounded border border-border bg-card px-4 py-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-semibold tabular-nums',
          tone === 'primary' && 'text-primary',
          tone === 'danger' && 'text-destructive',
          tone === 'success' && 'text-green-700',
        )}
      >
        {value}
      </p>
      {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
    </div>
  )
}

export function EmptyState() {
  return (
    <div className="flex h-full min-h-40 items-center justify-center text-sm text-muted-foreground">
      Tidak ada data untuk filter yang dipilih.
    </div>
  )
}
