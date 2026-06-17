import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import {
  Package,
  RefreshCw,
  Search,
  Bed,
  Clock,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Filter,
  ChevronDown,
} from 'lucide-react'

export default function IndoorPharmacy_OrderQueue() {
  const [orders, setOrders] = useState<Array<{
    _id: string
    orderId: string
    patientName: string
    mrn?: string
    admissionNo?: string
    bedNumber?: string
    status: string
    priority: string
    sourceType: string
    requestedAt: string
    items: Array<{ medicineName?: string; requestedQty: number; status: string }>
  }>>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterPriority, setFilterPriority] = useState<string>('')
  const [searchQ, setSearchQ] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  async function load() {
    setLoading(true)
    try {
      const res: any = await hospitalApi.listPendingOrders({
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        page,
        limit,
      })
      setOrders(res?.orders || [])
      setTotal(res?.total || 0)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [filterStatus, filterPriority, page])

  const filteredOrders = orders.filter((o) => {
    if (!searchQ) return true
    const q = searchQ.toLowerCase()
    return (
      (o.patientName || '').toLowerCase().includes(q) ||
      (o.orderId || '').toLowerCase().includes(q) ||
      (o.mrn || '').toLowerCase().includes(q) ||
      (o.bedNumber || '').toLowerCase().includes(q)
    )
  })

  async function updateStatus(id: string, status: string) {
    try {
      await hospitalApi.updateOrderStatus(id, { status })
      load()
    } catch {}
  }

  async function assignToMe(id: string) {
    try {
      const userId = (() => { try { return JSON.parse(localStorage.getItem('indoorpharmacy.session') || '{}')?.userId || '' } catch { return '' } })()
      await hospitalApi.assignOrderToPharmacist(id, { pharmacistId: userId || 'system' })
      load()
    } catch {}
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-700 ring-amber-200',
      processing: 'bg-sky-50 text-sky-700 ring-sky-200',
      dispensed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      delivered: 'bg-violet-50 text-violet-700 ring-violet-200',
      cancelled: 'bg-slate-50 text-slate-600 ring-slate-200',
    }
    return map[status] || 'bg-slate-50 text-slate-600 ring-slate-200'
  }

  function priorityBadge(priority: string) {
    if (priority === 'stat') return 'bg-rose-50 text-rose-700 ring-rose-200'
    if (priority === 'urgent') return 'bg-amber-50 text-amber-700 ring-amber-200'
    return 'bg-slate-50 text-slate-600 ring-slate-200'
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
            <Package className="size-5 text-sky-600" />
            Order Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage inpatient medication orders by ward, bed, and priority</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search patient, order ID, MRN, bed..."
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
              className="rounded-lg border border-slate-200 pl-8 pr-6 py-2 text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="dispensed">Dispensed</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <AlertCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <select
              value={filterPriority}
              onChange={(e) => { setFilterPriority(e.target.value); setPage(1) }}
              className="rounded-lg border border-slate-200 pl-8 pr-6 py-2 text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All priorities</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
              <option value="stat">Stat</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="text-left px-4 py-2.5 font-medium">Order / Patient</th>
                <th className="text-left px-4 py-2.5 font-medium">Source</th>
                <th className="text-left px-4 py-2.5 font-medium">Items</th>
                <th className="text-left px-4 py-2.5 font-medium">Priority</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">Requested</th>
                <th className="text-right px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Loading orders...</td>
                </tr>
              )}
              {!loading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No orders match your filters.</td>
                </tr>
              )}
              {filteredOrders.map((o) => (
                <tr key={o._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-slate-100 p-1.5">
                        <Bed className="size-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium">{o.patientName || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{o.orderId} {o.bedNumber ? `Bed ${o.bedNumber}` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs uppercase tracking-wide text-slate-500">{o.sourceType || 'IPD'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs text-slate-600">
                      <Package className="size-3.5" />
                      {(o.items || []).length} items
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${priorityBadge(o.priority)}`}>
                      {o.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${statusBadge(o.status)}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="size-3.5" />
                      {o.requestedAt ? new Date(o.requestedAt).toLocaleString() : '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {o.status === 'pending' && (
                        <button
                          onClick={() => assignToMe(o._id)}
                          className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100"
                        >
                          <UserCheck className="size-3.5" />
                          Assign
                        </button>
                      )}
                      {o.status === 'processing' && (
                        <button
                          onClick={() => updateStatus(o._id, 'dispensed')}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          <CheckCircle2 className="size-3.5" />
                          Dispense
                        </button>
                      )}
                      {o.status === 'dispensed' && (
                        <button
                          onClick={() => updateStatus(o._id, 'delivered')}
                          className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100"
                        >
                          <CheckCircle2 className="size-3.5" />
                          Deliver
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-500">
            Showing {filteredOrders.length} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium disabled:opacity-40 hover:bg-slate-50"
            >
              Prev
            </button>
            <span className="px-2 text-xs text-slate-600">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
