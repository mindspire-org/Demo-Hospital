import { FlaskConical, Banknote, Receipt, Wallet, TrendingUp, Hourglass, Package, AlertTriangle } from 'lucide-react'

const fmtRs = (n: number) => `Rs ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
const fmtNum = (n: number) => Number(n || 0).toLocaleString()

const toneMap: Record<string, string> = {
  blue: 'from-blue-500 to-indigo-600',
  green: 'from-emerald-500 to-teal-600',
  amber: 'from-amber-500 to-orange-600',
  rose: 'from-rose-500 to-pink-600',
  violet: 'from-violet-500 to-purple-600',
  sky: 'from-sky-500 to-cyan-600',
  slate: 'from-slate-500 to-slate-700',
}

function KPICard({ label, value, icon: Icon, tone = 'blue', sublabel }: {
  label: string; value: React.ReactNode; icon: any; tone?: string; sublabel?: string
}) {
  const bg = toneMap[tone] || toneMap.blue
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <div className={`absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-10 blur-2xl transition-all group-hover:scale-150 bg-linear-to-br ${bg}`} />
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg bg-linear-to-br ${bg}`}>
        <Icon className="h-6 w-6 transition-transform group-hover:scale-110" />
      </div>
      <div className="mt-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
        <div className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{value}</div>
        {sublabel && <div className="mt-1 text-xs font-semibold text-slate-500">{sublabel}</div>}
      </div>
      <div className={`absolute bottom-0 left-0 h-1 w-0 bg-linear-to-r transition-all duration-500 group-hover:w-full ${bg}`} />
    </div>
  )
}

export default function LabReportsKPI({ summary, loading, invStats }: { summary: any; loading: boolean; invStats: any }) {
  const profit = (summary.totalRevenue || 0) - (summary.totalExpenses || 0) - (summary.totalPurchasesAmount || 0)
  const collectionRate = summary.totalReceivable ? Math.round((summary.totalReceived || 0) / (summary.totalRevenue || 1) * 100) : 0
  const avgDailyRev = (summary.dailyRevenue || []).length
    ? Math.round((summary.dailyRevenue || []).reduce((s: number, d: any) => s + d.value, 0) / (summary.dailyRevenue || []).length)
    : 0

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <KPICard label="Total Tests" value={loading ? '…' : fmtNum(summary.totalTests || 0)} icon={FlaskConical} tone="blue" sublabel={summary.totalOrders ? `${fmtNum(summary.totalOrders)} orders` : undefined} />
      <KPICard label="Revenue" value={loading ? '…' : fmtRs(summary.totalRevenue || 0)} icon={Banknote} tone="green" sublabel={avgDailyRev ? `Avg/day: ${fmtRs(avgDailyRev)}` : undefined} />
      <KPICard label="Received" value={loading ? '…' : fmtRs(summary.totalReceived || 0)} icon={Receipt} tone="violet" sublabel={collectionRate ? `${collectionRate}% collected` : undefined} />
      <KPICard label="Receivable" value={loading ? '…' : fmtRs((summary.totalRevenue || 0) - (summary.totalReceived || 0))} icon={Wallet} tone="amber" />
      <KPICard label="Net Profit" value={loading ? '…' : fmtRs(profit)} icon={TrendingUp} tone={profit >= 0 ? 'green' : 'rose'} sublabel="Revenue - Expenses - Purchases" />
      <KPICard label="Pending" value={loading ? '…' : fmtNum((summary.pendingResults || 0) + (summary.pendingApproval || 0))} icon={Hourglass} tone="rose" sublabel={`${summary.pendingResults || 0} results · ${summary.pendingApproval || 0} approval`} />
      <KPICard label="Completed" value={loading ? '…' : fmtNum(summary.completedTests || 0)} icon={Package} tone="sky" />
      <KPICard label="Low Stock" value={loading ? '…' : fmtNum(invStats?.lowStockCount || 0)} icon={AlertTriangle} tone={invStats?.lowStockCount ? 'amber' : 'slate'} sublabel={`${invStats?.outOfStockCount || 0} out of stock`} />
    </div>
  )
}
