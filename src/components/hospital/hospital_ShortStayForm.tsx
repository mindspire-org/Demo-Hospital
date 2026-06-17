import { useEffect, useMemo, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import Toast, { type ToastState } from '../ui/Toast'
import SuggestField from '../SuggestField'

type ShortStayForm = {
  patientName?: string
  mrn?: string
  age?: string
  sex?: 'M'|'F'|''
  address?: string
  dateIn?: string
  timeIn?: string
  dateOut?: string
  timeOut?: string
  isOpd?: boolean
  isShortStay?: boolean
  isReferred?: boolean
  admissionTo?: string
  presentingComplaints?: string
  briefHistory?: string
  anyProcedure?: string
  finalDiagnosis?: string
  consultant?: string
  vitals?: { bp?: string; hr?: string; spo2?: string; temp?: string; fhr?: string }
  tests?: { hb?: string; bilirubin?: string; bsr?: string; urea?: string; screat?: string }
  treatmentGiven?: string
  treatmentAtDischarge?: string
  referralCenter?: string
  referralContact?: string
  referralReason?: string
  conditionAtDischarge?: 'Satisfactory'|'Fair'|'Poor'|''
  responseOfTreatment?: 'Excellent'|'Good'|'Average'|'Poor'|''
  followUpInstructions?: string
  doctorName?: string
  signDate?: string
  signTime?: string
}

// UI uses app's standard form styling in-screen; print layout remains custom HTML in printView

type Props = { encounterId?: string; patient?: { name?: string; mrn?: string; address?: string; admitted?: string; endAt?: string; encounterType?: string } }

export default function Hospital_ShortStayForm(props: Props){
  const { id: routeId = '' } = useParams()
  const [encounterId, setEncounterId] = useState('')
  const [form, setForm] = useState<ShortStayForm>({ vitals: {}, tests: {}, isShortStay: true })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const [doctors, setDoctors] = useState<Array<{ _id: string; fullName?: string; name?: string }>>([])
  const [toast, setToast] = useState<ToastState>(null)
  const initialLoadStartedRef = useRef(false)
  const dataLoadedRef = useRef(false)
  const formRef = useRef(form)
  formRef.current = form  // Always keep ref updated with latest form

  useEffect(()=>{ (async()=>{
    if (initialLoadStartedRef.current) return
    initialLoadStartedRef.current = true
    try {
      setLoading(true)
      // Prefer encounterId passed from parent (wizard)
      let encId = props.encounterId || ''
      const isER = props.patient?.encounterType === 'EMERGENCY'
      const now = new Date()
      const today = now.toISOString().slice(0,10)
      const nowTime = toLocalTimeStr(now)
      if (encId){
        setEncounterId(encId)
        // Prefill from provided patient snapshot
        setForm(v=>({
          ...v,
          patientName: v.patientName || props.patient?.name || '',
          mrn: v.mrn || props.patient?.mrn || '',
          address: v.address || props.patient?.address || '',
          dateIn: v.dateIn || (props.patient?.admitted ? String(props.patient.admitted).slice(0,10) : ''),
          timeIn: v.timeIn || (props.patient?.admitted ? toLocalTimeStr(new Date(props.patient.admitted as any)) : ''),
        }))
        // Fetch encounter to enrich with patient age/sex and discharge date
        if (isER) {
          // ER encounter - use billing summary API
          const s: any = await hospitalApi.erBillingSummary(encId).catch(()=>null)
          const enc = s?.encounter
          const p = enc?.patientId || {}
          if (enc){
            setForm(v=>({
              ...v,
              dateOut: v.dateOut || (enc.endAt? String(enc.endAt).slice(0,10): today),
              timeOut: v.timeOut || (enc.endAt? toLocalTimeStr(new Date(enc.endAt)): nowTime),
              age: v.age || (p.age || ''),
              sex: v.sex ? v.sex : normSex(p.gender),
            }))
          }
        } else {
          // IPD encounter
          const e: any = await hospitalApi.getIPDAdmissionById(encId).catch(()=>null)
          const enc = e?.encounter
          const p = enc?.patientId || {}
          if (enc){
            setForm(v=>({
              ...v,
              dateOut: v.dateOut || (enc.endAt? String(enc.endAt).slice(0,10): today),
              timeOut: v.timeOut || (enc.endAt? toLocalTimeStr(new Date(enc.endAt)): nowTime),
              age: v.age || (p.age || ''),
              sex: v.sex ? v.sex : normSex(p.gender),
            }))
          }
        }
        const ss: any = await hospitalApi.getIpdShortStay(encId).catch(()=>null)
        const data = ss?.shortStay?.data
        if (data) {
          setForm(prev => ({ ...prev, ...data }))
          dataLoadedRef.current = true
        } else {
          // No existing data - set default sign date/time
          setForm(v => ({ ...v, signDate: v.signDate || today, signTime: v.signTime || nowTime }))
        }
        return
      }
      // Fallback: resolve from route id
      if (!routeId) return
      const e: any = await hospitalApi.getIPDAdmissionById(routeId).catch(()=>null)
      const enc = e?.encounter
      if (enc){
        encId = String(enc._id)
        setEncounterId(encId)
        setForm(v=>({
          ...v,
          patientName: v.patientName || enc.patientId?.fullName || '',
          mrn: v.mrn || enc.patientId?.mrn || '',
          address: v.address || enc.patientId?.address || '',
          dateIn: v.dateIn || (enc.startAt? String(enc.startAt).slice(0,10):''),
          timeIn: v.timeIn || (enc.startAt? toLocalTimeStr(new Date(enc.startAt)) : ''),
          dateOut: v.dateOut || (enc.endAt? String(enc.endAt).slice(0,10): today),
          timeOut: v.timeOut || (enc.endAt? toLocalTimeStr(new Date(enc.endAt)): nowTime),
          age: v.age || (enc.patientId?.age || ''),
          sex: v.sex ? v.sex : normSex(enc.patientId?.gender),
        }))
        const ss: any = await hospitalApi.getIpdShortStay(encId).catch(()=>null)
        const data = ss?.shortStay?.data
        if (data) {
          setForm(prev => ({ ...prev, ...data }))
          dataLoadedRef.current = true
        } else {
          // No existing data - set default sign date/time
          setForm(v => ({ ...v, signDate: v.signDate || today, signTime: v.signTime || nowTime }))
        }
      }
    } finally { setLoading(false) }
  })() }, [props.encounterId, props.patient, routeId])

  // Auto-print when opened with ?print=1 - wait for data to be loaded
  const [autoPrintTriggered, setAutoPrintTriggered] = useState(false)
  const hasPrintedRef = useRef(false)
  useEffect(()=>{
    if (hasPrintedRef.current) return
    if (autoPrintTriggered) return
    const p = new URLSearchParams(window.location.search)
    if (p.get('print') !== '1') return
    if (loading) return // Wait for loading to finish
    if (!initialLoadStartedRef.current) return // Wait for load to have started
    if (!dataLoadedRef.current) {
      // Data hasn't loaded yet, wait a bit more
      setTimeout(() => {
        if (dataLoadedRef.current && !hasPrintedRef.current) {
          hasPrintedRef.current = true
          setAutoPrintTriggered(true)
          try { printView() } catch {}
        }
      }, 200)
      return
    }
    
    const encId = props.encounterId || routeId
    if (!encId) return
    
    // Data is loaded, trigger print
    hasPrintedRef.current = true
    setAutoPrintTriggered(true)
    setTimeout(()=>{ try { printView() } catch {} }, 100)
  }, [loading, props.encounterId, routeId, autoPrintTriggered])

  // Load hospital settings for print header
  useEffect(()=>{ (async()=>{
    try { const s = await hospitalApi.getSettings().catch(()=>null); if (s) setSettings(s) } catch {}
  })() }, [])

  // Load doctors list
  useEffect(()=>{ (async()=>{
    try { const res: any = await hospitalApi.listDoctors(); const items = (res?.doctors || res || []) as Array<{ _id: string; fullName?: string; name?: string }>; setDoctors(items) } catch { setDoctors([]) }
  })() }, [])

  // Doctor names for searchable dropdown
  const doctorNames = useMemo(() => doctors.map(d => d.fullName || d.name || '').filter(Boolean), [doctors])

  const admittedAtIso = useMemo(()=>combineIso(form.dateIn, form.timeIn), [form.dateIn, form.timeIn])
  const dischargedAtIso = useMemo(()=>combineIso(form.dateOut, form.timeOut), [form.dateOut, form.timeOut])

  async function save(){
    if (!encounterId) return
    setSaving(true)
    try {
      await hospitalApi.upsertIpdShortStay(encounterId, {
        admittedAt: admittedAtIso,
        dischargedAt: dischargedAtIso,
        data: form,
      })
      setToast({ type: 'success', message: 'Saved' })
    } finally { setSaving(false) }
  }

  function printView(){
    const api: any = (window as any).electronAPI
    const style = `
      <style>@page{size:A4;margin:12mm}
      body{font-family:system-ui,Segoe UI,Arial,sans-serif;color:#111}
      .page{border:2px solid #222;padding:16px}
      .grid{display:grid;gap:8px;align-items:end}
      .line{border-bottom:1px solid #222;min-height:20px}
      .title{font-weight:900;text-align:center;margin:6px 0}
      .t{border:1px solid #222}
      .row2{display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:end}
      .lbl{font-weight:700}
      .inline{display:inline-block;border-bottom:1px solid #222;min-height:0;padding:0 2px;width:max-content}
      </style>
    `
    const F = formRef.current  // Use ref to get latest form data
    const S = settings||{}
    const logo = S?.logoDataUrl ? `<img src="${S.logoDataUrl}" style="height:60px; object-fit:contain;" />` : ''
    const hdr = `
      <div style="display:grid; grid-template-columns:auto 1fr auto; align-items:center;">
        <div style="justify-self:start;">${logo}</div>
        <div style="text-align:center;">
          <div style="font-size:18px; font-weight:800;">${esc(S?.name||'')}</div>
          <div style="font-size:12px; color:#333;">${esc(S?.address||'')}</div>
          <div style="font-size:12px; color:#333;">${[S?.phone, S?.email].filter(Boolean).map(esc).join(' | ')}</div>
        </div>
        <div></div>
      </div>`
    const lv = (l:string, v?:string)=>`<div class="row2"><div class="lbl">${l}</div><div class="line">${esc(v)}</div></div>`
    const html = `<!doctype html><html><head><meta charset="utf-8"/>${style}</head><body>
      <div class="page">
        ${hdr}
        <div class="title">SHORT STAY FORM</div>
        <!-- Patient info row - name takes remaining space -->
        <div class="grid" style="grid-template-columns:85px 1fr auto 140px auto 60px auto 60px;margin-top:8px;align-items:end;">
          <div class="lbl">Name:</div>
          <div class="line" style="min-width:0;">${esc(F.patientName)}</div>
          <div class="lbl">MR#</div>
          <div class="line">${esc(F.mrn)}</div>
          <div class="lbl">Age:</div>
          <div class="line">${esc(F.age)}</div>
          <div class="lbl">Sex:</div>
          <div class="line">${esc(F.sex)}</div>
        </div>
        <!-- Address on its own row -->
        <div class="grid" style="grid-template-columns:85px 1fr;margin-top:6px;align-items:end;"><div class="lbl">Address:</div><div class="line">${esc(F.address)}</div></div>
        <!-- Date and Time - compact layout to fit on one line -->
        <div class="grid" style="grid-template-columns:55px 90px 38px 65px 60px 90px 38px 65px;margin-top:6px;align-items:end;">
          <div class="lbl" style="white-space:nowrap;font-size:12px;">Date In:</div><div class="line" style="font-size:12px;">${esc(fmtDate(F.dateIn))}</div>
          <div class="lbl" style="font-size:12px;">Time:</div><div class="line" style="font-size:12px;">${esc(fmtTime(F.timeIn))}</div>
          <div class="lbl" style="white-space:nowrap;font-size:12px;">Date Out:</div><div class="line" style="font-size:12px;">${esc(fmtDate(F.dateOut))}</div>
          <div class="lbl" style="font-size:12px;">Time:</div><div class="line" style="font-size:12px;">${esc(fmtTime(F.timeOut))}</div>
        </div>
        <div class="grid" style="grid-template-columns:auto 1fr auto 1fr auto 1fr;align-items:center;column-gap:10px;margin-top:8px"><div class="lbl">OPD ${F.isOpd?'☑':'☐'}</div><div></div><div class="lbl">Short Stay ${F.isShortStay?'☑':'☐'}</div><div></div><div class="lbl">Referred ${F.isReferred?'☑':'☐'}</div></div>
        ${lv('Admission to:', F.admissionTo)}${lv('Presenting Complains:', F.presentingComplaints)}${lv('Brief History:', F.briefHistory)}${lv('Any procedure:', F.anyProcedure)}
        <div class="grid" style="grid-template-columns:auto 1fr auto 200px;margin-top:8px"><div class="lbl">Final diagnosis:</div><div class="line">${esc(F.finalDiagnosis)}</div><div class="lbl">Consultant:</div><div class="line">${esc(F.consultant)}</div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">
          <div class="t">${vRow('BP',F.vitals?.bp)}${vRow('HR',F.vitals?.hr)}${vRow('SPO2',F.vitals?.spo2)}${vRow('Temp',F.vitals?.temp)}${vRow('FHR',F.vitals?.fhr)}</div>
          <div class="t"><div style="display:grid;grid-template-columns:1fr 120px"><div style="border-right:1px solid #222;padding:4px 6px;font-weight:700;border-bottom:1px solid #222">Test</div><div style="padding:4px 6px;text-align:center;font-weight:700;border-bottom:1px solid #222">Results</div></div>${tRow('Hb',F.tests?.hb)}${tRow('Bilirubin D/Ind',F.tests?.bilirubin)}${tRow('BSR',F.tests?.bsr)}${tRow('Urea',F.tests?.urea)}${tRow('S,Creat',F.tests?.screat)}</div>
        </div>
        ${lv('Treatment Given at Hospital:', F.treatmentGiven)}${lv('Treatment at Discharge:', F.treatmentAtDischarge)}
        <div class="grid" style="grid-template-columns:auto 1fr auto 200px;margin-top:8px"><div class="lbl">Referred to / center name:</div><div class="line">${esc(F.referralCenter)}</div><div class="lbl">Contact No:</div><div class="line">${esc(F.referralContact)}</div></div>
        ${lv('Reason for referral:', F.referralReason)}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px"><div class="t" style="padding:6px"><div style="font-weight:700;margin-bottom:6px">Condition at Discharge:</div><div>${['Satisfactory','Fair','Poor'].map(x=>`${F.conditionAtDischarge===x?'☑':'☐'} ${x}`).join('  ')}</div></div><div class="t" style="padding:6px"><div style="font-weight:700;margin-bottom:6px">Response of Treatment:</div><div>${['Excellent','Good','Average','Poor'].map(x=>`${F.responseOfTreatment===x?'☑':'☐'} ${x}`).join('  ')}</div></div></div>
        ${lv('Follow up Instructions:', F.followUpInstructions)}
        <div style="display:grid;grid-template-columns:1fr 320px;column-gap:10px;margin-top:10px">
          <div style="display:grid;grid-template-rows:auto auto;row-gap:6px">
            <div class="row2"><div class="lbl">Doctor Name:</div><div class="line">${esc(F.doctorName)}</div></div>
            <div style="display:flex;align-items:end;gap:4px"><div class="lbl">Stamp:</div><div class="line" style="width:110px"></div></div>
          </div>
          <div style="display:grid;grid-template-rows:auto auto;row-gap:6px">
            <div style="display:flex;align-items:end;gap:4px"><div class="lbl">Sign:</div><div class="line" style="width:130px"></div></div>
            <div style="display:flex;align-items:end;gap:8px"><div class="lbl">Date:</div><div class="inline">${esc(fmtDate(F.signDate))}</div><div class="lbl">Time:</div><div class="inline">${esc(fmtTime(F.signTime))}</div></div>
          </div>
        </div>
        <div style="text-align:right;margin-top:8px;font-size:12px">32</div>
      </div>
    </body></html>`
    
    // Use Electron print preview if available
    try {
      if (api && typeof api.printPreviewHtml === 'function'){
        api.printPreviewHtml(html, {})
        return
      }
    } catch {}
    
    // Fallback to browser window
    const w = window.open('', '_blank'); if (!w) return
    w.document.write(html); w.document.close(); w.focus()
  }

  return (
    <div className="space-y-3">
      <Toast toast={toast} onClose={()=>setToast(null)} />
      <div className="text-lg font-bold text-slate-800">Short Stay Form</div>

      {/* Patient Info Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Patient Information</div>
        <div className="grid md:grid-cols-7 gap-2">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Patient's Name</label>
            <input className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" value={form.patientName||''} onChange={e=>setForm(v=>({ ...v, patientName: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">MR#</label>
            <input className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" value={form.mrn||''} onChange={e=>setForm(v=>({ ...v, mrn: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Age</label>
            <input className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" value={form.age||''} onChange={e=>setForm(v=>({ ...v, age: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Sex</label>
            <select className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" value={form.sex||''} onChange={e=>setForm(v=>({ ...v, sex: (e.target.value as any) }))}>
              <option value="">-</option>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Address</label>
            <input className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" value={form.address||''} onChange={e=>setForm(v=>({ ...v, address: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Admission Details Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Admission Details</div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-1.5 text-sm"><input type="checkbox" className="rounded border-slate-300" checked={!!form.isOpd} onChange={e=>setForm(v=>({ ...v, isOpd: e.target.checked }))} /> <span className="text-slate-700">OPD</span></label>
            <label className="inline-flex items-center gap-1.5 text-sm"><input type="checkbox" className="rounded border-slate-300" checked={!!form.isShortStay} onChange={e=>setForm(v=>({ ...v, isShortStay: e.target.checked }))} /> <span className="text-slate-700">Short Stay</span></label>
            <label className="inline-flex items-center gap-1.5 text-sm"><input type="checkbox" className="rounded border-slate-300" checked={!!form.isReferred} onChange={e=>setForm(v=>({ ...v, isReferred: e.target.checked }))} /> <span className="text-slate-700">Referred</span></label>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Admission to</label>
            <input className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" value={form.admissionTo||''} onChange={e=>setForm(v=>({ ...v, admissionTo: e.target.value }))} />
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-2 mt-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Date In</label>
            <input type="date" className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" value={form.dateIn||''} onChange={e=>setForm(v=>({ ...v, dateIn: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Time In</label>
            <input type="time" className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" value={form.timeIn||''} onChange={e=>setForm(v=>({ ...v, timeIn: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Date Out</label>
            <input type="date" className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" value={form.dateOut||''} onChange={e=>setForm(v=>({ ...v, dateOut: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Time Out</label>
            <input type="time" className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" value={form.timeOut||''} onChange={e=>setForm(v=>({ ...v, timeOut: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Clinical Details Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Clinical Details</div>
        <div className="grid md:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Presenting Complaints</label>
            <textarea className="w-full border border-slate-300 rounded px-2 py-1 text-sm h-16 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none resize-none" value={form.presentingComplaints||''} onChange={e=>setForm(v=>({ ...v, presentingComplaints: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Reason of Admission / Brief History</label>
            <textarea className="w-full border border-slate-300 rounded px-2 py-1 text-sm h-16 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none resize-none" value={form.briefHistory||''} onChange={e=>setForm(v=>({ ...v, briefHistory: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Any Procedure</label>
            <textarea className="w-full border border-slate-300 rounded px-2 py-1 text-sm h-12 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none resize-none" value={form.anyProcedure||''} onChange={e=>setForm(v=>({ ...v, anyProcedure: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-0.5">Final Diagnosis</label>
              <input className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" value={form.finalDiagnosis||''} onChange={e=>setForm(v=>({ ...v, finalDiagnosis: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-0.5">Consultant</label>
              <input className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" value={form.consultant||''} onChange={e=>setForm(v=>({ ...v, consultant: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      {/* Vitals & Investigations Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Vitals</div>
            <div className="grid grid-cols-5 gap-2">
              {compactVital('BP','bp')}
              {compactVital('HR','hr')}
              {compactVital('SpO2','spo2')}
              {compactVital('Temp','temp')}
              {compactVital('FHR','fhr')}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Investigations</div>
            <div className="grid grid-cols-5 gap-2">
              {compactTest('Hb','hb')}
              {compactTest('Bili','bilirubin')}
              {compactTest('BSR','bsr')}
              {compactTest('Urea','urea')}
              {compactTest('Creat','screat')}
            </div>
          </div>
        </div>
      </div>

      {/* Treatment Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Treatment</div>
        <div className="grid md:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Treatment Given at Hospital</label>
            <textarea className="w-full border border-slate-300 rounded px-2 py-1 text-sm h-20 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none resize-none" value={form.treatmentGiven||''} onChange={e=>setForm(v=>({ ...v, treatmentGiven: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Treatment at Discharge</label>
            <textarea className="w-full border border-slate-300 rounded px-2 py-1 text-sm h-20 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none resize-none" value={form.treatmentAtDischarge||''} onChange={e=>setForm(v=>({ ...v, treatmentAtDischarge: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Referral Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Referral</div>
        <div className="grid md:grid-cols-3 gap-2">
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Referred to / Center Name</label>
            <input className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" value={form.referralCenter||''} onChange={e=>setForm(v=>({ ...v, referralCenter: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Contact No</label>
            <input className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" value={form.referralContact||''} onChange={e=>setForm(v=>({ ...v, referralContact: e.target.value }))} />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Reason for Referral</label>
            <input className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" value={form.referralReason||''} onChange={e=>setForm(v=>({ ...v, referralReason: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Status & Follow-up Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="grid md:grid-cols-3 gap-3">
          <div className="border border-slate-200 rounded p-2">
            <div className="text-xs font-medium text-slate-600 mb-1">Condition at Discharge</div>
            <div className="flex flex-wrap gap-3 text-xs">
              {(['Satisfactory','Fair','Poor'] as const).map(opt=> (
                <label key={opt} className="inline-flex items-center gap-1">
                  <input type="radio" name="cond" className="text-sky-600" checked={form.conditionAtDischarge===opt} onChange={()=> setForm(v=>({ ...v, conditionAtDischarge: opt }))} /> <span className="text-slate-700">{opt}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="border border-slate-200 rounded p-2">
            <div className="text-xs font-medium text-slate-600 mb-1">Response of Treatment</div>
            <div className="flex flex-wrap gap-2 text-xs">
              {(['Excellent','Good','Average','Poor'] as const).map(opt=> (
                <label key={opt} className="inline-flex items-center gap-1">
                  <input type="radio" name="resp" className="text-sky-600" checked={form.responseOfTreatment===opt} onChange={()=> setForm(v=>({ ...v, responseOfTreatment: opt }))} /> <span className="text-slate-700">{opt}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Follow up Instructions</label>
            <textarea className="w-full border border-slate-300 rounded px-2 py-1 text-sm h-12 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none resize-none" value={form.followUpInstructions||''} onChange={e=>setForm(v=>({ ...v, followUpInstructions: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Signature Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="grid md:grid-cols-4 gap-2">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Doctor Name</label>
            <SuggestField
              value={form.doctorName || ''}
              onChange={v => setForm(x => ({ ...x, doctorName: v }))}
              suggestions={doctorNames}
              placeholder="Search doctor..."
              as="input"
              className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Sign Date</label>
            <input type="date" className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" value={form.signDate||''} onChange={e=>setForm(v=>({ ...v, signDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Sign Time</label>
            <input type="time" className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" value={form.signTime||''} onChange={e=>setForm(v=>({ ...v, signTime: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="flex justify-start gap-2 pt-2">
        <button onClick={save} disabled={saving||loading} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50">{saving? 'Saving...':'Save'}</button>
        <button onClick={printView} className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-sm font-medium transition-colors">Print</button>
      </div>
    </div>
  )

  function compactVital(lbl:string, key:keyof NonNullable<ShortStayForm['vitals']>){
    return (
      <div>
        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">{lbl}</label>
        <input className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" value={(form.vitals?.[key] as string)||''} onChange={e=> setForm(v=> ({ ...v, vitals: { ...v.vitals, [key]: e.target.value } }))} />
      </div>
    )
  }

  function compactTest(lbl:string, key:keyof NonNullable<ShortStayForm['tests']>){
    return (
      <div>
        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">{lbl}</label>
        <input className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" value={(form.tests?.[key] as string)||''} onChange={e=> setForm(v=> ({ ...v, tests: { ...v.tests, [key]: e.target.value } }))} />
      </div>
    )
  }
  function normSex(g?: string): 'M'|'F'|'' {
    const s = String(g||'').trim().toLowerCase()
    if (!s) return ''
    if (s.startsWith('m')) return 'M'
    if (s.startsWith('f')) return 'F'
    return ''
  }
}

// Convert Date to local time string HH:mm (for <input type="time">)
function toLocalTimeStr(d?: Date | string): string {
  if (!d) return ''
  try {
    const date = typeof d === 'string' ? new Date(d) : d
    if (isNaN(date.getTime())) return ''
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  } catch { return '' }
}
function combineIso(d?:string, t?:string){ try { if (!d) return undefined; const dd = new Date(d); if (t){ const [hh,mm] = String(t).split(':'); dd.setHours(Number(hh)||0, Number(mm)||0, 0, 0) } return dd.toISOString() } catch { return undefined } }
function fmtDate(d?: string){
  if (!d) return ''
  const s = String(d)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  try { const x = new Date(s); if (!isNaN(x.getTime())){ const dd = String(x.getDate()).padStart(2,'0'); const mm = String(x.getMonth()+1).padStart(2,'0'); const yy = x.getFullYear(); return `${dd}/${mm}/${yy}` } } catch {}
  return s
}
function fmtTime(t?: string){
  if (!t) return ''
  const s = String(t)
  const m = s.match(/^(\d{1,2}):(\d{2})/)
  if (m){ let hh = parseInt(m[1],10); const mm = m[2]; const ap = hh>=12? 'PM':'AM'; hh = hh%12 || 12; return `${hh}:${mm} ${ap}` }
  try { const x = new Date(s); if (!isNaN(x.getTime())) return x.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) } catch {}
  return s
}
function vRow(lbl?:string, val?:string){ return `<div style=\"display:grid;grid-template-columns:80px 1fr\"><div style=\"padding:4px 6px;font-weight:700;border-right:1px solid #222;border-bottom:1px solid #222\">${esc(lbl)}<\/div><div style=\"border-bottom:1px solid #222;padding:4px 6px\">${esc(val)}<\/div><\/div>` }
function tRow(lbl?:string, val?:string){ return `<div style=\"display:grid;grid-template-columns:1fr 120px\"><div style=\"border-right:1px solid #222;border-bottom:1px solid #222;padding:4px 6px\">${esc(lbl)}<\/div><div style=\"border-bottom:1px solid #222;padding:4px 6px\">${esc(val)}<\/div><\/div>` }
function esc(s?:string){ return String(s??'').replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'} as any)[c]) }
