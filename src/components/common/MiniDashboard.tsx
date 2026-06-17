import React from 'react'

export interface MiniDashboardCard {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color?: string // Tailwind bg class like bg-sky-500
}

interface MiniDashboardProps {
  cards: MiniDashboardCard[]
}

export default function MiniDashboard({ cards }: MiniDashboardProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, idx) => {
        const Icon = card.icon
        // Map common Tailwind background color classes to their gradient/border equivalents for a premium look
        const colorClass = card.color || 'bg-blue-500'
        
        return (
          <div
            key={idx}
            className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {card.label}
                </span>
                <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {card.value}
                </div>
              </div>
              <div className={`grid h-12 w-12 place-items-center rounded-xl text-white ${colorClass} shadow-md`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
            {/* Subtle background decoration */}
            <div className="absolute -bottom-6 -right-6 h-16 w-16 rounded-full bg-slate-50 opacity-50 dark:bg-slate-800/30" />
          </div>
        )
      })}
    </div>
  )
}
