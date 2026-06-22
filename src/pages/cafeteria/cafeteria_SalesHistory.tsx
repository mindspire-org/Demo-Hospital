import { useState, useEffect, useCallback } from 'react'
import { Eye, X, Loader2, ReceiptText, CalendarDays } from 'lucide-react'
import { cafeteriaApi } from '../../features/cafeteria'
import DatePicker from '../../components/cafeteria/DatePicker'

export default function Cafeteria_SalesHistory() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [detail, setDetail] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await cafeteriaApi.listSales({ from: from || undefined, to: to || undefined, limit: 100 })
      setSales(r?.items || [])
    } catch {} finally { setLoading(false) }
  }, [from, to])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Sales History</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">All cafeteria transactions</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <DatePicker value={from} onChange={setFrom} label="From" />
        <DatePicker value={to} onChange={setTo} label="To" />
        <button
          onClick={load}
          className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-orange-600/20 transition-all hover:bg-orange-700 hover:shadow-md active:scale-[0.98]"
        >
          Filter
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-50 dark:border-slate-800/50">
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Bill No</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Items</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</th>
              <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment</th>
              <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-300" /></td></tr>
            ) : sales.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">No sales found</td></tr>
            ) : sales.map(s => (
              <tr key={s._id} className="border-b border-slate-50 transition hover:bg-slate-50 dark:border-slate-800/30 dark:hover:bg-slate-800/40">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-orange-500 dark:bg-orange-950/20">
                      <ReceiptText className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{s.billNo}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                    <span>{new Date(s.datetime).toLocaleDateString()}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{s.customerName}</td>
                <td className="px-5 py-3 text-right font-medium text-slate-600 dark:text-slate-300">{s.items?.length || 0}</td>
                <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-slate-100">Rs {Number(s.total).toLocaleString()}</td>
                <td className="px-5 py-3 text-center">
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">{s.paymentMethod}</span>
                </td>
                <td className="px-5 py-3 text-center">
                  <button onClick={() => setDetail(s)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sale Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-50 px-6 py-4 dark:border-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                  <ReceiptText className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Sale {detail.billNo}</h3>
              </div>
              <button onClick={() => setDetail(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>

            <div className="px-6 py-4">
              <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</p>
                  <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">{new Date(detail.datetime).toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment</p>
                  <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">{detail.paymentMethod}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer</p>
                  <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">{detail.customerName}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cashier</p>
                  <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">{detail.createdBy || 'N/A'}</p>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/50">
                    <th className="py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Item</th>
                    <th className="py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Qty</th>
                    <th className="py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Price</th>
                    <th className="py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items?.map((it: any, i: number) => (
                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800/30">
                      <td className="py-2 font-medium text-slate-800 dark:text-slate-200">{it.name}</td>
                      <td className="py-2 text-right text-slate-600 dark:text-slate-300">{it.qty}</td>
                      <td className="py-2 text-right text-slate-600 dark:text-slate-300">Rs {Number(it.price).toLocaleString()}</td>
                      <td className="py-2 text-right font-semibold text-slate-800 dark:text-slate-200">Rs {(it.price * it.qty).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 space-y-1.5 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/50">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-semibold text-slate-800 dark:text-slate-200">Rs {Number(detail.subtotal).toLocaleString()}</span></div>
                {detail.discountAmount > 0 && <div className="flex justify-between"><span className="text-slate-500">Discount ({detail.discountPct}%)</span><span className="font-semibold text-red-500">- Rs {Number(detail.discountAmount).toLocaleString()}</span></div>}
                <div className="flex justify-between border-t border-slate-200 pt-1.5 dark:border-slate-700/50">
                  <span className="font-bold text-slate-900 dark:text-slate-100">Total</span>
                  <span className="text-lg font-extrabold text-orange-600 dark:text-orange-400">Rs {Number(detail.total).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-0.5"><span className="text-slate-500">Profit</span><span className="font-semibold text-emerald-600 dark:text-emerald-400">Rs {Number(detail.profit).toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
