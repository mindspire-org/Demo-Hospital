import { useEffect, useMemo, useState } from 'react'
import { Check, X, RefreshCw } from 'lucide-react'
import { financeApi } from '../../features/finance'
import Toast, { type ToastState } from '../../components/ui/Toast'

const statusOptions = ['all', 'pending', 'approved', 'rejected']

function formatDate(iso?: string) {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleDateString() } catch { return '-' }
}

function currency(n?: number) {
  return `Rs ${Number(n || 0).toLocaleString()}`
}

export default function Finance_ExpenseApprovals() {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [toast, setToast] = useState<ToastState>(null)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => { load() }, [statusFilter, from, to])

  async function load() {
    setLoading(true)
    try {
      const params: any = { page: 1, limit: 100 }
      if (statusFilter !== 'all') params.status = statusFilter
      if (from) params.from = from
      if (to) params.to = to
      if (search.trim()) params.search = search.trim()
      const res: any = await financeApi.listReceptionExpenses(params)
      setRows(res.expenses || [])
      setTotal(res.total || 0)
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to load expenses' })
    }
    setLoading(false)
  }

  async function approve(id: string) {
    setProcessingId(id)
    try {
      await financeApi.approveReceptionExpense(id)
      setToast({ type: 'success', message: 'Expense approved' })
      await load()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to approve' })
    }
    setProcessingId(null)
  }

  function openReject(id: string) {
    setRejectId(id)
    setRejectReason('')
    setRejectModalOpen(true)
  }

  async function confirmReject() {
    if (!rejectId) return
    setProcessingId(rejectId)
    setRejectModalOpen(false)
    try {
      await financeApi.rejectReceptionExpense(rejectId, rejectReason || undefined)
      setToast({ type: 'success', message: 'Expense rejected' })
      await load()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to reject' })
    }
    setProcessingId(null)
    setRejectId(null)
  }

  const totals = useMemo(() => {
    const pending = rows.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.amount || 0), 0)
    const approved = rows.filter(r => r.status === 'approved').reduce((s, r) => s + Number(r.amount || 0), 0)
    const rejected = rows.filter(r => r.status === 'rejected').reduce((s, r) => s + Number(r.amount || 0), 0)
    return { pending, approved, rejected }
  }, [rows])

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      rejected: 'bg-rose-50 text-rose-700 border-rose-200',
    }
    return map[status] || 'bg-slate-50 text-slate-700 border-slate-200'
  }

  return (
    <div className="space-y-4">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-violet-600 to-fuchsia-600 p-5 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold">Reception Expense Approvals</div>
            <div className="mt-1 text-xs/relaxed text-white/90">Review and approve or reject expenses submitted by reception staff.</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Pending Amount</div>
          <div className="mt-1 text-lg font-extrabold text-amber-700">{currency(totals.pending)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Approved Amount</div>
          <div className="mt-1 text-lg font-extrabold text-emerald-700">{currency(totals.approved)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Rejected Amount</div>
          <div className="mt-1 text-lg font-extrabold text-rose-700">{currency(totals.rejected)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            >
              {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Search</label>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
              placeholder="Category, description, or staff name"
              className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="text-sm font-extrabold text-slate-800">Expenses</div>
          <div className="text-xs text-slate-500">{total} records</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100/50 text-slate-700 border-b-2 border-slate-300">
              <tr>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Date</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Submitted By</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Category</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Description</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Amount</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Status</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Reviewer</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {loading && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">Loading...</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">No expenses found</td></tr>
              )}
              {!loading && rows.map(r => (
                <tr key={r._id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">{formatDate(r.date)}</td>
                  <td className="px-4 py-2 font-medium">{r.createdByUsername || '-'}</td>
                  <td className="px-4 py-2">{r.category}</td>
                  <td className="px-4 py-2 max-w-xs truncate" title={r.description}>{r.description}</td>
                  <td className="px-4 py-2 font-semibold text-slate-900">{currency(r.amount)}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${statusBadge(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs">{r.approvedByUsername || '-'}</td>
                  <td className="px-4 py-2">
                    {r.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => approve(r._id)}
                          disabled={processingId === r._id}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          title="Approve"
                        >
                          <Check className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => openReject(r._id)}
                          disabled={processingId === r._id}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                          title="Reject"
                        >
                          <X className="h-3.5 w-3.5" /> Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {r.status === 'rejected' && r.rejectionReason ? `Reason: ${r.rejectionReason}` : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow">
            <div className="text-base font-semibold text-slate-800">Reject Expense</div>
            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium text-slate-700">Reason (optional)</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason"
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setRejectModalOpen(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={confirmReject} disabled={!!processingId} className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50">
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
