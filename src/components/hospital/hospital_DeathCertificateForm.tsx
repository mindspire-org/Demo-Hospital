import { useEffect, useState, useMemo } from 'react'
import { hospitalApi } from '../../utils/api'
import Toast, { type ToastState } from '../ui/Toast'
import SuggestField from '../SuggestField'

export type DeathCertificateFormProps = {
  encounterId?: string
  patient?: any
}

type DeathForm = {
  dcNo?: string
  mrNumber?: string
  relative?: string
  guardian?: string
  guardianName?: string
  ageSex?: string
  address?: string
  dateOfDeath?: string
  timeOfDeath?: string
  presentingComplaints?: string
  diagnosis?: string
  primaryCause?: string
  secondaryCause?: string
  receiverName?: string
  receiverRelation?: string
  receiverIdCard?: string
  receiverDate?: string
  receiverTime?: string
  staffName?: string
  staffSignDate?: string
  staffSignTime?: string
  doctorName?: string
  doctorSignDate?: string
  doctorSignTime?: string
  notes?: string
}

export default function Hospital_DeathCertificateForm({ encounterId, patient }: DeathCertificateFormProps){
  const [form, setForm] = useState<DeathForm>(() => ({
    dateOfDeath: new Date().toISOString().slice(0, 10),
    timeOfDeath: new Date().toTimeString().slice(0, 5),
    receiverDate: new Date().toISOString().slice(0, 10),
    receiverTime: new Date().toTimeString().slice(0, 5),
    staffSignDate: new Date().toISOString().slice(0, 10),
    staffSignTime: new Date().toTimeString().slice(0, 5),
    doctorSignDate: new Date().toISOString().slice(0, 10),
    doctorSignTime: new Date().toTimeString().slice(0, 5),
  }))
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [doctors, setDoctors] = useState<Array<{ _id: string; fullName?: string; name?: string }>>([])

  // Prefill derived fields from patient context once
  useEffect(()=>{
    setForm(f=>({
      ...f,
      mrNumber: f.mrNumber ?? (patient?.mrn || ''),
      relative: f.relative ?? (patient?.fatherName || ''),
      guardian: f.guardian ?? (patient?.guardian || ''),
      guardianName: f.guardianName ?? (patient?.guardianName || patient?.fatherName || ''),
      ageSex: f.ageSex ?? deriveAgeSex(patient?.age, patient?.gender),
      address: f.address ?? (patient?.address || ''),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.mrn, patient?.age, patient?.gender, patient?.address, patient?.fatherName, patient?.guardian, patient?.guardianName])

  // Load doctors list
  useEffect(()=>{ (async()=>{
    try { const res: any = await hospitalApi.listDoctors(); const items = (res?.doctors || res || []) as Array<{ _id: string; fullName?: string; name?: string }>; setDoctors(items) } catch { setDoctors([]) }
  })() }, [])

  // Doctor names for searchable dropdown
  const doctorNames = useMemo(() => doctors.map(d => d.fullName || d.name || '').filter(Boolean), [doctors])

  useEffect(()=>{ (async()=>{
    if (!encounterId) return
    try {
      setLoading(true)
      const res: any = await hospitalApi.getIpdDeathCertificate(encounterId)
      const c = res?.certificate
      if (c) {
        setForm(f=>({
          ...f,
          dcNo: c.dcNo || f.dcNo,
          mrNumber: c.mrNumber || f.mrNumber,
          relative: c.relative || '',
          guardian: c.guardian || '',
          guardianName: c.guardianName || '',
          ageSex: c.ageSex || f.ageSex,
          address: c.address || f.address,
          dateOfDeath: c.dateOfDeath ? fmtDateISO(c.dateOfDeath) : '',
          timeOfDeath: c.timeOfDeath || '',
          presentingComplaints: c.presentingComplaints || '',
          diagnosis: c.diagnosis || '',
          primaryCause: c.primaryCause || '',
          secondaryCause: c.secondaryCause || '',
          receiverName: c.receiverName || '',
          receiverRelation: c.receiverRelation || '',
          receiverIdCard: c.receiverIdCard || '',
          receiverDate: c.receiverDate ? fmtDateISO(c.receiverDate) : '',
          receiverTime: c.receiverTime || '',
          staffName: c.staffName || '',
          staffSignDate: c.staffSignDate ? fmtDateISO(c.staffSignDate) : '',
          staffSignTime: c.staffSignTime || '',
          doctorName: c.doctorName || '',
          doctorSignDate: c.doctorSignDate ? fmtDateISO(c.doctorSignDate) : '',
          doctorSignTime: c.doctorSignTime || '',
          notes: c.notes || '',
        }))
      } else {
        // New certificate - fetch next DC number
        try {
          const dcRes: any = await hospitalApi.getNextDcNo()
          if (dcRes?.dcNo) {
            setForm(f => ({ ...f, dcNo: dcRes.dcNo }))
          }
        } catch {}
      }
    } finally { setLoading(false) }
  })() }, [encounterId])

  async function previewHtml(url: string){
    const api: any = (window as any).electronAPI
    try {
      if (api && typeof api.printPreviewHtml === 'function'){
        const token = ((): string => { try { return localStorage.getItem('hospital.token') || localStorage.getItem('token') || '' } catch { return '' } })()
        const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } as any : undefined })
        const html = await res.text()
        await api.printPreviewHtml(html, {})
        return
      }
    } catch {}
    try { window.open(url, '_blank') } catch {}
  }

  const save = async () => {
    if (!encounterId) return
    const payload: any = {
      ...form,
      // Convert dates to ISO
      dateOfDeath: form.dateOfDeath ? new Date(form.dateOfDeath).toISOString() : undefined,
      receiverDate: form.receiverDate ? new Date(form.receiverDate).toISOString() : undefined,
      staffSignDate: form.staffSignDate ? new Date(form.staffSignDate).toISOString() : undefined,
      doctorSignDate: form.doctorSignDate ? new Date(form.doctorSignDate).toISOString() : undefined,
    }
    try {
      const res: any = await hospitalApi.upsertIpdDeathCertificate(encounterId, payload)
      // Update form with auto-generated dcNo from backend
      if (res?.certificate?.dcNo) {
        setForm(f => ({ ...f, dcNo: res.certificate.dcNo }))
      }
      setToast({ type: 'success', message: 'Saved' })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Save failed' })
      throw e
    }
  }

  const printOnly = async () => {
    if (!encounterId) return
    const url = `/api/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/death-certificate/print`
    await previewHtml(url)
  }

  return (
    <div className="space-y-3">
      <Toast toast={toast} onClose={()=>setToast(null)} />
      <div className="text-xl font-bold text-slate-800">Death Certificate</div>
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="text-sm font-semibold text-slate-700 mb-2">Patient Information</div>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Patient Name</label>
            <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={patient?.name||''} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">MR Number</label>
            <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={patient?.mrn||''} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Age / Sex</label>
            <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={deriveAgeSex(patient?.age, patient?.gender)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Phone</label>
            <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={patient?.phone||''} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Guardian Name</label>
            <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={patient?.guardianName||patient?.fatherName||''} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Address</label>
            <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={patient?.address||''} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Admission No</label>
            <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={patient?.admissionNo||''} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Doctor</label>
            <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={patient?.doctor||''} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Bed</label>
            <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={patient?.bed||''} />
          </div>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-3">
        <div className="text-sm font-semibold text-slate-700 mb-2">Death Details</div>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">DC No</label>
            <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={form.dcNo||''} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Date of Death</label>
            <input type="date" className="w-full border rounded-md px-2 py-1 text-sm" value={form.dateOfDeath||''} onChange={e=>setForm(v=>({ ...v, dateOfDeath: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Time of Death</label>
            <input type="time" className="w-full border rounded-md px-2 py-1 text-sm" value={form.timeOfDeath||''} onChange={e=>setForm(v=>({ ...v, timeOfDeath: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-3">
        <div className="text-sm font-semibold text-slate-700 mb-2">Medical Information</div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Presenting Complaints</label>
            <textarea className="w-full border rounded-md px-2 py-1 text-sm h-20" value={form.presentingComplaints||''} onChange={e=>setForm(v=>({ ...v, presentingComplaints: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Diagnosis</label>
            <textarea className="w-full border rounded-md px-2 py-1 text-sm h-20" value={form.diagnosis||''} onChange={e=>setForm(v=>({ ...v, diagnosis: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Primary Cause of Death</label>
            <textarea className="w-full border rounded-md px-2 py-1 text-sm h-20" value={form.primaryCause||''} onChange={e=>setForm(v=>({ ...v, primaryCause: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Secondary Cause of Death</label>
            <textarea className="w-full border rounded-md px-2 py-1 text-sm h-20" value={form.secondaryCause||''} onChange={e=>setForm(v=>({ ...v, secondaryCause: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-3">
        <div className="text-sm font-semibold text-slate-700 mb-2">Body Handover Details</div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Dead Body Received By Name</label>
            <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.receiverName||''} onChange={e=>setForm(v=>({ ...v, receiverName: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Relation</label>
            <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.receiverRelation||''} onChange={e=>setForm(v=>({ ...v, receiverRelation: e.target.value }))} />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-3 mt-3">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">ID Card No</label>
            <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.receiverIdCard||''} onChange={e=>setForm(v=>({ ...v, receiverIdCard: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Date</label>
            <input type="date" className="w-full border rounded-md px-2 py-1 text-sm" value={form.receiverDate||''} onChange={e=>setForm(v=>({ ...v, receiverDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Time</label>
            <input type="time" className="w-full border rounded-md px-2 py-1 text-sm" value={form.receiverTime||''} onChange={e=>setForm(v=>({ ...v, receiverTime: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-3">
        <div className="text-sm font-semibold text-slate-700 mb-2">Signatures</div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Staff Name</label>
            <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.staffName||''} onChange={e=>setForm(v=>({ ...v, staffName: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Sign Date</label>
              <input type="date" className="w-full border rounded-md px-2 py-1 text-sm" value={form.staffSignDate||''} onChange={e=>setForm(v=>({ ...v, staffSignDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Sign Time</label>
              <input type="time" className="w-full border rounded-md px-2 py-1 text-sm" value={form.staffSignTime||''} onChange={e=>setForm(v=>({ ...v, staffSignTime: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Doctor Name</label>
            <SuggestField
              value={form.doctorName||''}
              onChange={v=>setForm(x=>({ ...x, doctorName: v }))}
              suggestions={doctorNames}
              className="w-full border rounded-md px-2 py-1 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Sign Date</label>
              <input type="date" className="w-full border rounded-md px-2 py-1 text-sm" value={form.doctorSignDate||''} onChange={e=>setForm(v=>({ ...v, doctorSignDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Sign Time</label>
              <input type="time" className="w-full border rounded-md px-2 py-1 text-sm" value={form.doctorSignTime||''} onChange={e=>setForm(v=>({ ...v, doctorSignTime: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-3">
        <div className="text-sm font-semibold text-slate-700 mb-2">Additional Notes</div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Notes</label>
          <textarea className="w-full border rounded-md px-2 py-1 text-sm h-20" value={form.notes||''} onChange={e=>setForm(v=>({ ...v, notes: e.target.value }))} />
        </div>
      </div>

      <div className="pt-1 flex flex-wrap gap-2">
        <button disabled={loading || !encounterId} onClick={save} className="btn-outline-navy disabled:opacity-50">Save</button>
        <button disabled={loading || !encounterId} onClick={printOnly} className="btn disabled:opacity-50">Print</button>
      </div>
    </div>
  )
}

function deriveAgeSex(age?: any, gender?: any){
  const a = (age==null || age==='') ? '' : String(age)
  const g = String(gender||'').trim().toUpperCase()
  const sx = g ? g[0] : ''
  if (!a && !sx) return ''
  if (a && sx) return `${a}/${sx}`
  return a || sx
}

function fmtDateISO(d:any){ try { const x = new Date(d); if (!x || isNaN(x.getTime())) return ''; return x.toISOString().slice(0,10) } catch { return '' } }
