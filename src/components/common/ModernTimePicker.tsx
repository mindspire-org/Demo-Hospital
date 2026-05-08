import { useState, useRef, useEffect } from 'react'
import { Clock, ChevronDown } from 'lucide-react'

type Props = {
  value: string // HH:mm
  onChange: (val: string) => void
  label?: string
  className?: string
}

export default function ModernTimePicker({ value, onChange, label, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Parse current value
  const [h, m] = (value || '12:00').split(':')
  const initialHour = parseInt(h, 10)
  const isPM = initialHour >= 12
  const displayHour = initialHour % 12 || 12

  // Close on outside click
  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', click)
    return () => document.removeEventListener('mousedown', click)
  }, [])

  const setTime = (newHour: number, newMinute: number, newIsPM: boolean) => {
    let finalHour = newHour % 12
    if (newIsPM) finalHour += 12
    const pad = (n: number) => String(n).padStart(2, '0')
    onChange(`${pad(finalHour)}:${pad(newMinute)}`)
  }

  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-amber-600">{label}</label>}
      
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-amber-300 hover:shadow-md focus:border-amber-500 focus:ring-4 focus:ring-amber-50 outline-none"
      >
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-amber-500" />
          <span>{value ? `${displayHour}:${m} ${isPM ? 'PM' : 'AM'}` : '--:-- --'}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-100 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl animate-in fade-in zoom-in duration-150">
          <div className="flex gap-4">
            {/* Hours */}
            <div className="flex-1">
              <div className="mb-2 text-[10px] font-bold uppercase text-slate-400 text-center">Hour</div>
              <div className="grid grid-cols-3 gap-1 max-h-48 overflow-y-auto pr-1">
                {hours.map(hr => (
                  <button
                    key={hr}
                    type="button"
                    onClick={() => setTime(hr, parseInt(m, 10), isPM)}
                    className={`rounded-lg py-1.5 text-xs font-bold transition-all ${displayHour === hr ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:bg-amber-50 hover:text-amber-700'}`}
                  >
                    {hr}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes */}
            <div className="flex-1 border-x border-slate-100 px-2">
              <div className="mb-2 text-[10px] font-bold uppercase text-slate-400 text-center">Min</div>
              <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                {minutes.map(min => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setTime(initialHour % 12, min, isPM)}
                    className={`rounded-lg py-1.5 text-xs font-bold transition-all ${parseInt(m, 10) === min ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:bg-amber-50 hover:text-amber-700'}`}
                  >
                    {String(min).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* AM/PM */}
            <div className="flex flex-col justify-center gap-2">
              <button
                type="button"
                onClick={() => setTime(initialHour % 12, parseInt(m, 10), false)}
                className={`rounded-lg px-3 py-2 text-[10px] font-black transition-all ${!isPM ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setTime(initialHour % 12, parseInt(m, 10), true)}
                className={`rounded-lg px-3 py-2 text-[10px] font-black transition-all ${isPM ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              >
                PM
              </button>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <button 
              type="button" 
              onClick={() => setOpen(false)}
              className="w-full rounded-xl bg-slate-900 py-2 text-xs font-bold text-white transition-all hover:bg-slate-800"
            >
              Set Time
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
