/**
 * Finance ERP Dashboard — modern, eye-catching redesign.
 *
 * Data: GET /finance/dashboard?from&to  (see backend reports.controller.ts)
 * Returns: kpi, moduleRevenue, receivables, payables, cash, dailyTrend, recentExpenses
 *
 * All charts are hand-rolled SVG (no external chart library) to keep the
 * bundle small and the first paint instant.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { financeApi } from '../../utils/api'
import { fmtRs, firstOfMonth, todayIso } from '../../components/finance/finance_ui'
import DateRangeFilter from '../../components/finance/finance_DateRange'
import { printFinanceReport } from '../../components/finance/finance_print'
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank, Printer, RefreshCw, ArrowUpRight,
  Receipt, Users, Building2, Stethoscope, Banknote, Landmark, Sparkles,
  FileSpreadsheet, Scale, BarChart3, CircleDot, AlertTriangle, Clock,
  ArrowDownRight, CreditCard,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Module palette (shared across module-revenue bar & donut)
// ---------------------------------------------------------------------------

const MODULE_META: Record<string, { label: string; color: string }> = {
  OPD_REVENUE:             { label: 'OPD',             color: '#6366f1' },
  IPD_REVENUE:             { label: 'IPD',             color: '#2563eb' },
  ER_REVENUE:              { label: 'Emergency',       color: '#0891b2' },
  PROCEDURE_REVENUE:       { label: 'Procedures',      color: '#7c3aed' },
  LAB_REVENUE:             { label: 'Lab',             color: '#10b981' },
  PHARMACY_REVENUE:        { label: 'Pharmacy',        color: '#f59e0b' },
  INDOOR_PHARMACY_REVENUE: { label: 'Indoor Pharmacy', color: '#d97706' },
  DIAGNOSTIC_REVENUE:      { label: 'Diagnostic',      color: '#ef4444' },
  RADIOLOGY_REVENUE:       { label: 'Radiology',       color: '#dc2626' },
  AESTHETIC_REVENUE:       { label: 'Aesthetic',       color: '#a855f7' },
  DIALYSIS_REVENUE:        { label: 'Dialysis',        color: '#ec4899' },
}

// ---------------------------------------------------------------------------
// Charts — self-contained SVG
// ---------------------------------------------------------------------------

/** Dual-series area chart (revenue vs expenses) with daily markers. */
function TrendChart({ data, height = 260 }: {
  data: Array<{ date: string; revenue: number; expenses: number; netProfit: number }>
  height?: number
}){
  const padL = 10, padR = 14, padT = 16, padB = 28
  const w = 820, h = height
  const innerH = h - padT - padB
  const max = Math.max(1, ...data.flatMap(d => [d.revenue, d.expenses]))
  const stepX = data.length > 1 ? (w - padL - padR) / (data.length - 1) : 0
  const y = (v: number) => padT + innerH * (1 - v / max)

  const pathOf = (key: 'revenue' | 'expenses') => data.map((d, i) => `${i === 0 ? 'M' : 'L'}${(padL + i * stepX).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ')
  const revLine = pathOf('revenue')
  const expLine = pathOf('expenses')
  const revArea = revLine ? `${revLine} L${(padL + (data.length - 1) * stepX).toFixed(1)},${(h - padB).toFixed(1)} L${padL.toFixed(1)},${(h - padB).toFixed(1)} Z` : ''

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <defs>
        <linearGradient id="fin-rev" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#10b981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* grid */}
      {[0.25, 0.5, 0.75, 1].map((r, i) => (
        <line key={i} x1={padL} y1={padT + innerH * r} x2={w - padR} y2={padT + innerH * r} stroke="#e2e8f0" strokeDasharray="3,4" />
      ))}

      {revArea && <path d={revArea} fill="url(#fin-rev)" />}
      {revLine && <path d={revLine} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
      {expLine && <path d={expLine} fill="none" stroke="#f43f5e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5,4" />}

      {/* x labels */}
      {data.map((d, i) => {
        if (data.length > 10 && i % Math.ceil(data.length / 8) !== 0 && i !== data.length - 1) return null
        return <text key={i} x={padL + i * stepX} y={h - 8} textAnchor="middle" fontSize={10} fill="#64748b">{d.date.slice(5)}</text>
      })}
    </svg>
  )
}

/** Vertical bar chart for daily net profit (positive = green, negative = rose). */
function NetBarChart({ data, height = 160 }: {
  data: Array<{ date: string; netProfit: number }>; height?: number
}){
  const padL = 8, padR = 8, padT = 10, padB = 22
  const w = 560, h = height
  const innerH = h - padT - padB
  const max = Math.max(1, ...data.map(d => Math.abs(d.netProfit)))
  const mid = padT + innerH / 2
  const stepX = data.length > 0 ? (w - padL - padR) / data.length : 0
  const barW = Math.max(3, stepX * 0.65)

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <line x1={padL} y1={mid} x2={w - padR} y2={mid} stroke="#cbd5e1" strokeWidth={1} />
      {data.map((d, i) => {
        const x = padL + i * stepX + (stepX - barW) / 2
        const magnitude = (Math.abs(d.netProfit) / max) * (innerH / 2)
        const positive = d.netProfit >= 0
        const y0 = positive ? mid - magnitude : mid
        return (
          <rect
            key={i}
            x={x}
            y={y0}
            width={barW}
            height={magnitude || 1}
            rx={2}
            fill={positive ? '#10b981' : '#f43f5e'}
            opacity={0.9}
          >
            <title>{`${d.date}: ${d.netProfit.toLocaleString()}`}</title>
          </rect>
        )
      })}
      {/* axis labels */}
      <text x={padL} y={h - 6} fontSize={9} fill="#94a3b8">{data[0]?.date.slice(5) || ''}</text>
      <text x={w - padR} y={h - 6} textAnchor="end" fontSize={9} fill="#94a3b8">{data[data.length - 1]?.date.slice(5) || ''}</text>
    </svg>
  )
}

/** Horizontal bar chart for module revenue — vivid, labeled, sortable. */
function ModuleBars({ rows }: { rows: Array<{ name: string; label: string; color: string; amount: number }> }){
  const max = Math.max(1, ...rows.map(r => r.amount))
  return (
    <div className="space-y-3">
      {rows.map(r => {
        const pct = (r.amount / max) * 100
        return (
          <div key={r.name} className="group">
            <div className="mb-1 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                {r.label}
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{fmtRs(r.amount)}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${r.color} 0%, ${r.color}cc 100%)` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Donut chart with center label. */
function Donut({ data, size = 180, thickness = 22 }: {
  data: Array<{ label: string; value: number; color: string }>
  size?: number; thickness?: number
}){
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0))
  const r = size / 2
  const ri = r - thickness
  let start = -Math.PI / 2
  const arcs = data.map(d => {
    const frac = d.value / total
    const end = start + frac * Math.PI * 2
    const large = end - start > Math.PI ? 1 : 0
    const x1 = r + r * Math.cos(start),  y1 = r + r * Math.sin(start)
    const x2 = r + r * Math.cos(end),    y2 = r + r * Math.sin(end)
    const xi1 = r + ri * Math.cos(end),  yi1 = r + ri * Math.sin(end)
    const xi2 = r + ri * Math.cos(start),yi2 = r + ri * Math.sin(start)
    const path = `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${xi1},${yi1} A${ri},${ri} 0 ${large} 0 ${xi2},${yi2} Z`
    start = end
    return { path, color: d.color, label: d.label, value: d.value }
  })
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs.map((a, i) => <path key={i} d={a.path} fill={a.color} />)}
        <circle cx={r} cy={r} r={ri - 1} fill="white" />
        <text x={r} y={r - 4} textAnchor="middle" fontSize={12} fill="#64748b">Cash position</text>
        <text x={r} y={r + 18} textAnchor="middle" fontSize={20} fontWeight={700} fill="#0f172a">{fmtRs(total)}</text>
      </svg>
      <div className="flex flex-col gap-2 text-sm">
        {arcs.map(a => (
          <div key={a.label} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: a.color }} />
              {a.label}
            </span>
            <span className="font-semibold text-slate-900">{fmtRs(a.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------

type Tone = 'emerald' | 'rose' | 'blue' | 'violet' | 'amber' | 'sky' | 'slate'
const TONE: Record<Tone, { bg: string; chip: string }> = {
  emerald: { bg: 'from-emerald-500 to-emerald-600', chip: 'bg-emerald-50 text-emerald-700' },
  rose:    { bg: 'from-rose-500 to-rose-600',       chip: 'bg-rose-50 text-rose-700' },
  blue:    { bg: 'from-blue-500 to-blue-600',       chip: 'bg-blue-50 text-blue-700' },
  violet:  { bg: 'from-violet-500 to-violet-600',   chip: 'bg-violet-50 text-violet-700' },
  amber:   { bg: 'from-amber-500 to-amber-600',     chip: 'bg-amber-50 text-amber-700' },
  sky:     { bg: 'from-sky-500 to-sky-600',         chip: 'bg-sky-50 text-sky-700' },
  slate:   { bg: 'from-slate-500 to-slate-600',     chip: 'bg-slate-50 text-slate-700' },
}

function KPICard({ label, value, icon: Icon, tone = 'blue', delta, sparkline, sublabel }: {
  label: string
  value: React.ReactNode
  icon: any
  tone?: Tone
  delta?: { text: string; up?: boolean }
  sparkline?: number[]
  sublabel?: string
}){
  const t = TONE[tone]
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 bg-gradient-to-br ${t.bg}`} />
      <div className="flex items-start justify-between">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm bg-gradient-to-br ${t.bg}`}>
          <Icon className="h-5 w-5" />
        </span>
        {delta && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${delta.up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {delta.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta.text}
          </span>
        )}
      </div>
      <div className="mt-4 text-xs font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
      {sublabel && <div className="mt-1 text-xs text-slate-500">{sublabel}</div>}

      {sparkline && sparkline.length > 1 && (
        <svg viewBox="0 0 100 24" className="mt-3 h-8 w-full" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="text-slate-300"
            points={sparkline.map((v, i) => {
              const max = Math.max(1, ...sparkline)
              const x = (i / (sparkline.length - 1)) * 100
              const y = 22 - (v / max) * 20
              return `${x.toFixed(1)},${y.toFixed(1)}`
            }).join(' ')}
          />
        </svg>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

type DashboardResponse = {
  kpi: { totalRevenue: number; totalExpenses: number; netProfit: number; dailyCollections: number }
  moduleRevenue: Record<string, number>
  receivables: { total: number; patient: number; corporate: number }
  payables: { total: number; vendors: number; doctors: number; staff: number }
  cash: { cash: number; bank: number }
  dailyTrend: Array<{ date: string; revenue: number; expenses: number; netProfit: number }>
  recentExpenses: Array<{ id: string; dateIso: string; memo?: string; category: string; amount: number }>
}

export default function Finance_Dashboard(){
  const navigate = useNavigate()
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo]     = useState(todayIso())
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true); setErr(null)
      try {
        const res: any = await financeApi.dashboard({ from, to })
        if (alive) setData(res as DashboardResponse)
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Failed to load dashboard')
      } finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [from, to, tick])

  const moduleRows = useMemo(() => {
    const entries = Object.entries((data?.moduleRevenue || {}) as Record<string, number>)
    return entries
      .map(([name, amount]) => ({
        name, amount: Number(amount || 0),
        label: MODULE_META[name]?.label || name,
        color: MODULE_META[name]?.color || '#64748b',
      }))
      .filter(r => r.amount !== 0)
      .sort((a, b) => b.amount - a.amount)
  }, [data])

  const totalRevenue   = data?.kpi?.totalRevenue || 0
  const totalExpenses  = data?.kpi?.totalExpenses || 0
  const netProfit      = data?.kpi?.netProfit || 0
  const dailyColl      = data?.kpi?.dailyCollections || 0
  const cash           = data?.cash?.cash || 0
  const bank           = data?.cash?.bank || 0
  const totalCash      = cash + bank

  const trend = data?.dailyTrend || []
  const revSpark = trend.map(t => t.revenue)
  const expSpark = trend.map(t => t.expenses)
  const profSpark = trend.map(t => Math.max(0, t.netProfit))

  // Delta: compare last half of period to first half
  const halfDelta = (series: number[]) => {
    if (series.length < 4) return undefined
    const mid = Math.floor(series.length / 2)
    const left  = series.slice(0, mid).reduce((s, v) => s + v, 0)
    const right = series.slice(mid).reduce((s, v) => s + v, 0)
    if (left === 0 && right === 0) return undefined
    const delta = left > 0 ? Math.round(((right - left) / left) * 100) : 100
    return { text: `${delta >= 0 ? '+' : ''}${delta}%`, up: delta >= 0 }
  }

  const grossMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
  const collectionRatio = (totalRevenue + (data?.receivables?.total || 0)) > 0
    ? (totalRevenue / (totalRevenue + (data?.receivables?.total || 0))) * 100
    : 0

  const peakDay = trend.reduce<{ date: string; value: number } | null>((best, d) =>
    !best || d.revenue > best.value ? { date: d.date, value: d.revenue } : best, null)

  function onPrint(){
    printFinanceReport({
      title: 'Finance Dashboard',
      subtitle: `Period: ${from || '—'} → ${to || '—'}`,
      meta: [
        { label: 'Total Revenue',   value: fmtRs(totalRevenue) },
        { label: 'Total Expenses',  value: fmtRs(totalExpenses) },
        { label: 'Net Profit',      value: fmtRs(netProfit) },
        { label: 'Daily Collections', value: fmtRs(dailyColl) },
        { label: 'Cash on Hand',    value: fmtRs(totalCash) },
      ],
      columns: [
        { header: 'Module',   key: 'label' },
        { header: 'Revenue',  render: (r: any) => fmtRs(r.amount), align: 'right' },
      ],
      rows: moduleRows,
      totals: [
        { label: 'Receivables', value: fmtRs(data?.receivables?.total || 0) },
        { label: 'Payables',    value: fmtRs(data?.payables?.total || 0) },
      ],
    })
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 p-6 dark:bg-slate-950">
      {/* Page header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            <Sparkles className="h-6 w-6 text-amber-500" />
            Finance ERP Dashboard
          </h1>
          <p className="text-sm text-slate-500">Hospital financial pulse · {from} → {to}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter value={{ from, to }} onChange={r => { setFrom(r.from); setTo(r.to) }} />
          <button onClick={() => setTick(t => t + 1)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" />Refresh
          </button>
          <button onClick={onPrint} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            <Printer className="h-4 w-4" />Print
          </button>
        </div>
      </div>

      {err && <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div>}

      {/* Hero KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Total Revenue"
          value={loading ? '…' : fmtRs(totalRevenue)}
          icon={TrendingUp}
          tone="emerald"
          sublabel={peakDay && peakDay.value > 0 ? `Peak day: ${peakDay.date.slice(5)} · ${fmtRs(peakDay.value)}` : undefined}
          delta={halfDelta(revSpark)}
          sparkline={revSpark.length ? revSpark : undefined}
        />
        <KPICard
          label="Total Expenses"
          value={loading ? '…' : fmtRs(totalExpenses)}
          icon={TrendingDown}
          tone="rose"
          delta={halfDelta(expSpark)}
          sparkline={expSpark.length ? expSpark : undefined}
        />
        <KPICard
          label="Net Profit"
          value={loading ? '…' : fmtRs(netProfit)}
          icon={PiggyBank}
          tone={netProfit >= 0 ? 'blue' : 'rose'}
          sublabel={`Margin ${grossMargin.toFixed(1)}%`}
          sparkline={profSpark.length ? profSpark : undefined}
        />
        <KPICard
          label="Today's Collections"
          value={loading ? '…' : fmtRs(dailyColl)}
          icon={Wallet}
          tone="amber"
          sublabel={`Cash + Bank: ${fmtRs(totalCash)}`}
        />
      </div>

      {/* Trend + Cash Position */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><BarChart3 className="h-4 w-4" /></span>
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Revenue vs Expenses</div>
                <div className="text-xs text-slate-500">Daily movement over the selected period</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 text-slate-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Revenue</span>
              <span className="inline-flex items-center gap-1 text-slate-600"><span className="h-2 w-2 rounded-full bg-rose-500" />Expenses</span>
            </div>
          </div>
          {trend.length > 0 ? <TrendChart data={trend} /> : <EmptyState text="No journal activity in this period" />}

          {/* Daily net profit micro-bars */}
          <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                <CircleDot className="h-3.5 w-3.5" /> Daily Net Profit
              </span>
              <span className="text-slate-500">green = profit · rose = loss</span>
            </div>
            {trend.length > 0 ? <NetBarChart data={trend} height={110} /> : <div className="py-6 text-center text-xs text-slate-400">No data</div>}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Landmark className="h-4 w-4" /></span>
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Cash Position</div>
              <div className="text-xs text-slate-500">Liquid assets right now</div>
            </div>
          </div>
          {totalCash > 0 ? (
            <Donut data={[
              { label: 'Cash on Hand', value: cash, color: '#10b981' },
              { label: 'Bank Balance', value: bank, color: '#3b82f6' },
            ]} />
          ) : <EmptyState text="No cash balances yet" />}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <MiniTile label="Gross Margin"      value={`${grossMargin.toFixed(1)}%`}      icon={Scale}     tone={grossMargin >= 0 ? 'emerald' : 'rose'} />
            <MiniTile label="Collection Ratio"  value={`${collectionRatio.toFixed(1)}%`}  icon={CircleDot} tone="sky" />
          </div>
        </section>
      </div>

      {/* Module revenue + Receivables/Payables */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Building2 className="h-4 w-4" /></span>
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Revenue Contribution by Module</div>
                <div className="text-xs text-slate-500">Top-performing departments in this period</div>
              </div>
            </div>
            <div className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Total: {fmtRs(totalRevenue)}</div>
          </div>
          {moduleRows.length > 0 ? <ModuleBars rows={moduleRows} /> : <EmptyState text="No module revenue yet" />}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600"><Receipt className="h-4 w-4" /></span>
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Receivables & Payables</div>
              <div className="text-xs text-slate-500">Money coming in · money going out</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
              <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-emerald-700">
                <span>Receivables</span>
                <span>{fmtRs(data?.receivables?.total || 0)}</span>
              </div>
              <ARRow label="Patient AR"   amount={data?.receivables?.patient || 0}   color="#6366f1" max={data?.receivables?.total || 1} />
              <ARRow label="Corporate AR" amount={data?.receivables?.corporate || 0} color="#0ea5e9" max={data?.receivables?.total || 1} />
            </div>

            <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-3">
              <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-rose-700">
                <span>Payables</span>
                <span>{fmtRs(data?.payables?.total || 0)}</span>
              </div>
              <ARRow label="Vendor Payable" amount={data?.payables?.vendors || 0} color="#64748b" max={data?.payables?.total || 1} />
              <ARRow label="Doctor Payable" amount={data?.payables?.doctors || 0} color="#f59e0b" max={data?.payables?.total || 1} />
              <ARRow label="Staff Payable"  amount={data?.payables?.staff   || 0} color="#a855f7" max={data?.payables?.total || 1} />
            </div>

            <button onClick={() => navigate('/finance/receivables/aging')} className="w-full rounded-md bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200">
              AR Aging Report →
            </button>
          </div>
        </section>
      </div>

      {/* Quick actions */}
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Quick Actions</div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <QuickAction label="Journal Voucher"   icon={FileSpreadsheet} tone="blue"    to="/finance/journal-vouchers" />
          <QuickAction label="Record Expense"    icon={CreditCard}      tone="rose"    to="/finance/expenses" />
          <QuickAction label="Trial Balance"     icon={Scale}           tone="violet"  to="/finance/trial-balance" />
          <QuickAction label="P&L Statement"     icon={BarChart3}       tone="emerald" to="/finance/profit-loss" />
          <QuickAction label="Balance Sheet"     icon={Landmark}        tone="sky"     to="/finance/balance-sheet" />
          <QuickAction label="Petty Cash"        icon={Banknote}        tone="amber"   to="/finance/petty-cash" />
          <QuickAction label="Ledger Explorer"   icon={Users}           tone="slate"   to="/finance/ledger-explorer" />
        </div>
      </section>

      {/* Recent expenses + Module drill */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><Receipt className="h-4 w-4" /></span>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Recent Expenses</div>
            </div>
            <button onClick={() => navigate('/finance/expenses')} className="text-xs font-medium text-slate-500 hover:text-slate-900">View all →</button>
          </div>
          {(data?.recentExpenses || []).length === 0 ? (
            <EmptyState text="No recent expenses recorded" />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {(data?.recentExpenses || []).map(e => (
                <li key={e.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><ArrowDownRight className="h-3.5 w-3.5" /></span>
                      <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{e.category}</div>
                    </div>
                    <div className="mt-0.5 ml-9 text-xs text-slate-500">{e.memo || e.dateIso}</div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold text-rose-600">- {fmtRs(e.amount)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Stethoscope className="h-4 w-4" /></span>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Module Integrations</div>
          </div>
          <p className="text-xs text-slate-500">Drill into any department's finance to see tokens, orders, receipts and expense journals posted.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {['hospital', 'lab', 'pharmacy', 'indoor-pharmacy', 'diagnostic', 'aesthetic', 'dialysis'].map(m => (
              <button
                key={m}
                onClick={() => navigate(`/finance/integrations/${m}`)}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                <span className="capitalize">{m.replace('-', ' ')}</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>

          {netProfit < 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div>
                <div className="font-semibold">Net loss in this period</div>
                <div>Expenses exceed revenue by {fmtRs(Math.abs(netProfit))}. Review module integrations to investigate.</div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Footer mini-stats */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Last refreshed: {new Date().toLocaleString()}</div>
        <div>Finance ERP · Hospital financial control center</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function ARRow({ label, amount, color, max }: { label: string; amount: number; color: string; max: number }){
  const pct = max > 0 ? Math.min(100, (amount / max) * 100) : 0
  return (
    <div className="mt-1">
      <div className="mb-0.5 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-2 text-slate-700">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </span>
        <span className="font-semibold text-slate-900">{fmtRs(amount)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white dark:bg-slate-800">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function MiniTile({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone: Tone }){
  const t = TONE[tone]
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${t.chip}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
        <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{value}</div>
      </div>
    </div>
  )
}

function QuickAction({ label, icon: Icon, tone, to }: { label: string; icon: any; tone: Tone; to: string }){
  const navigate = useNavigate()
  const t = TONE[tone]
  return (
    <button
      onClick={() => navigate(to)}
      className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
    >
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm bg-gradient-to-br ${t.bg}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{label}</span>
    </button>
  )
}

function EmptyState({ text }: { text: string }){
  return <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">{text}</div>
}
