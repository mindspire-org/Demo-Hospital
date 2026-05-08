/**
 * HeaderDateTimeChip — the modern live date/time chip used by every portal
 * header. Single source of truth so headers stay visually consistent.
 *
 *   [ 📅  TODAY       ]  |  [ 🕒  LOCAL TIME         ]
 *   [     Sun, 20 Apr ]  |  [     1:25:40 AM • pulse ]
 *
 * Variants:
 *   - default: white card with subtle border (use on light headers)
 *   - navy:    translucent glass card (use on dark/navy headers)
 */

import { useEffect, useState } from 'react'
import { CalendarDays, Clock } from 'lucide-react'

type Variant = 'default' | 'navy'

function formatNow(d: Date){
  const date = d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
  const h24  = d.getHours()
  const hh   = ((h24 + 11) % 12) + 1
  const mm   = String(d.getMinutes()).padStart(2, '0')
  const ss   = String(d.getSeconds()).padStart(2, '0')
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  return { date, time: `${hh}:${mm}:${ss}`, ampm }
}

export default function HeaderDateTimeChip({ variant = 'default' }: { variant?: Variant }){
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const { date, time, ampm } = formatNow(now)

  const isNavy = variant === 'navy'
  const shell = isNavy
    ? 'border-white/15 bg-white/5 backdrop-blur text-white'
    : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200'
  const divider = isNavy ? 'bg-white/15' : 'bg-slate-200 dark:bg-slate-700'
  const microLabel = isNavy ? 'text-white/60' : 'text-slate-400'
  const calTile = isNavy
    ? 'bg-white/10 text-white'
    : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
  const clkTile = isNavy
    ? 'bg-white/10 text-white'
    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'

  return (
    <div className={`hidden md:inline-flex items-stretch rounded-xl border shadow-sm overflow-hidden ${shell}`}>
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${calTile}`}>
          <CalendarDays className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <div className={`text-[10px] font-medium uppercase tracking-wider ${microLabel}`}>Today</div>
          <div className="text-sm font-semibold tabular-nums">{date}</div>
        </div>
      </div>
      <div className={`w-px ${divider}`} />
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className={`relative inline-flex h-7 w-7 items-center justify-center rounded-lg ${clkTile}`}>
          <Clock className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 inline-flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-block h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        </span>
        <div className="leading-tight">
          <div className={`text-[10px] font-medium uppercase tracking-wider ${microLabel}`}>Local time</div>
          <div className="text-sm font-semibold tabular-nums">
            {time}
            <span className={`ml-1 text-[10px] font-medium ${microLabel}`}>{ampm}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
