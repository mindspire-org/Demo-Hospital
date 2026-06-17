interface DateRange {
  from: string
  to: string
}

interface DateRangeFilterProps {
  value: DateRange
  onChange: (value: DateRange) => void
}

export default function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
      <input
        type="date"
        value={value.from}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
        className="rounded-xl border-none bg-transparent py-1.5 px-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-white/20 transition-all cursor-pointer [color-scheme:dark]"
      />
      <span className="text-white/40">to</span>
      <input
        type="date"
        value={value.to}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
        className="rounded-xl border-none bg-transparent py-1.5 px-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-white/20 transition-all cursor-pointer [color-scheme:dark]"
      />
    </div>
  )
}
