import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import {
  Users,
  CalendarCheck2,
  CalendarX2,
  CalendarRange,
  Wallet,
  Clock,
  RefreshCw,
  PieChart as PieChartIcon,
  BarChart3 as BarChartIcon,
  Filter,
  RotateCcw,
  TrendingUp,
  Users2
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'

function fmt(n?: number){ return (Number(n||0)).toLocaleString() }
function iso(d: Date){ return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function startOfMonth(d: Date){ const x = new Date(d); x.setDate(1); return x }

export default function Hospital_StaffDashboard(){
  const [loading, setLoading] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string>('—')
  const [staff, setStaff] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [att, setAtt] = useState<any[]>([])
  const [fromDate, setFromDate] = useState<string>(iso(startOfMonth(new Date())))
  const [toDate, setToDate] = useState<string>(iso(new Date()))
  const [selectedShiftId, setSelectedShiftId] = useState<string>('')
  const [live] = useState<boolean>(true)
  const [refreshMs] = useState<number>(15000)
  const [tick, setTick] = useState<number>(0)
  const [earningsSum, setEarningsSum] = useState<number>(0)

  useEffect(()=>{ loadMeta() }, [])
  useEffect(()=>{ reloadAttendance(); reloadEarnings() }, [fromDate, toDate, selectedShiftId])

  async function loadMeta(){
    setLoading(true)
    try{
      const [staffH, shiftsH] = await Promise.all([
        hospitalApi.listStaff() as any,
        hospitalApi.listShifts() as any,
      ])
      const staffListH: any[] = (staffH?.staff || staffH?.items || staffH || [])
      const shiftsListH: any[] = (shiftsH?.items || shiftsH?.shifts || shiftsH || [])
      setStaff(staffListH as any[])
      setShifts(shiftsListH as any[])
      setUpdatedAt(new Date().toLocaleString())
    } finally { setLoading(false) }
  }

  async function reloadEarnings(){
    try{
      const res: any = await (hospitalApi as any).listStaffEarnings({ from: fromDate, to: toDate, limit: 5000 })
      const sum = ((res?.items)||[]).reduce((s:number,n:any)=> s + Number(n?.amount||0), 0)
      setEarningsSum(sum)
    } catch { setEarningsSum(0) }
  }

  async function reloadAttendance(){
    setLoading(true)
    try{
      const attRes = await hospitalApi.listAttendance({ from: fromDate, to: toDate, shiftId: selectedShiftId || undefined, limit: 5000 }) as any
      const arr = (attRes?.items || attRes || []) as any[]
      setAtt(arr)
      setUpdatedAt(new Date().toLocaleString())
    } finally { setLoading(false) }
  }

  useEffect(()=>{
    if (!live) return
    const id = setInterval(async ()=>{
      await reloadAttendance()
      setTick(t => t + 1)
    }, Math.max(3000, refreshMs))
    return () => clearInterval(id)
  }, [live, refreshMs, fromDate, toDate, selectedShiftId])

  useEffect(()=>{
    if (!live) return
    if (tick > 0 && tick % 4 === 0) {
      loadMeta()
    }
  }, [tick, live])

  useEffect(()=>{
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        reloadAttendance()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const endIso = toDate
  const activeStaff = useMemo(()=> staff.filter(s=> s.active!==false), [staff])
  const staffById = useMemo(()=> {
    const m: Record<string, any> = {}
    activeStaff.forEach(s=>{ m[String(s._id||s.id)] = s })
    return m
  }, [activeStaff])
  const attFiltered = useMemo(()=> att, [att])
  const presentToday = useMemo(()=> attFiltered.filter((a:any)=> a.date===endIso && a.status==='present').length, [attFiltered, endIso])
  const absentToday = useMemo(()=> attFiltered.filter((a:any)=> a.date===endIso && a.status==='absent').length, [attFiltered, endIso])
  const leaveToday = useMemo(()=> attFiltered.filter((a:any)=> a.date===endIso && a.status==='leave').length, [attFiltered, endIso])
  const payrollMonthly = useMemo(()=> activeStaff.reduce((s,n)=> s + (Number(n.salary)||0), 0), [activeStaff])

  const roles = useMemo(()=>{
    const map: Record<string,number> = {}
    activeStaff.forEach(s=>{ const r = (s.role||'other'); map[r] = (map[r]||0)+1 })
    return map
  }, [activeStaff])
  const roleLabels = Object.keys(roles)
  const roleValues = roleLabels.map(k=> roles[k])

  // Late Today logic
  const shiftById = useMemo(()=>{
    const m: Record<string, any> = {}
    shifts.forEach((sh:any)=>{ m[String(sh._id||sh.id)] = sh })
    return m
  }, [shifts])
  function timeToMin(t?: string){ if(!t) return null; const [h,m] = String(t).split(':').map(x=>parseInt(x||'0')); return isFinite(h) ? (h*60 + (m||0)) : null }
  const lateToday = useMemo(()=>{
    let c = 0
    for (const a of attFiltered){
      if (a.date!==endIso || a.status!=='present' || !a.clockIn) continue
      const sid = String(a.shiftId || staffById[a.staffId]?.shiftId || '')
      const sh = shiftById[sid]
      const start = timeToMin(sh?.start)
      const inMin = timeToMin(a.clockIn)
      if (start!=null && inMin!=null && inMin > start) c++
    }
    return c
  }, [attFiltered, endIso, staffById, shiftById])

  const rangeDays = useMemo(()=>{
    const days: string[] = []
    const start = new Date(fromDate + 'T00:00:00')
    const end = new Date(toDate + 'T00:00:00')
    for(let d = new Date(start); d <= end; d.setDate(d.getDate()+1)){
      days.push(iso(d))
    }
    return days
  }, [fromDate, toDate])
  const trend = useMemo(()=> rangeDays.map(d => attFiltered.filter((a:any)=> a.date===d && a.status==='present').length), [attFiltered, rangeDays])

  const trendData = useMemo(() => {
    return rangeDays.map((d: string, i: number) => ({
      date: d,
      count: trend[i] || 0,
      label: new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    }))
  }, [rangeDays, trend])

  const pieData = useMemo(() => {
    return roleLabels.map((label, i) => ({
      name: label.charAt(0).toUpperCase() + label.slice(1),
      value: roleValues[i]
    }))
  }, [roleLabels, roleValues])

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6', '#f43f5e']

  const cards = [
    { title: 'Total Staff', value: String(activeStaff.length), icon: Users, tone: 'from-sky-500 to-sky-600', sub: 'Active workforce' },
    { title: 'Present Today', value: String(presentToday), icon: CalendarCheck2, tone: 'from-emerald-500 to-emerald-600', sub: `${Math.round((presentToday/Math.max(1,activeStaff.length))*100)}% attendance` },
    { title: 'Absent Today', value: String(absentToday), icon: CalendarX2, tone: 'from-rose-500 to-rose-600', sub: 'Missing staff' },
    { title: 'On Leave', value: String(leaveToday), icon: CalendarRange, tone: 'from-amber-500 to-amber-600', sub: 'Approved leaves' },
    { title: 'Late Today', value: String(lateToday), icon: Clock, tone: 'from-indigo-500 to-indigo-600', sub: 'After shift start' },
    { title: 'Monthly Payroll', value: `PKR ${fmt(payrollMonthly)}`, icon: Wallet, tone: 'from-teal-500 to-teal-600', sub: 'Basic salary sum' },
  ]

  return (
    <div className="space-y-6 pb-8 bg-slate-50 dark:bg-slate-950 -m-6 p-6 min-h-screen">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Staff Management</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Overview of hospital workforce and attendance
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 shadow-sm">
            <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Updated: {updatedAt}</span>
          </div>
          <button 
            onClick={()=>{ loadMeta(); reloadAttendance() }} 
            disabled={loading} 
            className="btn bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-sm transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-lg">
            <Filter className="h-5 w-5 text-sky-500" /> Filters
          </div>
          <button 
            onClick={()=>{ setFromDate(iso(startOfMonth(new Date()))); setToDate(iso(new Date())); setSelectedShiftId('') }} 
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
          >
            <RotateCcw className="h-4 w-4" /> Reset Filters
          </button>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">From Date</label>
            <input type="date" value={fromDate} onChange={e=> setFromDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 transition-all h-11 px-4 text-slate-900 dark:text-slate-100" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">To Date</label>
            <input type="date" value={toDate} onChange={e=> setToDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 transition-all h-11 px-4 text-slate-900 dark:text-slate-100" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Shift Filter</label>
            <select value={selectedShiftId} onChange={e=> setSelectedShiftId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 transition-all h-11 px-4 appearance-none text-slate-900 dark:text-slate-100">
              <option value="">All Shifts</option>
              {shifts.map((s:any)=> <option key={String(s._id||s.id)} value={String(s._id||s.id)}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ title, value, icon: Icon, tone, sub }) => (
          <div key={title} className={`group relative overflow-hidden rounded-xl p-3.5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 bg-gradient-to-br ${tone}`}>
            <div className="absolute -right-3 -bottom-3 h-16 w-16 rounded-full bg-white/10" />
            <div className="relative flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-widest text-white/70 truncate">{title}</div>
                <div className="mt-1 text-xl font-extrabold text-white tabular-nums">{value}</div>
                <div className="mt-0.5 text-[9px] font-medium text-white/60 truncate">{sub}</div>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white">
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChartIcon className="h-5 w-5 text-sky-500" /> Attendance Trends
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Daily present staff count for selected range</p>
            </div>
            <div className="bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 px-3 py-1 rounded-full text-xs font-bold">
              Avg: {fmt(Math.round((trend.reduce((s,n)=>s+n,0)/Math.max(1,trend.length))||0))}
            </div>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-700" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'currentColor', fontSize: 11 }}
                  className="text-slate-400 dark:text-slate-500"
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'currentColor', fontSize: 11 }}
                  className="text-slate-400 dark:text-slate-500"
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                  itemStyle={{ color: 'currentColor' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#0ea5e9" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-indigo-500" /> Staff Distribution
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Breakdown by employment role</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  animationDuration={1500}
                >
                  {pieData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px'
                  }} 
                  itemStyle={{ color: 'currentColor' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', fontWeight: '500', paddingTop: '20px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-4">
             <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
               <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">Main Role</span>
               <span className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5 truncate max-w-full">
                 {roleLabels.length > 0 ? roleLabels[0].charAt(0).toUpperCase() + roleLabels[0].slice(1) : '—'}
               </span>
             </div>
             <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
               <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">Diversity</span>
               <span className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5">{roleLabels.length} Roles</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm overflow-hidden relative">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Users2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100">Shift Coverage</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Resource allocation status</p>
            </div>
          </div>
          <div className="space-y-4 mt-6">
            {shifts.slice(0, 3).map((s:any, idx) => {
              const count = staff.filter(st => st.shiftId === (s._id || s.id)).length
              const percent = Math.round((count / Math.max(1, staff.length)) * 100)
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600 dark:text-slate-300">{s.name}</span>
                    <span className="text-slate-400 dark:text-slate-500">{count} members</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
           <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100">Financial Impact</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Payroll & extra earnings</p>
            </div>
          </div>
          <div className="h-[140px] w-full mt-6">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={[
                 { name: 'Basic', value: payrollMonthly, color: '#0ea5e9' },
                 { name: 'Extras', value: earningsSum, color: '#10b981' }
               ]}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-700" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: 'currentColor' }} className="text-slate-400 dark:text-slate-500" />
                 <Tooltip formatter={(v: any) => `PKR ${fmt(Number(v))}`} />
                 <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    <Cell fill="#0ea5e9" />
                    <Cell fill="#10b981" />
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <CalendarRange className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100">Attendance Breakdown</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Today's status overview</p>
            </div>
          </div>
          <div className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-emerald-600 dark:text-emerald-400">Present</span>
                <span className="text-slate-400 dark:text-slate-500">{presentToday}</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${Math.round((presentToday/Math.max(1,activeStaff.length))*100)}%` }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-rose-600 dark:text-rose-400">Absent</span>
                <span className="text-slate-400 dark:text-slate-500">{absentToday}</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full transition-all duration-1000" style={{ width: `${Math.round((absentToday/Math.max(1,activeStaff.length))*100)}%` }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-amber-600 dark:text-amber-400">On Leave</span>
                <span className="text-slate-400 dark:text-slate-500">{leaveToday}</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: `${Math.round((leaveToday/Math.max(1,activeStaff.length))*100)}%` }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-indigo-600 dark:text-indigo-400">Late</span>
                <span className="text-slate-400 dark:text-slate-500">{lateToday}</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${Math.round((lateToday/Math.max(1,activeStaff.length))*100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
