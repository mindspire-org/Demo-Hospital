import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import Store_PurchaseSlip, { useAutoPrintPurchase, useHospitalSettings } from './store_PurchaseSlip'

type Props = {
  purchaseId: string | null
  onClose: () => void
  autoPrint?: boolean
}

export default function Store_PurchaseView({ purchaseId, onClose, autoPrint = false }: Props) {
  const [purchase, setPurchase] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const settings = useHospitalSettings()

  useEffect(() => {
    if (!purchaseId) {
      setPurchase(null)
      return
    }

    let cancelled = false
    async function loadPurchase() {
      setLoading(true)
      setError(null)
      try {
        const res = await hospitalApi.getStorePurchase(purchaseId!) as any
        const p = res.purchase || res.data || res
        if (!cancelled) setPurchase(p)
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load purchase')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadPurchase()
    return () => { cancelled = true }
  }, [purchaseId])

  // Auto-print when purchase is loaded
  const supplierForPurchase = purchase ? { id: String(purchase.supplierId), name: purchase.supplierName, company: purchase.supplierCompany } : undefined
  useAutoPrintPurchase(autoPrint && purchase ? purchase : null, supplierForPurchase, settings)

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n || 0)

  if (!purchaseId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">Purchase Details</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 text-xl">✖</button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="text-center text-slate-500 py-12">Loading...</div>
          ) : error ? (
            <div className="text-center text-rose-600 py-12">{error}</div>
          ) : purchase ? (
            <>
              {/* Purchase Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="text-xs text-slate-500">Invoice No</label>
                  <div className="font-medium">{purchase.invoiceNo || '-'}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Date</label>
                  <div className="font-medium">{purchase.date?.slice(0, 10) || '-'}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Supplier</label>
                  <div className="font-medium">{purchase.supplierName || '-'}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Payment Mode</label>
                  <div className="font-medium capitalize">{purchase.paymentMode || '-'}</div>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">#</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Item</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Qty</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Unit</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">Cost</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(purchase.items || []).map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium">{item.itemName || '-'}</td>
                        <td className="px-3 py-2">{item.quantity || 0}</td>
                        <td className="px-3 py-2">{item.unit || 'pcs'}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(item.purchaseCost)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency((item.quantity || 0) * (item.purchaseCost || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total */}
              <div className="mt-4 flex justify-end">
                <div className="text-right">
                  <div className="text-sm text-slate-500">Total Amount</div>
                  <div className="text-2xl font-bold text-emerald-600">{formatCurrency(purchase.totalAmount)}</div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Close
                </button>
                <Store_PurchaseSlip
                  purchase={purchase}
                  supplier={supplierForPurchase}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
