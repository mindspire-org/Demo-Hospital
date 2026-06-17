import React, { useEffect, useMemo, useRef, useState } from 'react'
import { hospitalApi, labApi } from '../../utils/api'
import { printLabReport } from '../../utils/printLabReport'
import Toast, { type ToastState } from '../ui/Toast'
import ConfirmDialog from '../ui/ConfirmDialog'
import SuggestField from '../SuggestField'

export default function LabTests({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; test: string; date: string; orderId?: string; referredBy?: string; doctorId?: string }>>([])
  const [open, setOpen] = useState(false)
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([])
  const [encDoctorId, setEncDoctorId] = useState<string>('')
  const [testsMap, setTestsMap] = useState<Record<string,string>>({})
  const [testOptions, setTestOptions] = useState<string[]>([])
  const [ordersMap, setOrdersMap] = useState<Record<string, any>>({})
  const [resultByOrder, setResultByOrder] = useState<Record<string, any>>({})
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
      const items: Array<{ id: string; test: string; date: string; orderId?: string; referredBy?: string; doctorId?: string }> = (res.links || []).map((l: any)=>({ id: String(l._id), test: (l.testIds?.[0] || 'Lab Order'), date: String(l.createdAt || ''), orderId: l.externalLabOrderId ? String(l.externalLabOrderId) : undefined, referredBy: l.referredBy, doctorId: l.doctorId }))
      setRows(items)
      const orderIds = items.map(i => i.orderId).filter(Boolean) as string[]
      // Fetch results for each orderId
      const resPairs = await Promise.all(orderIds.map(async oid => {
        try { const r = await labApi.listResults({ orderId: oid, limit: 1 }) as any; const rec = Array.isArray(r.items) && r.items.length ? r.items[0] : null; return [oid, rec] as const } catch { return [oid, null] as const }
      }))
      const rMap: Record<string, any> = {}
      for (const [oid, rec] of resPairs){
        if (rec) { rMap[oid] = rec }
      }
      setResultByOrder(rMap)
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
      const doctorName = doctors.find(doc => doc._id === d.doctorId)?.name
      try {
        const lr = await hospitalApi.listIpdLabLinks(encounterId, { limit: 200 }) as any
        const links = (lr?.links || []) as any[]
        const nameLc = String(d.test||'').trim().toLowerCase()
        const exists = links.find(l => !l.externalLabOrderId && Array.isArray(l.testIds) && l.testIds.some((x:any)=> String(x||'').trim().toLowerCase() === nameLc))
        if (!exists){
          await hospitalApi.createIpdLabLink(encounterId, { testIds: d.test ? [d.test] : undefined, status: 'referred', doctorId: d.doctorId, referredBy: doctorName ? `Dr. ${doctorName}` : undefined })
        }
      } catch {
        await hospitalApi.createIpdLabLink(encounterId, { testIds: d.test ? [d.test] : undefined, status: 'referred', doctorId: d.doctorId, referredBy: doctorName ? `Dr. ${doctorName}` : undefined })
      }
      setOpen(false); await reload()
      setToast({ type: 'success', message: 'Referred to Lab' })
    }catch(e: any){ setToast({ type: 'error', message: e?.message || 'Failed to refer to lab' }) }
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
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Lab Tests</div>
        <button onClick={()=>setOpen(true)} className="btn">Refer to Lab</button>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No lab tests ordered.</div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Test</th>
                <th className="px-3 py-2 text-left">Ref (Doctor)</th>
                <th className="px-3 py-2 text-left">Date / Time</th>
                <th className="px-3 py-2 text-left">Result</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const byTest: Record<string, { id: string; test: string; date: string; orderId?: string; referredBy?: string; doctorId?: string }> = {}
                for (const r of rows){
                  const key = String((testsMap[r.test] || r.test || '').trim().toLowerCase())
                  const ex = byTest[key]
                  if (!ex) { byTest[key] = r; continue }
                  // Prefer the one linked to an order; if both (or neither), prefer the latest by date
                  const exHas = !!ex.orderId
                  const rHas = !!r.orderId
                  if (rHas && !exHas) { byTest[key] = r; continue }
                  if (rHas === exHas){
                    const tEx = new Date(ex.date||0).getTime()
                    const tR = new Date(r.date||0).getTime()
                    if (tR >= tEx) byTest[key] = r
                  }
                }
                const deduped = Object.values(byTest)
                return deduped.map(o => {
                  const tname = testsMap[o.test] || o.test
                  const ord = o.orderId ? ordersMap[o.orderId] : null
                  const linkDoc = (o as any).referredBy
                  const encDocName = doctors.find(d=>d._id===encDoctorId)?.name
                  const doc = linkDoc || ord?.referringConsultant || (encDocName ? `Dr. ${encDocName}` : '-')
                  const when = ord?.createdAt || o.date
                  const rec = o.orderId ? resultByOrder[o.orderId] : null
                  const status = rec ? (String(rec.status||'draft') === 'final' ? 'Final' : 'Draft') : (o.orderId ? 'Pending' : 'Referred')
                  return (
                    <tr key={o.id} className="border-b border-slate-100">
                      <td className="px-3 py-2">{tname}</td>
                      <td className="px-3 py-2">{doc}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{new Date(when).toLocaleString()}</td>
                      <td className="px-3 py-2">{status}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {rec && o.orderId ? (
                            <button onClick={()=>onPreview(o.orderId!)} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Preview</button>
                          ) : (
                            <button disabled className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-400">Preview</button>
                          )}
                          <button onClick={()=>removeLink(o.id)} className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100">Delete</button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              })()}
            </tbody>
          </table>
        </div>
      )}
      <OrderDialog open={open} onClose={()=>setOpen(false)} onSave={save} doctors={doctors} defaultDoctorId={encDoctorId} testOptions={testOptions} />
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
  if(!open) return null
  const [testName, setTestName] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>(testOptions || [])
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState<{ _id: string; name: string } | null>(null)
  const searchTimer = useRef<any>(null)

  useEffect(() => {
    if (open) {
      setTestName('')
      setSuggestions(testOptions || [])
      const now = new Date()
      setDate(now.toISOString().split('T')[0])
      setTime(now.toTimeString().slice(0, 5))
      const defaultDoc = doctors.find(d => d._id === defaultDoctorId)
      setSelectedDoctor(defaultDoc || null)
    }
  }, [open, testOptions, doctors, defaultDoctorId])

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

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const dateTime = date && time ? `${date}T${time}` : date
    onSave({ doctorId: String(selectedDoctor?._id||''), test: String(fd.get('test')||''), date: dateTime })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Refer to Lab</div>
        <div className="space-y-3 px-5 py-4 text-sm">
          <label htmlFor="order-doctor" className="block text-xs font-medium text-slate-600">Doctor</label>
          <SuggestField
            as="input"
            value={selectedDoctor?.name || ''}
            onChange={(v) => {
              const found = doctors.find(d => d.name.toLowerCase() === v.toLowerCase())
              setSelectedDoctor(found || null)
            }}
            suggestions={doctors.map(d => d.name)}
            placeholder="Select doctor"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
          <input type="hidden" name="doctorId" value={selectedDoctor?._id || ''} />
          <label htmlFor="order-test" className="block text-xs font-medium text-slate-600">Test name</label>
          <SuggestField
            as="input"
            value={testName}
            onChange={onTestChange}
            suggestions={mergedSuggestions}
            placeholder="e.g. CBC"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
          <input type="hidden" name="test" value={testName} />
          <label htmlFor="order-date" className="block text-xs font-medium text-slate-600">Date</label>
          <input id="order-date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          <label htmlFor="order-time" className="block text-xs font-medium text-slate-600">Time</label>
          <input id="order-time" name="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn">Save</button>
        </div>
      </form>
    </div>
  )
}
