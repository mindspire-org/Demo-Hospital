import { useEffect, useMemo, useRef, useState } from 'react'
import { hospitalApi, labApi, pharmacyApi, diagnosticApi } from '../../utils/api'
import PrescriptionPrint from '../../components/doctor/PrescriptionPrint'
import { previewPrescriptionPdf } from '../../utils/prescriptionPdf'
import type { PrescriptionPdfTemplate } from '../../utils/prescriptionPdf'
import { previewPreAnesthesiaPdf } from '../../utils/preAnesthesiaPdf'
import Doctor_PreAnesthesiaForm from '../../components/doctor/Doctor_PreAnesthesiaForm'
import type { PreAnesthesiaData } from '../../components/doctor/Doctor_PreAnesthesiaForm'
import PrescriptionVitals from '../../components/doctor/PrescriptionVitals'
import PrescriptionDiagnosticOrders from '../../components/doctor/PrescriptionDiagnosticOrders'
import Doctor_IpdReferralForm from '../../components/doctor/Doctor_IpdReferralForm'
import { opdApi } from '../../features/hospital/opd/opd.api'
import SuggestField from '../../components/SuggestField'

type DoctorSession = { id: string; name: string; username: string }

type Prescription = {
  id: string
  doctorId: string
  encounterId: string
  patientName: string
  mrNo?: string
  prescriptionMode?: 'electronic'|'manual'
  manualAttachment?: { mimeType?: string; fileName?: string; dataUrl?: string; uploadedAt?: string }
  diagnosis?: string
  primaryComplaint?: string
  primaryComplaintHistory?: string
  familyHistory?: string
  allergyHistory?: string
  treatmentHistory?: string
  history?: string
  examFindings?: string
  advice?: string
  medicines?: string
  preAnesthesia?: any
  createdAt: string
}

const emptyPreAnesthesia = (): PreAnesthesiaData => ({
  isApplied: false,
  history: { cvs: '', respiratory: '', renal: '', hepatic: '', diabetic: '', neurology: '', previousAnesthesia: '', allergies: '' },
  examination: { mallampatiScore: '', asaClass: '', airway: '', teeth: '', notes: '' },
  recommendation: '',
})

export default function Doctor_PrescriptionHistory() {
  const [doc, setDoc] = useState<DoctorSession | null>(null)
  const [list, setList] = useState<Prescription[]>([])
  const [q, setQ] = useState('')
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [printData, setPrintData] = useState<any | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editActiveTab, setEditActiveTab] = useState<'details'|'vitals'|'labs'|'diagnostics'|'meds'|'anesthesia'>('details')
  const [editingId, setEditingId] = useState<string>('')
  const [editForm, setEditForm] = useState<{
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
    labTestsText?: string
    preAnesthesia?: PreAnesthesiaData
    items: Array<{ name: string; frequency?: string; duration?: string; dose?: string; route?: string; instruction?: string; notes?: string }>
  }>({ items: [], labTestsText: '', preAnesthesia: emptyPreAnesthesia() })
  const vitalsEditRef = useRef<any>(null)
  const diagEditRef = useRef<any>(null)
  const [editVitalsDisplay, setEditVitalsDisplay] = useState<any>({})
  const [editDiagDisplay, setEditDiagDisplay] = useState<{ testsText?: string; notes?: string }>({})
  const [confirmDlg, setConfirmDlg] = useState<{ open: boolean; type?: 'lab'|'pharmacy'|'diagnostic'|'delete'; target?: Prescription | null }>({ open: false })
  const [toast, setToast] = useState<{ msg: string; kind: 'success'|'error' } | null>(null)
  const [refFlags, setRefFlags] = useState<Record<string, { ph?: boolean; lab?: boolean; diag?: boolean }>>({})
  const [attachView, setAttachView] = useState<{ open: boolean; fileName?: string; mimeType?: string; dataUrl?: string }>(()=>({ open: false }))
  const [ipdReferralOpen, setIpdReferralOpen] = useState(false)
  const [ipdReferralPrescription, setIpdReferralPrescription] = useState<Prescription | null>(null)
  const [medNameSuggestions, setMedNameSuggestions] = useState<string[]>([])
  const [labTestSuggestions, setLabTestSuggestions] = useState<string[]>([])
  const [diagnosticTestSuggestions, setDiagnosticTestSuggestions] = useState<string[]>([])
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

  const defaultDoses = ['1 mg', '2 mg', '5 mg', '10 mg', '20 mg', '25 mg', '50 mg', '100 mg', '200 mg', '250 mg', '500 mg', '1 g', '1 ml', '2 ml', '5 ml', '10 ml', '1 tsp', '1 tbsp', '1 drop', '2 drops', '1 puff', '1 tablet', '2 tablets', '1 capsule', '1 sachet']
  const defaultRoutes = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Sublingual', 'Rectal', 'Vaginal', 'Inhalation', 'Nasal', 'Ocular', 'Ear drops', 'Local application']
  const defaultInstructions = ['Before meals', 'After meals', 'With meals', 'Empty stomach', 'Bed time', 'Morning', 'Night', 'Once daily', 'Twice daily', 'Thrice daily', 'Four times daily', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'SOS', 'PRN', 'Stat', 'As directed']
  const defaultDurations = ['1 day', '2 days', '3 days', '5 days', '7 days', '10 days', '14 days', '1 week', '2 weeks', '3 weeks', '4 weeks', '1 month', '2 months', '3 months', '6 months']
  const defaultFrequencies = ['Once daily (OD)', 'Twice daily (BD)', 'Thrice daily (TID)', 'Four times daily (QID)', 'Every morning', 'Every night', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'SOS', 'Stat', 'Alternate days', 'Weekly', 'Monthly']

  const sugDose = useMemo(() => defaultDoses, [])
  const sugInstr = useMemo(() => defaultInstructions, [])
  const sugRoute = useMemo(() => defaultRoutes, [])
  const sugDuration = useMemo(() => defaultDurations, [])
  const sugFreq = useMemo(() => defaultFrequencies, [])

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
  }, [doc?.id])

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem('doctor.session')
      const sess = raw ? JSON.parse(raw) : null
      setDoc(sess)
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

  useEffect(() => { load() }, [doc?.id, from, to, page, limit])
  useEffect(() => {
    const h = () => { load() }
    window.addEventListener('doctor:pres-saved', h as any)
    return () => window.removeEventListener('doctor:pres-saved', h as any)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id])

  async function load(){
    try {
      if (!doc?.id) { setList([]); return }
      const res = await hospitalApi.listPrescriptions({ doctorId: doc.id, from: from || undefined, to: to || undefined, page, limit }) as any
      const rows: any[] = res?.prescriptions || []
      const items: Prescription[] = rows.map((r: any) => ({
        id: String(r._id || r.id),
        doctorId: String(r.encounterId?.doctorId?._id || r.encounterId?.doctorId || ''),
        encounterId: String(r.encounterId?._id || r.encounterId || ''),
        patientName: r.encounterId?.patientId?.fullName || '-',
        mrNo: r.encounterId?.patientId?.mrn || '-',
        prescriptionMode: r.prescriptionMode || 'electronic',
        manualAttachment: r.manualAttachment,
        diagnosis: r.diagnosis,
        primaryComplaint: r.primaryComplaint || r.complaints,
        primaryComplaintHistory: r.primaryComplaintHistory,
        familyHistory: r.familyHistory,
        allergyHistory: r.allergyHistory,
        treatmentHistory: r.treatmentHistory,
        history: r.history,
        examFindings: r.examFindings,
        advice: r.advice,
        medicines: (r.items || []).map((it: any) => `${it.name}${it.frequency?` • ${it.frequency}`:''}${it.duration?` • ${it.duration}`:''}${it.dose?` • ${it.dose}`:''}`).join('\n'),
        preAnesthesia: r.preAnesthesia,
        createdAt: r.createdAt,
      }))
      setList(items)
      setTotal(Number(res?.total || items.length))
      // load referral flags for visible range
      try {
        const [ph, lb, dg] = await Promise.all([
          hospitalApi.listReferrals({ type: 'pharmacy', doctorId: doc.id, from: from || undefined, to: to || undefined, page: 1, limit: 200 }) as any,
          hospitalApi.listReferrals({ type: 'lab', doctorId: doc.id, from: from || undefined, to: to || undefined, page: 1, limit: 200 }) as any,
          hospitalApi.listReferrals({ type: 'diagnostic', doctorId: doc.id, from: from || undefined, to: to || undefined, page: 1, limit: 200 }) as any,
        ])
        const map: Record<string, { ph?: boolean; lab?: boolean; diag?: boolean }> = {}
        ;(ph?.referrals||[]).forEach((r: any) => { const pid = String(r.prescriptionId || '') ; if (!pid) return; map[pid] = { ...(map[pid]||{}), ph: true } })
        ;(lb?.referrals||[]).forEach((r: any) => { const pid = String(r.prescriptionId || '') ; if (!pid) return; map[pid] = { ...(map[pid]||{}), lab: true } })
        ;(dg?.referrals||[]).forEach((r: any) => { const pid = String(r.prescriptionId || '') ; if (!pid) return; map[pid] = { ...(map[pid]||{}), diag: true } })
        setRefFlags(map)
      } catch {}
    } catch {
      setList([])
      setTotal(0)
    }
  }

  const mine = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (list || []).filter(p => p.doctorId === doc?.id && (!s || `${p.patientName} ${p.mrNo || ''} ${p.diagnosis || ''}`.toLowerCase().includes(s)))
  }, [list, doc, q])

  async function handlePrint(id: string){
    const data: any = await fetchPrintData(id)
    setPrintData(data)
    // Fetch template from database
    let tpl: PrescriptionPdfTemplate = 'hospital-rx'
    try {
      if (doc?.id) {
        const doctorData: any = await hospitalApi.getDoctor(doc.id)
        if (doctorData?.doctor?.prescriptionTemplate) {
          tpl = doctorData.doctor.prescriptionTemplate
        }
      }
    } catch {}
    await previewPrescriptionPdf({
      doctor: data.doctor || {},
      settings: data.settings || {},
      patient: data.patient || {},
      items: data.items || [],
      vitals: data.vitals,
      primaryComplaint: data.primaryComplaint,
      primaryComplaintHistory: data.primaryComplaintHistory,
      familyHistory: data.familyHistory,
      allergyHistory: data.allergyHistory,
      treatmentHistory: data.treatmentHistory,
      history: data.history,
      examFindings: data.examFindings,
      diagnosis: data.diagnosis,
      advice: data.advice,
      labTests: data.labTests || [],
      labNotes: data.labNotes || '',
      diagnosticTests: data.diagnosticTests || [],
      diagnosticNotes: data.diagnosticNotes || '',
      tokenNo: data.tokenNo,
      createdAt: data.createdAt,
    }, tpl)
  }

  async function handlePrintPreAssessment(prescriptionId: string) {
    try {
      const data = await fetchPrintData(prescriptionId)
      const res: any = await hospitalApi.getPrescription(prescriptionId)
      const p = res?.prescription
      if (!p?.preAnesthesia?.isApplied) {
        setToast({ msg: 'No pre-assessment form attached', kind: 'error' })
        return
      }
      await previewPreAnesthesiaPdf({
        doctor: data.doctor || {},
        settings: data.settings || {},
        patient: data.patient || {},
        preAnesthesia: p.preAnesthesia,
        vitals: p.vitals || {},
        createdAt: p.createdAt,
      })
    } catch (e) {
      console.error('Failed to print pre-assessment:', e)
      setToast({ msg: 'Failed to print pre-assessment', kind: 'error' })
    }
  }

  async function openAttachment(p: Prescription){
    try {
      if (p.manualAttachment?.dataUrl) {
        setAttachView({ open: true, fileName: p.manualAttachment.fileName, mimeType: p.manualAttachment.mimeType, dataUrl: p.manualAttachment.dataUrl })
        return
      }
      const res: any = await hospitalApi.getPrescription(p.id)
      const row = res?.prescription
      const att = row?.manualAttachment
      setAttachView({ open: true, fileName: att?.fileName, mimeType: att?.mimeType, dataUrl: att?.dataUrl })
    } catch {
      setToast({ msg: 'Failed to load attachment', kind: 'error' })
    }
  }

  async function referToPharmacy(p: Prescription){
    try {
      if (!doc?.id) { setToast({ msg: 'Session missing', kind: 'error' }); return }
      await hospitalApi.createReferral({ type: 'pharmacy', encounterId: p.encounterId, doctorId: doc.id, prescriptionId: p.id })
      try { window.dispatchEvent(new CustomEvent('doctor:pres-saved')) } catch {}
      setToast({ msg: 'Pharmacy referral created', kind: 'success' })
      setRefFlags(prev => ({ ...prev, [p.id]: { ...(prev[p.id]||{}), ph: true } }))
    } catch (e: any) {
      setToast({ msg: e?.message || 'Failed to refer to pharmacy', kind: 'error' })
    }
  }

  async function referToLab(p: Prescription){
    try {
      if (!doc?.id) { setToast({ msg: 'Session missing', kind: 'error' }); return }
      let tests: string[] | undefined
      let notes: string | undefined
      try {
        const res: any = await hospitalApi.getPrescription(p.id)
        const pres = res?.prescription
        if (pres?.labTests?.length) tests = pres.labTests as string[]
        if (pres?.labNotes) notes = String(pres.labNotes)
      } catch {}
      await hospitalApi.createReferral({ type: 'lab', encounterId: p.encounterId, doctorId: doc.id, prescriptionId: p.id, tests, notes })
      try { window.dispatchEvent(new CustomEvent('doctor:pres-saved')) } catch {}
      setToast({ msg: 'Lab referral created', kind: 'success' })
      setRefFlags(prev => ({ ...prev, [p.id]: { ...(prev[p.id]||{}), lab: true } }))
    } catch (e: any) {
      setToast({ msg: e?.message || 'Failed to create lab referral', kind: 'error' })
    }
  }

  async function referToDiagnostic(p: Prescription){
    try {
      if (!doc?.id) { setToast({ msg: 'Session missing', kind: 'error' }); return }
      let tests: string[] | undefined
      let notes: string | undefined
      try {
        const res: any = await hospitalApi.getPrescription(p.id)
        const pres = res?.prescription
        if (pres?.diagnosticTests?.length) tests = pres.diagnosticTests as string[]
        if (pres?.diagnosticNotes) notes = String(pres.diagnosticNotes)
      } catch {}
      await hospitalApi.createReferral({ type: 'diagnostic', encounterId: p.encounterId, doctorId: doc.id, prescriptionId: p.id, tests, notes })
      try { window.dispatchEvent(new CustomEvent('doctor:pres-saved')) } catch {}
      setToast({ msg: 'Diagnostic referral created', kind: 'success' })
      setRefFlags(prev => ({ ...prev, [p.id]: { ...(prev[p.id]||{}), diag: true } }))
    } catch (e: any) {
      setToast({ msg: e?.message || 'Failed to create diagnostic referral', kind: 'error' })
    }
  }

  function openConfirm(type: 'lab'|'pharmacy'|'diagnostic'|'delete', p: Prescription){
    if (type==='pharmacy' && (refFlags[p.id]?.ph)) { setToast({ msg: 'Already referred to pharmacy', kind: 'success' }); return }
    if (type==='lab' && (refFlags[p.id]?.lab)) { setToast({ msg: 'Already referred to lab', kind: 'success' }); return }
    if (type==='diagnostic' && (refFlags[p.id]?.diag)) { setToast({ msg: 'Already referred to diagnostic', kind: 'success' }); return }
    setConfirmDlg({ open: true, type, target: p })
  }

  async function confirmReferral(){
    const p = confirmDlg.target
    if (!confirmDlg.open || !confirmDlg.type || !p) { setConfirmDlg({ open: false }); return }
    const t = confirmDlg.type
    setConfirmDlg({ open: false })
    if (t === 'pharmacy') await referToPharmacy(p)
    if (t === 'lab') await referToLab(p)
    if (t === 'diagnostic') await referToDiagnostic(p)
    if (t === 'delete') await deletePres(p.id)
  }

  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(null), 2000)
      return () => clearTimeout(id)
    }
  }, [toast])

  async function openEditor(id: string){
    try {
      const res: any = await hospitalApi.getPrescription(id)
      const p = res?.prescription
      setEditingId(id)
      // parse route/instruction from notes for each item
      const items = (p?.items || []).map((m: any) => {
        const nt = String(m?.notes || '')
        const mRoute = nt.match(/Route:\s*([^;]+)/i)
        const mInstr = nt.match(/Instruction:\s*([^;]+)/i)
        return { name: m.name || '', frequency: m.frequency || '', duration: m.duration || '', dose: m.dose || '', route: mRoute?.[1]?.trim() || '', instruction: mInstr?.[1]?.trim() || '', notes: m.notes || '' }
      })
      setEditForm({
        primaryComplaint: p?.primaryComplaint || '',
        primaryComplaintHistory: p?.primaryComplaintHistory || '',
        familyHistory: p?.familyHistory || '',
        allergyHistory: p?.allergyHistory || '',
        treatmentHistory: p?.treatmentHistory || '',
        history: p?.history || '',
        examFindings: p?.examFindings || '',
        diagnosis: p?.diagnosis || '',
        advice: p?.advice || '',
        nextFollowUp: (p as any)?.nextFollowUp || '',
        labTestsText: Array.isArray(p?.labTests) && p.labTests.length ? (p.labTests as string[]).join(', ') : '',
        preAnesthesia: p?.preAnesthesia ? {
          isApplied: p.preAnesthesia.isApplied ?? true,
          history: {
            cvs: p.preAnesthesia.history?.cvs || '',
            respiratory: p.preAnesthesia.history?.respiratory || '',
            renal: p.preAnesthesia.history?.renal || '',
            hepatic: p.preAnesthesia.history?.hepatic || '',
            diabetic: p.preAnesthesia.history?.diabetic || '',
            neurology: p.preAnesthesia.history?.neurology || '',
            previousAnesthesia: p.preAnesthesia.history?.previousAnesthesia || '',
            allergies: p.preAnesthesia.history?.allergies || '',
          },
          examination: {
            mallampatiScore: p.preAnesthesia.examination?.mallampatiScore || '',
            asaClass: p.preAnesthesia.examination?.asaClass || '',
            airway: p.preAnesthesia.examination?.airway || '',
            teeth: p.preAnesthesia.examination?.teeth || '',
            notes: p.preAnesthesia.examination?.notes || '',
          },
          recommendation: p.preAnesthesia.recommendation || '',
        } : emptyPreAnesthesia(),
        items,
      })
      // seed vitals/diagnostics display for tabs - fetch from token collection
      try {
        let v: any = {}
        // Try to fetch vitals from token collection
        try {
          if (p?.encounterId) {
            const tokenRes: any = await opdApi.listTokens({ limit: 100 })
            const token = tokenRes?.tokens?.find((t: any) => t.encounterId === p.encounterId)
            if (token?.vitals) {
              v = token.vitals
            }
          }
        } catch {}
        // Fallback to prescription vitals if token doesn't have vitals
        if (!v || Object.keys(v).length === 0) {
          v = p?.vitals || {}
        }
        setEditVitalsDisplay({
          pulse: v.pulse!=null?String(v.pulse):'',
          temperature: v.temperatureC!=null?String(v.temperatureC):'',
          bloodPressureSys: v.bloodPressureSys!=null?String(v.bloodPressureSys):'',
          bloodPressureDia: v.bloodPressureDia!=null?String(v.bloodPressureDia):'',
          respiratoryRate: v.respiratoryRate!=null?String(v.respiratoryRate):'',
          bloodSugar: v.bloodSugar!=null?String(v.bloodSugar):'',
          weightKg: v.weightKg!=null?String(v.weightKg):'',
          height: v.heightCm!=null?String(v.heightCm):'',
          spo2: v.spo2!=null?String(v.spo2):'',
          ar: v.ar!=null?String(v.ar):'',
          va: v.va!=null?String(v.va):'',
          iop: v.iop!=null?String(v.iop):'',
        })
      } catch {}
      try {
        const tests = Array.isArray(p?.diagnosticTests) ? (p.diagnosticTests as string[]).join(', ') : ''
        setEditDiagDisplay({ testsText: tests, notes: p?.diagnosticNotes || '' })
      } catch {}
      setEditActiveTab('details')
      setEditOpen(true)
    } catch (e: any) {
      setToast({ msg: e?.message || 'Failed to load prescription', kind: 'error' })
    }
  }

  const setItem = (i: number, key: 'name'|'frequency'|'duration'|'dose'|'notes'|'route'|'instruction', val: string) => {
    setEditForm(f => {
      const next = [...f.items]
      next[i] = { ...next[i], [key]: val }
      return { ...f, items: next }
    })
  }
  const addItemAfter = (i: number) => setEditForm(f => ({ ...f, items: [...f.items.slice(0,i+1), { name: '', frequency: '', duration: '', dose: '', notes: '' }, ...f.items.slice(i+1)] }))
  const removeItemAt = (i: number) => setEditForm(f => ({ ...f, items: f.items.length>1 ? f.items.filter((_,idx)=>idx!==i) : f.items }))

  function goEditTab(tab: 'details'|'vitals'|'labs'|'diagnostics'|'meds'|'anesthesia'){
    if (editActiveTab === 'vitals') {
      try { const disp = vitalsEditRef.current?.getDisplay?.(); if (disp) setEditVitalsDisplay(disp) } catch {}
    }
    if (editActiveTab === 'diagnostics') {
      try { const dd = diagEditRef.current?.getDisplay?.(); if (dd) setEditDiagDisplay(dd) } catch {}
    }
    setEditActiveTab(tab)
  }

  async function saveEdit(){
    const payload: any = {
      primaryComplaint: editForm.primaryComplaint || undefined,
      primaryComplaintHistory: editForm.primaryComplaintHistory || undefined,
      familyHistory: editForm.familyHistory || undefined,
      allergyHistory: editForm.allergyHistory || undefined,
      treatmentHistory: editForm.treatmentHistory || undefined,
      history: editForm.history || undefined,
      examFindings: editForm.examFindings || undefined,
      diagnosis: editForm.diagnosis || undefined,
      advice: editForm.advice || undefined,
      nextFollowUp: editForm.nextFollowUp || undefined,
      preAnesthesia: editForm.preAnesthesia,
      items: (editForm.items||[]).filter(it => (it.name||'').trim()).map(it => ({ 
        name: String(it.name).trim(), 
        frequency: it.frequency || undefined, 
        duration: it.duration || undefined, 
        dose: it.dose || undefined, 
        route: it.route || undefined,
        instruction: it.instruction || undefined,
        notes: it.notes || undefined 
      })),
    }
    if (editForm.labTestsText !== undefined) {
      const tests = String(editForm.labTestsText||'').split(/\n|,/).map(s=>s.trim()).filter(Boolean)
      payload.labTests = tests.length ? tests : []
    }
    // diagnostics from tab
    try {
      let dRaw: any = {}
      try { dRaw = diagEditRef.current?.getData?.() || {} } catch {}
      if (Array.isArray(dRaw.tests) && dRaw.tests.length) payload.diagnosticTests = dRaw.tests
      else if ((editDiagDisplay.testsText||'').trim()) payload.diagnosticTests = String(editDiagDisplay.testsText).split(/\n|,/).map(s=>s.trim()).filter(Boolean)
      if (dRaw.notes && String(dRaw.notes).trim()) payload.diagnosticNotes = dRaw.notes
      else if ((editDiagDisplay.notes||'').trim()) payload.diagnosticNotes = editDiagDisplay.notes
    } catch {}
    if (!payload.items || payload.items.length===0){ setToast({ msg: 'Add at least one medicine', kind: 'error' }); return }
    try {
      // vitals from tab - save to token instead of prescription
      let vitals: any = undefined
      try {
        let vRaw: any
        try { vRaw = vitalsEditRef.current?.getNormalized?.() } catch {}
        const hasVitals = vRaw && Object.values(vRaw).some((x: any) => x != null && !(typeof x === 'number' && isNaN(x)))
        if (hasVitals) vitals = vRaw
        else if ((editVitalsDisplay) && Object.values(editVitalsDisplay).some(Boolean)){
          const d: any = editVitalsDisplay
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
      } catch {}
      await hospitalApi.updatePrescription(editingId, payload)
      // Save vitals to the token collection
      if (vitals) {
        try {
          const tokenRes: any = await opdApi.listTokens({ limit: 100 })
          const token = tokenRes?.tokens?.find((t: any) => t.encounterId === payload.encounterId)
          if (token?.id) {
            await opdApi.updateToken(token.id, { vitals })
          }
        } catch (err) {
          console.error('Failed to save vitals to token:', err)
        }
      }
      setEditOpen(false)
      await load()
      try { window.dispatchEvent(new CustomEvent('doctor:pres-saved')) } catch {}
    } catch (e: any) {
      setToast({ msg: e?.message || 'Failed to update prescription', kind: 'error' })
    }
  }

  async function deletePres(id: string){
    try {
      await hospitalApi.deletePrescription(id)
      await load()
      try { window.dispatchEvent(new CustomEvent('doctor:pres-saved')) } catch {}
      setToast({ msg: 'Prescription deleted', kind: 'success' })
    } catch (e: any) {
      setToast({ msg: e?.message || 'Failed to delete prescription', kind: 'error' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="no-print space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xl font-semibold text-slate-800">Prescription History</div>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e=>{ setPage(1); setFrom(e.target.value) }} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <span className="text-slate-500 text-sm">to</span>
          <input type="date" value={to} onChange={e=>{ setPage(1); setTo(e.target.value) }} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select value={limit} onChange={e=>{ setPage(1); setLimit(parseInt(e.target.value)||20) }} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm">
          <div className="font-medium text-slate-800">Results</div>
          <div className="text-slate-600">{total ? `${(page-1)*limit+1}-${Math.min(page*limit,total)} of ${total}` : ''}</div>
        </div>
        <div className="divide-y divide-slate-200">
          {mine.map(p => (
            <div key={p.id} className="px-4 py-3 text-sm">
              <div className="font-medium">{p.patientName} <span className="text-xs text-slate-500">{p.mrNo || ''}</span></div>
              <div className="text-xs text-slate-600">{new Date(p.createdAt).toLocaleString()} • {p.diagnosis || '-'}</div>
              {p.primaryComplaint && <div className="mt-1 text-xs text-slate-700"><span className="font-semibold">Primary Complaint:</span> {p.primaryComplaint}</div>}
              {p.primaryComplaintHistory && <div className="mt-1 text-xs text-slate-700"><span className="font-semibold">History of Primary Complaint:</span> {p.primaryComplaintHistory}</div>}
              {p.familyHistory && <div className="mt-1 text-xs text-slate-700"><span className="font-semibold">Family History:</span> {p.familyHistory}</div>}
              {p.allergyHistory && <div className="mt-1 text-xs text-slate-700"><span className="font-semibold">Allergy History:</span> {p.allergyHistory}</div>}
              {p.treatmentHistory && <div className="mt-1 text-xs text-slate-700"><span className="font-semibold">Treatment History:</span> {p.treatmentHistory}</div>}
              {p.history && <div className="mt-1 text-xs text-slate-700"><span className="font-semibold">History:</span> {p.history}</div>}
              {p.examFindings && <div className="mt-1 text-xs text-slate-700"><span className="font-semibold">Findings:</span> {p.examFindings}</div>}
              {p.advice && <div className="mt-1 text-xs text-slate-700"><span className="font-semibold">Advice:</span> {p.advice}</div>}
              {p.medicines && <pre className="mt-1 whitespace-pre-wrap text-xs text-slate-700">{p.medicines}</pre>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button className="rounded-md border border-blue-900 bg-blue-900 px-3 py-1 text-sm text-white hover:bg-blue-950" onClick={()=>handlePrint(p.id)}>Print</button>
                <button
                  onClick={() => handlePrintPreAssessment(p.id)}
                  disabled={!p.preAnesthesia?.isApplied}
                  className="flex items-center gap-1 rounded-md border border-teal-600 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={!p.preAnesthesia?.isApplied ? 'No Preassessment form in this prescription' : 'Print Preassessment Form'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Print Preassessment
                </button>
                <button className="rounded-md border border-blue-900 bg-blue-900 px-3 py-1 text-sm text-white hover:bg-blue-950" onClick={()=>{ setIpdReferralPrescription(p); setIpdReferralOpen(true) }}>Referral Form</button>
                {p.prescriptionMode === 'manual' && (p.manualAttachment?.dataUrl || p.manualAttachment?.fileName) && (
                  <button className="rounded-md border border-blue-900 bg-blue-900 px-3 py-1 text-sm text-white hover:bg-blue-950" onClick={()=>openAttachment(p)}>View Attachment</button>
                )}
                {(() => { const done = !!refFlags[p.id]?.ph; return (
                  <button
                    className={`rounded-md px-3 py-1 text-sm ${done?'border-blue-900 bg-blue-100 text-blue-900':'border border-blue-900 bg-blue-900 text-white hover:bg-blue-950'}`}
                    disabled={done}
                    title={done?'Already referred to pharmacy':''}
                    onClick={()=>openConfirm('pharmacy', p)}
                  >Refer to Pharmacy</button>
                )})()}
                {(() => { const done = !!refFlags[p.id]?.lab; return (
                  <button
                    className={`rounded-md px-3 py-1 text-sm ${done?'border-blue-900 bg-blue-100 text-blue-900':'border border-blue-900 bg-blue-900 text-white hover:bg-blue-950'}`}
                    disabled={done}
                    title={done?'Already referred to lab':''}
                    onClick={()=>openConfirm('lab', p)}
                  >Refer to Lab</button>
                )})()}
                {(() => { const done = !!refFlags[p.id]?.diag; return (
                  <button
                    className={`rounded-md px-3 py-1 text-sm ${done?'border-blue-900 bg-blue-100 text-blue-900':'border border-blue-900 bg-blue-900 text-white hover:bg-blue-950'}`}
                    disabled={done}
                    title={done?'Already referred to diagnostic':''}
                    onClick={()=>openConfirm('diagnostic', p)}
                  >Refer to Diagnostic</button>
                )})()}
                <button className="rounded-md border border-blue-900 bg-blue-900 px-3 py-1 text-sm text-white hover:bg-blue-950" onClick={()=>openEditor(p.id)}>Edit</button>
                <button className="rounded-md border border-blue-900 bg-blue-900 px-3 py-1 text-sm text-white hover:bg-blue-950" onClick={()=>openConfirm('delete', p)}>Delete</button>
              </div>
            </div>
          ))}
          {mine.length === 0 && <div className="px-4 py-8 text-center text-slate-500 text-sm">No prescriptions</div>}
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <button className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
          <div className="text-slate-600">Page {page}</div>
          <button className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50" disabled={page*limit>=total} onClick={()=>setPage(p=>p+1)}>Next</button>
        </div>
        </div>
      </div>

      {printData && (
        <PrescriptionPrint
          printId="prescription-print-history"
          doctor={printData.doctor || {}}
          settings={printData.settings || { name: '', address: '', phone: '' }}
          patient={printData.patient || {}}
          items={printData.items || []}
          labTests={printData.labTests || []}
          labNotes={printData.labNotes || ''}
          diagnosticTests={printData.diagnosticTests || []}
          diagnosticNotes={printData.diagnosticNotes || ''}
          primaryComplaint={printData.primaryComplaint}
          primaryComplaintHistory={printData.primaryComplaintHistory}
          familyHistory={printData.familyHistory}
          allergyHistory={printData.allergyHistory}
          treatmentHistory={printData.treatmentHistory}
          history={printData.history}
          examFindings={printData.examFindings}
          diagnosis={printData.diagnosis}
          advice={printData.advice}
          createdAt={printData.createdAt}
        />
      )}
      {/* Confirm referral modal */}
      {confirmDlg.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-4">
            <div className="mb-3 text-lg font-semibold text-slate-800">{confirmDlg.type==='delete' ? 'Delete Prescription' : 'Confirm Referral'}</div>
            <div className="text-sm text-slate-700">
              {confirmDlg.type==='delete' ? 'Are you sure you want to delete this prescription? This action cannot be undone.' : `Create a ${confirmDlg.type==='pharmacy'?'Pharmacy':confirmDlg.type==='lab'?'Lab':'Diagnostic'} referral for this prescription?`}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={()=>setConfirmDlg({ open: false })} className="btn-outline-navy">Cancel</button>
              <button onClick={confirmReferral} className="btn">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed right-4 top-4 z-60">
          <div className={`rounded-md px-3 py-2 text-sm shadow ${toast.kind==='success'?'bg-emerald-600 text-white':'bg-rose-600 text-white'}`}>{toast.msg}</div>
        </div>
      )}

      {attachView.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={()=>setAttachView({ open: false })}>
          <div className="w-full max-w-4xl rounded-xl bg-white p-4" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-800">Prescription Attachment</div>
              <div className="flex items-center gap-2">
                {attachView.dataUrl && (
                  <a className="rounded-md border border-slate-300 px-3 py-1 text-sm" href={attachView.dataUrl} download={attachView.fileName || 'prescription-attachment'}>Download</a>
                )}
                <button className="btn" onClick={()=>setAttachView({ open: false })}>Close</button>
              </div>
            </div>
            <div className="mt-3 max-h-[75vh] overflow-auto rounded-lg border border-slate-200 p-2">
              {attachView.dataUrl && (attachView.mimeType || '').startsWith('image/') && (
                <img src={attachView.dataUrl} alt="Attachment" className="mx-auto max-h-[70vh]" />
              )}
              {attachView.dataUrl && (attachView.mimeType || '').includes('pdf') && (
                <iframe title="Attachment" src={attachView.dataUrl} className="h-[70vh] w-full" />
              )}
              {!attachView.dataUrl && (
                <div className="p-6 text-center text-sm text-slate-500">No attachment data</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* IPD Referral Dialog */}
      {ipdReferralOpen && ipdReferralPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold text-slate-800">Referral Form</div>
              <button className="btn-outline-navy" onClick={()=>{ setIpdReferralOpen(false); setIpdReferralPrescription(null) }}>Close</button>
            </div>
            <Doctor_IpdReferralForm
              mrn={ipdReferralPrescription.mrNo}
              doctor={doc ? { id: doc.id, name: doc.name } : undefined}
              initialData={{
                provisionalDiagnosis: ipdReferralPrescription.diagnosis,
              }}
              onSaved={(_id) => {
                setToast({ msg: 'IPD referral created', kind: 'success' })
                setIpdReferralOpen(false)
                setIpdReferralPrescription(null)
              }}
            />
          </div>
        </div>
      )}
      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex flex-col w-full max-w-5xl h-[85vh] rounded-xl bg-white p-6 shadow-2xl overflow-hidden">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Edit Prescription</h3>
              <button onClick={()=>setEditOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="border-b border-slate-200">
              <nav className="-mb-px flex gap-6">
                {[
                  { id: 'details', label: 'Details' },
                  { id: 'vitals', label: 'Vitals' },
                  { id: 'labs', label: 'Lab Orders' },
                  { id: 'diagnostics', label: 'Diagnostic Orders' },
                  { id: 'meds', label: 'Medicines' },
                  { id: 'anesthesia', label: 'Anesthesia' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => goEditTab(tab.id as any)}
                    className={`pb-3 text-sm font-bold transition-all border-b-2 ${
                      editActiveTab === tab.id
                        ? 'border-sky-600 text-sky-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex-1 overflow-y-auto py-6">
              {editActiveTab==='details' && (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Primary Complaint</label>
                    <SuggestField rows={3} value={editForm.primaryComplaint||''} onChange={v=>setEditForm(f=>({ ...f, primaryComplaint: v }))} suggestions={doctorCustomSuggestions.primaryComplaint} className="w-full rounded-lg border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-sky-500 shadow-sm transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Risk Factors / Medical History</label>
                    <SuggestField rows={3} value={editForm.history||''} onChange={v=>setEditForm(f=>({ ...f, history: v }))} suggestions={doctorCustomSuggestions.history} className="w-full rounded-lg border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-sky-500 shadow-sm transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">History of Primary Complaint</label>
                    <SuggestField rows={3} value={editForm.primaryComplaintHistory||''} onChange={v=>setEditForm(f=>({ ...f, primaryComplaintHistory: v }))} suggestions={doctorCustomSuggestions.primaryComplaintHistory} className="w-full rounded-lg border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-sky-500 shadow-sm transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Family History</label>
                    <SuggestField rows={3} value={editForm.familyHistory||''} onChange={v=>setEditForm(f=>({ ...f, familyHistory: v }))} suggestions={doctorCustomSuggestions.familyHistory} className="w-full rounded-lg border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-sky-500 shadow-sm transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Allergy History</label>
                    <SuggestField rows={3} value={editForm.allergyHistory||''} onChange={v=>setEditForm(f=>({ ...f, allergyHistory: v }))} suggestions={doctorCustomSuggestions.allergyHistory} className="w-full rounded-lg border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-sky-500 shadow-sm transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Treatment History</label>
                    <SuggestField rows={3} value={editForm.treatmentHistory||''} onChange={v=>setEditForm(f=>({ ...f, treatmentHistory: v }))} suggestions={doctorCustomSuggestions.treatmentHistory} className="w-full rounded-lg border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-sky-500 shadow-sm transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Examination Findings</label>
                    <SuggestField rows={3} value={editForm.examFindings||''} onChange={v=>setEditForm(f=>({ ...f, examFindings: v }))} suggestions={doctorCustomSuggestions.examFindings} className="w-full rounded-lg border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-sky-500 shadow-sm transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Diagnosis / Disease</label>
                    <SuggestField as="input" value={editForm.diagnosis||''} onChange={v=>setEditForm(f=>({ ...f, diagnosis: v }))} suggestions={doctorCustomSuggestions.diagnosis} className="w-full rounded-lg border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-sky-500 shadow-sm transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Advice/Referral</label>
                    <SuggestField rows={3} value={editForm.advice||''} onChange={v=>setEditForm(f=>({ ...f, advice: v }))} suggestions={doctorCustomSuggestions.advice} className="w-full rounded-lg border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-sky-500 shadow-sm transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Next Follow Up</label>
                    <SuggestField as="input" value={editForm.nextFollowUp||''} onChange={v=>setEditForm(f=>({ ...f, nextFollowUp: v }))} suggestions={['After 3 days', 'After 1 week', 'After 2 weeks', 'After 1 month', 'SOS']} className="w-full rounded-lg border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-sky-500 shadow-sm transition-all" />
                  </div>
                </div>
              )}
              {editActiveTab==='vitals' && (
                <div className="animate-in fade-in duration-300">
                  <PrescriptionVitals ref={vitalsEditRef} initial={editVitalsDisplay} />
                </div>
              )}
              {editActiveTab==='labs' && (
                <div className="animate-in fade-in duration-300 max-w-2xl mx-auto">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Lab Tests (comma or one per line)</label>
                    <SuggestField mode="multi" rows={6} value={editForm.labTestsText||''} onChange={v=>setEditForm(f=>({ ...f, labTestsText: v }))} suggestions={labTestSuggestions} className="w-full rounded-lg border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:ring-sky-500 shadow-sm transition-all" placeholder="CBC, LFT, KFT" />
                  </div>
                </div>
              )}
              {editActiveTab==='diagnostics' && (
                <div className="animate-in fade-in duration-300 max-w-2xl mx-auto">
                  <PrescriptionDiagnosticOrders ref={diagEditRef} initialTestsText={editDiagDisplay.testsText} suggestionsTests={diagnosticTestSuggestions} />
                </div>
              )}
              {editActiveTab==='meds' && (
                <div className="animate-in fade-in duration-300">
                  <div className="mb-4 flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700">Medicines</label>
                    <button type="button" onClick={()=>setEditForm(f=>({ ...f, items: [...f.items, { name: '', frequency: '', duration: '', dose: '', route: '', instruction: '', notes: '' }] }))} className="text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors flex items-center gap-1">
                      <span>➕</span> Add Medicine
                    </button>
                  </div>
                  <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="hidden sm:grid grid-cols-3 gap-6 bg-slate-50 px-6 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">
                      <div>Medicine Info</div>
                      <div>Dosage Info</div>
                      <div>Timing Info</div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {editForm.items.map((m, idx) => (
                        <div key={idx} className="group hover:bg-slate-50/50 transition-colors px-6 py-6">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">Medicine Name</label>
                                <SuggestField placeholder="Medicine name" value={m.name || ''} onChange={v=>setItem(idx, 'name', v)} suggestions={medNameSuggestions} className="w-full rounded-lg border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500 shadow-sm" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">Dose</label>
                                <SuggestField placeholder="Dose" value={m.dose || ''} onChange={v=>setItem(idx, 'dose', v)} suggestions={sugDose} className="w-full rounded-lg border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500 shadow-sm" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">Frequency</label>
                                <SuggestField placeholder="Frequency" value={m.frequency || ''} onChange={v=>setItem(idx, 'frequency', v)} suggestions={sugFreq} className="w-full rounded-lg border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500 shadow-sm" />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">Duration</label>
                                <SuggestField placeholder="Duration" value={m.duration || ''} onChange={v=>setItem(idx, 'duration', v)} suggestions={sugDuration} className="w-full rounded-lg border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500 shadow-sm" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">Route</label>
                                <SuggestField placeholder="Route" value={m.route || ''} onChange={v=>setItem(idx, 'route', v)} suggestions={sugRoute} className="w-full rounded-lg border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500 shadow-sm" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">Instruction</label>
                                <SuggestField placeholder="Instruction" value={m.instruction || ''} onChange={v=>setItem(idx, 'instruction', v)} suggestions={sugInstr} className="w-full rounded-lg border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500 shadow-sm" />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-700">Medicine Notes</label>
                              <input
                                type="text"
                                value={m.notes || ''}
                                onChange={e => setItem(idx, 'notes', e.target.value)}
                                placeholder="Medicine notes (optional)..."
                                className="w-full rounded-lg border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500 shadow-sm"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                              <button type="button" onClick={()=>addItemAfter(idx)} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition-all text-xs font-bold border border-sky-100" title="Add medicine below">
                                <span>➕</span> Add Another
                              </button>
                              <button type="button" onClick={()=>removeItemAt(idx)} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all text-xs font-bold border border-rose-100" title="Remove medicine">
                                <span>🗑️</span> Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {editForm.items.length===0 && (
                        <div className="p-12 text-center">
                          <p className="text-sm text-slate-500 mb-4">No medicines added yet</p>
                          <button type="button" onClick={()=>setEditForm(f=>({ ...f, items: [{ name: '', frequency: '', duration: '', dose: '', route: '', instruction: '', notes: '' }] }))} className="rounded-lg bg-sky-50 px-6 py-2 text-sm font-bold text-sky-600 hover:bg-sky-100 transition-colors">Add first medicine</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {editActiveTab==='anesthesia' && (
                <div className="animate-in fade-in duration-300">
                  <Doctor_PreAnesthesiaForm
                    data={editForm.preAnesthesia || emptyPreAnesthesia()}
                    onChange={(preAnesthesia) => setEditForm(f => ({ ...f, preAnesthesia }))}
                  />
                  {editForm.preAnesthesia?.isApplied && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handlePrintPreAssessment(editingId)}
                        className="flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-2 text-sm font-bold text-white hover:bg-teal-700 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        Print Pre-Assessment Form
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="mt-6 flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <button onClick={()=>setEditOpen(false)} className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">Cancel</button>
              <button onClick={saveEdit} className="rounded-xl bg-sky-600 px-8 py-2.5 text-sm font-bold text-white hover:bg-sky-700 hover:shadow-lg hover:shadow-sky-200 transition-all active:scale-[0.98]">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

async function fetchPrintData(id: string){
  const [detail, settings] = await Promise.all([
    hospitalApi.getPrescription(id) as any,
    hospitalApi.getSettings() as any,
  ])
  const pres = detail?.prescription
  let patient: any = { name: pres?.encounterId?.patientId?.fullName || '-', mrn: pres?.encounterId?.patientId?.mrn || '-' }
  try {
    if (patient?.mrn) {
      const resp: any = await labApi.getPatientByMrn(patient.mrn)
      const p = resp?.patient
      if (p) {
        let ageTxt = ''
        try {
          if (p.age != null) ageTxt = String(p.age)
          else if (p.dob) { const dob = new Date(p.dob); if (!isNaN(dob.getTime())) ageTxt = String(Math.max(0, Math.floor((Date.now()-dob.getTime())/31557600000))) }
        } catch {}
        patient = { name: p.fullName || patient.name, mrn: p.mrn || patient.mrn, gender: p.gender || '-', fatherName: p.fatherName || '-', phone: p.phoneNormalized || '-', address: p.address || '-', age: ageTxt }
      }
    }
  } catch {}
  // Try to enrich doctor info
  let doctor: any = { name: pres?.encounterId?.doctorId?.name || '-', specialization: '', qualification: '', departmentName: '', phone: '' }
  try {
    const drList: any = await hospitalApi.listDoctors()
    const doctors: any[] = drList?.doctors || []
    const drId = String(pres?.encounterId?.doctorId?._id || pres?.encounterId?.doctorId || '')
    const d = doctors.find(x => String(x._id || x.id) === drId)
    if (d) doctor = { name: d.name || doctor.name, specialization: d.specialization || '', qualification: d.qualification || '', departmentName: '', phone: d.phone || '' }
    try {
      const depRes: any = await hospitalApi.listDepartments({ limit: 1000 })
      const depArray: any[] = (depRes?.departments || depRes || []) as any[]
      const deptName = d?.primaryDepartmentId ? (depArray.find((z: any)=> String(z._id||z.id) === String(d.primaryDepartmentId))?.name || '') : ''
      if (deptName) doctor.departmentName = deptName
    } catch {}
  } catch {}
  return { settings, doctor, patient, items: (pres?.items || []).map((m: any) => {
    const nt = String(m?.notes || '')
    const mRoute = nt.match(/Route:\s*([^;]+)/i)
    const mInstr = nt.match(/Instruction:\s*([^;]+)/i)
    return { name: m.name || '', frequency: m.frequency || '', duration: m.duration || '', dose: m.dose || '', route: mRoute?.[1]?.trim() || m.route || '', instruction: mInstr?.[1]?.trim() || m.instruction || '' }
  }), vitals: pres?.vitals, labTests: pres?.labTests || [], labNotes: pres?.labNotes, diagnosticTests: pres?.diagnosticTests || [], diagnosticNotes: pres?.diagnosticNotes, primaryComplaint: pres?.primaryComplaint || pres?.complaints, primaryComplaintHistory: pres?.primaryComplaintHistory, familyHistory: pres?.familyHistory, treatmentHistory: pres?.treatmentHistory, history: pres?.history, examFindings: pres?.examFindings, diagnosis: pres?.diagnosis, advice: pres?.advice, createdAt: pres?.createdAt, tokenNo: pres?.tokenNo || '' }
}

// helper for fetching data used by both print and download
