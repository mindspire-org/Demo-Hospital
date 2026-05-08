/**
 * Shared modern UI primitives for finance pages - gradient hero, KPI cards,
 * modern section cards and tables. Used by Trial Balance, Balance Sheet,
 * Profit & Loss, Journal Vouchers, Ledger Explorer, Petty Cash and AR pages.
 */
import type { ReactNode } from 'react'

/** Full-width gradient hero bar with icon, title, subtitle, and right-side actions. */
export function HeroHeader({
  icon: Icon,
  title,
  subtitle,
  gradient = 'from-indigo-600 via-blue-600 to-cyan-600',
  actions,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: ReactNode
  gradient?: string
  actions?: ReactNode
}) {
  return (
    <div className={`relative overflow-hidden bg-linear-to-br ${gradient} text-white`}>
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
              {subtitle && <div className="mt-1 text-sm text-white/80">{subtitle}</div>}
            </div>
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          )}
        </div>
      </div>
    </div>
  )
}

/** KPI stat card with gradient icon, title, and value. */
export function KpiCard({
  icon: Icon,
  label,
  value,
  gradient = 'from-blue-500 to-indigo-600',
  tone,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: ReactNode
  gradient?: string
  tone?: 'good' | 'bad' | 'neutral'
  hint?: ReactNode
}) {
  const valueClass =
    tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' :
    tone === 'bad'  ? 'text-rose-600 dark:text-rose-400' :
    'text-slate-900 dark:text-white'
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg shadow-slate-200/50 transition-all hover:shadow-xl dark:bg-slate-900 dark:shadow-slate-900/50">
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-linear-to-br ${gradient} opacity-10 blur-2xl transition group-hover:opacity-20`} />
      <div className="relative">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${gradient} text-white shadow-lg`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className={`mt-1 text-3xl font-bold tracking-tight ${valueClass}`}>{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
        </div>
      </div>
    </div>
  )
}

/** Sticky frosted toolbar that lives just under the hero. */
export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky top-0 z-10 border-b border-slate-200/60 bg-white/80 px-6 py-3 backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

/** Modern section card - heavier shadow, rounded-2xl, dark-aware. */
export function SectionCard({
  title,
  subtitle,
  right,
  children,
  className = '',
}: {
  title?: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-200/50 dark:bg-slate-900 dark:shadow-slate-900/50 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>}
            {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          {right && <div className="text-sm">{right}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  )
}

/** Pretty hero-styled action button for the header (frosted glass). */
export function HeroButton({
  icon: Icon,
  children,
  variant = 'glass',
  className = '',
  ...props
}: {
  icon?: React.ComponentType<{ className?: string }>
  children: ReactNode
  variant?: 'glass' | 'solid'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50'
  const styles =
    variant === 'solid'
      ? 'bg-white text-slate-900 shadow-lg hover:bg-slate-100'
      : 'bg-white/15 text-white backdrop-blur-sm hover:bg-white/25 ring-1 ring-white/20'
  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  )
}

/** Sleek modern table - row hover, sticky header, zebra. */
export function ModernTable<T extends { id?: string }>({
  columns,
  rows,
  empty = 'No data',
  maxHeight,
}: {
  columns: Array<{ key: string; header: ReactNode; render?: (r: T) => ReactNode; className?: string; headerClassName?: string }>
  rows: T[]
  empty?: ReactNode
  maxHeight?: string
}) {
  return (
    <div className={`overflow-auto ${maxHeight || ''}`} style={maxHeight ? { maxHeight } : undefined}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm dark:bg-slate-800/95">
          <tr>
            {columns.map(c => (
              <th
                key={c.key}
                className={`whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 ${c.headerClassName || ''}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-10 text-center text-sm text-slate-400">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr
                key={r.id || i}
                className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
              >
                {columns.map(c => (
                  <td
                    key={c.key}
                    className={`whitespace-nowrap px-5 py-3 text-slate-700 dark:text-slate-200 ${c.className || ''}`}
                  >
                    {c.render ? c.render(r) : (r as any)[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

/** Colored aging-bucket stat card. */
export function BucketCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: ReactNode
  tone?: 'good' | 'warn' | 'bad' | 'neutral'
}) {
  const palette: Record<string, string> = {
    good:    'from-emerald-500 to-teal-600',
    warn:    'from-amber-500 to-orange-600',
    bad:     'from-rose-500 to-red-600',
    neutral: 'from-slate-500 to-slate-600',
  }
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-md shadow-slate-200/50 transition-all hover:shadow-xl dark:bg-slate-900 dark:shadow-slate-900/50">
      <div className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${palette[tone]}`} />
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-linear-to-br ${palette[tone]} opacity-10 blur-2xl`} />
      <div className="relative">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
        <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
      </div>
    </div>
  )
}
