import { useEffect, useMemo, useState, forwardRef, useImperativeHandle } from 'react'
import { hospitalApi, labApi } from '../../utils/api'
import Toast, { type ToastState } from '../ui/Toast'

type PrescriptionSnapshot = {
  primaryComplaint?: string
  primaryComplaintHistory?: string
  familyHistory?: string
  allergyHistory?: string
  treatmentHistory?: string
  history?: string
  examFindings?: string
  diagnosis?: string
  advice?: string
  nextFollowUp?: string
  items?: Array<{ name?: string; dose?: string; frequency?: string; duration?: string; instruction?: string; route?: string; notes?: string }>
  vitals?: { pulse?: number; temperatureC?: number; bloodPressureSys?: number; bloodPressureDia?: number; respiratoryRate?: number; bloodSugar?: number; weightKg?: number; heightCm?: number; spo2?: number }
  labTests?: string[]
  diagnosticTests?: string[]
}

type Props = {
  mrn?: string
  doctor?: { id?: string; name?: string }
  onSaved?: (id?: string) => void
  initialData?: {
    referralDate?: string
    referralTime?: string
    reasonOfReferral?: string
    provisionalDiagnosis?: string
    vitals?: { bp?: string; pulse?: string; temperature?: string; rr?: string }
    referredTo?: { departmentId?: string; doctorId?: string }
    condition?: { stability?: 'Stable'|'Unstable'; consciousness?: 'Conscious'|'Unconscious' }
    remarks?: string
    signStamp?: string
  }
  prescriptionSnapshot?: PrescriptionSnapshot
}

export default forwardRef(function Doctor_IpdReferralForm({ mrn, doctor, onSaved, initialData, prescriptionSnapshot }: Props, ref: any){
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [patient, setPatient] = useState<any | null>(null)
  const [deps, setDeps] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [toast, setToast] = useState<ToastState>(null)

  const [form, setForm] = useState({
    referralDate: new Date().toISOString().slice(0,10),
    referralTime: new Date().toTimeString().slice(0,5),
    reasonOfReferral: '',
    provisionalDiagnosis: '',
    vitals: { bp: '', pulse: '', temperature: '', rr: '' },
    referredTo: { departmentId: '', doctorId: '' },
    stability: 'Stable' as 'Stable'|'Unstable',
    consciousness: 'Conscious' as 'Conscious'|'Unconscious',
    remarks: '',
    signStamp: '',
    priority: 'Regular' as 'Regular'|'Urgent'|'Critical',
  })

  useEffect(()=>{ if (mrn) loadPatient(mrn) }, [mrn])
  useEffect(()=>{ (async()=>{ try{ const [a,b] = await Promise.all([hospitalApi.listDepartments({ limit: 1000 }) as any, hospitalApi.listDoctors() as any]); setDeps((a?.departments||a)||[]); setDocs((b?.doctors||b)||[])}catch{} })() }, [])
  useEffect(()=>{
    if (initialData) {
      setForm(f => ({
        ...f,
        referralDate: initialData.referralDate || f.referralDate,
        referralTime: initialData.referralTime || f.referralTime,
        reasonOfReferral: initialData.reasonOfReferral || '',
        provisionalDiagnosis: initialData.provisionalDiagnosis || '',
        vitals: {
          bp: initialData.vitals?.bp || '',
          pulse: initialData.vitals?.pulse || '',
          temperature: initialData.vitals?.temperature || '',
          rr: initialData.vitals?.rr || '',
        },
        referredTo: {
          departmentId: initialData.referredTo?.departmentId || '',
          doctorId: initialData.referredTo?.doctorId || '',
        },
        stability: initialData.condition?.stability || 'Stable',
        consciousness: initialData.condition?.consciousness || 'Conscious',
        remarks: initialData.remarks || '',
        priority: initialData.condition?.stability === 'Unstable' ? 'Urgent' : 'Regular',
        signStamp: initialData.signStamp || '',
      }))
    }
  }, [initialData])

  async function loadPatient(m: string){
    setLoading(true)
    try{
      const res = await hospitalApi.searchPatients({ mrn: m, limit: 1 }) as any
      let p = (res?.patients || [])[0] || null
      try {
        if (m) {
          const resp: any = await labApi.getPatientByMrn(m)
          const lp = resp?.patient
          if (lp) {
            const merged: any = { ...p }
            if (!merged?.cnic && (lp.cnic || lp.cnicNormalized)) merged.cnic = lp.cnic || lp.cnicNormalized
            if (!merged?.address && lp.address) merged.address = lp.address
            if (!merged?.phone && (lp.phone || lp.phoneNormalized)) merged.phone = lp.phone || lp.phoneNormalized
            if (!merged?.fatherName && lp.fatherName) merged.fatherName = lp.fatherName
            if (!merged?.fullName && lp.fullName) merged.fullName = lp.fullName
            p = merged
          }
        }
      } catch {}
      setPatient(p)
    }catch{ setPatient(null) }
    setLoading(false)
  }

  const isErReferral = useMemo(() => {
    const dep = deps.find(d => String(d._id || d.id) === form.referredTo.departmentId)
    const depName = dep?.name?.toLowerCase() || ''
    return depName.includes('emergency') || depName.includes('er') || depName.includes('casualty')
  }, [deps, form.referredTo.departmentId])

  const formTitle = isErReferral ? 'Refer to Emergency' : 'Refer to IPD'

  const canSave = useMemo(() => !!patient?._id && !!form.reasonOfReferral.trim(), [patient?._id, form.reasonOfReferral])

  const patientAge = useMemo(()=>{
    const p = patient
    if (!p) return ''
    if (p.age) return String(p.age)
    if (p.dob){ try{ const d = new Date(p.dob); if(!isNaN(d as any)){ const y = Math.floor((Date.now()-d.getTime())/31557600000); return String(Math.max(0,y)) } }catch{} }
    return ''
  }, [patient])

  // Expose a method for print preview to collect normalized data
  useImperativeHandle(ref, () => ({
    getPreviewData: () => {
      const depRow = deps.find(d=> String(d._id||d.id)===form.referredTo.departmentId)
      const docRow = docs.find(d=> String(d._id||d.id)===form.referredTo.doctorId)
      const p = patient
      const patientObj = {
        name: p?.fullName || (p as any)?.name || '-',
        mrn: p?.mrn || (p as any)?.mrNumber || mrn || '-',
        gender: p?.gender || '-',
        fatherName: p?.fatherName || (p as any)?.fatherHusbandName || '',
        age: patientAge || '',
        phone: p?.phone || p?.phoneNormalized || '',
        address: p?.address || '',
        cnic: (p as any)?.cnic || (p as any)?.cnicNormalized || '',
      }
      const referralObj = {
        date: form.referralDate,
        time: form.referralTime,
        reason: form.reasonOfReferral,
        provisionalDiagnosis: form.provisionalDiagnosis,
        vitals: { ...form.vitals },
        referredTo: { department: depRow?.name || '', doctor: docRow?.name || '' },
        condition: { stability: form.stability, consciousness: form.consciousness },
        remarks: form.remarks,
        signStamp: form.signStamp,
        referredBy: doctor?.name || '',
      }
      return { patient: patientObj, referral: referralObj, prescriptionSnapshot }
    }
  }), [deps, docs, form, patient, patientAge, doctor?.name, mrn])

  async function save(){
    if (!patient?._id) { setToast({ type: 'error', message: 'Patient not found' }); return }
    setSaving(true)
    try{
      const isHex24 = (s?: string) => !!s && /^[a-f\d]{24}$/i.test(s)
      const depId = isHex24(form.referredTo.departmentId) ? form.referredTo.departmentId : undefined
      const docId = isHex24(form.referredTo.doctorId) ? form.referredTo.doctorId : undefined
      const payload: any = {
        patientId: String(patient._id),
        referredByDoctorId: doctor?.id || undefined,
        referralDate: form.referralDate || undefined,
        referralTime: form.referralTime || undefined,
        reasonOfReferral: form.reasonOfReferral || undefined,
        provisionalDiagnosis: form.provisionalDiagnosis || undefined,
        vitals: {
          bp: form.vitals.bp || undefined,
          pulse: form.vitals.pulse ? Number(form.vitals.pulse) : undefined,
          temperature: form.vitals.temperature ? Number(form.vitals.temperature) : undefined,
          rr: form.vitals.rr ? Number(form.vitals.rr) : undefined,
        },
        referredTo: { departmentId: depId, doctorId: docId },
        condition: { stability: form.stability, consciousness: form.consciousness },
        remarks: form.remarks || undefined,
        prescriptionSnapshot: prescriptionSnapshot || undefined,
      }
      
      let res: any
      if (isErReferral) {
        payload.priority = form.priority
        res = await hospitalApi.createErReferral(payload)
      } else {
        payload.signStamp = form.signStamp || undefined
        res = await hospitalApi.createIpdReferral(payload)
      }
      
      const id = res?.referral?._id || res?.id
      if (!res || res.error){ throw new Error(res?.error || 'Failed') }
      onSaved?.(id)
      setToast({ type: 'success', message: 'Referral saved' })
    }catch(e:any){
      try{
        const key = isErReferral ? 'hospital.er.referrals' : 'hospital.ipd.referrals'
        const raw = localStorage.getItem(key) || '[]'
        const arr = JSON.parse(raw) as any[]
        const id = crypto.randomUUID()
        const depRow = deps.find(d=> String(d._id||d.id)===form.referredTo.departmentId)
        const docRow = docs.find(d=> String(d._id||d.id)===form.referredTo.doctorId)
        const item: any = {
          _id: id,
          serial: 'LOCAL-'+String(arr.length+1).padStart(4,'0'),
          patientId: patient._id,
          patientSnapshot: {
            mrn: patient.mrn || patient.mrNumber || mrn || '-',
            fullName: patient.fullName || patient.name || '-',
            fatherHusbandName: patient.fatherName || '',
            cnic: patient.cnic || '',
            phone: patient.phone || patient.phoneNormalized || '',
            dob: patient.dob || '',
            age: patientAge,
            gender: patient.gender || '',
            maritalStatus: patient.maritalStatus || '',
            address: patient.address || '',
          },
          referredBy: { doctorId: doctor?.id || '', doctorName: doctor?.name || '' },
          referredTo: { departmentId: form.referredTo.departmentId || '', departmentName: depRow?.name, doctorId: form.referredTo.doctorId || '', doctorName: docRow?.name },
          referralDate: form.referralDate, referralTime: form.referralTime,
          reasonOfReferral: form.reasonOfReferral, provisionalDiagnosis: form.provisionalDiagnosis,
          vitals: { ...form.vitals },
          condition: { stability: form.stability, consciousness: form.consciousness },
          remarks: form.remarks,
          prescriptionSnapshot: prescriptionSnapshot || undefined,
          status: 'New',
          createdAt: new Date().toISOString(),
        }
        if (isErReferral) {
          item.priority = form.priority
        }
        localStorage.setItem(key, JSON.stringify([item, ...arr]))
        onSaved?.(id)
        setToast({ type: 'info', message: `Failed to save on server: ${e?.message || 'Unknown error'}. ${isErReferral ? 'ER' : 'IPD'} referral saved locally.` })
      }catch(e:any){ setToast({ type: 'error', message: e?.message || 'Failed to save' }) }
    }finally{ setSaving(false) }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">{formTitle}</div>
        <button disabled={!canSave || saving} onClick={save} className="btn disabled:opacity-50">{saving? 'Saving...' : 'Save Referral'}</button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-slate-200 p-3 bg-slate-50">
          <div className="text-sm font-medium text-slate-700 mb-2">Patient</div>
          <div className="grid gap-2 text-sm">
            <div><span className="text-slate-500">Name:</span> <span className="capitalize">{patient?.fullName || patient?.name || '-'}</span></div>
            <div><span className="text-slate-500">MRN:</span> <span>{patient?.mrn || patient?.mrNumber || mrn || '-'}</span></div>
            <div><span className="text-slate-500">Age:</span> <span>{patientAge || '-'}</span> <span className="ml-3 text-slate-500">Gender:</span> <span className="capitalize">{patient?.gender || '-'}</span></div>
            <div><span className="text-slate-500">Father/Husband:</span> <span className="capitalize">{patient?.fatherName || '-'}</span></div>
            <div><span className="text-slate-500">CNIC:</span> <span>{patient?.cnic || (patient as any)?.cnicNormalized || '-'}</span></div>
            <div><span className="text-slate-500">Phone:</span> <span>{patient?.phone || patient?.phoneNormalized || '-'}</span></div>
            <div><span className="text-slate-500">Address:</span> <span>{patient?.address || '-'}</span></div>
          </div>
        </div>
        <div className="grid gap-3">
          <label className="block text-sm"><span className="text-slate-600 block mb-1">Date of Referral</span><input type="date" value={form.referralDate} onChange={e=>setForm(f=>({ ...f, referralDate: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
          <label className="block text-sm"><span className="text-slate-600 block mb-1">Time of Referral</span><input type="time" value={form.referralTime} onChange={e=>setForm(f=>({ ...f, referralTime: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
          <label className="block text-sm"><span className="text-slate-600 block mb-1">Reason of Referral</span><input value={form.reasonOfReferral} onChange={e=>setForm(f=>({ ...f, reasonOfReferral: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
          <label className="block text-sm"><span className="text-slate-600 block mb-1">Provisional Diagnosis</span><input value={form.provisionalDiagnosis} onChange={e=>setForm(f=>({ ...f, provisionalDiagnosis: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 mt-3">
        <label className="block text-sm"><span className="text-slate-600 block mb-1">BP</span><input value={form.vitals.bp} onChange={e=>setForm(f=>({ ...f, vitals: { ...f.vitals, bp: e.target.value } }))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="120/80" /></label>
        <label className="block text-sm"><span className="text-slate-600 block mb-1">Pulse</span><input value={form.vitals.pulse} onChange={e=>setForm(f=>({ ...f, vitals: { ...f.vitals, pulse: e.target.value } }))} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        <label className="block text-sm"><span className="text-slate-600 block mb-1">Temperature</span><input value={form.vitals.temperature} onChange={e=>setForm(f=>({ ...f, vitals: { ...f.vitals, temperature: e.target.value } }))} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        <label className="block text-sm"><span className="text-slate-600 block mb-1">RR</span><input value={form.vitals.rr} onChange={e=>setForm(f=>({ ...f, vitals: { ...f.vitals, rr: e.target.value } }))} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      </div>

      <div className="grid gap-3 md:grid-cols-2 mt-3">
        <div className="grid gap-3">
          <label className="block text-sm"><span className="text-slate-600 block mb-1">Referred To - Department</span>
            <select value={form.referredTo.departmentId} onChange={e=>setForm(f=>({ ...f, referredTo: { ...f.referredTo, departmentId: e.target.value } }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Select department (optional)</option>
              {deps.map((d:any)=> (<option key={String(d._id||d.id)} value={String(d._id||d.id)}>{d.name}</option>))}
            </select>
          </label>
          <label className="block text-sm"><span className="text-slate-600 block mb-1">Priority (for Emergency)</span>
            <select value={form.priority} onChange={e=>setForm(f=>({ ...f, priority: e.target.value as any }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="Regular">Regular</option>
              <option value="Urgent">Urgent</option>
              <option value="Critical">Critical</option>
            </select>
          </label>
          <label className="block text-sm"><span className="text-slate-600 block mb-1">Doctor (optional)</span>
            <select value={form.referredTo.doctorId} onChange={e=>setForm(f=>({ ...f, referredTo: { ...f.referredTo, doctorId: e.target.value } }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Select doctor</option>
              {docs.map((d:any)=> (<option key={String(d._id||d.id)} value={String(d._id||d.id)}>{d.name}</option>))}
            </select>
          </label>
        </div>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm"><span className="text-slate-600 block mb-1">Condition</span>
              <select value={form.stability} onChange={e=>setForm(f=>({ ...f, stability: e.target.value as any }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
                <option value="Stable">Stable</option>
                <option value="Unstable">Unstable</option>
              </select>
            </label>
            <label className="block text-sm"><span className="text-slate-600 block mb-1">Consciousness</span>
              <select value={form.consciousness} onChange={e=>setForm(f=>({ ...f, consciousness: e.target.value as any }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
                <option value="Conscious">Conscious</option>
                <option value="Unconscious">Unconscious</option>
              </select>
            </label>
          </div>
          <label className="block text-sm"><span className="text-slate-600 block mb-1">Any other Remarks</span><textarea rows={3} value={form.remarks} onChange={e=>setForm(f=>({ ...f, remarks: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        </div>
      </div>

      {loading && <div className="mt-2 text-sm text-slate-500">Loading patient…</div>}
      {/* Prescription Snapshot Preview */}
      {prescriptionSnapshot && (
        <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/40 p-4">
          <div className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-sky-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            OPD Prescription Summary (will be included in referral)
          </div>
          {prescriptionSnapshot.diagnosis && (
            <div className="text-xs mb-1"><span className="font-medium text-slate-600">Diagnosis:</span> <span className="text-slate-800">{prescriptionSnapshot.diagnosis}</span></div>
          )}
          {prescriptionSnapshot.primaryComplaint && (
            <div className="text-xs mb-1"><span className="font-medium text-slate-600">Complaint:</span> <span className="text-slate-800">{prescriptionSnapshot.primaryComplaint}</span></div>
          )}
          {prescriptionSnapshot.items && prescriptionSnapshot.items.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Medications ({prescriptionSnapshot.items.length})</div>
              <div className="space-y-1">
                {prescriptionSnapshot.items.map((it, idx) => (
                  <div key={idx} className="text-xs bg-white rounded-md border border-slate-200 px-2 py-1 flex items-center gap-2">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-sky-100 text-sky-600 text-[9px] font-bold shrink-0">{idx + 1}</span>
                    <span className="font-medium text-slate-700">{it.name}</span>
                    {it.dose && <span className="text-slate-500">· {it.dose}</span>}
                    {it.frequency && <span className="text-slate-500">· {it.frequency}</span>}
                    {it.duration && <span className="text-slate-500">· {it.duration}</span>}
                    {it.instruction && <span className="text-slate-500">· {it.instruction}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {prescriptionSnapshot.vitals && Object.values(prescriptionSnapshot.vitals).some(v => v != null) && (
            <div className="mt-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Vitals</div>
              <div className="flex flex-wrap gap-2">
                {prescriptionSnapshot.vitals.pulse != null && <span className="text-xs bg-white rounded-md border border-slate-200 px-2 py-0.5">Pulse: {prescriptionSnapshot.vitals.pulse}</span>}
                {prescriptionSnapshot.vitals.temperatureC != null && <span className="text-xs bg-white rounded-md border border-slate-200 px-2 py-0.5">Temp: {prescriptionSnapshot.vitals.temperatureC}°C</span>}
                {prescriptionSnapshot.vitals.bloodPressureSys != null && <span className="text-xs bg-white rounded-md border border-slate-200 px-2 py-0.5">BP: {prescriptionSnapshot.vitals.bloodPressureSys}/{prescriptionSnapshot.vitals.bloodPressureDia}</span>}
                {prescriptionSnapshot.vitals.respiratoryRate != null && <span className="text-xs bg-white rounded-md border border-slate-200 px-2 py-0.5">RR: {prescriptionSnapshot.vitals.respiratoryRate}</span>}
                {prescriptionSnapshot.vitals.spo2 != null && <span className="text-xs bg-white rounded-md border border-slate-200 px-2 py-0.5">SpO2: {prescriptionSnapshot.vitals.spo2}%</span>}
              </div>
            </div>
          )}
          {prescriptionSnapshot.labTests && prescriptionSnapshot.labTests.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Lab Tests</div>
              <div className="text-xs text-slate-700">{prescriptionSnapshot.labTests.join(', ')}</div>
            </div>
          )}
          {prescriptionSnapshot.diagnosticTests && prescriptionSnapshot.diagnosticTests.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Diagnostic Tests</div>
              <div className="text-xs text-slate-700">{prescriptionSnapshot.diagnosticTests.join(', ')}</div>
            </div>
          )}
        </div>
      )}

      {!patient && !loading && mrn && <div className="mt-2 text-sm text-rose-600">No patient found for MRN: {mrn}</div>}

      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
})
