import { useEffect, useMemo, useRef, useState } from 'react'
import { hospitalApi, labApi } from '../../utils/api'
import { previewPrescriptionPdf } from '../../utils/prescriptionPdf'
import type { PrescriptionPdfTemplate } from '../../utils/prescriptionPdf'
import PrescriptionVitals from '../../components/doctor/PrescriptionVitals'
import PrescriptionDiagnosticOrders from '../../components/doctor/PrescriptionDiagnosticOrders'
import Doctor_IpdReferralForm from '../../components/doctor/Doctor_IpdReferralForm'
import { 
  History, 
  Search, 
  CalendarDays, 
  Printer, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  Clock, 
  ClipboardCheck, 
  Stethoscope,
  Pill,
  Microscope,
  FileSearch,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Save
} from 'lucide-react'

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
  itemsCount?: number
  labCount?: number
  diagCount?: number
  createdAt: string
}

export default function Doctor_PrescriptionHistory() {
  const [doc, setDoc] = useState<DoctorSession | null>(null)
  const [list, setList] = useState<Prescription[]>([])
  const [q, setQ] = useState('')
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editActiveTab, setEditActiveTab] = useState<'details'|'vitals'|'labs'|'diagnostics'|'meds'>('details')
  const [editingId, setEditingId] = useState<string>('')
  const [editForm, setEditForm] = useState<{ primaryComplaint?: string; primaryComplaintHistory?: string; familyHistory?: string; allergyHistory?: string; treatmentHistory?: string; history?: string; examFindings?: string; diagnosis?: string; advice?: string; labTestsText?: string; labNotes?: string; items: Array<{ name: string; frequency?: string; duration?: string; dose?: string; route?: string; instruction?: string; notes?: string }> }>({ items: [], labTestsText: '', labNotes: '' })
  
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem('doctor.session')
      const sess = raw ? JSON.parse(raw) : null
      setDoc(sess)
    } catch {}
  }, [])

  useEffect(() => { load() }, [doc?.id, from, to, page, limit])
  
  useEffect(() => {
    const h = () => { load() }
    window.addEventListener('doctor:pres-saved', h as any)
    return () => window.removeEventListener('doctor:pres-saved', h as any)
  }, [doc?.id])

  async function load(){
    if (!doc?.id) { setList([]); return }
    setLoading(true)
    try {
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
        itemsCount: r.items?.length || 0,
        labCount: r.labTests?.length || 0,
        diagCount: r.diagnosticTests?.length || 0,
        medicines: (r.items || []).map((it: any) => `${it.name}${it.frequency?` • ${it.frequency}`:''}${it.duration?` • ${it.duration}`:''}${it.dose?` • ${it.dose}`:''}`).join('\n'),
        createdAt: r.createdAt,
      }))
      setList(items)
      setTotal(Number(res?.total || items.length))
      
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
    } finally {
      setLoading(false)
    }
  }

  const filteredList = useMemo(() => {
    const s = q.trim().toLowerCase()
    return list.filter(p => !s || `${p.patientName} ${p.mrNo || ''} ${p.diagnosis || ''}`.toLowerCase().includes(s))
  }, [list, q])

  const historyStats = useMemo(() => {
    return {
      total: total,
      thisMonth: list.filter(p => new Date(p.createdAt).getMonth() === new Date().getMonth()).length,
      referred: Object.keys(refFlags).length
    }
  }, [total, list, refFlags])

  async function handlePrint(id: string){
    try {
      const data: any = await fetchPrintData(id)
      let tpl: PrescriptionPdfTemplate = 'hospital-rx'
      if (doc?.id) {
        const doctorData: any = await hospitalApi.getDoctor(doc.id)
        if (doctorData?.doctor?.prescriptionTemplate) tpl = doctorData.doctor.prescriptionTemplate
      }

      await previewPrescriptionPdf({
        doctor: data.doctor || {},
        settings: data.settings || {},
        patient: data.patient || {},
        items: data.items || [],
        vitals: data.vitals,
        primaryComplaint: data.primaryComplaint,
        diagnosis: data.diagnosis,
        advice: data.advice,
        labTests: data.labTests || [],
        diagnosticTests: data.diagnosticTests || [],
        createdAt: data.createdAt,
      }, tpl)
    } catch {}
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
      if (!doc?.id) return
      await hospitalApi.createReferral({ type: 'pharmacy', encounterId: p.encounterId, doctorId: doc.id, prescriptionId: p.id })
      setToast({ msg: 'Pharmacy referral created', kind: 'success' })
      setRefFlags(prev => ({ ...prev, [p.id]: { ...(prev[p.id]||{}), ph: true } }))
    } catch (e: any) {
      setToast({ msg: e?.message || 'Failed to refer', kind: 'error' })
    }
  }

  async function referToLab(p: Prescription){
    try {
      if (!doc?.id) return
      await hospitalApi.createReferral({ type: 'lab', encounterId: p.encounterId, doctorId: doc.id, prescriptionId: p.id })
      setToast({ msg: 'Lab referral created', kind: 'success' })
      setRefFlags(prev => ({ ...prev, [p.id]: { ...(prev[p.id]||{}), lab: true } }))
    } catch (e: any) {
      setToast({ msg: e?.message || 'Failed to refer', kind: 'error' })
    }
  }

  async function referToDiagnostic(p: Prescription){
    try {
      if (!doc?.id) return
      await hospitalApi.createReferral({ type: 'diagnostic', encounterId: p.encounterId, doctorId: doc.id, prescriptionId: p.id })
      setToast({ msg: 'Diagnostic referral created', kind: 'success' })
      setRefFlags(prev => ({ ...prev, [p.id]: { ...(prev[p.id]||{}), diag: true } }))
    } catch (e: any) {
      setToast({ msg: e?.message || 'Failed to refer', kind: 'error' })
    }
  }

  function openConfirm(type: 'lab'|'pharmacy'|'diagnostic'|'delete', p: Prescription){
    setConfirmDlg({ open: true, type, target: p })
  }

  async function confirmAction(){
    const p = confirmDlg.target
    if (!p) return
    setConfirmDlg({ open: false })
    if (confirmDlg.type === 'pharmacy') await referToPharmacy(p)
    if (confirmDlg.type === 'lab') await referToLab(p)
    if (confirmDlg.type === 'diagnostic') await referToDiagnostic(p)
    if (confirmDlg.type === 'delete') await deletePres(p.id)
  }

  async function deletePres(id: string){
    try {
      await hospitalApi.deletePrescription(id)
      load()
      setToast({ msg: 'Prescription removed', kind: 'success' })
    } catch (e: any) {
      setToast({ msg: e?.message || 'Failed to delete', kind: 'error' })
    }
  }

  async function openEditor(id: string){
    try {
      const res: any = await hospitalApi.getPrescription(id)
      const p = res?.prescription
      setEditingId(id)
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
        labTestsText: Array.isArray(p?.labTests) && p.labTests.length ? (p.labTests as string[]).join(', ') : '',
        labNotes: p?.labNotes || '',
        items,
      })
      try {
        const v = p?.vitals || {}
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

  function goEditTab(tab: 'details'|'vitals'|'labs'|'diagnostics'|'meds'){
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
      items: (editForm.items||[]).filter(it => (it.name||'').trim()).map(it => ({ name: String(it.name).trim(), frequency: it.frequency || undefined, duration: it.duration || undefined, dose: it.dose || undefined, notes: (it.route||it.instruction) ? [it.route?`Route: ${it.route}`:null, it.instruction?`Instruction: ${it.instruction}`:null].filter(Boolean).join('; ') : (it.notes || undefined) })),
    }
    if (editForm.labTestsText !== undefined) {
      const tests = String(editForm.labTestsText||'').split(/\n|,/).map(s=>s.trim()).filter(Boolean)
      payload.labTests = tests.length ? tests : []
    }
    if (editForm.labNotes !== undefined) payload.labNotes = editForm.labNotes || undefined
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
      try {
        let vRaw: any
        try { vRaw = vitalsEditRef.current?.getNormalized?.() } catch {}
        const hasVitals = vRaw && Object.values(vRaw).some((x: any) => x != null && !(typeof x === 'number' && isNaN(x)))
        let vitals: any = undefined
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
        if (vitals) payload.vitals = vitals
      } catch {}
      await hospitalApi.updatePrescription(editingId, payload)
      setEditOpen(false)
      await load()
    } catch (e: any) {
      setToast({ msg: e?.message || 'Failed to update prescription', kind: 'error' })
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6 animate-in fade-in duration-500">
      {/* Header & Dashboard */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-sky-600" />
            Clinical History
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium italic">Chronological record of patient encounters and interventions.</p>
        </div>

        <div className="flex gap-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm min-w-[160px] flex flex-col justify-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Issued</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{historyStats.total}</h3>
          </div>
          <div className="bg-sky-600 rounded-3xl p-5 shadow-lg shadow-sky-100 min-w-[160px] flex flex-col justify-center">
            <p className="text-[10px] font-black text-sky-100 uppercase tracking-widest">This Month</p>
            <h3 className="text-2xl font-black text-white mt-1">+{historyStats.thisMonth}</h3>
          </div>
        </div>
      </div>

      {/* Modern Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm p-5 mb-8">
        <div className="flex flex-col lg:flex-row gap-6 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search by Patient Name, MRN or Diagnosis..."
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-end">
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <CalendarDays className="h-4 w-4 text-sky-600" />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={from}
                  onChange={e => { setPage(1); setFrom(e.target.value) }}
                  className="bg-transparent border-none text-xs font-black text-slate-700 focus:ring-0 p-0 cursor-pointer"
                />
                <span className="text-[10px] font-bold text-slate-400">TO</span>
                <input
                  type="date"
                  value={to}
                  onChange={e => { setPage(1); setTo(e.target.value) }}
                  className="bg-transparent border-none text-xs font-black text-slate-700 focus:ring-0 p-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
              <div className="p-2 bg-white rounded-xl shadow-sm text-[10px] font-black text-slate-400">ROWS</div>
              <select
                value={limit}
                onChange={e => { setPage(1); setLimit(parseInt(e.target.value)) }}
                className="bg-transparent border-none text-xs font-black text-sky-600 focus:ring-0 cursor-pointer p-0 pr-6"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* History Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-12 w-12 border-4 border-sky-100 border-t-sky-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest italic">Syncing Clinical Records...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-[40px] border-2 border-dashed border-slate-200 p-24 text-center">
          <div className="p-6 bg-slate-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <FileSearch className="h-10 w-10 text-slate-300" />
          </div>
          <h2 className="text-xl font-black text-slate-800">No Prescriptions Found</h2>
          <p className="mt-2 text-slate-500 max-w-md mx-auto font-medium">Try adjusting your search query or date filters to find specific clinical records.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-1 xl:grid-cols-2">
          {filteredList.map(p => (
            <div key={p.id} className="group bg-white rounded-[32px] border border-slate-200 p-7 shadow-sm hover:shadow-xl hover:border-sky-200 transition-all duration-300 relative overflow-hidden flex flex-col">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 bg-slate-100 rounded-[20px] flex items-center justify-center font-black text-xl text-slate-400 group-hover:bg-sky-50 group-hover:text-sky-600 transition-all">
                    {p.patientName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-sky-700 transition-colors">{p.patientName}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="px-2.5 py-0.5 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-tighter">MRN: {p.mrNo}</span>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                        <Clock className="h-3 w-3" />
                        {new Date(p.createdAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {p.prescriptionMode === 'manual' ? (
                    <span className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[10px] font-black uppercase tracking-widest">Manual Scan</span>
                  ) : (
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-widest italic">Digital Record</span>
                  )}
                </div>
              </div>

              <div className="space-y-4 flex-1">
                {p.diagnosis && (
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Stethoscope className="h-3.5 w-3.5 text-sky-600" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Diagnosis</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed italic">"{p.diagnosis}"</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-col items-center justify-center text-center group-hover:border-sky-100 transition-colors">
                    <Pill className="h-4 w-4 text-rose-500 mb-1" />
                    <span className="text-[14px] font-black text-slate-900">{p.itemsCount}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Meds</span>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-col items-center justify-center text-center group-hover:border-sky-100 transition-colors">
                    <Microscope className="h-4 w-4 text-sky-500 mb-1" />
                    <span className="text-[14px] font-black text-slate-900">{p.labCount}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Labs</span>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-col items-center justify-center text-center group-hover:border-sky-100 transition-colors">
                    <ClipboardCheck className="h-4 w-4 text-emerald-500 mb-1" />
                    <span className="text-[14px] font-black text-slate-900">{p.diagCount}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Img</span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrint(p.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print Rx
                  </button>
                  <button
                    onClick={() => { setIpdReferralPrescription(p); setIpdReferralOpen(true) }}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5 text-sky-600" />
                    IPD Refer
                  </button>
                  {p.prescriptionMode === 'manual' && (p.manualAttachment?.dataUrl || p.manualAttachment?.fileName) && (
                    <button
                      onClick={() => openAttachment(p)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-amber-600" />
                      Attachment
                    </button>
                  )}
                  <button
                    onClick={() => openEditor(p.id)}
                    className="p-2 bg-slate-50 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                    title="Edit Record"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Referral Badges */}
                  <div className="flex -space-x-2">
                    <button 
                      onClick={() => openConfirm('pharmacy', p)}
                      disabled={refFlags[p.id]?.ph}
                      className={`h-8 w-8 rounded-full border-2 border-white flex items-center justify-center transition-all ${refFlags[p.id]?.ph ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-sky-100 hover:text-sky-600'}`}
                      title="Pharmacy Referral"
                    >
                      <Pill className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => openConfirm('lab', p)}
                      disabled={refFlags[p.id]?.lab}
                      className={`h-8 w-8 rounded-full border-2 border-white flex items-center justify-center transition-all ${refFlags[p.id]?.lab ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-sky-100 hover:text-sky-600'}`}
                      title="Lab Referral"
                    >
                      <Microscope className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => openConfirm('diagnostic', p)}
                      disabled={refFlags[p.id]?.diag}
                      className={`h-8 w-8 rounded-full border-2 border-white flex items-center justify-center transition-all ${refFlags[p.id]?.diag ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-sky-100 hover:text-sky-600'}`}
                      title="Radiology Referral"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => openConfirm('delete', p)}
                    className="p-2 text-rose-300 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Refined Pagination */}
      {total > limit && (
        <div className="mt-12 flex items-center justify-between bg-white rounded-[32px] border border-slate-200 px-8 py-4 shadow-sm">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest italic">
            Visualizing {Math.min((page - 1) * limit + 1, total)} - {Math.min(page * limit, total)} of {total} Records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-6 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-white hover:text-sky-600 transition-all disabled:opacity-30 shadow-sm"
            >
              Previous
            </button>
            <div className="px-4 text-xs font-black text-slate-900 bg-slate-50 py-2 rounded-xl border border-slate-200">
              PAGE {page}
            </div>
            <button
              onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
              disabled={page * limit >= total}
              className="px-6 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-white hover:text-sky-600 transition-all disabled:opacity-30 shadow-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals & Overlays */}
      {confirmDlg.open && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm rounded-[32px] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="text-center">
              <div className={`mx-auto mb-5 h-16 w-16 flex items-center justify-center rounded-[24px] ${confirmDlg.type === 'delete' ? 'bg-rose-50 text-rose-600' : 'bg-sky-50 text-sky-600'}`}>
                {confirmDlg.type === 'delete' ? <Trash2 className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
              </div>
              <h3 className="text-xl font-black text-slate-900">
                {confirmDlg.type === 'delete' ? 'Remove Record?' : 'Confirm Referral'}
              </h3>
              <p className="text-sm text-slate-500 mt-2 font-medium leading-relaxed">
                {confirmDlg.type === 'delete' 
                  ? 'This prescription will be permanently removed from clinical history.' 
                  : `Are you sure you want to initiate a new ${confirmDlg.type} referral for this patient?`}
              </p>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setConfirmDlg({ open: false })}
                className="flex-1 px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className={`flex-1 px-4 py-3 text-sm font-black text-white rounded-2xl shadow-lg transition-all active:scale-95 ${confirmDlg.type === 'delete' ? 'bg-rose-600 shadow-rose-100 hover:bg-rose-700' : 'bg-sky-600 shadow-sky-100 hover:bg-sky-700'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed right-6 top-6 z-120 animate-in slide-in-from-top-4 duration-500">
          <div className={`rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-3 border ${toast.kind === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
            {toast.kind === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-rose-600" />}
            <span className="text-sm font-black uppercase tracking-wider">{toast.msg}</span>
          </div>
        </div>
      )}

      {attachView.open && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in" onClick={() => setAttachView({ open: false })}>
          <div className="w-full max-w-5xl rounded-[40px] bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-300" onClick={e => e.stopPropagation()}>
            <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between">
              <div><h3 className="text-xl font-black text-slate-900">Manual Prescription Scan</h3><p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Archived Document</p></div>
              <div className="flex items-center gap-4">
                {attachView.dataUrl && <a href={attachView.dataUrl} download={attachView.fileName || 'prescription-attachment'} className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 text-slate-700 rounded-2xl text-sm font-black hover:bg-slate-200 transition-all">Download</a>}
                <button onClick={() => setAttachView({ open: false })} className="p-3 hover:bg-slate-100 rounded-full transition-all"><X className="h-6 w-6 text-slate-400" /></button>
              </div>
            </div>
            <div className="flex-1 bg-slate-50 p-10 flex items-center justify-center overflow-hidden">
              <div className="w-full h-full bg-white rounded-3xl shadow-inner border border-slate-200 overflow-auto p-4 flex items-center justify-center">
                {attachView.dataUrl && (attachView.mimeType || '').startsWith('image/') ? <img src={attachView.dataUrl} alt="Attachment" className="max-w-full max-h-full object-contain shadow-sm" /> : attachView.dataUrl && (attachView.mimeType || '').includes('pdf') ? <iframe title="Attachment" src={attachView.dataUrl} className="w-full h-[70vh] border-0" /> : <div className="flex flex-col items-center gap-4 py-20"><FileSearch className="h-16 w-16 text-slate-200" /><p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Visual Preview Unavailable</p></div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {ipdReferralOpen && ipdReferralPrescription && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
            <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div><h3 className="text-xl font-black text-slate-900">Initiate IPD Admission</h3><p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Clinical Transfer Protocol</p></div>
              <button className="p-3 hover:bg-white rounded-full transition-all text-slate-400 hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-200" onClick={() => { setIpdReferralOpen(false); setIpdReferralPrescription(null) }}><Plus className="h-7 w-7 rotate-45" /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
              {ipdReferralPrescription && (
                <Doctor_IpdReferralForm mrn={ipdReferralPrescription.mrNo} doctor={doc ? { id: doc.id, name: doc.name } : undefined} initialData={{ provisionalDiagnosis: ipdReferralPrescription.diagnosis }} onSaved={() => { setToast({ msg: 'IPD referral created', kind: 'success' }); setIpdReferralOpen(false); setIpdReferralPrescription(null) }} />
              )}
            </div>
          </div>
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="max-h-[92vh] w-full max-w-4xl bg-white rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8">
            <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between">
              <div><h3 className="text-xl font-black text-slate-900">Modify Clinical Record</h3><p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Prescription Revision Engine</p></div>
              <div className="flex items-center gap-3">
                <button onClick={saveEdit} className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 text-white rounded-2xl text-sm font-black hover:bg-sky-700 transition-all shadow-lg shadow-sky-100"><Save className="h-4 w-4" /> Save Revisions</button>
                <button onClick={() => setEditOpen(false)} className="p-3 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-900"><X className="h-6 w-6" /></button>
              </div>
            </div>
            <div className="bg-slate-50 px-10 py-4 border-b border-slate-100">
              <nav className="flex gap-2">
                {[
                  { id: 'details', label: 'Case Details', icon: FileSearch },
                  { id: 'vitals', label: 'Vitals', icon: Stethoscope },
                  { id: 'labs', label: 'Labs', icon: Microscope },
                  { id: 'diagnostics', label: 'Imaging', icon: ExternalLink },
                  { id: 'meds', label: 'Medications', icon: Pill },
                ].map(tab => (
                  <button key={tab.id} onClick={() => goEditTab(tab.id as any)} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${editActiveTab === tab.id ? 'bg-white text-sky-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}><tab.icon className={`h-4 w-4 ${editActiveTab === tab.id ? 'text-sky-600' : 'text-slate-300'}`} />{tab.label}</button>
                ))}
              </nav>
            </div>
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
              {editActiveTab === 'details' && (
                <div className="grid gap-8 lg:grid-cols-2">
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Working Diagnosis</label>
                      <textarea rows={2} value={editForm.diagnosis||''} onChange={e=>setEditForm(f=>({ ...f, diagnosis: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-800 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all bg-slate-50/50" placeholder="Enter diagnosis..." />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Complaint</label>
                      <textarea rows={3} value={editForm.primaryComplaint||''} onChange={e=>setEditForm(f=>({ ...f, primaryComplaint: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all" placeholder="Describe complaints..." />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clinical Advice</label>
                      <textarea rows={6} value={editForm.advice||''} onChange={e=>setEditForm(f=>({ ...f, advice: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all h-full" placeholder="Special instructions..." />
                    </div>
                  </div>
                </div>
              )}
              {editActiveTab === 'vitals' && (
                <div className="bg-slate-50/50 rounded-[32px] border border-slate-200 p-8 shadow-inner">
                  <PrescriptionVitals ref={vitalsEditRef} initial={editVitalsDisplay} />
                </div>
              )}
              {editActiveTab === 'labs' && (
                <div className="space-y-8 max-w-2xl mx-auto">
                  <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 text-sky-600"><Microscope className="h-5 w-5" /><h4 className="text-xs font-black uppercase tracking-[0.2em]">Laboratory Investigations</h4></div>
                    <div className="space-y-6">
                      <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tests Required</label><textarea rows={4} value={editForm.labTestsText} onChange={e => setEditForm(f => ({ ...f, labTestsText: e.target.value }))} placeholder="Enter tests separated by commas or lines..." className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all" /></div>
                      <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lab Instructions</label><textarea rows={2} value={editForm.labNotes} onChange={e => setEditForm(f => ({ ...f, labNotes: e.target.value }))} placeholder="e.g. Fasting required..." className="w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all" /></div>
                    </div>
                  </div>
                </div>
              )}
              {editActiveTab === 'diagnostics' && (
                <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm max-w-2xl mx-auto">
                  <PrescriptionDiagnosticOrders ref={diagEditRef} initialTestsText={editDiagDisplay.testsText} />
                </div>
              )}
              {editActiveTab === 'meds' && (
                <div className="bg-slate-50/50 rounded-[32px] border border-slate-200 p-8 shadow-inner">
                  <div className="flex items-center gap-2 mb-6 text-rose-500"><Pill className="h-5 w-5" /><h4 className="text-xs font-black uppercase tracking-[0.2em]">Treatment Plan Revisions</h4></div>
                  <div className="space-y-4">
                    {editForm.items.map((it, i) => (
                      <div key={i} className="flex gap-4 items-start animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex-1 shadow-sm group hover:border-sky-200 transition-all">
                          <div className="grid gap-6 sm:grid-cols-2 mb-4">
                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Medicine Name</label><input value={it.name} onChange={e=>setItem(i, 'name', e.target.value)} className="w-full bg-slate-50/50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-sky-500/10 transition-all" /></div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Freq</label><input value={it.frequency} onChange={e=>setItem(i, 'frequency', e.target.value)} className="w-full bg-slate-50/50 border-none rounded-xl px-3 py-2 text-xs font-bold" /></div>
                              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dur</label><input value={it.duration} onChange={e=>setItem(i, 'duration', e.target.value)} className="w-full bg-slate-50/50 border-none rounded-xl px-3 py-2 text-xs font-bold" /></div>
                            </div>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-3"><input value={it.dose} onChange={e=>setItem(i, 'dose', e.target.value)} placeholder="Dose" className="bg-slate-50/50 border-none rounded-xl px-3 py-2 text-xs font-medium" /><input value={it.route} onChange={e=>setItem(i, 'route', e.target.value)} placeholder="Route" className="bg-slate-50/50 border-none rounded-xl px-3 py-2 text-xs font-medium" /><input value={it.instruction} onChange={e=>setItem(i, 'instruction', e.target.value)} placeholder="Instructions" className="bg-slate-50/50 border-none rounded-xl px-3 py-2 text-xs font-medium" /></div>
                        </div>
                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={()=>addItemAfter(i)} className="p-2.5 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-600 hover:text-white transition-all shadow-sm"><Plus className="h-4 w-4" /></button>
                          <button onClick={()=>removeItemAt(i)} className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

async function fetchPrintData(id: string) {
  const [detail, settings] = await Promise.all([hospitalApi.getPrescription(id) as any, hospitalApi.getSettings() as any])
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
          else if (p.dob) { 
            const dob = new Date(p.dob)
            if (!isNaN(dob.getTime())) ageTxt = String(Math.max(0, Math.floor((Date.now()-dob.getTime())/31557600000))) 
          }
        } catch {}
        patient = { name: p.fullName || patient.name, mrn: p.mrn || patient.mrn, gender: p.gender || '-', fatherName: p.fatherName || '-', phone: p.phoneNormalized || '-', address: p.address || '-', age: ageTxt }
      }
    }
  } catch {}
  
  let doctor: any = { name: pres?.encounterId?.doctorId?.name || '-', specialization: '', qualification: '', departmentName: '', phone: '' }
  try {
    const drList: any = await hospitalApi.listDoctors()
    const doctors: any[] = drList?.doctors || []
    const drId = String(pres?.encounterId?.doctorId?._id || pres?.encounterId?.doctorId || '')
    const d = doctors.find(x => String(x._id || x.id) === drId)
    if (d) doctor = { name: d.name || doctor.name, specialization: d.specialization || '', qualification: d.qualification || '', departmentName: '', phone: d.phone || '' }
    try {
      const depRes: any = await hospitalApi.listDepartments()
      const depArray: any[] = (depRes?.departments || depRes || []) as any[]
      const deptName = d?.primaryDepartmentId ? (depArray.find((z: any)=> String(z._id||z.id) === String(d.primaryDepartmentId))?.name || '') : ''
      if (deptName) doctor.departmentName = deptName
    } catch {}
  } catch {}

  return { 
    settings, 
    doctor, 
    patient, 
    items: (pres?.items || []).map((m: any) => {
      const nt = String(m?.notes || '')
      const mRoute = nt.match(/Route:\s*([^;]+)/i)
      const mInstr = nt.match(/Instruction:\s*([^;]+)/i)
      return { 
        name: m.name || '', 
        frequency: m.frequency || '', 
        duration: m.duration || '', 
        dose: m.dose || '', 
        route: mRoute?.[1]?.trim() || m.route || '', 
        instruction: mInstr?.[1]?.trim() || m.instruction || '' 
      }
    }), 
    vitals: pres?.vitals, 
    labTests: pres?.labTests || [], 
    labNotes: pres?.labNotes, 
    diagnosticTests: pres?.diagnosticTests || [], 
    diagnosticNotes: pres?.diagnosticNotes, 
    primaryComplaint: pres?.primaryComplaint || pres?.complaints, 
    primaryComplaintHistory: pres?.primaryComplaintHistory, 
    familyHistory: pres?.familyHistory, 
    treatmentHistory: pres?.treatmentHistory, 
    history: pres?.history, 
    examFindings: pres?.examFindings, 
    diagnosis: pres?.diagnosis, 
    advice: pres?.advice, 
    createdAt: pres?.createdAt, 
    tokenNo: pres?.tokenNo || '' 
  }
}

// helper for fetching data used by both print and download
