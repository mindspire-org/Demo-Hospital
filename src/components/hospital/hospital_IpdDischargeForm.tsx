import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  FileText, Printer, Save, Plus, Trash2, Info, 
  Stethoscope, Thermometer, Pill, Calendar,
  User, Phone, MapPin, CheckCircle2, AlertCircle,
  ClipboardCheck
} from 'lucide-react';
import { ClinicalDatePicker } from '../ui/ClinicalDialog';
import { hospitalApi } from '../../utils/api';
import Toast, { type ToastState } from '../ui/Toast';

type Props = { encounterId?: string; patient?: any; encounterType?: 'IPD'|'EMERGENCY' };

export default function Discharged(props: Props){
  const { id } = useParams();
  const [encounterId, setEncounterId] = useState<string>(props.encounterId || '');
  const [patient, setPatient] = useState<any>(props.patient || {});
  const [brand, setBrand] = useState<any>({});
  const embedded = !!props.encounterId
  // Extended UI fields (mapped into backend payload)
  const [dor, setDor] = useState<string>('')
  const [lama, setLama] = useState<boolean>(false)
  const [ddrConsent, setDdrConsent] = useState<boolean>(false)
  const [advisedByDoctor, setAdvisedByDoctor] = useState<boolean>(false)
  const [presentingComplaints, setPresentingComplaints] = useState<string>('')
  const [reasonOfAdmission, setReasonOfAdmission] = useState<string>('')
  const [finalDiagnosis, setFinalDiagnosis] = useState<string>('')
  const [proceduresOutcome, setProceduresOutcome] = useState<string>('')
  const [treatmentInHospital, setTreatmentInHospital] = useState<string>('')
  const [invest, setInvest] = useState<any>({ HB:'', UREA:'', HCV:'', NA:'', PLATELETS:'', CREATININE:'', HBSAG:'', K:'', TLC:'', ALT:'', HIV:'', CA:'' })
  const [meds, setMeds] = useState<Array<{ name:string; dose:string; route:string; freq:string; timing:string; duration:string }>>(
    Array.from({ length: 3 }, ()=>({ name:'', dose:'', route:'', freq:'', timing:'', duration:'' }))
  )
  const [condAtDischarge, setCondAtDischarge] = useState<'satisfactory'|'fair'|'poor'|''>('')
  const [respOfTreatment, setRespOfTreatment] = useState<'excellent'|'good'|'average'|'poor'|''>('')
  const [followUpInstructions, setFollowUpInstructions] = useState<string>('')
  const [doctorName, setDoctorName] = useState<string>('')
  const [signDate, setSignDate] = useState<string>('')
  const [doctorSignText, setDoctorSignText] = useState<string>('')
  const [toast, setToast] = useState<ToastState>(null)
  const [busy, setBusy] = useState<boolean>(false)

  useEffect(() => { (async () => {
    try {
      const s: any = await hospitalApi.getSettings();
      setBrand({
        hospitalName: s?.name || '',
        hospitalLogo: s?.logoDataUrl || '',
        hospitalAddress: s?.address || '',
        hospitalPhone: s?.phone || '',
        hospitalEmail: s?.email || '',
      });
    } catch {}
    // If props provided, use them; else resolve via :id
    try {
      if (props.encounterId) {
        setEncounterId(String(props.encounterId));
      } else {
        const rid = String(id || '');
        if (rid) {
          // Try IPD first
          const e: any = await hospitalApi.getIPDAdmissionById(rid).catch(()=>null);
          const enc = e?.encounter;
          if (enc && enc._id) {
            setEncounterId(String(enc._id));
            if (!props.patient) {
              setPatient({
                id: String(enc.patientId?._id || ''),
                name: String(enc.patientId?.fullName || ''),
                mrn: enc.patientId?.mrn || '',
                phone: enc.patientId?.phoneNormalized || '',
                address: enc.patientId?.address || '',
                bed: enc.bedLabel || '',
                doctor: enc.doctorId?.name || '',
              });
            }
          } else {
            // Try ER encounter
            const s: any = await hospitalApi.erBillingSummary(rid).catch(()=>null);
            const erEnc = s?.encounter;
            if (erEnc && erEnc._id) {
              setEncounterId(String(erEnc._id));
              if (!props.patient) {
                setPatient({
                  id: String(erEnc.patientId?._id || ''),
                  name: String(erEnc.patientId?.fullName || ''),
                  mrn: erEnc.patientId?.mrn || '',
                  phone: erEnc.patientId?.phoneNormalized || '',
                  address: erEnc.patientId?.address || '',
                  bed: erEnc.bedLabel || '',
                  doctor: erEnc.doctorId?.name || '',
                });
              }
            }
          }
        }
      }
      const encId = String(props.encounterId || encounterId || '');
      if (encId) {
        try {
          const ds: any = await hospitalApi.getIpdDischargeSummary(encId);
          const sdoc = ds?.summary || ds;
          if (sdoc) {
            // Diagnosis, advice, sign date
            setFinalDiagnosis(sdoc.diagnosis || '')
            setFollowUpInstructions(sdoc.advice || '')
            setSignDate(sdoc.followUpDate ? new Date(sdoc.followUpDate).toISOString().slice(0,10) : '')

            // Parse courseInHospital to separate fields
            const course = String(sdoc.courseInHospital||'')
            const lines = course.split(/\n+/).map(t=>t.trim()).filter(Boolean)
            const findPref = (p:string)=> lines.find(l=> l.toLowerCase().startsWith(p.toLowerCase()))?.split(':').slice(1).join(':').trim() || ''
            setPresentingComplaints(findPref('Presenting Complaints'))
            setReasonOfAdmission(findPref('Reason of Admission'))
            setTreatmentInHospital(findPref('Treatment'))
            setAdvisedByDoctor(!!lines.find(l=> /Discharge advised by Doctor/i.test(l)))
            setLama(!!lines.find(l=> /^LAMA$/i.test(l)))
            setDdrConsent(!!lines.find(l=> /DDR Consent/i.test(l)))

            // Procedures
            setProceduresOutcome(Array.isArray(sdoc.procedures)? sdoc.procedures.join('\n') : (sdoc.procedures || ''))

            // Condition at discharge
            setCondAtDischarge((sdoc.conditionAtDischarge || '') as any)

            // Medications: split each entry by ' | ' and allow dynamic row count
            const medsArr: string[] = Array.isArray(sdoc.medications) ? sdoc.medications : String(sdoc.medications||'').split('\n').filter(Boolean)
            const parsed = medsArr.map(raw => {
              const parts = String(raw||'').split('|').map(x=>x.trim())
              return {
                name: parts[0]||'',
                dose: parts[1]||'',
                route: parts[2]||'',
                freq: parts[3]||'',
                timing: parts[4]||'',
                duration: parts[5]||'',
              }
            })
            if (parsed.length > 0) {
              setMeds(parsed)
            }

            // Notes: Investigations, response, doctor, DOR
            const notes = String(sdoc.notes||'')
            const nlines = notes.split(/\n+/).map(t=>t.trim()).filter(Boolean)
            const investigationsLine = (nlines.find(l=> l.toLowerCase().startsWith('investigations'))||'')
            const kvs = investigationsLine.replace(/^investigations:?\s*/i,'').split(',').map(s=>s.trim()).filter(Boolean)
            const invPatch:any = { ...invest }
            kvs.forEach(kv => {
              const [k,...rest] = kv.split(':')
              const key = String(k||'').toUpperCase().replace(/\s+/g,'')
              const val = rest.join(':').trim()
              if (key in invPatch) invPatch[key] = val
            })
            setInvest(invPatch)
            // Response of Treatment
            const rot = (nlines.find(l=> l.toLowerCase().startsWith('response of treatment'))||'').split(':').slice(1).join(':').trim().toLowerCase()
            if (['excellent','good','average','poor'].includes(rot)) setRespOfTreatment(rot as any)
            // Doctor and sign
            const docNm = (nlines.find(l=> l.toLowerCase().startsWith('doctor:'))||'').split(':').slice(1).join(':').trim()
            if (docNm) setDoctorName(docNm)
            const docSign = (nlines.find(l=> l.toLowerCase().startsWith('doctor sign'))||'').split(':').slice(1).join(':').trim()
            if (docSign) setDoctorSignText(docSign)
            // DOR
            const dorLine = (nlines.find(l=> l.toLowerCase().startsWith('dor:'))||'').split(':').slice(1).join(':').trim()
            if (dorLine) setDor(dorLine)
          }
        } catch {}
      }
    } catch {}
  })() }, [id, props.encounterId]);

  const apiBase = useMemo(() => {
    const isFile = typeof window !== 'undefined' && window.location?.protocol === 'file:';
    const isElectronUA = typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent || '');
    const envBase = (import.meta as any).env?.VITE_API_URL;
    return envBase || ((isFile || isElectronUA) ? 'http://127.0.0.1:4000/api' : 'http://localhost:4000/api');
  }, []);

  const previewHtml = async (url: string) => {
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

  const save = async (doPrint?: boolean) => {
    if (!encounterId) return;
    setBusy(true)
    const medsList = meds
      .map(m => [m.name, m.dose, m.route, m.freq, m.timing, m.duration].filter(Boolean).join(' | '))
      .filter(Boolean)
    const proceduresList = String(proceduresOutcome||'').split('\n').map(s=>s.trim()).filter(Boolean)
    const course = [
      presentingComplaints && `Presenting Complaints: ${presentingComplaints}`,
      reasonOfAdmission && `Reason of Admission: ${reasonOfAdmission}`,
      treatmentInHospital && `Treatment: ${treatmentInHospital}`,
      advisedByDoctor ? 'Discharge advised by Doctor: Yes' : '',
      lama ? 'LAMA' : '',
      ddrConsent ? 'DDR Consent: Yes' : '',
    ].filter(Boolean).join('\n')
    const notesBlob = [
      `Investigations: ${Object.entries(invest).map(([k,v])=> v? `${k}: ${v}`: '').filter(Boolean).join(', ')}`,
      respOfTreatment ? `Response of Treatment: ${respOfTreatment}` : '',
      doctorName ? `Doctor: ${doctorName}` : '',
      doctorSignText ? `Doctor Sign: ${doctorSignText}` : '',
      dor ? `DOR: ${dor}` : '',
    ].filter(Boolean).join('\n')
    const payload = {
      diagnosis: finalDiagnosis || undefined,
      courseInHospital: course || undefined,
      procedures: proceduresList,
      conditionAtDischarge: condAtDischarge || undefined,
      medications: medsList,
      advice: followUpInstructions || undefined,
      followUpDate: signDate ? new Date(signDate).toISOString() : undefined,
      notes: notesBlob || undefined,
    }
    try {
      await hospitalApi.upsertIpdDischargeSummary(encounterId, payload as any)
      setToast({ type: 'success', message: 'Discharge summary saved successfully' })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Save failed' })
      throw e
    } finally { setBusy(false) }
    if (doPrint) await previewHtml(apiBase + '/hospital/ipd/admissions/' + encodeURIComponent(encounterId) + '/discharge-summary/print')
  };

  const downloadHtml = () => {
    try {
      const esc = (s?: string) => String(s ?? '').replace(/[&<>"']/g, (c: string) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' } as any)[c])
      const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Discharge Summary</title></head><body>
        <h2>${esc(brand?.hospitalName || '')}</h2>
        <h3>Discharge Summary</h3>
        <p><b>Patient:</b> ${esc(patient?.name)} &nbsp; <b>MRN:</b> ${esc(patient?.mrn)}</p>
        <pre style="white-space:pre-wrap;font-family:ui-sans-serif,system-ui">${esc([
          presentingComplaints && `Presenting Complaints: ${presentingComplaints}`,
          reasonOfAdmission && `Reason of Admission: ${reasonOfAdmission}`,
          finalDiagnosis && `Final Diagnosis: ${finalDiagnosis}`,
          proceduresOutcome && `Procedures & Outcome: ${proceduresOutcome}`,
          treatmentInHospital && `Treatment in Hospital: ${treatmentInHospital}`,
          followUpInstructions && `Follow-up Instructions: ${followUpInstructions}`,
          doctorName && `Doctor: ${doctorName}`,
        ].filter(Boolean).join('\n\n'))}</pre>
      </body></html>`
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `discharge-summary-${String(encounterId || patient?.mrn || 'patient')}.html`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setToast({ type: 'success', message: 'Discharge summary downloaded' })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Download failed' })
    }
  }

  useEffect(() => {
    const onAction = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as any
      if (!detail || detail.key !== 'DischargeSummary') return
      if (detail.action === 'save') { void save(false) }
      if (detail.action === 'print') { void save(true) }
      if (detail.action === 'download') { downloadHtml() }
    }
    window.addEventListener('dw:form-action', onAction as any)
    return () => window.removeEventListener('dw:form-action', onAction as any)
  }, [encounterId, patient, brand, presentingComplaints, reasonOfAdmission, finalDiagnosis, proceduresOutcome, treatmentInHospital, followUpInstructions, doctorName, signDate, doctorSignText, dor, lama, ddrConsent, advisedByDoctor, meds, invest, respOfTreatment])

  function printView(){
    const w = window.open('', '_blank'); if (!w) return
    const style = `
      <style>@page{size:A4;margin:12mm}
      body{font-family:system-ui,Segoe UI,Arial,sans-serif;color:#111}
      .page{border:2px solid #222;padding:16px}
      .grid{display:grid;gap:8px;align-items:end}
      .line{border-bottom:1px solid #222;min-height:20px}
      .title{font-weight:900;text-align:center;margin:6px 0;font-size:18px}
      .t{border:1px solid #222}
      .row2{display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:end}
      .lbl{font-weight:700}
      .header{text-align:center;margin-bottom:12px}
      .header-logo{height:60px;object-fit:contain}
      .header-name{font-size:18px;font-weight:800}
      .header-address{font-size:12px;color:#333}
      </style>
    `
    const esc = (s?:string) => String(s??'').replace(/[&<>"']/g, (c: string) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'} as any)[c])
    const logo = brand?.hospitalLogo ? `<img src="${esc(brand.hospitalLogo)}" class="header-logo" />` : ''
    const hdr = `
      <div class="header">
        <div style="display:grid; grid-template-columns:auto 1fr auto; align-items:center;">
          <div style="justify-self:start;">${logo}</div>
          <div>
            <div class="header-name">${esc(brand?.hospitalName||'')}</div>
            <div class="header-address">${esc(brand?.hospitalAddress||'')}</div>
            <div class="header-address">${[brand?.hospitalPhone, brand?.hospitalEmail].filter(Boolean).map(esc).join(' | ')}</div>
          </div>
          <div></div>
        </div>
      </div>`
    const lv = (l:string, v?:string) => `<div class="row2"><div class="lbl">${l}</div><div class="line">${esc(v)}</div></div>`
    const medsHtml = meds.filter(m => m.name).map((m,i) => `<tr><td>${i+1}</td><td>${esc(m.name)}</td><td>${esc(m.dose)}</td><td>${esc(m.route)}</td><td>${esc(m.freq)}</td><td>${esc(m.timing)}</td><td>${esc(m.duration)}</td></tr>`).join('')
    const investEntries = Object.entries(invest).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(', ')
    const html = `<!doctype html><html><head><meta charset="utf-8"/>${style}</head><body>
      <div class="page">
        ${hdr}
        <div class="title">DISCHARGE SUMMARY</div>
        <div class="grid" style="grid-template-columns:auto 1fr auto 160px;margin-top:8px">
          <div class="lbl">Patient:</div><div class="line">${esc(patient?.name)}</div>
          <div class="lbl">MRN:</div><div class="line">${esc(patient?.mrn)}</div>
        </div>
        <div class="grid" style="grid-template-columns:auto 1fr auto 160px;margin-top:4px">
          <div class="lbl">Phone:</div><div class="line">${esc(patient?.phone)}</div>
          <div class="lbl">Bed:</div><div class="line">${esc(patient?.bed)}</div>
        </div>
        <div class="grid" style="grid-template-columns:auto 1fr;margin-top:4px">
          <div class="lbl">Address:</div><div class="line">${esc(patient?.address)}</div>
        </div>
        <div class="grid" style="grid-template-columns:auto 1fr auto 160px;margin-top:4px">
          <div class="lbl">Doctor:</div><div class="line">${esc(patient?.doctor || doctorName)}</div>
          <div class="lbl">Date of Release:</div><div class="line">${esc(dor)}</div>
        </div>
        ${presentingComplaints ? lv('Presenting Complaints:', presentingComplaints) : ''}
        ${reasonOfAdmission ? lv('Reason of Admission:', reasonOfAdmission) : ''}
        ${finalDiagnosis ? lv('Final Diagnosis:', finalDiagnosis) : ''}
        ${proceduresOutcome ? lv('Procedures & Outcome:', proceduresOutcome) : ''}
        ${treatmentInHospital ? lv('Treatment in Hospital:', treatmentInHospital) : ''}
        ${investEntries ? lv('Investigations:', investEntries) : ''}
        ${medsHtml ? `<div style="margin-top:8px"><div class="lbl">Medicines on Discharge:</div>
        <table class="t" style="width:100%;border-collapse:collapse;margin-top:4px">
          <tr style="background:#f0f0f0"><th class="t">Sr</th><th class="t">Medicine</th><th class="t">Dose</th><th class="t">Route</th><th class="t">Freq</th><th class="t">Timing</th><th class="t">Duration</th></tr>
          ${medsHtml}
        </table></div>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">
          <div class="t" style="padding:6px"><div style="font-weight:700;margin-bottom:6px">Condition at Discharge:</div><div>${['satisfactory','fair','poor'].map(x=>`${condAtDischarge===x?'☑':'☐'} ${x}`).join('  ')}</div></div>
          <div class="t" style="padding:6px"><div style="font-weight:700;margin-bottom:6px">Response of Treatment:</div><div>${['excellent','good','average','poor'].map(x=>`${respOfTreatment===x?'☑':'☐'} ${x}`).join('  ')}</div></div>
        </div>
        ${followUpInstructions ? lv('Follow-up Instructions:', followUpInstructions) : ''}
        ${lama ? '<div style="margin-top:8px;font-weight:700">LAMA (Left Against Medical Advice)</div>' : ''}
        ${ddrConsent ? '<div style="margin-top:4px;font-weight:700">DDR Consent Obtained</div>' : ''}
        ${advisedByDoctor ? '<div style="margin-top:4px;font-weight:700">Discharge Advised by Doctor</div>' : ''}
        <div style="display:grid;grid-template-columns:1fr 320px;column-gap:10px;margin-top:16px">
          <div>
            <div class="row2"><div class="lbl">Doctor Name:</div><div class="line">${esc(doctorName || patient?.doctor)}</div></div>
            <div style="margin-top:4px"><div class="lbl">Doctor Sign:</div><div class="line" style="width:200px;display:inline-block">${esc(doctorSignText)}</div></div>
          </div>
          <div style="text-align:right">
            <div class="lbl">Sign Date: ${esc(signDate)}</div>
          </div>
        </div>
      </div>
      <script>window.print && setTimeout(()=>window.print(),200)</script>
    </body></html>`
    w.document.write(html); w.document.close(); w.focus()
  }

  return (
    <div className={`mx-auto max-w-5xl space-y-8 ${embedded ? 'pb-6' : 'pb-20'}`}>
      <Toast toast={toast} onClose={()=>setToast(null)} />
      
      {/* Patient Header Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/40 transition-all hover:shadow-2xl hover:shadow-slate-200/50">
        <div className="bg-navy p-8 text-white">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight uppercase">{patient?.name || 'New Patient'}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm font-bold text-white/70">
                  <span className="flex items-center gap-1.5"><FileText className="h-4 w-4" /> MRN: {patient?.mrn || 'N/A'}</span>
                  <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> {patient?.phone || 'N/A'}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-black backdrop-blur-md">
                BED: {patient?.bed || 'Unassigned'}
              </div>
              <div className="rounded-2xl bg-emerald-500/20 px-4 py-2 text-sm font-black text-emerald-100 backdrop-blur-md">
                DR: {patient?.doctor || 'No Doctor'}
              </div>
            </div>
          </div>
        </div>
        {patient?.address && (
          <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/50 px-8 py-3 text-xs font-bold text-slate-500">
            <MapPin className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wide">{patient.address}</span>
          </div>
        )}
      </div>

      {/* Main Discharge Form */}
      <div className="space-y-6">
        {/* Core Discharge Info */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-navy" />
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Date of Release</h3>
            </div>
            <ClinicalDatePicker type="date" label="Date of Release" value={dor} onChange={setDor} />
            <div className="mt-4 grid gap-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition-all hover:bg-slate-100">
                <input type="checkbox" checked={lama} onChange={e=>setLama(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-navy focus:ring-navy" />
                <span className="text-sm font-bold text-slate-700">LAMA</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition-all hover:bg-slate-100">
                <input type="checkbox" checked={ddrConsent} onChange={e=>setDdrConsent(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-navy focus:ring-navy" />
                <span className="text-sm font-bold text-slate-700">DDR Consent</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition-all hover:bg-slate-100">
                <input type="checkbox" checked={advisedByDoctor} onChange={e=>setAdvisedByDoctor(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-navy focus:ring-navy" />
                <span className="text-sm font-bold text-slate-700">Advised by Doctor</span>
              </label>
            </div>
          </div>

          <div className="lg:col-span-2 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-navy" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Presenting Complaints</h3>
              </div>
              <textarea value={presentingComplaints} onChange={e=>setPresentingComplaints(e.target.value)} placeholder="Enter patient complaints..." className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:border-navy focus:bg-white focus:outline-none transition-all h-32 resize-none" />
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Info className="h-5 w-5 text-navy" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Reason of Admission</h3>
              </div>
              <textarea value={reasonOfAdmission} onChange={e=>setReasonOfAdmission(e.target.value)} placeholder="History / Examination details..." className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:border-navy focus:bg-white focus:outline-none transition-all h-32 resize-none" />
            </div>
          </div>
        </div>

        {/* Clinical Details */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-navy" />
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Final Diagnosis</h3>
            </div>
            <textarea value={finalDiagnosis} onChange={e=>setFinalDiagnosis(e.target.value)} className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:border-navy focus:bg-white focus:outline-none transition-all h-24 resize-none" />
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-navy" />
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Procedures & Outcome</h3>
            </div>
            <textarea value={proceduresOutcome} onChange={e=>setProceduresOutcome(e.target.value)} className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:border-navy focus:bg-white focus:outline-none transition-all h-24 resize-none" />
          </div>
          <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-navy" />
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Treatment in Hospital</h3>
            </div>
            <textarea value={treatmentInHospital} onChange={e=>setTreatmentInHospital(e.target.value)} className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:border-navy focus:bg-white focus:outline-none transition-all h-24 resize-none" />
          </div>
        </div>

        {/* Investigations */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-2">
            <div className="h-8 w-1.5 rounded-full bg-navy" />
            <h2 className="text-lg font-black uppercase tracking-wider text-slate-800">Significant Investigations</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {(['HB','UREA','HCV','NA','PLATELETS','CREATININE','HBSAG','K','TLC','ALT','HIV','CA'] as const).map(k=> (
              <div key={k} className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{k}</label>
                <input value={invest[k]} onChange={e=>setInvest((s:any)=>({ ...s, [k]: e.target.value }))} className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-navy focus:bg-white focus:outline-none transition-all" />
              </div>
            ))}
          </div>
        </div>

        {/* Medications Table */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between bg-slate-50/50 px-8 py-6 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-navy" />
              <h2 className="text-lg font-black uppercase tracking-wider text-slate-800">Discharge Medications</h2>
            </div>
            <button onClick={()=> setMeds(arr=> [...arr, { name:'', dose:'', route:'', freq:'', timing:'', duration:'' }])} className="flex items-center gap-2 rounded-xl bg-navy/5 px-4 py-2 text-sm font-bold text-navy hover:bg-navy hover:text-white transition-all">
              <Plus className="h-4 w-4" /> Add Medication
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-4 w-16">#</th>
                  <th className="px-4 py-4 min-w-[200px]">Medicine Name</th>
                  <th className="px-4 py-4 w-32">Dose</th>
                  <th className="px-4 py-4 w-32">Route</th>
                  <th className="px-4 py-4 w-32">Frequency</th>
                  <th className="px-4 py-4 w-32">Timing</th>
                  <th className="px-4 py-4 w-32">Duration</th>
                  <th className="px-6 py-4 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {meds.map((m, i)=> (
                  <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 text-sm font-bold text-slate-400">{i+1}</td>
                    <td className="px-4 py-3"><input value={m.name} onChange={e=>setMeds(arr=> arr.map((x,idx)=> idx===i?{...x, name:e.target.value}:x))} placeholder="Medicine" className="w-full rounded-lg border-2 border-transparent bg-transparent px-3 py-2 text-sm font-bold text-slate-900 focus:border-navy/20 focus:bg-white focus:outline-none" /></td>
                    <td className="px-4 py-3"><input value={m.dose} onChange={e=>setMeds(arr=> arr.map((x,idx)=> idx===i?{...x, dose:e.target.value}:x))} placeholder="Dose" className="w-full rounded-lg border-2 border-transparent bg-transparent px-3 py-2 text-sm font-medium text-slate-700 focus:border-navy/20 focus:bg-white focus:outline-none" /></td>
                    <td className="px-4 py-3"><input value={m.route} onChange={e=>setMeds(arr=> arr.map((x,idx)=> idx===i?{...x, route:e.target.value}:x))} placeholder="Route" className="w-full rounded-lg border-2 border-transparent bg-transparent px-3 py-2 text-sm font-medium text-slate-700 focus:border-navy/20 focus:bg-white focus:outline-none" /></td>
                    <td className="px-4 py-3"><input value={m.freq} onChange={e=>setMeds(arr=> arr.map((x,idx)=> idx===i?{...x, freq:e.target.value}:x))} placeholder="Freq" className="w-full rounded-lg border-2 border-transparent bg-transparent px-3 py-2 text-sm font-medium text-slate-700 focus:border-navy/20 focus:bg-white focus:outline-none" /></td>
                    <td className="px-4 py-3"><input value={m.timing} onChange={e=>setMeds(arr=> arr.map((x,idx)=> idx===i?{...x, timing:e.target.value}:x))} placeholder="Timing" className="w-full rounded-lg border-2 border-transparent bg-transparent px-3 py-2 text-sm font-medium text-slate-700 focus:border-navy/20 focus:bg-white focus:outline-none" /></td>
                    <td className="px-4 py-3"><input value={m.duration} onChange={e=>setMeds(arr=> arr.map((x,idx)=> idx===i?{...x, duration:e.target.value}:x))} placeholder="Days" className="w-full rounded-lg border-2 border-transparent bg-transparent px-3 py-2 text-sm font-medium text-slate-700 focus:border-navy/20 focus:bg-white focus:outline-none" /></td>
                    <td className="px-6 py-3">
                      <button onClick={()=> setMeds(arr=> arr.filter((_, idx)=> idx !== i))} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Condition & Outcomes */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-navy" />
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Condition at Discharge</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {(['satisfactory','fair','poor'] as const).map(v=> (
                <button
                  key={v}
                  onClick={()=>setCondAtDischarge(v)}
                  className={`flex-1 rounded-2xl border-2 px-4 py-4 text-xs font-black uppercase tracking-widest transition-all ${
                    condAtDischarge === v
                      ? 'border-navy bg-navy text-white shadow-lg shadow-navy/20'
                      : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-navy" />
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Response of Treatment</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {(['excellent','good','average','poor'] as const).map(v=> (
                <button
                  key={v}
                  onClick={()=>setRespOfTreatment(v)}
                  className={`flex-1 rounded-2xl border-2 px-4 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                    respOfTreatment === v
                      ? 'border-navy bg-navy text-white shadow-lg shadow-navy/20'
                      : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Instructions & Signatures */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-navy" />
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Follow-up Instructions</h3>
            </div>
            <textarea value={followUpInstructions} onChange={e=>setFollowUpInstructions(e.target.value)} placeholder="Dietary advice, next visit date, emergency signs..." className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-900 focus:border-navy focus:bg-white focus:outline-none transition-all h-32 resize-none" />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Doctor Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={doctorName} onChange={e=>setDoctorName(e.target.value)} className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 pl-11 pr-4 py-3 text-sm font-bold text-slate-900 focus:border-navy focus:bg-white focus:outline-none transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <ClinicalDatePicker type="date" label="Sign Date" value={signDate} onChange={setSignDate} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Doctor Signature (Text)</label>
                <input value={doctorSignText} onChange={e=>setDoctorSignText(e.target.value)} placeholder="Type name for signature..." className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus:border-navy focus:bg-white focus:outline-none transition-all italic" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      {!embedded ? (
        <div className="fixed bottom-6 left-1/2 z-20 w-full max-w-sm -translate-x-1/2 px-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl">
            <button
              onClick={printView}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              onClick={() => save(false)}
              disabled={busy}
              className="flex flex-2 items-center justify-center gap-2 rounded-xl bg-navy py-3 text-sm font-black text-white shadow-xl shadow-navy/20 transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Save className="h-4 w-4" />}
              Save Summary
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
