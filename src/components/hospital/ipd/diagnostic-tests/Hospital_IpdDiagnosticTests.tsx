import React, { useEffect, useMemo, useRef, useState } from 'react'
import { hospitalApi, diagnosticApi } from '../../../../utils/api'
import { printEchocardiographyReport } from '../../../diagnostic/diagnostic_Echocardiography'
import { printUltrasoundReport } from '../../../diagnostic/diagnostic_UltrasoundGeneric'
import { printCTScanReport } from '../../../diagnostic/diagnostic_CTScan'
import { printColonoscopyReport } from '../../../diagnostic/diagnostic_Colonoscopy'
import { printUpperGIEndoscopyReport } from '../../../diagnostic/diagnostic_UpperGIEndoscopy'
import Toast, { type ToastState } from '../../../ui/Toast'
import ConfirmDialog from '../../../common/ConfirmDialog'
import SuggestField from '../../../SuggestField'

function resolveKey(name: string){
  const n = (name||'').toLowerCase()
  if (n.includes('ultrasound')) return 'Ultrasound'
  if (n.replace(/\s+/g,'') === 'ctscan') return 'CTScan'
  if (n.includes('echocardio')) return 'Echocardiography'
  if (n.includes('colonoscopy')) return 'Colonoscopy'
  if (n.includes('uppergi')) return 'UpperGiEndoscopy'
  return name
}

export default function DiagnosticTests({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; test: string; date: string; status?: string; doctor?: string; encounterId?: string }>>([])
  const [open, setOpen] = useState(false)
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([])
  const [encDoctorId, setEncDoctorId] = useState<string>('')
  const [encPatient, setEncPatient] = useState<any | null>(null)
  const [testsList, setTestsList] = useState<string[]>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<any>(null)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])
  useEffect(()=>{ (async()=>{ try { const res = await hospitalApi.getIPDAdmissionById(encounterId) as any; const enc = res?.encounter; setEncDoctorId(String(enc?.doctorId?._id || enc?.doctorId || '')); setEncPatient(enc?.patientId || null) } catch {} })() }, [encounterId])
  useEffect(()=>{ (async()=>{ try { const res = await hospitalApi.listDoctors() as any; const items = (res?.doctors || res || []) as Array<{ _id: string; name: string }>; setDoctors(items) } catch { setDoctors([]) } })() }, [])
  useEffect(()=>{ (async()=>{ try { const t = await diagnosticApi.listTests({ limit: 1000 }) as any; const names: string[] = (t.items||[]).map((it:any)=> String(it.name||'-')) ; setTestsList(names) } catch { setTestsList([]) } })() }, [])

  async function reload(){
    try{
      const res: any = await hospitalApi.listReferrals({ type: 'diagnostic', limit: 500 })
      const list = Array.isArray(res?.referrals) ? res.referrals : []
      const eid = String(encounterId)
      const items = list
        .filter((r:any)=>{
          const rid = r?.encounterId?._id || r?.encounterId
          return String(rid||'') === eid
        })
        .map((r:any)=>({
          id: String(r._id),
          test: Array.isArray(r.tests) && r.tests.length ? String(r.tests[0]) : '-',
          date: String(r.createdAt || ''),
          status: String(r.status || 'pending'),
          doctor: r?.encounterId?.doctorId?.name || r?.doctorId?.name || '',
          encounterId: String(r?.encounterId?._id || r?.encounterId || ''),
        }))
      setRows(items)
    }catch{ setRows([]) }
  }

  async function save(d: { doctorId: string; test: string; date: string }){
    try{
      await hospitalApi.createReferral({ type: 'diagnostic', encounterId, doctorId: d.doctorId, tests: d.test ? [d.test] : undefined })
      setOpen(false)
      await reload()
      setToast({ type: 'success', message: 'Referred to Diagnostic' })
    }catch(e: any){ setToast({ type: 'error', message: e?.message || 'Failed to refer to Diagnostic' }) }
  }

  async function updateRef(d: { doctorId: string; test: string; date: string }){
    if (!editingId) return
    try{
      // Referrals don't have a general update API, so delete + recreate
      await hospitalApi.deleteReferral(editingId)
      await hospitalApi.createReferral({ type: 'diagnostic', encounterId, doctorId: d.doctorId, tests: d.test ? [d.test] : undefined })
      setEditingId(null); setEditingData(null); setOpen(false); await reload()
      setToast({ type: 'success', message: 'Diagnostic referral updated' })
    }catch(e: any){ setToast({ type: 'error', message: e?.message || 'Failed to update referral' }) }
  }

  const startEdit = (r: any) => { setEditingId(r.id); setEditingData(r); setOpen(true) }

  async function removeReferral(id: string){
    setConfirmDeleteId(String(id))
  }

  async function confirmDelete(){
    const id = confirmDeleteId
    setConfirmDeleteId('')
    if (!id) return
    try{
      await hospitalApi.deleteReferral(String(id))
      await reload()
      setToast({ type: 'success', message: 'Deleted' })
    }catch(e: any){
      setToast({ type: 'error', message: e?.message || 'Failed to delete' })
    }
  }

  const testOptions = useMemo(()=> Array.from(new Set(testsList)).sort(), [testsList])

  return (
    <>
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between print:hidden">
        <div className="text-lg font-semibold text-slate-900">Diagnostic Tests</div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setOpen(true)} className="btn">Refer to Diagnostic</button>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No diagnostic referrals.</div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Test</th>
                <th className="px-3 py-2 text-left">Ref (Doctor)</th>
                <th className="px-3 py-2 text-left">Date / Time</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{r.test}</td>
                  <td className="px-3 py-2">{r.doctor || '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.date ? new Date(r.date).toLocaleString() : '-'}</td>
                  <td className="px-3 py-2 capitalize">{r.status || '-'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {String(r.status||'').toLowerCase()==='completed' ? (
                        <button
                          onClick={()=>previewReferral(r.test, encPatient)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >Preview</button>
                      ) : (
                        <button disabled className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-400">Preview</button>
                      )}
                      <button onClick={() => startEdit(r)} className="rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                      <button onClick={()=>removeReferral(r.id)} className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <OrderDialog key={editingId || 'add'} open={open} onClose={()=>{ setOpen(false); setEditingId(null); setEditingData(null) }} onSave={editingId ? updateRef : save} doctors={doctors} defaultDoctorId={encDoctorId} testOptions={testOptions} initial={editingData} />
    </div>
    <ConfirmDialog
      open={!!confirmDeleteId}
      title="Confirm"
      message="Delete this diagnostic referral?"
      confirmText="Delete"
      onCancel={()=>setConfirmDeleteId('')}
      onConfirm={confirmDelete}
    />
    <Toast toast={toast} onClose={()=>setToast(null)} />
    </>
  )
}

function OrderDialog({ open, onClose, onSave, doctors, defaultDoctorId, testOptions, initial }: { open: boolean; onClose: ()=>void; onSave: (d: { doctorId: string; test: string; date: string })=>void; doctors: Array<{ _id: string; name: string }>; defaultDoctorId?: string; testOptions: string[]; initial?: any }){
  const [testName, setTestName] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>(testOptions || [])
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState<{ _id: string; name: string } | null>(null)
  const searchTimer = useRef<any>(null)

  useEffect(() => {
    if (open) {
      if (initial) {
        setTestName(initial.test || '')
        const dt = new Date(initial.date || '')
        setDate(initial.date ? dt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
        setTime(initial.date ? dt.toTimeString().slice(0,5) : new Date().toTimeString().slice(0,5))
        const found = doctors.find(d => d.name === initial.doctor)
        setSelectedDoctor(found || (defaultDoctorId ? doctors.find(d => d._id === defaultDoctorId) || null : null))
      } else {
        setTestName('')
        setSuggestions(testOptions || [])
        const now = new Date()
        setDate(now.toISOString().split('T')[0])
        setTime(now.toTimeString().slice(0, 5))
        const defaultDoc = doctors.find(d => d._id === defaultDoctorId)
        setSelectedDoctor(defaultDoc || null)
      }
    }
  }, [open, testOptions, doctors, defaultDoctorId, initial])

  const mergedSuggestions = useMemo(() => suggestions, [suggestions])

  if(!open) return null

  const onTestChange = (v: string) => {
    setTestName(v)
    const q = String(v || '').trim()
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (q.length < 2) return
    searchTimer.current = setTimeout(async () => {
      try{
        const res: any = await diagnosticApi.listTests({ q, limit: 30 })
        const names: string[] = (res?.items || []).map((it: any) => String(it?.name || '')).filter(Boolean)
        if (names.length) setSuggestions(prev => Array.from(new Set([...(prev || []), ...names])).sort())
      }catch{}
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
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">{initial ? 'Edit Diagnostic Referral' : 'Refer to Diagnostic'}</div>
        <div className="space-y-3 px-5 py-4 text-sm">
          <label htmlFor="diag-doctor" className="block text-xs font-medium text-slate-600">Doctor</label>
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
          <label htmlFor="diag-test" className="block text-xs font-medium text-slate-600">Diagnostic Test</label>
          <SuggestField
            as="input"
            value={testName}
            onChange={onTestChange}
            suggestions={mergedSuggestions}
            placeholder="e.g. Ultrasound Abdomen"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
          <input type="hidden" name="test" value={testName} />
          <label htmlFor="diag-date" className="block text-xs font-medium text-slate-600">Date</label>
          <input id="diag-date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          <label htmlFor="diag-time" className="block text-xs font-medium text-slate-600">Time</label>
          <input id="diag-time" name="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn">Save</button>
        </div>
      </form>
    </div>
  )
}

async function previewReferral(testName: string, patient?: any){
  const key = resolveKey(testName)
  try{
    const resA = await diagnosticApi.listResults({ q: testName, limit: 100 }) as any
    let arr: any[] = Array.isArray(resA?.items) ? resA.items : []
    // Narrow by patient if available
    const mrn = String(patient?.mrn || '').trim()
    const pname = String(patient?.fullName || '').trim().toLowerCase()
    if (mrn){ arr = arr.filter(x => String(x?.patient?.mrn||'').trim() === mrn) }
    else if (pname){ arr = arr.filter(x => String(x?.patient?.fullName||'').trim().toLowerCase() === pname) }
    const pick = arr
      .filter((x:any)=> resolveKey(String(x.testName||'')) === key)
      .sort((a:any,b:any)=> new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime())[0] || null
    if (!pick){ throw new Error('No report found for this test yet.') }
    const payload = { tokenNo: pick.tokenNo, createdAt: pick.createdAt, reportedAt: pick.reportedAt || pick.createdAt, patient: pick.patient, value: String(pick.formData||''), referringConsultant: (pick as any)?.patient?.referringConsultant }
    if (key === 'Echocardiography') { await printEchocardiographyReport(payload as any); return }
    if (key === 'Ultrasound') { await printUltrasoundReport(payload as any); return }
    if (key === 'CTScan') { await printCTScanReport(payload as any); return }
    if (key === 'Colonoscopy') { await printColonoscopyReport(payload as any); return }
    if (key === 'UpperGiEndoscopy') { await printUpperGIEndoscopyReport(payload as any); return }
    throw new Error('Preview not available for this test.')
  }catch{
    throw new Error('Failed to open report preview.')
  }
}
