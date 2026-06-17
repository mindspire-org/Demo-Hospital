import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { hospitalApi } from '../../utils/api';
import Toast, { type ToastState } from '../ui/Toast'
import PrescriptionMedication from '../doctor/PrescriptionMedication'
import type { MedicineRow } from '../doctor/PrescriptionMedication'

type Props = { encounterId?: string; patient?: any; encounterType?: 'IPD'|'EMERGENCY' };

export default function Discharged(props: Props){
  const { id } = useParams();
  const [encounterId, setEncounterId] = useState<string>(props.encounterId || '');
  const [patient, setPatient] = useState<any>(props.patient || {});
  // Extended UI fields (mapped into backend payload)
  const [dor, setDor] = useState<string>('')
  const [lama, setLama] = useState<boolean>(false)
  const [ddrConsent, setDdrConsent] = useState<boolean>(false)
  const [dorCheck, setDorCheck] = useState<boolean>(false)
  const [dorNote, setDorNote] = useState<string>('')
  const [advisedByDoctor, setAdvisedByDoctor] = useState<boolean>(false)
  const [presentingComplaints, setPresentingComplaints] = useState<string>('')
  const [reasonOfAdmission, setReasonOfAdmission] = useState<string>('')
  const [finalDiagnosis, setFinalDiagnosis] = useState<string>('')
  const [proceduresOutcome, setProceduresOutcome] = useState<string>('')
  const [treatmentInHospital, setTreatmentInHospital] = useState<string>('')
  const [invest, setInvest] = useState<any>({ HB:'', UREA:'', HCV:'', NA:'', PLATELETS:'', CREATININE:'', HBSAG:'', K:'', TLC:'', ALT:'', HIV:'', CA:'' })
  const [rxMeds, setRxMeds] = useState<MedicineRow[]>([{ name: '' }])
  const [condAtDischarge, setCondAtDischarge] = useState<'satisfactory'|'fair'|'poor'|''>('')
  const [respOfTreatment, setRespOfTreatment] = useState<'excellent'|'good'|'average'|'poor'|''>('')
  const [followUpInstructions, setFollowUpInstructions] = useState<string>('')
  const [doctorName, setDoctorName] = useState<string>('')
  const [signDate, setSignDate] = useState<string>('')
  const [doctorSignText, setDoctorSignText] = useState<string>('')
  const [toast, setToast] = useState<ToastState>(null)
  const medsRef = useRef<any>(null)

  useEffect(() => { (async () => {
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
            setDorCheck(!!lines.find(l=> /^DOR$/i.test(l)))

            // Procedures
            setProceduresOutcome(Array.isArray(sdoc.procedures)? sdoc.procedures.join('\n') : (sdoc.procedures || ''))

            // Condition at discharge
            setCondAtDischarge((sdoc.conditionAtDischarge || '') as any)

            // Medications: parse pipe-separated strings into MedicineRow objects
            const medsArr: string[] = Array.isArray(sdoc.medications) ? sdoc.medications : String(sdoc.medications||'').split('\n').filter(Boolean)
            const parsed: MedicineRow[] = medsArr.map(raw => {
              const parts = String(raw||'').split('|').map((x: string) => x.trim())
              return {
                name: parts[0]||'',
                qty: parts[1]||'',
                route: parts[2]||'',
                freqText: parts[3]||'',
                instruction: parts[4]||'',
                durationText: parts[5]||'',
              }
            })
            if (parsed.length > 0) {
              setRxMeds(parsed)
              medsRef.current?.setData?.(parsed)
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
            const dorNoteLine = (nlines.find(l=> l.toLowerCase().startsWith('dor note:'))||'').split(':').slice(1).join(':').trim()
            if (dorNoteLine) setDorNote(dorNoteLine)
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
    try {
      const w = window.open('', '_blank'); if (!w) return;
      const token = ((): string => { try { return localStorage.getItem('hospital.token') || localStorage.getItem('token') || '' } catch { return '' } })()
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } as any : undefined })
      const html = await res.text()
      w.document.write(String(html)); w.document.close(); w.focus()
    } catch {}
  }

  const handlePrint = async () => {
    if (!encounterId) return;
    await previewHtml(apiBase + '/hospital/ipd/admissions/' + encodeURIComponent(encounterId) + '/discharge-summary/print')
  }

  const save = async (doPrint?: boolean) => {
    if (!encounterId) return;
    const currentMeds: MedicineRow[] = medsRef.current?.getData?.() || rxMeds
    const medsList = currentMeds
      .filter(m => (m.name||'').trim())
      .map(m => [m.name, m.qty, m.route, m.freqText, m.instruction, m.durationText].filter(Boolean).join(' | '))
    const proceduresList = String(proceduresOutcome||'').split('\n').map(s=>s.trim()).filter(Boolean)
    const course = [
      presentingComplaints && `Presenting Complaints: ${presentingComplaints}`,
      reasonOfAdmission && `Reason of Admission: ${reasonOfAdmission}`,
      treatmentInHospital && `Treatment: ${treatmentInHospital}`,
      advisedByDoctor ? 'Discharge advised by Doctor: Yes' : '',
      lama ? 'LAMA' : '',
      ddrConsent ? 'DDR Consent: Yes' : '',
      dorCheck ? 'DOR' : '',
    ].filter(Boolean).join('\n')
    const notesBlob = [
      `Investigations: ${Object.entries(invest).map(([k,v])=> v? `${k}: ${v}`: '').filter(Boolean).join(', ')}`,
      respOfTreatment ? `Response of Treatment: ${respOfTreatment}` : '',
      doctorName ? `Doctor: ${doctorName}` : '',
      doctorSignText ? `Doctor Sign: ${doctorSignText}` : '',
      dor ? `DOR: ${dor}` : '',
      dorNote ? `DOR Note: ${dorNote}` : '',
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
      setToast({ type: 'success', message: 'Saved' })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Save failed' })
      throw e
    }
    if (doPrint) await previewHtml(apiBase + '/hospital/ipd/admissions/' + encodeURIComponent(encounterId) + '/discharge-summary/print')
  };

  const field = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition'

  return (
    <div className="space-y-4 overflow-x-hidden">
      <Toast toast={toast} onClose={()=>setToast(null)} />

      {/* ── Patient Banner ───────────────────────────────────────── */}
      <div className="rounded-2xl bg-linear-to-r from-sky-600 to-indigo-600 px-5 py-4 text-white shadow-md">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-75 mb-2">Discharge Summary</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-sm">
          {[
            { label: 'Patient', value: patient?.name, mono: false },
            { label: 'MRN', value: patient?.mrn, mono: true },
            { label: 'Phone', value: patient?.phone, mono: false },
            { label: 'Bed', value: patient?.bed, mono: false },
            { label: 'Doctor', value: patient?.doctor, mono: false },
            { label: 'Address', value: patient?.address, mono: false },
          ].map(item => (
            <div key={item.label} className="min-w-0">
              <div className="text-xs opacity-70 uppercase tracking-wide">{item.label}</div>
              <div className={`font-semibold truncate ${item.mono ? 'font-mono' : 'capitalize'}`}>{item.value || '-'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section helper ───────────────────────────────────────── */}
      {/* Section 1: Discharge Info */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-sky-500"></span>
          <span className="text-sm font-semibold text-slate-700">Discharge Information</span>
        </div>
        <div className="p-4 space-y-3 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block mb-1 font-medium text-slate-600">Date of Release (DOR)</label>
              <input type="date" value={dor} onChange={e=>setDor(e.target.value)} className={field} />
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1 font-medium text-slate-600">DOR Note</label>
              <input value={dorNote} onChange={e=>setDorNote(e.target.value)} className={field} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 pt-1">
            {[
              { label: 'LAMA', val: lama, set: setLama },
              { label: 'DDR Consent', val: ddrConsent, set: setDdrConsent },
              { label: 'DOR', val: dorCheck, set: setDorCheck },
              { label: 'Discharged advised by Doctor', val: advisedByDoctor, set: setAdvisedByDoctor },
            ].map(({ label, val, set }) => (
              <label key={label} className={`flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-1.5 transition-colors select-none text-sm ${val ? 'border-sky-300 bg-sky-50 text-sky-700 font-medium' : 'border-slate-200 bg-white text-slate-600'}`}>
                <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} className="h-4 w-4 accent-sky-600" />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Section 2: Clinical Details */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
          <span className="text-sm font-semibold text-slate-700">Clinical Details</span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <label className="block mb-1 font-medium text-slate-600">Presenting Complaints</label>
            <textarea value={presentingComplaints} onChange={e=>setPresentingComplaints(e.target.value)} className={field + ' h-20 resize-none'} />
          </div>
          <div>
            <label className="block mb-1 font-medium text-slate-600">Reason of Admission / Brief History</label>
            <textarea value={reasonOfAdmission} onChange={e=>setReasonOfAdmission(e.target.value)} className={field + ' h-20 resize-none'} />
          </div>
          <div>
            <label className="block mb-1 font-medium text-slate-600">Final Diagnosis</label>
            <textarea value={finalDiagnosis} onChange={e=>setFinalDiagnosis(e.target.value)} className={field + ' h-20 resize-none'} />
          </div>
          <div>
            <label className="block mb-1 font-medium text-slate-600">Procedures During Stay &amp; Outcome</label>
            <textarea value={proceduresOutcome} onChange={e=>setProceduresOutcome(e.target.value)} className={field + ' h-20 resize-none'} />
          </div>
          <div className="md:col-span-2">
            <label className="block mb-1 font-medium text-slate-600">Treatment in Hospital</label>
            <textarea value={treatmentInHospital} onChange={e=>setTreatmentInHospital(e.target.value)} className={field + ' h-20 resize-none'} />
          </div>
        </div>
      </div>

      {/* Section 3: Investigations */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-violet-500"></span>
          <span className="text-sm font-semibold text-slate-700">Investigations — Significant Results</span>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-sm">
          {(['HB','UREA','HCV','NA','PLATELETS','CREATININE','HBSAG','K','TLC','ALT','HIV','CA'] as const).map(k => (
            <div key={k}>
              <label className="block mb-1 text-xs font-semibold text-slate-500 uppercase">{k}</label>
              <input value={invest[k]} onChange={e=>setInvest((s:any)=>({ ...s, [k]: e.target.value }))} className={field} />
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Medications — PrescriptionMedication component */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          <span className="text-sm font-semibold text-slate-700">Medicines Given on Discharge</span>
        </div>
        <div className="p-4">
          <PrescriptionMedication ref={medsRef} initialMedicines={rxMeds} onChange={setRxMeds} />
        </div>
      </div>

      {/* Section 5: Outcome */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-amber-500"></span>
          <span className="text-sm font-semibold text-slate-700">Outcome &amp; Follow-up</span>
        </div>
        <div className="p-4 space-y-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="mb-2 font-medium text-slate-600">Condition at Discharge</p>
              <div className="flex flex-wrap gap-3">
                {(['satisfactory','fair','poor'] as const).map(v => (
                  <label key={v} className={`flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-1.5 transition-colors select-none capitalize ${condAtDischarge===v ? 'border-sky-300 bg-sky-50 text-sky-700 font-semibold' : 'border-slate-200 bg-white text-slate-600'}`}>
                    <input type="radio" name="cad" checked={condAtDischarge===v} onChange={()=>setCondAtDischarge(v)} className="accent-sky-600" />
                    {v}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 font-medium text-slate-600">Response of Treatment</p>
              <div className="flex flex-wrap gap-3">
                {(['excellent','good','average','poor'] as const).map(v => (
                  <label key={v} className={`flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-1.5 transition-colors select-none capitalize ${respOfTreatment===v ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold' : 'border-slate-200 bg-white text-slate-600'}`}>
                    <input type="radio" name="rot" checked={respOfTreatment===v} onChange={()=>setRespOfTreatment(v)} className="accent-emerald-600" />
                    {v}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block mb-1 font-medium text-slate-600">Follow-up Instructions</label>
            <textarea value={followUpInstructions} onChange={e=>setFollowUpInstructions(e.target.value)} className={field + ' h-20 resize-none'} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block mb-1 font-medium text-slate-600">Doctor Name</label>
              <input value={doctorName} onChange={e=>setDoctorName(e.target.value)} className={field} />
            </div>
            <div>
              <label className="block mb-1 font-medium text-slate-600">Sign Date</label>
              <input type="date" value={signDate} onChange={e=>setSignDate(e.target.value)} className={field} />
            </div>
            <div>
              <label className="block mb-1 font-medium text-slate-600">Doctor Sign (text)</label>
              <input value={doctorSignText} onChange={e=>setDoctorSignText(e.target.value)} className={field} />
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2 justify-end pb-4">
        <button onClick={handlePrint} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">Print</button>
        <button onClick={()=>save(false)} className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700 transition shadow-sm">Save</button>
      </div>
    </div>
  );
}
