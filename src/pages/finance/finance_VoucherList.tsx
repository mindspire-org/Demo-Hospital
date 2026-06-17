import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { financeApi } from '../../features/finance/finance.api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { exportToPdf } from '../../utils/financeExportPdf'
import { Search, FileText, Trash2, Eye, Pencil, ChevronLeft, ChevronRight } from 'lucide-react'

type Voucher = {
  _id: string
  voucherNo: string
  voucherType: 'BPV' | 'BRV' | 'CPV' | 'CRV' | 'JV' | 'CONTRA'
  dateIso: string
  payee?: string
  narration?: string
  module?: string
  isExpense?: boolean
  expenseAccountCode?: string
  expenseAccountName?: string
  costCenter?: string
  status: 'draft' | 'pending_approval' | 'approved' | 'posted' | 'cancelled'
  totalDebit: number
  totalCredit: number
  createdAt?: string
  postedAt?: string
}

const VOUCHER_MODULES = ['opd','er','ipd','lab','pharmacy','diagnostic','dialysis','aesthetic','general'] as const

const voucherTypeLabels: Record<string, string> = {
  BPV: 'Bank Payment',
  BRV: 'Bank Receipt',
  CPV: 'Cash Payment',
  CRV: 'Cash Receipt',
  CONTRA: 'Contra',
  JV: 'Journal',
}

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  pending_approval: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  posted: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function Finance_VoucherList() {
  const navigate = useNavigate()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  // Filters
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterModule, setFilterModule] = useState('')
  const [filterExpense, setFilterExpense] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  useEffect(() => {
    loadVouchers()
  }, [page, filterType, filterStatus, filterModule, filterExpense, dateFrom, dateTo])

  async function loadVouchers() {
    setLoading(true)
    try {
      const res: any = await financeApi.listVouchers({
        type: filterType || undefined,
        status: filterStatus || undefined,
        module: filterModule || undefined,
        isExpense: filterExpense === 'yes' ? true : filterExpense === 'no' ? false : undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        q: search || undefined,
        page,
        limit,
      })
      setVouchers(res.vouchers || [])
      setTotal(res.total || 0)
      setTotalPages(res.totalPages || 1)
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to load vouchers' })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this voucher?')) return
    try {
      await financeApi.deleteVoucher(id)
      setToast({ type: 'success', message: 'Voucher deleted successfully' })
      loadVouchers()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to delete voucher' })
    }
  }

  async function handleSearch() {
    setPage(1)
    loadVouchers()
  }

  function clearFilters() {
    setFilterType('')
    setFilterStatus('')
    setFilterModule('')
    setFilterExpense('')
    setDateFrom('')
    setDateTo('')
    setSearch('')
    setPage(1)
  }

  function handleExportPdf() {
    exportToPdf({
      title: 'Vouchers',
      subtitle: `${filterType || 'All Types'} | ${filterStatus || 'All Status'} | ${dateFrom || 'Start'} to ${dateTo || 'Today'}`,
      filename: `vouchers-${new Date().toISOString().slice(0, 10)}`,
      headers: ['Voucher No', 'Type', 'Date', 'Payee', 'Debit', 'Credit', 'Status'],
      rows: vouchers.map(v => [v.voucherNo, voucherTypeLabels[v.voucherType] || v.voucherType, v.dateIso, v.payee || '-', v.totalDebit.toFixed(2), v.totalCredit.toFixed(2), v.status])
    })
  }

  return (
    <div className="p-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="bg-linear-to-r from-blue-600 to-indigo-700 rounded-lg shadow p-5 mb-6 flex items-center justify-between text-white">
        <div>
          <h1 className="text-2xl font-semibold">Vouchers</h1>
          <p className="text-sm text-blue-100 mt-1">Manage BPV, BRV, CPV, CRV, Contra, and Journal Vouchers</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg"
          >
            Export PDF
          </button>
          <button
            onClick={() => navigate('/finance/vouchers/new?mode=expense')}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg"
          >
            + Expense
          </button>
          <button
            onClick={() => navigate('/finance/vouchers/new')}
            className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
          >
            + New Voucher
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search vouchers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">All Types</option>
              <option value="BPV">Bank Payment</option>
              <option value="BRV">Bank Receipt</option>
              <option value="CPV">Cash Payment</option>
              <option value="CRV">Cash Receipt</option>
              <option value="CONTRA">Contra</option>
              <option value="JV">Journal</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="posted">Posted</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select value={filterModule} onChange={e => setFilterModule(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">All Modules</option>
              {VOUCHER_MODULES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
            <select value={filterExpense} onChange={e => setFilterExpense(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">All Vouchers</option>
              <option value="yes">Expenses Only</option>
              <option value="no">Non-Expense</option>
            </select>
            <div className="flex items-center gap-1">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-2 py-2 border border-slate-200 rounded-lg text-sm w-36" />
              <span className="text-slate-400">-</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-2 py-2 border border-slate-200 rounded-lg text-sm w-36" />
            </div>
            <button onClick={handleSearch} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Search</button>
            <button onClick={clearFilters} className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-600">Clear</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Voucher No</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Payee</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Module</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Expense</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">Debit</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">Credit</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-500"><div className="animate-pulse">Loading vouchers...</div></td></tr>
              ) : vouchers.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400"><FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />No vouchers found for the selected filters.</td></tr>
              ) : (
                vouchers.map((v) => (
                  <tr key={v._id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-3 font-semibold text-slate-700">{v.voucherNo}</td>
                    <td className="px-4 py-3 text-slate-600">{voucherTypeLabels[v.voucherType] || v.voucherType}</td>
                    <td className="px-4 py-3 text-slate-600">{v.dateIso}</td>
                    <td className="px-4 py-3 text-slate-600">{v.payee || '-'}</td>
                    <td className="px-4 py-3">
                      {v.module ? <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700">{v.module}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {v.isExpense ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-orange-100 text-orange-700" title={v.expenseAccountCode ? `${v.expenseAccountCode} — ${v.expenseAccountName || ''}` : ''}>Expense{v.costCenter ? ` / ${v.costCenter}` : ''}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">{v.totalDebit.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">{v.totalCredit.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[v.status]}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => navigate(`/finance/vouchers/${v._id}`)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="View"><Eye className="h-3.5 w-3.5" /></button>
                        {v.status === 'draft' && (
                          <>
                            <button onClick={() => navigate(`/finance/vouchers/${v._id}`)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleDelete(v._id)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between bg-white">
            <div className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{((page - 1) * limit) + 1}</span> to <span className="font-medium text-slate-700">{Math.min(page * limit, total)}</span> of <span className="font-medium text-slate-700">{total}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-slate-600"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <span className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg border border-slate-200">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-slate-600"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
