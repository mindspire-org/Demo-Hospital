import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Clock, FlaskConical, CheckCircle2, FileText, Stamp, RefreshCw, Calendar, Download, Pencil, XCircle, Trash2 } from 'lucide-react'
import { labApi } from '../../utils/api'
import Lab_TrackDialog from '../../components/lab/lab_TrackDialog'
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
  convertedBy?: string
  sampleReceivedAt?: string
  sampleReceivedBy?: string
  resultEnteredAt?: string
  resultEnteredBy?: string
  approvedAt?: string
  approvedBy?: string
  orderId?: string
  resultId?: string
}

type LabTest = { id: string; name: string }

const statusConfig: Record<TokenStatus, { label: string; color: string; icon: any }> = {
  token_generated: { label: 'Token Generated', color: 'bg-blue-100 text-blue-700', icon: Clock },
  converted_to_sample: { label: 'Converted to Sample', color: 'bg-purple-100 text-purple-700', icon: FlaskConical },
  sample_received: { label: 'Sample Received', color: 'bg-amber-100 text-amber-700', icon: CheckCircle2 },
  result_entered: { label: 'Result Entered', color: 'bg-orange-100 text-orange-700', icon: FileText },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700', icon: Stamp },
  cancelled: { label: 'Cancelled', color: 'bg-rose-100 text-rose-700', icon: XCircle },
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function Lab_TodaysTokens() {
  const navigate = useNavigate()
  const [tokens, setTokens] = useState<LabToken[]>([])
  const [tests, setTests] = useState<LabTest[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<TokenStatus | 'all'>('all')
  const [trackOpen, setTrackOpen] = useState(false)
  const [trackTokenNo, setTrackTokenNo] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelToken, setCancelToken] = useState<LabToken | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteToken, setDeleteToken] = useState<LabToken | null>(null)

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const testsMap = useMemo(() => Object.fromEntries(tests.map(t => [t.id, t.name])), [tests])

  const openEdit = (t: LabToken) => {
    const isReception = window.location.pathname.startsWith('/reception')
    const target = isReception
      ? `/reception/lab/sample-intake?tokenId=${encodeURIComponent(t._id)}`
      : `/lab/orders?tokenId=${encodeURIComponent(t._id)}`
    navigate(target)
  }

  const confirmCancel = async () => {
    if (!cancelToken) return
    try {
      await labApi.updateTokenStatus(cancelToken._id, { status: 'cancelled' })
      setToast({ type: 'success', message: `Token ${cancelToken.tokenNo} cancelled` })
      setCancelOpen(false)
      setCancelToken(null)
      refresh()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to cancel token' })
    }
  }

  const confirmDelete = async () => {
    if (!deleteToken) return
    try {
      await labApi.deleteToken(deleteToken._id)
      setToast({ type: 'success', message: `Token ${deleteToken.tokenNo} deleted` })
      setDeleteOpen(false)
      setDeleteToken(null)
      refresh()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to delete token' })
    }
  }

  const today = useMemo(() => {
    const d = new Date()
    // Use local date (Pakistan timezone) instead of UTC
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  useEffect(() => {
    if (!from) setFrom(today)
    if (!to) setTo(today)
  }, [today])

  const refresh = async () => {
    setLoading(true)
    try {
      const [tokenRes, testRes] = await Promise.all([
        labApi.listTokens({ q: q || undefined, status: statusFilter === 'all' ? undefined : statusFilter, from: from || undefined, to: to || undefined, page, limit: rows }),
        labApi.listTests({ limit: 1000 }),
      ])
      setTokens((tokenRes.items || []) as LabToken[])
      setTotal(Number(tokenRes.total || 0))
      setTotalPages(Number(tokenRes.totalPages || 1))
      setTests((testRes.items || []).map((t: any) => ({ id: String(t._id), name: t.name })))
    } catch (e: any) {
      console.error(e)
      setToast({ type: 'error', message: e?.message || 'Failed to load tokens' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [from, to, page, rows, statusFilter])

  const filteredTokens = tokens

  const pageCount = Math.max(1, Number(totalPages || 1))
  const curPage = Math.min(Math.max(1, page), pageCount)
  const start = total === 0 ? 0 : (curPage - 1) * rows + 1
  const end = Math.min(curPage * rows, total)

  const exportCsv = () => {
    const cols = ['Token No', 'Date', 'Time', 'Patient', 'MR No', 'Phone', 'Tests', 'Barcode', 'Status']
    const esc = (v: any) => {
      const s = String(v ?? '')
      if (/[,\n\r\"]/g.test(s)) return `"${s.replace(/\"/g, '""')}"`
      return s
    }
    const rowsCsv = (filteredTokens || []).map(t => {
      const dt = new Date(t.generatedAt)
      const date = isNaN(dt.getTime()) ? '' : dt.toLocaleDateString()
      const time = isNaN(dt.getTime()) ? '' : dt.toLocaleTimeString()
      return [
        t.tokenNo,
        date,
        time,
        t.patient?.fullName || '',
        t.patient?.mrn || '',
        t.patient?.phone || '',
        getTestNames(t.tests || []),
        t.barcode || '',
        t.status,
      ].map(esc).join(',')
    })
    const csv = [cols.join(','), ...rowsCsv].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `token-history_${from || 'all'}_${to || 'all'}_p${curPage}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const downloadPdf = () => {
    const win = window.open('', 'print', 'width=1000,height=700')
    if (!win) return
    const rowsHtml = (filteredTokens || []).map(t => {
      const dt = new Date(t.generatedAt)
      const date = isNaN(dt.getTime()) ? '' : dt.toLocaleDateString()
      const time = isNaN(dt.getTime()) ? '' : dt.toLocaleTimeString()
      return `<tr>
        <td>${escapeHtml(t.tokenNo)}</td>
        <td>${escapeHtml(date)}</td>
        <td>${escapeHtml(time)}</td>
        <td>${escapeHtml(t.patient?.fullName || '-')}</td>
        <td>${escapeHtml(t.patient?.mrn || '-')}</td>
        <td>${escapeHtml(t.patient?.phone || '-')}</td>
        <td>${escapeHtml(getTestNames(t.tests || []) || '-')}</td>
        <td>${escapeHtml(t.barcode || '-')}</td>
        <td>${escapeHtml(t.status || '-')}</td>
      </tr>`
    }).join('')

    win.document.write(`<!doctype html><html><head><title>Token History</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;padding:24px;color:#0f172a}
        h1{font-size:18px;margin:0 0 8px 0}
        .meta{font-size:12px;color:#475569;margin-bottom:12px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #e2e8f0;padding:6px;text-align:left;vertical-align:top}
        th{background:#f8fafc}
      </style>
    </head><body>`)
    win.document.write(`<h1>Token History</h1>`)
    win.document.write(`<div class="meta">From: ${escapeHtml(from || '-')} To: ${escapeHtml(to || '-')} | Page: ${curPage}/${pageCount} | Rows: ${rows}</div>`)
    win.document.write(`<table><thead><tr>
      <th>Token No</th><th>Date</th><th>Time</th><th>Patient</th><th>MR No</th><th>Phone</th><th>Tests</th><th>Barcode</th><th>Status</th>
    </tr></thead><tbody>${rowsHtml}</tbody></table>`)
    win.document.write('</body></html>')
    win.document.close()
    win.focus()
    win.print()
  }

  function escapeHtml(s: string) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
  }

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of tokens) {
      counts[t.status] = (counts[t.status] || 0) + 1
    }
    return counts
  }, [tokens])

  const getTestNames = (testIds: string[]) => {
    return testIds.map(id => testsMap[id] || id).join(', ')
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Token History</h2>
            <div className="mt-1 text-sm text-slate-600">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Status Summary Cards */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Object.entries(statusConfig).map(([status, config]) => {
            const count = statusCounts[status] || 0
            const Icon = config.icon

            const accent =
              status === 'token_generated' ? 'from-blue-50 to-blue-100/50 border-blue-200' :
              status === 'converted_to_sample' ? 'from-violet-50 to-violet-100/50 border-violet-200' :
              status === 'sample_received' ? 'from-amber-50 to-amber-100/50 border-amber-200' :
              status === 'result_entered' ? 'from-orange-50 to-orange-100/50 border-orange-200' :
              status === 'approved' ? 'from-emerald-50 to-emerald-100/50 border-emerald-200' :
              'from-rose-50 to-rose-100/50 border-rose-200'

            const ring = statusFilter === status ? 'ring-2 ring-violet-500' : ''

            return (
              <button
                key={status}
                onClick={() => setStatusFilter(statusFilter === status as TokenStatus ? 'all' : status as TokenStatus)}
                className={`rounded-xl border bg-gradient-to-br ${accent} p-4 text-left shadow-sm transition hover:shadow-md ${ring}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 ring-1 ring-black/5">
                      <Icon className="h-4 w-4 text-slate-600" />
                    </span>
                    <span className="text-xs font-medium text-slate-700">{config.label}</span>
                  </div>
                  <div className="text-3xl font-extrabold tracking-tight text-slate-900">{count}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-slate-500" />
              <input
                type="date"
                value={from}
                onChange={e => { setFrom(e.target.value); setPage(1) }}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-900"
              />
              <input
                type="date"
                value={to}
                onChange={e => { setTo(e.target.value); setPage(1) }}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-900"
              />
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={exportCsv}
                disabled={loading || filteredTokens.length === 0}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={downloadPdf}
                disabled={loading || filteredTokens.length === 0}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  setPage(1)
                  refresh()
                }
              }}
              placeholder="Search by token, patient, MRN, phone, or barcode..."
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
          </div>
        </div>
      </div>

      {/* Tokens Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-600">Loading tokens...</div>
        ) : filteredTokens.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            {total === 0 ? 'No tokens found for selected filters' : 'No tokens match your filters'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-600">
                  <th className="px-3 py-2">Token No</th>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Patient</th>
                  <th className="px-3 py-2">MR No</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Tests</th>
                  <th className="px-3 py-2">Barcode</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTokens.map((token, idx) => {
                  const config = statusConfig[token.status]
                  const StatusIcon = config.icon
                  const canMutate = token.status === 'token_generated'
                  return (
                    <tr key={token._id} className={`border-b border-slate-100 hover:bg-slate-50/60 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-3 py-2 whitespace-nowrap font-mono font-medium text-slate-900">
                        {token.tokenNo}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                        {formatTime(token.generatedAt)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-800">
                        {token.patient?.fullName || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                        {token.patient?.mrn || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                        {token.patient?.phone || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-700 max-w-[200px] truncate" title={getTestNames(token.tests)}>
                        {getTestNames(token.tests) || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-slate-600">
                        {token.barcode || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setTrackTokenNo(token.tokenNo); setTrackOpen(true) }}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                            title="View Timeline"
                          >
                            <Clock className="h-3 w-3" />
                          </button>
                          {canMutate && (
                            <button
                              onClick={() => openEdit(token)}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                              title="Edit Token"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                          {canMutate && (
                            <button
                              onClick={() => { setCancelToken(token); setCancelOpen(true) }}
                              className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100"
                              title="Cancel Token"
                            >
                              <XCircle className="h-3 w-3" />
                            </button>
                          )}
                          {canMutate && (
                            <button
                              onClick={() => { setDeleteToken(token); setDeleteOpen(true) }}
                              className="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                              title="Delete Token"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                          {token.status === 'token_generated' && (
                            <button
                              onClick={async () => {
                                try {
                                  await labApi.convertTokenToSample(token._id, {
                                    tests: token.tests,
                                    subtotal: 0,
                                    discount: 0,
                                    net: 0,
                                    receivedAmount: 0,
                                  })
                                  setToast({ type: 'success', message: `Token ${token.tokenNo} converted to sample` })
                                  refresh()
                                } catch (e: any) {
                                  setToast({ type: 'error', message: e?.message || 'Failed to convert to sample' })
                                }
                              }}
                              className="rounded-md bg-violet-600 px-2 py-1 text-xs text-white hover:bg-violet-700"
                              title="Convert to Sample"
                            >
                              <FlaskConical className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {cancelOpen && cancelToken && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
              <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Cancel Token</div>
              <div className="px-5 py-4 text-sm text-slate-700">
                Cancel token <span className="font-mono">{cancelToken.tokenNo}</span>?
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
                <button type="button" onClick={() => { setCancelOpen(false); setCancelToken(null) }} className="btn-outline-navy">No</button>
                <button type="button" onClick={confirmCancel} className="btn bg-rose-600 hover:bg-rose-700">Yes, Cancel</button>
              </div>
            </div>
          </div>
        )}

        {deleteOpen && deleteToken && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
              <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Delete Token</div>
              <div className="px-5 py-4 text-sm text-slate-700">
                Delete token <span className="font-mono">{deleteToken.tokenNo}</span>? This cannot be undone.
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
                <button type="button" onClick={() => { setDeleteOpen(false); setDeleteToken(null) }} className="btn-outline-navy">Cancel</button>
                <button type="button" onClick={confirmDelete} className="btn bg-rose-600 hover:bg-rose-700">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Footer */}
        {!loading && filteredTokens.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing {start}-{end} of {total}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span>Rows</span>
                <select
                  value={rows}
                  onChange={e => { setRows(Number(e.target.value)); setPage(1) }}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-900"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={curPage <= 1}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-xs">Page {curPage} / {pageCount}</span>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={curPage >= pageCount}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <Lab_TrackDialog open={trackOpen} onClose={() => setTrackOpen(false)} tokenNo={trackTokenNo || undefined} />
    </div>
  )
}
