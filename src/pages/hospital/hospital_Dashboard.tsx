import { useEffect, useMemo, useState } from 'react'
import { TrendingUp, DollarSign, Users, BedSingle, Activity, RefreshCw, Clock, CalendarClock, Filter, RotateCcw, BarChart3, X, HeartPulse, Stethoscope, Ambulance, Building2, UserCheck, AlertTriangle, ChevronDown } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { hospitalApi, financeApi, labApi } from '../../utils/api'
import { fmt12 } from '../../utils/timeFormat'
import ModernDatePicker from '../../components/common/ModernDatePicker'
import ModernTimePicker from '../../components/common/ModernTimePicker'

function iso(d: Date){ return d.toISOString().slice(0,10) }
function startOfMonth(d: Date){ const x = new Date(d); x.setDate(1); return x }
function money(x: any){ const n = Number(x||0); return isFinite(n) ? n : 0 }
function fmtRs(n: number){ return `Rs ${Math.round(n).toLocaleString('en-PK')}` }

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316']

export default function Hospital_Dashboard() {
  const [loading, setLoading] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string>('—')
  const [fromDate, setFromDate] = useState<string>(iso(startOfMonth(new Date())))
  const [toDate, setToDate] = useState<string>(iso(new Date()))
  const [fromTime, setFromTime] = useState<string>('')
  const [toTime, setToTime] = useState<string>('')
  const [revByMethod, setRevByMethod] = useState<{ cash: number; card: number }>({ cash: 0, card: 0 })
  const [stats, setStats] = useState({
    tokens: 0,
    admissions: 0,
    discharges: 0,
    activeIpd: 0,
    bedsAvailable: 0,
    occupancy: 0,
    present: 0,
    late: 0,
  })
  const [tokens, setTokens] = useState<any[]>([])
  const [ipdAdmissions, setIpdAdmissions] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [ipdPayments, setIpdPayments] = useState<any[]>([])
  const [doctorEarnRows, setDoctorEarnRows] = useState<any[]>([])
  const [doctorPayoutsTotal, setDoctorPayoutsTotal] = useState<number>(0)
  const [opdRevenueAmt, setOpdRevenueAmt] = useState<number>(0)
  const [ipdRevenueAmt, setIpdRevenueAmt] = useState<number>(0)
  const [erRevenueAmt, setErRevenueAmt] = useState<number>(0)
  const [erTransactions, setErTransactions] = useState<any[]>([])
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([])
  const [corporateArItems, setCorporateArItems] = useState<Array<{ companyId: string; companyName: string; balance: number }>>([])
  const [corporateArAmt, setCorporateArAmt] = useState<number>(0)
  const [showArModal, setShowArModal] = useState(false)
  const REFRESH_MS = 15000

  // Shifts for global filter
  const [shifts, setShifts] = useState<Array<{ id: string; name: string; start: string; end: string }>>([])
  const [filterShiftId, setFilterShiftId] = useState<string>('')

  useEffect(() => { load() }, [fromDate, toDate, fromTime, toTime, filterShiftId])

  function getEffectiveWindow(){
    // If custom time range is provided, it overrides shift
    const hasTime = !!(fromTime && toTime)
    if (hasTime){
      try{
        const [fy,fm,fd] = fromDate.split('-').map(n=>parseInt(n||'0',10))
        const [ty,tm,td] = toDate.split('-').map(n=>parseInt(n||'0',10))
        const [fh,fmin] = fromTime.split(':').map(n=>parseInt(n||'0',10))
        const [th,tmin] = toTime.split(':').map(n=>parseInt(n||'0',10))
        const start = new Date(fy,(fm-1),fd,fh||0,fmin||0,0)
        let end = new Date(ty,(tm-1),td,th||0,tmin||0,0)
        if (end <= start) end = new Date(end.getTime() + 24*60*60*1000)
        return { start, end }
      }catch{ return null }
    }
    if (filterShiftId){
      const sh = shifts.find(s=> s.id===filterShiftId)
      const win = getShiftWindow(toDate, sh)
      return win
    }
    return null
  }

  function toTimeMs(x:any){
    const s = String(x?.receivedAt||x?.dateIso||x?.date||x?.createdAt||'')
    const t = new Date(s).getTime()
    return Number.isFinite(t) ? t : NaN
  }

  async function load(){
    setLoading(true)
    try {
      const [tokensRes, expensesRes, staffRes, bedsAllRes, bedsOccRes, attRes, shiftsRes, ipdAdmsRes, doctorsRes, depsRes] = await Promise.all([
        hospitalApi.listTokens({ from: fromDate, to: toDate }) as any,
        hospitalApi.listExpenses({ from: fromDate, to: toDate }) as any,
        hospitalApi.listStaff() as any,
        hospitalApi.listBeds() as any,
        hospitalApi.listBeds({ status: 'occupied' }) as any,
        hospitalApi.listAttendance({ from: fromDate, to: toDate, limit: 5000 }) as any,
        hospitalApi.listShifts() as any,
        hospitalApi.listIPDAdmissions({ from: fromDate, to: toDate, limit: 500 }) as any,
        hospitalApi.listDoctors() as any,
        hospitalApi.listDepartments() as any,
      ])
      let tokensArr: any[] = tokensRes?.tokens || tokensRes?.items || tokensRes || []
      let expensesArr: any[] = expensesRes?.expenses || expensesRes?.items || expensesRes || []
      let staffArr: any[] = staffRes?.staff || staffRes?.items || staffRes || []
      const allBeds: any[] = bedsAllRes?.beds || []
      const occBeds: any[] = bedsOccRes?.beds || []
      let attendance: any[] = attRes?.items || []
      let shifts: any[] = (shiftsRes?.items || shiftsRes || [])
      const ipdAdms: any[] = ipdAdmsRes?.admissions || ipdAdmsRes?.items || ipdAdmsRes || []

      try {
        const depArr: any[] = (depsRes?.departments || depsRes?.items || depsRes || [])
        setDepartments(depArr.map((d:any)=> ({ id: String(d._id||d.id), name: String(d.name||'') })).filter((d:any)=> d.id && d.name))
      } catch { setDepartments([]) }

      // Apply global time window if enabled
      const win = getEffectiveWindow()
      if (win){
        const inWin = (x:any)=>{ const t = toTimeMs(x); return Number.isFinite(t) && t >= win.start.getTime() && t < win.end.getTime() }
        tokensArr = tokensArr.filter(inWin)
        expensesArr = expensesArr.filter(inWin)
      }
      setIpdAdmissions(ipdAdms)
      setTokens(tokensArr)
      setExpenses(expensesArr)
      setDoctorEarnRows([])

      // Fallback to Lab source if no hospital attendance
      if ((attendance?.length||0) === 0){
        try {
          const [attLab, shiftsLab, staffLab] = await Promise.all([
            labApi.listAttendance({ from: fromDate, to: toDate, limit: 5000 }) as any,
            labApi.listShifts() as any,
            labApi.listStaff({ limit: 1000 }) as any,
          ])
          attendance = (attLab?.items || attLab || [])
          shifts = (shiftsLab?.items || shiftsLab || [])
          staffArr = (staffLab?.items || [])
            .map((x:any)=> ({ _id: x._id, id: x._id, name: x.name, role: x.position || 'other', phone: x.phone, salary: x.salary, shiftId: x.shiftId, active: x.status !== 'inactive' }))
        } catch {}
      }

      // Doctor payouts sum across all doctors in range
      try {
        const doctors: any[] = (doctorsRes?.doctors || doctorsRes?.items || doctorsRes || []).map((d:any)=> ({ id: String(d._id||d.id) }))
        const payoutsLists = await Promise.all(doctors.map(async d => {
          try { const r:any = await financeApi.doctorPayouts(d.id, 200); return (r?.payouts || []) } catch { return [] }
        }))
        let payouts = ([] as any[]).concat(...payoutsLists)
        if (win){
          const inWin = (x:any)=>{ const t = toTimeMs(x); return Number.isFinite(t) && t >= win.start.getTime() && t < win.end.getTime() }
          payouts = payouts.filter(inWin)
        } else {
          payouts = payouts.filter(p=>{ const dt = String(p.dateIso||p.date||p.createdAt||'').slice(0,10); return dt>=fromDate && dt<=toDate })
        }
        const total = payouts
          .reduce((s,p)=> s + money(p.amount), 0)
        setDoctorPayoutsTotal(total)
      } catch { setDoctorPayoutsTotal(0) }

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

      // Fetch ER transactions with department info for department revenue calculation
      try {
        const erTxRes: any = await hospitalApi.listTransactions({ from: fromDate, to: toDate, type: 'ER', limit: 1000 })
        setErTransactions(erTxRes?.transactions || [])
      } catch { setErTransactions([]) }
      // Fetch corporate AR breakdown
      try {
        const arRes: any = await hospitalApi.getCorporateARBreakdown({ from: fromDate, to: toDate })
        setCorporateArItems(arRes?.items || [])
        setCorporateArAmt(arRes?.totalAR || 0)
      } catch { setCorporateArItems([]); setCorporateArAmt(0) }

      // Calculate OPD revenue from tokens (sum of fees)
      const opdRev = tokensArr.reduce((sum: number, t: any) => {
        const fee = Number(t?.fee || 0)
        return sum + (isFinite(fee) ? fee : 0)
      }, 0)
      setOpdRevenueAmt(opdRev)

      // Calculate IPD revenue from ipdPayments
      const ipdRev = ipdPayFlat.reduce((sum: number, p: any) => {
        const amt = Number(p?.amount || 0)
        return sum + (isFinite(amt) ? amt : 0)
      }, 0)
      setIpdRevenueAmt(ipdRev)

      // Calculate ER revenue from erTransactions
      const erRev = (erTransactions || []).reduce((sum: number, t: any) => {
        const amt = Number(t?.fee || t?.totalAmount || t?.amount || 0)
        return sum + (isFinite(amt) ? amt : 0)
      }, 0)
      setErRevenueAmt(erRev)

      const totalBeds = allBeds.length
      const occupied = occBeds.length
      const bedsAvailable = Math.max(0, totalBeds - occupied)
      const occupancy = totalBeds ? Math.round((occupied / totalBeds) * 100) : 0

      const todayStr = toDate
      const dateOf = (x:any) => String(x?.date || x?.dateIso || x?.createdAt || '').slice(0,10)
      const presentToday = attendance.filter(a => dateOf(a) === todayStr && (String(a.status||'').toLowerCase()==='present' || !!a.clockIn)).length
      const shiftMap: Record<string, any> = {}
      for (const sh of shifts){ shiftMap[String(sh._id || sh.id)] = sh }
      const staffMap: Record<string, any> = {}
      for (const st of staffArr){ staffMap[String(st._id || st.id)] = st }
      function toMin(hm?: string){ if(!hm) return null; const [h,m] = String(hm).split(':').map((n:any)=>parseInt(n||'0')); return isFinite(h) ? (h*60 + (m||0)) : null }
      let lateToday = 0
      for (const a of attendance){
        if (dateOf(a) !== todayStr || String(a.status||'').toLowerCase() !== 'present' || !a.clockIn) continue
        const sid = String(a.shiftId || staffMap[a.staffId]?.shiftId || '')
        const sh = shiftMap[sid]
        const smin = toMin(sh?.start), inMin = toMin(a.clockIn)
        if (smin!=null && inMin!=null && inMin > smin) lateToday++
      }

      setStats({ tokens: tokensArr.length, admissions: ipdAdms.length, discharges: (ipdAdmsRes?.admissions||[]).filter((a:any)=>a.status==='discharged').length, activeIpd: occupied, bedsAvailable, occupancy, present: presentToday, late: lateToday })
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

  // Department map no longer needed after removing dept-wise widget
  // IPD revenue derived from backend trial balance
  const expensesTotal = useMemo(()=> expenses.reduce((s,e)=> s + money(e.amount), 0), [expenses])
  const doctorPayouts = useMemo(()=> (doctorEarnRows||[]).filter((r:any)=>{
    const t = String(r.type||'').toLowerCase()
    return t==='payout' || money(r.amount)<0
  }).reduce((s:any,r:any)=> s + Math.abs(money(r.amount)), 0), [doctorEarnRows])
  const doctorPayoutsCard = useMemo(()=> doctorPayoutsTotal>0 ? doctorPayoutsTotal : doctorPayouts, [doctorPayoutsTotal, doctorPayouts])
  // Salaries widget removed per request

  const totalRevenueByMethod = useMemo(()=> revByMethod.cash + revByMethod.card, [revByMethod])
  const recentIpdPayments = useMemo(()=> {
    const getDate = (p:any)=> new Date(String(p.receivedAt||p.dateIso||p.date||p.createdAt||'') || 0).getTime()
    return [...ipdPayments].sort((a,b)=> getDate(b) - getDate(a)).slice(0, 10)
  }, [ipdPayments])

  // Chart data: Revenue breakdown by source (OPD / IPD / ER)
  const revenueBreakdownData = useMemo(() => [
    { name: 'OPD', value: opdRevenueAmt, color: '#6366f1' },
    { name: 'IPD', value: ipdRevenueAmt, color: '#10b981' },
    { name: 'ER', value: erRevenueAmt, color: '#f59e0b' },
  ].filter(d => d.value > 0), [opdRevenueAmt, ipdRevenueAmt, erRevenueAmt])

  // Chart data: Cash vs Card revenue
  const paymentMethodData = useMemo(() => [
    { name: 'Cash', value: revByMethod.cash, color: '#10b981' },
    { name: 'Card/Bank', value: revByMethod.card, color: '#6366f1' },
  ].filter(d => d.value > 0), [revByMethod])

  // Chart data: Bed occupancy donut
  const bedOccupancyData = useMemo(() => {
    const occupied = stats.activeIpd
    const available = stats.bedsAvailable
    return [
      { name: 'Occupied', value: occupied, color: '#ef4444' },
      { name: 'Available', value: available, color: '#10b981' },
    ].filter(d => d.value > 0)
  }, [stats.activeIpd, stats.bedsAvailable])

  // Chart data: Department revenue for bar chart
  const deptRevenueChartData = useMemo(() => {
    const byDept: Record<string, number> = {}
    for (const d of departments) byDept[d.id] = 0
    for (const t of tokens){
      const depId = String(t?.departmentId?._id || t?.departmentId || '')
      if (!depId) continue
      const fee = Number(t?.fee || t?.amount || 0)
      if (byDept[depId] == null) byDept[depId] = 0
      byDept[depId] += fee
    }
    for (const a of ipdAdmissions){
      const depId = String(a?.departmentId?._id || a?.departmentId || '')
      if (!depId) continue
      const totalBill = Number(a?.totalBill || a?.totalAmount || a?.billTotal || 0)
      const deposit = Number(a?.deposit || a?.totalPaid || 0)
      const ipdRevenue = totalBill > 0 ? totalBill : deposit
      if (byDept[depId] == null) byDept[depId] = 0
      byDept[depId] += ipdRevenue
    }
    for (const t of erTransactions){
      const depId = String(t?.departmentId || '')
      if (!depId) continue
      const amount = Number(t?.fee || t?.totalAmount || 0)
      if (byDept[depId] == null) byDept[depId] = 0
      byDept[depId] += amount
    }
    return departments
      .map((d, i) => ({ name: d.name.length > 12 ? d.name.slice(0, 11) + '…' : d.name, revenue: byDept[d.id] || 0, color: CHART_COLORS[i % CHART_COLORS.length] }))
      .filter(d => d.revenue > 0)
  }, [departments, tokens, ipdAdmissions, erTransactions])

  // Chart data: Revenue vs Expenses comparison
  const revenueVsExpenseData = useMemo(() => [
    { name: 'Revenue', value: totalRevenueByMethod, fill: '#10b981' },
    { name: 'Expenses', value: expensesTotal, fill: '#ef4444' },
    { name: 'Doctor Payouts', value: doctorPayoutsCard, fill: '#f59e0b' },
  ], [totalRevenueByMethod, expensesTotal, doctorPayoutsCard])

  
  // Department revenue cards - calculate OPD + IPD + ER revenue per department
  const deptRevenueCards = useMemo(() => {
    const byDept: Record<string, number> = {}
    for (const d of departments) byDept[d.id] = 0

    // OPD revenue from tokens (fee per department)
    for (const t of tokens){
      const depId = String(t?.departmentId?._id || t?.departmentId || '')
      if (!depId) continue
      const fee = Number(t?.fee || t?.amount || 0)
      if (byDept[depId] == null) byDept[depId] = 0
      byDept[depId] += fee
    }

    // IPD revenue from admissions (deposit + total billed per department)
    for (const a of ipdAdmissions){
      const depId = String(a?.departmentId?._id || a?.departmentId || '')
      if (!depId) continue
      const totalBill = Number(a?.totalBill || a?.totalAmount || a?.billTotal || 0)
      const deposit = Number(a?.deposit || a?.totalPaid || 0)
      const ipdRevenue = totalBill > 0 ? totalBill : deposit
      if (byDept[depId] == null) byDept[depId] = 0
      byDept[depId] += ipdRevenue
    }

    // ER revenue from transactions (distributed by department from finance journals)
    for (const t of erTransactions){
      const depId = String(t?.departmentId || '')
      if (!depId) continue
      const amount = Number(t?.fee || t?.totalAmount || 0)
      if (byDept[depId] == null) byDept[depId] = 0
      byDept[depId] += amount
    }

    return departments.map(d => ({
      title: d.name,
      value: `Rs ${(byDept[d.id] || 0).toFixed(0)}`,
      tone: 'bg-white border-slate-200',
      icon: DollarSign,
    }))
  }, [departments, tokens, ipdAdmissions, erTransactions])

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

  

  // Key metric cards with gradient backgrounds
  const keyCards = [
    { title: 'Total Revenue', value: fmtRs(totalRevenueByMethod), icon: DollarSign, gradient: 'from-emerald-500 to-teal-600', iconBg: 'bg-emerald-400/30' },
    { title: 'Expenses', value: fmtRs(expensesTotal), icon: TrendingUp, gradient: 'from-rose-500 to-pink-600', iconBg: 'bg-rose-400/30' },
    { title: 'Tokens Today', value: String(stats.tokens), icon: Activity, gradient: 'from-violet-500 to-purple-600', iconBg: 'bg-violet-400/30' },
    { title: 'Active IPD', value: String(stats.activeIpd), icon: BedSingle, gradient: 'from-sky-500 to-blue-600', iconBg: 'bg-sky-400/30' },
  ]

  // Secondary stat cards
  const secondaryCards = [
    { title: 'Admissions', value: String(stats.admissions), icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
    { title: 'Discharges', value: String(stats.discharges), icon: CalendarClock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Beds Available', value: String(stats.bedsAvailable), icon: BedSingle, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { title: 'OPD Revenue', value: fmtRs(opdRevenueAmt), icon: Stethoscope, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'IPD Revenue', value: fmtRs(ipdRevenueAmt), icon: HeartPulse, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'ER Revenue', value: fmtRs(erRevenueAmt), icon: Ambulance, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Doctor Payouts', value: fmtRs(doctorPayoutsCard), icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: 'Corporate AR', value: fmtRs(corporateArAmt), icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50', onClick: () => setShowArModal(true) },
    { title: 'Staff Present', value: String(stats.present), icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Late Staff', value: String(stats.late), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ]

  return (
    <div className="space-y-6">
      {/* Enhanced Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-visible">
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Filter className="h-4 w-4" />
            </div>
            <span className="text-base uppercase tracking-wider">Dashboard Filters</span>
          </div>
          <button 
            onClick={()=>{ setFromDate(iso(startOfMonth(new Date()))); setToDate(iso(new Date())); setFilterShiftId(''); setFromTime(''); setToTime('') }} 
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:shadow-sm active:scale-95"
          >
            <RotateCcw className="h-4 w-4" /> Reset All
          </button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          <ModernDatePicker
            label="Date From"
            value={fromDate}
            onChange={v => setFromDate(v)}
          />

          <ModernDatePicker
            label="Date To"
            value={toDate}
            onChange={v => setToDate(v)}
          />

          {/* Shift */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Working Shift</label>
            <div className="relative group">
              <select 
                value={filterShiftId} 
                onChange={e=> setFilterShiftId(e.target.value)} 
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pl-11 text-sm font-medium transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none hover:border-slate-300 cursor-pointer"
              >
                <option value="">Full Day (24h)</option>
                {shifts.map(s=> <option key={s.id} value={s.id}>{s.name} ({fmt12(s.start)}-{fmt12(s.end)})</option>)}
              </select>
              <Clock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Manual Time From */}
          <ModernTimePicker
            label="Manual Time From"
            value={fromTime}
            onChange={v => { setFromTime(v); if (v) setFilterShiftId('') }}
          />

          {/* Manual Time To */}
          <ModernTimePicker
            label="Manual Time To"
            value={toTime}
            onChange={v => { setToTime(v); if (v) setFilterShiftId('') }}
          />
        </div>
      </div>

      {/* Key Metric Cards - Gradient */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {keyCards.map(({ title, value, icon: Icon, gradient, iconBg }) => (
          <div key={title} className={`relative overflow-hidden rounded-2xl bg-linear-to-br ${gradient} p-5 text-white shadow-lg`}>
            <div className="relative z-10">
              <div className="text-sm font-medium text-white/80">{title}</div>
              <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
            </div>
            <div className={`absolute right-3 top-3 rounded-xl ${iconBg} p-2.5`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            {/* Decorative circle */}
            <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-white/10" />
          </div>
        ))}
      </div>

      {/* Secondary Stat Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5">
        {secondaryCards.map(({ title, value, icon: Icon, color, bg, onClick }) => (
          <div
            key={title}
            className={`rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}
            onClick={onClick}
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-lg ${bg} p-2`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-slate-500">{title}</div>
                <div className="text-sm font-semibold text-slate-900">{value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1: Revenue Breakdown + Cash vs Card + Bed Occupancy */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue Breakdown Donut */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <BarChart3 className="h-4 w-4 text-indigo-500" /> Revenue Breakdown
          </div>
          {revenueBreakdownData.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">No revenue data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={revenueBreakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={3} strokeWidth={0}>
                  {revenueBreakdownData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtRs(Number(v ?? 0))} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-slate-600">
            {revenueBreakdownData.map(d => (
              <span key={d.name} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                {d.name}: {fmtRs(d.value)}
              </span>
            ))}
          </div>
        </div>

        {/* Cash vs Card Bar Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <DollarSign className="h-4 w-4 text-emerald-500" /> Payment Methods
          </div>
          {paymentMethodData.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">No payment data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={paymentMethodData} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmtRs(Number(v ?? 0))} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {paymentMethodData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bed Occupancy Donut */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <BedSingle className="h-4 w-4 text-sky-500" /> Bed Occupancy
          </div>
          {bedOccupancyData.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">No bed data</div>
          ) : (
            <div className="relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={bedOccupancyData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={55} paddingAngle={3} strokeWidth={0}>
                    {bedOccupancyData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">{stats.occupancy}%</div>
                  <div className="text-xs text-slate-500">Occupied</div>
                </div>
              </div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-slate-600">
            {bedOccupancyData.map(d => (
              <span key={d.name} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                {d.name}: {d.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Revenue vs Expenses + Department Revenue */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue vs Expenses Bar Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <BarChart3 className="h-4 w-4 text-amber-500" /> Revenue vs Expenses
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueVsExpenseData} barSize={56}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => fmtRs(Number(v ?? 0))} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {revenueVsExpenseData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Department Revenue Bar Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Building2 className="h-4 w-4 text-violet-500" /> Department Revenue
          </div>
          {deptRevenueChartData.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-sm text-slate-400">No department revenue data</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={deptRevenueChartData} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" width={100} />
                <Tooltip formatter={(v) => fmtRs(Number(v ?? 0))} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                  {deptRevenueChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Corporate AR Section */}
      {corporateArItems.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Building2 className="h-4 w-4 text-indigo-500" /> Corporate AR by Company
            </div>
            <button
              onClick={() => setShowArModal(true)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View All →
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {corporateArItems.slice(0, 8).map((item) => (
              <div key={item.companyId} className="rounded-xl border bg-linear-to-br from-indigo-50 to-white border-indigo-200 p-3.5 transition-all hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-600 truncate" title={item.companyName}>{item.companyName}</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">Rs {item.balance.toFixed(0)}</div>
                    <div className="text-xs text-slate-500">Outstanding</div>
                  </div>
                  <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600 shrink-0">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Department Revenue Cards (fallback if no chart data) */}
      {deptRevenueCards.length > 0 && deptRevenueChartData.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 text-slate-800 font-semibold">Departments Revenue</div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {deptRevenueCards.map(({ title, value, tone, icon: Icon }) => (
              <div key={title} className={`rounded-xl border ${tone} p-3`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-slate-600">{title}</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
                    <div className="text-xs text-slate-500">Revenue</div>
                  </div>
                  <div className="rounded-md bg-slate-50 p-2 text-slate-700 shadow-sm">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent IPD Transactions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <HeartPulse className="h-4 w-4 text-emerald-500" /> Recent IPD Transactions
        </div>
        <div className="divide-y divide-slate-100">
          {recentIpdPayments.length === 0 && (
            <div className="py-6 text-center text-sm text-slate-400">No IPD payments in the selected range.</div>
          )}
          {recentIpdPayments.map((p:any, i:number)=>{
            const when = String(p.receivedAt||p.dateIso||p.date||p.createdAt||'').replace('T',' ').slice(0,19)
            const method = p.method || p.paymentMethod || '—'
            const ref = p.refNo || p.ref || ''
            return (
              <div key={i} className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">Rs {money(p.amount).toFixed(0)}</div>
                    <div className="text-xs text-slate-500">{when} • {method}{ref?` • ${ref}`:''}</div>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">{method}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
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
