import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, DollarSign, ShoppingBag, Award, BarChart3 } from 'lucide-react'
import { cafeteriaApi } from '../../features/cafeteria'
import DatePicker from '../../components/cafeteria/DatePicker'

export default function Cafeteria_Reports() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await cafeteriaApi.salesSummary({ from: from || undefined, to: to || undefined })
      setSummary(r)
    } catch {} finally { setLoading(false) }
  }, [from, to])

  useEffect(() => { load() }, [load])

  const cards = [
    { label: 'Total Revenue', value: `Rs ${Number(summary?.periodRevenue || 0).toLocaleString()}`, icon: DollarSign, accent: 'from-orange-500 to-amber-500', bg: 'bg-orange-50 dark:bg-orange-950/30', iconBg: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' },
    { label: 'Total Profit', value: `Rs ${Number(summary?.periodProfit || 0).toLocaleString()}`, icon: TrendingUp, accent: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' },
    { label: 'Total Sales', value: String(summary?.periodCount || 0), icon: ShoppingBag, accent: 'from-sky-500 to-blue-500', bg: 'bg-sky-50 dark:bg-sky-950/30', iconBg: 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400' },
    { label: 'Avg Sale', value: `Rs ${summary?.periodCount ? Math.round(summary.periodRevenue / summary.periodCount).toLocaleString() : '0'}`, icon: Award, accent: 'from-violet-500 to-purple-500', bg: 'bg-violet-50 dark:bg-violet-950/30', iconBg: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Reports</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Revenue and performance analytics</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <BarChart3 className="h-4 w-4" />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <DatePicker value={from} onChange={setFrom} label="From" />
        <DatePicker value={to} onChange={setTo} label="To" />
        <button
          onClick={load}
          className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-orange-600/20 transition-all hover:bg-orange-700 hover:shadow-md active:scale-[0.98]"
        >
          Generate
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(c => {
              const Icon = c.icon
              return (
                <div key={c.label} className={`group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 ${c.bg}`}>
                  <div className={`absolute right-0 top-0 h-20 w-20 -translate-y-6 translate-x-6 rounded-full bg-linear-to-br ${c.accent} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`} />
                  <div className="relative">
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${c.iconBg}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{c.value}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{c.label}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {summary?.topItems?.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-50 px-5 py-4 dark:border-slate-800/50">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Top Selling Items</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-50 dark:border-slate-800/50">
                      <th className="w-12 px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">#</th>
                      <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Item</th>
                      <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Qty Sold</th>
                      <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.topItems.map((t: any, i: number) => (
                      <tr key={t.name} className="border-b border-slate-50 transition hover:bg-slate-50 dark:border-slate-800/30 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3 text-xs font-bold text-slate-300 dark:text-slate-600">{i + 1}</td>
                        <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">{t.name}</td>
                        <td className="px-5 py-3 text-right font-medium text-slate-600 dark:text-slate-300">{t.qty}</td>
                        <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-slate-100">Rs {Number(t.revenue).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
