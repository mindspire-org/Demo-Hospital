import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, DollarSign, ShoppingBag, AlertTriangle, ArrowRight, ReceiptText, Coffee, Sparkles, UtensilsCrossed, Package, Bike, Clock4, Banknote, CreditCard, Building2 } from 'lucide-react'
import { cafeteriaApi } from '../../features/cafeteria'

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      <div className="mt-4 h-7 w-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      <div className="mt-2 h-4 w-16 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
    </div>
  )
}

export default function Cafeteria_Dashboard() {
  const [summary, setSummary] = useState<any>(null)
  const [lowStock, setLowStock] = useState<any[]>([])
  const [recentSales, setRecentSales] = useState<any[]>([])
  const [shift, setShift] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [s, ls, rs, sh] = await Promise.all([
        cafeteriaApi.salesSummary(),
        cafeteriaApi.listLowStock(),
        cafeteriaApi.listSales({ limit: 5 }),
        cafeteriaApi.getTodayShift(),
      ])
      setSummary(s)
      setLowStock(ls?.items || [])
      setRecentSales(rs?.items || [])
      setShift(sh)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-40 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="mt-1 h-4 w-56 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
          ))}
        </div>
      </div>
    )
  }

  const kpis = [
    { label: "Today's Revenue", value: `Rs ${Number(summary?.todayRevenue || 0).toLocaleString()}`, icon: DollarSign, accent: 'from-orange-500 to-amber-500', bg: 'bg-orange-50 dark:bg-orange-950/30', iconBg: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' },
    { label: "Today's Profit", value: `Rs ${Number(summary?.todayProfit || 0).toLocaleString()}`, icon: TrendingUp, accent: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' },
    { label: "Today's Sales", value: String(summary?.todaySales || 0), icon: ShoppingBag, accent: 'from-sky-500 to-blue-500', bg: 'bg-sky-50 dark:bg-sky-950/30', iconBg: 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400' },
    { label: 'Menu Items', value: String(summary?.totalMenuItems || 0), icon: ReceiptText, accent: 'from-violet-500 to-purple-500', bg: 'bg-violet-50 dark:bg-violet-950/30', iconBg: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Live overview of today's performance</p>
        </div>
        <button
          onClick={loadData}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-all hover:text-orange-500 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
          aria-label="Refresh"
        >
          <Sparkles className="h-4 w-4" />
        </button>
      </div>

      {/* Mini Sales Dashboard */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Order Type Breakdown */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Order Types</h3>
          <div className="space-y-3">
            {[
              { label: 'Dining', icon: UtensilsCrossed, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400', count: shift?.orderTypeBreakdown?.Dining || 0 },
              { label: 'Take Away', icon: Package, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400', count: shift?.orderTypeBreakdown?.['Take Away'] || 0 },
              { label: 'Delivery', icon: Bike, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400', count: shift?.orderTypeBreakdown?.Delivery || 0 },
            ].map(o => {
              const Icon = o.icon
              return (
                <div key={o.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${o.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{o.label}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{o.count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Payment Methods</h3>
          <div className="space-y-3">
            {[
              { label: 'Cash', icon: Banknote, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400', value: shift?.paymentBreakdown?.Cash || 0 },
              { label: 'Card', icon: CreditCard, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400', value: shift?.paymentBreakdown?.Card || 0 },
              { label: 'Bank', icon: Building2, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400', value: shift?.paymentBreakdown?.Bank || 0 },
            ].map(p => {
              const Icon = p.icon
              return (
                <div key={p.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${p.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{p.label}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Rs {Number(p.value).toLocaleString()}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Shift Status */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Shift Status</h3>
            <Link to="/cafeteria/daily-shift" className="flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {shift ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock4 className={`h-4 w-4 ${shift.status === 'open' ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${shift.status === 'open' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                  {shift.status === 'open' ? 'Open' : 'Closed'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Opening</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">Rs {Number(shift.openingCash || 0).toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Revenue</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">Rs {Number(shift.totalRevenue || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4 text-center">
              <Clock4 className="h-8 w-8 text-slate-200 dark:text-slate-700" />
              <p className="mt-2 text-xs text-slate-400">No shift open</p>
              <Link to="/cafeteria/daily-shift" className="mt-2 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700">Open Shift</Link>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} className={`group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 ${k.bg}`}>
              <div className={`absolute right-0 top-0 h-20 w-20 -translate-y-6 translate-x-6 rounded-full bg-linear-to-br ${k.accent} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`} />
              <div className="relative">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${k.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{k.value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{k.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Recent Sales */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-50 px-5 py-4 dark:border-slate-800/50">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Recent Sales</h3>
            <Link to="/cafeteria/sales-history" className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-orange-600 transition hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {recentSales.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-10 text-center">
                <Coffee className="h-8 w-8 text-slate-200 dark:text-slate-700" />
                <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">No sales yet today</p>
                <Link to="/cafeteria/pos" className="mt-3 rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-orange-700">Open POS</Link>
              </div>
            ) : (
              recentSales.map((s) => (
                <div key={s._id} className="flex items-center justify-between px-5 py-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      <ReceiptText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{s.billNo}</p>
                      <p className="text-xs text-slate-400">{s.customerName} &middot; {new Date(s.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Rs {Number(s.total || 0).toLocaleString()}</p>
                    <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">{s.paymentMethod}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-50 px-5 py-4 dark:border-slate-800/50">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Low Stock
            </h3>
            <Link to="/cafeteria/menu-items" className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-orange-600 transition hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30">
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {lowStock.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-10 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30">
                  <Sparkles className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">All items well stocked</p>
              </div>
            ) : (
              lowStock.map((item) => (
                <div key={item._id} className="flex items-center justify-between px-5 py-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-950/30">
                      <Coffee className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.name}</p>
                      <p className="text-xs text-slate-400">{item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                      {item.stockQty} left
                    </span>
                    <p className="mt-0.5 text-[10px] font-medium text-slate-400">Min: {item.lowStockThreshold}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Top Selling Items */}
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
                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Qty</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {summary.topItems.map((t: any, i: number) => (
                  <tr key={t.name} className="border-b border-slate-50 transition hover:bg-slate-50 dark:border-slate-800/30 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 text-xs font-bold text-slate-300 dark:text-slate-600">{i + 1}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-100 text-slate-600' : i === 2 ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
                          {i + 1}
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-600 dark:text-slate-300">{t.qty}</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-slate-100">Rs {Number(t.revenue || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
