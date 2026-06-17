import { useState, useEffect, useRef } from 'react'
import { hospitalApi, pharmacyApi } from '../../utils/api'

function AutocompleteInput({ value, onChange, options, placeholder, disabled }: { value: string, onChange: (v: string) => void, options: any[], placeholder?: string, disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(value)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSearch(value)
  }, [value])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        placeholder={placeholder}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      {open && (
        <div className="absolute z-10 w-full mt-1 max-h-48 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {filtered.length > 0 ? (
            <ul className="py-1">
              {filtered.map((opt, i) => (
                <li
                  key={i}
                  className="px-3 py-1.5 text-sm cursor-pointer hover:bg-slate-100"
                  onClick={() => {
                    setSearch(opt.name)
                    onChange(opt.name)
                    setOpen(false)
                  }}
                >
                  {opt.name}
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2 text-sm text-slate-500">No matches</div>
          )}
        </div>
      )}
    </div>
  )
}

function PharmacyOrderDialog({
  open,
  onClose,
  encounterId,
  existingData,
  onSaved
}: {
  open: boolean
  onClose: () => void
  encounterId: string
  existingData?: any
  onSaved: () => void
}) {
  const [items, setItems] = useState<Array<{ name: string; qty: number; dose?: string }>>([{ name: '', qty: 1, dose: '' }])
  const [medicineOptions, setMedicineOptions] = useState<any[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadMeds() {
      setLoadingOptions(true)
      try {
        const res = await pharmacyApi.listInventory({ limit: 5000 }) as any
        if (!cancelled) {
          const meds = (res?.items || []).filter((it: any) => it.name)
          setMedicineOptions(meds)
        }
      } catch (e) {
        // ignore
      } finally {
        if (!cancelled) setLoadingOptions(false)
      }
    }
    loadMeds()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (open) {
      if (existingData?.items && Array.isArray(existingData.items) && existingData.items.length > 0) {
        setItems(existingData.items.map((it: any) => ({ name: it.name, qty: it.qty, dose: it.dose || '' })))
      } else {
        setItems([{ name: '', qty: 1, dose: '' }])
      }
    }
  }, [open, existingData])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  if (!open) return null

  const addRow = () => setItems([...items, { name: '', qty: 1, dose: '' }])
  const removeRow = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const updateRow = (idx: number, patch: Partial<{ name: string; qty: number; dose: string }>) => {
    setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it))
  }

  const handleSubmit = async () => {
    const validItems = items.filter(it => it.name.trim())
    if (validItems.length === 0) {
      setToast({ type: 'error', message: 'Please add at least one medicine' })
      return
    }
    setSaving(true)
    try {
      if (existingData?._id) {
        await hospitalApi.updatePharmacyOrder(existingData._id, { items: validItems })
        setToast({ type: 'success', message: 'Pharmacy order updated' })
      } else {
        const encRes = await hospitalApi.getEREncounterById(encounterId) as any
        const docId = encRes?.encounter?.doctorId?._id || encRes?.encounter?.doctorId || localStorage.getItem('hospital.userId') || '000000000000000000000000'
  
        await hospitalApi.createPharmacyOrder(encounterId, {
          doctorId: docId,
          items: validItems,
        })
        setToast({ type: 'success', message: 'Pharmacy order created' })
      }
      onSaved()
      onClose()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to save order' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">
          {existingData ? 'Edit Pharmacy Order' : 'New Pharmacy Order'}
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-[1fr_100px_100px_40px] gap-3 text-xs font-medium text-slate-600 mb-2">
            <div>Medicine Name</div>
            <div>Dose</div>
            <div className="text-center">Quantity</div>
            <div></div>
          </div>
          
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_100px_100px_40px] gap-3 items-center">
              <div>
                <AutocompleteInput
                  options={medicineOptions}
                  value={item.name}
                  onChange={(val) => updateRow(idx, { name: val })}
                  placeholder="Select or type medicine..."
                  disabled={loadingOptions}
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="e.g. 5mg"
                  value={item.dose}
                  onChange={(e) => updateRow(idx, { dose: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <input
                  type="number"
                  min="1"
                  value={item.qty}
                  onChange={(e) => updateRow(idx, { qty: parseInt(e.target.value) || 1 })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-center"
                />
              </div>
              <div className="flex justify-center">
                {items.length > 1 && (
                  <button
                    onClick={() => removeRow(idx)}
                    className="rounded-md border border-rose-300 bg-rose-50 px-2 py-2 text-rose-600 hover:bg-rose-100"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                )}
              </div>
            </div>
          ))}
          
          <div className="pt-2">
            <button onClick={addRow} className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1">
              <span>+</span> Add another medicine
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy px-4 py-2 text-sm">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save & Send to Pharmacy'}
          </button>
        </div>
        {toast && (
          <div className="absolute top-4 right-4 z-[60] max-w-sm">
            <div className={toast.type === 'success' ? 'rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow' : 'rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow'}>
              {toast.message}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Hospital_ErPharmacyReferrals({ encounterId }: { encounterId: string }) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingData, setEditingData] = useState<any>(null)
  
  const load = async () => {
    setLoading(true)
    try {
      const res = await hospitalApi.listPharmacyOrders(encounterId, { limit: 100 }) as any
      setOrders(res?.orders || [])
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [encounterId])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return
    try {
      await hospitalApi.deletePharmacyOrder(id)
      load()
    } catch (e) {
      alert('Failed to delete')
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Pharmacy Orders (ER)</h3>
        <button
          onClick={() => { setEditingData(null); setOpenDialog(true) }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add Order
        </button>
      </div>
      
      {loading ? (
        <div className="py-8 text-center text-sm text-slate-500">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-500">No pharmacy orders found.</div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="rounded-lg border border-slate-200 p-4 shadow-sm bg-slate-50">
              <div className="flex justify-between items-start mb-3">
                <div className="text-sm font-semibold text-slate-700">
                  {new Date(order.createdAt).toLocaleString()}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold uppercase ${
                    order.status === 'completed' ? 'text-emerald-600' :
                    order.status === 'cancelled' ? 'text-rose-600' :
                    'text-amber-600'
                  }`}>
                    {order.status}
                  </span>
                  {order.status === 'pending' && (
                    <div className="flex gap-2 border-l border-slate-300 pl-3">
                      <button
                        onClick={() => { setEditingData(order); setOpenDialog(true) }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(order._id)}
                        className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-2 font-medium">Medicine</th>
                      <th className="px-4 py-2 font-medium w-32">Dose</th>
                      <th className="px-4 py-2 font-medium w-24 text-center">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items?.map((it: any, i: number) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-slate-800">{it.name}</td>
                        <td className="px-4 py-2 text-slate-600">{it.dose || '-'}</td>
                        <td className="px-4 py-2 text-slate-800 text-center font-medium">{it.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Reference to Referral Workflow */}
              {order.linkedReferralId && typeof order.linkedReferralId === 'object' && (
                <div className="mt-3 text-xs text-slate-500">
                  Fulfillment Status: <span className="font-semibold uppercase">{order.linkedReferralId.status}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <PharmacyOrderDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        encounterId={encounterId}
        existingData={editingData}
        onSaved={load}
      />
    </div>
  )
}
