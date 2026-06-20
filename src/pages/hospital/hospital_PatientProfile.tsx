import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { FileText, ScrollText, ArrowLeft, Printer, LogOut, Wallet, Receipt, TrendingUp, TrendingDown } from 'lucide-react'
import DailyMonitoring from '../../components/hospital/ipd/daily-monitoring/DailyMonitoringPage'
import DailyProgress from '../../components/hospital/ipd/daily-progress/DailyProgressPage'
import Medication from '../../components/hospital/ipd/medication/MedicationPage'
import LabTests from '../../components/hospital/ipd/lab-tests/Hospital_IpdLabTests'
import DiagnosticTests from '../../components/hospital/ipd/diagnostic-tests/Hospital_IpdDiagnosticTests'
import DoctorVisits from '../../components/hospital/ipd/doctor-visits/DoctorVisitsPage'
import ConsultantNotes from '../../components/hospital/ipd/consultant-notes/Hospital_IpdConsultantNotes'
import Anesthesia from '../../components/hospital/ipd/anesthesia/AnesthesiaPage'
import Surgery from '../../components/hospital/ipd/surgery/Hospital_IpdSurgery'
import ConsentForm from '../../components/hospital/ipd/consent-form/Hospital_IpdConsentForm'
import InfectionControlChecklist from '../../components/hospital/ipd/infection-control/Hospital_IpdInfectionControlChecklist'
import SurgicalSafetyChecklist from '../../components/hospital/ipd/surgical-safety/Hospital_IpdSurgicalSafetyChecklist'
import BloodTransfusionNotes from '../../components/hospital/ipd/blood-transfusion/Hospital_IpdBloodTransfusionNotes'
import OperationConsent from '../../components/hospital/ipd/operation-consent/Hospital_IpdOperationConsent'
import HistoryExamination from '../../components/hospital/ipd/history-examination/Hospital_IpdHistoryExamination'
import ICUMonitoring from '../../components/hospital/ipd/icu-monitoring/Hospital_IpdICUMonitoring'
import FluidBalance from '../../components/hospital/ipd/fluid-balance/Hospital_IpdFluidBalance'
import SystemicExamination from '../../components/hospital/ipd/SystemicExaminationPage'
import PressureUlcerRisk from '../../components/hospital/ipd/pressure-ulcer-risk/PressureUlcerRiskPage'
import DailyUlcerAssessment from '../../components/hospital/ipd/daily-ulcer-assessment/DailyUlcerAssessmentPage'
import NicuEvaluation from '../../components/hospital/ipd/nicu-evaluation/NicuEvaluationPage'
import NewBornBabyNotes from '../../components/hospital/ipd/newborn-baby/NewBornBabyPage'
import Hospital_IpdPharmacyReferrals from '../../components/hospital/ipd/Hospital_IpdPharmacyReferrals'
import { useReactToPrint } from 'react-to-print'
import IpdTabPrintHeader from '../../components/hospital/ipd/IpdTabPrintHeader'
import { useEncounterDefaults } from '../../hooks/useEncounterDefaults'

function formatDateTime(s: string) {
  const d = new Date(s)
  return `${d.toLocaleDateString()}, ${d.toLocaleTimeString()}`
}

export default function Hospital_PatientProfile() {
  const { id } = useParams()
  const encounterId = String(id || '')
  const navigate = useNavigate()
  const location = useLocation()
  const fromSearch = !!(location as any)?.state?.fromSearch
  const backSnapshot = (location as any)?.state?.searchSnapshot
  const [encounter, setEncounter] = useState<any | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const defaults = useEncounterDefaults(encounterId)

  const [tab, setTab] = useState<
    | 'vitals'
    | 'progress'
    | 'surgery'
    | 'consult'
    | 'anesthesia'
    | 'meds'
    | 'lab'
    | 'diagnostic'
    | 'visits'
    | 'history'
    | 'consent'
    | 'infection'
    | 'surgical'
    | 'transfusion'
    | 'opconsent'
    | 'icu'
    | 'fluid'
    | 'systemic'
    | 'pressure-ulcer'
    | 'daily-ulcer'
    | 'nicu'
    | 'newborn'
    | 'pharmacy'
    | 'billing'
    | 'billing-collect'
  >('vitals')

  const [transferOpen, setTransferOpen] = useState(false)

  // Multi-department tracking
  const [icuAdmissions, setIcuAdmissions] = useState<any[]>([])
  const [otBookings, setOtBookings] = useState<any[]>([])
  const [billingSummary, setBillingSummary] = useState<any>(null)
  const [deptLoading, setDeptLoading] = useState(false)

  const handlePrintTab = useReactToPrint({
    contentRef: printRef,
    documentTitle: `IPD_${tab}_${encounterId}`,
    print: async (target: HTMLIFrameElement) => {
      const html = target.contentDocument?.documentElement.outerHTML
      if (html && (window as any).electronAPI?.printPreviewHtml) {
        await (window as any).electronAPI.printPreviewHtml(html)
      } else {
        target.contentWindow?.print()
      }
    }
  })

  const getTabLabel = (t: typeof tab) => {
    const labels: Record<string, string> = {
      'vitals': 'Daily Monitoring',
      'progress': 'Daily Progress',
      'surgery': 'Surgery',
      'consult': 'Consultant Notes',
      'anesthesia': 'Anesthesia',
      'meds': 'Medication',
      'lab': 'Lab Tests',
      'diagnostic': 'Diagnostic Tests',
      'visits': 'Doctor Visits',
      'history': 'History & Examination',
      'consent': 'Consent Form',
      'infection': 'Infection Control',
      'surgical': 'Surgical Safety',
      'transfusion': 'Blood Transfusion',
      'opconsent': 'Operation Consent',
      'icu': 'ICU Monitoring',
      'fluid': 'Fluid Balance',
      'systemic': 'Systemic Examination',
      'pressure-ulcer': 'Pressure Ulcer Risk',
      'daily-ulcer': 'Daily Ulcer Assessment',
      'nicu': 'NICU Evaluation',
      'newborn': 'New Born Baby Notes',
      'pharmacy': 'Pharmacy Referral',
      'billing': 'Billing Add',
      'billing-collect': 'Billing Collect'
    }
    return labels[t] || t
  }

  // child components handle their own state

  // moved to Billing component

  const discharge = () => {
    const currentUrl = encodeURIComponent(`/hospital/patient/${encounterId}`)
    navigate(`/hospital/discharge/${encounterId}?returnTo=${currentUrl}`)
  }

  const printMedicalRecord = () => {
    const url = `/api/hospital/ipd/encounters/${encounterId}/medical-record/print`
    const api = (window as any).electronAPI
    if (api && typeof api.printPreviewHtml === 'function') {
      fetch(url, { headers: { 'Authorization': `Bearer ${localStorage.getItem('hospital.token') || ''}` } })
        .then(r => r.text())
        .then(html => api.printPreviewHtml(html))
        .catch(() => {
          window.open(url, '_blank', 'noopener,noreferrer')
        })
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  // Loaders
  useEffect(()=>{ if (encounterId){ loadEncounter(); loadRelatedData(encounterId) } }, [encounterId])

  async function loadEncounter(){
    // Guard against corrupted navigation URLs (e.g. [object Object])
    if (!encounterId || encounterId.includes('[object') || !/^[a-f0-9]{24}$/i.test(encounterId)) {
      setEncounter(null)
      return
    }
    try {
      const res = await hospitalApi.getIPDAdmissionById(encounterId) as any
      if (res?.encounter) { setEncounter(res.encounter); return }
    } catch {}
    // Fallback: try ER encounter API (for patients admitted via ER/ICU)
    try {
      const res = await hospitalApi.getEREncounterById(encounterId) as any
      if (res?.encounter) { setEncounter(res.encounter); return }
    } catch {}
    setEncounter(null)
  }

  async function loadRelatedData(encId: string) {
    if (!encId) return
    setDeptLoading(true)
    try {
      // Load billing summary, ICU admissions, and OT bookings for this encounter
      const [billRes, icuRes, otRes] = await Promise.all([
        hospitalApi.getIpdBillingSummary(encId).catch(() => null) as any,
        hospitalApi.listICUAdmissions({ encounterId: encId, limit: 50 }).catch(() => null) as any,
        hospitalApi.listOTBookings({ encounterId: encId, limit: 50 }).catch(() => null) as any,
      ])
      setBillingSummary(billRes?.totals || null)
      setIcuAdmissions(icuRes?.admissions || [])
      setOtBookings(otRes?.bookings || [])
      // ER data: loadEncounter already tries getEREncounterById as fallback;
      // we do not call it here with an IPD admission ID to avoid 400 Bad Request
    } catch {}
    setDeptLoading(false)
  }
  // loaders moved into child components

  // Save handlers
  // actions now live in child components

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold text-slate-900 capitalize">{(encounter as any)?.patientId?.fullName || '-'}</div>
            <div className="mt-1 text-sm text-slate-600">Bed: {(encounter as any)?.bedLabel || (encounter as any)?.bedId || '-'}  Doctor: {(encounter as any)?.doctorId?.name || '-'}  Admitted: {(encounter as any)?.startAt ? formatDateTime(String((encounter as any)?.startAt)) : '-'}</div>

            {/* Department Journey Badges */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 border border-indigo-200">IPD</span>
              {icuAdmissions.length > 0 && (
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 border border-rose-200">ICU ({icuAdmissions.length})</span>
              )}
              {otBookings.length > 0 && (
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700 border border-sky-200">OT ({otBookings.length})</span>
              )}
              {deptLoading && <span className="text-xs text-slate-400">Loading departments...</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <button onClick={()=>navigate('/hospital/patient-list')} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" />Back</button>
            {fromSearch && (
              <button onClick={()=>navigate('/hospital/search-patients', { state: { searchSnapshot: backSnapshot } })} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to Search</button>
            )}
            <button onClick={() => handlePrintTab()} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"><Printer className="h-4 w-4" />Print Tab</button>
            <button onClick={printMedicalRecord} className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900"><FileText className="h-4 w-4" />Print Record</button>
            <button onClick={() => setTransferOpen(true)} className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"><LogOut className="h-4 w-4" />Transfer</button>
            <button onClick={discharge} className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"><ScrollText className="h-4 w-4" />Discharge Forms</button>
          </div>
        </div>

        {/* Unified Finance Summary Bar */}
        {billingSummary && (
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-indigo-50 p-1.5"><Wallet className="h-3.5 w-3.5 text-indigo-600" /></div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Bill</div>
                <div className="text-sm font-bold text-slate-900">Rs {Number(billingSummary.grandTotal || 0).toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-emerald-50 p-1.5"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /></div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Paid</div>
                <div className="text-sm font-bold text-emerald-700">Rs {Number(billingSummary.totalPaidToCharges || 0).toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-rose-50 p-1.5"><TrendingDown className="h-3.5 w-3.5 text-rose-600" /></div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Pending</div>
                <div className="text-sm font-bold text-rose-700">Rs {Number(billingSummary.netOutstanding || 0).toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-violet-50 p-1.5"><Receipt className="h-3.5 w-3.5 text-violet-600" /></div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Advance</div>
                <div className="text-sm font-bold text-violet-700">Rs {Number(billingSummary.unallocatedAdvance || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}
        <div className="mt-4 grid grid-cols-8 gap-1">
          <Tab label="Daily Monitoring" active={tab==='vitals'} onClick={()=>setTab('vitals')} />
          <Tab label="Daily Progress" active={tab==='progress'} onClick={()=>setTab('progress')} />
          <Tab label="Anesthesia" active={tab==='anesthesia'} onClick={()=>setTab('anesthesia')} />
          <Tab label="Surgical Safety" active={tab==='surgical'} onClick={()=>setTab('surgical')} />
          <Tab label="Surgery" active={tab==='surgery'} onClick={()=>setTab('surgery')} />
          <Tab label="Consultant Notes" active={tab==='consult'} onClick={()=>setTab('consult')} />
          <Tab label="Medication" active={tab==='meds'} onClick={()=>setTab('meds')} />
          <Tab label="History & Examination" active={tab==='history'} onClick={()=>setTab('history')} />
          <Tab label="Consent Form" active={tab==='consent'} onClick={()=>setTab('consent')} />
          <Tab label="Infection Control" active={tab==='infection'} onClick={()=>setTab('infection')} />
          <Tab label="Blood Transfusion" active={tab==='transfusion'} onClick={()=>setTab('transfusion')} />
          <Tab label="Operation Consent" active={tab==='opconsent'} onClick={()=>setTab('opconsent')} />
          <Tab label="Lab Tests" active={tab==='lab'} onClick={()=>setTab('lab')} />
          <Tab label="Diagnostic Tests" active={tab==='diagnostic'} onClick={()=>setTab('diagnostic')} />
          <Tab label="Doctor Visits" active={tab==='visits'} onClick={()=>setTab('visits')} />
          <Tab label="ICU Monitoring" active={tab==='icu'} onClick={()=>setTab('icu')} />
          <Tab label="Fluid Balance" active={tab==='fluid'} onClick={()=>setTab('fluid')} />
          <Tab label="Systemic Examination" active={tab==='systemic'} onClick={()=>setTab('systemic')} />
          <Tab label="Pressure Ulcer Risk" active={tab==='pressure-ulcer'} onClick={()=>setTab('pressure-ulcer')} />
          <Tab label="Daily Ulcer Assessment" active={tab==='daily-ulcer'} onClick={()=>setTab('daily-ulcer')} />
          <Tab label="NICU Evaluation" active={tab==='nicu'} onClick={()=>setTab('nicu')} />
          <Tab label="New Born Baby Notes" active={tab==='newborn'} onClick={()=>setTab('newborn')} />
          <Tab label="Pharmacy Referral" active={tab==='pharmacy'} onClick={()=>setTab('pharmacy')} />
          <Tab label="Billing Add" active={tab==='billing'} onClick={()=>setTab('billing')} />
          <Tab label="Billing Collect" active={tab==='billing-collect'} onClick={()=>setTab('billing-collect')} />
        </div>
      </div>

      {/* Content */}
      <div ref={printRef} className="print:p-8">
        <div className="hidden print:block">
          <IpdTabPrintHeader defaults={defaults} title={getTabLabel(tab)} />
        </div>
        {tab==='vitals' && (<DailyMonitoring encounterId={encounterId} />)}
        {tab==='progress' && (<DailyProgress encounterId={encounterId} />)}
        {tab==='surgery' && (<Surgery encounterId={encounterId} />)}
        {tab==='consult' && (<ConsultantNotes encounterId={encounterId} />)}
        {tab==='anesthesia' && (<Anesthesia encounterId={encounterId} />)}
        {tab==='meds' && (<Medication encounterId={encounterId} />)}
        {tab==='history' && (<HistoryExamination encounterId={encounterId} />)}
        {tab==='consent' && (<ConsentForm encounterId={encounterId} />)}
        {tab==='infection' && (<InfectionControlChecklist encounterId={encounterId} />)}
        {tab==='surgical' && (<SurgicalSafetyChecklist encounterId={encounterId} />)}
        {tab==='transfusion' && (<BloodTransfusionNotes encounterId={encounterId} />)}
        {tab==='opconsent' && (<OperationConsent encounterId={encounterId} />)}
        {tab==='lab' && (<LabTests encounterId={encounterId} />)}
        {tab==='diagnostic' && (<DiagnosticTests encounterId={encounterId} />)}
        {tab==='visits' && (<DoctorVisits encounterId={encounterId} />)}
        {tab==='icu' && (<ICUMonitoring encounterId={encounterId} />)}
        {tab==='fluid' && (<FluidBalance encounterId={encounterId} />)}
        {tab==='systemic' && (<SystemicExamination encounterId={encounterId} />)}
        {tab==='pressure-ulcer' && (<PressureUlcerRisk encounterId={encounterId} />)}
        {tab==='daily-ulcer' && (<DailyUlcerAssessment encounterId={encounterId} />)}
        {tab==='nicu' && (<NicuEvaluation encounterId={encounterId} />)}
        {tab==='newborn' && (<NewBornBabyNotes encounterId={encounterId} />)}
        {tab==='pharmacy' && (<Hospital_IpdPharmacyReferrals encounterId={encounterId} />)}
        {tab==='billing' && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">Billing Add</div>
                <div className="text-sm text-slate-600">Add services, charges, and manage billing for this patient.</div>
              </div>
              <button onClick={() => navigate(`/hospital/ipd-billing/add?encounterId=${encounterId}`)} className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                <Wallet className="h-4 w-4" /> Open Full Billing
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Bill</div>
                <div className="text-xl font-bold text-slate-900">Rs {Number(billingSummary?.grandTotal || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Paid</div>
                <div className="text-xl font-bold text-emerald-700">Rs {Number(billingSummary?.totalPaidToCharges || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Pending</div>
                <div className="text-xl font-bold text-rose-700">Rs {Number(billingSummary?.netOutstanding || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Advance</div>
                <div className="text-xl font-bold text-violet-700">Rs {Number(billingSummary?.unallocatedAdvance || 0).toLocaleString()}</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-500">
              Finance is unified across all departments (IPD, ER, ICU, OT) for this patient. Any charges or payments made in any department are reflected here.
            </div>
          </div>
        )}
        {tab==='billing-collect' && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">Billing Collect</div>
                <div className="text-sm text-slate-600">Collect payments, apply advances, and process discounts.</div>
              </div>
              <button onClick={() => navigate(`/hospital/ipd-billing/collect?encounterId=${encounterId}`)} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                <Receipt className="h-4 w-4" /> Open Full Collect
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Bill</div>
                <div className="text-xl font-bold text-slate-900">Rs {Number(billingSummary?.grandTotal || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Paid</div>
                <div className="text-xl font-bold text-emerald-700">Rs {Number(billingSummary?.totalPaidToCharges || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Pending</div>
                <div className="text-xl font-bold text-rose-700">Rs {Number(billingSummary?.netOutstanding || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Advance</div>
                <div className="text-xl font-bold text-violet-700">Rs {Number(billingSummary?.unallocatedAdvance || 0).toLocaleString()}</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-500">
              Click "Open Full Collect" to add payments, apply advances, and generate receipts. All payments are recorded against this encounter and are visible across all departments.
            </div>
          </div>
        )}
      </div>

      {/* Modals moved to child components */}

      {/* Transfer Dialog */}
      {transferOpen && encounter && (
        <TransferDialog
          encounter={encounter}
          onClose={() => setTransferOpen(false)}
          onTransferred={() => {
            setTransferOpen(false)
            loadEncounter()
            navigate('/hospital/patient-list')
          }}
        />
      )}
    </div>
  )
}

function TransferDialog({ encounter, onClose, onTransferred }: { encounter: any; onClose: () => void; onTransferred: () => void }) {
  const [type, setType] = useState<'icu' | 'ipd' | 'er'>('icu')
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [beds, setBeds] = useState<any[]>([])
  const [icuBeds, setIcuBeds] = useState<any[]>([])
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [selectedBed, setSelectedBed] = useState('')
  const [selectedIcuBed, setSelectedIcuBed] = useState('')
  const [reason, setReason] = useState('')
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe' | 'critical'>('moderate')
  const [ventilator, setVentilator] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  useEffect(() => {
    loadDepartments()
    loadIcuBeds()
  }, [])

  useEffect(() => {
    if (selectedDept && type === 'ipd') {
      loadBeds(selectedDept)
      loadDoctors(selectedDept)
    }
  }, [selectedDept, type])

  async function loadDepartments() {
    try {
      const res = await hospitalApi.listDepartments({ limit: 200 }) as any
      setDepartments(res?.departments || res || [])
    } catch {}
  }

  async function loadDoctors(deptId: string) {
    try {
      const res = await hospitalApi.listDoctors({ departmentId: deptId, limit: 200 }) as any
      setDoctors(res?.doctors || res || [])
    } catch {}
  }

  async function loadBeds(deptId: string) {
    try {
      const res = await hospitalApi.listBeds({ status: 'available' }) as any
      const all = res?.beds || res || []
      // Filter beds whose department matches selected department
      setBeds(all.filter((b: any) => String(b.departmentId || b.floorId || '') === deptId))
    } catch {}
  }

  async function loadIcuBeds() {
    try {
      const res = await hospitalApi.listICUBeds({ status: 'available', limit: 200 }) as any
      setIcuBeds(res?.beds || res || [])
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) {
      setToast({ type: 'error', message: 'Please enter a transfer reason' })
      return
    }
    setLoading(true)
    try {
      if (type === 'icu') {
        await hospitalApi.createICUAdmission({
          encounterId: String(encounter._id || encounter.id),
          bedId: selectedIcuBed || undefined,
          reason: reason.trim(),
          severity,
          ventilatorRequired: ventilator,
          referredFrom: 'ipd',
          attendingDoctorId: encounter.doctorId?._id || encounter.doctorId || undefined,
          primaryDiagnosis: reason.trim(),
        })
        setToast({ type: 'success', message: 'Patient transferred to ICU successfully' })
        setTimeout(onTransferred, 500)
      } else if (type === 'ipd') {
        if (!selectedDept) {
          setToast({ type: 'error', message: 'Please select a department' })
          setLoading(false)
          return
        }
        await hospitalApi.transferPatient({
          sourceEncounterId: String(encounter._id || encounter.id),
          targetType: 'IPD',
          departmentId: selectedDept,
          doctorId: selectedDoctor || undefined,
          bedId: selectedBed || undefined,
        })
        setToast({ type: 'success', message: 'Patient transferred to new department successfully' })
        setTimeout(onTransferred, 500)
      } else if (type === 'er') {
        const erDept = departments.find((d: any) => String(d.name || '').toLowerCase().includes('emergency'))
        if (!erDept) {
          setToast({ type: 'error', message: 'Emergency department not found' })
          setLoading(false)
          return
        }
        await hospitalApi.transferPatient({
          sourceEncounterId: String(encounter._id || encounter.id),
          targetType: 'ER',
          departmentId: String(erDept._id || erDept.id),
        })
        setToast({ type: 'success', message: 'Patient transferred to Emergency successfully' })
        setTimeout(onTransferred, 500)
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Transfer failed' })
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800 flex items-center justify-between">
            <span>Transfer Patient</span>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">×</button>
          </div>

          <div className="px-5 py-4 space-y-4 text-sm max-h-[70vh] overflow-auto">
            {/* Patient info */}
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
              <span className="font-medium">{(encounter as any)?.patientId?.fullName || 'Patient'}</span>
              <span className="text-slate-500 ml-2">— {String((encounter as any)?.bedLabel || (encounter as any)?.bedFullInfo || 'No bed')}</span>
            </div>

            {/* Transfer type */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Transfer To</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setType('icu')} className={`flex-1 rounded-md border px-3 py-2 text-center text-xs font-medium transition-colors ${type === 'icu' ? 'bg-rose-50 border-rose-300 text-rose-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>ICU</button>
                <button type="button" onClick={() => setType('ipd')} className={`flex-1 rounded-md border px-3 py-2 text-center text-xs font-medium transition-colors ${type === 'ipd' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Another Department</button>
                <button type="button" onClick={() => setType('er')} className={`flex-1 rounded-md border px-3 py-2 text-center text-xs font-medium transition-colors ${type === 'er' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Emergency</button>
              </div>
            </div>

            {/* ICU options */}
            {type === 'icu' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">ICU Bed</label>
                  <select value={selectedIcuBed} onChange={(e) => setSelectedIcuBed(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Auto-assign / Select bed</option>
                    {icuBeds.map((b: any) => (
                      <option key={b._id || b.id} value={b._id || b.id}>{b.name || b.label} ({b.ventilatorAvailable ? 'Vent' : 'No Vent'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Severity</label>
                  <select value={severity} onChange={(e) => setSeverity(e.target.value as any)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input id="vent" type="checkbox" checked={ventilator} onChange={(e) => setVentilator(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                  <label htmlFor="vent" className="text-xs text-slate-600">Ventilator Required</label>
                </div>
              </>
            )}

            {/* IPD options */}
            {type === 'ipd' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Department *</label>
                  <select value={selectedDept} onChange={(e) => { setSelectedDept(e.target.value); setSelectedDoctor(''); setSelectedBed('') }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" required>
                    <option value="">Select department</option>
                    {departments.map((d: any) => (
                      <option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Doctor</label>
                  <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Keep current doctor</option>
                    {doctors.map((d: any) => (
                      <option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Bed</label>
                  <select value={selectedBed} onChange={(e) => setSelectedBed(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Select bed</option>
                    {beds.map((b: any) => (
                      <option key={b._id || b.id} value={b._id || b.id}>{b.label || b.name} — {b.locationType === 'room' ? 'Room' : 'Ward'}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Reason */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Transfer Reason *</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Requires intensive monitoring post-surgery" required />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Transferring...' : 'Confirm Transfer'}
            </button>
          </div>
        </form>

        {toast && (
          <div className={`px-5 py-2 text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  )
}

function Tab({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-md px-3 py-1 text-sm ${active ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{label}</button>
  )
}

// Dialogs removed; handled inside child components
