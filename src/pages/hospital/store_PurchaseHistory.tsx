import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { getLocalDate } from '../../utils/date'
import Pagination from '../../components/ui/Pagination'
import { printPurchaseSlipA4, useHospitalSettings } from '../../components/hospital/store_PurchaseSlip'
import Store_PurchaseView from '../../components/hospital/store_PurchaseView'
import Store_SupplierLedgerView from '../../components/hospital/store_SupplierLedgerView'
import Toast, { type ToastState } from '../../components/ui/Toast'

type Purchase = {
  id: string
  date: string
  invoiceNo: string
  supplierId: string
  supplierName: string
  storeLocation?: string
  totalAmount: number
  paymentStatus: 'paid' | 'partial' | 'unpaid'
  itemCount: number
  createdAt: string
}

export default function Store_PurchaseList() {
  const [items, setItems] = useState<Purchase[]>([])
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(20)
  const [viewPurchaseId, setViewPurchaseId] = useState<string | null>(null)
  const [autoPrintView, setAutoPrintView] = useState(false)
  const [ledgerSupplierId, setLedgerSupplierId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const cancelledRef = useRef(false)
  const loadingRef = useRef(false)
  const settings = useHospitalSettings()

  const loadItems = async (p = 1) => {
    // Prevent concurrent calls
    if (loadingRef.current || cancelledRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      const res = await hospitalApi.listStorePurchases({
        from: from || undefined,
        to: to || undefined,
        search: query || undefined,
        status: statusFilter || undefined,
        page: p,
        limit,
      }) as any
      if (cancelledRef.current) return
      const purchases = (res.purchases || res.data || res || []).map((p: any) => ({
        id: String(p._id || p.id),
        date: p.date,
        invoiceNo: p.invoiceNo,
        supplierId: p.supplierId,
        supplierName: p.supplierName || 'Unknown',
        storeLocation: p.storeLocation || '',
        totalAmount: p.totalAmount || 0,
        paymentStatus: p.paymentStatus || 'unpaid',
        itemCount: p.items?.length || 0,
        createdAt: p.createdAt,
      })) as Purchase[]
      setItems(purchases)
      const pg = res.pagination || {}
      setPage(pg.page || 1)
      setPages(pg.pages || 1)
      setTotal(pg.total || 0)
    } catch {
      if (!cancelledRef.current) setItems([])
    } finally {
      loadingRef.current = false
      if (!cancelledRef.current) setLoading(false)
    }
  }

  // Single effect for all data loading
  useEffect(() => {
    cancelledRef.current = false
    const timer = setTimeout(() => {
      if (!cancelledRef.current) loadItems(1)
    }, 100)
    return () => {
      cancelledRef.current = true
      clearTimeout(timer)
    }
  }, [from, to, statusFilter, query, limit])

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n)

  const statusColors: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700',
    partial: 'bg-amber-100 text-amber-700',
    unpaid: 'bg-rose-100 text-rose-700',
  }

  const exportCSV = () => {
    const header = ['Date', 'Invoice No', 'Supplier', 'Store Location', 'Amount', 'Status', 'Items']
    const lines = [header.join(',')]
    for (const p of items) {
      lines.push([p.date, p.invoiceNo, p.supplierName, p.storeLocation || '', p.totalAmount, p.paymentStatus, p.itemCount].join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `purchases-${getLocalDate()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = async (purchaseId: string) => {
    try {
      const res = await hospitalApi.getStorePurchase(purchaseId) as any
      const purchase = res.purchase || res.data || res
      
      // Fetch supplier details if supplierId exists
      let supplier = undefined
      if (purchase?.supplierId) {
        try {
          const supplierRes = await hospitalApi.getStoreSupplier(purchase.supplierId) as any
          supplier = supplierRes.supplier || supplierRes.data || supplierRes
        } catch {
          // Silently fail - will use purchase.supplierName only
        }
      }
      
      printPurchaseSlipA4(purchase, supplier, settings)
    } catch {
      // Silently fail
    }
  }

  const handleView = (purchaseId: string, print = false) => {
    setViewPurchaseId(purchaseId)
    setAutoPrintView(print)
  }

  const handleDeleteClick = (id: string) => {
    setDeleteId(id)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    try {
      await hospitalApi.deleteStorePurchase(deleteId)
      setToast({ type: 'success', message: 'Purchase deleted successfully' })
      setDeleteId(null)
      loadItems(page)
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to delete purchase' })
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-800">Purchase History</h2>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            Export CSV
          </button>
          <Link to="/hospital/store/add-purchase" className="rounded-md bg-sky-600 px-3 py-1.5 text-white hover:bg-sky-700">
            + Add Purchase
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          type="date"
          value={from}
          onChange={e => setFrom(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={to}
          onChange={e => setTo(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
        </select>
        <select
          value={limit}
          onChange={e => setLimit(Number(e.target.value))}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value={10}>10 rows</option>
          <option value={20}>20 rows</option>
          <option value={50}>50 rows</option>
          <option value={100}>100 rows</option>
        </select>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search invoice or supplier..."
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
        />
      </div>

      {loading ? (
        <div className="mt-8 text-center text-slate-500">Loading...</div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="px-3 py-2 font-medium text-slate-600">Date</th>
                <th className="px-3 py-2 font-medium text-slate-600">Invoice No</th>
                <th className="px-3 py-2 font-medium text-slate-600">Supplier</th>
                <th className="px-3 py-2 font-medium text-slate-600">Store Location</th>
                <th className="px-3 py-2 font-medium text-slate-600">Items</th>
                <th className="px-3 py-2 font-medium text-slate-600 text-right">Amount</th>
                <th className="px-3 py-2 font-medium text-slate-600">Status</th>
                <th className="px-3 py-2 font-medium text-slate-600"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">No purchases found</td></tr>
              ) : (
                items.map(p => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-700">{p.date}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{p.invoiceNo}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setLedgerSupplierId(p.supplierId)}
                      className="text-sky-700 hover:underline"
                    >
                      {p.supplierName}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{p.storeLocation || '-'}</td>
                  <td className="px-3 py-2 text-slate-600">{p.itemCount} items</td>
                  <td className="px-3 py-2 text-right font-medium text-slate-700">{formatCurrency(p.totalAmount)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusColors[p.paymentStatus]}`}>
                      {p.paymentStatus.charAt(0).toUpperCase() + p.paymentStatus.slice(1)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleView(p.id)}
                        className="text-sky-700 hover:underline text-xs"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handlePrint(p.id)}
                        className="text-emerald-700 hover:underline text-xs"
                      >
                        Print
                      </button>
                      <button
                        onClick={() => handleDeleteClick(p.id)}
                        className="text-rose-600 hover:underline text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
          <Pagination page={page} pages={pages} total={total} limit={limit} onPageChange={loadItems} onLimitChange={setLimit} />
        </div>
      )}

      {/* Purchase View Modal */}
      <Store_PurchaseView
        purchaseId={viewPurchaseId}
        onClose={() => setViewPurchaseId(null)}
        autoPrint={autoPrintView}
      />

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-rose-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 text-center">Delete Purchase?</h3>
              <p className="text-sm text-slate-500 text-center mt-2">
                This action cannot be undone. This will permanently delete the purchase record.
              </p>
            </div>
            <div className="border-t border-slate-200 px-6 py-4 flex justify-center gap-3">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleteLoading}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Supplier Ledger Modal */}
      {ledgerSupplierId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">Supplier Ledger</h3>
              <button onClick={() => setLedgerSupplierId(null)} className="text-slate-500 hover:text-slate-700 text-xl">✖</button>
            </div>
            <Store_SupplierLedgerView supplierId={ledgerSupplierId} showBackLink={false} />
          </div>
        </div>
      )}
    </div>
  )
}
