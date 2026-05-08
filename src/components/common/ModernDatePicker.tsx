import { useState, useRef, useEffect, useMemo } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  value: string // YYYY-MM-DD
  onChange: (val: string) => void
  label?: string
  className?: string
}

export default function ModernDatePicker({ value, onChange, label, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Parse current value
  const date = useMemo(() => (value ? new Date(value) : new Date()), [value])
  
  // Navigation state (internal to the popup)
  const [navDate, setNavDate] = useState(new Date(date))

  useEffect(() => {
    if (open) setNavDate(new Date(date))
  }, [open, date])

  // Close on outside click
  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', click)
    return () => document.removeEventListener('mousedown', click)
  }, [])

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
  const startDay = (year: number, month: number) => new Date(year, month, 1).getDay()

  const handleDateClick = (d: number) => {
    const newDate = new Date(navDate.getFullYear(), navDate.getMonth(), d)
    // Offset for local date string
    const offset = newDate.getTimezoneOffset()
    const adjusted = new Date(newDate.getTime() - (offset * 60 * 1000))
    onChange(adjusted.toISOString().split('T')[0])
    setOpen(false)
  }

  const changeMonth = (offset: number) => {
    setNavDate(new Date(navDate.getFullYear(), navDate.getMonth() + offset, 1))
  }

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const calendarDays = useMemo(() => {
    const year = navDate.getFullYear()
    const month = navDate.getMonth()
    const totalDays = daysInMonth(year, month)
    const firstDay = startDay(year, month)
    
    const cells = []
    // Empty cells for first week
    for (let i = 0; i < firstDay; i++) cells.push(null)
    // Actual days
    for (let i = 1; i <= totalDays; i++) cells.push(i)
    
    return cells
  }, [navDate])

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>}
      
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none"
      >
        <CalendarIcon className="h-4 w-4 text-indigo-500" />
        <span>{value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select Date'}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-100 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl animate-in fade-in zoom-in duration-150">
          <div className="mb-4 flex items-center justify-between">
            <button type="button" onClick={() => changeMonth(-1)} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-600">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1 font-bold text-slate-900">
              <span>{monthNames[navDate.getMonth()]}</span>
              <span>{navDate.getFullYear()}</span>
            </div>
            <button type="button" onClick={() => changeMonth(1)} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-600">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-center text-[10px] font-bold uppercase text-slate-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />
              
              const isSelected = value && 
                                new Date(value).getDate() === day && 
                                new Date(value).getMonth() === navDate.getMonth() && 
                                new Date(value).getFullYear() === navDate.getFullYear()
              
              const isToday = new Date().getDate() === day && 
                              new Date().getMonth() === navDate.getMonth() && 
                              new Date().getFullYear() === navDate.getFullYear()

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  className={`
                    rounded-lg py-1.5 text-sm font-medium transition-all
                    ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 
                      isToday ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'}
                  `}
                >
                  {day}
                </button>
              )
            })}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 flex justify-between">
            <button 
              type="button" 
              onClick={() => { onChange(new Date().toISOString().split('T')[0]); setOpen(false) }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              Today
            </button>
            <button 
              type="button" 
              onClick={() => setOpen(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
