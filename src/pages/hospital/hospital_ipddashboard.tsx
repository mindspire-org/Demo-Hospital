import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Users, BedDouble, BedSingle, Activity, TrendingUp, CalendarDays, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react'

const PIE_COLORS = ['#6366f1', '#e2e8f0']

interface WeeklyPoint { day: string; admissions: number }
interface MonthlyPoint { month: string; admitted: number; discharged: number }
interface RecentAdmission { id: string; patientName: string; department: string; bed: string; since: string }

export default function Hospital_IPDDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalBeds, setTotalBeds] = useState(0)
  const [occupiedBeds, setOccupiedBeds] = useState(0)
  const [totalAdmitted, setTotalAdmitted] = useState(0)
  const [totalDischarged, setTotalDischarged] = useState(0)
  const [weeklyData, setWeeklyData] = useState<WeeklyPoint[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyPoint[]>([])
  const [recentAdmissions, setRecentAdmissions] = useState<RecentAdmission[]>([])
  const [prevAdmitted, setPrevAdmitted] = useState(0)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setError(null)
    try {
      const [allBedsRes, occBedsRes] = await Promise.all([
        hospitalApi.listBeds() as any,
        hospitalApi.listBeds({ status: 'occupied' }) as any,
      ])
      const allBeds = allBedsRes?.beds || []
      const occBeds = occBedsRes?.beds || []
      setTotalBeds(allBeds.length)
      setOccupiedBeds(occBeds.length)

      // Currently admitted
      const admittedRes = await hospitalApi.listIPDAdmissions({ status: 'admitted', limit: 1000 }) as any
      const admittedList = admittedRes?.admissions || []
      setTotalAdmitted(admittedList.length)

      // Discharged (last 30 days)
      const now = new Date()
      const thirtyAgo = new Date(now); thirtyAgo.setDate(now.getDate() - 30); thirtyAgo.setHours(0,0,0,0)
      const dischargedRes = await hospitalApi.listIPDAdmissions({ status: 'discharged', from: thirtyAgo.toISOString().slice(0,10), to: now.toISOString().slice(0,10), limit: 1000 }) as any
      setTotalDischarged((dischargedRes?.admissions || []).length)

      // Previous period admitted count for trend
      const prevStart = new Date(thirtyAgo); prevStart.setDate(prevStart.getDate() - 30)
      const prevRes = await hospitalApi.listIPDAdmissions({ status: 'admitted', from: prevStart.toISOString().slice(0,10), to: thirtyAgo.toISOString().slice(0,10), limit: 1000 }) as any
      setPrevAdmitted((prevRes?.admissions || []).length)

      // Weekly admissions (Sun..Sat)
      const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0,0,0,0)
      const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6); endOfWeek.setHours(23,59,59,999)
      const weekRes = await hospitalApi.listIPDAdmissions({ from: startOfWeek.toISOString().slice(0,10), to: endOfWeek.toISOString().slice(0,10), limit: 1000 }) as any
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
      const counts = Array(7).fill(0) as number[]
      for (const a of (weekRes?.admissions || [])) { const d = new Date(a.startAt); counts[d.getDay()]++ }
      setWeeklyData(days.map((d, i) => ({ day: d, admissions: counts[i] })))

      // Monthly data (last 6 months)
      const months: MonthlyPoint[] = []
      for (let m = 5; m >= 0; m--) {
        const mStart = new Date(now.getFullYear(), now.getMonth() - m, 1)
        const mEnd = new Date(now.getFullYear(), now.getMonth() - m + 1, 0, 23, 59, 59, 999)
        const mLabel = mStart.toLocaleString('default', { month: 'short' })
        const [admRes, disRes] = await Promise.all([
          hospitalApi.listIPDAdmissions({ from: mStart.toISOString().slice(0,10), to: mEnd.toISOString().slice(0,10), limit: 1000 }) as any,
          hospitalApi.listIPDAdmissions({ status: 'discharged', from: mStart.toISOString().slice(0,10), to: mEnd.toISOString().slice(0,10), limit: 1000 }) as any,
        ])
        months.push({ month: mLabel, admitted: (admRes?.admissions || []).length, discharged: (disRes?.admissions || []).length })
      }
      setMonthlyData(months)

      // Recent admissions (latest 5)
      const recent = admittedList.slice(0, 5).map((a: any) => ({
        id: String(a._id || ''),
        patientName: a.patient?.name || a.patientName || '-',
        department: a.department?.name || a.departmentName || '-',
        bed: a.bed?.label || a.bedLabel || '-',
        since: a.startAt ? new Date(a.startAt).toLocaleDateString() : '-',
      }))
      setRecentAdmissions(recent)

    } catch (e: any) {
      setError(e?.message || 'Failed to load dashboard')
    } finally { setLoading(false) }
  }

  const availableBeds = Math.max(0, totalBeds - occupiedBeds)
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
  const admittedTrend = prevAdmitted > 0 ? Math.round(((totalAdmitted - prevAdmitted) / prevAdmitted) * 100) : 0

  const pieData = [
    { name: 'Occupied', value: occupiedBeds },
    { name: 'Available', value: availableBeds },
  ]

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-indigo-600 via-blue-600 to-violet-600 p-8 text-white shadow-xl shadow-indigo-500/20">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/5 blur-xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">In-Patient Department</h1>
            <p className="mt-2 text-sm font-medium text-indigo-100">Real-time overview of admissions, bed occupancy & discharge trends</p>
          </div>
          <button onClick={load} className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold backdrop-blur-sm transition hover:bg-white/25 flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm">{error}</div>}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Admitted Patients" value={totalAdmitted} subtitle="Currently in IPD" trend={admittedTrend} color="indigo" />
        <StatCard icon={BedDouble} label="Occupied Beds" value={occupiedBeds} subtitle={`out of ${totalBeds} total`} color="sky" />
        <StatCard icon={BedSingle} label="Available Beds" value={availableBeds} subtitle="Ready for admission" color="emerald" />
        <StatCard icon={Activity} label="Occupancy Rate" value={`${occupancyRate}%`} subtitle="Bed utilization" color={occupancyRate > 85 ? 'rose' : 'violet'} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Weekly Admissions Area Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><TrendingUp className="h-4 w-4" /></div>
              <h3 className="text-sm font-bold text-slate-900">Weekly Admissions</h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">THIS WEEK</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={weeklyData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradIndigo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              <Area type="monotone" dataKey="admissions" stroke="#6366f1" strokeWidth={3} fill="url(#gradIndigo)" dot={{ r: 5, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bed Occupancy Donut */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><BedDouble className="h-4 w-4" /></div>
            <h3 className="text-sm font-bold text-slate-900">Bed Occupancy</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" strokeWidth={0}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 text-center">
            <span className="text-3xl font-black text-slate-900">{occupancyRate}%</span>
            <span className="ml-1 text-xs font-semibold text-slate-400">occupied</span>
          </div>
        </div>
      </div>

      {/* Monthly Admissions & Discharges Bar Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600"><CalendarDays className="h-4 w-4" /></div>
            <h3 className="text-sm font-bold text-slate-900">Monthly Admissions vs Discharges</h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">LAST 6 MONTHS</span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
            <Bar dataKey="admitted" fill="#6366f1" radius={[6, 6, 0, 0]} name="Admitted" />
            <Bar dataKey="discharged" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Discharged" />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Admissions & Quick Stats */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Recent Admissions Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Users className="h-4 w-4" /></div>
            <h3 className="text-sm font-bold text-slate-900">Recent Admissions</h3>
          </div>
          {recentAdmissions.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No recent admissions</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pr-4">Patient</th>
                    <th className="pb-3 pr-4">Department</th>
                    <th className="pb-3 pr-4">Bed</th>
                    <th className="pb-3">Since</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentAdmissions.map(r => (
                    <tr key={r.id} className="group hover:bg-slate-50/50 transition">
                      <td className="py-3 pr-4 font-semibold text-slate-800">{r.patientName}</td>
                      <td className="py-3 pr-4 text-slate-600">{r.department}</td>
                      <td className="py-3 pr-4"><span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600">{r.bed}</span></td>
                      <td className="py-3 text-slate-500">{r.since}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Stats Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-900">Quick Stats</h3>
          <div className="space-y-4">
            <QuickStat label="Discharged (30d)" value={totalDischarged} color="cyan" />
            <QuickStat label="Occupancy" value={`${occupancyRate}%`} color={occupancyRate > 85 ? 'rose' : 'emerald'} />
            <QuickStat label="Available Beds" value={availableBeds} color="emerald" />
            <QuickStat label="Total Beds" value={totalBeds} color="indigo" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Stat Card ─────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, subtitle, trend, color }: {
  icon: any; label: string; value: string | number; subtitle: string; trend?: number; color: string
}) {
  const iconBg: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-600',
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-slate-100 opacity-40" />
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg[color] || 'bg-slate-50 text-slate-600'}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-3 text-2xl font-black text-slate-900">{value}</div>
      <div className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="text-xs text-slate-500">{subtitle}</div>
    </div>
  )
}

/* ── Quick Stat Row ────────────────────────────────── */
function QuickStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  const dotMap: Record<string, string> = {
    indigo: 'bg-indigo-500', sky: 'bg-sky-500', emerald: 'bg-emerald-500', rose: 'bg-rose-500', cyan: 'bg-cyan-500', violet: 'bg-violet-500',
  }
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className={`h-2.5 w-2.5 rounded-full ${dotMap[color] || 'bg-slate-400'}`} />
        <span className="text-sm font-semibold text-slate-600">{label}</span>
      </div>
      <span className="text-lg font-black text-slate-900">{value}</span>
    </div>
  )
}
