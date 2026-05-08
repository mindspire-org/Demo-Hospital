/**
 * DatePickerModern — a small, dependency-free, modern calendar popover.
 *
 * Replaces the browser's native `<input type="date">` with:
 *   - A styled trigger button showing the currently-picked date.
 *   - A popover calendar with fast month/year navigation, today highlight,
 *     selection ring, Today/Clear quick actions, and keyboard-friendly focus.
 *
 * API mirrors a plain controlled input:
 *     <DatePickerModern value={iso} onChange={setIso} placeholder="From" />
 *
 * Value + emitted dates are ISO strings ("YYYY-MM-DD") or empty.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  value?: string
  onChange?: (iso: string) => void
  placeholder?: string
  className?: string
  min?: string
  max?: string
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function pad(n: number){ return String(n).padStart(2, '0') }
function toIso(d: Date){ return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function fromIso(iso?: string): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(n => parseInt(n, 10))
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}
function sameDay(a: Date | null, b: Date | null){
  if (!a || !b) return false
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function DatePickerModern({ value, onChange, placeholder = 'Select date', className = '', min, max }: Props){
  const selected = fromIso(value)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<Date>(() => selected || new Date())
  const ref = useRef<HTMLDivElement | null>(null)

  // Keep the visible month in sync when the selected value changes externally.
  useEffect(() => {
    if (selected){
      setView(new Date(selected.getFullYear(), selected.getMonth(), 1))
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent){
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent){ if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const minDate = fromIso(min)
  const maxDate = fromIso(max)

  /** Build a 6-row grid of 42 days so layout is always consistent. */
  const grid = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1)
    const startWeekday = first.getDay()
    const start = new Date(first)
    start.setDate(first.getDate() - startWeekday)
    const cells: Date[] = []
    for (let i = 0; i < 42; i++){
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      cells.push(d)
    }
    return cells
  }, [view])

  const today = new Date()
  const visibleMonth = view.getMonth()
  const visibleYear  = view.getFullYear()

  function changeMonth(delta: number){
    setView(v => new Date(v.getFullYear(), v.getMonth() + delta, 1))
  }

  function pick(d: Date){
    if (minDate && d < minDate) return
    if (maxDate && d > maxDate) return
    onChange?.(toIso(d))
    setOpen(false)
  }

  const displayLabel = selected
    ? selected.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    : placeholder

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm transition hover:border-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 ${selected ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}
      >
        <CalendarDays className="h-4 w-4 text-slate-500" />
        <span className="font-medium tabular-nums">{displayLabel}</span>
      </button>

      {open && (
        <>
          {/* Small tail/arrow for the popover */}
          <div className="absolute right-6 sm:left-6 top-full z-60 mt-px h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />
          
          <div className="absolute right-0 sm:left-0 top-full z-50 mt-2 w-[280px] sm:w-[290px] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          {/* Header: month-year with arrow buttons */}
          <div className="mb-2 flex items-center justify-between gap-1">
            <button type="button" onClick={() => changeMonth(-1)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex flex-1 items-center justify-center gap-0.5 sm:gap-1 min-w-0">
              <select
                value={visibleMonth}
                onChange={e => setView(new Date(visibleYear, parseInt(e.target.value, 10), 1))}
                className="rounded-md border-0 bg-transparent px-1 py-1 text-xs sm:text-sm font-semibold text-slate-800 outline-none hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 truncate"
              >
                {MONTHS.map((m, i) => <option key={m} value={i} className="bg-white dark:bg-slate-900">{m}</option>)}
              </select>
              <select
                value={visibleYear}
                onChange={e => setView(new Date(parseInt(e.target.value, 10), visibleMonth, 1))}
                className="rounded-md border-0 bg-transparent px-1 py-1 text-xs sm:text-sm font-semibold text-slate-800 outline-none hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                {Array.from({ length: 60 }, (_, i) => today.getFullYear() - 50 + i).map(y => (
                  <option key={y} value={y} className="bg-white dark:bg-slate-900">{y}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={() => changeMonth(+1)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday row */}
          <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {WEEKDAYS.map(w => <div key={w} className="py-1">{w}</div>)}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {grid.map((d, i) => {
              const inMonth = d.getMonth() === visibleMonth
              const isSel   = sameDay(d, selected)
              const isTdy   = sameDay(d, today)
              const outOfRange = (minDate && d < minDate) || (maxDate && d > maxDate)
              const base = 'mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-sm transition'
              let cls = base
              if (isSel){
                cls += ' bg-blue-600 text-white font-semibold shadow-sm'
              } else if (isTdy && inMonth){
                cls += ' ring-1 ring-blue-400 text-blue-700 font-semibold dark:text-blue-300'
              } else if (!inMonth){
                cls += ' text-slate-300 dark:text-slate-600'
              } else {
                cls += ' text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800'
              }
              if (outOfRange) cls += ' opacity-40 pointer-events-none'
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!!outOfRange}
                  onClick={() => pick(d)}
                  className={cls}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-sm dark:border-slate-800">
            <button type="button" onClick={() => { onChange?.(''); setOpen(false) }} className="font-medium text-slate-500 hover:text-rose-600">Clear</button>
            <button type="button" onClick={() => pick(new Date())} className="font-medium text-blue-600 hover:text-blue-700">Today</button>
          </div>
        </div>
      </>
    )}
  </div>
)
}
