

interface DatePickerModernProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function DatePickerModern({ value, onChange, placeholder }: DatePickerModernProps) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3.5 text-sm font-semibold text-slate-700 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/5 transition-all shadow-inner dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200 dark:focus:border-violet-400"
    />
  )
}
