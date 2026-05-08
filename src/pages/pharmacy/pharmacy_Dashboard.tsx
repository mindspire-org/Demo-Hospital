import { useEffect, useState, useMemo } from 'react'
import { pharmacyApi } from '../../utils/api'
import { TrendingUp, DollarSign, ShoppingCart, Package, AlertTriangle, Ban, RefreshCw, Clock, Bell, CreditCard, Activity, Pill, BarChart3 } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

function fmtRs(v: number) { return `PKR ${Number(v).toFixed(2)}` }

export default function Pharmacy_Dashboard() {
  const [stats, setStats] = useState<{ stockSaleValue: number; lowStockCount: number; outOfStockCount: number; expiringSoonCount: number; totalInventoryOnHand: number } | null>(null)
  const [purchasesTotal, setPurchasesTotal] = useState<number>(0)
  const [expiringSoon, setExpiringSoon] = useState<Array<{ name: string; expiry: string; onHand: number }>>([])
  const [lastUpdated, setLastUpdated] = useState<string>('—')
  const [tick, setTick] = useState(0)
  const [salesToday, setSalesToday] = useState<number>(0)
  const [salesMonth, setSalesMonth] = useState<number>(0)
  const [cashSalesToday, setCashSalesToday] = useState<number>(0)
  const [creditSalesToday, setCreditSalesToday] = useState<number>(0)
  const [recentSales, setRecentSales] = useState<Array<{ billNo: string; total: number; datetime: string; customer?: string }>>([])
  const [salesTrend, setSalesTrend] = useState<Array<{ day: string; amount: number }>>([])

  function fmtDate(d: Date){
    const y = d.getFullYear()
    const m = String(d.getMonth()+1).padStart(2,'0')
    const day = String(d.getDate()).padStart(2,'0')
    return `${y}-${m}-${day}`
  }

  // Instant cached summary for perceived speed
  useEffect(()=>{
    try {
      const cached = JSON.parse(localStorage.getItem('pharmacy.inventory.summary') || 'null')
      if (cached?.stats) setStats(cached.stats)
      if (Array.isArray(cached?.expiringSoonItems)){
        const arr = (cached.expiringSoonItems||[]).filter((it:any)=> Number(it.onHand||0) > 0)
        setExpiringSoon(arr.map((it:any)=> ({ name: it.name, expiry: String(it.earliestExpiry||'').slice(0,10), onHand: Number(it.onHand||0) })))
      }
    } catch {}
  }, [])

  useEffect(()=>{
    let mounted = true
    async function load(){
      const today = new Date()
      const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const fromToday = fmtDate(today)
      const fromMonth = fmtDate(firstMonth)

      const tasks = await Promise.allSettled([
        pharmacyApi.inventorySummaryCached(undefined, { ttlMs: 120_000, forceRefresh: tick>0 }),
        pharmacyApi.purchasesSummaryCached({ from: fromMonth, to: fromToday }, { ttlMs: 120_000, forceRefresh: tick>0 }),
        pharmacyApi.salesSummaryCached({ from: fromToday, to: fromToday }, { ttlMs: 60_000, forceRefresh: tick>0 }),
        pharmacyApi.salesSummaryCached({ from: fromMonth, to: fromToday }, { ttlMs: 120_000, forceRefresh: tick>0 }),
        pharmacyApi.salesSummaryCached({ payment: 'Cash', from: fromToday, to: fromToday }, { ttlMs: 60_000, forceRefresh: tick>0 }),
        pharmacyApi.salesSummaryCached({ payment: 'Credit', from: fromToday, to: fromToday }, { ttlMs: 60_000, forceRefresh: tick>0 }),
        pharmacyApi.listSalesCached({ limit: 5 }, { ttlMs: 60_000, forceRefresh: tick>0 }),
      ])

      if (!mounted) return

      const inv = tasks[0].status === 'fulfilled' ? (tasks[0].value as any) : null
      const pur = tasks[1].status === 'fulfilled' ? (tasks[1].value as any) : null
      const sToday = tasks[2].status === 'fulfilled' ? (tasks[2].value as any) : null
      const sMonth = tasks[3].status === 'fulfilled' ? (tasks[3].value as any) : null
      const sCashToday = tasks[4].status === 'fulfilled' ? (tasks[4].value as any) : null
      const sCreditToday = tasks[5].status === 'fulfilled' ? (tasks[5].value as any) : null
      const listSales = tasks[6].status === 'fulfilled' ? (tasks[6].value as any) : null

      if (inv){
        setStats(inv?.stats || null)
        // Use backend-provided expiringSoonItems but exclude out-of-stock from display
        const arrRaw = Array.isArray(inv?.expiringSoonItems) ? inv.expiringSoonItems : []
        const arr = arrRaw.filter((it:any)=> Number(it.onHand||0) > 0)
        setExpiringSoon(arr.map((it:any)=> ({ name: it.name, expiry: String(it.earliestExpiry||'').slice(0,10), onHand: Number(it.onHand||0) })))
        try { localStorage.setItem('pharmacy.inventory.summary', JSON.stringify({ stats: inv?.stats, expiringSoonItems: arrRaw, at: Date.now() })) } catch {}
      }
      if (pur){ setPurchasesTotal(Number(pur?.totalAmount || 0)) }
      if (sToday){ setSalesToday(Number(sToday?.totalAmount || 0)) }
      if (sMonth){ setSalesMonth(Number(sMonth?.totalAmount || 0)) }
      if (sCashToday){ setCashSalesToday(Number(sCashToday?.totalAmount || 0)) }
      if (sCreditToday){ setCreditSalesToday(Number(sCreditToday?.totalAmount || 0)) }
      if (listSales){
        setRecentSales((listSales?.items||[]).slice(0,5).map((s:any)=> ({ billNo: s.billNo, total: s.total||0, datetime: s.datetime, customer: s.customer })))
      }
      // Build 7-day sales trend from recent sales
      try {
        const trendMap: Record<string, number> = {}
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i)
          const key = fmtDate(d)
          trendMap[key] = 0
        }
        const trendRes: any = await pharmacyApi.listSalesCached({ limit: 50 }, { ttlMs: 60_000, forceRefresh: tick>0 })
        if (trendRes?.items) {
          for (const s of trendRes.items) {
            const day = String(s.datetime || '').slice(0, 10)
            if (day in trendMap) trendMap[day] += Number(s.total || 0)
          }
        }
        setSalesTrend(Object.entries(trendMap).map(([day, amount]) => ({ day: day.slice(5), amount })))
      } catch {}
      setLastUpdated(new Date().toLocaleString())
    }
    load()
    return ()=>{ mounted = false }
  }, [tick])

  useEffect(()=>{
    function onSale(ev: any){
      const s = ev?.detail || {}
      const amt = Number(s?.total || 0)
      setSalesToday(v => v + amt)
      setSalesMonth(v => v + amt)
      if (s?.payment === 'Cash') setCashSalesToday(v => v + amt)
      if (s?.payment === 'Credit') setCreditSalesToday(v => v + amt)
      setRecentSales(rs => [{ billNo: s.billNo, total: s.total || 0, datetime: s.datetime || new Date().toISOString(), customer: s.customer }, ...rs].slice(0,5))
      setLastUpdated(new Date().toLocaleString())
    }
    window.addEventListener('pharmacy:sale', onSale as any)
    return ()=>{ window.removeEventListener('pharmacy:sale', onSale as any) }
  }, [])

  const paymentChartData = useMemo(() => [
    { name: 'Cash', value: cashSalesToday, color: '#10b981' },
    { name: 'Credit', value: creditSalesToday, color: '#f59e0b' },
  ], [cashSalesToday, creditSalesToday])

  const inventoryChartData = useMemo(() => [
    { name: 'In Stock', value: Math.max(0, (stats?.totalInventoryOnHand ?? 0) - (stats?.lowStockCount ?? 0) - (stats?.outOfStockCount ?? 0)), color: '#10b981' },
    { name: 'Low Stock', value: stats?.lowStockCount ?? 0, color: '#f59e0b' },
    { name: 'Out of Stock', value: stats?.outOfStockCount ?? 0, color: '#ef4444' },
  ], [stats])

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-white dark:bg-slate-950">
      <div className="relative overflow-hidden bg-linear-to-br from-sky-400 via-sky-500 to-blue-600 px-8 pb-8 pt-8 text-white shadow-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20"><Pill className="h-7 w-7" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl text-white">Pharmacy Dashboard</h1>
              <p className="mt-0.5 text-sm text-white/80 font-medium">Real-time overview of sales, inventory & alerts</p>
            </div>
          </div>
          <button type="button" onClick={()=> setTick(t=>t+1)} className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur-sm ring-1 ring-white/20 transition hover:bg-white/25 active:scale-95 shadow-sm">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-sky-400 to-sky-600 p-5 text-white shadow-lg shadow-sky-100 dark:shadow-none">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 shadow-sm"><DollarSign className="h-5 w-5" /></div>
              <div><div className="text-xs font-bold uppercase tracking-wider text-white/90">Today's Sales</div><div className="text-xl font-black tabular-nums">{fmtRs(salesToday)}</div></div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-blue-400 to-blue-600 p-5 text-white shadow-lg shadow-blue-100 dark:shadow-none">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 shadow-sm"><TrendingUp className="h-5 w-5" /></div>
              <div><div className="text-xs font-bold uppercase tracking-wider text-white/90">Month Sales</div><div className="text-xl font-black tabular-nums">{fmtRs(salesMonth)}</div></div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-cyan-400 to-cyan-600 p-5 text-white shadow-lg shadow-cyan-100 dark:shadow-none">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 shadow-sm"><DollarSign className="h-5 w-5" /></div>
              <div><div className="text-xs font-bold uppercase tracking-wider text-white/90">Cash Today</div><div className="text-xl font-black tabular-nums">{fmtRs(cashSalesToday)}</div></div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-sky-500 to-indigo-600 p-5 text-white shadow-lg shadow-sky-100 dark:shadow-none">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 shadow-sm"><CreditCard className="h-5 w-5" /></div>
              <div><div className="text-xs font-bold uppercase tracking-wider text-white/90">Credit Today</div><div className="text-xl font-black tabular-nums">{fmtRs(creditSalesToday)}</div></div>
            </div>
          </div>

        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-sky-400 to-blue-500 p-5 text-white shadow-lg shadow-sky-50 dark:shadow-none"><div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 blur-xl" /><div className="relative flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 shadow-sm"><ShoppingCart className="h-5 w-5" /></div><div><div className="text-xs font-bold uppercase tracking-wider text-white/90">Month Purchases</div><div className="text-xl font-black tabular-nums">{fmtRs(purchasesTotal)}</div></div></div></div>
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-cyan-400 to-sky-500 p-5 text-white shadow-lg shadow-cyan-50 dark:shadow-none"><div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 blur-xl" /><div className="relative flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 shadow-sm"><Package className="h-5 w-5" /></div><div><div className="text-xs font-bold uppercase tracking-wider text-white/90">Total Inventory</div><div className="text-xl font-black tabular-nums">{stats?.totalInventoryOnHand ?? 0}</div></div></div></div>
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-amber-400 to-orange-500 p-5 text-white shadow-lg shadow-amber-50 dark:shadow-none"><div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 blur-xl" /><div className="relative flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 shadow-sm"><AlertTriangle className="h-5 w-5" /></div><div><div className="text-xs font-bold uppercase tracking-wider text-white/90">Low Stock</div><div className="text-xl font-black tabular-nums">{stats?.lowStockCount ?? 0}</div></div></div></div>
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-rose-400 to-red-500 p-5 text-white shadow-lg shadow-rose-50 dark:shadow-none"><div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 blur-xl" /><div className="relative flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 shadow-sm"><Ban className="h-5 w-5" /></div><div><div className="text-xs font-bold uppercase tracking-wider text-white/90">Out of Stock</div><div className="text-xl font-black tabular-nums">{stats?.outOfStockCount ?? 0}</div></div></div></div>
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 p-5 text-white shadow-lg shadow-blue-50 dark:shadow-none"><div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 blur-xl" /><div className="relative flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 shadow-sm"><DollarSign className="h-5 w-5" /></div><div><div className="text-xs font-bold uppercase tracking-wider text-white/90">Stock Value</div><div className="text-xl font-black tabular-nums">{fmtRs(stats?.stockSaleValue ?? 0)}</div></div></div></div>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><Activity className="h-4 w-4 text-emerald-500" /> 7-Day Sales Trend</div>
            {salesTrend.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">Loading chart…</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip formatter={(v) => fmtRs(Number(v))} />
                  <defs><linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10b981" stopOpacity={0.02} /></linearGradient></defs>
                  <Area type="monotone" dataKey="amount" stroke="#10b981" fill="url(#greenGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><BarChart3 className="h-4 w-4 text-amber-500" /> Cash vs Credit</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={paymentChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip formatter={(v) => fmtRs(Number(v))} />
                <Bar dataKey="value" radius={[6,6,0,0]}>
                  {paymentChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><Package className="h-4 w-4 text-indigo-500" /> Inventory Status</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={inventoryChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3}>
                  {inventoryChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              {inventoryChartData.map(d => <span key={d.name} className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />{d.name}: {d.value}</span>)}
            </div>
          </div>
        </div>

        {/* Recent Sales & Expiring Soon */}
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><Bell className="h-4 w-4 text-slate-500" /> Recent Sales</div>
            {recentSales.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900/50">No recent sales</div>
            ) : (
              <div className="space-y-2">
                {recentSales.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-sm transition hover:bg-slate-100/80 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-700/50">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{s.billNo}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{new Date(s.datetime).toLocaleString()} · {s.customer || 'Walk-in'}</div>
                    </div>
                    <div className="shrink-0 font-bold text-emerald-600 dark:text-emerald-400">{fmtRs(s.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><AlertTriangle className="h-4 w-4 text-amber-500" /> Expiring Soon / Expired</div>
            {expiringSoon.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900/50">No expiring or expired medicines</div>
            ) : (
              <div className="space-y-2">
                {expiringSoon.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-2.5 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
                    <div className="font-medium text-slate-800 dark:text-slate-200">{it.name}</div>
                    <div className="text-xs font-medium text-amber-700 dark:text-amber-400">{it.expiry}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">On hand: {it.onHand}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 text-xs text-slate-400 dark:text-slate-500">
          <Clock className="h-3.5 w-3.5" />
          <span>Last updated: {lastUpdated}</span>
        </div>
      </div>
    </div>
  )
}
