import { useEffect, useMemo, useState } from 'react'
import {
  RefreshCw, Users, Bed, TrendingDown, Clock, Wallet, AlertTriangle,
  CalendarDays, CreditCard, Activity
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { hospitalApi, ipdApi } from '../../utils/api'

function money(n: any){ const v = Number(n||0); return `PKR ${Math.round(v).toLocaleString()}` }
function fmt(iso?: string){ if(!iso)return '-'; const d=new Date(iso); if(isNaN(d.getTime()))return '-'; return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}` }
function today(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function monthStart(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` }
const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16']

export default function Hospital_IPDDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(today())

  const [totalBeds, setTotalBeds] = useState(0)
  const [occupiedBeds, setOccupiedBeds] = useState(0)
  const [totalAdmitted, setTotalAdmitted] = useState(0)
  const [totalDischarged, setTotalDischarged] = useState(0)
  const [avgStayDays, setAvgStayDays] = useState(0)

  const [totalBilled, setTotalBilled] = useState(0)
  const [totalPaid, setTotalPaid] = useState(0)
  const [totalOutstanding, setTotalOutstanding] = useState(0)

  const [admissionsTrend, setAdmissionsTrend] = useState<any[]>([])
  const [wardData, setWardData] = useState<any[]>([])
  const [deptData, setDeptData] = useState<any[]>([])
  const [weeklyBars, setWeeklyBars] = useState<any[]>([])
  const [financeTrend, setFinanceTrend] = useState<any[]>([])
  const [recentAdmissions, setRecentAdmissions] = useState<any[]>([])

  useEffect(() => { load() }, [from, to])

  async function load() {
    setLoading(true); setError(null)
    try {
      const [allBedsRes, occBedsRes, admittedRes, dischargedRes] = await Promise.all([
        hospitalApi.listBeds() as any,
        hospitalApi.listBeds({ status: 'occupied' }) as any,
        ipdApi.listIPDAdmissions({ status: 'admitted', limit: 1000 }) as any,
        ipdApi.listIPDAdmissions({ status: 'discharged', from, to, limit: 1000 }) as any,
      ])
      const allBeds = allBedsRes?.beds || []
      const occBeds = occBedsRes?.beds || []
      const admissions = admittedRes?.admissions || []
      const discharges = dischargedRes?.admissions || []
      setTotalBeds(allBeds.length)
      setOccupiedBeds(occBeds.length)
      setTotalAdmitted(admissions.length)
      setTotalDischarged(discharges.length)

      let totalDays = 0, stayCount = 0
      for (const a of discharges) {
        const s = a.startAt ? new Date(a.startAt) : null
        const e = a.endAt ? new Date(a.endAt) : null
        if (s && e && !isNaN(s.getTime()) && !isNaN(e.getTime())) {
          totalDays += Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000))
          stayCount++
        }
      }
      setAvgStayDays(stayCount > 0 ? Math.round(totalDays / stayCount) : 0)

      const wardsRes: any = await hospitalApi.listWards()
      const wards = (wardsRes?.wards || wardsRes || []).map((w: any) => ({ id: String(w._id || w.id), name: w.name }))
      const wardMap = new Map<string, { name: string; occupied: number; available: number }>()
      for (const w of wards) wardMap.set(w.id, { name: w.name, occupied: 0, available: 0 })
      for (const b of allBeds) {
        const wid = String(b.wardId || b.locationId || '')
        const w = wardMap.get(wid)
        if (w) { if (b.status === 'occupied') w.occupied++; else w.available++; }
      }
      setWardData(Array.from(wardMap.values()).filter(w => w.occupied + w.available > 0))

      const rangeRes: any = await ipdApi.listIPDAdmissions({ from, to, limit: 5000 })
      const rangeAdmissions = rangeRes?.admissions || []

      const dateMap = new Map<string, { admissions: number; discharges: number }>()
      const start = new Date(from); start.setHours(0, 0, 0, 0)
      const end = new Date(to); end.setHours(0, 0, 0, 0)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        dateMap.set(k, { admissions: 0, discharges: 0 })
      }
      for (const a of rangeAdmissions) { const d = a.startAt ? a.startAt.slice(0, 10) : null; if (d && dateMap.has(d)) dateMap.get(d)!.admissions++ }
      for (const a of discharges) { const d = a.endAt ? a.endAt.slice(0, 10) : null; if (d && dateMap.has(d)) dateMap.get(d)!.discharges++ }
      setAdmissionsTrend(Array.from(dateMap.entries()).map(([date, v]) => ({ date: fmt(date), admissions: v.admissions, discharges: v.discharges })))

      const bars: any[] = []
      const now = new Date()
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i)
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        bars.push({ day: d.toLocaleDateString(undefined, { weekday: 'short' }), value: rangeAdmissions.filter((a: any) => a.startAt && a.startAt.startsWith(iso)).length })
      }
      setWeeklyBars(bars)

      const deptMap = new Map<string, number>()
      for (const a of rangeAdmissions) { const name = a.department?.name || a.departmentName || 'Unspecified'; deptMap.set(name, (deptMap.get(name) || 0) + 1) }
      setDeptData(Array.from(deptMap.entries()).map(([name, count]) => ({ name, count })).sort((a: any, b: any) => b.count - a.count).slice(0, 6))

      setRecentAdmissions(admissions.slice(0, 8))

      let billed = 0, paid = 0
      const finMap = new Map<string, { billed: number; paid: number }>()
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) { const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; finMap.set(k, { billed: 0, paid: 0 }) }
      const seen = new Set<string>()
      for (const a of [...rangeAdmissions, ...discharges]) {
        const id = String(a._id || a.id || ''); if (!id || seen.has(id)) continue; seen.add(id)
        try {
          const s: any = await ipdApi.ipdBillingSummary(id)
          const bt = Number(s?.totalBill || s?.total || 0), pt = Number(s?.totalPaid || s?.paid || 0)
          billed += bt; paid += pt
          const d = (a.startAt || a.createdAt || '').slice(0, 10)
          if (d && finMap.has(d)) { const f = finMap.get(d)!; f.billed += bt; f.paid += pt; }
        } catch {}
      }
      setTotalBilled(billed); setTotalPaid(paid); setTotalOutstanding(Math.max(0, billed - paid))
      setFinanceTrend(Array.from(finMap.entries()).map(([date, v]) => ({ date: fmt(date), billed: Math.round(v.billed / 1000), paid: Math.round(v.paid / 1000) })))
    } catch (e: any) {
      setError(e?.message || 'Failed to load dashboard')
    } finally { setLoading(false) }
  }

  const availableBeds = Math.max(0, totalBeds - occupiedBeds)
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
  const maxWeekly = Math.max(1, ...weeklyBars.map(w => w.value))

  const kpiCards = useMemo(() => [
    { title: 'Admitted Patients', value: String(totalAdmitted), hint: 'Currently in hospital', bg: 'bg-linear-to-br from-blue-50 to-indigo-50 border-blue-200', icon: Users, iconBg: 'bg-blue-100 text-blue-600' },
    { title: 'Occupancy Rate', value: `${occupancyRate}%`, hint: `${occupiedBeds} of ${totalBeds} beds`, bg: 'bg-linear-to-br from-emerald-50 to-teal-50 border-emerald-200', icon: Bed, iconBg: 'bg-emerald-100 text-emerald-600' },
    { title: 'Discharged', value: String(totalDischarged), hint: 'In selected range', bg: 'bg-linear-to-br from-violet-50 to-purple-50 border-violet-200', icon: TrendingDown, iconBg: 'bg-violet-100 text-violet-600' },
    { title: 'Avg Length of Stay', value: `${avgStayDays}d`, hint: 'Per discharge', bg: 'bg-linear-to-br from-amber-50 to-orange-50 border-amber-200', icon: Clock, iconBg: 'bg-amber-100 text-amber-600' },
    { title: 'Total Billed', value: money(totalBilled), hint: 'In selected range', bg: 'bg-linear-to-br from-rose-50 to-pink-50 border-rose-200', icon: Wallet, iconBg: 'bg-rose-100 text-rose-600' },
    { title: 'Outstanding', value: money(totalOutstanding), hint: 'Unpaid balance', bg: 'bg-linear-to-br from-slate-50 to-gray-50 border-slate-200', icon: AlertTriangle, iconBg: 'bg-slate-100 text-slate-600' },
  ], [totalAdmitted, occupancyRate, occupiedBeds, totalBeds, totalDischarged, avgStayDays, totalBilled, totalOutstanding])

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-slate-800 via-indigo-900 to-slate-800 p-6 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%"><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/></pattern></defs><rect width="100%" height="100%" fill="url(#grid)"/></svg>
        </div>
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">In-Patient Department Dashboard</h1>
            <p className="mt-1 text-sm text-slate-300">Complete IPD analytics, bed occupancy, finance & patient tracking</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => load()} disabled={loading} className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20 disabled:opacity-50 backdrop-blur-sm transition-colors">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Date Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><CalendarDays className="h-4 w-4 text-slate-400" /> Date Range</div>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
          <span className="text-sm text-slate-400">to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
          <button onClick={() => { setFrom(monthStart()); setTo(today()) }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 transition-colors">This Month</button>
          <button onClick={() => { const d = new Date(); d.setDate(d.getDate() - 6); setFrom(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`); setTo(today()) }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 transition-colors">Last 7 Days</button>
        </div>
      </div>

      {error && (<div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm">{error}</div>)}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map(({ title, value, hint, bg, icon: Icon, iconBg }) => (
          <div key={title} className={`rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow duration-200 ${bg}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-500">{title}</div>
                <div className="mt-2 text-2xl font-bold text-slate-800 truncate">{value}</div>
                <div className="mt-1 text-[11px] text-slate-500">{hint}</div>
              </div>
              <div className={`rounded-lg p-2 shrink-0 ${iconBg}`}><Icon className="h-4 w-4" /></div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1: Admissions + Finance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-base font-semibold text-slate-800">Admissions vs Discharges</div>
              <div className="text-xs text-slate-500">Daily trend for selected range</div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Admissions</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Discharges</span>
            </div>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={admissionsTrend}>
                <defs>
                  <linearGradient id="admGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                  <linearGradient id="disGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Area type="monotone" dataKey="admissions" stroke="#3b82f6" strokeWidth={2} fill="url(#admGrad)" dot={{ r: 3 }} />
                <Area type="monotone" dataKey="discharges" stroke="#10b981" strokeWidth={2} fill="url(#disGrad)" dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-base font-semibold text-slate-800">IPD Finance Trend</div>
              <div className="text-xs text-slate-500">Billed vs Paid (PKR thousands)</div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Billed</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Paid</span>
            </div>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="billed" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="paid" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Weekly + Finance + Dept + Ward */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-base font-semibold text-slate-800 mb-1">Weekly Admissions</div>
          <div className="text-xs text-slate-500 mb-4">Last 7 days</div>
          <div className="grid grid-cols-7 items-end gap-2" style={{ height: 160 }}>
            {weeklyBars.map((w, i) => (
              <div key={i} className="flex h-full flex-col items-center justify-end gap-1.5">
                <div className="w-full rounded-md bg-linear-to-t from-blue-500 to-indigo-400 transition-all duration-500" style={{ height: `${(w.value / maxWeekly) * 100}%` }} />
                <div className="text-[10px] text-slate-500">{w.day}</div>
                {w.value > 0 && <div className="text-[10px] font-semibold text-blue-600">{w.value}</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-base font-semibold text-slate-800 mb-1">Finance Summary</div>
          <div className="text-xs text-slate-500 mb-4">Range totals</div>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-rose-50 p-3 border border-rose-100">
              <div className="flex items-center gap-2"><div className="rounded-lg bg-rose-100 p-1.5"><Wallet className="h-4 w-4 text-rose-600" /></div><span className="text-sm font-medium text-slate-700">Total Billed</span></div>
              <span className="text-sm font-bold text-rose-700">{money(totalBilled)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3 border border-emerald-100">
              <div className="flex items-center gap-2"><div className="rounded-lg bg-emerald-100 p-1.5"><CreditCard className="h-4 w-4 text-emerald-600" /></div><span className="text-sm font-medium text-slate-700">Total Paid</span></div>
              <span className="text-sm font-bold text-emerald-700">{money(totalPaid)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-amber-50 p-3 border border-amber-100">
              <div className="flex items-center gap-2"><div className="rounded-lg bg-amber-100 p-1.5"><Activity className="h-4 w-4 text-amber-600" /></div><span className="text-sm font-medium text-slate-700">Outstanding</span></div>
              <span className="text-sm font-bold text-amber-700">{money(totalOutstanding)}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0}%` }} /></div>
            <div className="text-center text-xs text-slate-500">{totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0}% collected</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-base font-semibold text-slate-800 mb-1">Departments</div>
          <div className="text-xs text-slate-500 mb-4">Admissions by department</div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={deptData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="count">
                  {deptData.map((_:any, i:number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend verticalAlign="bottom" height={30} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-base font-semibold text-slate-800 mb-1">Bed Utilization</div>
          <div className="text-xs text-slate-500 mb-4">Occupied vs Available</div>
          <div className="space-y-3">
            {wardData.slice(0, 6).map((w, i) => {
              const total = w.occupied + w.available
              const pct = total > 0 ? Math.round((w.occupied / total) * 100) : 0
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">{w.name}</span>
                    <span className="text-slate-500">{w.occupied}/{total} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {wardData.length === 0 && <div className="text-sm text-slate-400 py-8 text-center">No ward data</div>}
          </div>
        </div>
      </div>

      {/* Recent Admissions Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-base font-semibold text-slate-800">Currently Admitted Patients</div>
            <div className="text-xs text-slate-500">Most recent admissions</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2.5 px-3 font-medium text-slate-500">Patient</th>
                <th className="text-left py-2.5 px-3 font-medium text-slate-500">MR#</th>
                <th className="text-left py-2.5 px-3 font-medium text-slate-500">Department</th>
                <th className="text-left py-2.5 px-3 font-medium text-slate-500">Doctor</th>
                <th className="text-left py-2.5 px-3 font-medium text-slate-500">Bed</th>
                <th className="text-left py-2.5 px-3 font-medium text-slate-500">Admitted On</th>
                <th className="text-left py-2.5 px-3 font-medium text-slate-500">Days</th>
              </tr>
            </thead>
            <tbody>
              {recentAdmissions.map((a, i) => {
                const start = a.startAt ? new Date(a.startAt) : null
                const days = start && !isNaN(start.getTime()) ? Math.max(1, Math.round((Date.now() - start.getTime()) / 86400000)) : '-'
                return (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-slate-800">{a.patient?.name || a.patientName || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-600">{a.patient?.mrNumber || a.mrNumber || '-'}</td>
                    <td className="py-2.5 px-3"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{a.department?.name || a.departmentName || '-'}</span></td>
                    <td className="py-2.5 px-3 text-slate-600">{a.doctor?.name || a.doctorName || '-'}</td>
                    <td className="py-2.5 px-3"><span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{a.bed?.label || a.bedLabel || '-'}</span></td>
                    <td className="py-2.5 px-3 text-slate-600">{fmt(a.startAt)}</td>
                    <td className="py-2.5 px-3 text-slate-600">{days}d</td>
                  </tr>
                )
              })}
              {recentAdmissions.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-400">No admitted patients</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
