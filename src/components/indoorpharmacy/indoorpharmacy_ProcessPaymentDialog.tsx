import { useEffect, useState, useRef } from 'react'
import type { Customer } from './indoorpharmacy_AddCustomer'
import { indoorPharmacyApi } from '../../utils/api'
import { ipdApi } from '../../features/hospital/ipd'
import { erApi } from '../../features/hospital/er'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: (data: { method: 'cash' | 'credit' | 'patient'; customer?: string; customerId?: string; customerPhone?: string; encounterId?: string; encounterType?: string }) => void
}

export default function Pharmacy_ProcessPaymentDialog({ open, onClose, onConfirm }: Props) {
  const [method, setMethod] = useState<'cash' | 'credit' | 'patient'>('cash')
  const [form, setForm] = useState<{ name: string; phone: string; address: string; cnic: string; mrNumber: string }>({ name: '', phone: '', address: '', cnic: '', mrNumber: '' })
  const [suggestions, setSuggestions] = useState<Customer[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const dummyRef = useRef<HTMLInputElement>(null)

  const [patientQuery, setPatientQuery] = useState('')
  const [patientSuggestions, setPatientSuggestions] = useState<Array<{
    encounterId: string
    patientName: string
    mrn?: string
    type: 'IPD' | 'ER'
    bedLabel?: string
    location?: string
  }>>([])
  const [selectedPatient, setSelectedPatient] = useState<typeof patientSuggestions[0] | null>(null)

  useEffect(() => {
    if (!open) return
    const q = (form.cnic || '').trim() || (form.mrNumber || '').trim() || (form.phone || '').trim()
    if (!q || q.length < 3) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      try {
        const res: any = await indoorPharmacyApi.listCustomers({ q })
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
    setPatientQuery('')
    setPatientSuggestions([])
    setSelectedPatient(null)
    const t = setTimeout(() => {
      try {
        dummyRef.current?.focus()
      } catch {}
    }, 0)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open || method !== 'patient') return
    const q = patientQuery.trim()
    if (!q || q.length < 2) { setPatientSuggestions([]); return }
    const t = setTimeout(async () => {
      try {
        const [ipdRes, erRes] = await Promise.allSettled([
          ipdApi.listIPDAdmissions({ status: 'admitted', q, limit: 10 }),
          erApi.listEREncounters({ status: 'admitted', q, limit: 10 }),
        ])
        const suggestions: typeof patientSuggestions = []
        if (ipdRes.status === 'fulfilled') {
          const admissions = (ipdRes.value as any)?.admissions || []
          for (const a of admissions) {
            const p = a.patientId || {}
            suggestions.push({
              encounterId: String(a._id),
              patientName: p.fullName || 'Unknown',
              mrn: p.mrn,
              type: 'IPD',
              bedLabel: a.bedLabel,
              location: a.bedLocation ? `${a.bedLocation.floor} / ${a.bedLocation.location}` : undefined,
            })
          }
        }
        if (erRes.status === 'fulfilled') {
          const encounters = (erRes.value as any)?.encounters || []
          for (const e of encounters) {
            const p = e.patientId || {}
            suggestions.push({
              encounterId: String(e._id),
              patientName: p.fullName || 'Unknown',
              mrn: p.mrn,
              type: 'ER',
              bedLabel: undefined,
              location: undefined,
            })
          }
        }
        setPatientSuggestions(suggestions)
      } catch {}
    }, 400)
    return () => clearTimeout(t)
  }, [patientQuery, method, open])

  if (!open) return null

  const confirm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (method === 'patient') {
      if (!selectedPatient) return
      onConfirm({
        method: 'patient',
        customer: selectedPatient.patientName,
        encounterId: selectedPatient.encounterId,
        encounterType: selectedPatient.type,
      })
      return
    }
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

  const showCredit = method === 'credit'
  const showPatient = method === 'patient'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <form onSubmit={confirm} className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Process Payment</h3>
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={()=> setMethod('cash')} className={`flex-1 rounded-md border px-3 py-2 text-center text-sm ${method==='cash' ? 'border-navy bg-navy text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'}`}>Cash</button>
            <button type="button" onClick={()=> setMethod('credit')} className={`flex-1 rounded-md border px-3 py-2 text-center text-sm ${method==='credit' ? 'border-navy bg-navy text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'}`}>Credit</button>
            <button type="button" onClick={()=> setMethod('patient')} className={`flex-1 rounded-md border px-3 py-2 text-center text-sm ${method==='patient' ? 'border-navy bg-navy text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'}`}>Bill to Patient</button>
          </div>

          <input ref={dummyRef} className="hidden" />

          {showPatient ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Search Patient (IPD / ER)</label>
                <input
                  value={patientQuery}
                  onChange={e => { setPatientQuery(e.target.value); setSelectedPatient(null) }}
                  placeholder="Type patient name or MRN…"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              {patientSuggestions.length > 0 && !selectedPatient && (
                <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                  {patientSuggestions.map((p, i) => (
                    <button type="button" key={`${p.encounterId}-${i}`} onClick={() => setSelectedPatient(p)} className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{p.patientName}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${p.type === 'IPD' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{p.type}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {p.mrn ? `MRN: ${p.mrn}` : ''} {p.bedLabel ? `· Bed: ${p.bedLabel}` : ''} {p.location ? `· ${p.location}` : ''}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedPatient && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{selectedPatient.patientName}</div>
                      <div className="text-xs text-emerald-700 dark:text-emerald-300">
                        {selectedPatient.mrn ? `MRN: ${selectedPatient.mrn}` : ''} {selectedPatient.bedLabel ? `· Bed: ${selectedPatient.bedLabel}` : ''} {selectedPatient.location ? `· ${selectedPatient.location}` : ''}
                      </div>
                    </div>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${selectedPatient.type === 'IPD' ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>{selectedPatient.type}</span>
                  </div>
                  <button type="button" onClick={() => setSelectedPatient(null)} className="mt-2 text-xs text-emerald-700 underline dark:text-emerald-300">Change patient</button>
                </div>
              )}
            </div>
          ) : showCredit ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Customer Name</label>
                <input value={form.name} onChange={e=> setForm({ ...form, name: e.target.value })} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Phone Number</label>
                <input value={form.phone} onChange={e=> setForm({ ...form, phone: e.target.value })} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Address</label>
                <textarea rows={3} value={form.address} onChange={e=> setForm({ ...form, address: e.target.value })} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">CNIC</label>
                <input value={form.cnic} onChange={e=> setForm({ ...form, cnic: e.target.value })} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">MR #</label>
                <input value={form.mrNumber} onChange={e=> setForm({ ...form, mrNumber: e.target.value })} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </div>

              {suggestions.length > 1 && (
                <div className="rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                  {suggestions.slice(0,5).map(c => (
                    <button type="button" key={c.id} onClick={()=> pick(c)} className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800">
                      {c.name} {c.phone? `· ${c.phone}`:''} {c.cnic? `· ${c.cnic}`:''} {c.mrNumber? `· ${c.mrNumber}`:''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Customer Name (optional)</label>
              <input value={form.name} onChange={e=> setForm({ ...form, name: e.target.value })} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              <div className="mt-3">
                <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Phone Number (optional)</label>
                <input value={form.phone} onChange={e=> setForm({ ...form, phone: e.target.value })} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn">Confirm Payment</button>
        </div>
      </form>
    </div>
  )
}
