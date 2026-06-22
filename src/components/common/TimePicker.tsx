import { useEffect, useRef, useState } from 'react'
import { Clock, X } from 'lucide-react'

interface TimePickerProps {
  value?: string // 24h "HH:mm"
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  dark?: boolean
  minuteStep?: number
  className?: string
}

function to12h(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim())
  if (!m) return ''
  let h = parseInt(m[1], 10)
  const min = m[2]
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${String(h).padStart(2, '0')}:${min} ${ap}`
}

// Matches the look & behaviour of DatePicker: a styled trigger button + a
// dropdown list of selectable times (modern, no native time input).
export default function TimePicker({ value, onChange, placeholder = 'Select time', label, dark, minuteStep = 15, className = '' }: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  // Scroll the selected option into view when opening.
  useEffect(() => {
    if (open && listRef.current) {
      const sel = listRef.current.querySelector('[data-selected="true"]') as HTMLElement | null
      if (sel) sel.scrollIntoView({ block: 'center' })
    }
  }, [open])

  const options: string[] = []
  for (let mins = 0; mins < 24 * 60; mins += Math.max(1, minuteStep)) {
    const h = Math.floor(mins / 60)
    const mm = mins % 60
    options.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`)
  }

  const clear = () => { onChange(''); setOpen(false) }
  const nowHHmm = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

  const bgBase = dark ? 'bg-white/10 border-white/20 text-white backdrop-blur-sm' : 'bg-white border-slate-200 text-slate-700'
  const hoverBase = dark ? 'hover:bg-white/20' : 'hover:bg-slate-50'
  const popupBg = dark ? 'bg-slate-900/95 border-white/10 text-white backdrop-blur-xl' : 'bg-white border-slate-200'
  const mutedText = dark ? 'text-white/50' : 'text-slate-400'
  const headerText = dark ? 'text-white' : 'text-slate-800'
  const optHover = dark ? 'hover:bg-sky-500/30' : 'hover:bg-sky-50'

  return (
    <div ref={ref} className={`relative ${className}`}>
      {label && <label className={`mb-1.5 block text-[11px] font-bold uppercase tracking-wider ${mutedText}`}>{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 ${bgBase} ${hoverBase}`}
      >
        <Clock className={`h-4 w-4 shrink-0 ${mutedText}`} />
        <span className={value ? '' : mutedText}>{value ? to12h(value) : placeholder}</span>
        {value && (
          <span className="ml-auto" onClick={(e) => { e.stopPropagation(); clear() }}>
            <X className={`h-3.5 w-3.5 cursor-pointer ${mutedText} hover:text-rose-500`} />
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute z-50 mt-2 w-44 overflow-hidden rounded-2xl border shadow-xl ${popupBg}`}>
          <div ref={listRef} className="max-h-60 overflow-y-auto px-2 py-2">
            {options.map(opt => {
              const sel = value === opt
              return (
                <button
                  key={opt}
                  type="button"
                  data-selected={sel}
                  onClick={() => { onChange(opt); setOpen(false) }}
                  className={`block w-full rounded-lg px-3 py-1.5 text-left text-xs font-semibold transition-all
                    ${sel ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : `${headerText} ${optHover}`}`}
                >
                  {to12h(opt)}
                </button>
              )
            })}
          </div>
          <div className={`flex items-center justify-between border-t px-3 py-2 ${dark ? 'border-white/10' : 'border-slate-100'}`}>
            <button type="button" onClick={() => { onChange(nowHHmm()); setOpen(false) }}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold text-sky-500 ${dark ? 'hover:bg-sky-500/20' : 'hover:bg-sky-50'} transition-colors`}>
              Now
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
