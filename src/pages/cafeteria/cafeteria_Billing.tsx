import { useState, useEffect, useCallback } from 'react'
import { Search, Eye, Printer, Loader2, FileText, ReceiptText, CalendarDays } from 'lucide-react'
import { cafeteriaApi } from '../../features/cafeteria'
import DatePicker from '../../components/cafeteria/DatePicker'

export default function Cafeteria_Billing() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
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

  const filtered = search
    ? sales.filter(s => s.billNo?.toLowerCase().includes(search.toLowerCase()) || s.customerName?.toLowerCase().includes(search.toLowerCase()))
    : sales

  function printReceipt(sale: any) {
    const w = window.open('', '_blank', 'width=400,height=600')
    if (!w) return
    const itemsHtml = (sale.items || []).map((it: any) => `
      <tr>
        <td style="padding:4px 0;font-size:12px;">${it.name}</td>
        <td style="padding:4px 4px;text-align:center;font-size:12px;">${it.qty}</td>
        <td style="padding:4px 8px;text-align:right;font-size:12px;">Rs ${Number(it.price).toLocaleString()}</td>
        <td style="padding:4px 0;text-align:right;font-size:12px;font-weight:600;">Rs ${(it.price * it.qty).toLocaleString()}</td>
      </tr>
    `).join('')
    w.document.write(`
      <html><head><title>Receipt ${sale.billNo}</title>
      <style>
        *{font-family:monospace,sans-serif;}
        body{width:320px;margin:0 auto;padding:16px;color:#1e293b;}
        h2{text-align:center;font-size:18px;margin:0;}
        p{text-align:center;font-size:11px;margin:2px 0;color:#64748b;}
        hr{border:none;border-top:1px dashed #cbd5e1;margin:8px 0;}
        table{width:100%;border-collapse:collapse;}
        th{font-size:10px;text-transform:uppercase;color:#94a3b8;padding:4px 0;border-bottom:1px solid #e2e8f0;}
        th:nth-child(2){text-align:center;}th:nth-child(3),th:nth-child(4){text-align:right;}
        .total{display:flex;justify-content:space-between;padding:4px 0;font-size:14px;font-weight:700;border-top:2px solid #1e293b;margin-top:8px;}
        .row{display:flex;justify-content:space-between;padding:2px 0;font-size:12px;}
        .label{color:#64748b;}
        .footer{text-align:center;font-size:10px;color:#94a3b8;margin-top:12px;}
      </style></head><body>
        <h2>Cafeteria</h2>
        <p>${new Date(sale.datetime).toLocaleString()}</p>
        <p>Bill: ${sale.billNo} | ${sale.orderType || 'Dining'}${sale.tableNumber ? ' | Table: ' + sale.tableNumber : ''}</p>
        <hr>
        <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
        <hr>
        <div class="row"><span class="label">Subtotal</span><span>Rs ${Number(sale.subtotal).toLocaleString()}</span></div>
        ${sale.discountAmount > 0 ? `<div class="row"><span class="label">Discount (${sale.discountPct}%)</span><span>- Rs ${Number(sale.discountAmount).toLocaleString()}</span></div>` : ''}
        ${sale.deliveryFee > 0 ? `<div class="row"><span class="label">Delivery Fee</span><span>Rs ${Number(sale.deliveryFee).toLocaleString()}</span></div>` : ''}
        <div class="total"><span>Total</span><span>Rs ${Number(sale.total).toLocaleString()}</span></div>
        <div class="row"><span class="label">Payment: ${sale.paymentMethod}</span><span class="label">Customer: ${sale.customerName}</span></div>
        ${sale.customerPhone ? `<div class="row"><span class="label">Phone: ${sale.customerPhone}</span></div>` : ''}
        ${sale.deliveryAddress ? `<div class="row"><span class="label">Delivery to: ${sale.deliveryAddress}</span></div>` : ''}
        <div class="footer">Thank you for your visit!</div>
      </body></html>
    `)
    w.document.close()
    w.print()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Billing & Receipts</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">View and print bills</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <FileText className="h-4 w-4" />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <DatePicker value={from} onChange={setFrom} label="From" />
        <DatePicker value={to} onChange={setTo} label="To" />
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by bill no or customer..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
        </div>
        <button onClick={load} className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-orange-600/20 transition-all hover:bg-orange-700 hover:shadow-md active:scale-[0.98]">
          Filter
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-50 dark:border-slate-800/50">
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Bill No</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Order Type</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</th>
              <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment</th>
              <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-300" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">No bills found</td></tr>
            ) : filtered.map(s => (
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
                <td className="px-5 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    s.orderType === 'Delivery' ? 'bg-violet-50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-400'
                    : s.orderType === 'Take Away' ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/20 dark:text-sky-400'
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                  }`}>{s.orderType || 'Dining'}</span>
                </td>
                <td className="px-5 py-3">
                  <p className="text-slate-600 dark:text-slate-300">{s.customerName}</p>
                  {s.customerPhone && <p className="text-[10px] text-slate-400">{s.customerPhone}</p>}
                </td>
                <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-slate-100">Rs {Number(s.total).toLocaleString()}</td>
                <td className="px-5 py-3 text-center">
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">{s.paymentMethod}</span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setDetail(s)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800" title="View">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button onClick={() => printReceipt(s)} className="flex items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-600 transition hover:bg-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:hover:bg-orange-950/30" title="Print Receipt">
                      <Printer className="h-3.5 w-3.5" /> Print
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-50 px-6 py-4 dark:border-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                  <ReceiptText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{detail.billNo}</h3>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{detail.orderType || 'Dining'}{detail.tableNumber ? ' - Table ' + detail.tableNumber : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => printReceipt(detail)} className="flex h-8 w-8 items-center justify-center rounded-lg text-orange-500 transition hover:bg-orange-50 dark:hover:bg-orange-950/20" title="Print">
                  <Printer className="h-4 w-4" />
                </button>
                <button onClick={() => setDetail(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                  <span className="text-lg leading-none">&times;</span>
                </button>
              </div>
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
                  {detail.customerPhone && <p className="text-[10px] text-slate-400">{detail.customerPhone}</p>}
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cashier</p>
                  <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">{detail.createdBy || 'N/A'}</p>
                </div>
              </div>
              {detail.deliveryAddress && (
                <div className="mb-4 rounded-xl bg-violet-50 px-3 py-2.5 text-sm dark:bg-violet-950/20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Delivery Address</p>
                  <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">{detail.deliveryAddress}{detail.deliveryPhone ? ' - ' + detail.deliveryPhone : ''}</p>
                </div>
              )}
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
                {detail.deliveryFee > 0 && <div className="flex justify-between"><span className="text-slate-500">Delivery Fee</span><span className="font-semibold text-slate-800 dark:text-slate-200">Rs {Number(detail.deliveryFee).toLocaleString()}</span></div>}
                <div className="flex justify-between border-t border-slate-200 pt-1.5 dark:border-slate-700/50">
                  <span className="font-bold text-slate-900 dark:text-slate-100">Total</span>
                  <span className="text-lg font-extrabold text-orange-600 dark:text-orange-400">Rs {Number(detail.total).toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={() => printReceipt(detail)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition-all hover:bg-orange-700 active:scale-[0.98]"
              >
                <Printer className="h-4 w-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
