import { useEffect, useState, useRef } from 'react'
import { X, User, Phone, CheckCircle2 } from 'lucide-react'
import type { Customer } from './pharmacy_AddCustomer'
import { pharmacyApi } from '../../utils/api'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: (data: { method: 'cash' | 'credit'; customer?: string; customerId?: string; customerPhone?: string }) => void
  totalAmount?: number
}

export default function Pharmacy_ProcessPaymentDialog({ open, onClose, onConfirm, totalAmount = 0 }: Props) {
  const [method, setMethod] = useState<'cash' | 'credit'>('cash')
  const [form, setForm] = useState<{ name: string; phone: string; address: string; cnic: string; mrNumber: string }>({ name: '', phone: '', address: '', cnic: '', mrNumber: '' })
  const [suggestions, setSuggestions] = useState<Customer[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const dummyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const q = (form.cnic || '').trim() || (form.mrNumber || '').trim() || (form.phone || '').trim()
    if (!q || q.length < 3) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      try {
        const res: any = await pharmacyApi.listCustomers({ q })
        const items: Customer[] = (res.items || []).map((it: any) => ({
          id: it._id || '',
          name: it.name || '',
          company: it.company || '',
          phone: it.phone || '',
          address: it.address || '',
          cnic: it.cnic || '',
          mrNumber: it.mrNumber || '',
        }))
        setSuggestions(items)
        if (items.length === 1) {
          const c = items[0]
          setForm({ name: c.name || '', phone: c.phone || '', address: c.address || '', cnic: c.cnic || '', mrNumber: c.mrNumber || '' })
          setSelectedId(c.id)
        }
      } catch {}
    }, 300)
    return () => clearTimeout(t)
  }, [form.cnic, form.mrNumber, form.phone, open])

  useEffect(() => {
    if (!open) return
    setMethod('cash')
    setForm({ name: '', phone: '', address: '', cnic: '', mrNumber: '' })
    setSuggestions([])
    setSelectedId('')
    const t = setTimeout(() => {
      try {
        dummyRef.current?.focus()
      } catch {}
    }, 0)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
      // Enter is handled by the form's onSubmit
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, onClose])

  if (!open) return null

  const confirm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const customer = (form.name || '').trim() || undefined
    const customerId = method === 'credit' ? (selectedId || undefined) : undefined
    const customerPhone = (form.phone || '').trim() || undefined
    onConfirm({ method, customer, customerId, customerPhone })
  }

  const pick = (c: Customer) => {
    setForm({ name: c.name || '', phone: c.phone || '', address: c.address || '', cnic: c.cnic || '', mrNumber: c.mrNumber || '' })
    setSuggestions([])
    setSelectedId(c.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true">
      <form onSubmit={confirm} className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-8 pt-8 pb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Process Payment</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select mode and finalize sale</p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-8 pb-8 space-y-6">
          {/* Total Amount Card */}
          <div className="bg-slate-900 dark:bg-sky-500/10 rounded-2xl p-6 text-center shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-800 dark:border-sky-500/20">
            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 dark:text-sky-400">Total Payable Amount</span>
            <div className="text-4xl font-black text-white dark:text-sky-400 mt-1 tabular-nums">
              PKR {totalAmount.toFixed(2)}
            </div>
          </div>

          {/* Payment Mode Selector */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setMethod('cash')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all duration-200 ${
                method === 'cash' 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <div className={`h-2 w-2 rounded-full ${method === 'cash' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              Cash
            </button>
            <button
              type="button"
              onClick={() => setMethod('credit')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all duration-200 ${
                method === 'credit' 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <div className={`h-2 w-2 rounded-full ${method === 'credit' ? 'bg-orange-500 animate-pulse' : 'bg-slate-300'}`} />
              Credit
            </button>
          </div>

          {/* Customer Info Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 ml-1">Customer Name {method === 'cash' && '(Optional)'}</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-sky-500 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium text-slate-900 dark:text-white"
                  required={method === 'credit'}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 ml-1">Phone Number {method === 'cash' && '(Optional)'}</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                <input
                  type="text"
                  placeholder="e.g. 0300-1234567"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-sky-500 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {method === 'credit' && suggestions.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 overflow-hidden shadow-inner">
                {suggestions.slice(0, 3).map(c => (
                  <button type="button" key={c.id} onClick={() => pick(c)} className="block w-full px-4 py-3 text-left text-xs text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="font-bold uppercase tracking-tight">{c.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{c.phone || 'No phone'} · {c.mrNumber || 'No MR#'}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 px-6 rounded-2xl font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-2 py-4 px-6 rounded-2xl font-bold text-white bg-slate-900 dark:bg-sky-600 hover:bg-black dark:hover:bg-sky-500 shadow-xl shadow-slate-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="h-5 w-5" />
              Confirm Payment
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
