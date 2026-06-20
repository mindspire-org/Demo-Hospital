import { useEffect, useMemo, useState } from 'react'
import { pharmacyApi } from '../../utils/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts'
import {
  TrendingUp, DollarSign, ShoppingCart, Package, AlertTriangle, Ban, RefreshCw, Clock, Bell, CreditCard,
  Printer, LayoutDashboard, Filter, RotateCcw, Wallet, Receipt, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { DateRangePicker } from '../../components/common/DatePicker'

export default function Pharmacy_Dashboard() {
  const [stats, setStats] = useState<{ stockSaleValue: number; lowStockCount: number; outOfStockCount: number; expiringSoonCount: number; totalInventoryOnHand: number } | null>(null)
  const [purchasesTotal, setPurchasesTotal] = useState<number>(0)
  const [expiringSoon, setExpiringSoon] = useState<Array<{ name: string; expiry: string; onHand: number }>>([])
  const [lastUpdated, setLastUpdated] = useState<string>('—')
  const [tick, setTick] = useState(0)
  const [salesToday, setSalesToday] = useState<number>(0)
  const [, setSalesMonth] = useState<number>(0)
  const [cashSalesToday, setCashSalesToday] = useState<number>(0)
  const [creditSalesToday, setCreditSalesToday] = useState<number>(0)
  const [recentSales, setRecentSales] = useState<Array<{ billNo: string; total: number; datetime: string; customer?: string }>>([])

  // Date filters
  const today = useMemo(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }, [])
  const monthStart = useMemo(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` }, [])
  const [from, setFrom] = useState<string>(monthStart)
  const [to, setTo] = useState<string>(today)

  // Extended data
  const [expensesTotal, setExpensesTotal] = useState<number>(0)
  const [returnsTotal] = useState<number>(0)
  const [cashIn, setCashIn] = useState<number>(0)
  const [cashOut, setCashOut] = useState<number>(0)
  const [topMedicines, setTopMedicines] = useState<Array<{ name: string; qty: number; revenue: number }>>([])
  const [salesTrend, setSalesTrend] = useState<Array<{ date: string; amount: number }>>([])
  const [paymentBreakdown, setPaymentBreakdown] = useState<{ cash: number; credit: number; card: number }>({ cash: 0, credit: 0, card: 0 })
  const [inventoryHealth, setInventoryHealth] = useState<{ normal: number; low: number; out: number; expiring: number }>({ normal: 0, low: 0, out: 0, expiring: 0 })

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
      const dateFrom = from || monthStart
      const dateTo = to || today

      const tasks = await Promise.allSettled([
        pharmacyApi.inventorySummaryCached(undefined, { ttlMs: 120_000, forceRefresh: tick>0 }),
        pharmacyApi.purchasesSummaryCached({ from: dateFrom, to: dateTo }, { ttlMs: 120_000, forceRefresh: tick>0 }),
        pharmacyApi.salesSummaryCached({ from: dateFrom, to: dateTo }, { ttlMs: 60_000, forceRefresh: tick>0 }),
        pharmacyApi.salesSummaryCached({ payment: 'Cash', from: dateFrom, to: dateTo }, { ttlMs: 60_000, forceRefresh: tick>0 }),
        pharmacyApi.salesSummaryCached({ payment: 'Credit', from: dateFrom, to: dateTo }, { ttlMs: 60_000, forceRefresh: tick>0 }),
        pharmacyApi.salesSummaryCached({ payment: 'Card', from: dateFrom, to: dateTo }, { ttlMs: 60_000, forceRefresh: tick>0 }),
        pharmacyApi.listSalesCached({ limit: 5, from: dateFrom, to: dateTo }, { ttlMs: 60_000, forceRefresh: tick>0 }),
        pharmacyApi.expensesSummary({ from: dateFrom, to: dateTo }),
        pharmacyApi.cashMovementSummary({ from: dateFrom, to: dateTo }),
      ])

      if (!mounted) return

      const inv = tasks[0].status === 'fulfilled' ? (tasks[0].value as any) : null
      const pur = tasks[1].status === 'fulfilled' ? (tasks[1].value as any) : null
      const sRange = tasks[2].status === 'fulfilled' ? (tasks[2].value as any) : null
      const sCash = tasks[3].status === 'fulfilled' ? (tasks[3].value as any) : null
      const sCredit = tasks[4].status === 'fulfilled' ? (tasks[4].value as any) : null
      const sCard = tasks[5].status === 'fulfilled' ? (tasks[5].value as any) : null
      const listSales = tasks[6].status === 'fulfilled' ? (tasks[6].value as any) : null
      const exp = tasks[7].status === 'fulfilled' ? (tasks[7].value as any) : null
      const cashM = tasks[8].status === 'fulfilled' ? (tasks[8].value as any) : null

      if (inv){
        setStats(inv?.stats || null)
        const arrRaw = Array.isArray(inv?.expiringSoonItems) ? inv.expiringSoonItems : []
        const arr = arrRaw.filter((it:any)=> Number(it.onHand||0) > 0)
        setExpiringSoon(arr.map((it:any)=> ({ name: it.name, expiry: String(it.earliestExpiry||'').slice(0,10), onHand: Number(it.onHand||0) })))
        // Inventory health
        const total = Number(inv?.stats?.totalInventoryOnHand || 0)
        const low = Number(inv?.stats?.lowStockCount || 0)
        const out = Number(inv?.stats?.outOfStockCount || 0)
        const expiring = arr.length
        const normal = Math.max(0, total - low - out)
        setInventoryHealth({ normal, low, out, expiring })
        try { localStorage.setItem('pharmacy.inventory.summary', JSON.stringify({ stats: inv?.stats, expiringSoonItems: arrRaw, at: Date.now() })) } catch {}
      }
      if (pur){ setPurchasesTotal(Number(pur?.totalAmount || 0)) }
      if (sRange){
        setSalesToday(Number(sRange?.totalAmount || 0))
        setSalesMonth(Number(sRange?.totalAmount || 0))
      }
      if (sCash){ setCashSalesToday(Number(sCash?.totalAmount || 0)) }
      if (sCredit){ setCreditSalesToday(Number(sCredit?.totalAmount || 0)) }
      if (listSales){
        setRecentSales((listSales?.items||[]).slice(0,5).map((s:any)=> ({ billNo: s.billNo, total: s.total||0, datetime: s.datetime, customer: s.customer })))
        // Top medicines from sales lines
        const medMap = new Map<string, { name: string; qty: number; revenue: number }>()
        for (const sale of (listSales?.items||[]).slice(0,20)){
          for (const line of (sale?.lines||[])){
            const name = String(line?.name||'Unknown')
            const qty = Number(line?.qty||0)
            const rev = Number(line?.total||line?.subtotal||0)
            const cur = medMap.get(name) || { name, qty: 0, revenue: 0 }
            medMap.set(name, { name, qty: cur.qty + qty, revenue: cur.revenue + rev })
          }
        }
        setTopMedicines(Array.from(medMap.values()).sort((a,b)=> b.revenue - a.revenue).slice(0,5))
        // Sales trend (group by date)
        const trend = new Map<string, number>()
        for (const sale of (listSales?.items||[])){
          const d = String(sale?.datetime||'').slice(0,10)
          if (!d) continue
          trend.set(d, (trend.get(d)||0) + Number(sale?.total||0))
        }
        setSalesTrend(Array.from(trend.entries()).map(([date,amount])=>({ date, amount })).sort((a,b)=>a.date.localeCompare(b.date)))
      }
      if (exp){ setExpensesTotal(Number(exp?.totalAmount || exp?.total || 0)) }
      if (cashM){
        const cin = Number((cashM as any)?.totalIn || (cashM as any)?.cashIn || 0)
        const cout = Number((cashM as any)?.totalOut || (cashM as any)?.cashOut || 0)
        setCashIn(cin)
        setCashOut(cout)
      }
      setPaymentBreakdown({
        cash: Number(sCash?.totalAmount || 0),
        credit: Number(sCredit?.totalAmount || 0),
        card: Number(sCard?.totalAmount || 0)
      })
      setLastUpdated(new Date().toLocaleString())
    }
    load()
    return ()=>{ mounted = false }
  }, [tick, from, to])

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

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-violet-600 to-indigo-600 p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
              <LayoutDashboard className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Pharmacy Dashboard</h1>
              <p className="text-sm text-white/80">Real-time overview of sales, inventory & analytics</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DateRangePicker
              value={{ from, to }}
              onChange={({ from: f, to: t }) => { setFrom(f); setTo(t) }}
              dark
            />
            <button onClick={()=> setTick(t=>t+1)} className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-sm font-medium backdrop-blur-sm hover:bg-white/25 transition-colors">
              <Filter className="h-4 w-4" /> Apply
            </button>
            <button onClick={()=>{ setFrom(monthStart); setTo(today); setTick(t=>t+1) }} className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-sm font-medium backdrop-blur-sm hover:bg-white/25 transition-colors">
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
            <button onClick={()=> window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-violet-700 shadow-sm hover:bg-white/90 transition-colors">
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10" />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          { label: 'Total Sales', value: `Rs ${salesToday.toFixed(2)}`, icon: <TrendingUp className="h-4 w-4" />, color: 'emerald', sub: 'Date range total' },
          { label: 'Cash Sales', value: `Rs ${cashSalesToday.toFixed(2)}`, icon: <DollarSign className="h-4 w-4" />, color: 'green', sub: 'Cash payments' },
          { label: 'Credit Sales', value: `Rs ${creditSalesToday.toFixed(2)}`, icon: <CreditCard className="h-4 w-4" />, color: 'amber', sub: 'Credit payments' },
          { label: 'Total Purchases', value: `Rs ${purchasesTotal.toFixed(2)}`, icon: <ShoppingCart className="h-4 w-4" />, color: 'sky', sub: 'Stock bought' },
          { label: 'Profit (Est.)', value: `Rs ${Math.max(0, salesToday - purchasesTotal - expensesTotal).toFixed(2)}`, icon: <ArrowUpRight className="h-4 w-4" />, color: 'violet', sub: 'Sales − Purchases − Expenses' },
          { label: 'Expenses', value: `Rs ${expensesTotal.toFixed(2)}`, icon: <Receipt className="h-4 w-4" />, color: 'orange', sub: 'Operating costs' },
          { label: 'Cash Flow', value: `Rs ${(cashIn - cashOut).toFixed(2)}`, icon: <Wallet className="h-4 w-4" />, color: 'cyan', sub: 'Cash In − Cash Out' },
          { label: 'Total Inventory', value: `${stats?.totalInventoryOnHand ?? 0}`, icon: <Package className="h-4 w-4" />, color: 'indigo', sub: 'Items on hand' },
          { label: 'Stock Value', value: `Rs ${(stats?.stockSaleValue ?? 0).toFixed(2)}`, icon: <DollarSign className="h-4 w-4" />, color: 'fuchsia', sub: 'At sale price' },
          { label: 'Low Stock', value: `${stats?.lowStockCount ?? 0}`, icon: <AlertTriangle className="h-4 w-4" />, color: 'yellow', sub: 'Below reorder level' },
          { label: 'Out of Stock', value: `${stats?.outOfStockCount ?? 0}`, icon: <Ban className="h-4 w-4" />, color: 'rose', sub: 'Needs reorder' },
          { label: 'Returns', value: `Rs ${returnsTotal.toFixed(2)}`, icon: <ArrowDownRight className="h-4 w-4" />, color: 'slate', sub: 'Refunds & returns' },
        ].map((k, i) => {
          const colorMap: Record<string, string> = {
            emerald: 'border-l-emerald-500 text-emerald-600 bg-emerald-50',
            green: 'border-l-green-500 text-green-600 bg-green-50',
            amber: 'border-l-amber-500 text-amber-600 bg-amber-50',
            sky: 'border-l-sky-500 text-sky-600 bg-sky-50',
            violet: 'border-l-violet-500 text-violet-600 bg-violet-50',
            orange: 'border-l-orange-500 text-orange-600 bg-orange-50',
            cyan: 'border-l-cyan-500 text-cyan-600 bg-cyan-50',
            indigo: 'border-l-indigo-500 text-indigo-600 bg-indigo-50',
            fuchsia: 'border-l-fuchsia-500 text-fuchsia-600 bg-fuchsia-50',
            yellow: 'border-l-yellow-500 text-yellow-600 bg-yellow-50',
            rose: 'border-l-rose-500 text-rose-600 bg-rose-50',
            slate: 'border-l-slate-500 text-slate-600 bg-slate-50',
          }
          return (
            <div key={i} className={`rounded-xl border border-slate-200 bg-white shadow-sm p-4 border-l-4 ${colorMap[k.color].split(' ')[0]} transition-all hover:-translate-y-0.5 hover:shadow-md`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{k.label}</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">{k.value}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">{k.sub}</div>
                </div>
                <div className={`rounded-full p-2 ${colorMap[k.color].split(' ').slice(1).join(' ')}`}>{k.icon}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Sales vs Purchases Analytics */}
      <div className="rounded-xl border border-slate-200 bg-linear-to-br from-white via-violet-50/20 to-indigo-50/30 shadow-lg p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-base font-bold text-slate-900">Sales vs Purchases Analytics</div>
            <div className="text-xs text-slate-500 mt-0.5">Comparative analysis for {from} → {to}</div>
          </div>
          <div className="rounded-lg bg-white px-3 py-1.5 shadow-sm border border-slate-200">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Net Margin</div>
            <div className={`text-lg font-extrabold ${(salesToday - purchasesTotal) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              Rs {(salesToday - purchasesTotal).toFixed(2)}
            </div>
          </div>
        </div>
        <div className="h-64">
          {(() => {
            const data = [
              { category: 'Sales', amount: salesToday, fill: '#10b981' },
              { category: 'Purchases', amount: purchasesTotal, fill: '#0ea5e9' },
              { category: 'Expenses', amount: expensesTotal, fill: '#f97316' },
              { category: 'Profit', amount: Math.max(0, salesToday - purchasesTotal - expensesTotal), fill: '#8b5cf6' }
            ]
            return (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v)=> `Rs ${v}`} />
                  <Tooltip 
                    formatter={(v: any)=> [`Rs ${Number(v).toFixed(2)}`, 'Amount']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="amount" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          })()}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {[
            { label: 'Sales', value: salesToday, color: 'bg-emerald-500', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50' },
            { label: 'Purchases', value: purchasesTotal, color: 'bg-sky-500', textColor: 'text-sky-700', bgColor: 'bg-sky-50' },
            { label: 'Expenses', value: expensesTotal, color: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50' },
            { label: 'Profit', value: Math.max(0, salesToday - purchasesTotal - expensesTotal), color: 'bg-violet-500', textColor: 'text-violet-700', bgColor: 'bg-violet-50' }
          ].map((item, i) => (
            <div key={i} className={`rounded-lg ${item.bgColor} border border-${item.color.replace('bg-', '')}/20 p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${item.color}`} />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">{item.label}</span>
              </div>
              <div className={`text-base font-bold ${item.textColor}`}>Rs {item.value.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Sales Trend */}
        <div className="rounded-xl border border-slate-200 bg-linear-to-br from-white to-emerald-50/30 shadow-lg p-5 md:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-base font-bold text-slate-900">Sales Trend</div>
              <div className="text-xs text-slate-500 mt-0.5">Daily revenue performance</div>
            </div>
            <div className="rounded-lg bg-emerald-100 px-3 py-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Total</div>
              <div className="text-sm font-bold text-emerald-900">Rs {salesTrend.reduce((s,t)=>s+t.amount,0).toFixed(2)}</div>
            </div>
          </div>
          <div className="h-56">
            {salesTrend.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-slate-400">
                <TrendingUp className="h-12 w-12 mb-2 opacity-30" />
                <div className="text-sm font-medium">No sales data for selected range</div>
                <div className="text-xs mt-1">Try adjusting the date filter</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrend} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v)=> v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v)=> `Rs ${v}`} />
                  <Tooltip 
                    formatter={(v: any)=> [`Rs ${Number(v).toFixed(2)}`, 'Revenue']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-linear-to-br from-white to-indigo-50/30 shadow-lg p-5">
          <div className="mb-4">
            <div className="text-base font-bold text-slate-900">Payment Methods</div>
            <div className="text-xs text-slate-500 mt-0.5">Revenue by payment type</div>
          </div>
          <div className="h-56">
            {(()=>{
              const data = [
                { name: 'Cash', value: paymentBreakdown.cash },
                { name: 'Credit', value: paymentBreakdown.credit },
                { name: 'Card', value: paymentBreakdown.card },
              ].filter(d=> d.value > 0)
              if (data.length === 0) return (
                <div className="flex h-full flex-col items-center justify-center text-slate-400">
                  <CreditCard className="h-12 w-12 mb-2 opacity-30" />
                  <div className="text-sm font-medium">No payment data</div>
                </div>
              )
              const COLORS = ['#10b981','#f59e0b','#6366f1']
              const total = data.reduce((s,d)=>s+d.value,0)
              return (
                <div className="space-y-3">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value">
                        {data.map((_, i)=> <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip 
                        formatter={(v: any)=> [`Rs ${Number(v).toFixed(2)}`, 'Amount']}
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {data.map((d, i) => {
                      const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0'
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                            <span className="font-medium text-slate-700">{d.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">Rs {d.value.toFixed(2)}</span>
                            <span className="text-slate-500">({pct}%)</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Inventory Health + Top Medicines */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Inventory Health */}
        <div className="rounded-xl border border-slate-200 bg-linear-to-br from-white to-blue-50/30 shadow-lg p-5">
          <div className="mb-4">
            <div className="text-base font-bold text-slate-900">Inventory Health</div>
            <div className="text-xs text-slate-500 mt-0.5">Stock status distribution</div>
          </div>
          <div className="h-56">
            {(()=>{
              const data = [
                { name: 'Normal', value: inventoryHealth.normal },
                { name: 'Low Stock', value: inventoryHealth.low },
                { name: 'Out of Stock', value: inventoryHealth.out },
                { name: 'Expiring', value: inventoryHealth.expiring },
              ].filter(d=> d.value > 0)
              if (data.length === 0) return (
                <div className="flex h-full flex-col items-center justify-center text-slate-400">
                  <Package className="h-12 w-12 mb-2 opacity-30" />
                  <div className="text-sm font-medium">No inventory data</div>
                </div>
              )
              const COLORS = ['#3b82f6','#eab308','#ef4444','#a855f7']
              const total = data.reduce((s,d)=>s+d.value,0)
              return (
                <div className="space-y-3">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value">
                        {data.map((_, i)=> <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip 
                        formatter={(v: any, name: any)=> [`${v} items`, name]}
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {data.map((d, i) => {
                      const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0'
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                            <span className="font-medium text-slate-700">{d.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{d.value}</span>
                            <span className="text-slate-500">({pct}%)</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {/* Top 5 Medicines */}
        <div className="rounded-xl border border-slate-200 bg-linear-to-br from-white to-violet-50/30 shadow-lg p-5 md:col-span-2">
          <div className="mb-4">
            <div className="text-base font-bold text-slate-900">Top 5 Best-Selling Medicines</div>
            <div className="text-xs text-slate-500 mt-0.5">Highest revenue generators</div>
          </div>
          {topMedicines.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center text-slate-400">
              <BarChart className="h-12 w-12 mb-2 opacity-30" />
              <div className="text-sm font-medium">No sales data for selected range</div>
              <div className="text-xs mt-1">Try adjusting the date filter</div>
            </div>
          ) : (
            <div className="space-y-4">
              {topMedicines.map((m, idx)=> {
                const maxRevenue = topMedicines[0]?.revenue || 1
                const pct = (m.revenue / maxRevenue) * 100
                const colors = ['bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-sky-500', 'bg-cyan-500']
                const bgColors = ['bg-violet-50', 'bg-indigo-50', 'bg-blue-50', 'bg-sky-50', 'bg-cyan-50']
                return (
                  <div key={idx} className={`rounded-lg ${bgColors[idx]} border border-${colors[idx].replace('bg-', '')}/20 p-3 transition-all hover:shadow-md`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colors[idx]} text-sm font-bold text-white shadow-sm`}>{idx+1}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="truncate text-sm font-semibold text-slate-900">{m.name}</div>
                          <div className="text-xs text-slate-500 ml-2">{m.qty} units</div>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/60">
                          <div className={`h-full rounded-full ${colors[idx]} transition-all duration-700`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-base font-bold text-slate-900">Rs {m.revenue.toFixed(2)}</div>
                        <div className="text-[10px] font-medium text-slate-500">{pct.toFixed(1)}% of top</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Sales */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-800">Recent Sales</span>
            </div>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">Latest 5</span>
          </div>
          {recentSales.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">No recent sales</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2">Bill</th>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSales.map((s, idx)=> (
                  <tr key={idx} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-800">{s.billNo}</div>
                      <div className="text-[11px] text-slate-400">{new Date(s.datetime).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{s.customer || 'Walk-in'}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900">Rs {Number(s.total||0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Expiring Soon */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 bg-amber-50/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-slate-800">Expiring Soon / Expired</span>
            </div>
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">Alert</span>
          </div>
          {expiringSoon.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">No expiring or expired medicines</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-amber-50/30 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2">Medicine</th>
                  <th className="px-4 py-2">Expiry</th>
                  <th className="px-4 py-2 text-right">On Hand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expiringSoon.map((it, idx)=> (
                  <tr key={idx} className="transition-colors hover:bg-amber-50/30">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{it.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${new Date(it.expiry) < new Date() ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {it.expiry}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-700">{it.onHand}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock className="h-3.5 w-3.5" />
          <span>Updated: {lastUpdated}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=> window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button onClick={()=> setTick(t=>t+1)} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 transition-colors shadow-sm">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>
    </div>
  )
}
