import { useState, useRef, useEffect } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'

// ── Helpers ──
const pad = (n: number) => String(n).padStart(2, '0')
const formatInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parseDateValue = (s?: string) => {
  if (!s) return null
  const [y, m, d] = s.split('-').map(n => parseInt(n, 10))
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}
const formatDisplay = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay()
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
const shortMonthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface DatePickerProps {
  value?: string // yyyy-mm-dd
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  min?: string
  max?: string
  dark?: boolean
  className?: string
}

export default function DatePicker({ value, onChange, placeholder = 'Select date', label, min, max, dark, className = '' }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => parseDateValue(value) || new Date())
  const ref = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const parsed = parseDateValue(value)
    if (parsed) setViewDate(parsed)
  }, [value])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selectedDate = parseDateValue(value)
  const today = new Date(); today.setHours(0,0,0,0)

  const isDisabled = (y: number, m: number, d: number) => {
    const dt = new Date(y, m, d)
    const minDate = parseDateValue(min)
    const maxDate = parseDateValue(max)
    if (minDate && dt < minDate) return true
    if (maxDate && dt > maxDate) return true
    return false
  }

  const isSelected = (y: number, m: number, d: number) => {
    if (!selectedDate) return false
    return selectedDate.getFullYear() === y && selectedDate.getMonth() === m && selectedDate.getDate() === d
  }

  const isToday = (y: number, m: number, d: number) => {
    return today.getFullYear() === y && today.getMonth() === m && today.getDate() === d
  }

  const selectDate = (y: number, m: number, d: number) => {
    if (isDisabled(y, m, d)) return
    onChange(formatInput(new Date(y, m, d)))
    setOpen(false)
  }

  const clear = () => { onChange(''); setOpen(false) }

  const y = viewDate.getFullYear()
  const m = viewDate.getMonth()
  const totalDays = daysInMonth(y, m)
  const startOffset = firstDayOfMonth(y, m)
  const weeks: (number | null)[][] = []
  let week: (number | null)[] = Array(startOffset).fill(null)
  for (let d = 1; d <= totalDays; d++) {
    week.push(d)
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length) { while (week.length < 7) week.push(null); weeks.push(week) }

  const prevMonth = () => setViewDate(new Date(y, m - 1, 1))
  const nextMonth = () => setViewDate(new Date(y, m + 1, 1))

  const bgBase = dark
    ? 'bg-white/10 border-white/20 text-white backdrop-blur-sm'
    : 'bg-white border-slate-200 text-slate-700'
  const hoverBase = dark ? 'hover:bg-white/20' : 'hover:bg-slate-50'
  const popupBg = dark
    ? 'bg-slate-900/95 border-white/10 text-white backdrop-blur-xl'
    : 'bg-white border-slate-200'
  const headerText = dark ? 'text-white' : 'text-slate-800'
  const mutedText = dark ? 'text-white/50' : 'text-slate-400'
  const dayHover = dark ? 'hover:bg-sky-500/30' : 'hover:bg-sky-50'
  const selectedClass = 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
  const todayClass = dark ? 'ring-2 ring-sky-400 text-sky-400' : 'ring-1 ring-sky-500 text-sky-600'

  return (
    <div ref={ref} className={`relative ${className}`}>
      {label && (
        <label className={`mb-1.5 block text-[11px] font-bold uppercase tracking-wider ${mutedText}`}>{label}</label>
      )}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 ${bgBase} ${hoverBase}`}
      >
        <CalendarDays className={`h-4 w-4 shrink-0 ${mutedText}`} />
        <span className={value ? '' : mutedText}>
          {value ? formatDisplay(parseDateValue(value) || new Date()) : placeholder}
        </span>
        {value && (
          <span className="ml-auto" onClick={(e) => { e.stopPropagation(); clear() }}>
            <X className={`h-3.5 w-3.5 cursor-pointer ${mutedText} hover:text-rose-500`} />
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popupRef}
          className={`absolute z-50 mt-2 w-80 overflow-hidden rounded-2xl border shadow-xl ${popupBg}`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between border-b px-4 py-3 ${dark ? 'border-white/10' : 'border-slate-100'}`}>
            <button type="button" onClick={prevMonth} className={`rounded-lg p-2.5 transition-colors ${hoverBase}`} aria-label="Previous month">
              <ChevronLeft className={`h-4 w-4 ${headerText}`} />
            </button>
            <div className={`text-sm font-bold ${headerText}`}>
              {monthNames[m]} {y}
            </div>
            <button type="button" onClick={nextMonth} className={`rounded-lg p-2.5 transition-colors ${hoverBase}`} aria-label="Next month">
              <ChevronRight className={`h-4 w-4 ${headerText}`} />
            </button>
          </div>

          {/* Days header */}
          <div className={`grid grid-cols-7 px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="text-center">{d}</div>)}
          </div>

          {/* Calendar grid */}
          <div className="px-3 pb-2">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((day, di) => {
                  if (day === null) return <div key={di} className="h-9" />
                  const disabled = isDisabled(y, m, day)
                  const sel = isSelected(y, m, day)
                  const tod = isToday(y, m, day)
                  return (
                    <button
                      key={di}
                      type="button"
                      disabled={disabled}
                      onClick={() => selectDate(y, m, day)}
                      className={`mx-auto my-0.5 flex h-11 w-11 items-center justify-center rounded-full text-xs font-semibold transition-all
                        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                        ${sel ? selectedClass : ''}
                        ${!sel && tod ? todayClass : ''}
                        ${!sel && !tod && !disabled ? `${headerText} ${dayHover}` : ''}
                      `}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className={`flex items-center justify-between border-t px-3 py-2 ${dark ? 'border-white/10' : 'border-slate-100'}`}>
            <button type="button" onClick={() => { onChange(formatInput(today)); setOpen(false) }}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold text-sky-500 ${dark ? 'hover:bg-sky-500/20' : 'hover:bg-sky-50'} transition-colors`}>
              Today
            </button>
            <button type="button" onClick={clear}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${dark ? 'text-white/50 hover:text-rose-400 hover:bg-rose-500/20' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'} transition-colors`}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Date Range Picker ──
interface DateRange {
  from: string
  to: string
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (value: DateRange) => void
  dark?: boolean
  className?: string
}

export function DateRangePicker({ value, onChange, dark, className = '' }: DateRangePickerProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <DatePicker
        value={value.from}
        onChange={(v) => onChange({ ...value, from: v })}
        placeholder="From"
        max={value.to || undefined}
        dark={dark}
      />
      <span className={`text-sm font-medium ${dark ? 'text-white/60' : 'text-slate-400'}`}>→</span>
      <DatePicker
        value={value.to}
        onChange={(v) => onChange({ ...value, to: v })}
        placeholder="To"
        min={value.from || undefined}
        dark={dark}
      />
    </div>
  )
}

// ── Month / Year quick selector for dashboards ──
interface MonthYearPickerProps {
  value: string // yyyy-mm
  onChange: (value: string) => void
  dark?: boolean
  className?: string
}

export function MonthYearPicker({ value, onChange, dark, className = '' }: MonthYearPickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    if (open) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const parts = value?.split('-')
  const y = parts?.[0] ? Number(parts[0]) : new Date().getFullYear()
  const m = parts?.[1] ? Number(parts[1]) - 1 : new Date().getMonth()

  const headerText = dark ? 'text-white' : 'text-slate-800'
  const mutedText = dark ? 'text-white/50' : 'text-slate-400'
  const popupBg = dark ? 'bg-slate-900/95 border-white/10 backdrop-blur-xl' : 'bg-white border-slate-200'
  const hoverBase = dark ? 'hover:bg-white/20' : 'hover:bg-slate-50'

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 ${dark ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
      >
        <CalendarDays className={`h-4 w-4 ${mutedText}`} />
        <span>{value ? `${shortMonthNames[m]} ${y}` : 'Select month'}</span>
      </button>
      {open && (
        <div className={`absolute z-50 mt-2 w-64 overflow-hidden rounded-2xl border shadow-xl ${popupBg}`}>
          <div className={`flex items-center justify-between border-b px-4 py-2 ${dark ? 'border-white/10' : 'border-slate-100'}`}>
            <button type="button" onClick={() => onChange(`${y - 1}-${pad(m + 1)}`)} className={`rounded-lg p-1 ${hoverBase}`}>
              <ChevronLeft className={`h-4 w-4 ${headerText}`} />
            </button>
            <div className={`text-sm font-bold ${headerText}`}>{y}</div>
            <button type="button" onClick={() => onChange(`${y + 1}-${pad(m + 1)}`)} className={`rounded-lg p-1 ${hoverBase}`}>
              <ChevronRight className={`h-4 w-4 ${headerText}`} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1 p-3">
            {shortMonthNames.map((name, idx) => {
              const sel = idx === m
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => { onChange(`${y}-${pad(idx + 1)}`); setOpen(false) }}
                  className={`rounded-lg py-2 text-xs font-semibold transition-all
                    ${sel ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : `${headerText} ${hoverBase}`}
                  `}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
