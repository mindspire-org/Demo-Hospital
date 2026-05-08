import { useEffect, useMemo, useState } from 'react'
import { Search, Calendar, Download, Printer, RefreshCw, AlertTriangle, Clock, FlaskConical, CheckCircle2, FileText, Stamp, XCircle } from 'lucide-react'
import { labApi } from '../../utils/api'
import DatePickerModern from '../../components/DatePickerModern'
import Toast, { type ToastState } from '../../components/ui/Toast'

type TokenStatus = 'token_generated' | 'converted_to_sample' | 'sample_received' | 'result_entered' | 'approved' | 'cancelled'

type LabToken = {
  _id: string
  tokenNo: string
  patient: {
    fullName: string
    phone?: string
    mrn?: string
    age?: string
    gender?: string
  }
  tests: string[]
  status: TokenStatus
  barcode?: string
  generatedAt: string
  generatedBy: string
  convertedAt?: string
  sampleReceivedAt?: string
  resultEnteredAt?: string
  approvedAt?: string
  orderId?: string
  resultId?: string
  subtotal?: number
  discount?: number
  net?: number
  receivedAmount?: number
  receivableAmount?: number
  collectionCenterId?: string
  collectionCenterName?: string
}

type LabTest = { id: string; name: string; turnaroundTime?: number }

const statusConfig: Record<TokenStatus, { label: string; color: string; icon: any }> = {
  token_generated: { label: 'Token Generated', color: 'bg-blue-100 text-blue-700', icon: Clock },
  converted_to_sample: { label: 'Converted to Sample', color: 'bg-purple-100 text-purple-700', icon: FlaskConical },
  sample_received: { label: 'Sample Received', color: 'bg-amber-100 text-amber-700', icon: CheckCircle2 },
  result_entered: { label: 'Result Entered', color: 'bg-orange-100 text-orange-700', icon: FileText },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700', icon: Stamp },
  cancelled: { label: 'Cancelled', color: 'bg-rose-100 text-rose-700', icon: XCircle },
}

function fmtTAT(m?: number): string {
  if (!m) return '-'
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m / 60)}h ${m % 60}m`
  return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`
}

function escapeHtml(s: string) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

export default function Lab_TotalTests() {
  const [tokens, setTokens] = useState<LabToken[]>([])
  const [tests, setTests] = useState<LabTest[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<TokenStatus | 'all'>('all')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [from, setFrom] = useState(() => new Date().toISOString().split('T')[0])
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0])
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState(50)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [centerFilter] = useState('')

  const testsMap = useMemo(() => Object.fromEntries(tests.map(t => [t.id, t.name])), [tests])
  const testsTatMap = useMemo(() => Object.fromEntries(tests.map(t => [t.id, t.turnaroundTime || 0])), [tests])

  const refresh = async () => {
    setLoading(true)
    try {
      const [tokenRes, testRes] = await Promise.all([
        labApi.listTokens({
          q: q || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
          from: from || undefined,
          to: to || undefined,
          collectionCenterId: centerFilter || undefined,
          page,
          limit: rows,
        } as any),
        labApi.listTests({ limit: 1000 }),
      ])
      setTokens((tokenRes.items || []) as LabToken[])
      setTotal(Number(tokenRes.total || 0))
      setTotalPages(Number(tokenRes.totalPages || 1))
      setTests((testRes.items || []).map((t: any) => ({ id: String(t._id), name: t.name, turnaroundTime: t.turnaroundTime || 0 })))
    } catch (e: any) {
      console.error(e)
      setToast({ type: 'error', message: e?.message || 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [from, to, page, rows, statusFilter, centerFilter])

  const normalizeTestRef = (ref: any): { id: string; name?: string } => {
    if (typeof ref === 'string' || typeof ref === 'number') return { id: String(ref) }
    if (!ref || typeof ref !== 'object') return { id: String(ref) }
    const id = ref._id ?? ref.id ?? ref.testId ?? ref.test?._id ?? ref.test?.id
    const name = ref.name ?? ref.testName ?? ref.test?.name
    return { id: String(id ?? name ?? 'unknown'), name: name ? String(name) : undefined }
  }

  // Compute test-level stats
  const testStats = useMemo(() => {
    const map: Record<string, { name: string; count: number; delayed: number; tat: number }> = {}
    for (const t of tokens) {
      for (const tid of t.tests) {
        const n = normalizeTestRef(tid)
        const id = n.id
        const resolvedName = testsMap[id] || n.name || id
        if (!map[id]) map[id] = { name: resolvedName, count: 0, delayed: 0, tat: testsTatMap[id] || 0 }
        map[id].count++
        // Check if delayed: has TAT set, and status is not approved/cancelled, and generatedAt + TAT < now
        const tat = testsTatMap[id] || 0
        if (tat > 0 && !['approved', 'cancelled'].includes(t.status)) {
          const expectedBy = new Date(t.generatedAt).getTime() + tat * 60000
          if (Date.now() > expectedBy) map[id].delayed++
        }
      }
    }
    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [tokens, testsMap, testsTatMap])

  const totalTests = testStats.reduce((s, t) => s + t.count, 0)
  const totalDelayed = testStats.reduce((s, t) => s + t.delayed, 0)

  const pageCount = Math.max(1, Number(totalPages || 1))
  const curPage = Math.min(Math.max(1, page), pageCount)
  const start = total === 0 ? 0 : (curPage - 1) * rows + 1
  const end = Math.min(curPage * rows, total)

  const printWithBranding = () => {
    const win = window.open('', 'print', 'width=1000,height=700')
    if (!win) return
    const rowsHtml = testStats.map(t => `<tr>
      <td>${escapeHtml(t.name)}</td>
      <td style="text-align:center">${t.count}</td>
      <td style="text-align:center">${fmtTAT(t.tat)}</td>
      <td style="text-align:center;color:${t.delayed > 0 ? '#dc2626' : '#16a34a'};font-weight:700">${t.delayed}</td>
      <td style="text-align:center">${totalTests > 0 ? ((t.count / totalTests) * 100).toFixed(1) : '0'}%</td>
    </tr>`).join('')

    win.document.write(`<!doctype html><html><head><title>Total Tests Report</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;padding:24px;color:#0f172a}
        h1{font-size:18px;margin:0 0 4px 0}
        .meta{font-size:12px;color:#475569;margin-bottom:12px}
        .summary{display:flex;gap:24px;margin-bottom:16px}
        .summary-card{border:1px solid #e2e8f0;border-radius:8px;padding:12px 20px;text-align:center}
        .summary-card .num{font-size:28px;font-weight:800}
        .summary-card .lbl{font-size:11px;color:#64748b;margin-top:2px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #e2e8f0;padding:8px;text-align:left;vertical-align:top}
        th{background:#f8fafc;font-weight:700}
      </style>
    </head><body>`)
    win.document.write(`<h1>Total Tests Report</h1>`)
    win.document.write(`<div class="meta">From: ${escapeHtml(from || '-')} To: ${escapeHtml(to || '-')} | Generated: ${new Date().toLocaleString()}</div>`)
    win.document.write(`<div class="summary">
      <div class="summary-card"><div class="num">${totalTests}</div><div class="lbl">Total Tests</div></div>
      <div class="summary-card"><div class="num" style="color:#dc2626">${totalDelayed}</div><div class="lbl">Delayed</div></div>
      <div class="summary-card"><div class="num">${tokens.length}</div><div class="lbl">Tokens</div></div>
    </div>`)
    win.document.write(`<table><thead><tr><th>Test Name</th><th style="text-align:center">Count</th><th style="text-align:center">Expected TAT</th><th style="text-align:center">Delayed</th><th style="text-align:center">Share %</th></tr></thead><tbody>${rowsHtml}</tbody></table>`)
    win.document.write('</body></html>')
    win.document.close()
    win.focus()
    win.print()
  }

  const exportCsv = () => {
    const cols = ['Test Name', 'Count', 'Expected TAT', 'Delayed', 'Share %']
    const esc = (v: any) => { const s = String(v ?? ''); if (/[,\n\r\"]/g.test(s)) return `"${s.replace(/\"/g, '""')}"`; return s }
    const rowsCsv = testStats.map(t => [t.name, t.count, fmtTAT(t.tat), t.delayed, totalTests > 0 ? ((t.count / totalTests) * 100).toFixed(1) + '%' : '0%'].map(esc).join(','))
    const csv = [cols.join(','), ...rowsCsv].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `total-tests_${from}_${to}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-violet-600 via-sky-600 to-emerald-500 p-5 text-white shadow-lg shadow-sky-200/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Total Tests</h2>
            <div className="mt-0.5 text-sm text-sky-100">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <button onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-violet-200 bg-linear-to-br from-violet-50 to-violet-100/50 p-4 text-left shadow-sm">
          <div className="text-xs font-medium text-violet-700">Total Tests Run</div>
          <div className="text-3xl font-extrabold tracking-tight text-violet-900">{totalTests}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-linear-to-br from-rose-50 to-rose-100/50 p-4 text-left shadow-sm">
          <div className="flex items-center gap-1 text-xs font-medium text-rose-700"><AlertTriangle className="h-3 w-3" /> Delayed Reports</div>
          <div className="text-3xl font-extrabold tracking-tight text-rose-900">{totalDelayed}</div>
        </div>
        <div className="rounded-xl border border-sky-200 bg-linear-to-br from-sky-50 to-sky-100/50 p-4 text-left shadow-sm">
          <div className="text-xs font-medium text-sky-700">Total Tokens</div>
          <div className="text-3xl font-extrabold tracking-tight text-sky-900">{tokens.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
          <Calendar className="h-4 w-4 text-slate-500" />
          <DatePickerModern value={from} onChange={v => { setFrom(v); setPage(1) }} placeholder="From" />
          <span className="text-xs text-slate-400">→</span>
          <DatePickerModern value={to} onChange={v => { setTo(v); setPage(1) }} placeholder="To" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter((e.target.value as TokenStatus | 'all') || 'all'); setPage(1) }} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900">
          <option value="all">All Statuses</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { setPage(1); refresh() } }} placeholder="Search token, patient, MRN..." className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button onClick={exportCsv} disabled={loading || testStats.length === 0} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button onClick={printWithBranding} disabled={loading || testStats.length === 0} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <Printer className="h-4 w-4" /> Print Report
          </button>
        </div>
      </div>

      {/* Test Summary — Visual Bar Chart + Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">Test-wise Summary</div>
          <div className="text-xs text-slate-500">{testStats.length} unique test(s)</div>
        </div>
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-600">Loading...</div>
        ) : testStats.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">No tests found for selected filters</div>
        ) : (
          <>
            {/* Visual bar chart */}
            <div className="mb-4 space-y-2">
              {testStats.slice(0, 15).map((t, idx) => {
                const maxCount = testStats[0]?.count || 1
                const pct = Math.round((t.count / maxCount) * 100)
                const barColor = t.delayed > 0
                  ? 'bg-gradient-to-r from-violet-500 to-rose-400'
                  : 'bg-gradient-to-r from-violet-500 to-violet-400'
                return (
                  <div key={idx} className="group flex items-center gap-3">
                    <div className="w-36 truncate text-xs font-medium text-slate-800" title={t.name}>{t.name}</div>
                    <div className="relative flex-1 overflow-hidden rounded-full bg-slate-100 h-6">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full ${barColor} transition-all duration-500 ease-out`}
                        style={{ width: `${pct}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-end pr-2 text-[11px] font-bold text-white drop-shadow-sm">{t.count}</span>
                    </div>
                    <div className="w-16 text-right text-xs text-slate-500">{fmtTAT(t.tat)}</div>
                    <div className="w-14 text-right">
                      {t.delayed > 0 ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                          <AlertTriangle className="h-2.5 w-2.5" />{t.delayed}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-emerald-600">On Time</span>
                      )}
                    </div>
                  </div>
                )
              })}
              {testStats.length > 15 && (
                <div className="text-center text-xs text-slate-400">+ {testStats.length - 15} more — see table below</div>
              )}
            </div>

            {/* Detailed table */}
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-slate-50/80 text-slate-700 border-b-2 border-slate-200">
                  <tr className="text-left">
                    <th className="px-3 py-2.5 text-xs font-semibold text-slate-600">#</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-slate-600">Test Name</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-slate-600 text-center">Count</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-slate-600 text-center">Expected TAT</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-slate-600 text-center">Delayed</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-slate-600 text-center">Share %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {testStats.map((t, idx) => {
                    const sharePct = totalTests > 0 ? ((t.count / totalTests) * 100).toFixed(1) : '0'
                    return (
                      <tr key={idx} className="hover:bg-violet-50/40 transition-colors">
                        <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium text-slate-900">{t.name}</td>
                        <td className="px-3 py-2 text-center font-bold text-slate-900">{t.count}</td>
                        <td className="px-3 py-2 text-center text-slate-600">{fmtTAT(t.tat)}</td>
                        <td className="px-3 py-2 text-center">
                          {t.delayed > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                              <AlertTriangle className="h-3 w-3" /> {t.delayed}
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600">On Time</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-violet-500" style={{ width: `${sharePct}%` }} />
                            </div>
                            <span className="text-xs tabular-nums text-slate-600">{sharePct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Delayed Reports Detail */}
      {totalDelayed > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-800">
            <AlertTriangle className="h-4 w-4" /> Delayed Reports Detail
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-rose-100/50 text-rose-700 border-b-2 border-rose-200">
                <tr className="text-left">
                  <th className="px-3 py-2 text-xs font-extrabold uppercase tracking-wider">Token</th>
                  <th className="px-3 py-2 text-xs font-extrabold uppercase tracking-wider">Patient</th>
                  <th className="px-3 py-2 text-xs font-extrabold uppercase tracking-wider">Test</th>
                  <th className="px-3 py-2 text-xs font-extrabold uppercase tracking-wider">Expected TAT</th>
                  <th className="px-3 py-2 text-xs font-extrabold uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-xs font-extrabold uppercase tracking-wider">Delay</th>
                </tr>
              </thead>
              <tbody>
                {tokens.filter(t => !['approved', 'cancelled'].includes(t.status)).flatMap(token =>
                  token.tests.filter(tid => {
                    const tat = testsTatMap[String(tid)] || 0
                    return tat > 0 && Date.now() > new Date(token.generatedAt).getTime() + tat * 60000
                  }).map(tid => {
                    const tat = testsTatMap[String(tid)] || 0
                    const expectedBy = new Date(token.generatedAt).getTime() + tat * 60000
                    const delayMin = Math.round((Date.now() - expectedBy) / 60000)
                    return { token, tid, tat, delayMin }
                  })
                ).map((r, idx) => (
                  <tr key={idx} className="border-b border-rose-100">
                    <td className="px-3 py-2 font-mono font-medium text-slate-900">{r.token.tokenNo}</td>
                    <td className="px-3 py-2 text-slate-800">{r.token.patient?.fullName || '-'}</td>
                    <td className="px-3 py-2 text-slate-800">{testsMap[String(r.tid)] || r.tid}</td>
                    <td className="px-3 py-2 text-slate-600">{fmtTAT(r.tat)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig[r.token.status]?.color || 'bg-slate-100 text-slate-700'}`}>
                        {statusConfig[r.token.status]?.label || r.token.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-rose-700 font-bold">{fmtTAT(r.delayMin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && tokens.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-600">
          <div>Showing {start}-{end} of {total} tokens</div>
          <div className="flex items-center gap-2">
            <select value={rows} onChange={e => { setRows(Number(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-900">
              <option value={20}>20</option><option value={50}>50</option><option value={100}>100</option><option value={200}>200</option>
            </select>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={curPage <= 1} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50">Prev</button>
            <span>Page {curPage} / {pageCount}</span>
            <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={curPage >= pageCount} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
