import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { hospitalApi, labApi, diagnosticApi, aestheticApi, api as coreApi } from '../../utils/api'
import { getSavedPrescriptionPdfTemplate, previewPrescriptionPdf } from '../../utils/prescriptionPdf'
import { printUltrasoundReport } from '../../components/diagnostic/diagnostic_UltrasoundGeneric'
import { printCTScanReport } from '../../components/diagnostic/diagnostic_CTScan'
import { printEchocardiographyReport } from '../../components/diagnostic/diagnostic_Echocardiography'
import { printColonoscopyReport } from '../../components/diagnostic/diagnostic_Colonoscopy'
import { printUpperGIEndoscopyReport } from '../../components/diagnostic/diagnostic_UpperGIEndoscopy'
import { previewLabReportPdf } from '../../utils/printLabReport'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { 
  User, Phone, IdCard, MapPin, Calendar, Edit2, Save, X, 
  FileText, FlaskConical, ScanLine, Sparkles, BedDouble, ChevronDown, ChevronUp
} from 'lucide-react'

interface PatientDetails {
  _id?: string
  mrn: string
  fullName: string
  fatherName?: string
  phoneNormalized?: string
  cnicNormalized?: string
  gender?: string
  age?: string
  guardianRel?: string
  address?: string
  createdAtIso?: string
}

interface MedicalDetails {
  pres?: any[]
  lab?: any[]
  diag?: any[]
  ipd?: any[]
  aesthetic?: any[]
  er?: any[]
  loading?: boolean
}

type MedicalTab = 'prescriptions' | 'lab' | 'diagnostic' | 'aesthetic' | 'ipd'

export default function Hospital_SearchPatients() {
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    mrNo: '',
    name: '',
    fatherName: '',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [details, setDetails] = useState<Record<string, MedicalDetails>>({})
  const [busy, setBusy] = useState<{ pres?: string; lab?: string; diag?: string }>({})
  const [toast, setToast] = useState<ToastState>(null)
  
  // Patient edit state
  const [editingPatient, setEditingPatient] = useState<Record<string, boolean>>({})
  const [editForm, setEditForm] = useState<Record<string, Partial<PatientDetails>>>({})
  const [savingPatient, setSavingPatient] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState<Record<string, MedicalTab>>({})

  const update = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setPatients([])
    setExpanded({})
    setDetails({})
    try {
      // Patient master data for editing lives in LabPatient collection.
      // Use Lab APIs so updates are visible after refresh.
      const mrn = String(form.mrNo || '').trim()
      if (mrn) {
        const r: any = await labApi.getPatientByMrn(mrn)
        const p = r?.patient
        setPatients(p ? [p] : [])
      } else {
        const r: any = await labApi.searchPatients({
          phone: form.phone || undefined,
          name: form.name || undefined,
          fatherName: form.fatherName || undefined,
          limit: 10,
        })
        const rows: any[] = Array.isArray(r?.patients) ? r.patients : []
        setPatients(rows)
      }
    } catch {
      setPatients([])
    } finally {
      setLoading(false)
    }

  }

  // If we were navigated back with a snapshot in location.state, restore from it and clear the transient state
  useEffect(()=>{
    try{
      const st: any = (location as any)?.state
      if (st?.searchSnapshot){
        const snap = st.searchSnapshot
        if (snap?.form) setForm(snap.form)
        if (Array.isArray(snap?.patients)) setPatients(snap.patients)
        if (snap?.expanded) setExpanded(snap.expanded)
        if (snap?.details) setDetails(snap.details)
        try{ sessionStorage.setItem('hospital.searchPatients.v1', JSON.stringify(snap)) } catch {}
        navigate('.', { replace: true, state: null })
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  

  // Persist and restore search state so going back from IPD Profile keeps results
  useEffect(()=>{
    try{
      const raw = sessionStorage.getItem('hospital.searchPatients.v1')
      if (!raw) return
      const saved = JSON.parse(raw)
      if (saved?.form) setForm(saved.form)
      if (Array.isArray(saved?.patients)) setPatients(saved.patients)
      if (saved?.expanded) setExpanded(saved.expanded)
      if (saved?.details) setDetails(saved.details)
    } catch {}
  }, [])
  useEffect(()=>{
    try{
      const patientsLite = Array.isArray(patients)
        ? patients.map((p:any) => ({
            _id: p?._id || p?.id,
            id: p?.id,
            fullName: p?.fullName,
            mrn: p?.mrn,
            fatherName: p?.fatherName,
            phoneNormalized: p?.phoneNormalized,
            cnicNormalized: p?.cnicNormalized,
            gender: p?.gender,
            age: p?.age,
            address: p?.address,
          }))
        : []
      const payload = { form, patients: patientsLite, expanded, details }
      sessionStorage.setItem('hospital.searchPatients.v1', JSON.stringify(payload))
    } catch {}
  }, [form, patients, expanded, details])
  
  async function onPrescriptionPdf(presId: string, mrn: string){
    try {
      setBusy(prev => ({ ...prev, pres: presId }))
      const [detail, settings, labPat] = await Promise.all([
        hospitalApi.getPrescription(presId) as any,
        hospitalApi.getSettings() as any,
        labApi.getPatientByMrn(mrn) as any,
      ])
      const pres = detail?.prescription
      const p = labPat?.patient
      const doctor = { name: pres?.encounterId?.doctorId?.name || '-' }
      const patient = { name: p?.fullName || '-', mrn: p?.mrn || mrn, gender: p?.gender || '-', fatherName: p?.fatherName || '-', phone: p?.phoneNormalized || '-', address: p?.address || '-' }
      let tpl = 'default' as any
      try {
        const raw = localStorage.getItem('doctor.session')
        const sess = raw ? JSON.parse(raw) : null
        tpl = getSavedPrescriptionPdfTemplate(sess?.id)
      } catch {}
      await previewPrescriptionPdf({
        doctor,
        settings,
        patient,
        items: pres?.items || [],
        primaryComplaint: pres?.primaryComplaint || pres?.complaints,
        primaryComplaintHistory: pres?.primaryComplaintHistory,
        familyHistory: pres?.familyHistory,
        treatmentHistory: pres?.treatmentHistory,
        history: pres?.history,
        examFindings: pres?.examFindings,
        diagnosis: pres?.diagnosis,
        advice: pres?.advice,
        labTests: pres?.labTests || [],
        labNotes: pres?.labNotes || '',
        createdAt: pres?.createdAt,
      }, tpl)
    } catch (e) {
      setToast({ type: 'error', message: 'Failed to generate prescription PDF' })
    } finally {
      setBusy(prev => ({ ...prev, pres: undefined }))
    }
  }

  function resolveDiagKey(name: string){
    const n = (name||'').toLowerCase()
    if (n.includes('ultrasound')) return 'Ultrasound'
    if (n.replace(/\s+/g,'') === 'ctscan') return 'CTScan'
    if (n.includes('echocardio')) return 'Echocardiography'
    if (n.includes('colonoscopy')) return 'Colonoscopy'
    if (n.includes('uppergi')) return 'UpperGiEndoscopy'
    return name
  }

  async function onDiagnosticPrint(orderId: string, mrn: string){
    try{
      setBusy(prev => ({ ...prev, diag: orderId }))
      const [ordersRes, resultsRes] = await Promise.all([
        diagnosticApi.listOrders({ q: mrn, limit: 500 }) as any,
        diagnosticApi.listResults({ orderId, status: 'final', limit: 1 }) as any,
      ])
      const ord: any = (ordersRes?.items || []).find((x: any) => String(x._id || x.id) === String(orderId))
      if (!ord) throw new Error('Order not found')
      const res = Array.isArray(resultsRes?.items) && resultsRes.items.length ? resultsRes.items[0] : null
      if (!res) throw new Error('No finalized report')
      const testName = String(res.testName || '')
      const key = resolveDiagKey(testName)
      const payload = { tokenNo: ord.tokenNo, createdAt: ord.createdAt, reportedAt: res.reportedAt || new Date().toISOString(), patient: ord.patient||{}, value: typeof res.formData==='string'? res.formData : JSON.stringify(res.formData||''), referringConsultant: ord.referringConsultant }
      if (key === 'Echocardiography'){ await printEchocardiographyReport(payload as any); return }
      if (key === 'Ultrasound'){ await printUltrasoundReport(payload as any); return }
      if (key === 'CTScan'){ await printCTScanReport(payload as any); return }
      if (key === 'Colonoscopy'){ await printColonoscopyReport(payload as any); return }
      if (key === 'UpperGiEndoscopy'){ await printUpperGIEndoscopyReport(payload as any); return }
      setToast({ type: 'error', message: 'Unknown diagnostic template for this test' })
    } catch(e: any){
      setToast({ type: 'error', message: e?.message || 'Failed to open diagnostic report' })
    } finally {
      setBusy(prev => ({ ...prev, diag: undefined }))
    }
  }

  async function onLabPdf(orderId: string, mrn: string){
    try {
      setBusy(prev => ({ ...prev, lab: orderId }))
      const list: any = await labApi.listOrders({ q: mrn, limit: 500 })
      const ord: any = (list?.items || []).find((x: any) => String(x._id || x.id) === String(orderId))
      if (!ord) throw new Error('Order not found')
      const res: any = await labApi.listResults({ orderId, limit: 1 })
      const rec = Array.isArray(res?.items) && res.items.length ? res.items[0] : null
      if (!rec) throw new Error('No report available')
      previewLabReportPdf({
        tokenNo: ord.tokenNo,
        createdAt: ord.createdAt,
        sampleTime: ord.sampleTime,
        reportingTime: ord.reportingTime,
        patient: { fullName: ord.patient?.fullName, phone: ord.patient?.phone, mrn: ord.patient?.mrn, age: ord.patient?.age, gender: ord.patient?.gender, address: ord.patient?.address },
        rows: rec.rows || [],
        interpretation: rec.interpretation || '',
        referringConsultant: ord.referringConsultant,
      })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to open lab report PDF' })
    } finally {
      setBusy(prev => ({ ...prev, lab: undefined }))
    }
  }
  const onClear = () => {
    setForm({ mrNo: '', name: '', fatherName: '', phone: '' })
    setPatients([])
    setExpanded({})
    setDetails({})
    try{ sessionStorage.removeItem('hospital.searchPatients.v1') } catch {}
  }

  async function loadDetails(mrn: string, patientId?: string){
    setDetails(prev => ({ ...prev, [mrn]: { ...(prev[mrn]||{}), loading: true } }))
    try {
      const [presRes, ordersRes, diagOrdersRes, ipdRes, aestRes, erRes] = await Promise.all([
        hospitalApi.listPrescriptions({ patientMrn: mrn, page: 1, limit: 50 }) as any,
        labApi.listOrders({ q: mrn, limit: 50 }) as any,
        diagnosticApi.listOrders({ q: mrn, limit: 50 }) as any,
        hospitalApi.listIPDAdmissions(patientId ? { patientId, page: 1, limit: 50 } : { q: mrn, page: 1, limit: 50 }) as any,
        aestheticApi.listProcedureSessions({ patientMrn: mrn, page: 1, limit: 100 }) as any,
        hospitalApi.listEREncounters(patientId ? { patientId, page: 1, limit: 50 } : { q: mrn, page: 1, limit: 50 }) as any,
      ])
      const pres: any[] = (presRes?.prescriptions || []).map((p: any) => ({ id: p._id || p.id, createdAt: p.createdAt, diagnosis: p.diagnosis, doctor: p.encounterId?.doctorId?.name || '-', items: p.items || [] }))
      const orders: any[] = (ordersRes?.items || [])
      const lab: any[] = []
      for (const o of orders){
        let hasResult = false
        try {
          const r = await labApi.listResults({ orderId: String(o._id || o.id), limit: 1 }) as any
          hasResult = Array.isArray(r?.items) && r.items.length > 0
        } catch {}
        lab.push({ id: String(o._id || o.id), tokenNo: o.tokenNo, createdAt: o.createdAt, status: o.status, tests: o.tests || [], hasResult })
      }
      const dorders: any[] = (diagOrdersRes?.items || [])
      const diag: any[] = []
      for (const o of dorders){
        let hasResult = false
        try {
          const r = await diagnosticApi.listResults({ orderId: String(o._id || o.id), status: 'final', limit: 1 }) as any
          hasResult = Array.isArray(r?.items) && r.items.length > 0
        } catch {}
        diag.push({ id: String(o._id || o.id), tokenNo: o.tokenNo, createdAt: o.createdAt, status: o.status, tests: o.tests || [], hasResult })
      }
      const ipd: any[] = Array.isArray(ipdRes?.admissions) ? await Promise.all((ipdRes.admissions as any[]).map(async (a: any)=> {
        const encId = String(a._id||a.id)
        try{
          const [ds, rd, dc, bc, ss] = await Promise.all([
            hospitalApi.getIpdDischargeSummary(encId).catch(()=>null) as any,
            hospitalApi.getIpdReceivedDeath(encId).catch(()=>null) as any,
            hospitalApi.getIpdDeathCertificate(encId).catch(()=>null) as any,
            hospitalApi.getIpdBirthCertificate(encId).catch(()=>null) as any,
            hospitalApi.getIpdShortStay(encId).catch(()=>null) as any,
          ])
          return {
            id: encId,
            admissionNo: a.admissionNo,
            startAt: a.startAt,
            endAt: a.endAt,
            status: a.status,
            forms: {
              dischargeSummary: !!(ds && (ds.summary || ds._id)),
              receivedDeath: !!(rd && (rd.receivedDeath || rd._id)),
              deathCertificate: !!(dc && (dc.certificate || dc._id)),
              birthCertificate: !!(bc && (bc.birthCertificate || bc._id)),
              shortStay: !!(ss && (ss.shortStay || ss._id)),
            }
          }
        } catch {
          return { id: encId, admissionNo: a.admissionNo, startAt: a.startAt, endAt: a.endAt, status: a.status, forms: {} }
        }
      })) : []

      const aestheticItemsRaw: any[] = Array.isArray(aestRes?.items) ? aestRes.items : []
      const aestheticItems = [...aestheticItemsRaw]
        .filter(x => String(x?.patientMrn || '') === String(mrn))
        .sort((a,b)=> new Date(b?.date || 0).getTime() - new Date(a?.date || 0).getTime())

      const er: any[] = Array.isArray(erRes?.encounters) ? erRes.encounters.map((e: any) => ({
        id: String(e._id || e.id),
        startAt: e.startAt,
        endAt: e.endAt,
        status: e.status,
        doctor: e.doctorId?.name || '-',
        department: e.departmentId?.name || '-',
        tokenNo: e.tokenId?.tokenNo || '-',
      })) : []

      setDetails(prev => ({ ...prev, [mrn]: { pres, lab, diag, ipd, aesthetic: aestheticItems, er, loading: false } }))
      // Default active tab
      if (!activeTab[mrn]) {
        setActiveTab(prev => ({ ...prev, [mrn]: 'prescriptions' }))
      }
    } catch {
      setDetails(prev => ({ ...prev, [mrn]: { pres: [], lab: [], diag: [], ipd: [], aesthetic: [], er: [], loading: false } }))
    }
  }

  async function startEditingPatient(patient: PatientDetails & { id?: string }) {
    // Try to get the lab patient ID if not available
    let patientWithId = { ...patient }
    
    if (!patientWithId._id && !patientWithId.id && patientWithId.mrn) {
      try {
        const labPatient: any = await labApi.getPatientByMrn(patientWithId.mrn)
        if (labPatient?.patient?._id) {
          patientWithId._id = labPatient.patient._id
          console.log('Fetched lab patient ID:', labPatient.patient._id)
        }
      } catch (e) {
        console.error('Failed to fetch lab patient ID:', e)
      }
    }
    
    setEditForm(prev => ({ ...prev, [patient.mrn]: { ...patientWithId } }))
    setEditingPatient(prev => ({ ...prev, [patient.mrn]: true }))
  }

  function cancelEditing(mrn: string) {
    setEditingPatient(prev => ({ ...prev, [mrn]: false }))
    setEditForm(prev => { const n = { ...prev }; delete n[mrn]; return n })
  }

  async function savePatientChanges(mrn: string, patientId: string) {
    const formData = editForm[mrn]
    if (!formData) {
      setToast({ type: 'error', message: 'No changes to save.' })
      return
    }
    
    setSavingPatient(prev => ({ ...prev, [mrn]: true }))
    try {
      // Always resolve LabPatient id from MRN (authoritative source)
      const labPat: any = await labApi.getPatientByMrn(mrn)
      const effectiveId = String(labPat?.patient?._id || patientId || '')
      if (!effectiveId) throw new Error('Lab patient ID not found for this MRN')

      console.log('Updating lab patient:', effectiveId, formData)
      const result = await labApi.updatePatient(effectiveId, {
        fullName: formData.fullName,
        fatherName: formData.fatherName,
        phone: (formData as any).phoneNormalized || (formData as any).phone,
        cnic: (formData as any).cnicNormalized || (formData as any).cnic,
        gender: formData.gender,
        age: formData.age,
        address: formData.address,
        mrn: formData.mrn,
      })
      console.log('Update result:', result)
      
      // Re-fetch from lab collection to ensure DB update is reflected (and field names match)
      let refreshed: any = null
      try {
        const labPat2: any = await labApi.getPatientByMrn(mrn)
        refreshed = labPat2?.patient || null
      } catch {}

      // Update local patient data with the new values (prefer refreshed server copy)
      setPatients(prev => prev.map(p =>
        p.mrn === mrn
          ? { ...p, ...formData, ...(refreshed || {}), _id: refreshed?._id || effectiveId }
          : p
      ))
      
      // Clear the edit form to prevent stale data
      setEditForm(prev => { const n = { ...prev }; delete n[mrn]; return n })
      setEditingPatient(prev => ({ ...prev, [mrn]: false }))
      setToast({ type: 'success', message: 'Patient information updated successfully' })
    } catch (e: any) {
      console.error('Failed to update patient:', e)
      setToast({ type: 'error', message: e?.response?.data?.message || e?.message || 'Failed to update patient' })
    } finally {
      setSavingPatient(prev => ({ ...prev, [mrn]: false }))
    }
  }

  function updateEditForm(mrn: string, field: keyof PatientDetails, value: string) {
    setEditForm(prev => ({
      ...prev,
      [mrn]: { ...prev[mrn], [field]: value }
    }))
  }

  async function previewHtml(path: string){
    try{
      const html = await coreApi(path) as any
      const w = window.open('', '_blank'); if (!w) return
      w.document.open(); w.document.write(String(html)); w.document.close(); w.focus()
    } catch {
      const isFile = typeof window !== 'undefined' && window.location?.protocol === 'file:'
      const isElectronUA = typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent || '')
      const apiBase = (import.meta as any).env?.VITE_API_URL || ((isFile || isElectronUA) ? 'http://127.0.0.1:4000/api' : 'http://localhost:4000/api')
      const url = `${apiBase}${path}`
      window.open(url, '_blank')
    }
  }

  const onPreviewDischarge = (encounterId: string)=> previewHtml(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/discharge-summary/print`)
  // Kept for future IPD form previews
  const _onPreviewReceivedDeath = (encounterId: string)=> previewHtml(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/received-death/print`)
  const _onPreviewDeathCertificate = (encounterId: string)=> previewHtml(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/death-certificate/print`)
  const _onPreviewBirthCertificate = (encounterId: string)=> previewHtml(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/birth-certificate/print`)
  const onPreviewFinalInvoice = (encounterId: string)=> previewHtml(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/final-invoice/print`)

  // Mark as used (kept for future UI)
  const __unusedIpdPreviewFns = {
    _onPreviewReceivedDeath,
    _onPreviewDeathCertificate,
    _onPreviewBirthCertificate,
  }
  void __unusedIpdPreviewFns
  
  async function onPreviewShortStay(encounterId: string){
    try{
      const [encRes, ssRes, settings] = await Promise.all([
        hospitalApi.getIPDAdmissionById(encounterId) as any,
        hospitalApi.getIpdShortStay(encounterId) as any,
        hospitalApi.getSettings() as any,
      ])
      const enc = encRes?.encounter || {}
      const p = enc?.patientId || {}
      const data = ssRes?.shortStay?.data || {}
      const s = settings || {}
      const esc = (x:any)=> String(x==null?'':x).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'} as any)[c])
      const fmt = (d?:string,t?:string)=>{ try{ const dt = (d||'') + (t? ('T'+t):''); const x = new Date(dt||enc.startAt); if(!x||isNaN(x.getTime())) return ''; return x.toLocaleDateString()+', '+x.toLocaleTimeString() }catch{return ''} }
      const logo = s?.logoDataUrl ? `<img src="${esc(s.logoDataUrl)}" style="height:60px;object-fit:contain"/>` : ''
      const html = `<!doctype html><html><head><meta charset="utf-8"/><style>@page{size:A4;margin:12mm}body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Arial;color:#111}.wrap{padding:0 4mm}.hdr{display:grid;grid-template-columns:96px 1fr 96px;align-items:center}.title{font-size:22px;font-weight:800;text-align:center}.muted{color:#475569;font-size:12px;text-align:center}.hr{border-bottom:2px solid #0f172a;margin:6px 0}.box{border:1px solid #e2e8f0;border-radius:10px;padding:6px;margin:8px 0}.kv{display:grid;grid-template-columns: 130px minmax(0,1fr) 130px minmax(0,1fr) 130px minmax(0,1fr);gap:4px 10px;font-size:12px;align-items:start}.kv>div:nth-child(2n){word-break:break-word}.sec{margin-top:6px}.sec .lbl{font-weight:700;margin-bottom:2px}</style></head><body><div class=wrap>
      <div class=hdr><div>${logo}</div><div><div class=title>${esc(s.name||'Hospital')}</div><div class=muted>${esc(s.address||'-')}</div><div class=muted>Ph: ${esc(s.phone||'')} ${s.email? ' • '+esc(s.email):''}</div></div><div></div></div>
      <div class=hr></div>
      <div class=box><div class=kv>
        <div>Medical Record No :</div><div>${esc(p.mrn||'-')}</div>
        <div>Admission No :</div><div>${esc(enc.admissionNo||'-')}</div>
        <div>Patient Name :</div><div>${esc(p.fullName||'-')}</div>
        <div>Age / Gender :</div><div>${esc(p.age||'')} / ${esc(p.gender||'')}</div>
        <div>Reg. & Sample Time :</div><div>${fmt(p.admitted||data.dateIn,data.timeIn)}</div>
        <div>Discharge Time :</div><div>${fmt(data.dateOut,data.timeOut)}</div>
        <div>Address :</div><div>${esc(p.address||'-')}</div>
      </div></div>
      <div class=sec><div class=lbl>Final Diagnosis</div><div>${esc(data.finalDiagnosis||'')}</div></div>
      <div class=sec><div class=lbl>Presenting Complaints</div><div>${esc(data.presentingComplaints||'')}</div></div>
      <div class=sec><div class=lbl>Brief History</div><div>${esc(data.briefHistory||'')}</div></div>
      <div class=sec><div class=lbl>Treatment Given at Hospital</div><div>${esc(data.treatmentGiven||'')}</div></div>
      <div class=sec><div class=lbl>Treatment at Discharge</div><div>${esc(data.treatmentAtDischarge||'')}</div></div>
      <div class=sec><div class=lbl>Follow up Instructions</div><div>${esc(data.followUpInstructions||'')}</div></div>
      <script>window.print && setTimeout(()=>window.print(),200)</script>
      </div></body></html>`
      const w = window.open('', '_blank'); if(!w) return; w.document.open(); w.document.write(html); w.document.close(); w.focus()
    } catch { setToast({ type: 'error', message: 'Failed to open short-stay preview' }) }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric' 
      })
    } catch { return '-' }
  }

  const renderMedicalRecords = (mrn: string) => {
    const d = details[mrn]
    
    if (d?.loading) {
      return (
        <div className="p-8 text-center text-slate-500">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-sky-500 rounded-full animate-spin mx-auto mb-3" />
          Loading medical records...
        </div>
      )
    }

    return (
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Prescriptions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 bg-sky-50 dark:bg-sky-900/30 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <h4 className="font-semibold text-slate-800 dark:text-slate-100">Prescriptions</h4>
            </div>
            <span className="text-xs px-2 py-1 bg-sky-100 dark:bg-sky-800 text-sky-700 dark:text-sky-300 rounded-full">{(d?.pres || []).length}</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {(d?.pres || []).length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">No prescriptions</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {d?.pres?.slice(0, 5).map((pr: any) => (
                  <div key={String(pr.id)} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{new Date(pr.createdAt).toLocaleDateString()}</div>
                      <button
                        className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300"
                        onClick={() => onPrescriptionPdf(String(pr.id), mrn)}
                        disabled={busy.pres === String(pr.id)}
                      >
                        {busy.pres === String(pr.id) ? '...' : 'PDF'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{pr.doctor || '-'} • {pr.diagnosis || '-'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lab Reports */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-900/30 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h4 className="font-semibold text-slate-800 dark:text-slate-100">Lab Reports</h4>
            </div>
            <span className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-full">{(d?.lab || []).length}</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {(d?.lab || []).length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">No lab reports</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {d?.lab?.slice(0, 5).map((lr: any) => (
                  <div key={String(lr.id)} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {new Date(lr.createdAt).toLocaleDateString()}
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${lr.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300'}`}>{lr.status || 'pending'}</span>
                      </div>
                      {lr.hasResult && (
                        <div className="flex gap-1">
                          <Link to={`/lab/results?orderId=${encodeURIComponent(lr.id)}&token=${encodeURIComponent(lr.tokenNo||'')}`} className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300">View</Link>
                          <button
                            className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 ml-2"
                            onClick={() => onLabPdf(String(lr.id), mrn)}
                            disabled={busy.lab === String(lr.id)}
                          >
                            {busy.lab === String(lr.id) ? '...' : 'PDF'}
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{(lr.tests || []).map((t: any) => t.name || t).join(', ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Diagnostic Reports */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 bg-violet-50 dark:bg-violet-900/30 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <h4 className="font-semibold text-slate-800 dark:text-slate-100">Diagnostic Reports</h4>
            </div>
            <span className="text-xs px-2 py-1 bg-violet-100 dark:bg-violet-800 text-violet-700 dark:text-violet-300 rounded-full">{(d?.diag || []).length}</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {(d?.diag || []).length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">No diagnostic reports</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {d?.diag?.slice(0, 5).map((dr: any) => (
                  <div key={String(dr.id)} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {new Date(dr.createdAt).toLocaleDateString()}
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${dr.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300'}`}>{dr.status || 'pending'}</span>
                      </div>
                      {dr.hasResult && (
                        <button
                          onClick={() => onDiagnosticPrint(String(dr.id), mrn)}
                          disabled={busy.diag === String(dr.id)}
                          className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
                        >
                          {busy.diag === String(dr.id) ? '...' : 'View'}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{(dr.tests || []).map((t: any) => t.name || t).join(', ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Aesthetic History */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/30 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h4 className="font-semibold text-slate-800 dark:text-slate-100">Aesthetic History</h4>
            </div>
            <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300 rounded-full">{(d?.aesthetic || []).length}</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {(d?.aesthetic || []).length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">No aesthetic history</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {d?.aesthetic?.slice(0, 5).map((s: any, i: number) => (
                  <div key={String(s._id||s.id||i)} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{String(s.procedureName || s.procedureId || 'Procedure')}</div>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${s.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300' : s.status === 'cancelled' ? 'bg-rose-100 dark:bg-rose-800 text-rose-700 dark:text-rose-300' : 'bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300'}`}>{s.status || 'planned'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mt-1">
                      <span>{s.date ? new Date(s.date).toLocaleDateString() : '-'}</span>
                      <span>Paid: Rs {Math.round(Number(s.paid||0)).toLocaleString()}</span>
                      {Number(s.balance||0) > 0 && <span className="text-rose-600 dark:text-rose-400">Bal: Rs {Math.round(Number(s.balance||0)).toLocaleString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Emergency Cart - Full Width */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden lg:col-span-2">
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/30 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h4 className="font-semibold text-slate-800 dark:text-slate-100">Emergency Cart</h4>
            </div>
            <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded-full">{(d?.er || []).length}</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {(d?.er || []).length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">No emergency visits</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {d?.er?.map((er: any) => (
                  <div key={String(er.id)} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Token #{er.tokenNo}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">{new Date(er.startAt).toLocaleDateString()} - {er.endAt ? new Date(er.endAt).toLocaleDateString() : 'Present'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${er.status === 'discharged' ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300'}`}>{er.status || 'active'}</span>
                        <span className="text-xs text-slate-600 dark:text-slate-400">Dr. {er.doctor}</span>
                        <Link
                          to={`/hospital/emergency/${encodeURIComponent(er.id)}`}
                          className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300"
                        >
                          Open
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* IPD Admissions - Full Width */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden lg:col-span-2">
          <div className="px-4 py-3 bg-rose-50 dark:bg-rose-900/30 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <h4 className="font-semibold text-slate-800 dark:text-slate-100">IPD Admissions</h4>
            </div>
            <span className="text-xs px-2 py-1 bg-rose-100 dark:bg-rose-800 text-rose-700 dark:text-rose-300 rounded-full">{(d?.ipd || []).length}</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {(d?.ipd || []).length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">No IPD admissions</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {d?.ipd?.map((ad: any) => (
                  <div key={String(ad.id)} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Admission #{ad.admissionNo || ad.id}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">{new Date(ad.startAt).toLocaleDateString()} - {ad.endAt ? new Date(ad.endAt).toLocaleDateString() : 'Present'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${ad.status === 'discharged' ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300'}`}>{ad.status || 'active'}</span>
                        <Link
                          to={`/hospital/patient/${encodeURIComponent(ad.id)}`}
                          state={{
                            fromSearch: true,
                            searchSnapshot: {
                              form,
                              patients: (Array.isArray(patients) ? patients.map((pp:any)=>({ _id: pp?._id||pp?.id, id: pp?.id, fullName: pp?.fullName, mrn: pp?.mrn, fatherName: pp?.fatherName, phoneNormalized: pp?.phoneNormalized })) : []),
                              expanded,
                              details,
                            }
                          }}
                          className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300"
                        >
                          Profile
                        </Link>
                        {ad.forms?.dischargeSummary && (
                          <button onClick={()=>onPreviewDischarge(String(ad.id))} className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300">Discharge</button>
                        )}
                        {ad.forms?.shortStay && (
                          <button onClick={()=>onPreviewShortStay(String(ad.id))} className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300">Short Stay</button>
                        )}
                        <button onClick={()=>onPreviewFinalInvoice(String(ad.id))} className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300">Invoice</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderPatientInfoCard = (patient: PatientDetails & { id?: string }) => {
    const isEditing = editingPatient[patient.mrn]
    const formData = editForm[patient.mrn] || patient
    const isSaving = savingPatient[patient.mrn]
    // Support both _id (MongoDB) and id fields from different API responses.
    // IMPORTANT: when we fetch the lab patient id during edit, it is stored in editForm,
    // so we must also resolve the id from formData.
    const patientId = (formData as any)?._id || (formData as any)?.id || patient._id || patient.id || ''

    return (
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 dark:from-slate-900 dark:to-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{patient.fullName}</h3>
                <p className="text-slate-300 text-sm">MRN: {patient.mrn} {patientId ? '' : '(No ID)'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <button
                  onClick={() => startEditingPatient(patient)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    onClick={() => savePatientChanges(patient.mrn, patientId)}
                    disabled={isSaving || !patientId}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => cancelEditing(patient.mrn)}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Patient Info Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Full Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.fullName || ''}
                  onChange={(e) => updateEditForm(patient.mrn, 'fullName', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                />
              ) : (
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{patient.fullName || '-'}</span>
                </div>
              )}
            </div>

            {/* MR Number */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">MR Number</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.mrn || ''}
                  disabled
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
              ) : (
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <IdCard className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-sky-600 dark:text-sky-400">{patient.mrn || '-'}</span>
                </div>
              )}
            </div>

            {/* Father/Guardian Name */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Father/Guardian Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.fatherName || ''}
                  onChange={(e) => updateEditForm(patient.mrn, 'fatherName', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                />
              ) : (
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{patient.fatherName || '-'}</span>
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Phone Number</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.phoneNormalized || ''}
                  onChange={(e) => updateEditForm(patient.mrn, 'phoneNormalized', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                />
              ) : (
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{patient.phoneNormalized || '-'}</span>
                </div>
              )}
            </div>

            {/* CNIC */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">CNIC</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.cnicNormalized || ''}
                  onChange={(e) => updateEditForm(patient.mrn, 'cnicNormalized', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                />
              ) : (
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <IdCard className="w-4 h-4 text-slate-400" />
                  <span>{patient.cnicNormalized || '-'}</span>
                </div>
              )}
            </div>

            {/* Gender */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Gender</label>
              {isEditing ? (
                <select
                  value={formData.gender || ''}
                  onChange={(e) => updateEditForm(patient.mrn, 'gender', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              ) : (
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{patient.gender || '-'}</span>
                </div>
              )}
            </div>

            {/* Age */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Age</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.age || ''}
                  onChange={(e) => updateEditForm(patient.mrn, 'age', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                />
              ) : (
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{patient.age || '-'}</span>
                </div>
              )}
            </div>

            {/* Address - Full Width */}
            <div className="space-y-1 md:col-span-2 lg:col-span-3">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Address</label>
              {isEditing ? (
                <textarea
                  value={formData.address || ''}
                  onChange={(e) => updateEditForm(patient.mrn, 'address', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none resize-none"
                />
              ) : (
                <div className="flex items-start gap-2 text-slate-800 dark:text-slate-200">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                  <span className="text-sm">{patient.address || '-'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Registration Date */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Calendar className="w-3 h-3" />
              <span>Registered: {formatDate(patient.createdAtIso)}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Advanced Patient Search</h2>

      <form onSubmit={onSearch} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">MR Number</label>
            <input value={form.mrNo} onChange={e=>update('mrNo', e.target.value)} placeholder="MR123456" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Patient Name</label>
            <input value={form.name} onChange={e=>update('name', e.target.value)} placeholder="Full or partial name" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Father Name</label>
            <input value={form.fatherName} onChange={e=>update('fatherName', e.target.value)} placeholder="Guardian's name" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phone Number</label>
            <input value={form.phone} onChange={e=>update('phone', e.target.value)} placeholder="03001234567" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="submit" className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50" disabled={loading}>{loading?'Searching...':'Search Patients'}</button>
          <button type="button" onClick={onClear} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Clear Filters</button>
        </div>
      </form>

      {patients.length>0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-medium text-slate-800 dark:text-slate-100">Search Results</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">{patients.length} patient{patients.length!==1?'s':''} found</div>
          </div>
          
          <div className="space-y-4">
            {patients.map((p, idx) => (
              <div key={String(p._id||idx)} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {/* Patient Header Bar */}
                <div 
                  className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                  onClick={() => {
                    const mrn = String(p.mrn||'')
                    setExpanded(prev => ({ ...prev, [mrn]: !prev[mrn] }))
                    if (!details[mrn]) loadDetails(mrn, String(p._id||''))
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-800 dark:text-slate-100">{p.fullName || '-'}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        MRN: {p.mrn || '-'} • Father: {p.fatherName || '-'} • Phone: {p.phoneNormalized || '-'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                      {expanded[String(p.mrn||'')] ? (
                        <><ChevronUp className="w-4 h-4" /> Hide Details</>
                      ) : (
                        <><ChevronDown className="w-4 h-4" /> View Details</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Patient Profile */}
                {expanded[String(p.mrn||'')] && (
                  <div className="p-6 border-t border-slate-200 dark:border-slate-700">
                    {renderPatientInfoCard(p)}
                    {renderMedicalRecords(String(p.mrn||''))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
}
