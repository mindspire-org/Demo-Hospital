import { useEffect, useState, useCallback, useMemo } from 'react'
import { financeApi } from '../../utils/api'
import { LayoutDashboard, Receipt, CheckCircle, Clock, TrendingUp, CreditCard, ArrowUpRight, ArrowDownRight, Users, BarChart3, FlaskConical, PieChart, BookOpen, Printer, RefreshCw, Calendar, AlertTriangle, Landmark, Shield, Download, Stethoscope, Building2, Scan, UserCog, Bed, DoorOpen, Scissors } from 'lucide-react'
import { ShiftDashboard } from '../../components/finance/ShiftDashboard'

function money(n: any) { const v = Number(n || 0); return `PKR ${Math.round(v).toLocaleString()}` }
function fmtDate(iso?: string) { if (!iso) return ''; const d = new Date(iso); if (isNaN(d.getTime())) return ''; return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const monthStartStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` }

export default function Finance_Dashboard() {
  const [from, setFrom] = useState(monthStartStr()); const [to, setTo] = useState(todayStr()); const [loading, setLoading] = useState(false)
  const [stats] = useState<any>(null)
  const [totalVouchers, setTotalVouchers] = useState(0); const [postedVouchers, setPostedVouchers] = useState(0); const [pendingApprovals, setPendingApprovals] = useState(0)
  const [cashIn, setCashIn] = useState(0); const [cashOut, setCashOut] = useState(0); const [doctorPayoutsTotal, setDoctorPayoutsTotal] = useState(0)
  const [recentVouchers, setRecentVouchers] = useState<any[]>([]); const [voucherTypes, setVoucherTypes] = useState<Record<string, number>>({})
  const [budgetVsActual, setBudgetVsActual] = useState<any[]>([]); const [coaSummary, setCoaSummary] = useState<Record<string, number>>({})
  const [fiscalPeriods, setFiscalPeriods] = useState<any[]>([]); const [bankReconciliations, setBankReconciliations] = useState(0)
  const [plSummary, setPlSummary] = useState({ revenue: 0, expense: 0, net: 0 })
  const [cashFlowSummary, setCashFlowSummary] = useState({ operating: 0, investing: 0, financing: 0 }); const [trialBalanceDiff, setTrialBalanceDiff] = useState(0)
  const [moduleStats, setModuleStats] = useState({ hospital: 0, lab: 0, pharmacy: 0, radiology: 0, ipd: 0, opd: 0, ot: 0, emergency: 0 })
  const [deptStats] = useState<Record<string, number>>({})
  const [staffSalaries] = useState(0)

  const effFrom = from || monthStartStr(); const effTo = to || todayStr(); const isFiltered = from !== monthStartStr() || to !== todayStr()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // ── 1. Vouchers (all types for the period) ──────────────────────────────
      const vRes: any = await financeApi.listVouchers({ from: effFrom, to: effTo, limit: 1000 })
      const vItems: any[] = vRes?.items || []
      setTotalVouchers(Number(vRes?.total || vItems.length || 0))
      setPostedVouchers(vItems.filter((v: any) => v.status === 'posted').length)
      setPendingApprovals(vItems.filter((v: any) => v.status === 'pending').length)
      const tc: Record<string, number> = {}
      for (const v of vItems) { const t = String(v.voucherType || 'OTHER'); tc[t] = (tc[t] || 0) + 1 }
      setVoucherTypes(tc)
      setRecentVouchers(vItems.slice(0, 5))

      // ── 2. Cash In / Cash Out — from real Cash Flow report ─────────────────
      try {
        const cf: any = await financeApi.cashFlow({ from: effFrom, to: effTo })
        // Cash & Bank rows show actual debit (in) / credit (out) movements
        const cbRows: any[] = cf?.cashBankRows || []
        let totalDebit = 0, totalCredit = 0
        for (const row of cbRows) {
          totalDebit += Number(row.debit || 0)
          totalCredit += Number(row.credit || 0)
        }
        // Also include operating net (receipts = positive operating)
        const opNet = Number(cf?.operatingNet || 0)
        const finNet = Number(cf?.financingNet || 0)
        if (totalDebit > 0 || totalCredit > 0) {
          setCashIn(totalDebit)
          setCashOut(totalCredit)
        } else {
          // fallback: positive net = cash in, negative net = cash out
          setCashIn(opNet > 0 ? opNet : 0)
          setCashOut(finNet < 0 ? Math.abs(finNet) : 0)
        }
        setCashFlowSummary({
          operating: Number(cf?.operatingNet || cf?.operating || 0),
          investing: Number(cf?.investingNet || cf?.investing || 0),
          financing: Number(cf?.financingNet || cf?.financing || 0)
        })
      } catch {}

      // ── 3. Doctor Payouts — use earnings API with date range ───────────────
      try {
        const earn: any = await financeApi.doctorEarnings({ from: effFrom, to: effTo })
        const earnItems: any[] = earn?.items || earn?.earnings || earn?.data || (Array.isArray(earn) ? earn : [])
        const totalEarned = earnItems.reduce((s: number, e: any) => s + Number(e.amount || e.totalAmount || e.shareAmount || 0), 0)
        setDoctorPayoutsTotal(totalEarned)

        // Also break down by module for the module cards
        let ipdRev = 0, opdRev = 0, otRev = 0, hospRev = 0
        for (const e of earnItems) {
          const amt = Number(e.amount || e.totalAmount || e.shareAmount || 0)
          const src = String(e.revenueAccount || e.module || e.source || '').toUpperCase()
          if (src.includes('IPD')) ipdRev += amt
          else if (src.includes('OPD')) opdRev += amt
          else if (src.includes('OT') || src.includes('PROCEDURE')) otRev += amt
          else hospRev += amt
        }
        if (totalEarned > 0) {
          setModuleStats(prev => ({ ...prev, hospital: hospRev, ipd: ipdRev, opd: opdRev, ot: otRev }))
        }
      } catch {}

      // ── 4. Module revenue — all finance transactions grouped by module/type ─
      try {
        const allTx: any = await financeApi.listTransactions({ from: effFrom, to: effTo, limit: 2000 })
        const txItems: any[] = allTx?.transactions || allTx?.items || allTx?.data || (Array.isArray(allTx) ? allTx : [])

        const modRevs: Record<string, number> = {}
        const typeMap: Record<string, string> = {
          'lab revenue': 'lab', 'lab': 'lab', 'laboratory': 'lab',
          'pharmacy': 'pharmacy', 'pharmacy revenue': 'pharmacy', 'pharmacy sale': 'pharmacy',
          'radiology': 'radiology', 'radiology revenue': 'radiology', 'x-ray': 'radiology',
          'ipd': 'ipd', 'ipd revenue': 'ipd', 'inpatient': 'ipd', 'admission': 'ipd',
          'opd': 'opd', 'opd revenue': 'opd', 'outpatient': 'opd', 'consultation': 'opd',
          'ot': 'ot', 'ot revenue': 'ot', 'operation theatre': 'ot', 'surgery': 'ot', 'procedure revenue': 'ot',
          'emergency': 'emergency', 'er revenue': 'emergency', 'er': 'emergency',
          'hospital': 'hospital', 'hospital revenue': 'hospital',
        }

        for (const tx of txItems) {
          const rawType = String(tx.module || tx.type || tx.source || tx.category || tx.revenueAccount || '').toLowerCase().trim()
          const amt = Number(tx.amount || tx.totalAmount || tx.paidAmount || tx.credit || 0)
          if (amt <= 0) continue

          // Direct key match
          let matched = typeMap[rawType]
          // Partial match fallback
          if (!matched) {
            for (const [key, val] of Object.entries(typeMap)) {
              if (rawType.includes(key) || key.includes(rawType)) { matched = val; break }
            }
          }
          if (matched) modRevs[matched] = (modRevs[matched] || 0) + amt
        }

        if (Object.keys(modRevs).length > 0) {
          setModuleStats(prev => ({
            hospital:  modRevs['hospital']  || prev.hospital,
            lab:       modRevs['lab']       || prev.lab,
            pharmacy:  modRevs['pharmacy']  || prev.pharmacy,
            radiology: modRevs['radiology'] || prev.radiology,
            ipd:       modRevs['ipd']       || prev.ipd,
            opd:       modRevs['opd']       || prev.opd,
            ot:        modRevs['ot']        || prev.ot,
            emergency: modRevs['emergency'] || prev.emergency,
          }))
        }
      } catch {}

      // ── 4b. Settlements as secondary source ──────────────────────────────
      try {
        const settle: any = await financeApi.listSettlements({ from: effFrom, to: effTo })
        const sItems: any[] = settle?.items || settle?.settlements || settle?.data || (Array.isArray(settle) ? settle : [])
        if (sItems.length > 0) {
          const modRevs: Record<string, number> = {}
          for (const s of sItems) {
            const mod = String(s.module || s.fromCostCenter || s.sourceModule || '').toLowerCase().trim()
            const amt = Number(s.amount || s.totalAmount || 0)
            if (mod && amt > 0) modRevs[mod] = (modRevs[mod] || 0) + amt
          }
          setModuleStats(prev => ({
            hospital:  modRevs['hospital']  || modRevs['hosp']       || prev.hospital,
            lab:       modRevs['lab']       || modRevs['laboratory'] || prev.lab,
            pharmacy:  modRevs['pharmacy']  || modRevs['pharma']     || prev.pharmacy,
            radiology: modRevs['radiology'] || modRevs['radio']      || prev.radiology,
            ipd:       modRevs['ipd']       || modRevs['inpatient']  || prev.ipd,
            opd:       modRevs['opd']       || modRevs['outpatient'] || prev.opd,
            ot:        modRevs['ot']        || modRevs['theatre']    || prev.ot,
            emergency: modRevs['emergency'] || modRevs['er']         || prev.emergency,
          }))
        }
      } catch {}

      // ── 5. Financial Reports ───────────────────────────────────────────────
      try { const pl: any = await financeApi.profitLoss({ from: effFrom, to: effTo }); const rev = Number(pl?.netRevenue || pl?.totalRevenue || 0); const exp = Number(pl?.netExpense || pl?.totalExpense || 0); setPlSummary({ revenue: rev, expense: exp, net: rev - exp }) } catch {}
      try { const tb: any = await financeApi.trialBalance({ from: effFrom, to: effTo }); const items = Array.isArray(tb?.items) ? tb.items : Array.isArray(tb) ? tb : []; const td = items.reduce((s: number, i: any) => s + Number(i.debit || 0), 0); const tc2 = items.reduce((s: number, i: any) => s + Number(i.credit || 0), 0); setTrialBalanceDiff(Math.abs(td - tc2)) } catch {}

      // ── 6. Budget, COA, Fiscal Periods, Bank Reconciliation ───────────────
      try { const bva: any = await financeApi.budgetVsActual({ year: new Date().getFullYear() }); setBudgetVsActual(Array.isArray(bva) ? bva.slice(0, 3) : []) } catch {}
      try { const coa: any = await financeApi.listChartOfAccounts({ limit: 1000 }); const accs = coa?.accounts || []; const bt: Record<string, number> = {}; for (const a of accs) { const t = String(a.type || 'Unknown'); if (a.active !== false) bt[t] = (bt[t] || 0) + 1 } setCoaSummary(bt) } catch {}
      try { const fp: any = await financeApi.listFiscalPeriods(); setFiscalPeriods((fp?.items || fp || []).slice(0, 3)) } catch { setFiscalPeriods([]) }
      try { const br: any = await financeApi.listBankReconciliations({ status: 'pending' }); setBankReconciliations((br?.items || br || []).length) } catch { setBankReconciliations(0) }
    } catch (err) {
      console.error('Dashboard load error:', err)
    }
    setLoading(false)
  }, [effFrom, effTo])
  useEffect(() => { load() }, [load])

  // Fallback to cash flow data when P&L returns 0 (no posted vouchers)
  const displayPlSummary = useMemo(() => {
    const hasPlData = plSummary.revenue > 0 || plSummary.expense > 0
    if (hasPlData) return plSummary
    // Use cashIn as revenue and cashOut as expense when P&L is empty
    const fallbackRevenue = cashIn
    const fallbackExpense = cashOut
    return {
      revenue: fallbackRevenue,
      expense: fallbackExpense,
      net: fallbackRevenue - fallbackExpense
    }
  }, [plSummary, cashIn, cashOut])

  const handlePrint = () => { window.print() }
  const handleDownload = () => {
    const data = { from: effFrom, to: effTo, stats, moduleStats, deptStats, plSummary, cashFlowSummary, totalVouchers, postedVouchers, pendingApprovals, cashIn, cashOut, doctorPayoutsTotal, staffSalaries }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finance-dashboard-${effFrom}-to-${effTo}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  const kpiColors = [['#6366f1','#8b5cf6'],['#059669','#10b981'],['#b45309','#f59e0b'],['#0284c7','#0ea5e9'],['#be123c','#f43f5e'],['#7c3aed','#a855f7']]

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-indigo-50/20 to-violet-50/30 p-6 space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl shadow-2xl" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 30%, #1e40af 60%, #4f46e5 100%)' }}>
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"><svg width="100%" height="100%"><defs><pattern id="finDots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#finDots)"/></svg></div>
        <div className="relative px-6 py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 shadow ring-1 ring-white/20"><LayoutDashboard className="h-5 w-5 text-white" /></div>
                <div><p className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/50">Finance Portal</p><h1 className="text-2xl font-extrabold leading-tight tracking-tight">Finance Dashboard</h1></div>
              </div>
              <p className="text-sm text-white/60 ml-14">Comprehensive financial overview across all modules</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20 px-5 py-3 text-white shadow-inner"><p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Revenue</p><p className="text-xl font-extrabold">{money(displayPlSummary.revenue)}</p></div>
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20 px-5 py-3 text-white shadow-inner"><p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Expense</p><p className="text-xl font-extrabold">{money(displayPlSummary.expense)}</p></div>
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20 px-5 py-3 text-white shadow-inner"><p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Net Profit</p><p className={`text-xl font-extrabold ${displayPlSummary.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{money(displayPlSummary.net)}</p></div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 ring-1 ring-white/15"><Calendar className="h-3.5 w-3.5" />{fmtDate(effFrom)} → {fmtDate(effTo)}</div>
            {isFiltered && <span className="rounded-full bg-amber-400/20 px-3 py-1 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-400/30">Filtered</span>}
            <button onClick={handlePrint} className="ml-auto flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/20 transition ring-1 ring-white/15"><Printer className="h-3.5 w-3.5" /> Print</button>
            <button onClick={handleDownload} className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/20 transition ring-1 ring-white/15"><Download className="h-3.5 w-3.5" /> Download</button>
            {loading && <RefreshCw className="h-4 w-4 text-white/60 animate-spin" />}
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><Calendar className="h-4 w-4 text-indigo-500" />Date Range</div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setFrom(todayStr()); setTo(todayStr()) }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">Today</button>
            <button onClick={() => { const d = new Date(); d.setDate(d.getDate() - 7); setFrom(d.toISOString().slice(0, 10)); setTo(todayStr()) }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">This Week</button>
            <button onClick={() => { setFrom(monthStartStr()); setTo(todayStr()) }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">This Month</button>
            <button onClick={() => { setFrom(monthStartStr()); setTo(todayStr()) }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"><RefreshCw className="h-3 w-3 inline" /> Reset</button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1"><label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">From Date</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition" /></div>
          <div className="space-y-1"><label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">To Date</label><input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition" /></div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[{ title: 'Total Vouchers', value: String(totalVouchers), icon: Receipt, sub: 'All types' }, { title: 'Posted Vouchers', value: String(postedVouchers), icon: CheckCircle, sub: 'Finalized' }, { title: 'Pending Approvals', value: String(pendingApprovals), icon: Clock, sub: 'Awaiting approval' }, { title: 'Cash In', value: money(cashIn), icon: ArrowUpRight, sub: 'Cash & Bank inflow' }, { title: 'Cash Out', value: money(cashOut), icon: ArrowDownRight, sub: 'Cash & Bank outflow' }, { title: 'Doctor Payouts', value: money(doctorPayoutsTotal), icon: Users, sub: 'Total paid out' }].map(({ title, value, icon: Icon, sub }, i) => {
          const [c1, c2] = kpiColors[i]
          return (
            <div key={title} className="relative overflow-hidden rounded-2xl p-5 shadow-lg text-white" style={{ background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)` }}>
              <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
              <div className="relative"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-white/90">{title}</p><div className="rounded-xl bg-white/20 p-2"><Icon className="h-5 w-5" /></div></div><p className="mt-3 text-3xl font-extrabold">{value}</p><p className="mt-1 text-xs text-white/70">{sub}</p></div>
            </div>
          )
        })}
      </div>

      {/* Financial Reports */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><TrendingUp className="h-4 w-4" /></div><p className="text-base font-bold text-slate-900">Profit & Loss</p></div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-emerald-50/60 px-4 py-3 border border-emerald-100"><span className="text-sm text-slate-600">Total Revenue</span><span className="text-sm font-bold text-emerald-700">{money(displayPlSummary.revenue)}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-rose-50/60 px-4 py-3 border border-rose-100"><span className="text-sm text-slate-600">Total Expense</span><span className="text-sm font-bold text-rose-700">{money(displayPlSummary.expense)}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 border border-slate-200"><span className="text-sm font-semibold text-slate-700">Net Profit</span><span className={`text-sm font-extrabold ${displayPlSummary.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{money(displayPlSummary.net)}</span></div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600"><CreditCard className="h-4 w-4" /></div><p className="text-base font-bold text-slate-900">Cash Flow</p></div>
          <div className="space-y-3">
            {[{ label: 'Operating', value: cashFlowSummary.operating, color: 'bg-sky-500' }, { label: 'Investing', value: cashFlowSummary.investing, color: 'bg-violet-500' }, { label: 'Financing', value: cashFlowSummary.financing, color: 'bg-amber-500' }].map(cf => (
              <div key={cf.label}><div className="flex items-center justify-between mb-1"><span className="text-xs font-semibold text-slate-500">{cf.label}</span><span className="text-sm font-bold text-slate-800">{money(cf.value)}</span></div><div className="h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${cf.color} transition-all duration-700`} style={{ width: `${Math.min(100, Math.abs(cf.value) > 0 ? 50 : 0)}%` }} /></div></div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"><BookOpen className="h-4 w-4" /></div><p className="text-base font-bold text-slate-900">Trial Balance</p></div>
          <div className="flex flex-col items-center justify-center py-4">
            {trialBalanceDiff === 0 ? (<><div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2"><CheckCircle className="h-7 w-7" /></div><p className="text-sm font-bold text-emerald-700">Balanced</p><p className="text-xs text-slate-500">Debits equal Credits</p></>) : (<><div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-2"><AlertTriangle className="h-7 w-7" /></div><p className="text-sm font-bold text-rose-700">Mismatch</p><p className="text-xs text-slate-500">Difference: {money(trialBalanceDiff)}</p></>)}
          </div>
          <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 border border-slate-100 text-center text-xs text-slate-500">For period {fmtDate(effFrom)} to {fmtDate(effTo)}</div>
        </div>
      </div>

      {/* Shift Management - Shift-wise Finance Controlling */}
      <div className="grid gap-5">
        <div className="rounded-2xl border border-slate-200/60 bg-linear-to-br from-white/90 to-slate-50/90 backdrop-blur-xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-purple-600 text-white shadow-lg">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">Shift-wise Finance Control</p>
              <p className="text-sm text-slate-500">Manage cash handovers and track shift performance</p>
            </div>
          </div>
          <ShiftDashboard counterId="main-counter" counterName="Main Reception" />
        </div>
      </div>

      {/* Vouchers Section */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <p className="text-base font-bold text-slate-900 mb-1">Vouchers by Type</p>
          <p className="text-xs text-slate-500 mb-4">Distribution across voucher types</p>
          <div className="space-y-2">
            {Object.entries(voucherTypes).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 border border-slate-100"><span className="text-xs font-semibold text-slate-700">{type}</span><span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">{count}</span></div>
            ))}
            {Object.keys(voucherTypes).length === 0 && <p className="text-sm text-slate-400 text-center py-4">No vouchers found</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><Receipt className="h-4 w-4 text-indigo-500" /><p className="text-base font-bold text-slate-900">Recent Vouchers</p></div>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">Latest 5</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400"><th className="pb-2 pr-3">Type</th><th className="pb-2 pr-3">Date</th><th className="pb-2 pr-3">Payee</th><th className="pb-2 pr-3 text-right">Amount</th><th className="pb-2">Status</th></tr></thead>
              <tbody>
                {recentVouchers.map((v: any, i: number) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 pr-3"><span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">{v.voucherType || '-'}</span></td>
                    <td className="py-2.5 pr-3 text-slate-600">{fmtDate(v.dateIso)}</td>
                    <td className="py-2.5 pr-3 text-slate-700 truncate max-w-[140px]">{v.payee || '-'}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold text-slate-800">{money(v.totalAmount || v.amount || 0)}</td>
                    <td className="py-2.5"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${v.status === 'posted' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : v.status === 'pending' ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-slate-50 text-slate-600 ring-slate-200'}`}>{v.status || 'draft'}</span></td>
                  </tr>
                ))}
                {recentVouchers.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400 text-sm">No vouchers found for selected period</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Module Revenue Breakdown */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
        <p className="text-base font-bold text-slate-900 mb-1">Module Revenue Breakdown</p>
        <p className="text-xs text-slate-500 mb-4">Revenue by module for selected period</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[{ label: 'Hospital', value: moduleStats.hospital, icon: Building2, color: 'bg-violet-50 text-violet-600 border-violet-200' }, { label: 'Lab', value: moduleStats.lab, icon: FlaskConical, color: 'bg-sky-50 text-sky-600 border-sky-200' }, { label: 'Pharmacy', value: moduleStats.pharmacy, icon: BarChart3, color: 'bg-rose-50 text-rose-600 border-rose-200' }, { label: 'Radiology', value: moduleStats.radiology, icon: Scan, color: 'bg-amber-50 text-amber-600 border-amber-200' }, { label: 'IPD', value: moduleStats.ipd, icon: Bed, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' }, { label: 'OPD', value: moduleStats.opd, icon: Stethoscope, color: 'bg-indigo-50 text-indigo-600 border-indigo-200' }, { label: 'OT', value: moduleStats.ot, icon: Scissors, color: 'bg-pink-50 text-pink-600 border-pink-200' }, { label: 'Emergency', value: moduleStats.emergency, icon: DoorOpen, color: 'bg-red-50 text-red-600 border-red-200' }].map(m => (
          <div key={m.label} className={`rounded-xl border p-4 ${m.color}`}>
            <div className="flex items-center justify-between mb-2">
              <m.icon className="h-5 w-5 shrink-0" />
              <span className="text-xs font-bold">{m.label}</span>
            </div>
            <p className="text-lg font-extrabold">{money(m.value)}</p>
          </div>
        ))}
        </div>
      </div>

      {/* Department-wise Revenue */}
      {Object.keys(deptStats).length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <p className="text-base font-bold text-slate-900 mb-1">Department-wise Revenue</p>
          <p className="text-xs text-slate-500 mb-4">Revenue breakdown by department</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(deptStats).sort((a, b) => b[1] - a[1]).map(([dept, amount]) => (
              <div key={dept} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 border border-slate-100">
                <span className="text-sm font-semibold text-slate-700">{dept}</span>
                <span className="text-sm font-bold text-indigo-600">{money(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payroll Summary */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600"><UserCog className="h-4 w-4" /></div><p className="text-base font-bold text-slate-900">Payroll Summary</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg bg-purple-50 px-4 py-3 border border-purple-100">
            <span className="text-sm font-semibold text-slate-700">Doctor Payouts</span>
            <span className="text-sm font-bold text-purple-700">{money(doctorPayoutsTotal)}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3 border border-blue-100">
            <span className="text-sm font-semibold text-slate-700">Staff Salaries</span>
            <span className="text-sm font-bold text-blue-700">{money(staffSalaries)}</span>
          </div>
        </div>
      </div>

      {/* Budget & COA */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600"><PieChart className="h-4 w-4" /></div><p className="text-base font-bold text-slate-900">Budget vs Actual</p></div>
          <div className="space-y-3">
            {budgetVsActual.map((b: any, i: number) => { const budget = Number(b.budgetAmount || b.budget || 0); const actual = Number(b.actual || b.spent || 0); const pct = budget > 0 ? Math.min(100, Math.round((actual / budget) * 100)) : 0; return (<div key={i}><div className="flex items-center justify-between mb-1"><span className="text-xs font-semibold text-slate-600">{b.costCenter || b.name || '—'}</span><span className="text-[11px] font-bold text-slate-500">{pct}%</span></div><div className="h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500 transition-all duration-700" style={{ width: `${pct}%` }} /></div><div className="flex justify-between mt-0.5 text-[10px] text-slate-400"><span>{money(actual)} spent</span><span>{money(budget)} budget</span></div></div>) })}
            {budgetVsActual.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No budget data</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600"><Landmark className="h-4 w-4" /></div><p className="text-base font-bold text-slate-900">Chart of Accounts</p></div>
          <div className="space-y-2">
            {Object.entries(coaSummary).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 border border-slate-100"><span className="text-xs font-semibold text-slate-700">{type}</span><span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700">{count}</span></div>
            ))}
            {Object.keys(coaSummary).length === 0 && <p className="text-sm text-slate-400 text-center py-4">No accounts data</p>}
          </div>
        </div>
      </div>

      {/* Pending Actions */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600"><Shield className="h-4 w-4" /></div><p className="text-base font-bold text-slate-900">Pending Actions</p></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 border border-slate-100"><span className="text-sm font-semibold text-slate-700">Pending Approvals</span><span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">{pendingApprovals}</span></div>
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 border border-slate-100"><span className="text-sm font-semibold text-slate-700">Bank Reconciliations</span><span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-700">{bankReconciliations}</span></div>
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 border border-slate-100"><span className="text-sm font-semibold text-slate-700">Fiscal Periods Active</span><span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">{fiscalPeriods.length}</span></div>
        </div>
      </div>

    </div>
  )
}
