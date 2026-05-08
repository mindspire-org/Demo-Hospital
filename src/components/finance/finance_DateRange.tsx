/**
 * DateRangeFilter — modern "from / to" picker with quick presets.
 *
 * Layout:
 *   [ preset dropdown ]  [ from date ]  —  [ to date ]  [ × clear ]
 *
 * Presets cover the cases users hit 99 % of the time (Today, Yesterday,
 * Last 7 days, Last 30 days, This Month, Last Month, This Year, Last Year,
 * All Time). Choosing "Custom" just leaves whatever dates you already have.
 * Selecting older dates via the native date input still works and jumps
 * straight to year/month navigation.
 */

import { useEffect, useState } from 'react'
import { CalendarDays, X } from 'lucide-react'
import DatePickerModern from '../DatePickerModern'

export type DateRange = { from: string; to: string }

function iso(d: Date){ return d.toISOString().slice(0, 10) }
function startOfMonth(d: Date){ return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d: Date){ return new Date(d.getFullYear(), d.getMonth() + 1, 0) }
function startOfYear(d: Date){ return new Date(d.getFullYear(), 0, 1) }
function endOfYear(d: Date){ return new Date(d.getFullYear(), 11, 31) }
function addDays(d: Date, n: number){ const x = new Date(d); x.setDate(x.getDate() + n); return x }

export const PRESETS: Array<{ key: string; label: string; compute: () => DateRange | { from: ''; to: '' } }> = [
  { key: 'today',      label: 'Today',        compute: () => { const t = new Date(); return { from: iso(t), to: iso(t) } } },
  { key: 'yesterday',  label: 'Yesterday',    compute: () => { const t = addDays(new Date(), -1); return { from: iso(t), to: iso(t) } } },
  { key: 'last7',      label: 'Last 7 days',  compute: () => ({ from: iso(addDays(new Date(), -6)),  to: iso(new Date()) }) },
  { key: 'last30',     label: 'Last 30 days', compute: () => ({ from: iso(addDays(new Date(), -29)), to: iso(new Date()) }) },
  { key: 'thisMonth',  label: 'This month',   compute: () => { const t = new Date(); return { from: iso(startOfMonth(t)), to: iso(t) } } },
  { key: 'lastMonth',  label: 'Last month',   compute: () => { const t = new Date(); const lm = new Date(t.getFullYear(), t.getMonth() - 1, 1); return { from: iso(startOfMonth(lm)), to: iso(endOfMonth(lm)) } } },
  { key: 'thisYear',   label: 'This year',    compute: () => { const t = new Date(); return { from: iso(startOfYear(t)), to: iso(t) } } },
  { key: 'lastYear',   label: 'Last year',    compute: () => { const ly = new Date(new Date().getFullYear() - 1, 0, 1); return { from: iso(startOfYear(ly)), to: iso(endOfYear(ly)) } } },
  { key: 'all',        label: 'All time',     compute: () => ({ from: '', to: '' }) },
]

export function DateRangeFilter({ value, onChange, compact = false }: {
  value: DateRange
  onChange: (r: DateRange) => void
  compact?: boolean
}){
  const [activePreset, setActivePreset] = useState<string>('custom')

  // If the current value matches a known preset, reflect it in the dropdown.
  useEffect(() => {
    const match = PRESETS.find(p => {
      const r = p.compute()
      return r.from === value.from && r.to === value.to
    })
    setActivePreset(match ? match.key : 'custom')
  }, [value.from, value.to])

  function applyPreset(key: string){
    setActivePreset(key)
    if (key === 'custom') return
    const p = PRESETS.find(x => x.key === key)
    if (!p) return
    onChange(p.compute() as DateRange)
  }

  return (
    <div className={`inline-flex ${compact ? 'flex-wrap' : ''} items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900`}>
      <CalendarDays className="h-4 w-4 text-slate-500" />
      <select
        value={activePreset}
        onChange={e => applyPreset(e.target.value)}
        className="rounded-md border-0 bg-transparent px-1 py-1 text-sm font-medium text-slate-700 outline-none focus:ring-0 dark:text-slate-200"
      >
        <option value="custom">Custom range</option>
        {PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
      </select>
      <span className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
      <DatePickerModern
        value={value.from}
        onChange={v => onChange({ ...value, from: v })}
        placeholder="From"
      />
      <span className="text-xs text-slate-400">→</span>
      <DatePickerModern
        value={value.to}
        onChange={v => onChange({ ...value, to: v })}
        placeholder="To"
      />
      {(value.from || value.to) && (
        <button
          type="button"
          onClick={() => onChange({ from: '', to: '' })}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          title="Clear"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export default DateRangeFilter
