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
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
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
  const [sugVersion, setSugVersion] = useState(0)
  const [medNameSuggestions, setMedNameSuggestions] = useState<string[]>([])
  const [labTestSuggestions, setLabTestSuggestions] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'details'|'vitals'|'labs'|'diagnostics'|'medication'>('details')
  const lastAutoPrefillMrnRef = useRef<string | null>(null)
  const [templates, setTemplates] = useState<any[]>([])
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
        addMany('primaryComplaint', primaries)
        addMany('history', histories)
        addMany('primaryComplaintHistory', primHist)
        addMany('familyHistory', family)
        addMany('allergyHistory', allergy)
        addMany('treatmentHistory', treatment)
        addMany('examFindings', exams)
        addMany('diagnosis', diagnosis)
        addMany('advice', advice)
        addMany('labTest', labTestsAll)
        addMany('diagTest', diagTestsAll)
        addMany('dose', doses)
        addMany('route', routes)
        addMany('instruction', instrs)
        // frequency choices in UI are normalized; still store historical labels
        addMany('frequencyTag', freqs)
        addMany('durationTag', durs)
        // vitals suggestions
        addMany('vitals.pulse', vPulse)
        addMany('vitals.temperature', vTemp)
        addMany('vitals.sys', vSys)
        addMany('vitals.dia', vDia)
        addMany('vitals.resp', vResp)
        addMany('vitals.sugar', vSugar)
        addMany('vitals.weight', vWeight)
        addMany('vitals.height', vHeight)
        addMany('vitals.spo2', vSpo2)
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
      const res = await hospitalApi.listTokens(params) as any
      const items: Token[] = (res.tokens || []).map((t: any) => ({
        id: t._id,
        createdAt: t.createdAt,
        patientName: t.patientName || '-',
        mrNo: t.mrn || '-',
        encounterId: String(t.encounterId || ''),
        doctorId: t.doctorId?._id || String(t.doctorId || ''),
        doctorName: t.doctorId?.name || '',
        status: t.status,
      }))
      setTokens(items)
    } catch {
      setTokens([])
    }
  }

  async function loadPresIds(){
    try {
      if (!doc?.id) { setPresEncounterIds([]); return }
      const params: any = { doctorId: doc.id }
      if (from) params.from = from
      if (to) params.to = to
      const res = await hospitalApi.listPrescriptions(params) as any
      const ids: string[] = (res.prescriptions || []).map((p: any) => String(p.encounterId?._id || p.encounterId || ''))
      setPresEncounterIds(ids)
    } catch {
      setPresEncounterIds([])
    }
  }

  const myPatients = useMemo(() => {
    const presSet = new Set(presEncounterIds.filter(Boolean))
    return tokens
      .filter(t => t.doctorId === doc?.id)
      // treat default as pending if not returned/completed/cancelled
      .filter(t => !t.status || (t.status !== 'returned' && t.status !== 'completed' && t.status !== 'cancelled'))
      // exclude encounters with a saved prescription
      .filter(t => !t.encounterId || !presSet.has(String(t.encounterId)))
  }, [tokens, doc, presEncounterIds])

  // If opened from queue with tokenId, preselect that patient.
  useEffect(() => {
    const qs = new URLSearchParams(location.search || '')
    const tokenId = qs.get('tokenId')
    if (!tokenId) return
    const t = myPatients.find(x => String(x.id) === String(tokenId) || String((x as any)._id) === String(tokenId))
    if (!t) return
    setForm(f => ({ ...f, patientKey: String(t.id) }))
  }, [location.search, myPatients])

  // Auto-prefill from latest previous prescription (by MRN) when patient changes
  useEffect(() => {
    const sel = myPatients.find(t => `${t.id}` === form.patientKey)
    const mrn = String(sel?.mrNo || '').trim()
    if (!mrn) return
    if (lastAutoPrefillMrnRef.current === mrn) return
    lastAutoPrefillMrnRef.current = mrn

    ;(async () => {
      try {
        const res: any = await hospitalApi.listPrescriptions({ patientMrn: mrn, page: 1, limit: 1 })
        const pres = (res?.prescriptions || [])[0]
        if (!pres) return

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
          vitalsDisplay: pres.vitals || f.vitalsDisplay,
          vitalsNormalized: pres.vitals || f.vitalsNormalized,
          diagDisplay: { testsText: diagTestsText },
          meds: meds.length ? meds : f.meds,
        }))

        // Also update child widgets if they expose setters
        try { vitalsRef.current?.setDisplay?.(pres.vitals || {}) } catch {}
        try { diagRef.current?.setDisplay?.({ testsText: diagTestsText }) } catch {}
      } catch {
        // ignore
      }
    })()
  }, [form.patientKey, myPatients])

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
      await hospitalApi.createPrescription({
        encounterId: sel.encounterId,
        prescriptionMode: rxMode,
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
        createdBy: doc.name,
        vitals,
      })
      // Save new suggestions locally
      addOne('primaryComplaint', form.primaryComplaint)
      addOne('history', form.history)
      addOne('primaryComplaintHistory', form.primaryComplaintHistory)
      addOne('familyHistory', form.familyHistory)
      addOne('allergyHistory', form.allergyHistory)
      addOne('treatmentHistory', form.treatmentHistory)
      addOne('examFindings', form.examFindings)
      addOne('diagnosis', form.diagnosis)
      addOne('advice', form.advice)
      addMany('labTest', labTests)
      try {
        for (const m of form.meds || []){
          if (m.qty) addOne('dose', m.qty)
          if (m.instruction) addOne('instruction', m.instruction)
          if (m.route) addOne('route', m.route)
        }
      } catch {}
      try { window.dispatchEvent(new CustomEvent('doctor:pres-saved')) } catch {}
      setSaved(true)
      setForm({ patientKey: '', primaryComplaint: '', primaryComplaintHistory: '', familyHistory: '', allergyHistory: '', treatmentHistory: '', history: '', examFindings: '', diagnosis: '', advice: '', labTestsText: '', vitalsDisplay: {}, vitalsNormalized: {}, diagDisplay: { testsText: '' }, meds: [{ name: '', morning: '', noon: '', evening: '', night: '', qty: '', route: '', instruction: '', durationText: '', freqText: '' }] })
      setManualAttachment(null)
      setManualAttachmentError('')
      try { vitalsRef.current?.setDisplay?.({}) } catch {}
      try { diagRef.current?.setDisplay?.({ testsText: '' }) } catch {}
      setTimeout(()=>setSaved(false), 2000)
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
    await previewPrescriptionPdf({ doctor, settings: settingsNorm, patient, items, primaryComplaint: form.primaryComplaint, primaryComplaintHistory: form.primaryComplaintHistory, familyHistory: form.familyHistory, allergyHistory: form.allergyHistory, treatmentHistory: form.treatmentHistory, history: form.history, examFindings: form.examFindings, diagnosis: form.diagnosis, advice: form.advice, vitals, labTests: form.labTestsText.split(/\n|,/).map(s=>s.trim()).filter(Boolean), diagnosticTests: Array.isArray(dPrint.tests)?dPrint.tests:[], createdAt: new Date() }, tpl)
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

  // Suggestions: store per-doctor in localStorage
  const keyFor = (name: string) => `doctor.suggest.${doc?.id || 'anon'}.${name}`
  const loadList = (name: string): string[] => {
    try {
      const raw = localStorage.getItem(keyFor(name))
      const arr = raw ? JSON.parse(raw) : []
      if (Array.isArray(arr)) return Array.from(new Set(arr.map((s: any)=>String(s||'').trim()).filter(Boolean)))
      return []
    } catch { return [] }
  }
  const saveList = (name: string, values: string[]) => {
    const uniq = Array.from(new Set(values.map(v=>String(v||'').trim()).filter(Boolean)))
    try { localStorage.setItem(keyFor(name), JSON.stringify(uniq.slice(0, 200))) } catch {}
  }
  const addOne = (name: string, value?: string) => {
    const v = String(value||'').trim(); if (!v) return
    const arr = loadList(name)
    if (!arr.includes(v)) { saveList(name, [v, ...arr]); setSugVersion(x=>x+1) }
  }
  const addMany = (name: string, values: string[]) => {
    const arr = loadList(name)
    const next = [...values.map(s=>String(s||'').trim()).filter(Boolean), ...arr]
    saveList(name, Array.from(new Set(next)))
    setSugVersion(x=>x+1)
  }

  // Suggestions loaded from localStorage only
  const sugPrimary = useMemo(()=>loadList('primaryComplaint'), [doc?.id, sugVersion])
  const sugHistory = useMemo(()=>loadList('history'), [doc?.id, sugVersion])
  const sugPrimHist = useMemo(()=>loadList('primaryComplaintHistory'), [doc?.id, sugVersion])
  const sugFamily = useMemo(()=>loadList('familyHistory'), [doc?.id, sugVersion])
  const sugAllergy = useMemo(()=>loadList('allergyHistory'), [doc?.id, sugVersion])
  const sugTreatment = useMemo(()=>loadList('treatmentHistory'), [doc?.id, sugVersion])
  const sugExam = useMemo(()=>loadList('examFindings'), [doc?.id, sugVersion])
  const sugDiagnosis = useMemo(()=>loadList('diagnosis'), [doc?.id, sugVersion])
  const sugAdvice = useMemo(()=>loadList('advice'), [doc?.id, sugVersion])
  const sugLabTests = useMemo(()=>labTestSuggestions.length ? labTestSuggestions : loadList('labTest'), [doc?.id, sugVersion, labTestSuggestions])
  const sugDiagTests = useMemo(()=>loadList('diagTest'), [doc?.id, sugVersion])
  // Default suggestions for medication fields
  const defaultDoses = ['1 mg', '2 mg', '5 mg', '10 mg', '20 mg', '25 mg', '50 mg', '100 mg', '200 mg', '250 mg', '500 mg', '1 g', '1 ml', '2 ml', '5 ml', '10 ml', '1 tsp', '1 tbsp', '1 drop', '2 drops', '1 puff', '1 tablet', '2 tablets', '1 capsule', '1 sachet']
  const defaultRoutes = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Sublingual', 'Rectal', 'Vaginal', 'Inhalation', 'Nasal', 'Ocular', 'Ear drops', 'Local application']
  const defaultInstructions = ['Before meals', 'After meals', 'With meals', 'Empty stomach', 'Bed time', 'Morning', 'Night', 'Once daily', 'Twice daily', 'Thrice daily', 'Four times daily', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'SOS', 'PRN', 'Stat', 'As directed']
  const defaultDurations = ['1 day', '2 days', '3 days', '5 days', '7 days', '10 days', '14 days', '1 week', '2 weeks', '3 weeks', '4 weeks', '1 month', '2 months', '3 months', '6 months']
  const defaultFrequencies = ['Once daily (OD)', 'Twice daily (BD)', 'Thrice daily (TID)', 'Four times daily (QID)', 'Every morning', 'Every night', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'SOS', 'Stat', 'Alternate days', 'Weekly', 'Monthly']

  // Suggestions loaded from localStorage + defaults
  const sugDose = useMemo(() => {
    const stored = loadList('dose')
    return stored.length ? stored : defaultDoses
  }, [doc?.id, sugVersion])
  const sugInstr = useMemo(() => {
    const stored = loadList('instruction')
    return stored.length ? stored : defaultInstructions
  }, [doc?.id, sugVersion])
  const sugRoute = useMemo(() => {
    const stored = loadList('route')
    return stored.length ? stored : defaultRoutes
  }, [doc?.id, sugVersion])
  const sugDuration = useMemo(() => {
    const stored = loadList('durationTag')
    return stored.length ? stored : defaultDurations
  }, [doc?.id, sugVersion])
  const sugFreq = useMemo(() => {
    const stored = loadList('frequencyTag')
    return stored.length ? stored : defaultFrequencies
  }, [doc?.id, sugVersion])
  // Vitals suggestions
  const sugVPulse = useMemo(()=>loadList('vitals.pulse'), [doc?.id, sugVersion])
  const sugVTemp = useMemo(()=>loadList('vitals.temperature'), [doc?.id, sugVersion])
  const sugVSys = useMemo(()=>loadList('vitals.sys'), [doc?.id, sugVersion])
  const sugVDia = useMemo(()=>loadList('vitals.dia'), [doc?.id, sugVersion])
  const sugVResp = useMemo(()=>loadList('vitals.resp'), [doc?.id, sugVersion])
  const sugVSugar = useMemo(()=>loadList('vitals.sugar'), [doc?.id, sugVersion])
  const sugVWeight = useMemo(()=>loadList('vitals.weight'), [doc?.id, sugVersion])
  const sugVHeight = useMemo(()=>loadList('vitals.height'), [doc?.id, sugVersion])
  const sugVSpo2 = useMemo(()=>loadList('vitals.spo2'), [doc?.id, sugVersion])

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
    <div className="w-full px-2 sm:px-4">
      <div className="no-print">
      <div className="text-xl font-semibold text-slate-800">Prescription</div>
      <div className="mt-3 flex items-center gap-2 text-sm">
        <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2" />
        <span className="text-slate-500">to</span>
        <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2" />
        <button type="button" onClick={()=>{ const t = new Date().toISOString().slice(0,10); setFrom(t); setTo(t) }} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">Today</button>
        <button type="button" onClick={()=>{ setFrom(''); setTo('') }} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">Reset</button>
      </div>
      <form onSubmit={save} className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Patient</label>
            <select value={form.patientKey} onChange={e=>setForm(f=>({ ...f, patientKey: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select patient</option>
              {myPatients.map(p => (
                <option key={p.id} value={p.id}>{p.patientName} • {p.mrNo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Apply Template</label>
            <select
              onChange={e => {
                const id = e.target.value
                if (!id) return
                const t = templates.find(x => x._id === id)
                if (t) applyTemplate(t)
                e.target.value = ''
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select template...</option>
              {templates.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
        {rxMode === 'manual' && (
          <div>
            <label className="mb-1 block text-sm text-slate-700">Attach Manual Prescription (PDF/Image)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={e=>onManualFile(e.target.files?.[0])}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:text-slate-700"
            />
            {manualAttachmentError && (
              <div className="mt-1 text-xs text-rose-600">{manualAttachmentError}</div>
            )}
            {manualAttachment?.fileName && (
              <div className="mt-1 text-xs text-slate-600">Selected: {manualAttachment.fileName}</div>
            )}
            {manualAttachment?.dataUrl && (manualAttachment.mimeType || '').startsWith('image/') && (
              <div className="mt-2">
                <img src={manualAttachment.dataUrl} alt="Prescription attachment" className="max-h-40 rounded-md border" />
              </div>
            )}
          </div>
        )}
        <div className="mt-2 border-b border-slate-200">
          <nav className="-mb-px flex gap-2">
            <button type="button" onClick={()=>goTab('details')} className={`px-3 py-2 text-sm ${activeTab==='details'?'border-b-2 border-sky-600 text-slate-900':'text-slate-600 hover:text-slate-900'}`}>Details</button>
            <button type="button" onClick={()=>goTab('medication')} className={`px-3 py-2 text-sm ${activeTab==='medication'?'border-b-2 border-sky-600 text-slate-900':'text-slate-600 hover:text-slate-900'}`}>Medication</button>
            <button type="button" onClick={()=>goTab('vitals')} className={`px-3 py-2 text-sm ${activeTab==='vitals'?'border-b-2 border-sky-600 text-slate-900':'text-slate-600 hover:text-slate-900'}`}>Vitals</button>
            <button type="button" onClick={()=>goTab('labs')} className={`px-3 py-2 text-sm ${activeTab==='labs'?'border-b-2 border-sky-600 text-slate-900':'text-slate-600 hover:text-slate-900'}`}>Lab Orders</button>
            <button type="button" onClick={()=>goTab('diagnostics')} className={`px-3 py-2 text-sm ${activeTab==='diagnostics'?'border-b-2 border-sky-600 text-slate-900':'text-slate-600 hover:text-slate-900'}`}>Diagnostic Orders</button>
          </nav>
        </div>
        {activeTab==='details' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Primary Complaint</label>
                <SuggestField rows={2} value={form.primaryComplaint} onChange={v=>setForm(f=>({ ...f, primaryComplaint: v }))} suggestions={sugPrimary} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Risk Factors / Medical History</label>
                <SuggestField rows={2} value={form.history} onChange={v=>setForm(f=>({ ...f, history: v }))} suggestions={sugHistory} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">History of Primary Complaint</label>
                <SuggestField rows={2} value={form.primaryComplaintHistory} onChange={v=>setForm(f=>({ ...f, primaryComplaintHistory: v }))} suggestions={sugPrimHist} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Family History</label>
                <SuggestField rows={2} value={form.familyHistory} onChange={v=>setForm(f=>({ ...f, familyHistory: v }))} suggestions={sugFamily} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Allergy History</label>
                <SuggestField rows={2} value={form.allergyHistory} onChange={v=>setForm(f=>({ ...f, allergyHistory: v }))} suggestions={sugAllergy} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Treatment History</label>
                <SuggestField rows={2} value={form.treatmentHistory} onChange={v=>setForm(f=>({ ...f, treatmentHistory: v }))} suggestions={sugTreatment} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Examination Findings</label>
                <SuggestField rows={2} value={form.examFindings} onChange={v=>setForm(f=>({ ...f, examFindings: v }))} suggestions={sugExam} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Diagnosis / Disease</label>
                <SuggestField as="input" value={form.diagnosis} onChange={v=>setForm(f=>({ ...f, diagnosis: v }))} suggestions={sugDiagnosis} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Advice/Referral</label>
                <SuggestField rows={2} value={form.advice} onChange={v=>setForm(f=>({ ...f, advice: v }))} suggestions={sugAdvice} />
              </div>
            </div>
          </>
        )}
        {activeTab==='medication' && (
          <div>
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
              onBlurStore={(field: any, value: string)=> addOne(`vitals.${String(field)}`, value)}
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
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={openPrint} className="rounded-md border border-blue-900 bg-blue-900 px-3 py-1 text-sm text-white hover:bg-blue-950">Print</button>
          <button type="button" onClick={resetForms} className="rounded-md border border-blue-900 bg-blue-900 px-3 py-1 text-sm text-white hover:bg-blue-950">Reset Forms</button>
          <button type="button" disabled={!sel} onClick={()=>setOpenReferral(true)} className="rounded-md border border-blue-900 bg-blue-900 px-3 py-1 text-sm text-white hover:bg-blue-950 disabled:opacity-50">Refer to IPD</button>
          <button type="submit" className="rounded-md border border-blue-900 bg-blue-900 px-3 py-1 text-sm text-white hover:bg-blue-950">Save</button>
        </div>
        {saved && <div className="text-sm text-emerald-600">Saved</div>}
      </form>
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
