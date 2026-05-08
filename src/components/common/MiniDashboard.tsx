import type { LucideIcon } from 'lucide-react'

type Card = {
  label: string
  value: string | number
  icon: LucideIcon
  color: string // tailwind bg class e.g. 'bg-indigo-500'
  trend?: string // optional subtitle like '+12%'
}

type Props = {
  cards: Card[]
}

export default function MiniDashboard({ cards }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
      {cards.map((c, i) => {
        const Icon = c.icon
        return (
          <div
            key={i}
            className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-500">{c.label}</div>
                <div className="mt-1 text-xl font-bold text-slate-900">{c.value}</div>
                {c.trend && <div className="mt-0.5 text-[11px] font-medium text-emerald-600">{c.trend}</div>}
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 bg-opacity-15`}>
                <Icon className={`h-5 w-5 text-sky-600`} />
              </div>
            </div>
            {/* Subtle accent line */}
            <div className={`absolute bottom-0 left-0 h-1 w-full bg-sky-500 opacity-60`} />
          </div>
        )
      })}
    </div>
  )
}
