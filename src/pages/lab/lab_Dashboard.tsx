/**
 * Lab Dashboard — modern, eye-catching ERP-style overview.
 *
 * Data sources (already exist in labApi):
 *   - labApi.dashboardSummary()  → today counts + recent activity
 *   - labApi.reportsSummary({from,to}) → dailyRevenue, comparison, totals
 *
 * Charts are built as lightweight SVG primitives (no external chart library)
 * so the dashboard stays instant on first paint.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { labApi } from '../../utils/api'
import {
  TrendingUp, TrendingDown, AlertTriangle, Ban, RefreshCw, Clock, Bell,
  FlaskConical, FileCheck2, TestTube, Package, Activity as ActivityIcon,
  CheckCircle2, Hourglass, ThumbsUp, Printer, ArrowUpRight, Wallet,
  LineChart, Sparkles, CircleDot, FilePlus2, Scan, Receipt,
} from 'lucide-react'
import DateRangeFilter from '../../components/finance/finance_DateRange'
import { api } from '../../api'

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function fmtRs(n: number){
  const v = Number(n || 0)
  return `Rs ${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}
function pad(n: number){ return String(n).padStart(2, '0') }
function iso(d: Date){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` }
function firstOfMonth(){ const d = new Date(); return iso(new Date(d.getFullYear(), d.getMonth(), 1)) }
function todayIso(){ return iso(new Date()) }

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------

type KPITone = 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'sky' | 'slate'

const TONE: Record<KPITone, { bg: string; text: string; chip: string }> = {
  blue:   { bg: 'from-indigo-500 to-sky-600',      text: 'text-sky-600',     chip: 'bg-sky-50 text-sky-700' },
  green:  { bg: 'from-emerald-500 to-teal-600',    text: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-700' },
  amber:  { bg: 'from-amber-500 to-orange-600',    text: 'text-amber-600',   chip: 'bg-amber-50 text-amber-700' },
  rose:   { bg: 'from-rose-500 to-pink-600',       text: 'text-rose-600',    chip: 'bg-rose-50 text-rose-700' },
  violet: { bg: 'from-violet-500 to-indigo-600',   text: 'text-violet-600',  chip: 'bg-violet-50 text-violet-700' },
  sky:    { bg: 'from-sky-500 to-cyan-600',        text: 'text-sky-600',     chip: 'bg-sky-50 text-sky-700' },
  slate:  { bg: 'from-slate-500 to-slate-700',     text: 'text-slate-600',   chip: 'bg-slate-50 text-slate-700' },
}

function KPICard({ label, value, icon: Icon, tone = 'blue', delta, sublabel, onClick }: {
  label: string; value: React.ReactNode; icon: any; tone?: KPITone; delta?: { text: string; up?: boolean }; sublabel?: string; onClick?: () => void
}){
  const t = TONE[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-4xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:shadow-none"
    >
      {/* Dynamic background glow */}
      <div className={`absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-10 blur-2xl transition-all group-hover:scale-150 bg-linear-to-br ${t.bg}`} />
      
      <div className="flex items-start justify-between">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-xl bg-linear-to-br ${t.bg} ring-4 ring-white dark:ring-slate-800`}>
          <Icon className="h-7 w-7 transition-transform group-hover:scale-110" />
        </div>
        {delta && (
          <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-tighter shadow-sm ${delta.up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {delta.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta.text}
          </div>
        )}
      </div>
      
      <div className="mt-6 flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</span>
        <span className="mt-1 text-3xl font-black tracking-tighter text-slate-900 dark:text-white">{value}</span>
        {sublabel && (
          <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <div className={`h-1.5 w-1.5 rounded-full bg-linear-to-br ${t.bg}`} />
            {sublabel}
          </div>
        )}
      </div>
      
      {/* Bottom accent line */}
      <div className={`absolute bottom-0 left-0 h-1 w-0 bg-linear-to-r transition-all duration-500 group-hover:w-full ${t.bg}`} />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Charts (SVG, self-contained)
// ---------------------------------------------------------------------------

/** Smooth area chart for daily revenue. */
function AreaChart({ data, height = 220 }: { data: Array<{ date: string; value: number }>; height?: number }){
  const padL = 8, padR = 8, padT = 12, padB = 26
  const w = 640, h = height
  const values = data.map(d => d.value)
  const max = Math.max(1, ...values)
  const stepX = data.length > 1 ? (w - padL - padR) / (data.length - 1) : 0
  const y = (v: number) => padT + (h - padT - padB) * (1 - v / max)
  const pts = data.map((d, i) => [padL + i * stepX, y(d.value)] as const)
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const areaPath = pts.length
    ? `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${(h - padB).toFixed(1)} L${padL.toFixed(1)},${(h - padB).toFixed(1)} Z`
    : ''

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <defs>
        <linearGradient id="lab-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* grid */}
      {[0.25, 0.5, 0.75, 1].map((r, i) => (
        <line key={i} x1={padL} y1={padT + (h - padT - padB) * r} x2={w - padR} y2={padT + (h - padT - padB) * r} stroke="#e2e8f0" strokeDasharray="3,4" />
      ))}

      {areaPath && <path d={areaPath} fill="url(#lab-area)" />}
      {linePath && <path d={linePath} fill="none" stroke="#2563eb" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3} fill="#2563eb" stroke="#fff" strokeWidth={1.5} />
      ))}

      {/* x labels — show a subset to keep readable */}
      {data.map((d, i) => {
        if (data.length > 8 && i % Math.ceil(data.length / 7) !== 0 && i !== data.length - 1) return null
        const xPos = padL + i * stepX
        const short = d.date.slice(5) // MM-DD
        return <text key={i} x={xPos} y={h - 6} textAnchor="middle" fontSize={10} fill="#64748b">{short}</text>
      })}
    </svg>
  )
}

/** Bar chart for a few categorical comparisons (Revenue / Expenses / Purchases). */
function BarChart({ data, height = 220, colors = ['#3b82f6', '#f43f5e', '#f59e0b'] }: {
  data: Array<{ label: string; value: number }>; height?: number; colors?: string[]
}){
  const padL = 48, padR = 12, padT = 12, padB = 28
  const w = 480, h = height
  const max = Math.max(1, ...data.map(d => d.value))
  const innerW = w - padL - padR
  const innerH = h - padT - padB
  const barW = innerW / (data.length * 1.6)
  const gap = (innerW - barW * data.length) / (data.length + 1)

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {/* grid + y-labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
        const yy = padT + innerH * (1 - r)
        return (
          <g key={i}>
            <line x1={padL} y1={yy} x2={w - padR} y2={yy} stroke="#e2e8f0" strokeDasharray="3,4" />
            <text x={padL - 6} y={yy + 3} textAnchor="end" fontSize={9} fill="#94a3b8">{Math.round(max * r).toLocaleString()}</text>
          </g>
        )
      })}

      {data.map((d, i) => {
        const bh = (d.value / max) * innerH
        const x = padL + gap + i * (barW + gap)
        const y = padT + innerH - bh
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barW} height={bh} rx={6} fill={colors[i % colors.length]} />
            <text x={x + barW / 2} y={h - 10} textAnchor="middle" fontSize={10} fill="#475569">{d.label}</text>
            <text x={x + barW / 2} y={Math.max(y - 6, padT + 10)} textAnchor="middle" fontSize={11} fontWeight={600} fill="#0f172a">{d.value.toLocaleString()}</text>
          </g>
        )
      })}
    </svg>
  )
}

/** Small donut chart with a center label. */
function Donut({ data, size = 160, thickness = 18 }: {
  data: Array<{ label: string; value: number; color: string }>; size?: number; thickness?: number
}){
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0))
  const r = size / 2
  const ri = r - thickness
  let start = -Math.PI / 2
  const arcs = data.map(d => {
    const frac = d.value / total
    const end = start + frac * Math.PI * 2
    const large = end - start > Math.PI ? 1 : 0
    const x1 = r + r * Math.cos(start), y1 = r + r * Math.sin(start)
    const x2 = r + r * Math.cos(end),   y2 = r + r * Math.sin(end)
    const xi1 = r + ri * Math.cos(end),  yi1 = r + ri * Math.sin(end)
    const xi2 = r + ri * Math.cos(start),yi2 = r + ri * Math.sin(start)
    const path = `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${xi1},${yi1} A${ri},${ri} 0 ${large} 0 ${xi2},${yi2} Z`
    start = end
    return { path, color: d.color }
  })
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs.map((a, i) => <path key={i} d={a.path} fill={a.color} />)}
        <circle cx={r} cy={r} r={ri - 1} fill="white" />
        <text x={r} y={r - 4} textAnchor="middle" fontSize={12} fill="#64748b">Total</text>
        <text x={r} y={r + 16} textAnchor="middle" fontSize={20} fontWeight={700} fill="#0f172a">{total}</text>
      </svg>
      <div className="flex flex-col gap-1 text-sm">
        {data.map(d => (
          <div key={d.label} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              {d.label}
            </span>
            <span className="font-semibold text-slate-900">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------

type Summary = {
  todaysTests: number; pendingReports: number; completedToday: number; samplesReceived: number
  pendingReceived: number; lowReagents: number; outOfStock: number; at: string; recentActivity?: any[]
}
type Reports = {
  totalTests: number; totalOrders: number; totalExpenses: number; totalRevenue: number
  pendingResults: number; pendingApproval: number; completedTests: number
  totalPurchases: number; totalPurchasesAmount: number
  totalReceived: number; totalReceivable: number
  dailyRevenue: Array<{ date: string; value: number }>
  comparison: Array<{ label: string; value: number }>
}

export default function Lab_Dashboard(){
  const navigate = useNavigate()
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo]     = useState(todayIso())
  const [today, setToday] = useState<Summary | null>(null)
  const [rep, setRep]     = useState<Reports | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const [critEvents, setCritEvents] = useState<Array<{ _id: string; patientName?: string; testName?: string; parameter: string; value: string; detectedAt: string }>>([])
  const [collectionCenters, setCollectionCenters] = useState<Array<{ _id: string; name: string }>>([])
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([])
  const [selectedCenterId, setSelectedCenterId] = useState('')
  const [selectedWardId, setSelectedWardId] = useState('')
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  useEffect(() => {
    let alive = true
    ;(async () => {
      try { const r: any = await api('/lab/critical-events?status=open&limit=10'); if (alive) setCritEvents(r.items || []) } catch { if (alive) setCritEvents([]) }
    })()
    return () => { alive = false }
  }, [tick])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const [s, r]: any[] = await Promise.all([
          labApi.dashboardSummary({
            collectionCenterId: selectedCenterId || undefined,
            wardId: selectedWardId || undefined,
            referringDoctorId: selectedDoctorId || undefined,
          }),
          labApi.reportsSummary({
            from, to,
            collectionCenterId: selectedCenterId || undefined,
            wardId: selectedWardId || undefined,
            referringDoctorId: selectedDoctorId || undefined,
          }),
        ])
        if (!alive) return
        setToday(s as Summary)
        setRep(r as Reports)
      } catch { if (alive){ setToday(null); setRep(null) } }
      finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [tick, from, to, selectedCenterId, selectedWardId, selectedDoctorId])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [ccRes, docRes] = await Promise.all([
          labApi.listCollectionCenters({ limit: 100 }),
          labApi.listDoctors(),
        ])
        if (!alive) return
        setCollectionCenters((ccRes.items || []).map((c: any) => ({ _id: c._id, name: c.name })))
        setDoctors((docRes.items || []).map((d: any) => ({ _id: d._id, name: d.name })))
      } catch {}
    })()
    return () => { alive = false }
  }, [])

  // Derived stats
  const collectionRatio = useMemo(() => {
    if (!rep) return 0
    const outstanding = Math.max(0, rep.totalReceivable - rep.totalReceived)
    const target = rep.totalReceivable || 1
    return Math.round((1 - outstanding / target) * 100)
  }, [rep])

  const profit = rep ? rep.totalRevenue - rep.totalExpenses - rep.totalPurchasesAmount : 0
  const peakRev = useMemo(() => rep?.dailyRevenue.reduce((m, d) => Math.max(m, d.value), 0) || 0, [rep])
  const avgRev = useMemo(() => {
    if (!rep?.dailyRevenue?.length) return 0
    const total = rep.dailyRevenue.reduce((s, d) => s + d.value, 0)
    return Math.round(total / rep.dailyRevenue.length)
  }, [rep])
  const avgOrder = useMemo(() => {
    if (!rep || !rep.totalOrders || rep.totalOrders === 0) return 0
    return Math.round(rep.totalRevenue / rep.totalOrders)
  }, [rep])

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-white p-6 dark:bg-slate-950">
      {/* Header row */}
      <div className="group relative mb-8 rounded-[2.5rem] bg-linear-to-r from-indigo-700 via-violet-600 to-sky-500 p-8 text-white shadow-2xl shadow-indigo-200/50 transition-all hover:shadow-indigo-300/60 dark:shadow-none">
        <div className="absolute inset-0 overflow-hidden rounded-[2.5rem]">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl transition-all group-hover:scale-110" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl transition-all group-hover:scale-110" />
        </div>
        
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-md">
              <ActivityIcon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter sm:text-4xl">Lab Dashboard</h1>
              <div className="mt-1 flex items-center gap-2 text-indigo-100/80">
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-amber-300" />
                <p className="text-[10px] sm:text-sm font-bold uppercase tracking-widest">{`Insights · ${from} to ${to}`}</p>
              </div>
            </div>
          </div>
          
          <div className="flex w-full sm:w-auto flex-wrap items-center gap-3">
            <div className="relative z-50 w-full sm:w-auto rounded-2xl bg-white/10 p-1 backdrop-blur-md">
              <DateRangeFilter value={{ from, to }} onChange={r => { setFrom(r.from); setTo(r.to) }} />
            </div>
            <div className="flex w-full sm:w-auto flex-wrap items-center gap-2">
              <select
                value={selectedCenterId}
                onChange={e => setSelectedCenterId(e.target.value)}
                className="h-10 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-bold text-white backdrop-blur-md outline-none focus:bg-white/20"
              >
                <option value="" className="text-slate-900">All Centers</option>
                {collectionCenters.map(c => (
                  <option key={c._id} value={c._id} className="text-slate-900">{c.name}</option>
                ))}
              </select>
              <select
                value={selectedWardId}
                onChange={e => setSelectedWardId(e.target.value)}
                className="h-10 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-bold text-white backdrop-blur-md outline-none focus:bg-white/20"
              >
                <option value="" className="text-slate-900">All Wards</option>
                <option value="ward_1" className="text-slate-900">Ward 1</option>
                <option value="ward_2" className="text-slate-900">Ward 2</option>
                <option value="ward_3" className="text-slate-900">Ward 3</option>
              </select>
              <select
                value={selectedDoctorId}
                onChange={e => setSelectedDoctorId(e.target.value)}
                className="h-10 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-bold text-white backdrop-blur-md outline-none focus:bg-white/20"
              >
                <option value="" className="text-slate-900">All Doctors</option>
                {doctors.map(d => (
                  <option key={d._id} value={d._id} className="text-slate-900">{d.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={() => setTick(t => t + 1)} 
                className="flex flex-1 sm:flex-initial h-10 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-black uppercase tracking-widest text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="inline sm:inline">Sync</span>
              </button>
              <button 
                onClick={() => window.print()} 
                className="flex flex-1 sm:flex-initial h-10 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-black uppercase tracking-widest text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
              >
                <Printer className="h-4 w-4" />
                <span className="inline sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <KPICard
          label="Today's Tests"
          value={loading ? '…' : (today?.todaysTests ?? 0)}
          icon={FlaskConical}
          tone="blue"
          sublabel={`${today?.samplesReceived ?? 0} samples received`}
          onClick={() => navigate('/lab/orders')}
        />
        <KPICard
          label="Pending Reports"
          value={loading ? '…' : (today?.pendingReports ?? 0)}
          icon={Hourglass}
          tone="amber"
          sublabel="awaiting result entry"
          onClick={() => navigate('/lab/results')}
        />
        <KPICard
          label="Pending Received"
          value={loading ? '…' : (today?.pendingReceived ?? 0)}
          icon={Clock}
          tone="rose"
          sublabel="samples not yet received"
          onClick={() => navigate('/lab/tracking')}
        />
        <KPICard
          label="Total Tests"
          value={loading ? '…' : (rep?.totalTests ?? 0)}
          icon={TestTube}
          tone="sky"
          sublabel={`${from} → ${to}`}
          onClick={() => navigate('/lab/orders')}
        />
        <KPICard
          label="Completed Today"
          value={loading ? '…' : (today?.completedToday ?? 0)}
          icon={CheckCircle2}
          tone="green"
          sublabel="orders closed today"
          onClick={() => navigate('/lab/reports')}
        />
        <KPICard
          label="Revenue (period)"
          value={loading ? '…' : fmtRs(rep?.totalRevenue || 0)}
          icon={Wallet}
          tone="violet"
          sublabel={peakRev ? `Peak day: ${fmtRs(peakRev)}` : undefined}
          delta={rep && avgOrder > 0 ? { up: true, text: `AVG ORDER ${fmtRs(avgOrder)}` } : undefined}
        />
      </div>

      {/* Second KPI row */}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <MiniStat label="Total Tests"   value={loading ? '…' : (rep?.totalTests ?? 0)} icon={TestTube} tone="sky" />
        <MiniStat label="Total Orders"  value={loading ? '…' : (rep?.totalOrders ?? 0)} icon={FileCheck2} tone="blue" />
        <MiniStat label="Received"      value={loading ? '…' : fmtRs(rep?.totalReceived || 0)} icon={ThumbsUp} tone="green" />
        <MiniStat label="Receivable"    value={loading ? '…' : fmtRs(rep?.totalReceivable || 0)} icon={Receipt} tone="amber" />
        <MiniStat label="Low Reagents"  value={loading ? '…' : (today?.lowReagents ?? 0)} icon={AlertTriangle} tone="amber" />
        <MiniStat label="Out of Stock"  value={loading ? '…' : (today?.outOfStock ?? 0)} icon={Ban} tone="rose" />
      </div>

      {/* Critical Values widget */}
      <section className="mt-5 overflow-hidden rounded-[2.5rem] border border-rose-100 bg-white shadow-xl shadow-rose-100/20 dark:border-rose-900/30 dark:bg-slate-900 dark:shadow-none">
        <div className="flex items-center justify-between border-b border-rose-50 bg-rose-50/30 px-8 py-6 dark:border-rose-900/20 dark:bg-rose-950/10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-200 dark:shadow-rose-900/40">
                <Bell className="h-6 w-6 animate-swing" />
              </span>
              <span className="absolute -right-1 -top-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex h-4 w-4 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900"></span>
              </span>
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Critical Alerts</h2>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-500/80">Life-Threatening Values Detected</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/lab/critical-values')} 
            className="group flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-rose-600 shadow-sm transition-all hover:bg-rose-600 hover:text-white dark:bg-slate-800 dark:hover:bg-rose-600"
          >
            Monitor All <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>

        <div className="p-2">
          {critEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <CheckCircle2 className="mb-3 h-12 w-12 opacity-20" />
              <p className="font-bold uppercase tracking-widest">No Critical Events Open</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-2 px-4">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-4 py-3 text-left">Timestamp</th>
                    <th className="px-4 py-3 text-left">Patient Details</th>
                    <th className="px-4 py-3 text-left">Investigation</th>
                    <th className="px-4 py-3 text-left">Critical Parameter</th>
                    <th className="px-4 py-3 text-right">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {critEvents.map((e) => (
                    <tr key={e._id} className="group transition-all hover:scale-[1.01]">
                      <td className="rounded-l-2xl bg-slate-50 px-4 py-4 dark:bg-slate-800/50">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                            {new Date(e.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="mt-1 text-[10px] font-medium text-slate-400">
                          {new Date(e.detectedAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="bg-slate-50 px-4 py-4 dark:bg-slate-800/50">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-black text-rose-600 shadow-sm dark:bg-slate-700">
                            {e.patientName?.charAt(0).toUpperCase() || 'P'}
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-900 dark:text-white">{e.patientName || 'Unknown Patient'}</div>
                            <div className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter">Emergency Case</div>
                          </div>
                        </div>
                      </td>
                      <td className="bg-slate-50 px-4 py-4 dark:bg-slate-800/50">
                        <div className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm dark:bg-slate-700 dark:text-slate-200">
                          <FlaskConical className="h-3.5 w-3.5 text-blue-500" />
                          {e.testName || 'Investigation'}
                        </div>
                      </td>
                      <td className="bg-slate-50 px-4 py-4 dark:bg-slate-800/50">
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{e.parameter}</div>
                        <div className="text-[10px] font-medium text-rose-500 uppercase tracking-widest mt-0.5">Alert Threshold Hit</div>
                      </td>
                      <td className="rounded-r-2xl bg-slate-50 px-4 py-4 text-right dark:bg-slate-800/50">
                        <div className="inline-flex flex-col items-end">
                          <span className="text-xl font-black text-rose-600 drop-shadow-sm">{e.value}</span>
                          <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                            <AlertTriangle className="h-2.5 w-2.5" /> High Alert
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue trend */}
        <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-2xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none lg:col-span-2">
          <div className="relative mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner dark:bg-blue-900/20">
                <LineChart className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Revenue Analytics</h3>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Periodic Growth Trends</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Total Period Revenue</span>
              <span className="text-xl font-black text-blue-600 drop-shadow-sm">{fmtRs(rep?.totalRevenue || 0)}</span>
            </div>
          </div>
          <div className="relative h-[240px] w-full">
            {rep && rep.dailyRevenue.length > 0 ? <AreaChart data={rep.dailyRevenue} height={240} /> : <EmptyState text="No revenue in this period" />}
          </div>
        </section>

        {/* Test status donut */}
        <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-2xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 shadow-inner dark:bg-violet-900/20">
              <CircleDot className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Workload</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Distribution by Status</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center">
            {rep ? (
              <Donut size={200} thickness={24} data={[
                { label: 'Pending Results',  value: rep.pendingResults,  color: '#f59e0b' },
                { label: 'Awaiting Approval', value: rep.pendingApproval, color: '#8b5cf6' },
                { label: 'Verified & Done',    value: rep.completedTests,  color: '#10b981' },
              ]} />
            ) : <EmptyState text="No data available" />}
          </div>
        </section>
      </div>

      {/* Financial comparison + Collection ratio */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-2xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner dark:bg-emerald-900/20">
                <ActivityIcon className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Performance Overview</h3>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Revenue vs Expenditures</p>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-2 dark:bg-slate-800">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Net Profitability</span>
              <span className={`text-lg font-black ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtRs(profit)}</span>
            </div>
          </div>
          <div className="relative h-[240px] w-full">
            {rep ? <BarChart data={rep.comparison} height={240} /> : <EmptyState text="No comparison data" />}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-2xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 shadow-inner dark:bg-sky-900/20">
              <ThumbsUp className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Collection Index</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Cash Flow Efficiency</p>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <div className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">{collectionRatio}%</div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  Received: {fmtRs(rep?.totalReceived || 0)}
                </div>
                <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  Pending: {fmtRs(Math.max(0, (rep?.totalReceivable || 0) - (rep?.totalReceived || 0)))}
                </div>
              </div>
            </div>
            <div className="mt-6 h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div 
                className="h-full rounded-full bg-linear-to-r from-emerald-400 via-sky-500 to-indigo-600 transition-all duration-1000" 
                style={{ width: `${collectionRatio}%` }} 
              />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Purchases</div>
                <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">{rep?.totalPurchases ?? 0}</div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Avg. Daily</div>
                <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">{fmtRs(avgRev)}</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Quick actions */}
      <section className="mt-6 rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-2xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <div className="mb-6 flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 shadow-inner dark:bg-amber-900/20">
            <Sparkles className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Quick Access</h3>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Launch Laboratory Modules</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          <QuickAction label="Generate Token"   to="/lab/orders"          icon={FilePlus2} tone="blue" />
          <QuickAction label="Today's Tokens"   to="/lab/today-tokens"    icon={TestTube}  tone="sky" />
          <QuickAction label="Track Sample"     to="/lab/tracking"        icon={Scan}      tone="violet" />
          <QuickAction label="Enter Result"     to="/lab/results"         icon={FileCheck2} tone="amber" />
          <QuickAction label="Lab Reports"      to="/lab/reports"         icon={LineChart} tone="green" />
          <QuickAction label="Inventory"        to="/lab/inventory"       icon={Package}   tone="rose" />
        </div>
      </section>

      {/* Activity + Alerts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-2xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner dark:bg-blue-900/20">
                <ActivityIcon className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Operations Feed</h3>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Live Laboratory Stream</p>
              </div>
            </div>
            <button onClick={() => navigate('/lab/audit-logs')} className="rounded-xl bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-slate-100 dark:bg-slate-800">
              Full Log
            </button>
          </div>
          {!today?.recentActivity || today.recentActivity.length === 0 ? (
            <EmptyState text="No recent activity" />
          ) : (
            <ul className="max-h-[360px] divide-y divide-slate-100 overflow-y-auto">
              {today.recentActivity.map((item: any, i: number) => {
                const cls = item.type === 'token' ? 'bg-blue-50 text-blue-600'
                          : item.type === 'order' ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-violet-50 text-violet-600'
                return (
                  <li key={i} className="flex items-start gap-3 py-3">
                    <span className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg ${cls}`}>
                      {item.type === 'token' ? <FilePlus2 className="h-4 w-4" /> : item.type === 'order' ? <TestTube className="h-4 w-4" /> : <FileCheck2 className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="truncate text-sm font-medium text-slate-800">{item.title}</div>
                        <span className="shrink-0 text-xs text-slate-400">{new Date(item.at).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        <span className="font-medium">Patient:</span> {item.patient}
                        {item.by && item.by !== '-' && <span className="ml-2"><span className="font-medium">By:</span> {item.by}</span>}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-2xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-inner dark:bg-amber-900/20">
              <AlertTriangle className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Active Alerts</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">System Monitoring</p>
            </div>
          </div>
          <ul className="space-y-3">
            {today && today.outOfStock > 0 && (
              <AlertRow icon={Ban} tone="rose" title="Out-of-stock reagents" detail={`${today.outOfStock} reagent${today.outOfStock !== 1 ? 's' : ''} fully depleted`} action={{ label: 'View inventory', to: '/lab/inventory' }} />
            )}
            {today && today.lowReagents > 0 && (
              <AlertRow icon={AlertTriangle} tone="amber" title="Low reagent levels" detail={`${today.lowReagents} reagent${today.lowReagents !== 1 ? 's' : ''} below threshold`} action={{ label: 'Reorder', to: '/lab/inventory' }} />
            )}
            {today && today.pendingReports > 0 && (
              <AlertRow icon={Hourglass} tone="amber" title="Pending reports" detail={`${today.pendingReports} awaiting result entry`} action={{ label: 'Enter results', to: '/lab/results' }} />
            )}
            {rep && rep.pendingApproval > 0 && (
              <AlertRow icon={ThumbsUp} tone="violet" title="Awaiting approval" detail={`${rep.pendingApproval} result${rep.pendingApproval !== 1 ? 's' : ''} waiting for verification`} action={{ label: 'Approve', to: '/lab/report-approval' }} />
            )}
            {rep && rep.totalReceivable > rep.totalReceived && (
              <AlertRow
                icon={Wallet}
                tone="blue"
                title="Outstanding collections"
                detail={`${fmtRs(rep.totalReceivable - rep.totalReceived)} still to be collected`}
                action={{ label: 'Open payments', to: '/lab/pay-in-out' }}
              />
            )}
            {today && today.outOfStock === 0 && today.lowReagents === 0 && today.pendingReports === 0 && (!rep || rep.pendingApproval === 0) && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                All systems nominal — no critical alerts.
              </div>
            )}
          </ul>
        </section>
      </div>

      {/* Footer */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Last updated: {today ? new Date(today.at).toLocaleString() : '—'}</div>
        <div>HealthSpire · Hospital Management System</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function MiniStat({ label, value, icon: Icon, tone = 'blue' }: { label: string; value: React.ReactNode; icon: any; tone?: KPITone }){
  const t = TONE[tone]
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${t.chip}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
        <div className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{value}</div>
      </div>
    </div>
  )
}

function QuickAction({ label, to, icon: Icon, tone = 'blue' }: { label: string; to: string; icon: any; tone?: KPITone }){
  const navigate = useNavigate()
  const t = TONE[tone]
  return (
    <button
      onClick={() => navigate(to)}
      className="group flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-indigo-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-none"
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg bg-linear-to-br transition-transform group-hover:scale-110 ${t.bg}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex flex-col items-center">
        <span className="text-xs font-black tracking-tight text-slate-700 dark:text-slate-200">{label}</span>
        <ArrowUpRight className="mt-1 h-3.5 w-3.5 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-sky-500" />
      </div>
    </button>
  )
}

function AlertRow({ icon: Icon, tone, title, detail, action }: { icon: any; tone: KPITone; title: string; detail: string; action?: { label: string; to: string } }){
  const navigate = useNavigate()
  const t = TONE[tone]
  return (
    <li className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.chip}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="text-xs text-slate-500">{detail}</div>
      </div>
      {action && (
        <button onClick={() => navigate(action.to)} className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
          {action.label}
        </button>
      )}
    </li>
  )
}

function EmptyState({ text }: { text: string }){
  return <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">{text}</div>
}
