/**
 * Shared primitives used across every Finance ERP page. Keep them small and
 * unopinionated so individual pages remain concise.
 */
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

export function PageHeader({ title, subtitle, actions, onBack }: { title: string; subtitle?: string; actions?: ReactNode; onBack?: () => void }){
  return (
    <div className="flex flex-col gap-2 border-b border-slate-200 bg-white px-6 py-5 md:flex-row md:items-center md:justify-between dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="group flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
            title="Go Back"
          >
            <ArrowLeft className="h-5 w-5 text-slate-500 transition-colors group-hover:text-slate-900 dark:group-hover:text-slate-100" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ title, children, className = '', right }: { title?: string; children: ReactNode; className?: string; right?: ReactNode }){
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          {title && <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>}
          {right}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}

export function StatCard({ label, value, delta, icon, tone = 'default' }: {
  label: string
  value: ReactNode
  delta?: string
  icon?: ReactNode
  tone?: 'default' | 'good' | 'bad' | 'info' | 'warn'
}){
  const tones: Record<string, string> = {
    default: 'bg-slate-50 text-slate-600',
    good:    'bg-emerald-50 text-emerald-600',
    bad:     'bg-rose-50 text-rose-600',
    info:    'bg-blue-50 text-blue-600',
    warn:    'bg-amber-50 text-amber-600',
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div className={`rounded-lg p-2 ${tones[tone]}`}>{icon}</div>
        {delta && <span className="text-xs font-medium text-slate-500">{delta}</span>}
      </div>
      <div className="mt-3 text-xs font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  )
}

export function Button({ variant = 'default', className = '', children, ...props }:
  { variant?: 'default' | 'primary' | 'ghost' | 'danger'; className?: string; children: ReactNode } &
  React.ButtonHTMLAttributes<HTMLButtonElement>
){
  const variants: Record<string, string> = {
    default: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
    primary: 'text-white hover:opacity-95',
    ghost:   'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800',
    danger:  'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50',
  }
  const style = variant === 'primary' ? ({ backgroundColor: 'var(--navy)' } as any) : undefined
  return (
    <button
      {...props}
      style={{ ...(style || {}), ...(props.style || {}) }}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>){
  return (
    <input
      {...props}
      className={`rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${className}`}
    />
  )
}

export function Select({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }){
  return (
    <select
      {...props}
      className={`rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${className}`}
    >{children}</select>
  )
}

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default'|'good'|'bad'|'info'|'warn' }){
  const tones: Record<string, string> = {
    default: 'bg-slate-100 text-slate-700',
    good:    'bg-emerald-100 text-emerald-700',
    bad:     'bg-rose-100 text-rose-700',
    info:    'bg-blue-100 text-blue-700',
    warn:    'bg-amber-100 text-amber-700',
  }
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
}

export function fmtRs(n: number | undefined | null){
  const v = Number(n || 0)
  return `Rs ${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function pct(n: number){ return `${Math.round(n * 10) / 10}%` }

/** Horizontal proportional bar (used in Dashboard module-revenue rows). */
export function ProgressBar({ value, max, color = 'var(--navy)' }: { value: number; max: number; color?: string }){
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

/** Ultra-minimal data table. */
export function Table<T extends { id?: string }>({ columns, rows, empty = 'No data' }: {
  columns: Array<{ key: string; header: string; render?: (r: T) => ReactNode; className?: string }>
  rows: T[]
  empty?: string
}){
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700">
            {columns.map(c => <th key={c.key} className={`px-3 py-2 ${c.className || ''}`}>{c.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-slate-500">{empty}</td></tr>
          ) : rows.map((r, i) => (
            <tr key={(r as any).id || i} className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
              {columns.map(c => (
                <td key={c.key} className={`px-3 py-2 text-slate-700 dark:text-slate-200 ${c.className || ''}`}>
                  {c.render ? c.render(r) : String((r as any)[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function todayIso(){ return new Date().toISOString().slice(0, 10) }
export function monthIso(){ return new Date().toISOString().slice(0, 7) }
export function firstOfMonth(d: Date = new Date()){
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
