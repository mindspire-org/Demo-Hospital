import { useEffect, useMemo, useRef, useState } from 'react'
import { DollarSign, Users, Activity, RefreshCw, Clock, Filter, RotateCcw, BarChart3, X, Wallet, BedDouble, TrendingUp, CalendarClock } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area, LabelList } from 'recharts'
import { hospitalApi, labApi } from '../../utils/api'
import ModernDateInput from '../../components/common/ModernDateInput'
import TimePicker from '../../components/common/TimePicker'

function iso(d: Date){ return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function startOfMonth(d: Date){ const x = new Date(d); x.setDate(1); return x }
function money(x: any){ const n = Number(x||0); return isFinite(n) ? n : 0 }

export default function Hospital_Dashboard() {
  const [loading, setLoading] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string>('—')
  const [fromDate, setFromDate] = useState<string>(iso(startOfMonth(new Date())))
  const [toDate, setToDate] = useState<string>(iso(new Date()))
  const [fromTime, setFromTime] = useState<string>('')
  const [toTime, setToTime] = useState<string>('')
  const [shifts, setShifts] = useState<Array<{ id: string; name: string; start: string; end: string }>>([])
  const [filterShiftId, setFilterShiftId] = useState<string>('')
  const [revByMethod, setRevByMethod] = useState<{ cash: number; card: number }>({ cash: 0, card: 0 })
  const [stats, setStats] = useState({
    tokens: 0,
    admissions: 0,
    discharges: 0,
    activeIpd: 0,
    bedsAvailable: 0,
    occupancy: 0,
    avgFee: 0,
    totalPatients: 0,
    erCount: 0,
    otCount: 0,
  })
  const [tokens, setTokens] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [ipdPayments, setIpdPayments] = useState<any[]>([])
  const [erPayments, setErPayments] = useState<any[]>([])
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [corporateArItems, setCorporateArItems] = useState<Array<{ companyId: string; companyName: string; balance: number }>>([])
  const [corporateArAmt, setCorporateArAmt] = useState<number>(0)
  const [showArModal, setShowArModal] = useState(false)
  const REFRESH_MS = 15000

  // Use refs to avoid stale closures in polling
  const fromDateRef = useRef<string>(fromDate)
  const toDateRef = useRef<string>(toDate)
  const fromTimeRef = useRef<string>(fromTime)
  const toTimeRef = useRef<string>(toTime)
  const filterShiftIdRef = useRef<string>(filterShiftId)
  const shiftsRef = useRef<Array<{ id: string; name: string; start: string; end: string }>>(shifts)

  useEffect(() => {
    fromDateRef.current = fromDate
    toDateRef.current = toDate
    fromTimeRef.current = fromTime
    toTimeRef.current = toTime
    filterShiftIdRef.current = filterShiftId
    shiftsRef.current = shifts
  }, [fromDate, toDate, fromTime, toTime, filterShiftId, shifts])

  useEffect(() => { load() }, [fromDate, toDate, fromTime, toTime, filterShiftId])

  function getEffectiveWindow(){
    // If custom time range is provided, it overrides shift
    const fDate = fromDateRef.current
    const tDate = toDateRef.current
    const fTime = fromTimeRef.current
    const tTime = toTimeRef.current
    const sId = filterShiftIdRef.current
    const sList = shiftsRef.current

    const hasTime = !!(fTime && tTime)
    if (hasTime){
      try{
        const [fy,fm,fd] = fDate.split('-').map((n: string)=>parseInt(n||'0',10))
        const [ty,tm,td] = tDate.split('-').map((n: string)=>parseInt(n||'0',10))
        const [fh,fmin] = fTime.split(':').map((n: string)=>parseInt(n||'0',10))
        const [th,tmin] = tTime.split(':').map((n: string)=>parseInt(n||'0',10))
        const start = new Date(fy,(fm-1),fd,fh||0,fmin||0,0)
        let end = new Date(ty,(tm-1),td,th||0,tmin||0,0)
        if (end <= start) end = new Date(end.getTime() + 24*60*60*1000)
        return { start, end }
      }catch{ return null }
    }
    if (sId){
      const sh = sList.find(s=> s.id===sId)
      if (!sh) return null
      return getShiftWindow(tDate, sh)
    }
    return null
  }

  function toTimeMs(x:any){
    // Prefer the full timestamp; dateIso/date are date-only and would collapse
    // every record to midnight, breaking the time-window / shift filters.
    const s = String(x?.createdAt||x?.receivedAt||x?.dateIso||x?.date||'')
    const t = new Date(s).getTime()
    return Number.isFinite(t) ? t : NaN
  }

  async function load(){
    setLoading(true)
    try {
      const fDate = fromDateRef.current
      const tDate = toDateRef.current
      
      const [tokensRes, expensesRes, bedsAllRes, bedsOccRes, shiftsRes, ipdAdmsRes, _doctorsRes, _depsRes] = await Promise.all([
        hospitalApi.listTokens({ from: fDate, to: tDate, limit: 100000 }) as any,
        hospitalApi.listExpenses({ from: fDate, to: tDate }) as any,
        hospitalApi.listBeds() as any,
        hospitalApi.listBeds({ status: 'occupied' }) as any,
        hospitalApi.listShifts() as any,
        hospitalApi.listIPDAdmissions({ from: fDate, to: tDate, limit: 500 }) as any,
        hospitalApi.listDoctors() as any,
        hospitalApi.listDepartments({ limit: 1000 }) as any,
      ])
      let tokensArr: any[] = tokensRes?.tokens || tokensRes?.items || tokensRes || []
      let expensesArr: any[] = expensesRes?.expenses || expensesRes?.items || expensesRes || []
      const allBeds: any[] = bedsAllRes?.beds || []
      const occBeds: any[] = bedsOccRes?.beds || []
      let shifts: any[] = (shiftsRes?.items || shiftsRes || [])
      const ipdAdms: any[] = ipdAdmsRes?.admissions || ipdAdmsRes?.items || ipdAdmsRes || []

      try {
        // Unused department fetching removed
      } catch { }

      // Apply global time window if enabled
      const win = getEffectiveWindow()
      if (win){
        const inWin = (x:any)=>{ const t = toTimeMs(x); return Number.isFinite(t) && t >= win.start.getTime() && t < win.end.getTime() }
        tokensArr = tokensArr.filter(inWin)
        expensesArr = expensesArr.filter(inWin)
      }
      setExpenses(expensesArr)
      setTokens(tokensArr)
      // Fallback to Lab source if no hospital shifts found
      if ((shifts?.length||0) === 0){
        try {
          const [shiftsLab] = await Promise.all([
            labApi.listShifts() as any,
          ])
          shifts = (shiftsLab?.items || shiftsLab || [])
        } catch {}
      }

      const ipdPaysArrays = await Promise.all(ipdAdms.slice(0, 200).map(async (a:any)=>{
        const id = String(a._id||a.id||a.encounterId||'')
        if (!id) return [] as any[]
        try {
          const r: any = await hospitalApi.listIpdPayments(id)
          const items: any[] = (r?.items || r?.payments || r || [])
          return items
        } catch { return [] as any[] }
      }))
      let ipdPayFlat = ([] as any[]).concat(...ipdPaysArrays)
      if (win){
        const inWin = (x:any)=>{ const t = toTimeMs(x); return Number.isFinite(t) && t >= win.start.getTime() && t < win.end.getTime() }
        ipdPayFlat = ipdPayFlat.filter(inWin)
      }
      setIpdPayments(ipdPayFlat)

      // Fetch ER payments
      try {
        const erTxRes: any = await hospitalApi.listTransactions({ from: fDate, to: tDate, type: 'ER', limit: 1000 })
        setErPayments(erTxRes?.transactions || [])
      } catch { setErPayments([]) }

      // Fetch dashboard stats
      try {
        const dStats = await hospitalApi.dashboardStats({ from: fDate, to: tDate })
        setDashboardStats(dStats)
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err)
      }

      // Fetch corporate AR breakdown
      try {
        const arRes: any = await hospitalApi.getCorporateARBreakdown({ from: fDate, to: tDate })
        setCorporateArItems(arRes?.items || [])
        setCorporateArAmt(arRes?.totalAR || 0)
      } catch { setCorporateArItems([]); setCorporateArAmt(0) }

      const totalBeds = allBeds.length
      const occupied = occBeds.length
      const bedsAvailable = Math.max(0, totalBeds - occupied)
      const occupancy = totalBeds ? Math.round((occupied / totalBeds) * 100) : 0

      const totalPatients = tokensArr.length + ipdAdms.length
      const avgFee = tokensArr.length > 0 ? Math.round(tokensArr.reduce((s,t)=>s + money(t.fee), 0) / tokensArr.length) : 0
      const erCount = (dashboardStats?.activePatients?.er || 0)
      setStats({ tokens: tokensArr.length, admissions: ipdAdms.length, discharges: (ipdAdmsRes?.admissions||[]).filter((a:any)=>a.status==='discharged').length, activeIpd: occupied, bedsAvailable, occupancy, avgFee, totalPatients, erCount, otCount: 0 })
      setUpdatedAt(new Date().toLocaleString())

      // Revenue split by payment method (cash vs card/bank) using finance transactions
      try {
        const txRes: any = await hospitalApi.listTransactions({ from: fromDate, to: toDate, type: 'All', limit: 5000 })
        const txns: any[] = txRes?.transactions || txRes?.items || []
        let cash = 0
        let card = 0
        for (const t of txns){
          const refType = String(t?.refType || '').toLowerCase()
          if (refType === 'expense' || refType === 'doctor_payout') continue

          // Skip reversals/returns when identifiable
          if (refType.includes('reversal')) continue

          const method = String(t?.paymentMethod || t?.method || t?.payment_mode || 'other').toLowerCase()
          const amtRaw = t?.fee ?? t?.totalAmount ?? t?.amount ?? 0
          const amt = Number(amtRaw || 0)
          if (!isFinite(amt) || amt <= 0) continue

          if (method === 'cash') cash += amt
          else if (method === 'bank' || method === 'card') card += amt
          else card += amt
        }
        setRevByMethod({ cash, card })
      } catch {
        setRevByMethod({ cash: 0, card: 0 })
      }
    } finally { setLoading(false) }
  }

  // Calculate total revenue from tokens as fallback when finance transactions are empty
  const tokenRevenue = useMemo(() => {
    return tokens.reduce((sum, t) => sum + money(t.fee || t.amount), 0)
  }, [tokens])

  // Use finance transactions if available, otherwise fall back to token fees
  const displayRevByMethod = useMemo(() => {
    const financeTotal = revByMethod.cash + revByMethod.card
    // If finance transactions show 0 but we have tokens with fees, show all as cash
    if (financeTotal === 0 && tokenRevenue > 0) {
      return { cash: tokenRevenue, card: 0 }
    }
    return revByMethod
  }, [revByMethod, tokenRevenue])

  const totalRevenueByMethod = useMemo(() => displayRevByMethod.cash + displayRevByMethod.card, [displayRevByMethod])

  const trendData = useMemo(() => {
    const days: Record<string, { date: string; revenue: number; expense: number }> = {}
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = iso(d)
      const label = dateStr.slice(5) // MM-DD
      days[dateStr] = { date: label, revenue: 0, expense: 0 }
    }

    // Populate revenue (tokens)
    for (const t of tokens) {
      const dateStr = String(t.dateIso || t.createdAt || '').slice(0, 10)
      if (days[dateStr]) days[dateStr].revenue += money(t.fee || t.amount)
    }
    // Populate revenue (IPD)
    for (const p of ipdPayments) {
      const dateStr = String(p.receivedAt || p.createdAt || '').slice(0, 10)
      if (days[dateStr]) days[dateStr].revenue += money(p.amount)
    }
    // Populate revenue (ER)
    for (const p of erPayments) {
      const dateStr = String(p.receivedAt || p.createdAt || '').slice(0, 10)
      if (days[dateStr]) days[dateStr].revenue += money(p.amount)
    }

    // Populate expenses
    for (const e of expenses) {
      const dateStr = String(e.dateIso || e.createdAt || '').slice(0, 10)
      if (days[dateStr]) days[dateStr].expense += money(e.amount)
    }

    return Object.values(days)
  }, [tokens, ipdPayments, erPayments, expenses])

  // Department revenue data for chart
  const deptRevenueData = useMemo(() => {
    const byDept: Record<string, number> = {}
    
    // OPD revenue from tokens
    for (const t of tokens) {
      const depName = t?.departmentName || t?.departmentId?.name || 'Other'
      byDept[depName] = (byDept[depName] || 0) + money(t.fee || t.amount)
    }

    // IPD revenue from payments
    for (const p of ipdPayments) {
      const depName = p?.departmentName || p?.departmentId?.name || 'IPD'
      byDept[depName] = (byDept[depName] || 0) + money(p.amount)
    }

    // ER revenue from payments
    for (const p of erPayments) {
      const depName = p?.departmentName || p?.departmentId?.name || 'ER'
      byDept[depName] = (byDept[depName] || 0) + money(p.amount)
    }

    return Object.entries(byDept)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8) // Top 8 departments
  }, [tokens, ipdPayments, erPayments])

  const occupancyData = useMemo(() => [
    { name: 'Occupied', value: stats.activeIpd, color: '#ef4444' },
    { name: 'Available', value: stats.bedsAvailable, color: '#10b981' }
  ], [stats])

  const topCards = [
    { title: 'TOTAL REVENUE', value: `Rs ${totalRevenueByMethod.toLocaleString()}`, tone: 'bg-linear-to-br from-emerald-500 to-teal-600 text-white', icon: Wallet, label: 'REVENUE' },
    { title: 'TOKENS ISSUED', value: String(stats.tokens), tone: 'bg-linear-to-br from-violet-500 to-purple-600 text-white', icon: Activity, label: 'OPD' },
    { title: 'ACTIVE IPD', value: String(dashboardStats?.activePatients?.ipd || stats.activeIpd), tone: 'bg-linear-to-br from-sky-500 to-blue-600 text-white', icon: Users, label: 'INPATIENT' },
    { title: 'BEDS AVAILABLE', value: String(stats.bedsAvailable), tone: 'bg-linear-to-br from-cyan-500 to-cyan-600 text-white', icon: BedDouble, label: 'WARD' },
    { title: 'AVG FEE', value: `Rs ${stats.avgFee.toLocaleString()}`, tone: 'bg-linear-to-br from-amber-500 to-orange-600 text-white', icon: DollarSign, label: 'METRIC' },
    { title: 'ER PATIENTS', value: String(dashboardStats?.activePatients?.er || stats.erCount), tone: 'bg-linear-to-br from-rose-500 to-red-600 text-white', icon: Activity, label: 'EMERGENCY' },
  ]

  const statsCards: any[] = [
    { title: 'ADMISSIONS', value: String(stats.admissions), color: 'bg-blue-500', icon: TrendingUp, sub: 'New patients this period' },
    { title: 'DISCHARGES', value: String(stats.discharges), color: 'bg-emerald-500', icon: CalendarClock, sub: 'Patients discharged' },
    { title: 'OCCUPANCY', value: `${stats.occupancy}%`, color: 'bg-amber-500', icon: BedDouble, sub: `${stats.activeIpd} occupied / ${stats.activeIpd + stats.bedsAvailable} total` },
    { title: 'ACTIVE ER', value: String(dashboardStats?.activePatients?.er || 0), color: 'bg-red-500', icon: Activity, sub: 'Emergency patients' },
    { title: 'TOTAL PATIENTS', value: String(stats.totalPatients), color: 'bg-indigo-500', icon: Users, sub: 'All departments' },
    { title: 'CASH REVENUE', value: `Rs ${displayRevByMethod.cash.toLocaleString()}`, color: 'bg-emerald-600', icon: Wallet, sub: `${displayRevByMethod.cash + displayRevByMethod.card > 0 ? Math.round(displayRevByMethod.cash / (displayRevByMethod.cash + displayRevByMethod.card) * 100) : 0}% of total` },
    { title: 'CARD REVENUE', value: `Rs ${displayRevByMethod.card.toLocaleString()}`, color: 'bg-sky-600', icon: Wallet, sub: `${displayRevByMethod.cash + displayRevByMethod.card > 0 ? Math.round(displayRevByMethod.card / (displayRevByMethod.cash + displayRevByMethod.card) * 100) : 0}% of total` },
    { title: 'CORPORATE AR', value: `Rs ${corporateArAmt.toLocaleString()}`, color: 'bg-violet-500', icon: DollarSign, sub: 'Outstanding balance' },
  ]

  const ipdErCards = [
    { title: 'Advance Available (IPD)', value: `Rs ${(dashboardStats?.advances?.ipd || 0).toLocaleString()}`, icon: Wallet, tone: 'bg-white border-slate-200 text-slate-700' },
    { title: 'Advance Available (ER)', value: `Rs ${(dashboardStats?.advances?.er || 0).toLocaleString()}`, icon: Wallet, tone: 'bg-white border-slate-200 text-slate-700' },
    { title: 'Pending Payment (IPD)', value: `Rs ${(dashboardStats?.pending?.ipd || 0).toLocaleString()}`, icon: Clock, tone: 'bg-white border-slate-200 text-slate-700' },
    { title: 'Pending Payment (ER)', value: `Rs ${(dashboardStats?.pending?.er || 0).toLocaleString()}`, icon: Clock, tone: 'bg-white border-slate-200 text-slate-700' },
  ]

  const recentIpdPayments = useMemo(()=> {
    const getDate = (p:any)=> new Date(String(p.receivedAt||p.dateIso||p.date||p.createdAt||'') || 0).getTime()
    return [...ipdPayments].sort((a,b)=> getDate(b) - getDate(a)).slice(0, 10)
  }, [ipdPayments])

  // Auto-refresh for real-time chart and widgets
  useEffect(()=>{
    const id = setInterval(async ()=>{
      await load()
    }, Math.max(3000, REFRESH_MS))
    return () => clearInterval(id)
  }, [fromDate, toDate])

  useEffect(()=>{
    const onVis = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  useEffect(()=>{
    const onDeps = () => load()
    try { window.addEventListener('hospital:departments:refresh', onDeps as any) } catch {}
    return () => { try { window.removeEventListener('hospital:departments:refresh', onDeps as any) } catch {} }
  }, [])

  // Load shifts once for global filter (fallback to Lab if needed)
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const r: any = await hospitalApi.listShifts()
        if (!mounted) return
        const arr = (r?.items || r || []).map((x:any)=> ({ id: String(x._id||x.id), name: x.name, start: x.start, end: x.end }))
        if (arr.length === 0){
          try{
            const rl: any = await labApi.listShifts()
            const arr2 = (rl?.items || rl || []).map((x:any)=> ({ id: String(x._id||x.id), name: x.name, start: x.start, end: x.end }))
            setShifts(arr2)
          } catch { setShifts([]) }
        } else { setShifts(arr) }
      } catch { setShifts([]) }
    })()
    return ()=>{ mounted = false }
  }, [])

  function getShiftWindow(dateStr: string, sh?: { start: string; end: string }){
    try{
      if (!sh) return null
      const [y,m,d] = dateStr.split('-').map(n=>parseInt(n||'0',10))
      const [shh,smm] = String(sh.start||'00:00').split(':').map(n=>parseInt(n||'0',10))
      const [ehh,emm] = String(sh.end||'00:00').split(':').map(n=>parseInt(n||'0',10))
      const start = new Date(y, (m-1), d, shh||0, smm||0, 0)
      let end = new Date(y, (m-1), d, ehh||0, emm||0, 0)
      if (end <= start) end = new Date(end.getTime() + 24*60*60*1000)
      return { start, end }
    } catch { return null }
  }

  

  return (
    <div className="space-y-6 bg-slate-50/50 dark:bg-slate-950 p-6 min-h-screen transition-colors duration-300">
      
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-lg shadow-slate-200/50 dark:shadow-none transition-colors duration-300">
        <div className="mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-lg"><Filter className="h-5 w-5 text-sky-500" /> Date Range & Filters</div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <ModernDateInput label="From Date" value={fromDate} onChange={setFromDate} />
          <ModernDateInput label="To Date" value={toDate} onChange={setToDate} />
          <label className="flex flex-col gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"><span>Shift</span>
            <div className="relative">
              <select value={filterShiftId} onChange={e=> setFilterShiftId(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-100 shadow-sm focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 outline-none transition-all hover:border-slate-300 appearance-none cursor-pointer">
                <option value="">All day</option>
                {shifts.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
              </div>
            </div>
          </label>
          <div><span className="mb-1.5 block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Start Time</span>
            <TimePicker value={fromTime} onChange={v=>{ setFromTime(v); if (v) setFilterShiftId('') }} />
          </div>
          <div><span className="mb-1.5 block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">End Time</span>
            <TimePicker value={toTime} onChange={v=>{ setToTime(v); if (v) setFilterShiftId('') }} />
          </div>
          <div className="flex items-end">
            <button onClick={()=>{ setFromDate(iso(startOfMonth(new Date()))); setToDate(iso(new Date())); setFilterShiftId(''); setFromTime(''); setToTime('') }} className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 dark:bg-sky-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-slate-700 dark:hover:bg-sky-500 transition-all shadow-md shadow-slate-300/50 dark:shadow-sky-900/30"><RotateCcw className="h-4 w-4" /> RESET</button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {topCards.map((card) => (
          <div key={card.title} className={`rounded-2xl ${card.tone} p-5 shadow-lg shadow-slate-300/40 dark:shadow-none relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-0.5 group`}>
            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all" />
            <div className="flex justify-between items-start relative z-10">
              <div>
                <div className="text-[10px] font-bold opacity-90 uppercase tracking-wider">{card.title}</div>
                <div className="mt-2 text-2xl font-black tracking-tight">{card.value}</div>
                <div className="mt-1 text-[10px] opacity-70 font-medium">{card.label}</div>
              </div>
              <div className="rounded-xl bg-white/25 p-2.5 shadow-sm backdrop-blur-sm border border-white/10">
                <card.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
        {statsCards.map((card) => (
          <div key={card.title} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-md shadow-slate-200/30 dark:shadow-none flex flex-col items-center text-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5">
            <div className={`p-2.5 rounded-xl ${card.color} bg-opacity-10 text-white ${card.color.replace('bg-', 'bg-opacity-100')} shadow-sm`}>
              <card.icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-lg font-black text-slate-800 dark:text-slate-100">{card.value}</div>
              <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">{card.title}</div>
              {card.sub && <div className="text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-0.5 leading-tight">{card.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {ipdErCards.map((card) => (
          <div key={card.title} className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-all hover:shadow-md`}>
            <div className="flex items-start justify-between mb-3">
              <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2">
                <card.icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{card.title}</div>
            <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-slate-100">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bed Occupancy Pie Chart */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-lg shadow-slate-200/40 dark:shadow-none relative">
          <div className="mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-lg"><BedDouble className="h-5 w-5 text-rose-500" /> Bed Occupancy</div>
          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%" minHeight={280} minWidth={0}>
              <PieChart>
                <Pie
                  data={occupancyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {occupancyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}
                  itemStyle={{ color: '#f1f5f9' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle"/>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-3xl font-black text-slate-800 dark:text-slate-100">{stats.occupancy}%</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Occupied</div>
            </div>
          </div>
        </div>

        {/* Department-wise Revenue Bar Chart */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-lg shadow-slate-200/40 dark:shadow-none">
          <div className="mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-lg"><BarChart3 className="h-5 w-5 text-indigo-500" /> Department Revenue</div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={280} minWidth={0}>
              <BarChart data={deptRevenueData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-10" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip 
                  formatter={(val: any) => [`Rs ${Number(val||0).toLocaleString()}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}
                  itemStyle={{ color: '#f1f5f9' }}
                />
                <Bar dataKey="value" fill="url(#barGrad)" radius={[6, 6, 0, 0]} barSize={28}>
                  <LabelList dataKey="value" position="top" formatter={(v:any) => `Rs ${(v/1000).toFixed(0)}k`} fill="#64748b" fontSize={10} fontWeight={700} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-lg shadow-slate-200/40 dark:shadow-none">
          <div className="mb-6 flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-lg">
            <BarChart3 className="h-5 w-5 text-emerald-500" /> Revenue & Expense Trend
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={280} minWidth={0}>
              <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25}/>
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-10" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(val) => val >= 1000 ? `${val/1000}k` : val} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', color: '#f1f5f9' }}
                  itemStyle={{ color: '#f1f5f9' }}
                  formatter={(val: any) => [`Rs ${Number(val).toLocaleString()}`, '']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" activeDot={{ r: 5, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" activeDot={{ r: 5, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-lg shadow-slate-200/40 dark:shadow-none">
          <div className="mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-lg"><Clock className="h-5 w-5 text-amber-500" /> Recent IPD Transactions</div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[300px] overflow-auto custom-scrollbar">
            {recentIpdPayments.length === 0 && <div className="text-sm text-slate-400 dark:text-slate-500 italic py-2">No recent payments.</div>}
            {recentIpdPayments.map((p:any, i:number) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Rs {Number(p.amount).toLocaleString()}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{String(p.receivedAt || p.createdAt).slice(0, 10)} • {p.method || 'CASH'}</div>
                </div>
                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                  Advance
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {corporateArItems.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-slate-800 dark:text-slate-100 font-semibold">Corporate AR by Company</div>
            <button 
              onClick={() => setShowArModal(true)}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-500 font-medium"
            >
              View All →
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {corporateArItems.slice(0, 8).map((item) => (
              <div key={item.companyId} className="rounded-xl border bg-indigo-50/50 border-indigo-200 p-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-600 truncate" title={item.companyName}>{item.companyName}</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">Rs {item.balance.toFixed(0)}</div>
                    <div className="text-xs text-slate-500">Outstanding</div>
                  </div>
                  <div className="rounded-md bg-white/60 p-2 text-slate-700 shadow-sm shrink-0">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 text-xs text-slate-500">
        <Clock className="h-4 w-4" />
        <span>Last updated: {updatedAt}</span>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading?'animate-spin':''}`} /> Refresh
        </button>
      </div>

      {/* Corporate AR Breakdown Modal */}
      {showArModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowArModal(false)}>
          <div className="w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="font-semibold text-slate-800">Corporate AR Breakdown</div>
              <button onClick={() => setShowArModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm text-slate-600">Total Outstanding AR:</div>
                <div className="text-lg font-semibold text-slate-900">Rs {corporateArAmt.toFixed(0)}</div>
              </div>
              <div className="rounded-md border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100/50 text-slate-700 border-b-2 border-slate-300">
                    <tr>
                      <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Company</th>
                      <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-right">Balance (Rs)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {corporateArItems.map((item) => (
                      <tr key={item.companyId} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-800">{item.companyName}</td>
                        <td className="px-4 py-2 text-right font-medium text-slate-900">{item.balance.toFixed(0)}</td>
                      </tr>
                    ))}
                    {corporateArItems.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-4 py-4 text-center text-slate-500">No outstanding AR found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="border-t border-slate-200 px-4 py-3 flex justify-end">
              <button 
                onClick={() => setShowArModal(false)}
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
