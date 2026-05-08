import { useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, Printer, RefreshCw, Search } from 'lucide-react'
import { api } from '../../api'

/**
 * Daily Worksheet — flexible worklist for a given day:
 *   - With / without results
 *   - All / selected tests
 *   - All / selected departments
 *   - All / selected users (performed by)
 *   - Date range
 *   - PDF print + CSV export
 *
 * Powered by /lab/results/instances/list (LabOrderTest aggregation).
 */

type OT = {
  _id: string
  orderId: string
  testId: string
  testName: string
  status: string
  sampleType?: string
  performedBy?: string
  performedAt?: string
  departmentId?: string
  _order?: {
    tokenNo?: string
    labNumber?: number
    patient?: { fullName?: string; mrn?: string; age?: string; gender?: string }
  }
}

export default function Lab_DailyWorksheet() {
  const today = new Date().toISOString().slice(0, 10)
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [status, setStatus] = useState<string>('')
  const [withResults, setWithResults] = useState<'' | 'with' | 'without'>('')
  const [testQ, setTestQ] = useState('')
  const [dept, setDept] = useState('')
  const [user, setUser] = useState('')
  const [items, setItems] = useState<OT[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const q = new URLSearchParams()
      if (from) q.set('from', from)
      if (to) q.set('to', to)
      if (status) q.set('status', status)
      if (testQ) q.set('q', testQ)
      if (dept) q.set('departmentId', dept)
      q.set('limit', '2000')
      const r = await api(`/lab/results/instances/list?${q}`)
      setItems(r.items || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    let rows = items
    if (withResults === 'with') rows = rows.filter(r => ['result_entered', 'approved', 'completed'].includes(r.status))
    if (withResults === 'without') rows = rows.filter(r => !['result_entered', 'approved', 'completed'].includes(r.status))
    if (user) rows = rows.filter(r => (r.performedBy || '').toLowerCase().includes(user.toLowerCase()))
    return rows
  }, [items, withResults, user])

  const kpi = useMemo(() => {
    const completed = filtered.filter(r => r.status === 'completed' || r.status === 'approved').length
    const pending = filtered.filter(r => r.status === 'pending').length
    const entered = filtered.filter(r => r.status === 'result_entered').length
    return { total: filtered.length, completed, pending, entered }
  }, [filtered])

  function exportCsv() {
    const lines = [
      ['Lab #', 'Token', 'Patient', 'MRN', 'Age', 'Sex', 'Test', 'Status', 'Sample type', 'Performed by', 'Performed at'].join(','),
      ...filtered.map(r => [
        r._order?.labNumber || '',
        r._order?.tokenNo || '',
        r._order?.patient?.fullName || '',
        r._order?.patient?.mrn || '',
        r._order?.patient?.age || '',
        r._order?.patient?.gender || '',
        r.testName,
        r.status,
        r.sampleType || '',
        r.performedBy || '',
        r.performedAt ? new Date(r.performedAt).toLocaleString() : '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `daily-worksheet-${from}_${to}.csv`; a.click()
  }

  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      completed: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
      approved: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
      result_entered: 'bg-amber-100 text-amber-700 ring-amber-600/20',
      sample_collected: 'bg-sky-100 text-sky-700 ring-sky-600/20',
      pending: 'bg-slate-100 text-slate-700 ring-slate-500/20',
      cancelled: 'bg-red-100 text-red-700 ring-red-600/20',
    }
    return m[s] || 'bg-slate-100 text-slate-700 ring-slate-500/20'
  }

  return (
    <div className="space-y-4 p-4 md:p-6 print:p-0">
      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-violet-600 via-sky-600 to-emerald-500 p-5 text-white shadow-lg shadow-sky-200/50 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Daily Worksheet</h2>
            <div className="mt-0.5 text-sm text-sky-100">Flexible worklist — filter by date, status, test, department &amp; user</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30"><Printer className="h-4 w-4" />Print</button>
            <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-white/30 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/40"><FileSpreadsheet className="h-4 w-4" />CSV</button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-700">Total Rows</div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900">{kpi.total}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-white p-4 shadow-sm">
          <div className="text-xs font-medium text-emerald-700">Completed / Approved</div>
          <div className="text-3xl font-extrabold tracking-tight text-emerald-900">{kpi.completed}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-linear-to-br from-amber-50 to-white p-4 shadow-sm">
          <div className="text-xs font-medium text-amber-700">Result Entered</div>
          <div className="text-3xl font-extrabold tracking-tight text-amber-900">{kpi.entered}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-700">Pending</div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900">{kpi.pending}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-6">
        <label className="block"><span className="text-xs font-medium text-slate-600">From</span>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200" />
        </label>
        <label className="block"><span className="text-xs font-medium text-slate-600">To</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200" />
        </label>
        <label className="block"><span className="text-xs font-medium text-slate-600">Status</span>
          <select value={status} onChange={e => setStatus(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200">
            <option value="">All</option><option value="pending">Pending</option><option value="sample_collected">Sample Collected</option><option value="result_entered">Result Entered</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="block"><span className="text-xs font-medium text-slate-600">Results</span>
          <select value={withResults} onChange={e => setWithResults(e.target.value as any)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200">
            <option value="">All</option><option value="with">With results</option><option value="without">Without results</option>
          </select>
        </label>
        <label className="block"><span className="text-xs font-medium text-slate-600">Test Name</span>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input value={testQ} onChange={e => setTestQ(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200" />
          </div>
        </label>
        <label className="block"><span className="text-xs font-medium text-slate-600">Department</span>
          <input value={dept} onChange={e => setDept(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200" />
        </label>
        <label className="block md:col-span-2"><span className="text-xs font-medium text-slate-600">Performed by (user)</span>
          <input value={user} onChange={e => setUser(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200" />
        </label>
        <button onClick={load} className="h-[38px] self-end rounded-md bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700"><Search className="mr-1.5 inline h-4 w-4" />Search</button>
      </div>

      <div className="mb-2 text-right text-xs text-slate-500 print:text-slate-700">{filtered.length} row(s) · {from} → {to}</div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Lab #</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Token</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Patient</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">MRN</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Age/Sex</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Test</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Sample</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Status</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Performed by</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Performed at</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={10} className="px-3 py-6 text-center text-sm text-slate-500">Loading…</td></tr>}
            {!loading && !filtered.length && <tr><td colSpan={10} className="px-3 py-6 text-center text-sm text-slate-500">No rows found for the selected filters.</td></tr>}
            {filtered.map(r => (
              <tr key={r._id} className="hover:bg-sky-50/40 transition-colors">
                <td className="px-3 py-2 font-medium tabular-nums text-slate-900">{r._order?.labNumber || '-'}</td>
                <td className="px-3 py-2 tabular-nums text-slate-700">{r._order?.tokenNo || '-'}</td>
                <td className="px-3 py-2 text-slate-900">{r._order?.patient?.fullName || '-'}</td>
                <td className="px-3 py-2 text-slate-700">{r._order?.patient?.mrn || '-'}</td>
                <td className="px-3 py-2 text-slate-700">{r._order?.patient?.age || '-'} / {r._order?.patient?.gender || '-'}</td>
                <td className="px-3 py-2 font-medium text-slate-900">{r.testName}</td>
                <td className="px-3 py-2 text-slate-700">{r.sampleType || '-'}</td>
                <td className="px-3 py-2"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadge(r.status)}`}>{r.status?.replace(/_/g, ' ')}</span></td>
                <td className="px-3 py-2 text-slate-700">{r.performedBy || '-'}</td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-700">{r.performedAt ? new Date(r.performedAt).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
