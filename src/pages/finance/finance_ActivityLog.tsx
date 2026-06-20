import { useState, useEffect, useCallback, Fragment } from 'react'
import { financeApi } from '../../features/finance/finance.api'
import type { ActivityLogItem, ActivityLogSummary, ActivityLogUser } from '../../features/finance/shift.types'
import ActivitySummary from '../../components/finance/ActivitySummary'
import {
  Search, Download, RefreshCw, ChevronDown, ChevronUp,
  ArrowLeft, ArrowRight, Activity, ArrowUpCircle, ArrowDownCircle, Scale,
  FileSearch, CalendarDays, UserCircle, Filter, Layers
} from 'lucide-react'

const PORTALS = ['All', 'Hospital', 'Lab', 'Pharmacy', 'Reception', 'Finance', 'Aesthetic']
const MODULES = ['All', 'OPD', 'IPD', 'Lab', 'Pharmacy', 'ER', 'Aesthetic', 'Cash Session', 'Shift']

const PORTAL_DOT: Record<string, string> = {
  Hospital: 'bg-sky-500',
  Lab: 'bg-purple-500',
  Pharmacy: 'bg-emerald-500',
  Reception: 'bg-amber-500',
  Finance: 'bg-indigo-500',
  Aesthetic: 'bg-pink-500',
}

const OUT_ACTIONS = new Set([
  'Refund Issued', 'IPD Refund Issued', 'Lab Refund Issued', 'Pharmacy Refund',
  'Expense Created', 'Expense Approved', 'Doctor Payout', 'Cash Movement',
])

function formatDateTime(iso: string) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
  return { date, time }
}

export default function Finance_ActivityLog() {
  const [items, setItems] = useState<ActivityLogItem[]>([])
  const [summary, setSummary] = useState<ActivityLogSummary | null>(null)
  const [users, setUsers] = useState<ActivityLogUser[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [userId, setUserId] = useState('')
  const [portal, setPortal] = useState('All')
  const [action, setAction] = useState('All')
  const [moduleFilter, setModuleFilter] = useState('All')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const limit = 50

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = {
        page,
        limit,
        ...(userId && userId !== 'All' ? { userId } : {}),
        ...(portal !== 'All' ? { portal } : {}),
        ...(action !== 'All' ? { action } : {}),
        ...(moduleFilter !== 'All' ? { module: moduleFilter } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(search ? { search } : {}),
      }

      const [listRes, sumRes, usersRes, actionsRes] = await Promise.all([
        financeApi.listActivityLogs(params),
        financeApi.getActivitySummary({ ...(userId && userId !== 'All' ? { userId } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) }),
        financeApi.listActivityUsers(),
        financeApi.listActivityActions(),
      ])

      const listData = listRes as any
      setItems(listData?.items || [])
      setTotal(listData?.total || 0)
      setSummary((sumRes as any) || null)
      setUsers((usersRes as any) || [])
      setActions((actionsRes as any) || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load activity log')
    } finally {
      setLoading(false)
    }
  }, [userId, portal, action, moduleFilter, from, to, search, page])

  useEffect(() => {
    load()
  }, [load])

  const handleExport = () => {
    const params: any = {
      ...(userId && userId !== 'All' ? { userId } : {}),
      ...(portal !== 'All' ? { portal } : {}),
      ...(action !== 'All' ? { action } : {}),
      ...(moduleFilter !== 'All' ? { module: moduleFilter } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...(search ? { search } : {}),
    }
    const url = financeApi.exportActivityLogs(params)
    window.open(url, '_blank')
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const kpi = summary || { totalActivities: 0, totalIn: 0, totalOut: 0, netBalance: 0 }
  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1
  const endRecord = Math.min(page * limit, total)

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50">
      {/* Hero */}
      <div className="bg-indigo-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Activity Dashboard</h1>
              <p className="mt-0.5 text-sm text-indigo-200">Track financial actions across all hospital portals</p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 space-y-5">
        {/* Error */}
        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <Activity className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Total Activities</p>
              <p className="text-lg font-bold text-slate-900">{kpi.totalActivities.toLocaleString()}</p>
            </div>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <ArrowUpCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Amount In</p>
              <p className="text-lg font-bold text-emerald-700">{kpi.totalIn.toLocaleString()}</p>
            </div>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
              <ArrowDownCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Amount Out</p>
              <p className="text-lg font-bold text-rose-700">{kpi.totalOut.toLocaleString()}</p>
            </div>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Scale className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Net Balance</p>
              <p className={`text-lg font-bold ${kpi.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {kpi.netBalance.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1"><UserCircle className="inline h-3 w-3 mr-1" />User</label>
              <select
                value={userId}
                onChange={e => { setUserId(e.target.value); setPage(1) }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              >
                <option value="">All Users</option>
                {users.map(u => (
                  <option key={u.userId} value={u.userId}>{u.userName || u.userId}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1"><CalendarDays className="inline h-3 w-3 mr-1" />From</label>
              <input
                type="date"
                value={from}
                onChange={e => { setFrom(e.target.value); setPage(1) }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1"><CalendarDays className="inline h-3 w-3 mr-1" />To</label>
              <input
                type="date"
                value={to}
                onChange={e => { setTo(e.target.value); setPage(1) }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1"><Layers className="inline h-3 w-3 mr-1" />Portal</label>
              <select
                value={portal}
                onChange={e => { setPortal(e.target.value); setPage(1) }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              >
                {PORTALS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1"><Filter className="inline h-3 w-3 mr-1" />Action</label>
              <select
                value={action}
                onChange={e => { setAction(e.target.value); setPage(1) }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              >
                <option value="All">All Actions</option>
                {actions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1"><Layers className="inline h-3 w-3 mr-1" />Module</label>
              <select
                value={moduleFilter}
                onChange={e => { setModuleFilter(e.target.value); setPage(1) }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              >
                {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search entity or patient..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>
            <div className="sm:hidden flex items-center gap-2">
              <button
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Table */}
          <div className="lg:col-span-3 rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Date/Time</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">User & Portal</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Action / Module</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Description</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">Amount</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-14 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                            <FileSearch className="h-6 w-6 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-500 font-medium">No activity records found</p>
                          <p className="text-xs text-slate-400">Try adjusting your filters or date range</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {items.map(item => {
                    const isOut = OUT_ACTIONS.has(item.action)
                    const isExpanded = expandedId === item._id
                    const { date, time } = formatDateTime(item.createdAt)
                    const dotColor = PORTAL_DOT[item.portal] || 'bg-slate-400'
                    return (
                      <Fragment key={item._id}>
                        <tr
                          onClick={() => setExpandedId(isExpanded ? null : item._id)}
                          className="border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer transition"
                        >
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <p className="text-xs font-medium text-slate-700">{date}</p>
                            <p className="text-[11px] text-slate-400">{time}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="text-xs font-medium text-slate-700 truncate max-w-[140px]">{item.userName || item.userId}</p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
                              <span className="text-[11px] text-slate-500">{item.portal}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <p className="text-xs font-medium text-slate-700">{item.action}</p>
                            <p className="text-[11px] text-slate-400">{item.module || '-'}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="text-xs text-slate-600 max-w-[180px] truncate">{item.entityLabel || '-'}</p>
                            <p className="text-[11px] text-slate-400">{item.method || 'Cash'}</p>
                          </td>
                          <td className={`px-4 py-2.5 text-right font-semibold whitespace-nowrap text-xs ${isOut ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {item.amount != null ? item.amount.toLocaleString() : '-'}
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                          </td>
                        </tr>
                        {isExpanded && item.meta && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={6} className="px-4 py-2.5">
                              <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <p className="text-xs font-semibold text-slate-600 mb-2">Details</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                  {Object.entries(item.meta).map(([k, v]) => (
                                    <div key={k} className="rounded bg-slate-50 px-2 py-1.5">
                                      <span className="text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}:</span>{' '}
                                      <span className="font-medium text-slate-700">{String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                  {loading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">
                {startRecord}-{endRecord} of {total} records
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Prev
                </button>
                <span className="text-xs text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
                >
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Summary */}
          <div className="space-y-4">
            <ActivitySummary summary={summary} />
            <TopActions summary={summary} />
          </div>
        </div>
      </div>
    </div>
  )
}

function TopActions({ summary }: { summary?: ActivityLogSummary | null }) {
  if (!summary || !summary.byActionPortal?.length) return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Top Actions</h3>
      <p className="text-xs text-slate-400">No data available</p>
    </div>
  )

  const byAction: Record<string, { count: number; amount: number }> = {}
  for (const item of summary.byActionPortal) {
    const action = item._id.action || 'Unknown'
    if (!byAction[action]) byAction[action] = { count: 0, amount: 0 }
    byAction[action].count += item.count
    byAction[action].amount += item.totalAmount
  }

  const top = Object.entries(byAction)
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 5)

  const totalAmount = top.reduce((s, [, v]) => s + v.amount, 0)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Top Actions</h3>
      <div className="space-y-3">
        {top.map(([action, data]) => {
          const pct = totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
          return (
            <div key={action} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">{action}</span>
                <span className="text-slate-500">{data.count} &middot; {data.amount.toLocaleString()}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
