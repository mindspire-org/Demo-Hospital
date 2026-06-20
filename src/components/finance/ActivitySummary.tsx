import type { ActivityLogSummary } from '../../features/finance/shift.types'

const PORTAL_COLORS: Record<string, string> = {
  Hospital: 'bg-sky-500',
  Lab: 'bg-purple-500',
  Pharmacy: 'bg-emerald-500',
  Reception: 'bg-amber-500',
  Finance: 'bg-indigo-500',
  Aesthetic: 'bg-pink-500',
}

export default function ActivitySummary({ summary }: { summary?: ActivityLogSummary | null }) {
  if (!summary || !summary.byActionPortal?.length) return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Activity by Portal</h3>
      <p className="text-xs text-slate-400">No data available for the selected filters.</p>
    </div>
  )

  // Group totals by portal
  const byPortal: Record<string, number> = {}
  let maxVal = 0
  for (const item of summary.byActionPortal) {
    const portal = item._id.portal || 'Other'
    byPortal[portal] = (byPortal[portal] || 0) + item.totalAmount
    maxVal = Math.max(maxVal, byPortal[portal])
  }

  const portals = Object.entries(byPortal).sort((a, b) => b[1] - a[1])
  const total = portals.reduce((s, [, v]) => s + v, 0)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800 mb-4">Activity by Portal</h3>
      <div className="space-y-3">
        {portals.map(([portal, amount]) => {
          const pct = total > 0 ? (amount / total) * 100 : 0
          const color = PORTAL_COLORS[portal] || 'bg-slate-400'
          return (
            <div key={portal} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">{portal}</span>
                <span className="text-slate-500">
                  {amount.toLocaleString()} ({pct.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
