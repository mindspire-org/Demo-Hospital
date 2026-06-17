import { useEffect, useMemo, useState } from 'react'
import { diagnosticApi, labApi } from '../../utils/api'
import { DollarSign, Activity, CheckCircle, Clock, Bell, Building2, Wallet, TrendingUp, Search, AlertCircle, Microscope, FlaskConical, Printer, RefreshCw } from 'lucide-react'
import { fmt12 } from '../../utils/timeFormat'

function money(n: any){
  const v = Number(n || 0)
  return `PKR ${Math.round(v).toLocaleString()}`
}

function badgeTone(type: 'cash' | 'corporate'){
  return type === 'corporate'
    ? 'bg-violet-100 text-violet-800 ring-violet-200'
    : 'bg-sky-100 text-sky-800 ring-sky-200'
}
export default function Diagnostic_Dashboard(){
  const [tokensToday, setTokensToday] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [returnedCount, setReturnedCount] = useState(0)
  const [revenueTotal, setRevenueTotal] = useState(0)
  const [revenueCash, setRevenueCash] = useState(0)
  const [revenueCorporateCopay, setRevenueCorporateCopay] = useState(0)
  const [recentSales, setRecentSales] = useState<any[]>([])
  const [weeklyLabels, setWeeklyLabels] = useState<string[]>([])
  const [weeklyTotals, setWeeklyTotals] = useState<number[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  // Global filters
  const [shifts, setShifts] = useState<Array<{ id: string; name: string; start: string; end: string }>>([])
  const [filterShiftId, setFilterShiftId] = useState('')
  const [fromTime, setFromTime] = useState('')
  const [toTime, setToTime] = useState('')

  const todayStr = useMemo(()=>{
    const d = new Date(); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`
  }, [])

  const effFrom = from || todayStr
  const effTo = to || todayStr
  const isFiltered = !!(from || to || fromTime || toTime || filterShiftId)

  function getShiftWindow(dateStr: string, sh?: { start: string; end: string }){
    try{
      if (!sh) return null
      const [y,m,d] = (dateStr||'').split('-').map(n=>parseInt(n||'0',10))
      const [shh,smm] = String(sh.start||'00:00').split(':').map(n=>parseInt(n||'0',10))
      const [ehh,emm] = String(sh.end||'00:00').split(':').map(n=>parseInt(n||'0',10))
      const start = new Date(y, (m-1), d, shh||0, smm||0, 0)
      let end = new Date(y, (m-1), d, ehh||0, emm||0, 0)
      if (end <= start) end = new Date(end.getTime() + 24*60*60*1000)
      return { start, end }
    } catch { return null }
  }

  // Effective window: time overrides; if single-day + shift, use shift window
  const effectiveWindow = useMemo(()=>{
    try{
      if (fromTime && toTime){
        return { from: `${effFrom}T${fromTime}:00`, to: `${effTo}T${toTime}:59` }
      }
      if (filterShiftId && effFrom===effTo){
        const sh = shifts.find(s=>s.id===filterShiftId)
        const win = getShiftWindow(effFrom, sh)
        if (win){
          const f = new Date(win.start.getTime() - (win.start.getTimezoneOffset()*60000)).toISOString().slice(0,19)
          const t = new Date(win.end.getTime() - (win.end.getTimezoneOffset()*60000)).toISOString().slice(0,19)
          return { from: f, to: t }
        }
      }
    } catch {}
    return { from: effFrom, to: effTo }
  }, [effFrom, effTo, fromTime, toTime, filterShiftId, shifts])

  

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const [rangeOrders, weeklyOrders] = await Promise.all([
          diagnosticApi.listOrders({ from: effectiveWindow.from, to: effectiveWindow.to, page: 1, limit: 500 }) as any,
          diagnosticApi.listOrders({ from: effectiveWindow.from, to: effectiveWindow.to, page: 1, limit: 1000 }) as any,
        ])
        if (!mounted) return
        setTokensToday(Number(rangeOrders?.total || (rangeOrders?.items||[]).length || 0))
        let rev = 0, revCash = 0, revCorp = 0, pending = 0, completed = 0, returned = 0
        const ordersArr = Array.isArray(rangeOrders?.items) ? rangeOrders.items : []
        for (const o of ordersArr){
          const net = Number(o?.net || 0)
          rev += net
          const isCorp = Boolean(o?.corporateId) || String(o?.billingType||'') === 'corporate'
          if (isCorp) revCorp += net
          else revCash += net
          const items = Array.isArray(o?.items) ? o.items : []
          for (const it of items){
            if (it?.status === 'completed') completed++
            else if (it?.status === 'returned') returned++
            else pending++
          }
        }
        setRevenueTotal(rev)
        setRevenueCash(revCash)
        setRevenueCorporateCopay(revCorp)
        setPendingCount(pending)
        setCompletedCount(completed)
        setReturnedCount(returned)

        // Recent Sales (latest 5 by createdAt desc if available order already sorted)
        const weeklyArr = Array.isArray(weeklyOrders?.items) ? weeklyOrders.items : []
        const sorted = [...weeklyArr].sort((a:any,b:any)=> new Date(b?.createdAt||0).getTime() - new Date(a?.createdAt||0).getTime())
        setRecentSales(sorted.slice(0,5))

        // Weekly Sales aggregation (within selected window)
        const makeWeekStart = (d: Date)=>{
          const dd = new Date(d); const day = dd.getDay(); // 0=Sun
          dd.setDate(dd.getDate() - day) // week starts Sunday
          dd.setHours(0,0,0,0)
          return dd
        }
        const startSel = new Date(effectiveWindow.from)
        const endSel = new Date(effectiveWindow.to)
        const buckets: { label: string; start: Date; total: number }[] = []
        // Build buckets from start to end stepping weekly
        let cur = makeWeekStart(startSel)
        while (cur <= endSel){
          const start = new Date(cur)
          const month = start.toLocaleString(undefined, { month: 'short' })
          const label = `Wk ${month} ${String(start.getDate()).padStart(2,'0')}`
          buckets.push({ label, start, total: 0 })
          cur = new Date(start); cur.setDate(cur.getDate() + 7)
        }
        for (const o of weeklyArr){
          const dt = o?.createdAt ? new Date(o.createdAt) : null
          if (!dt) continue
          const w = makeWeekStart(dt)
          // find bucket matching same week start date
          for (const b of buckets){
            if (b.start.getFullYear()===w.getFullYear() && b.start.getMonth()===w.getMonth() && b.start.getDate()===w.getDate()){
              b.total += Number(o?.net||0)
              break
            }
          }
        }
        setWeeklyLabels(buckets.map(b=> b.label))
        setWeeklyTotals(buckets.map(b=> b.total))
      } catch {
        if (!mounted) return
        setTokensToday(0); setRevenueTotal(0); setRevenueCash(0); setRevenueCorporateCopay(0); setPendingCount(0); setCompletedCount(0); setReturnedCount(0); setRecentSales([]); setWeeklyLabels([]); setWeeklyTotals([])
      }
    })()
    return ()=>{ mounted = false }
  }, [effectiveWindow.from, effectiveWindow.to, todayStr])

  // Load shifts once (use Lab shifts as canonical for diagnostics)
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try{
        const r:any = await labApi.listShifts()
        if (!mounted) return
        const arr = (r?.items || r || []).map((x:any)=> ({ id: String(x._id||x.id), name: x.name, start: x.start, end: x.end }))
        setShifts(arr)
      } catch { setShifts([]) }
      // no shift-wise section; shifts used for global filter
    })()
    return ()=>{ mounted = false }
  }, [todayStr])

  

  const statusTotal = Math.max(0, pendingCount + completedCount + returnedCount)
  const completedPct = statusTotal ? Math.round((completedCount / statusTotal) * 100) : 0
  const pendingPct = statusTotal ? Math.round((pendingCount / statusTotal) * 100) : 0

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-indigo-50/30 to-violet-50/40 p-6 space-y-6">

      {/* ═══════════ HERO BANNER ═══════════ */}
      <div className="relative overflow-hidden rounded-3xl shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #4338ca 50%, #7c3aed 75%, #a855f7 100%)' }}>
        {/* decorative blobs */}
        <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-2xl" />
        <div className="absolute inset-0 opacity-[0.07]">
          <svg width="100%" height="100%"><defs><pattern id="diagDots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#diagDots)"/></svg>
        </div>

        <div className="relative px-6 py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 shadow ring-1 ring-white/20">
                  <FlaskConical className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/50">Diagnostic Center</p>
                  <h1 className="text-2xl font-extrabold leading-tight tracking-tight">Diagnostic Dashboard</h1>
                </div>
              </div>
              <p className="text-sm text-white/60 ml-14">{isFiltered ? 'Showing filtered results' : "Real-time overview for today"}</p>
            </div>

            {/* Revenue highlight */}
            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20 px-5 py-3 text-white shadow-inner">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Total Revenue</p>
                <p className="text-2xl font-extrabold">{money(revenueTotal)}</p>
                <p className="text-[11px] text-emerald-300 mt-0.5">↑ Cash + Corporate</p>
              </div>
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20 px-5 py-3 text-white shadow-inner">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Tokens</p>
                <p className="text-2xl font-extrabold">{tokensToday}</p>
                <p className="text-[11px] text-sky-300 mt-0.5">Today</p>
              </div>
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20 px-5 py-3 text-white shadow-inner">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Completed</p>
                <p className="text-2xl font-extrabold">{completedCount}</p>
                <p className="text-[11px] text-fuchsia-300 mt-0.5">{completedPct}% of items</p>
              </div>
            </div>
          </div>

          {/* Date range bar */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 ring-1 ring-white/15">
              <TrendingUp className="h-3.5 w-3.5" />
              {String(effectiveWindow.from).slice(0,10)} → {String(effectiveWindow.to).slice(0,10)}
            </div>
            {isFiltered && <span className="rounded-full bg-amber-400/20 px-3 py-1 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-400/30">Filtered View</span>}
            <button onClick={()=>window.print()} className="ml-auto flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/20 transition ring-1 ring-white/15">
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════ FILTERS ═══════════ */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Search className="h-4 w-4 text-indigo-500" />
            Filters & Date Range
          </div>
          <button onClick={()=>{ setFrom(''); setTo(''); setFromTime(''); setToTime(''); setFilterShiftId('') }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
            <RefreshCw className="h-3 w-3" /> Reset
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {[
            { label: 'From Date', type: 'date', value: from, set: setFrom },
            { label: 'To Date', type: 'date', value: to, set: setTo },
            { label: 'From Time', type: 'time', value: fromTime, set: setFromTime },
            { label: 'To Time', type: 'time', value: toTime, set: setToTime },
          ].map(f => (
            <div key={f.label} className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{f.label}</label>
              <input type={f.type} value={f.value} onChange={e=> f.set(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition" />
            </div>
          ))}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Shift</label>
            <select value={filterShiftId} onChange={e=> setFilterShiftId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition">
              <option value="">All Shifts</option>
              {shifts.map(s=> <option key={s.id} value={s.id}>{s.name} ({fmt12(s.start)}-{fmt12(s.end)})</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ═══════════ KPI CARDS ═══════════ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Revenue */}
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-lg text-white"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 60%, #34d399 100%)' }}>
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-emerald-100">Total Revenue</p>
              <div className="rounded-xl bg-white/20 p-2"><DollarSign className="h-5 w-5" /></div>
            </div>
            <p className="mt-3 text-3xl font-extrabold">{money(revenueTotal)}</p>
            <p className="mt-1 text-xs text-emerald-100">Cash + Corporate co-pay</p>
          </div>
        </div>

        {/* Cash Revenue */}
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-lg text-white"
          style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 60%, #38bdf8 100%)' }}>
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-sky-100">Cash Revenue</p>
              <div className="rounded-xl bg-white/20 p-2"><Wallet className="h-5 w-5" /></div>
            </div>
            <p className="mt-3 text-3xl font-extrabold">{money(revenueCash)}</p>
            <p className="mt-1 text-xs text-sky-100">Cash tokens only</p>
          </div>
        </div>

        {/* Corporate */}
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-lg text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 60%, #a78bfa 100%)' }}>
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-violet-100">Corporate Co-pay</p>
              <div className="rounded-xl bg-white/20 p-2"><Building2 className="h-5 w-5" /></div>
            </div>
            <p className="mt-3 text-3xl font-extrabold">{money(revenueCorporateCopay)}</p>
            <p className="mt-1 text-xs text-violet-100">Corporate tokens (co-pay)</p>
          </div>
        </div>

        {/* Tokens */}
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-lg text-white"
          style={{ background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 60%, #818cf8 100%)' }}>
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-indigo-100">{isFiltered ? 'Tokens (range)' : "Today's Tokens"}</p>
              <div className="rounded-xl bg-white/20 p-2"><Activity className="h-5 w-5" /></div>
            </div>
            <p className="mt-3 text-3xl font-extrabold">{tokensToday}</p>
            <p className="mt-1 text-xs text-indigo-100">Tokens created</p>
          </div>
        </div>

        {/* Completed */}
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-lg text-white"
          style={{ background: 'linear-gradient(135deg, #15803d 0%, #22c55e 60%, #4ade80 100%)' }}>
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-green-100">Completed</p>
              <div className="rounded-xl bg-white/20 p-2"><CheckCircle className="h-5 w-5" /></div>
            </div>
            <p className="mt-3 text-3xl font-extrabold">{completedCount}</p>
            <p className="mt-1 text-xs text-green-100">{statusTotal ? `${completedPct}% of total` : '—'}</p>
          </div>
        </div>

        {/* Pending */}
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-lg text-white"
          style={{ background: 'linear-gradient(135deg, #b45309 0%, #f59e0b 60%, #fcd34d 100%)' }}>
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-amber-100">Pending</p>
              <div className="rounded-xl bg-white/20 p-2"><Clock className="h-5 w-5" /></div>
            </div>
            <p className="mt-3 text-3xl font-extrabold">{pendingCount}</p>
            <p className="mt-1 text-xs text-amber-100">{statusTotal ? `${pendingPct}% of total` : '—'}</p>
          </div>
        </div>
      </div>

      {/* ═══════════ CHARTS ROW ═══════════ */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Weekly Sales Chart — 2 cols */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-base font-bold text-slate-900">Weekly Revenue Trend</p>
              <p className="text-xs text-slate-500">Net revenue (cash + corporate co-pay) by week</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
              <span className="text-xs text-slate-500">Revenue</span>
            </div>
          </div>
          <WeeklyBars data={weeklyTotals} labels={weeklyLabels} />
        </div>

        {/* Status Doughnut */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm flex flex-col">
          <p className="text-base font-bold text-slate-900 mb-1">Test Status</p>
          <p className="text-xs text-slate-500 mb-5">Item-level breakdown</p>
          <div className="flex flex-1 flex-col items-center justify-center">
            <StatusRing completed={completedCount} pending={pendingCount} returned={returnedCount} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <div className="mx-auto mb-1 h-2 w-8 rounded-full bg-emerald-500" />
              <p className="font-bold text-slate-800">{completedCount}</p>
              <p className="text-slate-500">Done</p>
            </div>
            <div>
              <div className="mx-auto mb-1 h-2 w-8 rounded-full bg-amber-400" />
              <p className="font-bold text-slate-800">{pendingCount}</p>
              <p className="text-slate-500">Pending</p>
            </div>
            <div>
              <div className="mx-auto mb-1 h-2 w-8 rounded-full bg-rose-500" />
              <p className="font-bold text-slate-800">{returnedCount}</p>
              <p className="text-slate-500">Returned</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ ACTIVITY + INFO ═══════════ */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-4 w-4 text-violet-500" />
            <p className="text-base font-bold text-slate-900">Recent Activity</p>
            <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">Last 5</span>
          </div>
          <ul className="space-y-3">
            {recentSales.map((o: any, idx: number) => {
              const isCorp = Boolean(o?.corporateId) || String(o?.billingType||'') === 'corporate'
              const bt: 'cash' | 'corporate' = isCorp ? 'corporate' : 'cash'
              return (
                <li key={String(o?._id || idx)}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-indigo-50/40 transition-colors">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow ${isCorp ? 'bg-violet-100 text-violet-600' : 'bg-sky-100 text-sky-600'}`}>
                    {isCorp ? <Building2 className="h-4 w-4" /> : <Microscope className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">Token {String(o?.tokenNo || '-')}</p>
                      <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${badgeTone(bt)}`}>
                        {bt === 'corporate' ? 'Corporate' : 'Cash'}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{o?.patient?.fullName || '—'} · {formatDate(o?.createdAt)}</p>
                    <p className="text-[11px] text-slate-400">{Array.isArray(o?.items) ? o.items.length : 0} test(s)</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-slate-900">{money(o?.net||0)}</p>
                  </div>
                </li>
              )
            })}
            {recentSales.length === 0 && (
              <li className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Bell className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No recent activity</p>
              </li>
            )}
          </ul>
        </div>

        {/* Revenue Breakdown Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm flex flex-col gap-4">
          <p className="text-base font-bold text-slate-900">Revenue Split</p>
          <div className="space-y-3">
            {[
              { label: 'Cash', value: revenueCash, total: revenueTotal, color: 'bg-sky-500', light: 'bg-sky-100 text-sky-700' },
              { label: 'Corporate', value: revenueCorporateCopay, total: revenueTotal, color: 'bg-violet-500', light: 'bg-violet-100 text-violet-700' },
            ].map(item => {
              const pct = item.total > 0 ? Math.round((item.value / item.total) * 100) : 0
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.light}`}>{item.label}</span>
                    <span className="text-xs font-bold text-slate-700">{pct}% · {money(item.value)}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full transition-all duration-700 ${item.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          <hr className="border-slate-100" />

          <div>
            <p className="text-sm font-bold text-slate-800 mb-3">Status Progress</p>
            <StatusBreakdown pending={pendingCount} completed={completedCount} returned={returnedCount} />
          </div>

          <hr className="border-slate-100" />

          <div className="rounded-xl bg-linear-to-br from-indigo-50 to-violet-50 p-3 text-xs text-slate-600 space-y-1.5 border border-indigo-100">
            <p className="font-semibold text-indigo-700 mb-1.5">Revenue Includes</p>
            <div className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-sky-500" /> Cash diagnostic tokens (100% billed)</div>
            <div className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-violet-500" /> Corporate: patient co-pay portion only</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDate(iso?: string){
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString()
}

const BAR_GRADIENTS = [
  ['#6366f1','#818cf8'],
  ['#8b5cf6','#a78bfa'],
  ['#0ea5e9','#38bdf8'],
  ['#10b981','#34d399'],
  ['#f59e0b','#fcd34d'],
  ['#ef4444','#fca5a5'],
  ['#ec4899','#f9a8d4'],
]

function WeeklyBars({ data, labels }: { data: number[]; labels: string[] }){
  const maxVal = Math.max(0, ...data)
  if (!maxVal) return (
    <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-100 bg-linear-to-br from-slate-50 to-indigo-50/30">
      <p className="text-sm text-slate-400">No revenue data for this period</p>
    </div>
  )

  const ticks = 4
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => Math.round((maxVal * (ticks - i)) / ticks))

  return (
    <div className="rounded-2xl border border-slate-100 bg-linear-to-b from-slate-50/80 to-white p-4">
      <div className="grid grid-cols-[52px_1fr] gap-2">
        <div className="relative h-48">
          <div className="absolute inset-0 flex flex-col justify-between py-1 text-[10px] font-medium text-slate-400">
            {tickVals.map((t, idx) => (
              <div key={idx} className="leading-none text-right pr-2">{t >= 1000 ? `${Math.round(t/1000)}k` : t}</div>
            ))}
          </div>
        </div>
        <div className="relative h-48">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {tickVals.map((_, idx) => (
              <div key={idx} className="h-0 border-t border-dashed border-slate-200/70" />
            ))}
          </div>
          <div className="absolute inset-0 flex items-end gap-2 px-1 pb-1">
            {data.map((v, i) => {
              const h = Math.max(4, Math.round((Number(v || 0) / (maxVal || 1)) * 100))
              const [c1, c2] = BAR_GRADIENTS[i % BAR_GRADIENTS.length]
              return (
                <div key={i} className="group flex-1 flex flex-col items-center justify-end h-full">
                  <div className="relative w-full" style={{ height: `${h}%` }}>
                    <div className="absolute inset-0 rounded-t-xl shadow-md transition-all duration-300 group-hover:brightness-110"
                      style={{ background: `linear-gradient(180deg, ${c1} 0%, ${c2} 100%)` }} />
                    {h > 15 && (
                      <div className="absolute -top-5 left-0 right-0 text-center text-[9px] font-bold text-slate-500">
                        {v >= 1000 ? `${Math.round(v/1000)}k` : v}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-[52px_1fr] gap-2">
        <div />
        <div className="flex items-center gap-2 px-1">
          {labels.map((lb, i) => (
            <div key={i} className="flex-1 text-center text-[10px] font-medium text-slate-500 truncate">{lb}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatusRing({ completed, pending, returned }: { completed: number; pending: number; returned: number }) {
  const total = Math.max(1, completed + pending + returned)
  const cPct = completed / total
  const pPct = pending / total
  const rPct = returned / total
  const R = 54
  const cx = 64; const cy = 64
  const circ = 2 * Math.PI * R
  const cDash = cPct * circ
  const pDash = pPct * circ
  const rDash = rPct * circ
  const cOffset = 0
  const pOffset = -cDash
  const rOffset = -(cDash + pDash)
  if (!total) return <div className="flex h-32 items-center justify-center text-sm text-slate-400">No data</div>
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f1f5f9" strokeWidth="14" />
        {rPct > 0 && <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f43f5e" strokeWidth="14"
          strokeDasharray={`${rDash} ${circ - rDash}`}
          strokeDashoffset={rOffset}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '64px 64px', transition: 'stroke-dasharray 0.7s ease' }} />}
        {pPct > 0 && <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f59e0b" strokeWidth="14"
          strokeDasharray={`${pDash} ${circ - pDash}`}
          strokeDashoffset={pOffset}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '64px 64px', transition: 'stroke-dasharray 0.7s ease' }} />}
        {cPct > 0 && <circle cx={cx} cy={cy} r={R} fill="none" stroke="#10b981" strokeWidth="14"
          strokeDasharray={`${cDash} ${circ - cDash}`}
          strokeDashoffset={cOffset}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '64px 64px', transition: 'stroke-dasharray 0.7s ease' }} />}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-extrabold text-slate-800">{total}</p>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Items</p>
      </div>
    </div>
  )
}

function StatusBreakdown({ pending, completed, returned }: { pending: number; completed: number; returned: number }){
  const total = Math.max(0, pending + completed + returned)
  if (!total) return (<div className="flex h-24 items-center justify-center text-sm text-slate-400">No data available</div>)
  const pPct = Math.max(0, Math.round((pending/total) * 100))
  const cPct = Math.max(0, Math.round((completed/total) * 100))
  const rPct = Math.max(0, 100 - pPct - cPct)
  return (
    <div className="space-y-4">
      <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700">
        <div className="flex h-full w-full">
          <div style={{ width: `${cPct}%` }} className="h-full bg-linear-to-r from-emerald-400 to-emerald-500 transition-all duration-500" />
          <div style={{ width: `${pPct}%` }} className="h-full bg-linear-to-r from-amber-400 to-amber-500 transition-all duration-500" />
          <div style={{ width: `${rPct}%` }} className="h-full bg-linear-to-r from-rose-400 to-rose-500 transition-all duration-500" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-emerald-100/50 p-3 dark:border-emerald-800 dark:from-emerald-900/20 dark:to-emerald-900/10">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Completed</span>
          </div>
          <div className="mt-1.5 text-xl font-bold text-emerald-800 dark:text-emerald-300">{completed}</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400">{cPct}% of total</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-linear-to-br from-amber-50 to-amber-100/50 p-3 dark:border-amber-800 dark:from-amber-900/20 dark:to-amber-900/10">
          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Pending</span>
          </div>
          <div className="mt-1.5 text-xl font-bold text-amber-800 dark:text-amber-300">{pending}</div>
          <div className="text-xs text-amber-600 dark:text-amber-400">{pPct}% of total</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-linear-to-br from-rose-50 to-rose-100/50 p-3 dark:border-rose-800 dark:from-rose-900/20 dark:to-rose-900/10">
          <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Returned</span>
          </div>
          <div className="mt-1.5 text-xl font-bold text-rose-800 dark:text-rose-300">{returned}</div>
          <div className="text-xs text-rose-600 dark:text-rose-400">{rPct}% of total</div>
        </div>
      </div>
    </div>
  )
}
