/**
 * Modern "Module Integration" page - one route per module (OPD, IPD, Lab,
 * Pharmacy, Diagnostics, Aesthetic). Takes the module key from the URL.
 * Features eye-catching UI with gradients, animations, and modern design.
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { financeApi } from '../../utils/api'
import { fmtRs, firstOfMonth, todayIso } from '../../components/finance/finance_ui'
import {
  Printer, RefreshCw, TrendingUp, TrendingDown, Calendar, ArrowUpRight,
  Activity, Stethoscope, FlaskConical, Pill, ScanLine, Sparkles, Droplets,
  DollarSign, Receipt, BarChart3, Clock, ChevronRight, AlertCircle, Package
} from 'lucide-react'
import DateRangeFilter from '../../components/finance/finance_DateRange'
import { printFinanceReport } from '../../components/finance/finance_print'

// Module configuration with icons and colors
const MODULE_CONFIG: Record<string, {
  title: string
  icon: React.ComponentType<{ className?: string }>
  gradient: string
  bgGradient: string
  accentColor: string
  description: string
}> = {
  opd: {
    title: 'OPD Revenue',
    icon: Activity,
    gradient: 'from-emerald-500 to-teal-600',
    bgGradient: 'from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30',
    accentColor: 'emerald',
    description: 'Outpatient department consultations and procedures',
  },
  hospital: {
    title: 'Hospital Revenue',
    icon: Activity,
    gradient: 'from-emerald-500 to-teal-600',
    bgGradient: 'from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30',
    accentColor: 'emerald',
    description: 'All hospital revenue including OPD, IPD, ER, and procedures',
  },
  ipd: {
    title: 'IPD Revenue',
    icon: Stethoscope,
    gradient: 'from-blue-500 to-indigo-600',
    bgGradient: 'from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30',
    accentColor: 'blue',
    description: 'Inpatient admissions, room charges, and treatments',
  },
  lab: {
    title: 'Lab Revenue',
    icon: FlaskConical,
    gradient: 'from-violet-500 to-purple-600',
    bgGradient: 'from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30',
    accentColor: 'violet',
    description: 'Laboratory tests and diagnostic panels',
  },
  pharmacy: {
    title: 'Pharmacy Revenue',
    icon: Pill,
    gradient: 'from-rose-500 to-pink-600',
    bgGradient: 'from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30',
    accentColor: 'rose',
    description: 'Medicine sales and pharmacy dispensing',
  },
  'indoor-pharmacy': {
    title: 'Indoor Pharmacy Revenue',
    icon: Pill,
    gradient: 'from-pink-500 to-rose-600',
    bgGradient: 'from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30',
    accentColor: 'pink',
    description: 'Inpatient pharmacy dispensing and medication',
  },
  diagnostic: {
    title: 'Diagnostics Revenue',
    icon: ScanLine,
    gradient: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30',
    accentColor: 'amber',
    description: 'Imaging, endoscopy, and diagnostic procedures',
  },
  aesthetic: {
    title: 'Aesthetic Revenue',
    icon: Sparkles,
    gradient: 'from-fuchsia-500 to-pink-600',
    bgGradient: 'from-fuchsia-50 to-pink-50 dark:from-fuchsia-950/30 dark:to-pink-950/30',
    accentColor: 'fuchsia',
    description: 'Cosmetic procedures and aesthetic treatments',
  },
  dialysis: {
    title: 'Dialysis Revenue',
    icon: Droplets,
    gradient: 'from-cyan-500 to-sky-600',
    bgGradient: 'from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-950/30',
    accentColor: 'cyan',
    description: 'Dialysis sessions and related services',
  },
  corporate: {
    title: 'Corporate Revenue',
    icon: BarChart3,
    gradient: 'from-slate-500 to-gray-600',
    bgGradient: 'from-slate-50 to-gray-50 dark:from-slate-950/30 dark:to-gray-950/30',
    accentColor: 'slate',
    description: 'Corporate company billing and accounts receivable',
  },
  er: {
    title: 'ER Billing',
    icon: Activity,
    gradient: 'from-red-500 to-rose-600',
    bgGradient: 'from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30',
    accentColor: 'red',
    description: 'Emergency room billing and services',
  },
  inventory: {
    title: 'Inventory Billing',
    icon: Package,
    gradient: 'from-teal-500 to-emerald-600',
    bgGradient: 'from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30',
    accentColor: 'teal',
    description: 'Store/Inventory purchases and supplier payments',
  },
}

// Module tab order for navigation
const MODULE_TABS = [
  { key: 'opd', label: 'OPD' },
  { key: 'ipd', label: 'IPD' },
  { key: 'er', label: 'ER' },
  { key: 'lab', label: 'Lab' },
  { key: 'pharmacy', label: 'Pharmacy' },
  { key: 'diagnostic', label: 'Diagnostics' },
  { key: 'aesthetic', label: 'Aesthetic' },
  { key: 'dialysis', label: 'Dialysis' },
  { key: 'corporate', label: 'Corporate' },
  { key: 'inventory', label: 'Inventory' },
]

export default function Finance_ModuleIntegration() {
  const { module = 'opd' } = useParams()
  const navigate = useNavigate()
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(todayIso())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const config = MODULE_CONFIG[module] || MODULE_CONFIG.opd
  const IconComponent = config.icon

  async function load() {
    setLoading(true)
    try {
      setData(await financeApi.moduleIntegration(module, { from, to }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() /* eslint-disable-next-line */ }, [module, from, to])

  const maxTrend = useMemo(() =>
    (data?.trend || []).reduce((m: number, r: any) => Math.max(m, Number(r.revenue || 0)), 0),
    [data]
  )

  const avgRevenue = useMemo(() => {
    const trend = data?.trend || []
    if (trend.length === 0) return 0
    return trend.reduce((s: number, r: any) => s + Number(r.revenue || 0), 0) / trend.length
  }, [data])

  const trendDirection = useMemo(() => {
    const trend = data?.trend || []
    if (trend.length < 2) return 'neutral'
    const recent = trend.slice(-3)
    const older = trend.slice(-6, -3)
    const recentAvg = recent.reduce((s: number, r: any) => s + Number(r.revenue || 0), 0) / Math.max(recent.length, 1)
    const olderAvg = older.reduce((s: number, r: any) => s + Number(r.revenue || 0), 0) / Math.max(older.length, 1)
    if (recentAvg > olderAvg * 1.1) return 'up'
    if (recentAvg < olderAvg * 0.9) return 'down'
    return 'neutral'
  }, [data])

  const handlePrint = () => {
    printFinanceReport({
      title: config.title,
      subtitle: `Period ${from || '-'} -> ${to || '-'}`,
      meta: [{ label: 'Accounts', value: (data?.accounts || []).join(', ') }],
      columns: [
        { header: 'Date', key: 'dateIso' },
        { header: 'Source', key: 'refType' },
        { header: 'Memo', key: 'memo' },
        {
          header: 'Revenue', render: (r: any) => fmtRs(
            (r.lines || []).filter((l: any) => (data?.accounts || []).includes(l.account))
              .reduce((s: number, l: any) => s + Number(l.credit || 0) - Number(l.debit || 0), 0)
          ), align: 'right'
        },
      ],
      rows: data?.recent || [],
      totals: [{ label: 'Total', value: fmtRs(data?.total || 0) }],
    })
  }

  return (
    <div className={`min-h-[calc(100dvh-3.5rem)] bg-linear-to-br ${config.bgGradient} dark:bg-slate-950`}>
      {/* Header Section */}
      <div className={`bg-linear-to-r ${config.gradient} px-6 py-8 text-white`}>
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <IconComponent className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{config.title}</h1>
                <p className="mt-1 text-sm text-white/80">{config.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">{from} to {to}</span>
              </div>
              <button
                onClick={load}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-sm transition hover:bg-white/30 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-lg transition hover:bg-gray-100"
              >
                <Printer className="h-4 w-4" />
                Print Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Module Tabs */}
      <div className="border-b border-slate-200/50 bg-white/90 px-6 backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-900/90">
        <div className="mx-auto max-w-7xl">
          <nav className="-mb-px flex gap-1 overflow-x-auto py-2" aria-label="Module tabs">
            {MODULE_TABS.map(tab => {
              const isActive = module === tab.key
              const tabConfig = MODULE_CONFIG[tab.key]
              return (
                <button
                  key={tab.key}
                  onClick={() => navigate(`/finance/integrations/${tab.key}`)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? `bg-linear-to-r ${tabConfig?.gradient || 'from-blue-500 to-indigo-600'} text-white shadow-md`
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div className="border-b border-slate-200/50 bg-white/70 px-6 py-3 backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-900/70">
        <div className="mx-auto max-w-7xl">
          <DateRangeFilter value={{ from, to }} onChange={r => { setFrom(r.from); setTo(r.to) }} />
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Revenue */}
          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg shadow-slate-200/50 transition-all hover:shadow-xl dark:bg-slate-900 dark:shadow-slate-900/50">
            <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-linear-to-br ${config.gradient} opacity-10 blur-2xl transition group-hover:opacity-20`} />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${config.gradient} text-white shadow-lg`}>
                  <DollarSign className="h-5 w-5" />
                </div>
                {trendDirection === 'up' && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <TrendingUp className="h-3 w-3" /> Rising
                  </span>
                )}
                {trendDirection === 'down' && (
                  <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                    <TrendingDown className="h-3 w-3" /> Declining
                  </span>
                )}
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Revenue</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {loading ? <span className="animate-pulse">---</span> : fmtRs(data?.total || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Average Daily */}
          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg shadow-slate-200/50 transition-all hover:shadow-xl dark:bg-slate-900 dark:shadow-slate-900/50">
            <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-linear-to-br from-blue-500 to-cyan-500 opacity-10 blur-2xl transition group-hover:opacity-20`} />
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-cyan-500 text-white shadow-lg">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Daily Average</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {loading ? <span className="animate-pulse">---</span> : fmtRs(avgRevenue)}
                </p>
              </div>
            </div>
          </div>

          {/* Transactions */}
          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg shadow-slate-200/50 transition-all hover:shadow-xl dark:bg-slate-900 dark:shadow-slate-900/50">
            <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-linear-to-br from-amber-500 to-orange-500 opacity-10 blur-2xl transition group-hover:opacity-20`} />
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-amber-500 to-orange-500 text-white shadow-lg">
                <Receipt className="h-5 w-5" />
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Transactions</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {loading ? <span className="animate-pulse">---</span> : (data?.recent?.length || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Active Days */}
          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg shadow-slate-200/50 transition-all hover:shadow-xl dark:bg-slate-900 dark:shadow-slate-900/50">
            <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-linear-to-br from-violet-500 to-purple-500 opacity-10 blur-2xl transition group-hover:opacity-20`} />
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-purple-500 text-white shadow-lg">
                <Clock className="h-5 w-5" />
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Days</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {loading ? <span className="animate-pulse">---</span> : (data?.trend?.length || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Daily Trend Chart */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-200/50 dark:bg-slate-900 dark:shadow-slate-900/50">
            <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Revenue Trend</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Daily revenue over selected period</p>
            </div>
            <div className="p-6">
              {(data?.trend || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <AlertCircle className="h-12 w-12 mb-3" />
                  <p className="text-sm font-medium">No revenue recorded</p>
                  <p className="text-xs mt-1">Transactions will appear here once recorded</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(data?.trend || []).slice(-10).map((r: any, i: number) => {
                    const percentage = maxTrend > 0 ? (Number(r.revenue || 0) / maxTrend) * 100 : 0
                    return (
                      <div key={r.dateIso} className="group">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-600 dark:text-slate-300">{r.dateIso}</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{fmtRs(r.revenue)}</span>
                        </div>
                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full bg-linear-to-r ${config.gradient} transition-all duration-500 ease-out`}
                            style={{ width: `${percentage}%`, animationDelay: `${i * 50}ms` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Accounts Info */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-200/50 dark:bg-slate-900 dark:shadow-slate-900/50">
            <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Linked Accounts</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Chart of Accounts integration</p>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {(data?.accounts || []).map((acc: string, i: number) => (
                  <div
                    key={acc}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br ${config.gradient} text-xs font-bold text-white`}>
                        {i + 1}
                      </div>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{acc}</span>
                    </div>
                    <button
                      onClick={() => navigate(`/finance/ledger/${encodeURIComponent(acc)}`)}
                      className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      View Ledger <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              {(data?.accounts || []).length === 0 && (
                <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No accounts linked to this module
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-200/50 dark:bg-slate-900 dark:shadow-slate-900/50">
          <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Transactions</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Journal entries for this module</p>
              </div>
              <button
                onClick={() => navigate('/finance/journal-vouchers')}
                className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                View All <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                        <span className="text-sm text-slate-500 dark:text-slate-400">Loading transactions...</span>
                      </div>
                    </td>
                  </tr>
                ) : (data?.recent || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Receipt className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                        <span className="text-sm text-slate-500 dark:text-slate-400">No transactions in this period</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (data?.recent || []).slice(0, 10).map((r: any, i: number) => {
                    const revenue = (r.lines || [])
                      .filter((l: any) => (data?.accounts || []).includes(l.account))
                      .reduce((s: number, l: any) => s + Number(l.credit || 0) - Number(l.debit || 0), 0)
                    return (
                      <tr key={`${r._id}-${i}`} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{r.dateIso}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {r.refType || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{r.memo || '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-semibold ${revenue >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {revenue >= 0 ? '+' : ''}{fmtRs(revenue)}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
