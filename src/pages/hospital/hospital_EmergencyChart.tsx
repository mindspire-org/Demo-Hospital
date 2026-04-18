import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import Doctor_IpdReferralForm from '../../components/doctor/Doctor_IpdReferralForm'
import { X } from 'lucide-react'

import ErDailyMonitoring from '../../components/hospital/Hospital_ErDailyMonitoring'
import ErMedication from '../../components/hospital/Hospital_ErMedication'
import ErConsultantNotes from '../../components/hospital/Hospital_ErConsultantNotes'

function Tab({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1 text-sm ${active ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
    >
      {label}
    </button>
  )
}

function ServiceSelect({ svcCatalog, onSelect, initialValue = '' }: { svcCatalog: any[], onSelect: (svc: any) => void, initialValue?: string }) {
  const [q, setQ] = useState(initialValue)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim()
    if (!s) return svcCatalog
    return svcCatalog.filter(svc => (svc.name || svc.description || '').toLowerCase().includes(s))
  }, [svcCatalog, q])

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', clickOutside)
    return () => document.removeEventListener('mousedown', clickOutside)
  }, [])

  return (
    <div className="relative w-full" ref={ref}>
      <input
        name="description"
        value={q}
        autoComplete="off"
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Search service..."
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-[100] mt-1 max-h-48 w-full min-w-[200px] overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-xl">
          {filtered.map(svc => (
            <button
              key={svc.id || svc._id}
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              onClick={() => {
                onSelect(svc)
                setQ(svc.name || svc.description)
                setOpen(false)
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900">{svc.name || svc.description}</span>
                <span className="text-xs text-slate-500">Rs{svc.price || svc.amount}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Hospital_EmergencyChart(){
  const { id } = useParams()
  const navigate = useNavigate()

  const tokenId = String(id || '')

  const [openCharge, setOpenCharge] = useState(false)
  const [editCharge, setEditCharge] = useState<null | { id: string; description: string; qty: number; unitPrice: number }>(null)

  const [tab, setTab] = useState<'monitoring'|'consult'|'meds'>('monitoring')
  const [openAdvance, setOpenAdvance] = useState(false)

  const [, setLoadingEnc] = useState(false)
  const [encounterId, setEncounterId] = useState('')
  const [mrn, setMrn] = useState('')
  const [patientData, setPatientData] = useState<{
    name: string
    phone: string
    address: string
    guardianName: string
    tokenNo: string
  }>({ name: '', phone: '', address: '', guardianName: '', tokenNo: '' })
  const [, setCharges] = useState<Array<{ id: string; description: string; qty: number; unitPrice: number; amount: number; date?: string }>>([])
  const [, setLoadingCharges] = useState(false)
  const [, setPayments] = useState<any[]>([])

  const [svcCatalog, setSvcCatalog] = useState<Array<{ id: string; name: string; price: number }>>([])

  const [toast, setToast] = useState<{ type: 'success'|'error'|'info'; message: string } | null>(null)
  const [confirmDel, setConfirmDel] = useState<{ open: boolean; chargeId: string } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    let cancelled = false
    async function load(){
      if (!tokenId) return
      setLoadingEnc(true)
      try{
        const res: any = await hospitalApi.getToken(tokenId)
        const t: any = res?.token
        const encId = String(t?.encounterId?._id || t?.encounterId || '')
        const pmrn = String(t?.patientId?.mrn || t?.mrn || '')
        const patient = t?.patientId || {}
        if (!cancelled){
          setEncounterId(encId)
          setMrn(pmrn)
          setPatientData({
            name: String(patient.name || t?.patientName || ''),
            phone: String(patient.phone || ''),
            address: String(patient.address || ''),
            guardianName: String(patient.guardianName || ''),
            tokenNo: String(t?.tokenNo || t?.displayTokenNo || ''),
          })
        }
      }catch{
        if (!cancelled){ setEncounterId(''); setMrn('') }
      }finally{
        if (!cancelled) setLoadingEnc(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [tokenId])

  async function reloadCharges(){
    if (!encounterId) { setCharges([]); return }
    setLoadingCharges(true)
    try{
      const res: any = await hospitalApi.listErCharges(encounterId, { limit: 200 })
      const rows: any[] = res?.charges || []
      setCharges(rows.map((c: any) => ({
        id: String(c._id || c.id),
        description: String(c.description || ''),
        qty: Number(c.qty || 0),
        unitPrice: Number(c.unitPrice || 0),
        amount: Number(c.amount || 0),
        date: c.date ? String(c.date) : (c.createdAt ? String(c.createdAt) : ''),
      })))
    }catch{
      setCharges([])
    }finally{
      setLoadingCharges(false)
    }
  }

  async function reloadBillingSummary(){
    if (!encounterId) { setPayments([]); return }
    try{
      const payRes = await hospitalApi.erListPayments(encounterId, { limit: 500 })
      setPayments(payRes?.payments || [])
    }catch{
      setPayments([])
    }
  }

  useEffect(() => { reloadCharges(); reloadBillingSummary() }, [encounterId])

  useEffect(() => {
    let cancelled = false
    async function loadSvc(){
      try{
        const res: any = await hospitalApi.listErServices({ active: true, limit: 200 })
        const rows: any[] = res?.services || []
        if (cancelled) return
        setSvcCatalog(rows.map((r:any)=>({ id: String(r._id||r.id), name: String(r.name||''), price: Number(r.price||0) })))
      }catch{
        if (!cancelled) setSvcCatalog([])
      }
    }
    loadSvc()
    return ()=>{ cancelled = true }
  }, [])

  const [showReferralDialog, setShowReferralDialog] = useState(false)

  const goReferral = () => {
    setShowReferralDialog(true)
  }

  async function saveAdvance(d: { amount: number; method: string; refNo?: string; notes?: string }) {
    if (!encounterId) return
    const amt = Number(d.amount || 0)
    if (amt <= 0) { setToast({ type: 'error', message: 'Advance amount must be greater than 0' }); return }
    try {
      await hospitalApi.erCreatePayment(encounterId, {
        amount: amt,
        method: 'Advance',
        refNo: d.refNo || '',
        notes: d.notes || '',
        receivedBy: 'hospital',
      } as any)
      setOpenAdvance(false)
      await reloadBillingSummary()
      setToast({ type: 'success', message: 'Advance recorded' })
    } catch (e: any) { setToast({ type: 'error', message: e?.message || 'Failed to record advance' }) }
  }

  const discharge = () => {
    if (!encounterId) { setToast({ type: 'error', message: 'Encounter not loaded yet' }); return }
    navigate(`/hospital/discharge/${encounterId}`)
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <div className="text-lg font-semibold text-slate-900">
                {patientData.name || 'Unknown Patient'}
              </div>
              {patientData.tokenNo && (
                <div className="text-sm font-medium text-slate-600">Token #{patientData.tokenNo}</div>
              )}
              {mrn && (
                <div className="text-sm font-medium text-slate-600">MR: {mrn}</div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              {patientData.phone && <span>📞 {patientData.phone}</span>}
              {patientData.guardianName && <span>👤 Guardian: {patientData.guardianName}</span>}
              {patientData.address && <span>📍 {patientData.address}</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={goReferral} className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700">Refer to IPD</button>
            <button onClick={discharge} className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700">Discharge</button>
            <button onClick={()=>navigate('/hospital/emergency')} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back</button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1">
          <Tab label="Daily Monitoring" active={tab==='monitoring'} onClick={()=>setTab('monitoring')} />
          <Tab label="Consultant Notes" active={tab==='consult'} onClick={()=>setTab('consult')} />
          <Tab label="Medication" active={tab==='meds'} onClick={()=>setTab('meds')} />
        </div>
      </div>

      {tab==='monitoring' && (<ErDailyMonitoring encounterId={encounterId} />)}
      {tab==='consult' && (<ErConsultantNotes encounterId={encounterId} />)}
      {tab==='meds' && (<ErMedication encounterId={encounterId} />)}

      {editCharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={async (e)=>{
              e.preventDefault()
              try{
                const fd = new FormData(e.currentTarget)
                const description = String(fd.get('description') || '').trim()
                const qty = Number(fd.get('qty') || 1)
                const unitPrice = Number(fd.get('unitPrice') || 0)
                if (!description){ setToast({ type: 'error', message: 'Service is required' }); return }
                await hospitalApi.updateErCharge(editCharge.id, { description, qty, unitPrice })
                setEditCharge(null)
                await reloadCharges()
                await reloadBillingSummary()
                setToast({ type: 'success', message: 'Service updated' })
              }catch(err:any){
                setToast({ type: 'error', message: err?.message || 'Failed to update service' })
              }
            }}
            className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
          >
            <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Edit Service</div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <label className="block text-xs font-medium text-slate-600">Service</label>
              <input
                name="description"
                defaultValue={editCharge.description}
                placeholder="Select or type service"
                list="er-service-suggestions"
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                onChange={(e)=>{
                  try{
                    const v = String(e.currentTarget.value||'').trim().toLowerCase()
                    const m = svcCatalog.find(s => String(s.name||'').trim().toLowerCase() === v)
                    if (!m) return
                    const form = e.currentTarget.form
                    const amtEl = form?.querySelector<HTMLInputElement>('input[name="unitPrice"]')
                    if (amtEl && (!amtEl.value || Number(amtEl.value) === 0)) amtEl.value = String(m.price || 0)
                  }catch{}
                }}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Qty</label>
                  <input name="qty" type="number" defaultValue={editCharge.qty} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Rate</label>
                  <input name="unitPrice" type="number" defaultValue={editCharge.unitPrice} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={()=>setEditCharge(null)} className="btn-outline-navy">Cancel</button>
              <button type="submit" className="btn">Save</button>
            </div>
          </form>
        </div>
      )}

      {confirmDel?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Confirm</div>
            <div className="px-5 py-4 text-sm text-slate-700">Delete this service charge?</div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={()=>setConfirmDel(null)} className="btn-outline-navy">Cancel</button>
              <button
                type="button"
                onClick={async()=>{
                  const id = confirmDel.chargeId
                  setConfirmDel(null)
                  try{
                    await hospitalApi.deleteErCharge(id)
                    await reloadCharges()
                    await reloadBillingSummary()
                    setToast({ type: 'success', message: 'Deleted' })
                  }catch(e:any){
                    setToast({ type: 'error', message: e?.message || 'Failed to delete' })
                  }
                }}
                className="btn"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {openCharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            data-er-charge-form="true"
            onSubmit={async (e)=>{
              e.preventDefault()
              if (!encounterId) return
              const fd = new FormData(e.currentTarget)
              const description = String(fd.get('description') || '').trim()
              const qty = Number(fd.get('qty') || 1)
              const unitPrice = Number(fd.get('unitPrice') || 0)
              if (!description){ setToast({ type: 'error', message: 'Service is required' }); return }
              try{
                await hospitalApi.createErCharge(encounterId, { description, qty, unitPrice, billedBy: 'hospital' })
                setOpenCharge(false)
                await reloadCharges()
                await reloadBillingSummary()
                setToast({ type: 'success', message: 'Service added' })
              }catch(e: any){
                setToast({ type: 'error', message: e?.message || 'Failed to add service' })
              }
            }}
            className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
          >
            <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Service</div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Service</label>
                <ServiceSelect
                  svcCatalog={svcCatalog}
                  onSelect={(svc) => {
                    const form = document.querySelector('form[data-er-charge-form="true"]')
                    if (!form) return
                    const rateEl = form.querySelector<HTMLInputElement>('input[name="unitPrice"]')
                    if (rateEl) rateEl.value = String(svc.price || 0)
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Qty</label>
                  <input name="qty" type="number" defaultValue={1} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Rate</label>
                  <input name="unitPrice" type="number" defaultValue={0} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={()=>setOpenCharge(false)} className="btn-outline-navy">Cancel</button>
              <button type="submit" className="btn">Add</button>
            </div>
          </form>
        </div>
      )}

      {showReferralDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div className="font-semibold text-slate-800">Refer to IPD</div>
              <button
                type="button"
                onClick={() => setShowReferralDialog(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              <Doctor_IpdReferralForm
                mrn={mrn || ''}
                onSaved={() => {
                  setShowReferralDialog(false)
                  setToast({ type: 'success', message: 'IPD referral created successfully' })
                }}
              />
            </div>
          </div>
        </div>
      )}

      {openAdvance && (
        <AdvanceDialog open={openAdvance} onClose={()=>setOpenAdvance(false)} onSave={saveAdvance} />
      )}

      {toast && (
        <div className="fixed right-4 top-16 z-[60] max-w-sm">
          <div className={toast.type==='success' ? 'rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow' : toast.type==='error' ? 'rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow' : 'rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow'}>
            <div className="flex items-start justify-between gap-3">
              <div>{toast.message}</div>
              <button type="button" className="text-slate-500 hover:text-slate-700" onClick={()=>setToast(null)}>×</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AdvanceDialog({ open, onClose, onSave }: { open: boolean; onClose: ()=>void; onSave: (d: { amount: number; method: string; refNo?: string; notes?: string })=>void }){
  if(!open) return null
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSave({
      amount: parseFloat(String(fd.get('amount')||'0')) || 0,
      method: String(fd.get('method')||'Cash'),
      refNo: String(fd.get('refNo')||''),
      notes: String(fd.get('notes')||''),
    })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Advance</div>
        <div className="space-y-3 px-5 py-4 text-sm">
          <label htmlFor="adv-amount" className="block text-xs font-medium text-slate-600">Amount</label>
          <input id="adv-amount" name="amount" type="number" step="0.01" placeholder="e.g. 5000" className="w-full rounded-md border border-slate-300 px-3 py-2" />

          <label htmlFor="adv-method" className="block text-xs font-medium text-slate-600">Payment Mode</label>
          <select id="adv-method" name="method" className="w-full rounded-md border border-slate-300 px-3 py-2">
            {['Cash','Card','Bank','Online'].map(m => (<option key={m} value={m}>{m}</option>))}
          </select>

          <label htmlFor="adv-ref" className="block text-xs font-medium text-slate-600">Ref No</label>
          <input id="adv-ref" name="refNo" placeholder="optional" className="w-full rounded-md border border-slate-300 px-3 py-2" />

          <label htmlFor="adv-notes" className="block text-xs font-medium text-slate-600">Notes</label>
          <input id="adv-notes" name="notes" placeholder="optional" className="w-full rounded-md border border-slate-300 px-3 py-2" />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn">Save</button>
        </div>
      </form>
    </div>
  )
}
