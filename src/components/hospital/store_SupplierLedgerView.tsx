import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import Pagination from '../../components/ui/Pagination'

type LedgerEntry = {
  id: string
  date: string
  type: 'purchase' | 'payment'
  reference: string
  description?: string
  debit: number
  credit: number
  balance: number
}

type Supplier = {
  id: string
  name: string
  company?: string
  phone?: string
  totalPurchases: number
  paid: number
  outstanding: number
}

type Props = {
  supplierId: string
  showBackLink?: boolean
}

export default function Store_SupplierLedgerView({ supplierId, showBackLink = true }: Props) {
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [showPayment, setShowPayment] = useState(false)
  const [unpaidPurchases, setUnpaidPurchases] = useState<Array<{ id: string; invoiceNo: string; date: string; totalAmount: number; paidAmount: number; remaining: number }>>([])
  const [paymentForm, setPaymentForm] = useState<{ purchaseId: string; amount: string; method: 'cash' | 'bank' | 'cheque'; reference: string; date: string }>({ purchaseId: '', amount: '', method: 'cash', reference: '', date: new Date().toISOString().slice(0, 10) })
  const [toast, setToast] = useState<ToastState>(null)
  const [loading, setLoading] = useState(true)

  const loadLedger = async (opts?: { from?: string; to?: string }) => {
    const res = await hospitalApi.getStoreSupplierLedger(supplierId, opts) as any
    setSupplier({
      id: String(res.supplier._id || res.supplier.id),
      name: res.supplier.name,
      company: res.supplier.company,
      phone: res.supplier.phone,
      totalPurchases: res.supplier.totalPurchases || 0,
      paid: res.supplier.paid || 0,
      outstanding: res.supplier.outstanding || 0,
    })

    let runningBalance = 0
    const ledger = (res.entries || []).map((e: any) => {
      runningBalance += (e.debit || 0) - (e.credit || 0)
      return {
        id: String(e._id || e.id),
        date: e.date,
        type: e.type,
        reference: e.reference || e.invoiceNo || '-',
        description: e.description,
        debit: e.debit || 0,
        credit: e.credit || 0,
        balance: runningBalance,
      }
    })
    setEntries(ledger)
  }

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        setLoading(true)
        await loadLedger({ from, to })
      } catch {
        if (!cancelled) setSupplier(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [supplierId, from, to])

  useEffect(() => {
    setPage(1)
  }, [from, to, limit, supplierId])

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (from && e.date < from) return false
      if (to && e.date > to) return false
      return true
    })
  }, [entries, from, to])

  const pages = useMemo(() => {
    return Math.max(1, Math.ceil(filtered.length / limit))
  }, [filtered.length, limit])

  const paged = useMemo(() => {
    const start = (page - 1) * limit
    return filtered.slice(start, start + limit)
  }, [filtered, page, limit])

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n)

  const openPaymentModal = async () => {
    try {
      const res = await hospitalApi.listStoreSupplierPurchases(supplierId) as any
      setUnpaidPurchases(res.items || [])
      setPaymentForm({ purchaseId: '', amount: '', method: 'cash', reference: '', date: new Date().toISOString().slice(0, 10) })
      setShowPayment(true)
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to load purchases' })
    }
  }

  const handlePurchaseSelect = (purchaseId: string) => {
    const purchase = unpaidPurchases.find(p => p.id === purchaseId)
    setPaymentForm(f => ({
      ...f,
      purchaseId,
      amount: purchase ? String(purchase.remaining) : '',
    }))
  }

  const handlePayment = async () => {
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      setToast({ type: 'error', message: 'Enter a valid amount' })
      return
    }
    try {
      await hospitalApi.createStoreSupplierPayment({
        supplierId,
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
        date: paymentForm.date,
        purchaseId: paymentForm.purchaseId || undefined,
      })
      setToast({ type: 'success', message: 'Payment recorded' })
      setShowPayment(false)
      setPaymentForm({ purchaseId: '', amount: '', method: 'cash', reference: '', date: new Date().toISOString().slice(0, 10) })
      await loadLedger({})
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to record payment' })
    }
  }

  const exportCSV = () => {
    const header = ['Date', 'Type', 'Reference', 'Description', 'Debit', 'Credit', 'Balance']
    const lines = [header.join(',')]
    for (const e of filtered) {
      lines.push([e.date, e.type, e.reference, e.description || '', e.debit, e.credit, e.balance].join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `supplier-ledger-${supplier?.name || supplierId}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="p-6 text-center text-slate-500">Loading...</div>
  }

  if (!supplier) {
    return <div className="p-6 text-center text-slate-500">Supplier not found</div>
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {showBackLink && (
            <Link to="/hospital/store/suppliers" className="text-sm text-sky-700 hover:underline">← Back to Suppliers</Link>
          )}
          <h2 className="mt-1 text-xl font-semibold text-slate-800">{supplier.name} - Ledger</h2>
          {supplier.company && <p className="text-sm text-slate-500">{supplier.company}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            Export CSV
          </button>
          <button onClick={openPaymentModal} className="rounded-md bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700">
            + Record Payment
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Total Purchases</div>
          <div className="text-xl font-bold text-slate-800">{formatCurrency(supplier.totalPurchases)}</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm text-emerald-600">Paid</div>
          <div className="text-xl font-bold text-emerald-700">{formatCurrency(supplier.paid)}</div>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm text-rose-600">Outstanding</div>
          <div className="text-xl font-bold text-rose-700">{formatCurrency(supplier.outstanding)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Phone</div>
          <div className="text-lg font-medium text-slate-700">{supplier.phone || '-'}</div>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
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
        <select value={limit} onChange={e => setLimit(Number(e.target.value))} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <div className="max-h-[45vh] overflow-y-auto">
            <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="px-3 py-2 font-medium text-slate-600">Date</th>
              <th className="px-3 py-2 font-medium text-slate-600">Type</th>
              <th className="px-3 py-2 font-medium text-slate-600">Reference</th>
              <th className="px-3 py-2 font-medium text-slate-600">Description</th>
              <th className="px-3 py-2 font-medium text-slate-600 text-right">Debit</th>
              <th className="px-3 py-2 font-medium text-slate-600 text-right">Credit</th>
              <th className="px-3 py-2 font-medium text-slate-600 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(entry => (
              <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-700">{entry.date}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${entry.type === 'purchase' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {entry.type === 'purchase' ? 'Purchase' : 'Payment'}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium text-slate-800">{entry.reference}</td>
                <td className="px-3 py-2 text-slate-500">{entry.description || '-'}</td>
                <td className="px-3 py-2 text-right text-rose-600">{entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</td>
                <td className="px-3 py-2 text-right text-emerald-600">{entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</td>
                <td className="px-3 py-2 text-right font-medium text-slate-700">{formatCurrency(entry.balance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-50 font-medium">
              <td colSpan={4} className="px-3 py-2 text-slate-700">Total</td>
              <td className="px-3 py-2 text-right text-rose-600">{formatCurrency(filtered.reduce((s, e) => s + e.debit, 0))}</td>
              <td className="px-3 py-2 text-right text-emerald-600">{formatCurrency(filtered.reduce((s, e) => s + e.credit, 0))}</td>
              <td className="px-3 py-2 text-right text-slate-800">{formatCurrency(filtered.length > 0 ? filtered[filtered.length - 1].balance : 0)}</td>
            </tr>
          </tfoot>
            </table>
          </div>
        </div>

        <Pagination page={page} pages={pages} total={filtered.length} onPageChange={setPage} />
      </div>

      {showPayment && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">Record Payment</h3>
              <button onClick={() => setShowPayment(false)} className="text-slate-500">✖</button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-sm text-slate-500">Outstanding Amount</div>
                <div className="text-xl font-bold text-rose-600">{formatCurrency(supplier.outstanding)}</div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Select Invoice / Purchase</label>
                <select
                  value={paymentForm.purchaseId}
                  onChange={e => handlePurchaseSelect(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500"
                >
                  <option value="">-- Select Purchase (Optional) --</option>
                  {unpaidPurchases.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.invoiceNo} | {p.date} | Remaining: {formatCurrency(p.remaining)}
                    </option>
                  ))}
                </select>
                {paymentForm.purchaseId && (
                  <p className="mt-1 text-xs text-slate-500">
                    Selected: {unpaidPurchases.find(p => p.id === paymentForm.purchaseId)?.invoiceNo} - Total: {formatCurrency(unpaidPurchases.find(p => p.id === paymentForm.purchaseId)?.totalAmount || 0)}, Paid: {formatCurrency(unpaidPurchases.find(p => p.id === paymentForm.purchaseId)?.paidAmount || 0)}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Amount *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Date</label>
                  <input
                    type="date"
                    value={paymentForm.date}
                    onChange={e => setPaymentForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Method</label>
                  <select
                    value={paymentForm.method}
                    onChange={e => setPaymentForm(f => ({ ...f, method: e.target.value as 'cash' | 'bank' | 'cheque' }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Reference / Cheque No</label>
                <input
                  value={paymentForm.reference}
                  onChange={e => setPaymentForm(f => ({ ...f, reference: e.target.value }))}
                  placeholder="Optional"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowPayment(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={handlePayment} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">Record Payment</button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
