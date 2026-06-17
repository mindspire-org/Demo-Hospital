import { CalendarDays } from 'lucide-react'

interface ModernDateInputProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export default function ModernDateInput({ label, value, onChange }: ModernDateInputProps) {
  return (
    <label className="flex flex-col gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
      <span>{label}</span>
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-sky-500 transition-colors z-10">
          <CalendarDays className="h-4 w-4" />
        </div>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 pl-9 pr-3 py-2.5 text-sm text-slate-700 dark:text-slate-100 shadow-sm focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 outline-none transition-all hover:border-slate-300 hover:shadow-md cursor-pointer"
        />
      </div>
    </label>
  )
}
