import { useEffect, useState } from 'react'
import { financeApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'

export default function Finance_ApprovalQueue() {
  const [vouchers, setVouchers] = useState<any[]>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [loading, setLoading] = useState(false)

  async function fetchPending() {
    setLoading(true)
    try {
      const res = await financeApi.listVouchers({ status: 'pending_approval', limit: 100 })
      setVouchers((res as any)?.vouchers || [])
    } catch { setVouchers([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchPending() }, [])

  async function handleApprove(id: string) {
    try {
      await financeApi.approveVoucher(id)
      setToast({ type: 'success', message: 'Voucher approved' })
      fetchPending()
    } catch (e: any) { setToast({ type: 'error', message: e?.message || 'Failed' }) }
  }

  async function handlePost(id: string) {
    try {
      await financeApi.postVoucher(id)
      setToast({ type: 'success', message: 'Voucher posted' })
      fetchPending()
    } catch (e: any) { setToast({ type: 'error', message: e?.message || 'Failed' }) }
  }

  return (
    <div className="w-full p-3 sm:p-4 space-y-4">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="text-xl font-semibold text-slate-800">Approval Queue</div>
      <div className="text-sm text-slate-500">Vouchers pending your approval</div>

      <div className="space-y-2">
        {vouchers.map((v: any) => {
          const totalDebit = (v.lines || []).reduce((s: number, l: any) => s + (l.debit || 0), 0)
          return (
            <div key={v._id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">{v.voucherNo}</span>
                  <span className="ml-2 text-sm text-slate-500">{v.voucherType} | {v.dateIso}</span>
                  <span className="ml-2 rounded bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">PENDING APPROVAL</span>
                </div>
                <span className="text-sm font-semibold text-slate-800">PKR {totalDebit.toLocaleString()}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {v.payee && <span>Payee: {v.payee} | </span>}
                {v.narration && <span>{v.narration}</span>}
                {v.createdBy && <span className="ml-2">Created by: {v.createdBy}</span>}
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => handleApprove(v._id)} className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">Approve</button>
                <button onClick={() => handlePost(v._id)} className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Approve & Post</button>
              </div>
            </div>
          )
        })}
        {vouchers.length === 0 && !loading && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">No vouchers pending approval</div>
        )}
      </div>
    </div>
  )
}
