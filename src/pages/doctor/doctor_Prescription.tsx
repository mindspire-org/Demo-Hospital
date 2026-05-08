import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { hospitalApi, labApi, pharmacyApi } from '../../utils/api'
import { previewPrescriptionPdf } from '../../utils/prescriptionPdf'
import type { PrescriptionPdfTemplate } from '../../utils/prescriptionPdf'
import Doctor_IpdReferralForm from '../../components/doctor/Doctor_IpdReferralForm'
import { previewIpdReferralPdf } from '../../utils/ipdReferralPdf'
import PrescriptionPrint from '../../components/doctor/PrescriptionPrint'
import PrescriptionMedication from '../../components/doctor/PrescriptionMedication'
import PrescriptionVitals from '../../components/doctor/PrescriptionVitals'
import PrescriptionDiagnosticOrders from '../../components/doctor/PrescriptionDiagnosticOrders'
import SuggestField from '../../components/SuggestField'
import Toast from '../../components/ui/Toast'
import type { ToastState } from '../../components/ui/Toast'
import DatePickerModern from '../../components/DatePickerModern'
import { 
  User, 
  History, 
  Stethoscope, 
  ClipboardList, 
  Beaker, 
  Activity, 
  Printer, 
  Save, 
  RotateCcw, 
  ArrowRight,
  Plus,
  Search,
  Calendar,
  AlertCircle,
  Clock,
  Layout,
  FileText
} from 'lucide-react'

type DoctorSession = { id: string; name: string; username: string }

type Token = {
  id: string
  createdAt: string
  patientName: string
  mrNo: string
  encounterId: string
  doctorId?: string
  doctorName?: string
  status?: 'queued'|'in-progress'|'completed'|'returned'|'cancelled'
  tokenNo?: string
}

type MedicineRow = {
  name: string
  morning?: string
  noon?: string
  evening?: string
  night?: string
  days?: string
  qty?: string
  route?: string
  instruction?: string
  durationUnit?: 'day(s)'|'week(s)'|'month(s)'
  durationText?: string
  freqText?: string
}

//

export default function Doctor_Prescription() {
  const location = useLocation()
  const [doc, setDoc] = useState<DoctorSession | null>(null)
  const [tokens, setTokens] = useState<Token[]>([])
  const [presEncounterIds, setPresEncounterIds] = useState<string[]>([])
  const [presMrns, setPresMrns] = useState<string[]>([])
  const today = new Date().toISOString().slice(0, 10)
  const [from, setFrom] = useState<string>(today)
  const [to, setTo] = useState<string>(today)
  const [rxMode, setRxMode] = useState<'electronic'|'manual'>('electronic')
  const [manualAttachment, setManualAttachment] = useState<{ mimeType?: string; fileName?: string; dataUrl?: string } | null>(null)
  const [manualAttachmentError, setManualAttachmentError] = useState<string>('')
  const [form, setForm] = useState({
    patientKey: '',
    primaryComplaint: '',
    primaryComplaintHistory: '',
    familyHistory: '',
    allergyHistory: '',
    treatmentHistory: '',
    history: '',
    examFindings: '',
    diagnosis: '',
    advice: '',
    labTestsText: '',
    vitalsDisplay: {},
    vitalsNormalized: {},
    diagDisplay: { testsText: '' },
    meds: [{ name: '', morning: '', noon: '', evening: '', night: '', days: '', qty: '', route: '', instruction: '', durationUnit: 'day(s)', durationText: '', freqText: '' }] as MedicineRow[],
  })
  const [saved, setSaved] = useState(false)
  const [settings] = useState<{ name: string; address: string; phone: string; logoDataUrl?: string }>({ name: 'Hospital', address: '', phone: '' })
  const [pat] = useState<{ address?: string; phone?: string; fatherName?: string; gender?: string; age?: string } | null>(null)
  const [doctorInfo, setDoctorInfo] = useState<{ name?: string; specialization?: string; phone?: string; qualification?: string; departmentName?: string } | null>(null)
  const [prescriptionTemplate, setPrescriptionTemplate] = useState<PrescriptionPdfTemplate>('hospital-rx')
  const [openReferral, setOpenReferral] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const referralFormRef = useRef<any>(null)
  const vitalsRef = useRef<any>(null)
  const diagRef = useRef<any>(null)
  const medsRef = useRef<any>(null)
  const [medNameSuggestions, setMedNameSuggestions] = useState<string[]>([])
  const [labTestSuggestions, setLabTestSuggestions] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'details'|'vitals'|'labs'|'diagnostics'|'medication'>('details')
  const [showLoadPrevButton, setShowLoadPrevButton] = useState(false)
  const [lastPrescription, setLastPrescription] = useState<any>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [dbSuggestions, setDbSuggestions] = useState<{
    primaryComplaint: string[]
    history: string[]
    primaryComplaintHistory: string[]
    familyHistory: string[]
    allergyHistory: string[]
    treatmentHistory: string[]
    examFindings: string[]
    diagnosis: string[]
    advice: string[]
    labTest: string[]
    diagTest: string[]
    dose: string[]
    route: string[]
    instruction: string[]
    frequencyTag: string[]
    durationTag: string[]
    vitals: {
      pulse: string[]
      temperature: string[]
      sys: string[]
      dia: string[]
      resp: string[]
      sugar: string[]
      weight: string[]
      height: string[]
      spo2: string[]
    }
  }>({
    primaryComplaint: [],
    history: [],
    primaryComplaintHistory: [],
    familyHistory: [],
    allergyHistory: [],
    treatmentHistory: [],
    examFindings: [],
    diagnosis: [],
    advice: [],
    labTest: [],
    diagTest: [],
    dose: [],
    route: [],
    instruction: [],
    frequencyTag: [],
    durationTag: [],
    vitals: {
      pulse: [],
      temperature: [],
      sys: [],
      dia: [],
      resp: [],
      sugar: [],
      weight: [],
      height: [],
      spo2: [],
    }
  })
  useEffect(() => {
    try {
      const raw = localStorage.getItem('doctor.session')
      const sess = raw ? JSON.parse(raw) : null
      setDoc(sess)
      // Compat: upgrade legacy id to backend id if needed
      const hex24 = /^[a-f\d]{24}$/i
      if (sess && !hex24.test(String(sess.id||''))) {
        ;(async () => {
          try {
            const res = await hospitalApi.listDoctors() as any
            const docs: any[] = res?.doctors || []
            const match = docs.find(d => String(d.username||'').toLowerCase() === String(sess.username||'').toLowerCase()) ||
                          docs.find(d => String(d.name||'').toLowerCase() === String(sess.name||'').toLowerCase())
            if (match) {
              const fixed = { ...sess, id: String(match._id || match.id) }
              try { localStorage.setItem('doctor.session', JSON.stringify(fixed)) } catch {}
              setDoc(fixed)
            }
          } catch {}
        })()
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const k = `doctor.rx.mode.${doc?.id || 'anon'}`
      const v = localStorage.getItem(k)
      if (v === 'manual' || v === 'electronic') setRxMode(v)
      else setRxMode('electronic')
    } catch { setRxMode('electronic') }
  }, [doc?.id])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res: any = await labApi.listTests({ q: '', page: 1, limit: 2000 })
        const tests: any[] = res?.tests ?? res?.items ?? res ?? []
        const names = tests.map((t: any) => String(t?.name || t?.testName || t || '').trim()).filter(Boolean)
        if (!cancelled) setLabTestSuggestions(Array.from(new Set(names)).slice(0, 2000))
      } catch {
        if (!cancelled) setLabTestSuggestions([])
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res: any = await pharmacyApi.getAllMedicines()
        const meds: any[] = res?.medicines ?? res?.items ?? res ?? []
        const names = meds.map((m: any) => String(m?.name || m?.genericName || m || '').trim()).filter(Boolean)
        if (!cancelled) setMedNameSuggestions(Array.from(new Set(names)).slice(0, 2000))
      } catch {
        // ignore
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Load prescription template from database
  useEffect(() => {
    ;(async () => {
      try {
        if (doc?.id) {
          const doctorData: any = await hospitalApi.getDoctor(doc.id)
          if (doctorData?.prescriptionTemplate) {
            setPrescriptionTemplate(doctorData.prescriptionTemplate)
          }
        }
      } catch {}
    })()
  }, [doc?.id])

  useEffect(() => { loadTokens(); loadPresIds() }, [doc?.id, from, to])

  // Load prescription templates for this doctor
  useEffect(() => {
    ;(async () => {
      try {
        if (!doc?.id) return
        const res = await hospitalApi.getPrescriptionTemplatesByDoctor(doc.id) as any
        setTemplates(res?.templates || [])
      } catch {}
    })()
  }, [doc?.id])
  
  useEffect(() => {
    const h = () => { loadTokens(); loadPresIds() }
    window.addEventListener('doctor:pres-saved', h as any)
    return () => window.removeEventListener('doctor:pres-saved', h as any)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id])

  // Bootstrap suggestions from previous prescriptions
  useEffect(() => {
    ;(async () => {
      try {
        if (!doc?.id) return
        const res = await hospitalApi.listPrescriptions({ doctorId: doc.id, page: 1, limit: 200 }) as any
        const rows: any[] = res?.prescriptions || []
        // Store suggestions in memory only (not localStorage) to reflect actual DB state
        const primaries: string[] = []
        const histories: string[] = []
        const primHist: string[] = []
        const family: string[] = []
        const allergy: string[] = []
        const treatment: string[] = []
        const exams: string[] = []
        const diagnosis: string[] = []
        const advice: string[] = []
        const labTestsAll: string[] = []
        const diagTestsAll: string[] = []
        const doses: string[] = []
        const routes: string[] = []
        const instrs: string[] = []
        const freqs: string[] = []
        const durs: string[] = []
        const vPulse: string[] = []
        const vTemp: string[] = []
        const vSys: string[] = []
        const vDia: string[] = []
        const vResp: string[] = []
        const vSugar: string[] = []
        const vWeight: string[] = []
        const vHeight: string[] = []
        const vSpo2: string[] = []
        for (const r of rows) {
          if (r.primaryComplaint) primaries.push(String(r.primaryComplaint))
          if (r.history) histories.push(String(r.history))
          if (r.primaryComplaintHistory) primHist.push(String(r.primaryComplaintHistory))
          if (r.familyHistory) family.push(String(r.familyHistory))
          if (r.allergyHistory) allergy.push(String(r.allergyHistory))
          if (r.treatmentHistory) treatment.push(String(r.treatmentHistory))
          if (r.examFindings) exams.push(String(r.examFindings))
          if (r.diagnosis) diagnosis.push(String(r.diagnosis))
          if (r.advice) advice.push(String(r.advice))
          if (Array.isArray(r.labTests)) labTestsAll.push(...(r.labTests as any[]).map(x=>String(x||'')))
          if (Array.isArray(r.diagnosticTests)) diagTestsAll.push(...(r.diagnosticTests as any[]).map((x:any)=>String(x||'')))
          // collect vitals suggestions from previous prescriptions
          try {
            const vv = r.vitals || {}
            if (vv.pulse != null) vPulse.push(String(vv.pulse))
            if (vv.temperatureC != null) vTemp.push(String(vv.temperatureC))
            if (vv.bloodPressureSys != null) vSys.push(String(vv.bloodPressureSys))
            if (vv.bloodPressureDia != null) vDia.push(String(vv.bloodPressureDia))
            if (vv.respiratoryRate != null) vResp.push(String(vv.respiratoryRate))
            if (vv.bloodSugar != null) vSugar.push(String(vv.bloodSugar))
            if (vv.weightKg != null) vWeight.push(String(vv.weightKg))
            if (vv.heightCm != null) vHeight.push(String(vv.heightCm))
            if (vv.spo2 != null) vSpo2.push(String(vv.spo2))
          } catch {}
          try {
            const items = Array.isArray(r.items) ? (r.items as any[]) : []
            for (const it of items) {
              if (it?.dose) doses.push(String(it.dose))
              if (it?.frequency) freqs.push(String(it.frequency))
              if (it?.duration) durs.push(String(it.duration))
              if (it?.notes) {
                const notes = String(it.notes)
                const mRoute = notes.match(/Route:\s*([^;]+)/i)
                const mInstr = notes.match(/Instruction:\s*([^;]+)/i)
                if (mRoute && mRoute[1]) routes.push(mRoute[1].trim())
                if (mInstr && mInstr[1]) instrs.push(mInstr[1].trim())
              }
            }
          } catch {}
        }
        // Store in component state instead of localStorage to reflect actual DB state
        setDbSuggestions({
          primaryComplaint: Array.from(new Set(primaries)),
          history: Array.from(new Set(histories)),
          primaryComplaintHistory: Array.from(new Set(primHist)),
          familyHistory: Array.from(new Set(family)),
          allergyHistory: Array.from(new Set(allergy)),
          treatmentHistory: Array.from(new Set(treatment)),
          examFindings: Array.from(new Set(exams)),
          diagnosis: Array.from(new Set(diagnosis)),
          advice: Array.from(new Set(advice)),
          labTest: Array.from(new Set(labTestsAll)),
          diagTest: Array.from(new Set(diagTestsAll)),
          dose: Array.from(new Set(doses)),
          route: Array.from(new Set(routes)),
          instruction: Array.from(new Set(instrs)),
          frequencyTag: Array.from(new Set(freqs)),
          durationTag: Array.from(new Set(durs)),
          vitals: {
            pulse: Array.from(new Set(vPulse)),
            temperature: Array.from(new Set(vTemp)),
            sys: Array.from(new Set(vSys)),
            dia: Array.from(new Set(vDia)),
            resp: Array.from(new Set(vResp)),
            sugar: Array.from(new Set(vSugar)),
            weight: Array.from(new Set(vWeight)),
            height: Array.from(new Set(vHeight)),
            spo2: Array.from(new Set(vSpo2)),
          }
        })
      } catch {}
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id])

  useEffect(() => {
    ;(async () => {
      try {
        if (!doc?.id) { setDoctorInfo(null); return }
        const [drRes, depRes] = await Promise.all([
          hospitalApi.listDoctors() as any,
          hospitalApi.listDepartments() as any,
        ])
        const doctors: any[] = drRes?.doctors || []
        const depArray: any[] = ((depRes as any)?.departments || (depRes as any) || []) as any[]
        const d = doctors.find(x => String(x._id || x.id) === String(doc.id))
        const deptName = d?.primaryDepartmentId ? (depArray.find((z: any)=> String(z._id||z.id) === String(d.primaryDepartmentId))?.name || '') : ''
        if (d) setDoctorInfo({ name: d.name || '', specialization: d.specialization || '', phone: d.phone || '', qualification: d.qualification || '', departmentName: deptName })
      } catch {}
    })()
  }, [doc?.id])

  async function loadTokens(){
    try {
      if (!doc?.id) { setTokens([]); return }
      const params: any = { doctorId: doc.id }
      if (from) params.from = from
      if (to) params.to = to
      console.log('loadTokens - fetching with params:', params)
      const res = await hospitalApi.listTokens(params) as any
      console.log('loadTokens - API response:', res)
      const items: Token[] = (res.tokens || []).map((t: any) => ({
        id: t._id,
        createdAt: t.createdAt,
        patientName: t.patientName || '-',
        mrNo: t.mrn || '-',
        encounterId: String(t.encounterId?._id || t.encounterId || ''),
        doctorId: t.doctorId?._id || String(t.doctorId || ''),
        doctorName: t.doctorId?.name || '',
        status: t.status,
        tokenNo: t.tokenNo || t.tokenNumber || '',
      }))
      console.log('loadTokens - mapped items:', items)
      setTokens(items)
    } catch (err) {
      console.error('loadTokens - error:', err)
      setTokens([])
    }
  }

  async function loadPresIds(){
    try {
      if (!doc?.id) { setPresEncounterIds([]); setPresMrns([]); return }
      const params: any = { doctorId: doc.id }
      if (from) params.from = from
      if (to) params.to = to
      const res = await hospitalApi.listPrescriptions(params) as any
      const prescriptions = res.prescriptions || []
      // Track encounterIds and MRNs of COMPLETED prescriptions (have items/medicines)
      // Patients with only vitals should still appear in dropdown
      const completedPrescriptions = prescriptions.filter((p: any) => Array.isArray(p.items) && p.items.length > 0)
      const ids: string[] = completedPrescriptions.map((p: any) => String(p.encounterId?._id || p.encounterId || ''))
      const mrns: string[] = completedPrescriptions
        .map((p: any) => String(p.patientId?.mrn || p.mrn || ''))
        .filter(Boolean)
      setPresEncounterIds(ids)
      setPresMrns(mrns)
    } catch {
      setPresEncounterIds([])
      setPresMrns([])
    }
  }

  const myPatients = useMemo(() => {
    const completedEncounterSet = new Set(presEncounterIds.filter(Boolean))
    const completedMrnSet = new Set(presMrns.filter(Boolean))
    console.log('myPatients - tokens:', tokens.length, tokens.map(t => ({ id: t.id, encounterId: t.encounterId, mrNo: t.mrNo, status: t.status })))
    console.log('myPatients - completedEncounterSet:', Array.from(completedEncounterSet))
    console.log('myPatients - completedMrnSet:', Array.from(completedMrnSet))
    console.log('myPatients - doc?.id:', doc?.id)
    const result = tokens
      .filter(t => {
        const doctorMatch = t.doctorId === doc?.id
        console.log(`myPatients - token ${t.id} doctorMatch:`, doctorMatch, 't.doctorId:', t.doctorId)
        return doctorMatch
      })
      // treat default as pending if not returned/completed/cancelled
      .filter(t => {
        const statusOk = !t.status || (t.status !== 'returned' && t.status !== 'completed' && t.status !== 'cancelled')
        console.log(`myPatients - token ${t.id} statusOk:`, statusOk, 'status:', t.status)
        return statusOk
      })
      // exclude encounters with a COMPLETED prescription (has items/medicines)
      // Patients with only vitals (no items) should still appear
      .filter(t => {
        const encounterExcluded = t.encounterId && completedEncounterSet.has(String(t.encounterId))
        const mrnExcluded = t.mrNo && completedMrnSet.has(String(t.mrNo))
        console.log(`myPatients - token ${t.id} encounterExcluded:`, encounterExcluded, 'mrnExcluded:', mrnExcluded)
        return !encounterExcluded && !mrnExcluded
      })
    console.log('myPatients - result:', result.length, result.map(t => t.id))
    return result
  }, [tokens, doc, presEncounterIds, presMrns])

  // If opened from queue with tokenId, preselect that patient.
  useEffect(() => {
    const qs = new URLSearchParams(location.search || '')
    const tokenId = qs.get('tokenId')
    if (!tokenId) return
    const t = myPatients.find(x => String(x.id) === String(tokenId) || String((x as any)._id) === String(tokenId))
    if (!t) return
    setForm(f => ({ ...f, patientKey: String(t.id) }))
  }, [location.search, myPatients])

  // Check if patient has previous prescription when selection changes (show button only, don't auto-load)
  useEffect(() => {
    const sel = tokens.find(t => `${t.id}` === form.patientKey)
    const mrn = String(sel?.mrNo || '').trim()
    if (!mrn) {
      setShowLoadPrevButton(false)
      setLastPrescription(null)
      return
    }

    ;(async () => {
      try {
        const res: any = await hospitalApi.listPrescriptions({ patientMrn: mrn, page: 1, limit: 1 })
        const pres = (res?.prescriptions || [])[0]
        if (pres) {
          setLastPrescription(pres)
          setShowLoadPrevButton(true)
        } else {
          setShowLoadPrevButton(false)
          setLastPrescription(null)
        }
      } catch {
        setShowLoadPrevButton(false)
        setLastPrescription(null)
      }
    })()
  }, [form.patientKey, tokens])

  // Manual function to load previous prescription data
  const loadPreviousPrescription = () => {
    if (!lastPrescription) return

    const pres = lastPrescription
    // meds mapping
    const meds: MedicineRow[] = (pres.items || []).map((it: any) => {
      const notes = String(it?.notes || '').trim()
      let instruction = ''
      let route = ''
      try { const mi = notes.match(/Instruction:\s*([^;]+)/i); if (mi && mi[1]) instruction = mi[1].trim() } catch {}
      try { const mr = notes.match(/Route:\s*([^;]+)/i); if (mr && mr[1]) route = mr[1].trim() } catch {}
      return {
        name: String(it?.name || '').trim(),
        qty: it?.dose != null ? String(it.dose) : '',
        freqText: String(it?.frequency || '').trim(),
        durationText: String(it?.duration || '').trim(),
        instruction: String(it?.instruction || instruction || '').trim(),
        route: String(it?.route || route || '').trim(),
        durationUnit: 'day(s)',
      }
    }).filter((m: any) => m.name)

    const labTestsText = Array.isArray(pres.labTests) ? pres.labTests.map((x: any) => String(x||'').trim()).filter(Boolean).join('\n') : ''
    const diagTestsText = Array.isArray(pres.diagnosticTests) ? pres.diagnosticTests.map((x: any) => String(x||'').trim()).filter(Boolean).join('\n') : ''

    // Convert normalized vitals to display format
    const v: any = pres.vitals || {}
    const vitalsDisplay: any = {
      pulse: v.pulse != null ? String(v.pulse) : '',
      temperature: v.temperatureC != null ? String(v.temperatureC) : '',
      bloodPressureSys: v.bloodPressureSys != null ? String(v.bloodPressureSys) : '',
      bloodPressureDia: v.bloodPressureDia != null ? String(v.bloodPressureDia) : '',
      respiratoryRate: v.respiratoryRate != null ? String(v.respiratoryRate) : '',
      bloodSugar: v.bloodSugar != null ? String(v.bloodSugar) : '',
      weightKg: v.weightKg != null ? String(v.weightKg) : '',
      height: v.heightCm != null ? String(v.heightCm) : '',
      spo2: v.spo2 != null ? String(v.spo2) : '',
    }

    setForm(f => ({
      ...f,
      primaryComplaint: String(pres.primaryComplaint || pres.complaints || ''),
      primaryComplaintHistory: String(pres.primaryComplaintHistory || ''),
      familyHistory: String(pres.familyHistory || ''),
      allergyHistory: String(pres.allergyHistory || ''),
      treatmentHistory: String(pres.treatmentHistory || ''),
      history: String(pres.history || ''),
      examFindings: String(pres.examFindings || ''),
      diagnosis: String(pres.diagnosis || ''),
      advice: String(pres.advice || ''),
      labTestsText,
      vitalsDisplay: vitalsDisplay,
      vitalsNormalized: pres.vitals || f.vitalsNormalized,
      diagDisplay: { testsText: diagTestsText },
      meds: meds.length ? meds : f.meds,
    }))

    // Also update child widgets if they expose setters
    try {
      // Delay to ensure vitalsRef is mounted
      setTimeout(() => {
        try { vitalsRef.current?.setDisplay?.(vitalsDisplay) } catch {}
      }, 50)
    } catch {}
    try { diagRef.current?.setDisplay?.({ testsText: diagTestsText }) } catch {}

    setToast({ type: 'success', message: 'Previous prescription loaded' })
    setShowLoadPrevButton(false)
  }

  async function searchLabTests(q: string){
    try {
      const query = String(q || '').trim()
      const res: any = await labApi.listTests({ q: query, page: 1, limit: 100 })
      const tests: any[] = res?.tests ?? res?.items ?? res ?? []
      const names = tests.map((t: any) => String(t?.name || t?.testName || t || '').trim()).filter(Boolean)
      setLabTestSuggestions(Array.from(new Set(names)).slice(0, 2000))
    } catch {
      // keep previous list
    }
  }


  const onManualFile = (file?: File | null) => {
    if (!file) {
      setManualAttachment(null)
      setManualAttachmentError('')
      return
    }

    const maxBytes = 5 * 1024 * 1024
    if (file.size > maxBytes) {
      setManualAttachment(null)
      setManualAttachmentError('File must be 5 MB or smaller')
      return
    }

    setManualAttachmentError('')
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      setManualAttachment({ dataUrl, mimeType: file.type || undefined, fileName: file.name || undefined })
    }
    reader.readAsDataURL(file)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const sel = myPatients.find(t => `${t.id}` === form.patientKey)

    if (!doc || !sel || !sel.encounterId) { setToast({ type: 'error', message: 'Select a patient first' }); return }
    const items = (form.meds || [])
      .filter(m => (m.name||'').trim())
      .map(m => ({
        name: String(m.name).trim(),
        dose: m.qty ? String(m.qty).trim() : undefined,
        frequency: (m.freqText && m.freqText.trim()) ? m.freqText.trim() : (['morning','noon','evening','night'].map(k => (m as any)[k]).filter(Boolean).join('/ ') || undefined),
        duration: (m.durationText && m.durationText.trim()) ? m.durationText.trim() : (m.days ? `${m.days} ${m.durationUnit || 'day(s)'}` : undefined),
        route: m.route ? String(m.route).trim() : undefined,
        instruction: m.instruction ? String(m.instruction).trim() : undefined,
        notes: (m.route || m.instruction) ? [m.route?`Route: ${m.route}`:null, m.instruction?`Instruction: ${m.instruction}`:null].filter(Boolean).join('; ') : undefined,
      }))
    if (rxMode === 'manual') {
      if (manualAttachmentError) { setToast({ type: 'error', message: manualAttachmentError }); return }
      if (!manualAttachment?.dataUrl) { setToast({ type: 'error', message: 'Attach prescription PDF/image for Manual mode' }); return }
    } else {
      if (!items.length) { setToast({ type: 'error', message: 'Add at least one medicine' }); return }
    }
    const labTests = form.labTestsText.split(/\n|,/).map(s=>s.trim()).filter(Boolean)
    try {
      let vRaw = undefined as any
      try { vRaw = vitalsRef.current?.getNormalized?.() } catch {}
      const hasVitals = vRaw && Object.values(vRaw).some(x => x != null && !(typeof x === 'number' && isNaN(x)))
      let vitals: any = undefined
      if (hasVitals) vitals = vRaw
      else if (Object.keys((form as any).vitalsNormalized||{}).length) vitals = (form as any).vitalsNormalized
      else if ((form as any).vitalsDisplay && Object.values((form as any).vitalsDisplay).some(Boolean)) {
        const d: any = (form as any).vitalsDisplay
        const n = (x?: any) => { const v = parseFloat(String(x||'').trim()); return isFinite(v)? v : undefined }
        vitals = {
          pulse: n(d.pulse),
          temperatureC: n(d.temperature),
          bloodPressureSys: n(d.bloodPressureSys),
          bloodPressureDia: n(d.bloodPressureDia),
          respiratoryRate: n(d.respiratoryRate),
          bloodSugar: n(d.bloodSugar),
          weightKg: n(d.weightKg),
          heightCm: n(d.height),
          spo2: n(d.spo2),
        }
      }
      const dRaw = diagRef.current?.getData?.()
      const diagnosticTests = Array.isArray(dRaw?.tests) && dRaw?.tests?.length ? dRaw?.tests : undefined
      
      // Only check for existing prescription by encounterId (current token's encounter)
      // Do NOT check by MRN - each new token should get a new prescription
      let existingPresId: string | null = null
      try {
        const existingRes: any = await hospitalApi.getPrescriptionByEncounterId(sel.encounterId)
        if (existingRes?.prescription?._id || existingRes?.prescription?.id) {
          existingPresId = String(existingRes.prescription._id || existingRes.prescription.id)
        }
      } catch {}
      
      const prescriptionData = {
        prescriptionMode: rxMode,
        tokenNo: (sel as any)?.tokenNo,
        manualAttachment: rxMode === 'manual' ? manualAttachment || undefined : undefined,
        items: rxMode === 'manual' ? (items.length ? items : undefined) : items,
        labTests: labTests.length ? labTests : undefined,
        diagnosticTests,
        primaryComplaint: form.primaryComplaint || undefined,
        primaryComplaintHistory: form.primaryComplaintHistory || undefined,
        familyHistory: form.familyHistory || undefined,
        allergyHistory: form.allergyHistory || undefined,
        treatmentHistory: form.treatmentHistory || undefined,
        history: form.history || undefined,
        examFindings: form.examFindings || undefined,
        diagnosis: form.diagnosis || undefined,
        advice: form.advice || undefined,
        vitals,
      }
      
      if (existingPresId) {
        // Update existing prescription for this encounter (same token)
        await hospitalApi.updatePrescription(existingPresId, prescriptionData)
      } else {
        // Create new prescription for this token/encounter
        await hospitalApi.createPrescription({
          encounterId: sel.encounterId,
          createdBy: doc.name,
          ...prescriptionData,
        })
      }
      try { window.dispatchEvent(new CustomEvent('doctor:pres-saved')) } catch {}
      setSaved(true)
      setToast({ type: 'success', message: 'Prescription saved successfully' })
      setForm({ patientKey: '', primaryComplaint: '', primaryComplaintHistory: '', familyHistory: '', allergyHistory: '', treatmentHistory: '', history: '', examFindings: '', diagnosis: '', advice: '', labTestsText: '', vitalsDisplay: {}, vitalsNormalized: {}, diagDisplay: { testsText: '' }, meds: [{ name: '', morning: '', noon: '', evening: '', night: '', qty: '', route: '', instruction: '', durationText: '', freqText: '' }] })
      setManualAttachment(null)
      setManualAttachmentError('')
      try { vitalsRef.current?.setDisplay?.({}) } catch {}
      try { diagRef.current?.setDisplay?.({ testsText: '' }) } catch {}
      setTimeout(()=>setSaved(false), 2000)
      // Refresh patient lists to remove the saved patient from dropdown
      loadTokens()
      loadPresIds()
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to save prescription' })
    }
  }

  // Print helpers: build a PDF and open a preview window/tab
  async function openPrint(){
    const sel = myPatients.find(t => `${t.id}` === form.patientKey)
    if (!sel) { setToast({ type: 'error', message: 'Select a patient first' }); return }
    // Load settings fresh for header
    let s: any = settings
    try { s = await hospitalApi.getSettings() as any } catch {}
    const settingsNorm = { name: s?.name || 'Hospital', address: s?.address || '', phone: s?.phone || '', logoDataUrl: s?.logoDataUrl || '' }
    
    // Enrich patient details from Lab if available
    let patient: any = { name: sel.patientName || '-', mrn: sel.mrNo || '-' }
    try {
      if (sel?.mrNo) {
        const resp: any = await labApi.getPatientByMrn(sel.mrNo)
        const p = resp?.patient
        if (p) {
          let ageTxt = ''
          try {
            if (p.age != null) ageTxt = String(p.age)
            else if (p.dob) { const dob = new Date(p.dob); if (!isNaN(dob.getTime())) ageTxt = String(Math.max(0, Math.floor((Date.now()-dob.getTime())/31557600000))) }
          } catch {}
          patient = { name: p.fullName || sel.patientName || '-', mrn: p.mrn || sel.mrNo || '-', gender: p.gender || '-', fatherName: p.fatherName || '-', phone: p.phoneNormalized || '-', address: p.address || '-', age: ageTxt }
        }
      }
    } catch {}
    // Capture latest medication data from ref if available
    let latestMeds = form.meds
    try {
      const medsData = medsRef.current?.getData?.()
      if (medsData && Array.isArray(medsData)) latestMeds = medsData
    } catch {}
    const items = latestMeds
      .filter(m=>m.name?.trim())
      .map(m=>({
        name: m.name,
        frequency: (m.freqText && m.freqText.trim()) ? m.freqText.trim() : ['morning','noon','evening','night'].map(k=>(m as any)[k]).filter(Boolean).join('/ '),
        duration: (m.durationText && m.durationText.trim()) ? m.durationText.trim() : (m.days?`${m.days} ${m.durationUnit || 'day(s)'}`:undefined),
        dose: m.qty ? String(m.qty) : undefined,
        instruction: m.instruction || undefined,
        route: m.route || undefined,
      }))
    
    // Get doctor details from saved settings, fallback to API data
    let doctor = { name: doctorInfo?.name || doc?.name || '-', qualification: doctorInfo?.qualification || '', departmentName: doctorInfo?.departmentName || '', phone: doctorInfo?.phone || '' }
    try {
      const dk = `doctor.details.${doc?.id || 'anon'}`
      const dRaw = localStorage.getItem(dk)
      if (dRaw) {
        const savedDetails = JSON.parse(dRaw)
        doctor = {
          name: savedDetails.name || doctor.name,
          qualification: savedDetails.qualification || doctor.qualification,
          departmentName: savedDetails.departmentName || doctor.departmentName,
          phone: savedDetails.phone || doctor.phone
        }
      }
    } catch {}
    // Capture latest diagnostic display if available
    try { const dd = diagRef.current?.getDisplay?.(); if (dd) setForm(f=>({ ...f, diagDisplay: dd })) } catch {}
    // Capture latest vitals display/normalized if available
    try { const d = vitalsRef.current?.getDisplay?.(); if (d) setForm(f=>({ ...f, vitalsDisplay: d })) } catch {}
    let vRaw = undefined as any
    try { vRaw = vitalsRef.current?.getNormalized?.() } catch {}
    const hasVitals = vRaw && Object.values(vRaw).some((x: any) => x != null && !(typeof x === 'number' && isNaN(x)))
    let vitals: any = undefined
    if (hasVitals) vitals = vRaw
    else if (Object.keys((form as any).vitalsNormalized||{}).length) vitals = (form as any).vitalsNormalized
    else if ((form as any).vitalsDisplay && Object.values((form as any).vitalsDisplay).some(Boolean)) {
      const d: any = (form as any).vitalsDisplay
      const n = (x?: any) => { const v = parseFloat(String(x||'').trim()); return isFinite(v)? v : undefined }
      vitals = {
        pulse: n(d.pulse),
        temperatureC: n(d.temperature),
        bloodPressureSys: n(d.bloodPressureSys),
        bloodPressureDia: n(d.bloodPressureDia),
        respiratoryRate: n(d.respiratoryRate),
        bloodSugar: n(d.bloodSugar),
        weightKg: n(d.weightKg),
        heightCm: n(d.height),
        spo2: n(d.spo2),
      }
    }
    // Build diagnostics data either from live ref or persisted display
    let dPrint: any = {}
    try { dPrint = diagRef.current?.getData?.() || {} } catch {}
    if ((!dPrint?.tests || !dPrint.tests.length)){
      const dd = (form as any).diagDisplay || {}
      const tests = String(dd.testsText||'').split(/\n|,/).map((s:string)=>s.trim()).filter(Boolean)
      dPrint = { tests }
    }
    const tpl: PrescriptionPdfTemplate = prescriptionTemplate
    console.log('openPrint - sel:', sel)
    console.log('openPrint - tokenNo being passed:', (sel as any)?.tokenNo)
    await previewPrescriptionPdf({ doctor, settings: settingsNorm, patient, items, primaryComplaint: form.primaryComplaint, primaryComplaintHistory: form.primaryComplaintHistory, familyHistory: form.familyHistory, allergyHistory: form.allergyHistory, treatmentHistory: form.treatmentHistory, history: form.history, examFindings: form.examFindings, diagnosis: form.diagnosis, advice: form.advice, vitals, labTests: form.labTestsText.split(/\n|,/).map(s=>s.trim()).filter(Boolean), diagnosticTests: Array.isArray(dPrint.tests)?dPrint.tests:[], tokenNo: (sel as any)?.tokenNo, createdAt: new Date() }, tpl)
  }

  const goTab = (tab: 'details'|'vitals'|'labs'|'diagnostics'|'medication') => {
    if (activeTab === 'vitals') {
      try {
        const disp = vitalsRef.current?.getDisplay?.()
        const norm = vitalsRef.current?.getNormalized?.()
        setForm(f=>({ ...f, vitalsDisplay: disp || f.vitalsDisplay, vitalsNormalized: norm || f.vitalsNormalized }))
      } catch {}
    }
    if (activeTab === 'diagnostics') {
      try {
        const dd = diagRef.current?.getDisplay?.()
        if (dd) setForm(f=>({ ...f, diagDisplay: dd }))
      } catch {}
    }
    if (activeTab === 'medication') {
      try {
        const medsData = medsRef.current?.getData?.()
        if (medsData) setForm(f=>({ ...f, meds: medsData }))
      } catch {}
    }
    setActiveTab(tab)
  }

  function resetForms(){
    setForm({ patientKey: '', primaryComplaint: '', primaryComplaintHistory: '', familyHistory: '', allergyHistory: '', treatmentHistory: '', history: '', examFindings: '', diagnosis: '', advice: '', labTestsText: '', vitalsDisplay: {}, vitalsNormalized: {}, diagDisplay: { testsText: '' }, meds: [{ name: '', morning: '', noon: '', evening: '', night: '', qty: '', route: '', instruction: '', durationText: '', freqText: '' }] })
    try { vitalsRef.current?.setDisplay?.({}) } catch {}
    try { diagRef.current?.setDisplay?.({ testsText: '' }) } catch {}
    setActiveTab('details')
  }

  function applyTemplate(t: any) {
    if (!t) return
    const meds: MedicineRow[] = (t.items || []).map((it: any) => ({
      name: it.name || '',
      qty: it.dose || '',
      route: it.route || '',
      instruction: it.instruction || '',
      durationText: it.duration || '',
      freqText: it.frequency || '',
      morning: '', noon: '', evening: '', night: '', days: '', durationUnit: 'day(s)' as const,
    }))
    const diagTestsText = (t.diagnosticTests || []).join('\n')
    setForm(f => ({
      ...f,
      primaryComplaint: t.primaryComplaint || f.primaryComplaint,
      primaryComplaintHistory: t.primaryComplaintHistory || f.primaryComplaintHistory,
      familyHistory: t.familyHistory || f.familyHistory,
      allergyHistory: t.allergyHistory || f.allergyHistory,
      treatmentHistory: t.treatmentHistory || f.treatmentHistory,
      history: t.history || f.history,
      examFindings: t.examFindings || f.examFindings,
      diagnosis: t.diagnosis || f.diagnosis,
      advice: t.advice || f.advice,
      labTestsText: (t.labTests || []).join('\n') || f.labTestsText,
      diagDisplay: { testsText: diagTestsText },
      meds: meds.length ? meds : f.meds,
    }))
    try { diagRef.current?.setDisplay?.({ testsText: diagTestsText }) } catch {}
    setToast({ type: 'success', message: `Applied template: ${t.name}` })
  }

  const sel = myPatients.find(t => `${t.id}` === form.patientKey)
  const [patientDetails, setPatientDetails] = useState<any>(null)

  useEffect(() => {
    if (!sel?.mrNo) {
      setPatientDetails(null)
      return
    }
    ;(async () => {
      try {
        const resp: any = await labApi.getPatientByMrn(sel.mrNo)
        if (resp?.patient) setPatientDetails(resp.patient)
      } catch {}
    })()
  }, [sel?.mrNo])

  // Suggestions loaded from database (via dbSuggestions state)
  const sugPrimary = useMemo(() => dbSuggestions.primaryComplaint, [dbSuggestions.primaryComplaint])
  const sugHistory = useMemo(() => dbSuggestions.history, [dbSuggestions.history])
  const sugPrimHist = useMemo(() => dbSuggestions.primaryComplaintHistory, [dbSuggestions.primaryComplaintHistory])
  const sugFamily = useMemo(() => dbSuggestions.familyHistory, [dbSuggestions.familyHistory])
  const sugAllergy = useMemo(() => dbSuggestions.allergyHistory, [dbSuggestions.allergyHistory])
  const sugExam = useMemo(() => dbSuggestions.examFindings, [dbSuggestions.examFindings])
  const sugDiagnosis = useMemo(() => dbSuggestions.diagnosis, [dbSuggestions.diagnosis])
  const sugAdvice = useMemo(() => dbSuggestions.advice, [dbSuggestions.advice])
  const sugLabTests = useMemo(() => labTestSuggestions.length ? labTestSuggestions : dbSuggestions.labTest, [labTestSuggestions, dbSuggestions.labTest])
  const sugDiagTests = useMemo(() => dbSuggestions.diagTest, [dbSuggestions.diagTest])
  // Default suggestions for medication fields
  const defaultDoses = ['1 mg', '2 mg', '5 mg', '10 mg', '20 mg', '25 mg', '50 mg', '100 mg', '200 mg', '250 mg', '500 mg', '1 g', '1 ml', '2 ml', '5 ml', '10 ml', '1 tsp', '1 tbsp', '1 drop', '2 drops', '1 puff', '1 tablet', '2 tablets', '1 capsule', '1 sachet']
  const defaultRoutes = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Sublingual', 'Rectal', 'Vaginal', 'Inhalation', 'Nasal', 'Ocular', 'Ear drops', 'Local application']
  const defaultInstructions = ['Before meals', 'After meals', 'With meals', 'Empty stomach', 'Bed time', 'Morning', 'Night', 'Once daily', 'Twice daily', 'Thrice daily', 'Four times daily', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'SOS', 'PRN', 'Stat', 'As directed']
  const defaultDurations = ['1 day', '2 days', '3 days', '5 days', '7 days', '10 days', '14 days', '1 week', '2 weeks', '3 weeks', '4 weeks', '1 month', '2 months', '3 months', '6 months']
  const defaultFrequencies = ['Once daily (OD)', 'Twice daily (BD)', 'Thrice daily (TID)', 'Four times daily (QID)', 'Every morning', 'Every night', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'SOS', 'Stat', 'Alternate days', 'Weekly', 'Monthly']

  // Suggestions loaded from database (via dbSuggestions state) + defaults for medication
  const sugDose = useMemo(() => {
    const stored = dbSuggestions.dose
    return stored.length ? stored : defaultDoses
  }, [dbSuggestions.dose])
  const sugInstr = useMemo(() => {
    const stored = dbSuggestions.instruction
    return stored.length ? stored : defaultInstructions
  }, [dbSuggestions.instruction])
  const sugRoute = useMemo(() => {
    const stored = dbSuggestions.route
    return stored.length ? stored : defaultRoutes
  }, [dbSuggestions.route])
  const sugDuration = useMemo(() => {
    const stored = dbSuggestions.durationTag
    return stored.length ? stored : defaultDurations
  }, [dbSuggestions.durationTag])
  const sugFreq = useMemo(() => {
    const stored = dbSuggestions.frequencyTag
    return stored.length ? stored : defaultFrequencies
  }, [dbSuggestions.frequencyTag])
  // Vitals suggestions from database
  const sugVPulse = useMemo(() => dbSuggestions.vitals.pulse, [dbSuggestions.vitals.pulse])
  const sugVTemp = useMemo(() => dbSuggestions.vitals.temperature, [dbSuggestions.vitals.temperature])
  const sugVSys = useMemo(() => dbSuggestions.vitals.sys, [dbSuggestions.vitals.sys])
  const sugVDia = useMemo(() => dbSuggestions.vitals.dia, [dbSuggestions.vitals.dia])
  const sugVResp = useMemo(() => dbSuggestions.vitals.resp, [dbSuggestions.vitals.resp])
  const sugVSugar = useMemo(() => dbSuggestions.vitals.sugar, [dbSuggestions.vitals.sugar])
  const sugVWeight = useMemo(() => dbSuggestions.vitals.weight, [dbSuggestions.vitals.weight])
  const sugVHeight = useMemo(() => dbSuggestions.vitals.height, [dbSuggestions.vitals.height])
  const sugVSpo2 = useMemo(() => dbSuggestions.vitals.spo2, [dbSuggestions.vitals.spo2])

  async function printReferral(){
    try {
      const s: any = await hospitalApi.getSettings()
      const settingsNorm = { name: s?.name || 'Hospital', address: s?.address || '', phone: s?.phone || '', logoDataUrl: s?.logoDataUrl || '' }
      const d = referralFormRef.current?.getPreviewData?.()
      if (!d) { setToast({ type: 'error', message: 'Referral form not ready' }); return }
      await previewIpdReferralPdf({ settings: settingsNorm, patient: d.patient, referral: d.referral })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to open referral preview' })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 dark:bg-[#0b1220]">
      <div className="no-print">
        {/* Modern Sticky Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200 dark:shadow-none">
                <Stethoscope size={22} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">e-Prescription</h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Digital Consultation & Medicine Management</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800 sm:flex">
                <button 
                  type="button" 
                  onClick={() => setRxMode('electronic')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${rxMode === 'electronic' ? 'bg-white text-violet-600 shadow-sm dark:bg-slate-700 dark:text-violet-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  <Layout size={14} /> Electronic
                </button>
                <button 
                  type="button" 
                  onClick={() => setRxMode('manual')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${rxMode === 'manual' ? 'bg-white text-violet-600 shadow-sm dark:bg-slate-700 dark:text-violet-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  <FileText size={14} /> Manual Scan
                </button>
              </div>
              
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
              
              <div className="flex items-center gap-2">
                <button type="button" onClick={resetForms} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                  <RotateCcw size={16} /> <span className="hidden sm:inline">Reset</span>
                </button>
                <button 
                  type="button" 
                  onClick={save}
                  disabled={!form.patientKey}
                  className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700 active:scale-[0.98] disabled:opacity-50 dark:shadow-none"
                >
                  <Save size={16} /> Save Prescription
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            
            {/* Left Sidebar: Patient & Queue */}
            <aside className="space-y-6 lg:col-span-3">
              {/* Date Filter */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <Calendar size={14} /> Queue Period
                  </h3>
                </div>
                <div className="space-y-3 p-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">From</label>
                    <DatePickerModern value={from} onChange={setFrom} className="w-full" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">To</label>
                    <DatePickerModern value={to} onChange={setTo} className="w-full" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={()=>{ const t = new Date().toISOString().slice(0,10); setFrom(t); setTo(t) }} className="flex-1 rounded-md bg-slate-100 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">Today</button>
                    <button type="button" onClick={()=>{ setFrom(''); setTo('') }} className="flex-1 rounded-md bg-slate-100 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">Clear</button>
                  </div>
                </div>
              </div>

              {/* Patient Selection */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <User size={14} /> Patient Queue
                  </h3>
                </div>
                <div className="p-4">
                  <div className="relative">
                    <select 
                      value={form.patientKey} 
                      onChange={e=>setForm(f=>({ ...f, patientKey: e.target.value }))} 
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm font-medium outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Select a patient...</option>
                      {myPatients.map(p => (
                        <option key={p.id} value={p.id}>{p.patientName} ({p.mrNo})</option>
                      ))}
                    </select>
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                  
                  {myPatients.length === 0 && (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-center dark:border-slate-800">
                      <Clock size={24} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                      <p className="text-xs font-medium text-slate-400">No pending patients in your queue</p>
                    </div>
                  )}

                  {showLoadPrevButton && (
                    <button
                      type="button"
                      onClick={loadPreviousPrescription}
                      className="group mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 transition-all hover:bg-amber-100 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-400"
                    >
                      <History size={16} className="transition-transform group-hover:rotate-[-18deg]" /> Load Last Rx
                    </button>
                  )}
                </div>
              </div>

              {/* Patient Profile Card (When Selected) */}
              {sel && (
                <div className="overflow-hidden rounded-2xl border border-violet-100 bg-linear-to-b from-violet-50 to-white shadow-sm dark:border-violet-900/20 dark:from-violet-900/10 dark:to-slate-900">
                  <div className="border-b border-violet-100 bg-violet-100/30 px-4 py-3 dark:border-violet-900/30 dark:bg-violet-900/30">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">Patient Profile</h3>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-lg font-bold text-white">
                        {sel.patientName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{sel.patientName}</h4>
                        <p className="text-xs font-bold text-violet-600 dark:text-violet-400">MRN: {sel.mrNo}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 gap-y-3 gap-x-2 border-t border-violet-100 pt-4 dark:border-violet-900/20">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">Age / Gender</p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{patientDetails?.age || '-'} / {patientDetails?.gender || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">Father/Guardian</p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{patientDetails?.fatherName || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Phone</p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{patientDetails?.phoneNormalized || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Address</p>
                        <p className="text-xs font-semibold leading-relaxed text-slate-700 dark:text-slate-300 line-clamp-2">{patientDetails?.address || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </aside>

            {/* Main Content: Tabs and Forms */}
            <div className="lg:col-span-9">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {/* Modern Tabs */}
                <div className="border-b border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-800/50">
                  <nav className="flex flex-wrap gap-1 sm:flex-nowrap">
                    {[
                      { id: 'details', label: 'Clinical Details', icon: ClipboardList },
                      { id: 'medication', label: 'Medication', icon: Beaker },
                      { id: 'vitals', label: 'Vitals', icon: Activity },
                      { id: 'labs', label: 'Lab Orders', icon: Search },
                      { id: 'diagnostics', label: 'Diagnostics', icon: ClipboardList },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => goTab(tab.id as any)}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all sm:flex-none sm:justify-start ${
                          activeTab === tab.id
                            ? 'bg-white text-violet-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-700 dark:text-violet-400 dark:ring-slate-600'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300'
                        }`}
                      >
                        <tab.icon size={16} />
                        <span className="hidden md:inline">{tab.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-6">
                  {/* Template Selection inside Main Area */}
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-violet-50/50 p-4 ring-1 ring-violet-100 dark:bg-violet-900/10 dark:ring-violet-900/20">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-violet-600 p-1.5 text-white">
                        <Plus size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Smart Templates</h4>
                        <p className="text-[10px] font-medium text-slate-500">Quickly apply pre-filled clinical data</p>
                      </div>
                    </div>
                    <div className="w-full max-w-xs sm:w-auto">
                      <select
                        onChange={e => {
                          const id = e.target.value
                          if (!id) return
                          const t = templates.find(x => x._id === id)
                          if (t) applyTemplate(t)
                          e.target.value = ''
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition-shadow focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="">Select template...</option>
                        {templates.map(t => (
                          <option key={t._id} value={t._id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {rxMode === 'manual' && (
                    <div className="mb-8 animate-in fade-in slide-in-from-top-4">
                      <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center transition-colors hover:border-violet-300 dark:border-slate-800 dark:hover:border-violet-700">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400">
                          <FileText size={32} />
                        </div>
                        <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Scan Manual Prescription</h3>
                        <p className="mt-1 text-sm text-slate-500">Upload a PDF or Image of the handwritten prescription</p>
                        
                        <div className="mt-6">
                          <input
                            id="manual-file"
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={e=>onManualFile(e.target.files?.[0])}
                            className="hidden"
                          />
                          <label 
                            htmlFor="manual-file"
                            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition-all hover:bg-violet-700 hover:shadow-violet-300 active:scale-95 dark:shadow-none"
                          >
                            <Plus size={18} /> Select File
                          </label>
                        </div>

                        {manualAttachmentError && (
                          <div className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-rose-600">
                            <AlertCircle size={16} /> {manualAttachmentError}
                          </div>
                        )}
                        
                        {manualAttachment?.fileName && (
                          <div className="mt-4 flex flex-col items-center gap-3">
                            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                              Selected: {manualAttachment.fileName}
                            </div>
                            {manualAttachment?.dataUrl && (manualAttachment.mimeType || '').startsWith('image/') && (
                              <div className="relative overflow-hidden rounded-xl border border-slate-200 shadow-xl dark:border-slate-800">
                                <img src={manualAttachment.dataUrl} alt="Prescription" className="max-h-64 w-auto" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="min-h-[400px]">
                    {activeTab === 'details' && (
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-right-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Primary Complaint</label>
                          <SuggestField 
                            rows={3} 
                            value={form.primaryComplaint} 
                            onChange={v=>setForm(f=>({ ...f, primaryComplaint: v }))} 
                            suggestions={sugPrimary} 
                            className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Medical History / Risk Factors</label>
                          <SuggestField 
                            rows={3} 
                            value={form.history} 
                            onChange={v=>setForm(f=>({ ...f, history: v }))} 
                            suggestions={sugHistory} 
                            className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">History of Complaint</label>
                          <SuggestField 
                            rows={3} 
                            value={form.primaryComplaintHistory} 
                            onChange={v=>setForm(f=>({ ...f, primaryComplaintHistory: v }))} 
                            suggestions={sugPrimHist} 
                            className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Examination Findings</label>
                          <SuggestField 
                            rows={3} 
                            value={form.examFindings} 
                            onChange={v=>setForm(f=>({ ...f, examFindings: v }))} 
                            suggestions={sugExam} 
                            className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Diagnosis / Disease</label>
                              <SuggestField 
                                as="input" 
                                value={form.diagnosis} 
                                onChange={v=>setForm(f=>({ ...f, diagnosis: v }))} 
                                suggestions={sugDiagnosis} 
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Advice / Referral</label>
                              <SuggestField 
                                rows={1} 
                                value={form.advice} 
                                onChange={v=>setForm(f=>({ ...f, advice: v }))} 
                                suggestions={sugAdvice} 
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="col-span-1 grid grid-cols-2 gap-4 md:col-span-2">
                           <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Family History</label>
                            <SuggestField rows={2} value={form.familyHistory} onChange={v=>setForm(f=>({ ...f, familyHistory: v }))} suggestions={sugFamily} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Allergy History</label>
                            <SuggestField rows={2} value={form.allergyHistory} onChange={v=>setForm(f=>({ ...f, allergyHistory: v }))} suggestions={sugAllergy} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'medication' && (
                      <div className="animate-in fade-in slide-in-from-right-4">
                        <PrescriptionMedication
                          ref={medsRef}
                          initialMedicines={form.meds}
                          onChange={(meds) => setForm(f => ({ ...f, meds }))}
                          suggestions={{
                            medName: medNameSuggestions,
                            dose: sugDose,
                            route: sugRoute,
                            instruction: sugInstr,
                            duration: sugDuration,
                            frequency: sugFreq,
                          }}
                        />
                      </div>
                    )}

                    {activeTab === 'vitals' && (
                      <div className="animate-in fade-in slide-in-from-right-4">
                        <PrescriptionVitals
                          ref={vitalsRef}
                          initial={(form as any).vitalsDisplay}
                          suggestions={{
                            pulse: sugVPulse,
                            temperature: sugVTemp,
                            bloodPressureSys: sugVSys,
                            bloodPressureDia: sugVDia,
                            respiratoryRate: sugVResp,
                            bloodSugar: sugVSugar,
                            weightKg: sugVWeight,
                            height: sugVHeight,
                            spo2: sugVSpo2,
                          }}
                        />
                      </div>
                    )}

                    {activeTab === 'diagnostics' && (
                      <div className="animate-in fade-in slide-in-from-right-4">
                        <PrescriptionDiagnosticOrders ref={diagRef} initialTestsText={(form as any).diagDisplay?.testsText} suggestionsTests={sugDiagTests} />
                      </div>
                    )}

                    {activeTab === 'labs' && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Search & Order Lab Tests</label>
                          <SuggestField 
                            mode="lab-tests" 
                            rows={6} 
                            value={form.labTestsText} 
                            onChange={v=>{ setForm(f=>({ ...f, labTestsText: v })); searchLabTests(v) }} 
                            suggestions={sugLabTests} 
                            placeholder="Type test name (e.g. CBC, LFT, Lipid Profile)..." 
                            className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-sm outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                        <div className="rounded-xl bg-blue-50/50 p-4 text-xs font-medium text-blue-600 ring-1 ring-blue-100 dark:bg-blue-900/10 dark:text-blue-400 dark:ring-blue-900/20">
                          Tip: Use commas or new lines to separate multiple lab tests.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Quick Actions */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={openPrint} 
                      disabled={!form.patientKey}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <Printer size={18} /> Preview & Print
                    </button>
                    <button 
                      type="button" 
                      onClick={()=>setOpenReferral(true)} 
                      disabled={!sel}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <Plus size={18} /> Refer to IPD
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {saved && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 animate-in fade-in zoom-in dark:bg-emerald-900/20 dark:text-emerald-400">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" /> Saved to Records
                      </div>
                    )}
                    <button 
                      type="button" 
                      onClick={save}
                      disabled={!form.patientKey}
                      className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition-all hover:bg-violet-700 hover:shadow-violet-300 active:scale-[0.98] disabled:opacity-50 dark:shadow-none"
                    >
                      Finalize & Print <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      {openReferral && (
        <div id="referral-print" className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-2 sm:px-4">
          <style>{`@media print { body * { visibility: hidden !important; } #referral-print, #referral-print * { visibility: visible !important; } #referral-print { position: static !important; inset: auto !important; background: transparent !important; } }`}</style>
          <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="text-base font-semibold text-slate-900">Refer to IPD</div>
              <div className="flex items-center gap-2">
                <button onClick={printReferral} className="rounded-md border border-blue-900 bg-blue-900 px-3 py-1 text-sm text-white hover:bg-blue-950">Print</button>
                <button onClick={()=>setOpenReferral(false)} className="rounded-md border border-blue-900 bg-blue-900 px-3 py-1 text-sm text-white hover:bg-blue-950">Close</button>
              </div>
            </div>
            <div className="max-h-[85vh] overflow-y-auto p-3 sm:p-4">
              <Doctor_IpdReferralForm ref={referralFormRef} mrn={sel?.mrNo} doctor={{ id: doc?.id, name: doc?.name }} onSaved={()=>setOpenReferral(false)} />
            </div>
          </div>
        </div>
      )}

      <PrescriptionPrint
        printId="prescription-print"
        doctor={{ name: doc?.name, specialization: doctorInfo?.specialization, qualification: doctorInfo?.qualification, departmentName: doctorInfo?.departmentName, phone: doctorInfo?.phone }}
        settings={settings}
        patient={{ name: sel?.patientName || '-', mrn: sel?.mrNo || '-', gender: pat?.gender, fatherName: pat?.fatherName, age: pat?.age, phone: pat?.phone, address: pat?.address }}
        items={(medsRef.current?.getData?.() || form.meds)
          .filter((m: MedicineRow) => m.name?.trim())
          .map((m: MedicineRow) => ({
            name: m.name,
            frequency: ['morning','noon','evening','night'].map(k=>(m as any)[k]).filter(Boolean).join('/ '),
            duration: m.days?`${m.days} ${m.durationUnit || 'day(s)'}`:undefined,
            dose: m.qty ? String(m.qty) : undefined,
            instruction: m.instruction || undefined,
            route: m.route || undefined,
          }))}
        labTests={form.labTestsText.split(/\n|,/).map(s=>s.trim()).filter(Boolean)}
        labNotes={undefined}
        diagnosticTests={(diagRef.current?.getData?.()?.tests)||[]}
        diagnosticNotes={undefined}
        primaryComplaint={form.primaryComplaint}
        primaryComplaintHistory={form.primaryComplaintHistory}
        familyHistory={form.familyHistory}
        allergyHistory={form.allergyHistory}
        treatmentHistory={form.treatmentHistory}
        history={form.history}
        examFindings={form.examFindings}
        diagnosis={form.diagnosis}
        advice={form.advice}
        createdAt={new Date()}
      />
      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
}
