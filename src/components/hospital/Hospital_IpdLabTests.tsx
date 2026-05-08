import React, { useEffect, useMemo, useRef, useState } from 'react'
import { hospitalApi, labApi } from '../../utils/api'
import { printLabReport } from '../../utils/printLabReport'
import { FlaskConical, Plus, Printer, Pencil, Trash2 } from 'lucide-react'
import Toast, { type ToastState } from '../ui/Toast'
import ConfirmDialog from '../ui/ConfirmDialog'
import SuggestField from '../SuggestField'
import { ClinicalDialogShell, clinicalInp, clinicalLbl } from '../ui/ClinicalDialog'

export default function LabTests({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; test: string; date: string; orderId?: string }>>([])
  const [open, setOpen] = useState(false)
  const [editRow, setEditRow] = useState<{ id: string; test: string; date: string; orderId?: string } | null>(null)
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([])
  const [encDoctorId, setEncDoctorId] = useState<string>('')
  const [testsMap, setTestsMap] = useState<Record<string,string>>({})
  const [testOptions, setTestOptions] = useState<string[]>([])
  const [ordersMap, setOrdersMap] = useState<Record<string, any>>({})
  const [toast, setToast] = useState<ToastState>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string>('')

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])
  useEffect(()=>{ (async()=>{ try { const res = await hospitalApi.getIPDAdmissionById(encounterId) as any; const enc = res?.encounter; setEncDoctorId(String(enc?.doctorId?._id || enc?.doctorId || '')) } catch {} })() }, [encounterId])
  useEffect(()=>{ (async()=>{ try { const res = await hospitalApi.listDoctors() as any; const items = (res?.doctors || res || []) as Array<{ _id: string; name: string }>; setDoctors(items) } catch { setDoctors([]) } })() }, [])
  useEffect(()=>{ (async()=>{ 
    try { 
      const t = await labApi.listTests({ limit: 1000 }) as any
      const m: Record<string,string> = {}
      const names: string[] = []
      for(const it of (t.items||[])){
        const id = String(it._id)
        const name = String(it.name||'-')
        m[id] = name
        if (name && name !== '-') names.push(name)
      }
      setTestsMap(m)
      setTestOptions(Array.from(new Set(names)).sort())
    } catch { 
      setTestsMap({})
      setTestOptions([])
    } 
  })() }, [])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdLabLinks(encounterId, { limit: 200 }) as any
      const items: Array<{ id: string; test: string; date: string; orderId?: string }> = (res.links || []).map((l: any)=>({ id: String(l._id), test: (l.testIds?.[0] || 'Lab Order'), date: String(l.createdAt || ''), orderId: l.externalLabOrderId ? String(l.externalLabOrderId) : undefined }))
      setRows(items)
      const orderIds = items.map(i => i.orderId).filter(Boolean) as string[]
      // Fetch order header to get referring consultant and times
      const ordPairs = await Promise.all(orderIds.map(async oid => {
        try { const o = await labApi.listOrders({ q: oid, limit: 1 }) as any; const rec = Array.isArray(o.items) && o.items.length ? o.items[0] : null; return [oid, rec] as const } catch { return [oid, null] as const }
      }))
      const oMap: Record<string, any> = {}
      const missing: string[] = []
      for (const [oid, ord] of ordPairs){ if (ord) oMap[oid] = ord; else missing.push(oid) }
      if (missing.length){
        try {
          const bulk = await labApi.listOrders({ limit: 500 }) as any
          const arr = Array.isArray(bulk.items) ? bulk.items : []
          for (const oid of missing){
            const found = arr.find((x:any)=> String(x._id) === String(oid))
            if (found) oMap[oid] = found
          }
        } catch {}
      }
      setOrdersMap(oMap)
    }catch{}
  }

  async function save(d: { doctorId: string; test: string; date: string }){
    try{
      // Create a Lab Referral so it shows on Lab > Referrals page
      await hospitalApi.createReferral({ type: 'lab', encounterId, doctorId: d.doctorId, tests: d.test ? [d.test] : undefined })
      // Create an IPD Lab Link (no external order yet) for visibility within IPD profile
      try {
        const lr = await hospitalApi.listIpdLabLinks(encounterId, { limit: 200 }) as any
        const links = (lr?.links || []) as any[]
        const nameLc = String(d.test||'').trim().toLowerCase()
        const exists = links.find(l => !l.externalLabOrderId && Array.isArray(l.testIds) && l.testIds.some((x:any)=> String(x||'').trim().toLowerCase() === nameLc))
        if (!exists){
          await hospitalApi.createIpdLabLink(encounterId, { testIds: d.test ? [d.test] : undefined, status: 'referred' })
        }
      } catch {
        await hospitalApi.createIpdLabLink(encounterId, { testIds: d.test ? [d.test] : undefined, status: 'referred' })
      }
      setOpen(false); await reload()
      setToast({ type: 'success', message: 'Referred to Lab' })
    }catch(e: any){ setToast({ type: 'error', message: e?.message || 'Failed to refer to lab' }) }
  }

  async function updateLink(id: string, d: { test: string; date: string }){
    try{
      await hospitalApi.updateIpdLabLink(String(id), { testIds: d.test ? [d.test] : undefined })
      setEditRow(null)
      await reload()
      setToast({ type: 'success', message: 'Updated' })
    }catch(e: any){ setToast({ type: 'error', message: e?.message || 'Failed to update' }) }
  }

  async function removeLink(id: string){
    setConfirmDeleteId(String(id))
  }

  async function confirmDelete(){
    const id = confirmDeleteId
    setConfirmDeleteId('')
    if (!id) return
    try{
      await hospitalApi.deleteIpdLabLink(String(id))
      await reload()
      setToast({ type: 'success', message: 'Deleted' })
    }catch(e: any){
      setToast({ type: 'error', message: e?.message || 'Failed to delete' })
    }
  }

  async function onPreview(orderId: string){
    try{
      await previewReport(orderId)
    }catch(e: any){
      setToast({ type: 'error', message: e?.message || 'Failed to open report preview.' })
    }
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden relative">
        <div className="absolute right-0 top-0 opacity-[0.03] pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <FlaskConical className="h-48 w-48 text-indigo-600" />
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600">
            <FlaskConical className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">Lab Tests</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Referrals & Reports</p>
          </div>
        </div>
        <button
          onClick={()=>setOpen(true)}
          className="group flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-95 relative z-10"
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
          Refer to Lab
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 p-12 text-center transition-all hover:bg-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
            <FlaskConical className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase">No Lab Referrals</h3>
            <p className="text-sm font-medium text-slate-500">Refer investigations to the lab and print reports when ready.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          {rows.map(o => (
            <div key={o.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/30 transition-all hover:shadow-xl hover:shadow-slate-200/40">
              <div className="bg-slate-900 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <FlaskConical className="h-5 w-5 text-indigo-400" />
                  <span className="text-xs font-black uppercase tracking-widest">{testsMap[o.test] || o.test}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={()=> setEditRow(o)}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={()=>removeLink(o.id)}
                    className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-700 transition hover:bg-rose-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                  {o.orderId && (
                    <button
                      type="button"
                      onClick={()=> onPreview(o.orderId!)}
                      className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-slate-800"
                    >
                      <Printer className="h-3.5 w-3.5" /> Print
                    </button>
                  )}
                </div>
              </div>
              <div className="p-8">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Referring</div>
                    <div className="mt-1 text-sm font-black text-slate-900">{ordersMap[o.orderId!]?.referringConsultant || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date / Time</div>
                    <div className="mt-1 text-sm font-black text-slate-900">{new Date(o.date).toLocaleString()}</div>
                  </div>
                  <div className="flex items-end justify-start md:justify-end">
                    <div className="flex flex-wrap gap-2">
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <OrderDialog open={open} onClose={()=>setOpen(false)} onSave={save} doctors={doctors} defaultDoctorId={encDoctorId} testOptions={testOptions} />
      <EditDialog open={!!editRow} onClose={()=>setEditRow(null)} onSave={(d)=> editRow ? updateLink(editRow.id, d) : undefined} initial={editRow} testOptions={testOptions} />
    </div>
    <ConfirmDialog
      open={!!confirmDeleteId}
      title="Confirm"
      message="Delete this lab entry?"
      confirmText="Delete"
      onCancel={()=>setConfirmDeleteId('')}
      onConfirm={confirmDelete}
    />
    <Toast toast={toast} onClose={()=>setToast(null)} />
    </>
  )
}

async function previewReport(orderId: string){
  try{
    // Fetch result and try to resolve the order
    const resultsRes = await labApi.listResults({ orderId, limit: 1 }) as any
    let ord: any = null
    try {
      const ordersRes = await labApi.listOrders({ q: orderId, limit: 1 }) as any
      ord = Array.isArray(ordersRes?.items) && ordersRes.items.length ? ordersRes.items[0] : null
    } catch {}
    if (!ord){
      try {
        const o2 = await labApi.listOrders({ limit: 500 }) as any
        ord = (o2.items||[]).find((x:any)=> String(x._id) === String(orderId)) || null
      } catch {}
    }
    const res = Array.isArray(resultsRes?.items) && resultsRes.items.length ? resultsRes.items[0] : null
    if (!res) { throw new Error('No report found for this order yet.') }
    const tokenNo = String(ord?.tokenNo || '-')
    const createdAt = String(ord?.createdAt || res.createdAt || new Date().toISOString())
    const sampleTime = String(ord?.sampleTime || '')
    const reportingTime = String(ord?.reportingTime || '')
    const patient = ord?.patient || { fullName: '-', phone: '', mrn: '' }
    const rows = (res.rows || [])
    const interpretation = String(res.interpretation || '')
    const referringConsultant = String(ord?.referringConsultant || '')
    await printLabReport({ tokenNo, createdAt, sampleTime, reportingTime, patient, rows, interpretation, referringConsultant })
  }catch(e){
    try { console.error('Preview failed', e) } catch {}
    throw new Error('Failed to open report preview.')
  }
}

function OrderDialog({ open, onClose, onSave, doctors, defaultDoctorId, testOptions }: { open: boolean; onClose: ()=>void; onSave: (d: { doctorId: string; test: string; date: string })=>void; doctors: Array<{ _id: string; name: string }>; defaultDoctorId?: string; testOptions: string[] }){
  const [testName, setTestName] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>(testOptions || [])
  const searchTimer = useRef<any>(null)

  useEffect(() => {
    if (open) {
      setTestName('')
      setSuggestions(testOptions || [])
    }
  }, [open, testOptions])

  if(!open) return null

  const mergedSuggestions = useMemo(() => suggestions, [suggestions])

  const onTestChange = (v: string) => {
    setTestName(v)
    const q = String(v || '').trim()
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (q.length < 2) return
    searchTimer.current = setTimeout(async () => {
      try {
        const res: any = await labApi.listTests({ q, limit: 30 })
        const names: string[] = (res?.items || []).map((it: any) => String(it?.name || '')).filter(Boolean)
        if (names.length) setSuggestions(prev => Array.from(new Set([...(prev || []), ...names])).sort())
      } catch {}
    }, 250)
  }

  const submit = (e: React.FormEvent<Element>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget as HTMLFormElement)
    onSave({ doctorId: String(fd.get('doctorId')||''), test: String(fd.get('test')||''), date: String(fd.get('date')||'') })
  }
  return (
    <ClinicalDialogShell
      open={open}
      title="Refer to Lab"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="order-doctor" className={clinicalLbl}>Doctor</label>
          <select id="order-doctor" name="doctorId" defaultValue={defaultDoctorId||''} required className={clinicalInp}>
            <option value="">Select doctor</option>
            {doctors.map(d => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="order-test" className={clinicalLbl}>Test name</label>
          <SuggestField
            as="input"
            value={testName}
            onChange={onTestChange}
            suggestions={mergedSuggestions}
            placeholder="e.g. CBC"
            className={clinicalInp}
          />
          <input type="hidden" name="test" value={testName} />
        </div>
        <div>
          <label htmlFor="order-date" className={clinicalLbl}>Date</label>
          <input id="order-date" name="date" type="date" className={clinicalInp} />
        </div>
      </div>
    </ClinicalDialogShell>
  )
}

function EditDialog({ open, onClose, onSave, initial, testOptions }: { open: boolean; onClose: ()=>void; onSave: (d: { test: string; date: string })=>void; initial: { id: string; test: string; date: string; orderId?: string } | null; testOptions: string[] }){
  const [testName, setTestName] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>(testOptions || [])
  const searchTimer = useRef<any>(null)

  useEffect(() => {
    if (open) {
      setTestName(String(initial?.test || ''))
      setSuggestions(testOptions || [])
    }
  }, [open, initial, testOptions])

  const mergedSuggestions = useMemo(() => suggestions, [suggestions])

  const onTestChange = (v: string) => {
    setTestName(v)
    const q = String(v || '').trim()
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (q.length < 2) return
    searchTimer.current = setTimeout(async () => {
      try {
        const res: any = await labApi.listTests({ q, limit: 30 })
        const names: string[] = (res?.items || []).map((it: any) => String(it?.name || '')).filter(Boolean)
        if (names.length) setSuggestions(prev => Array.from(new Set([...(prev || []), ...names])).sort())
      } catch {}
    }, 250)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ test: testName, date: String(initial?.date || '') })
  }

  return (
    <ClinicalDialogShell open={open} title="Edit Lab Referral" onClose={onClose} onSubmit={submit}>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className={clinicalLbl}>Test name</label>
          <SuggestField
            as="input"
            value={testName}
            onChange={onTestChange}
            suggestions={mergedSuggestions}
            placeholder="e.g. CBC"
            className={clinicalInp}
          />
        </div>
      </div>
    </ClinicalDialogShell>
  )
}
