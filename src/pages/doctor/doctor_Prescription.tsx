import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { hospitalApi, labApi, pharmacyApi, diagnosticApi } from '../../utils/api'
import { invalidateCache } from '../../utils/apiCache'
import { previewPrescriptionPdf } from '../../utils/prescriptionPdf'
import type { PrescriptionPdfTemplate } from '../../utils/prescriptionPdf'
import { previewPreAnesthesiaPdf } from '../../utils/preAnesthesiaPdf'
import Doctor_IpdReferralForm from '../../components/doctor/Doctor_IpdReferralForm'
import { previewIpdReferralPdf } from '../../utils/ipdReferralPdf'
import PrescriptionPrint from '../../components/doctor/PrescriptionPrint'
import PrescriptionMedication, { type MedicineRow } from '../../components/doctor/PrescriptionMedication'
import { getSavedPrescriptionLanguage, type PrescriptionLanguage } from '../../utils/prescriptionUrdu'
import PrescriptionVitals from '../../components/doctor/PrescriptionVitals'
import PrescriptionDiagnosticOrders from '../../components/doctor/PrescriptionDiagnosticOrders'
import Doctor_PreAnesthesiaForm from '../../components/doctor/Doctor_PreAnesthesiaForm'
import type { PreAnesthesiaData } from '../../components/doctor/Doctor_PreAnesthesiaForm'
import SuggestField from '../../components/SuggestField'
import Toast from '../../components/ui/Toast'
import type { ToastState } from '../../components/ui/Toast'
import DoctorCustomEntriesModal from '../../components/doctor/DoctorCustomEntriesModal'
import PreviousPrescriptionsModal from '../../components/doctor/PreviousPrescriptionsModal'
import DentalChart, { type DentalChartValue } from '../../components/doctor/DentalChart'
import EyeExamination, { emptyEyeExamination, type EyeExaminationValue } from '../../components/doctor/EyeExamination'
import { resolveDoctorMode } from '../../utils/doctorDepartment'
import { useSystemConfig } from '../../contexts/SystemConfigContext'
import { getDepartmentModule } from '../../config/departmentModules'
import { previewDepartmentRxPdf } from '../../utils/prescription/templates/departmentRx'

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
  const emptyMedRow = (): MedicineRow => ({
    name: '',
    morning: '',
    noon: '',
    evening: '',
    night: '',
    days: '',
    qty: '',
    route: '',
    instruction: '',
    durationUnit: 'day(s)',
    durationText: '',
    freqText: '',
  })
  const emptyPreAnesthesia = (): PreAnesthesiaData => ({
    isApplied: false,
    history: {
      cvs: '',
      respiratory: '',
      renal: '',
      hepatic: '',
      diabetic: '',
      neurology: '',
      previousAnesthesia: '',
      allergies: '',
    },
    examination: {
      mallampatiScore: '',
      asaClass: '',
      airway: '',
      teeth: '',
      notes: '',
    },
    recommendation: '',
  })
  const emptyDentalChart = (): DentalChartValue => ({ teeth: [], generalNotes: '' })
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
    nextFollowUp: '',
    labTestsText: '',
    vitalsDisplay: {},
    vitalsNormalized: {},
    diagDisplay: { testsText: '' },
    meds: Array.from({ length: 5 }, () => emptyMedRow()) as MedicineRow[],
    preAnesthesia: emptyPreAnesthesia(),
    dentalChart: emptyDentalChart() as DentalChartValue,
    eyeExamination: emptyEyeExamination() as EyeExaminationValue,
    departmentData: null as any,
  })
  const [saved, setSaved] = useState(false)
  const [settings] = useState<{ name: string; address: string; phone: string; logoDataUrl?: string }>({ name: 'Hospital', address: '', phone: '' })
  const [pat] = useState<{ address?: string; phone?: string; fatherName?: string; gender?: string; age?: string } | null>(null)
  const [doctorInfo, setDoctorInfo] = useState<{ name?: string; specialization?: string; phone?: string; qualification?: string; departmentName?: string; doctorClinicalModule?: string; departmentClinicalModule?: string } | null>(null)
  // Department-specific prescription mode + super-admin module gating.
  // Precedence: doctor.clinicalModule → department.clinicalModule → name inference.
  const { getSubModuleEnabled } = useSystemConfig()
  const deptMode = useMemo(() => resolveDoctorMode(doctorInfo?.departmentName, doctorInfo?.specialization, {
    doctorClinicalModule: doctorInfo?.doctorClinicalModule,
    departmentClinicalModule: doctorInfo?.departmentClinicalModule,
  }), [doctorInfo?.departmentName, doctorInfo?.specialization, doctorInfo?.doctorClinicalModule, doctorInfo?.departmentClinicalModule])
  const dentalModuleOn = getSubModuleEnabled('hospital', 'dentalRx')
  const eyeModuleOn = getSubModuleEnabled('hospital', 'eyeRx')
  const showDental = deptMode.isDental && dentalModuleOn
  const showEye = deptMode.isEye && eyeModuleOn
  // Registry-driven departments (cardiac, breast-onco, omfs, neuro)
  const activeDept = useMemo(() => getDepartmentModule(deptMode.departmentKey), [deptMode.departmentKey])
  const showDept = !!activeDept && getSubModuleEnabled('hospital', activeDept.moduleFlag)
  // Active department form value (falls back to the module's empty shape until edited)
  const deptValue = (form as any).departmentData ?? activeDept?.empty?.() ?? {}
  const [prescriptionTemplate, setPrescriptionTemplate] = useState<PrescriptionPdfTemplate>('hospital-rx')
  const [prescriptionLanguage, setPrescriptionLanguage] = useState<PrescriptionLanguage>('english')
  const [openReferral, setOpenReferral] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const referralFormRef = useRef<any>(null)
  const vitalsRef = useRef<any>(null)
  const diagRef = useRef<any>(null)
  const medsRef = useRef<any>(null)
  const [medNameSuggestions, setMedNameSuggestions] = useState<string[]>([])
  const [labTestSuggestions, setLabTestSuggestions] = useState<string[]>([])
  const [diagnosticTestSuggestions, setDiagnosticTestSuggestions] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'details'|'vitals'|'labs'|'diagnostics'|'medication'|'anesthesia'|'dental'|'eye'|'department'>('details')
  const [showLoadPrevButton, setShowLoadPrevButton] = useState(false)
  const [prevPrescriptionsModalOpen, setPrevPrescriptionsModalOpen] = useState(false)
  const [heldPrescriptionsModalOpen, setHeldPrescriptionsModalOpen] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [customEntriesModalOpen, setCustomEntriesModalOpen] = useState(false)
  const [customEntriesCategory, setCustomEntriesCategory] = useState('primaryComplaint')
  const [doctorCustomSuggestions, setDoctorCustomSuggestions] = useState<{
    primaryComplaint: string[]
    history: string[]
    primaryComplaintHistory: string[]
    familyHistory: string[]
    allergyHistory: string[]
    treatmentHistory: string[]
    examFindings: string[]
    diagnosis: string[]
    advice: string[]
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
        const res: any = await diagnosticApi.listTests({ q: '', page: 1, limit: 2000 })
        const tests: any[] = res?.tests ?? res?.items ?? res ?? []
        const names = tests.map((t: any) => String(t?.name || t?.testName || t || '').trim()).filter(Boolean)
        if (!cancelled) setDiagnosticTestSuggestions(Array.from(new Set(names)).slice(0, 2000))
      } catch {
        if (!cancelled) setDiagnosticTestSuggestions([])
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

  // Load prescription template and language from database
  useEffect(() => {
    ;(async () => {
      try {
        if (doc?.id) {
          const doctorData: any = await hospitalApi.getDoctor(doc.id)
          if (doctorData?.prescriptionTemplate) {
            setPrescriptionTemplate(doctorData.prescriptionTemplate)
          }
          if (doctorData?.prescriptionLanguage) {
            setPrescriptionLanguage(doctorData.prescriptionLanguage)
          } else {
            // Try to load from localStorage as fallback
            const savedLang = getSavedPrescriptionLanguage(doc.id)
            setPrescriptionLanguage(savedLang)
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

  // Load doctor custom entries
  useEffect(() => {
    ;(async () => {
      try {
        if (!doc?.id) return
        const categories = ['primaryComplaint', 'history', 'primaryComplaintHistory', 'familyHistory', 'allergyHistory', 'treatmentHistory', 'examFindings', 'diagnosis', 'advice']
        const custom: any = {
          primaryComplaint: [],
          history: [],
          primaryComplaintHistory: [],
          familyHistory: [],
          allergyHistory: [],
          treatmentHistory: [],
          examFindings: [],
          diagnosis: [],
          advice: [],
        }
        for (const cat of categories) {
          try {
            const res = await hospitalApi.getDoctorCustomEntriesByCategory(doc.id, cat)
            custom[cat] = res?.entryTexts || []
          } catch {}
        }
        setDoctorCustomSuggestions(custom)
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
          hospitalApi.listDepartments({ limit: 1000 }) as any,
        ])
        const doctors: any[] = drRes?.doctors || []
        const depArray: any[] = ((depRes as any)?.departments || (depRes as any) || []) as any[]
        const d = doctors.find(x => String(x._id || x.id) === String(doc.id))
        const dep = d?.primaryDepartmentId ? depArray.find((z: any)=> String(z._id||z.id) === String(d.primaryDepartmentId)) : null
        const deptName = dep?.name || ''
        if (d) setDoctorInfo({ name: d.name || '', specialization: d.specialization || '', phone: d.phone || '', qualification: d.qualification || '', departmentName: deptName, doctorClinicalModule: d.clinicalModule || '', departmentClinicalModule: dep?.clinicalModule || '' })
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
        encounterId: t.encounterId?._id || String(t.encounterId || ''),
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
      return
    }

    ;(async () => {
      try {
        const res: any = await hospitalApi.listPrescriptions({ patientMrn: mrn, page: 1, limit: 1 })
        const pres = (res?.prescriptions || [])[0]
        if (pres) {
          setShowLoadPrevButton(true)
        } else {
          setShowLoadPrevButton(false)
        }
      } catch {
        setShowLoadPrevButton(false)
      }
    })()
  }, [form.patientKey, tokens])

  // Auto-update token status to in-progress when a queued patient is selected for prescribing
  useEffect(() => {
    const sel = tokens.find(t => `${t.id}` === form.patientKey)
    if (!sel?.id || sel.status !== 'queued') return
    ;(async () => {
      try {
        await hospitalApi.updateTokenStatus(sel.id, 'in-progress')
        invalidateCache('/hospital/tokens')
        // Refresh token list so status is reflected locally
        loadTokens()
      } catch {
        // Ignore token status update errors - don't block prescribing
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.patientKey])

  // Load vitals from token when patient is selected
  useEffect(() => {
    const sel = tokens.find(t => `${t.id}` === form.patientKey)
    if (!sel?.id) return

    ;(async () => {
      try {
        const tokenRes: any = await hospitalApi.getToken(sel.id)
        if (tokenRes?.token?.vitals) {
          const v = tokenRes.token.vitals
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
            ar: v.ar != null ? String(v.ar) : '',
            va: v.va != null ? String(v.va) : '',
            iop: v.iop != null ? String(v.iop) : '',
          }
          setForm(f => ({ ...f, vitalsDisplay, vitalsNormalized: v }))
          setTimeout(() => {
            try { vitalsRef.current?.setDisplay?.(vitalsDisplay) } catch {}
          }, 50)
        }
      } catch {
        // Ignore errors, vitals may not exist
      }
    })()
  }, [form.patientKey, tokens])

  // Auto-load existing prescription for the current encounter when patient is selected
  useEffect(() => {
    const sel = tokens.find(t => `${t.id}` === form.patientKey)
    if (!sel?.encounterId) return

    ;(async () => {
      try {
        const existingRes: any = await hospitalApi.getPrescriptionByEncounterId(sel.encounterId)
        const existingPres = existingRes?.prescription
        if (existingPres && Array.isArray(existingPres.items) && existingPres.items.length > 0) {
          loadPreviousPrescription(existingPres)
        }
      } catch {
        // No existing prescription for this encounter
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.patientKey])

  // Manual function to load previous prescription data
  const loadPreviousPrescription = async (prescription: any) => {
    if (!prescription) return

    const pres = prescription
    // meds mapping
    const meds: MedicineRow[] = (pres.items || []).map((it: any) => {
      const notes = String(it?.notes || '').trim()
      let instruction = ''
      let route = ''
      try { const mi = notes.match(/Instruction:\s*([^;]+)/i); if (mi && mi[1]) instruction = mi[1].trim() } catch {}
      try { const mr = notes.match(/Route:\s*([^;]+)/i); if (mr && mr[1]) route = mr[1].trim() } catch {}

      // Handle pipe-separated medicine strings (e.g. from IPD discharge summaries)
      let name = String(it?.name || '').trim()
      let qty = it?.dose != null ? String(it.dose) : (it?.dosage != null ? String(it.dosage) : '')
      let freqText = String(it?.frequency || '').trim()
      let durationText = String(it?.duration || '').trim()
      let routeText = String(it?.route || route || '').trim()
      let instructionText = String(it?.instruction || instruction || '').trim()

      // If name is empty but medicine contains pipe-separated data, parse it
      const rawMedicine = String(it?.medicine || '').trim()
      if (!name && rawMedicine) {
        const parts = rawMedicine.split('|').map((p: string) => p.trim()).filter(Boolean)
        if (parts.length >= 2) {
          name = parts[0]
          qty = parts[1] || qty
          routeText = parts[2] || routeText
          freqText = parts[3] || freqText
        } else {
          name = rawMedicine
        }
      }

      return {
        name,
        qty,
        freqText,
        durationText,
        instruction: instructionText,
        route: routeText,
        notes: String(it?.notes || '').trim(),
        durationUnit: prescriptionLanguage === 'urdu' ? 'دن' : 'day(s)',
      }
    }).filter((m: any) => m.name)

    const labTestsText = Array.isArray(pres.labTests) ? pres.labTests.map((x: any) => String(x||'').trim()).filter(Boolean).join('\n') : ''
    const diagTestsText = Array.isArray(pres.diagnosticTests) ? pres.diagnosticTests.map((x: any) => String(x||'').trim()).filter(Boolean).join('\n') : ''

    // Convert normalized vitals to display format - fetch from token collection
    let v: any = {}
    try {
      const sel = tokens.find(t => `${t.id}` === form.patientKey)
      if (sel?.id) {
        const tokenRes: any = await hospitalApi.getToken(sel.id)
        if (tokenRes?.token?.vitals) {
          v = tokenRes.token.vitals
        }
      }
    } catch {}
    // Fallback to prescription vitals if token doesn't have vitals
    if (!v || Object.keys(v).length === 0) {
      v = pres.vitals && Object.keys(pres.vitals).length > 0 ? pres.vitals : undefined
    }
    const vitalsDisplay: any = {
      pulse: v?.pulse != null ? String(v.pulse) : '',
      temperature: v?.temperatureC != null ? String(v.temperatureC) : '',
      bloodPressureSys: v?.bloodPressureSys != null ? String(v.bloodPressureSys) : '',
      bloodPressureDia: v?.bloodPressureDia != null ? String(v.bloodPressureDia) : '',
      respiratoryRate: v?.respiratoryRate != null ? String(v.respiratoryRate) : '',
      bloodSugar: v?.bloodSugar != null ? String(v.bloodSugar) : '',
      weightKg: v?.weightKg != null ? String(v.weightKg) : '',
      height: v?.heightCm != null ? String(v.heightCm) : '',
      spo2: v?.spo2 != null ? String(v.spo2) : '',
      ar: v?.ar != null ? String(v.ar) : '',
      va: v?.va != null ? String(v.va) : '',
      iop: v?.iop != null ? String(v.iop) : '',
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
      nextFollowUp: String(pres.nextFollowUp || ''),
      labTestsText,
      vitalsDisplay: vitalsDisplay,
      vitalsNormalized: (v && Object.keys(v).length > 0) ? v : f.vitalsNormalized,
      diagDisplay: { testsText: diagTestsText },
      meds: meds.length ? meds : f.meds,
      preAnesthesia: pres.preAnesthesia ? {
        isApplied: pres.preAnesthesia.isApplied ?? true,
        history: {
          cvs: pres.preAnesthesia.history?.cvs || '',
          respiratory: pres.preAnesthesia.history?.respiratory || '',
          renal: pres.preAnesthesia.history?.renal || '',
          hepatic: pres.preAnesthesia.history?.hepatic || '',
          diabetic: pres.preAnesthesia.history?.diabetic || '',
          neurology: pres.preAnesthesia.history?.neurology || '',
          previousAnesthesia: pres.preAnesthesia.history?.previousAnesthesia || '',
          allergies: pres.preAnesthesia.history?.allergies || '',
        },
        examination: {
          mallampatiScore: pres.preAnesthesia.examination?.mallampatiScore || '',
          asaClass: pres.preAnesthesia.examination?.asaClass || '',
          airway: pres.preAnesthesia.examination?.airway || '',
          teeth: pres.preAnesthesia.examination?.teeth || '',
          notes: pres.preAnesthesia.examination?.notes || '',
        },
        recommendation: pres.preAnesthesia.recommendation || '',
      } : emptyPreAnesthesia(),
      dentalChart: pres.dentalChart ? {
        teeth: Array.isArray(pres.dentalChart.teeth) ? pres.dentalChart.teeth.map((t: any) => ({ toothId: Number(t.toothId), condition: String(t.condition || 'Other'), notes: t.notes || '' })) : [],
        generalNotes: pres.dentalChart.generalNotes || '',
      } : emptyDentalChart(),
      eyeExamination: pres.eyeExamination ? { ...emptyEyeExamination(), ...pres.eyeExamination } : emptyEyeExamination(),
      departmentData: (pres.departmentClinical && activeDept && pres.departmentClinical.type === activeDept.key)
        ? { ...activeDept.empty(), ...(pres.departmentClinical.data || {}) }
        : null,
    }))

    // Also update child widgets if they expose setters
    try {
      medsRef.current?.setData?.(meds.length ? meds : [emptyMedRow()])
    } catch {}
    try {
      // Delay to ensure vitalsRef is mounted
      setTimeout(() => {
        try { vitalsRef.current?.setDisplay?.(vitalsDisplay) } catch {}
      }, 50)
    } catch {}
    try { diagRef.current?.setDisplay?.({ testsText: diagTestsText }) } catch {}

    setToast({ type: 'success', message: 'Previous prescription loaded' })
  }

  function getHeldPrescriptions(): any[] {
    try {
      const raw = localStorage.getItem('doctor.held.prescriptions')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  }

  function holdPrescription() {
    const sel = tokens.find(t => `${t.id}` === form.patientKey)
    if (!sel) { setToast({ type: 'error', message: 'Select a patient first' }); return }
    try {
      const held = getHeldPrescriptions()
      const id = crypto.randomUUID()
      const entry = {
        id,
        patientName: sel.patientName,
        mrNo: sel.mrNo,
        tokenId: sel.id,
        encounterId: sel.encounterId,
        heldAt: new Date().toISOString(),
        data: { ...form },
      }
      localStorage.setItem('doctor.held.prescriptions', JSON.stringify([entry, ...held]))
      setToast({ type: 'success', message: 'Prescription held (saved as draft)' })
    } catch {
      setToast({ type: 'error', message: 'Failed to hold prescription' })
    }
  }

  function loadHeldPrescription(entry: any) {
    if (!entry?.data) return
    setForm(f => ({ ...f, ...entry.data, patientKey: entry.tokenId || f.patientKey }))
    try { medsRef.current?.setData?.(entry.data.meds || [emptyMedRow()]) } catch {}
    try {
      setTimeout(() => {
        try { vitalsRef.current?.setDisplay?.(entry.data.vitalsDisplay || {}) } catch {}
      }, 50)
    } catch {}
    try { diagRef.current?.setDisplay?.(entry.data.diagDisplay || { testsText: '' }) } catch {}
    setHeldPrescriptionsModalOpen(false)
    setToast({ type: 'success', message: 'Held prescription loaded' })
  }

  function removeHeldPrescription(id: string) {
    try {
      const held = getHeldPrescriptions().filter((h: any) => h.id !== id)
      localStorage.setItem('doctor.held.prescriptions', JSON.stringify(held))
      setToast({ type: 'success', message: 'Held prescription removed' })
    } catch {}
  }

  async function searchLabTests(q: string){
    try {
      // Get only the last part after comma or newline for searching
      const idx = Math.max(q.lastIndexOf(','), q.lastIndexOf('\n'))
      const query = String(idx >= 0 ? q.slice(idx + 1) : q).trim()
      if (!query) return

      const res: any = await labApi.listTests({ q: query, page: 1, limit: 100 })
      const tests: any[] = res?.tests ?? res?.items ?? res ?? []
      const names = tests.map((t: any) => String(t?.name || t?.testName || t || '').trim()).filter(Boolean)
      setLabTestSuggestions(Array.from(new Set(names)).slice(0, 2000))
    } catch {
      // keep previous list
    }
  }


  const save = async (e?: React.FormEvent, andPrint: boolean = false) => {
    if (e) e.preventDefault()
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
        notes: m.notes ? String(m.notes).trim() : undefined,
      }))
    
    if (!items.length) { setToast({ type: 'error', message: 'Add at least one medicine' }); return }
    
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
          ar: d.ar || undefined,
          va: d.va || undefined,
          iop: d.iop || undefined,
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
        prescriptionMode: 'electronic' as const,
        tokenNo: (sel as any)?.tokenNo,
        items: items,
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
        nextFollowUp: form.nextFollowUp || undefined,
        vitals,
        preAnesthesia: form.preAnesthesia,
        dentalChart: showDental ? form.dentalChart : undefined,
        eyeExamination: showEye ? form.eyeExamination : undefined,
        departmentClinical: (showDept && activeDept) ? { type: activeDept.key, data: deptValue } : undefined,
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

      // Save vitals to the token collection
      if (vitals && sel.id) {
        try {
          await hospitalApi.updateToken(sel.id, { vitals })
          invalidateCache('/hospital/tokens')
        } catch (err) {
          console.error('Failed to save vitals to token:', err)
        }
      }

      // Mark token as completed after prescription save
      if (sel.id) {
        try {
          await hospitalApi.updateTokenStatus(sel.id, 'completed')
          invalidateCache('/hospital/tokens')
        } catch {
          // Ignore token status update errors
        }
      }

      try { window.dispatchEvent(new CustomEvent('doctor:pres-saved')) } catch {}
      setSaved(true)
      setToast({ type: 'success', message: 'Prescription saved successfully' })
      // If save-and-print requested, print before clearing form (form state still holds current data)
      if (andPrint) {
        try { await openPrint() } catch { /* print error handled internally */ }
      }
      setForm({ patientKey: '', primaryComplaint: '', primaryComplaintHistory: '', familyHistory: '', allergyHistory: '', treatmentHistory: '', history: '', examFindings: '', diagnosis: '', advice: '', nextFollowUp: '', labTestsText: '', vitalsDisplay: {}, vitalsNormalized: {}, diagDisplay: { testsText: '' }, meds: Array.from({ length: 5 }, () => emptyMedRow()), preAnesthesia: emptyPreAnesthesia(), dentalChart: emptyDentalChart(), eyeExamination: emptyEyeExamination(), departmentData: null })
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
        genericName: (m as any).genericName || undefined,
        company: (m as any).company || undefined,
        frequency: (m.freqText && m.freqText.trim()) ? m.freqText.trim() : ['morning','noon','evening','night'].map(k=>(m as any)[k]).filter(Boolean).join('/ '),
        duration: (m.durationText && m.durationText.trim()) ? m.durationText.trim() : (m.days?`${m.days} ${m.durationUnit || 'day(s)'}`:undefined),
        dose: m.qty ? String(m.qty) : undefined,
        instruction: m.instruction || undefined,
        route: m.route || undefined,
      }))
    
    // Get doctor details from saved settings, fallback to API data
    let doctor = { name: doctorInfo?.name || doc?.name || '-', qualification: doctorInfo?.qualification || '', specialization: doctorInfo?.specialization || '', departmentName: doctorInfo?.departmentName || '', phone: doctorInfo?.phone || '' }
    try {
      const dk = `doctor.details.${doc?.id || 'anon'}`
      const dRaw = localStorage.getItem(dk)
      if (dRaw) {
        const savedDetails = JSON.parse(dRaw)
        doctor = {
          name: savedDetails.name || doctor.name,
          qualification: savedDetails.qualification || doctor.qualification,
          specialization: savedDetails.specialization || doctor.specialization,
          departmentName: savedDetails.departmentName || doctor.departmentName,
          phone: savedDetails.phone || doctor.phone,
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
        ar: d.ar || undefined,
        va: d.va || undefined,
        iop: d.iop || undefined,
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
    // Fetch template fresh from database (same as history page)
    let tpl: PrescriptionPdfTemplate = prescriptionTemplate
    try {
      if (doc?.id) {
        const doctorData: any = await hospitalApi.getDoctor(doc.id)
        if (doctorData?.doctor?.prescriptionTemplate) {
          tpl = doctorData.doctor.prescriptionTemplate
        } else if (doctorData?.prescriptionTemplate) {
          tpl = doctorData.prescriptionTemplate
        }
      }
    } catch {}
    const basePdfData = { doctor, settings: settingsNorm, patient, items, primaryComplaint: form.primaryComplaint, primaryComplaintHistory: form.primaryComplaintHistory, familyHistory: form.familyHistory, allergyHistory: form.allergyHistory, treatmentHistory: form.treatmentHistory, history: form.history, examFindings: form.examFindings, diagnosis: form.diagnosis, advice: form.advice, vitals, labTests: form.labTestsText.split(/\n|,/).map(s=>s.trim()).filter(Boolean), diagnosticTests: Array.isArray(dPrint.tests)?dPrint.tests:[], tokenNo: (sel as any)?.tokenNo, createdAt: new Date(), language: prescriptionLanguage }
    // Registry departments (cardiac, breast-onco, omfs, neuro) use the generic
    // department PDF builder driven by their section descriptors.
    if (showDept && activeDept) {
      await previewDepartmentRxPdf(basePdfData, { deptLabel: activeDept.pdfDeptLabel, accent: activeDept.pdfAccent, sections: activeDept.sections(deptValue) })
      return
    }
    // Dental / eye use their dedicated template variants.
    if (showDental) tpl = 'dental-rx'
    else if (showEye) tpl = 'eye-rx'
    await previewPrescriptionPdf({ ...basePdfData, dentalChart: showDental ? form.dentalChart : undefined, eyeExamination: showEye ? form.eyeExamination : undefined }, tpl)
  }

  async function openAnesthesiaPrint() {
    const sel = myPatients.find(t => `${t.id}` === form.patientKey)
    if (!sel) { setToast({ type: 'error', message: 'Select a patient first' }); return }
    
    let s: any = settings
    try { s = await hospitalApi.getSettings() as any } catch {}
    const settingsNorm = { name: s?.name || 'Hospital', address: s?.address || '', phone: s?.phone || '', logoDataUrl: s?.logoDataUrl || '' }
    
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

    let doctor = { name: doctorInfo?.name || doc?.name || '-', qualification: doctorInfo?.qualification || '', departmentName: doctorInfo?.departmentName || '', phone: doctorInfo?.phone || '', specialization: doctorInfo?.specialization || '' }
    
    let vRaw = undefined as any
    try { vRaw = vitalsRef.current?.getNormalized?.() } catch {}
    let vitals: any = vRaw || (form as any).vitalsNormalized || {}

    await previewPreAnesthesiaPdf({
      doctor,
      settings: settingsNorm,
      patient,
      preAnesthesia: form.preAnesthesia,
      vitals,
      createdAt: new Date(),
    })
  }

  const goTab = (tab: 'details'|'vitals'|'labs'|'diagnostics'|'medication'|'anesthesia') => {
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

  async function printLabSlip() {
    const sel = myPatients.find(t => `${t.id}` === form.patientKey)
    if (!sel) { setToast({ type: 'error', message: 'Select a patient first' }); return }
    const tests = form.labTestsText.split(/\n|,/).map(s=>s.trim()).filter(Boolean)
    if (!tests.length) { setToast({ type: 'error', message: 'No lab tests to print' }); return }
    let settingsData: any = {}
    try { settingsData = await hospitalApi.getSettings() as any } catch {}
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lab Requisition Slip</title><style>
body{font-family:system-ui,-apple-system,sans-serif;padding:32px;color:#0f172a;background:#fff}
.header{text-align:center;border-bottom:2px solid #0ea5e9;padding-bottom:12px;margin-bottom:20px}
.header h1{margin:0;font-size:22px;color:#0f172a}
.header p{margin:4px 0;font-size:12px;color:#64748b}
.badge{display:inline-block;background:#0ea5e9;color:#fff;font-size:11px;font-weight:600;padding:4px 10px;border-radius:999px;margin-bottom:12px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;font-size:12px;margin-bottom:16px}
.grid div{padding:8px;background:#f8fafc;border-radius:8px}
.grid strong{color:#334155}
.tests{display:grid;gap:8px}
.test-item{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px}
.test-number{width:22px;height:22px;display:flex;align-items:center;justify-content:center;background:#0ea5e9;color:#fff;font-size:11px;font-weight:700;border-radius:50%}
.test-name{font-size:13px;font-weight:500;color:#0f172a}
.footer{margin-top:24px;text-align:right;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:10px}
@media print{body{padding:16px}}
</style></head><body>
<div class="header"><h1>${settingsData?.name || 'Hospital'}</h1><p>${[settingsData?.address, settingsData?.phone].filter(Boolean).join(' • ') || ''}</p></div>
<div class="badge">Laboratory</div>
<div class="grid">
<div><strong>Patient:</strong> ${sel.patientName}</div>
<div><strong>MR #:</strong> ${sel.mrNo || '-'}</div>
<div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
</div>
<div class="tests">
${tests.map((t, i) => `<div class="test-item"><div class="test-number">${i + 1}</div><div class="test-name">${t}</div></div>`).join('')}
</div>
<div class="footer">
<div><strong>Referred By:</strong> ${doc?.name || '-'}</div>
<div style="margin-top:4px">Please present this slip at the Laboratory counter.</div>
</div>
</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); w.print() }
  }

  async function printDiagnosticSlip() {
    const sel = myPatients.find(t => `${t.id}` === form.patientKey)
    if (!sel) { setToast({ type: 'error', message: 'Select a patient first' }); return }
    let dPrint: any = {}
    try { dPrint = diagRef.current?.getData?.() || {} } catch {}
    if ((!dPrint?.tests || !dPrint.tests.length)){
      const dd = (form as any).diagDisplay || {}
      const tests = String(dd.testsText||'').split(/\n|,/).map((s:string)=>s.trim()).filter(Boolean)
      dPrint = { tests }
    }
    const tests = (dPrint.tests || []).filter(Boolean)
    if (!tests.length) { setToast({ type: 'error', message: 'No diagnostic tests to print' }); return }
    let settingsData: any = {}
    try { settingsData = await hospitalApi.getSettings() as any } catch {}
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Diagnostic Requisition Slip</title><style>
body{font-family:system-ui,-apple-system,sans-serif;padding:32px;color:#0f172a;background:#fff}
.header{text-align:center;border-bottom:2px solid #8b5cf6;padding-bottom:12px;margin-bottom:20px}
.header h1{margin:0;font-size:22px;color:#0f172a}
.header p{margin:4px 0;font-size:12px;color:#64748b}
.badge{display:inline-block;background:#8b5cf6;color:#fff;font-size:11px;font-weight:600;padding:4px 10px;border-radius:999px;margin-bottom:12px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;font-size:12px;margin-bottom:16px}
.grid div{padding:8px;background:#f8fafc;border-radius:8px}
.grid strong{color:#334155}
.tests{display:grid;gap:8px}
.test-item{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px}
.test-number{width:22px;height:22px;display:flex;align-items:center;justify-content:center;background:#8b5cf6;color:#fff;font-size:11px;font-weight:700;border-radius:50%}
.test-name{font-size:13px;font-weight:500;color:#0f172a}
.footer{margin-top:24px;text-align:right;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:10px}
@media print{body{padding:16px}}
</style></head><body>
<div class="header"><h1>${settingsData?.name || 'Hospital'}</h1><p>${[settingsData?.address, settingsData?.phone].filter(Boolean).join(' • ') || ''}</p></div>
<div class="badge">Diagnostic / Imaging</div>
<div class="grid">
<div><strong>Patient:</strong> ${sel.patientName}</div>
<div><strong>MR #:</strong> ${sel.mrNo || '-'}</div>
<div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
</div>
<div class="tests">
${tests.map((t: string, i: number) => `<div class="test-item"><div class="test-number">${i + 1}</div><div class="test-name">${t}</div></div>`).join('')}
</div>
<div class="footer">
<div><strong>Referred By:</strong> ${doc?.name || '-'}</div>
<div style="margin-top:4px">Please present this slip at the Diagnostic counter.</div>
</div>
</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); w.print() }
  }

  function resetForms(){
    setForm({ patientKey: '', primaryComplaint: '', primaryComplaintHistory: '', familyHistory: '', allergyHistory: '', treatmentHistory: '', history: '', examFindings: '', diagnosis: '', advice: '', nextFollowUp: '', labTestsText: '', vitalsDisplay: {}, vitalsNormalized: {}, diagDisplay: { testsText: '' }, meds: Array.from({ length: 5 }, () => emptyMedRow()), preAnesthesia: emptyPreAnesthesia(), dentalChart: emptyDentalChart(), eyeExamination: emptyEyeExamination(), departmentData: null })
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
      notes: it.notes || '',
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
      nextFollowUp: t.nextFollowUp || f.nextFollowUp,
      labTestsText: (t.labTests || []).join('\n') || f.labTestsText,
      diagDisplay: { testsText: diagTestsText },
      meds: meds.length ? meds : f.meds,
    }))
    try { diagRef.current?.setDisplay?.({ testsText: diagTestsText }) } catch {}
    setToast({ type: 'success', message: `Applied template: ${t.name}` })
  }

  const sel = myPatients.find(t => `${t.id}` === form.patientKey)

  // Suggestions from doctor custom entries
  const sugPrimary = useMemo(() => doctorCustomSuggestions.primaryComplaint, [doctorCustomSuggestions.primaryComplaint])
  const sugHistory = useMemo(() => doctorCustomSuggestions.history, [doctorCustomSuggestions.history])
  const sugPrimHist = useMemo(() => doctorCustomSuggestions.primaryComplaintHistory, [doctorCustomSuggestions.primaryComplaintHistory])
  const sugFamily = useMemo(() => doctorCustomSuggestions.familyHistory, [doctorCustomSuggestions.familyHistory])
  const sugAllergy = useMemo(() => doctorCustomSuggestions.allergyHistory, [doctorCustomSuggestions.allergyHistory])
  const sugTreatment = useMemo(() => doctorCustomSuggestions.treatmentHistory, [doctorCustomSuggestions.treatmentHistory])
  const sugExam = useMemo(() => doctorCustomSuggestions.examFindings, [doctorCustomSuggestions.examFindings])
  const sugDiagnosis = useMemo(() => doctorCustomSuggestions.diagnosis, [doctorCustomSuggestions.diagnosis])
  const sugAdvice = useMemo(() => doctorCustomSuggestions.advice, [doctorCustomSuggestions.advice])
  const sugLabTests = useMemo(() => labTestSuggestions, [labTestSuggestions])
  const sugDiagTests = useMemo(() => diagnosticTestSuggestions, [diagnosticTestSuggestions])
  // Default suggestions for medication fields
  const defaultDoses = ['1 mg', '2 mg', '5 mg', '10 mg', '20 mg', '25 mg', '50 mg', '100 mg', '200 mg', '250 mg', '500 mg', '1 g', '1 ml', '2 ml', '5 ml', '10 ml', '1 tsp', '1 tbsp', '1 drop', '2 drops', '1 puff', '1 tablet', '2 tablets', '1 capsule', '1 sachet']
  const defaultRoutes = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Sublingual', 'Rectal', 'Vaginal', 'Inhalation', 'Nasal', 'Ocular', 'Ear drops', 'Local application']
  const defaultInstructions = ['Before meals', 'After meals', 'With meals', 'Empty stomach', 'Bed time', 'Morning', 'Night', 'Once daily', 'Twice daily', 'Thrice daily', 'Four times daily', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'SOS', 'PRN', 'Stat', 'As directed']
  const defaultDurations = ['1 day', '2 days', '3 days', '5 days', '7 days', '10 days', '14 days', '1 week', '2 weeks', '3 weeks', '4 weeks', '1 month', '2 months', '3 months', '6 months']
  const defaultFrequencies = ['Once daily (OD)', 'Twice daily (BD)', 'Thrice daily (TID)', 'Four times daily (QID)', 'Every morning', 'Every night', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'SOS', 'Stat', 'Alternate days', 'Weekly', 'Monthly']

  // Suggestions for medication fields (defaults + department-specific extras)
  const sugDose = useMemo(() => defaultDoses, [])
  const sugInstr = useMemo(() => {
    if (showDental) return ['Apply locally', 'Rinse and spit', 'Do not swallow', 'After brushing', 'Avoid hard food', ...defaultInstructions]
    if (showEye) return ['Instill in affected eye', 'One drop both eyes', 'Apply at bedtime', 'Shake well before use', ...defaultInstructions]
    if (showDept && activeDept?.medInstr?.length) return [...activeDept.medInstr, ...defaultInstructions]
    return defaultInstructions
  }, [showDental, showEye, showDept, activeDept])
  const sugRoute = useMemo(() => {
    if (showEye) return ['Eye drops', 'Eye ointment', 'Both eyes', 'Right eye (OD)', 'Left eye (OS)', ...defaultRoutes]
    if (showDental) return ['Topical (oral)', 'Local application', ...defaultRoutes]
    if (showDept && activeDept?.medRoutes?.length) return [...activeDept.medRoutes, ...defaultRoutes]
    return defaultRoutes
  }, [showDental, showEye, showDept, activeDept])
  const sugDuration = useMemo(() => defaultDurations, [])
  const sugFreq = useMemo(() => defaultFrequencies, [])
  // Vitals suggestions (empty - doctors manage their own)
  const sugVPulse = useMemo(() => [] as string[], [])
  const sugVTemp = useMemo(() => [] as string[], [])
  const sugVSys = useMemo(() => [] as string[], [])
  const sugVDia = useMemo(() => [] as string[], [])
  const sugVResp = useMemo(() => [] as string[], [])
  const sugVSugar = useMemo(() => [] as string[], [])
  const sugVWeight = useMemo(() => [] as string[], [])
  const sugVHeight = useMemo(() => [] as string[], [])
  const sugVSpo2 = useMemo(() => [] as string[], [])

  async function printReferral(){
    try {
      const s: any = await hospitalApi.getSettings()
      const settingsNorm = { name: s?.name || 'Hospital', address: s?.address || '', phone: s?.phone || '', logoDataUrl: s?.logoDataUrl || '' }
      const d = referralFormRef.current?.getPreviewData?.()
      if (!d) { setToast({ type: 'error', message: 'Referral form not ready' }); return }
      await previewIpdReferralPdf({ settings: settingsNorm, patient: d.patient, referral: d.referral, prescriptionSnapshot: d.prescriptionSnapshot })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to open referral preview' })
    }
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 px-4 py-6">
      <div className="no-print w-full max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4 w-full">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-500">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M12 11h4"></path><path d="M12 15h4"></path><path d="M8 11h.01"></path><path d="M8 15h.01"></path></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Prescription</h1>
              <p className="text-xs text-slate-400">Clinical Care • Digital Health Record</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-3 py-2 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-slate-400 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border-0 p-0 text-xs font-medium text-slate-600 focus:ring-0 bg-transparent w-28" />
            <span className="text-slate-300 text-xs">–</span>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border-0 p-0 text-xs font-medium text-slate-600 focus:ring-0 bg-transparent w-28" />
            <div className="flex gap-1 ml-1 border-l border-slate-100 pl-2">
              <button type="button" onClick={()=>{ const t = new Date().toISOString().slice(0,10); setFrom(t); setTo(t) }} className="rounded-md px-2 py-1 text-[10px] font-semibold text-sky-600 hover:bg-sky-50 transition-all">Today</button>
              <button type="button" onClick={()=>{ setFrom(''); setTo('') }} className="rounded-md px-2 py-1 text-[10px] font-semibold text-slate-400 hover:bg-slate-100 transition-all">Clear</button>
            </div>
          </div>
        </div>

        <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white shadow-sm w-full overflow-hidden">
          <div className="grid gap-0 sm:grid-cols-2 border-b border-slate-100">
            <div className="p-5 sm:border-r border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Patient</label>
                {showLoadPrevButton && (
                  <button
                    type="button"
                    onClick={() => setPrevPrescriptionsModalOpen(true)}
                    className="text-xs font-semibold text-amber-500 hover:text-amber-600 flex items-center gap-1 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.81"/></svg>
                    Load Previous
                  </button>
                )}
              </div>
              <select 
                value={form.patientKey} 
                onChange={e=>setForm(f=>({ ...f, patientKey: e.target.value }))} 
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-400/20 transition-all text-slate-800 outline-none"
              >
                <option value="">Select patient from queue</option>
                {myPatients.map(p => (
                  <option key={p.id} value={p.id}>{p.patientName} • {p.mrNo}</option>
                ))}
              </select>
            </div>
            <div className="p-5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Template</label>
              <select
                onChange={e => {
                  const id = e.target.value
                  if (!id) return
                  const t = templates.find(x => x._id === id)
                  if (t) applyTemplate(t)
                  e.target.value = ''
                }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-400/20 transition-all text-slate-800 outline-none"
              >
                <option value="">Choose a template to auto-fill...</option>
                {templates.map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="px-5 border-b border-slate-100 bg-slate-50/60">
            <nav className="flex gap-1 overflow-x-auto scrollbar-hide py-2">
              {[
                { id: 'details', label: 'Details' },
                ...(showDental ? [{ id: 'dental', label: 'Dental Chart' }] : []),
                ...(showEye ? [{ id: 'eye', label: 'Eye Exam' }] : []),
                ...(showDept && activeDept ? [{ id: 'department', label: activeDept.tabLabel }] : []),
                { id: 'medication', label: 'Medication' },
                { id: 'vitals', label: 'Vitals' },
                { id: 'labs', label: 'Lab Orders' },
                { id: 'diagnostics', label: 'Diagnostic' },
                { id: 'anesthesia', label: 'Pre-Anesthesia' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => goTab(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-sky-500 text-white shadow-sm shadow-sky-200'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        {activeTab==='details' && (
          <div className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="group">
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-focus-within:text-sky-500 transition-colors">Primary Complaint</label>
                  <button
                    type="button"
                    onClick={() => { setCustomEntriesCategory('primaryComplaint'); setCustomEntriesModalOpen(true) }}
                    className="text-[10px] font-semibold text-slate-400 hover:text-sky-500 transition-colors flex items-center gap-0.5"
                    title="Manage custom entries"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Manage
                  </button>
                </div>
                <SuggestField rows={2} value={form.primaryComplaint} onChange={v=>setForm(f=>({ ...f, primaryComplaint: v }))} suggestions={sugPrimary} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-400/20 text-sm transition-all outline-none" />
              </div>
              <div className="group">
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-focus-within:text-sky-500 transition-colors">Risk Factors / Medical History</label>
                  <button
                    type="button"
                    onClick={() => { setCustomEntriesCategory('history'); setCustomEntriesModalOpen(true) }}
                    className="text-[10px] font-semibold text-slate-400 hover:text-sky-500 transition-colors flex items-center gap-0.5"
                    title="Manage custom entries"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Manage
                  </button>
                </div>
                <SuggestField rows={2} value={form.history} onChange={v=>setForm(f=>({ ...f, history: v }))} suggestions={sugHistory} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-400/20 text-sm transition-all outline-none" />
              </div>
              <div className="group">
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-focus-within:text-sky-500 transition-colors">History of Primary Complaint</label>
                  <button
                    type="button"
                    onClick={() => { setCustomEntriesCategory('primaryComplaintHistory'); setCustomEntriesModalOpen(true) }}
                    className="text-[10px] font-semibold text-slate-400 hover:text-sky-500 transition-colors flex items-center gap-0.5"
                    title="Manage custom entries"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Manage
                  </button>
                </div>
                <SuggestField rows={2} value={form.primaryComplaintHistory} onChange={v=>setForm(f=>({ ...f, primaryComplaintHistory: v }))} suggestions={sugPrimHist} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-400/20 text-sm transition-all outline-none" />
              </div>
              <div className="group">
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-focus-within:text-sky-500 transition-colors">Family History</label>
                  <button
                    type="button"
                    onClick={() => { setCustomEntriesCategory('familyHistory'); setCustomEntriesModalOpen(true) }}
                    className="text-[10px] font-semibold text-slate-400 hover:text-sky-500 transition-colors flex items-center gap-0.5"
                    title="Manage custom entries"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Manage
                  </button>
                </div>
                <SuggestField rows={2} value={form.familyHistory} onChange={v=>setForm(f=>({ ...f, familyHistory: v }))} suggestions={sugFamily} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-400/20 text-sm transition-all outline-none" />
              </div>
              <div className="group">
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-focus-within:text-sky-500 transition-colors">Allergy History</label>
                  <button
                    type="button"
                    onClick={() => { setCustomEntriesCategory('allergyHistory'); setCustomEntriesModalOpen(true) }}
                    className="text-[10px] font-semibold text-slate-400 hover:text-sky-500 transition-colors flex items-center gap-0.5"
                    title="Manage custom entries"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Manage
                  </button>
                </div>
                <SuggestField rows={2} value={form.allergyHistory} onChange={v=>setForm(f=>({ ...f, allergyHistory: v }))} suggestions={sugAllergy} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-400/20 text-sm transition-all outline-none" />
              </div>
              <div className="group">
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-focus-within:text-sky-500 transition-colors">Treatment History</label>
                  <button
                    type="button"
                    onClick={() => { setCustomEntriesCategory('treatmentHistory'); setCustomEntriesModalOpen(true) }}
                    className="text-[10px] font-semibold text-slate-400 hover:text-sky-500 transition-colors flex items-center gap-0.5"
                    title="Manage custom entries"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Manage
                  </button>
                </div>
                <SuggestField rows={2} value={form.treatmentHistory} onChange={v=>setForm(f=>({ ...f, treatmentHistory: v }))} suggestions={sugTreatment} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-400/20 text-sm transition-all outline-none" />
              </div>
              <div className="group">
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-focus-within:text-sky-500 transition-colors">Examination Findings</label>
                  <button
                    type="button"
                    onClick={() => { setCustomEntriesCategory('examFindings'); setCustomEntriesModalOpen(true) }}
                    className="text-[10px] font-semibold text-slate-400 hover:text-sky-500 transition-colors flex items-center gap-0.5"
                    title="Manage custom entries"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Manage
                  </button>
                </div>
                  <SuggestField rows={2} value={form.examFindings} onChange={v=>setForm(f=>({ ...f, examFindings: v }))} suggestions={sugExam} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-400/20 text-sm transition-all outline-none" />
              </div>
              <div className="group">
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-focus-within:text-sky-500 transition-colors">Diagnosis / Disease</label>
                  <button
                    type="button"
                    onClick={() => { setCustomEntriesCategory('diagnosis'); setCustomEntriesModalOpen(true) }}
                    className="text-[10px] font-semibold text-slate-400 hover:text-sky-500 transition-colors flex items-center gap-0.5"
                    title="Manage custom entries"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Manage
                  </button>
                </div>
                <SuggestField as="input" value={form.diagnosis} onChange={v=>setForm(f=>({ ...f, diagnosis: v }))} suggestions={sugDiagnosis} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-400/20 text-sm transition-all outline-none" />
              </div>
              <div className="group">
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-focus-within:text-sky-500 transition-colors">Advice / Referral</label>
                  <button
                    type="button"
                    onClick={() => { setCustomEntriesCategory('advice'); setCustomEntriesModalOpen(true) }}
                    className="text-[10px] font-semibold text-slate-400 hover:text-sky-500 transition-colors flex items-center gap-0.5"
                    title="Manage custom entries"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Manage
                  </button>
                </div>
                <SuggestField rows={2} value={form.advice} onChange={v=>setForm(f=>({ ...f, advice: v }))} suggestions={sugAdvice} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-400/20 text-sm transition-all outline-none" />
              </div>
              <div className="group">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Next Follow Up</label>
                <SuggestField as="input" value={form.nextFollowUp} onChange={v=>setForm(f=>({ ...f, nextFollowUp: v }))} suggestions={['After 3 days', 'After 1 week', 'After 2 weeks', 'After 1 month', 'SOS']} placeholder="e.g. After 1 week" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-400/20 text-sm transition-all outline-none" />
              </div>
            </div>
          </div>
        )}
        {activeTab==='dental' && showDental && (
          <div className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-linear-to-r from-sky-500 to-cyan-500 px-4 py-3 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M12 5.5c-1.5-2-4-2.5-5.5-1.5C4.5 5.5 5 9 6 12c.7 2 1 5 1.5 6.5.4 1.2 1.6 1.2 2-.5.3-1.3.5-3 1.5-3s1.2 1.7 1.5 3c.4 1.7 1.6 1.7 2 .5C16 17 16.3 14 17 12c1-3 1.5-6.5-.5-8-1.5-1-4-.5-4.5 1.5z"/></svg>
              <div>
                <div className="text-sm font-bold">Dental Department</div>
                <div className="text-[11px] text-sky-50">Interactive tooth chart · FDI numbering</div>
              </div>
            </div>
            <DentalChart value={form.dentalChart} onChange={(dentalChart) => setForm(f => ({ ...f, dentalChart }))} />
          </div>
        )}

        {activeTab==='eye' && showEye && (
          <div className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-violet-500 px-4 py-3 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
              <div>
                <div className="text-sm font-bold">Eye Department</div>
                <div className="text-[11px] text-indigo-50">Ophthalmic examination · glasses prescription</div>
              </div>
            </div>
            <EyeExamination value={form.eyeExamination} onChange={(eyeExamination) => setForm(f => ({ ...f, eyeExamination }))} />
          </div>
        )}

        {activeTab==='department' && showDept && activeDept && (
          <div className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className={`mb-4 flex items-center gap-2 rounded-xl bg-linear-to-r ${activeDept.gradient} px-4 py-3 text-white`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d={activeDept.iconPath} /></svg>
              <div>
                <div className="text-sm font-bold">{activeDept.bannerTitle}</div>
                <div className="text-[11px] text-white/80">{activeDept.bannerSubtitle}</div>
              </div>
            </div>
            <activeDept.Form value={deptValue} onChange={(d: any) => setForm(f => ({ ...f, departmentData: d }))} />
          </div>
        )}

        {activeTab==='medication' && (
          <div>
            <PrescriptionMedication
              ref={medsRef}
              initialMedicines={form.meds}
              onChange={(meds) => setForm(f => ({ ...f, meds }))}
              language={prescriptionLanguage}
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
        {activeTab==='vitals' && (
          <div>
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
        {activeTab==='diagnostics' && (
          <div>
            <PrescriptionDiagnosticOrders ref={diagRef} initialTestsText={(form as any).diagDisplay?.testsText} suggestionsTests={sugDiagTests} />
          </div>
        )}
        {activeTab==='labs' && (
          <div>
            <label className="mb-1 block text-sm text-slate-700">Lab Tests (comma or one per line)</label>
            <SuggestField mode="lab-tests" rows={3} value={form.labTestsText} onChange={v=>{ setForm(f=>({ ...f, labTestsText: v })); searchLabTests(v) }} suggestions={sugLabTests} placeholder="Search lab tests…" />
          </div>
        )}
        {activeTab==='anesthesia' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Doctor_PreAnesthesiaForm
              data={form.preAnesthesia}
              onChange={(preAnesthesia) => setForm(f => ({ ...f, preAnesthesia }))}
            />
            {form.preAnesthesia.isApplied && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={openAnesthesiaPrint}
                  className="flex items-center gap-2 rounded-xl border border-teal-300 bg-teal-50 px-5 py-2.5 text-sm font-bold text-teal-700 hover:bg-teal-100 hover:border-teal-400 transition-all shadow-sm active:scale-[0.98]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Print Pre-Anesthesia Form
                </button>
              </div>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/60">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={()=>save(undefined, true)} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-600 transition-all active:scale-[0.98] shadow-sm shadow-sky-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Save and Print Rx
            </button>
            <button
              type="button"
              onClick={openAnesthesiaPrint}
              disabled={!form.preAnesthesia.isApplied}
              title={!form.preAnesthesia.isApplied ? 'Enable Pre-Anesthesia form in the Anesthesia tab first' : 'Print Pre-Anesthesia Form'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Anesthesia Print
            </button>
            <button type="button" onClick={printLabSlip} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-100 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-600 hover:bg-sky-100 hover:border-sky-200 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M9 3v18"/><path d="M15 3v18"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
              Print Lab Slip
            </button>
            <button type="button" onClick={printDiagnosticSlip} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-100 bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-600 hover:bg-violet-100 hover:border-violet-200 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              Print Diagnostic Slip
            </button>
            <button type="button" onClick={resetForms} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.81"/></svg>
              Reset
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!sel}
              onClick={()=>setOpenReferral(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-600 hover:bg-sky-100 hover:border-sky-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12 19.79 19.79 0 0 1 1.97 3.18 2 2 0 0 1 3.95 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Referral
            </button>
            <button
              type="button"
              disabled={!sel}
              onClick={holdPrescription}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-100 hover:border-amber-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
              Hold
            </button>
            <button
              type="button"
              onClick={() => setHeldPrescriptionsModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Held
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-5 py-2 text-xs font-semibold text-white hover:bg-sky-600 transition-all active:scale-[0.98] shadow-sm shadow-sky-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Save Prescription
            </button>
          </div>
        </div>
        {saved && (
          <div className="px-5 py-2 border-t border-emerald-100 bg-emerald-50 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-600">Saved successfully</span>
          </div>
        )}
      </form>
      </div>
      {openReferral && (
        <div id="referral-print" className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-2 sm:px-4">
          <style>{`@media print { body * { visibility: hidden !important; } #referral-print, #referral-print * { visibility: visible !important; } #referral-print { position: static !important; inset: auto !important; background: transparent !important; } }`}</style>
          <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="text-base font-semibold text-slate-900">Referral Form</div>
              <div className="flex items-center gap-2">
                <button onClick={printReferral} className="rounded-md border border-blue-900 bg-blue-900 px-3 py-1 text-sm text-white hover:bg-blue-950">Print</button>
                <button onClick={()=>setOpenReferral(false)} className="rounded-md border border-blue-900 bg-blue-900 px-3 py-1 text-sm text-white hover:bg-blue-950">Close</button>
              </div>
            </div>
            <div className="max-h-[85vh] overflow-y-auto p-3 sm:p-4">
              <Doctor_IpdReferralForm
                ref={referralFormRef}
                mrn={sel?.mrNo}
                doctor={{ id: doc?.id, name: doc?.name }}
                onSaved={()=>setOpenReferral(false)}
                prescriptionSnapshot={{
                  primaryComplaint: form.primaryComplaint,
                  primaryComplaintHistory: form.primaryComplaintHistory,
                  familyHistory: form.familyHistory,
                  allergyHistory: form.allergyHistory,
                  treatmentHistory: form.treatmentHistory,
                  history: form.history,
                  examFindings: form.examFindings,
                  diagnosis: form.diagnosis,
                  advice: form.advice,
                  nextFollowUp: form.nextFollowUp,
                  items: (medsRef.current?.getData?.() || form.meds)
                    .filter((m: MedicineRow) => m.name?.trim())
                    .map((m: MedicineRow) => ({
                      name: m.name,
                      dose: m.qty,
                      frequency: m.freqText,
                      duration: m.durationText,
                      instruction: m.instruction,
                      route: m.route,
                      notes: m.notes,
                    })),
                  vitals: form.vitalsNormalized,
                  labTests: form.labTestsText ? form.labTestsText.split(/\n|,/g).map((s: string) => s.trim()).filter(Boolean) : [],
                  diagnosticTests: form.diagDisplay?.testsText ? form.diagDisplay.testsText.split(/\n|,/g).map((s: string) => s.trim()).filter(Boolean) : [],
                }}
              />
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
        dentalChart={showDental ? form.dentalChart : undefined}
        eyeExamination={showEye ? form.eyeExamination : undefined}
        departmentTitle={showDept && activeDept ? activeDept.bannerTitle : undefined}
        departmentSections={showDept && activeDept ? activeDept.sections(deptValue) : undefined}
        createdAt={new Date()}
        language={prescriptionLanguage}
      />
      <Toast toast={toast} onClose={()=>setToast(null)} />
      {customEntriesModalOpen && (
        <DoctorCustomEntriesModal
          isOpen={customEntriesModalOpen}
          onClose={() => setCustomEntriesModalOpen(false)}
          doctorId={doc?.id || ''}
          onSelectEntry={(entryText) => {
            setForm(f => ({ ...f, [customEntriesCategory]: entryText }))
          }}
          initialCategory={customEntriesCategory}
        />
      )}
      {prevPrescriptionsModalOpen && (
        <PreviousPrescriptionsModal
          isOpen={prevPrescriptionsModalOpen}
          onClose={() => setPrevPrescriptionsModalOpen(false)}
          patientMrn={sel?.mrNo || ''}
          onSelectPrescription={loadPreviousPrescription}
          doctor={{ name: doc?.name, specialization: doctorInfo?.specialization, qualification: doctorInfo?.qualification, departmentName: doctorInfo?.departmentName, phone: doctorInfo?.phone }}
          settings={settings}
          patient={{ name: sel?.patientName || '-', mrn: sel?.mrNo || '-', gender: pat?.gender, fatherName: pat?.fatherName, age: pat?.age, phone: pat?.phone, address: pat?.address }}
        />
      )}
      {heldPrescriptionsModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-2 sm:px-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="text-base font-semibold text-slate-900">Held Prescriptions</div>
              <button onClick={() => setHeldPrescriptionsModalOpen(false)} className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50">Close</button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              {(() => {
                const held = getHeldPrescriptions()
                if (held.length === 0) {
                  return <div className="text-center text-slate-500 py-6">No held prescriptions</div>
                }
                return (
                  <div className="space-y-3">
                    {held.map((entry: any) => (
                      <div key={entry.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{entry.patientName || 'Unknown'}</div>
                            <div className="text-xs text-slate-500">MRN: {entry.mrNo || '-'} • Held: {new Date(entry.heldAt).toLocaleString()}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {entry.data?.primaryComplaint ? `Complaint: ${entry.data.primaryComplaint}` : ''}
                              {entry.data?.diagnosis ? ` • Diagnosis: ${entry.data.diagnosis}` : ''}
                            </div>
                            {Array.isArray(entry.data?.meds) && entry.data.meds.filter((m: any) => m.name).length > 0 && (
                              <div className="text-xs text-slate-600 mt-1">
                                <span className="font-semibold">Medicines:</span>{' '}
                                {entry.data.meds.filter((m: any) => m.name).map((m: any) => m.name).join(', ')}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <button
                              onClick={() => loadHeldPrescription(entry)}
                              className="rounded-md border border-green-600 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => removeHeldPrescription(entry.id)}
                              className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
