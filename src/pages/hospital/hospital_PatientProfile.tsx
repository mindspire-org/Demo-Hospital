import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { FileText, ScrollText, ArrowLeft, Printer } from 'lucide-react'
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
  >('vitals')

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
      'pharmacy': 'Pharmacy Referral'
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
  useEffect(()=>{ if (encounterId){ loadEncounter() } }, [encounterId])

  async function loadEncounter(){
    try { const res = await hospitalApi.getIPDAdmissionById(encounterId) as any; setEncounter(res.encounter || null) } catch {}
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
            {(encounter as any)?.packageAmount > 0 && (
              <div className="mt-2 inline-flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm dark:bg-violet-900/20 dark:border-violet-800">
                <span className="font-semibold text-violet-800 dark:text-violet-300">Package: Rs {Number((encounter as any).packageAmount).toFixed(2)}</span>
                <span className="text-xs text-violet-600 dark:text-violet-400">
                  Advance: Rs {Number((encounter as any)?.advancedAmount || 0).toFixed(2)} ·
                  Pending: Rs {Math.max(0, Number((encounter as any)?.packageAmount || 0) + ((encounter as any)?.bedFeeIncludedInPackage ? 0 : Number((encounter as any)?.bedCharges || 0)) - Number((encounter as any)?.advancedAmount || 0)).toFixed(2)} ·
                  Bed: {(encounter as any)?.bedFeeIncludedInPackage ? 'Included' : 'Separate'}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <button onClick={()=>navigate('/hospital/patient-list')} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" />Back</button>
            {fromSearch && (
              <button onClick={()=>navigate('/hospital/search-patients', { state: { searchSnapshot: backSnapshot } })} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to Search</button>
            )}
            <button onClick={() => handlePrintTab()} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"><Printer className="h-4 w-4" />Print Tab</button>
            <button onClick={printMedicalRecord} className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900"><FileText className="h-4 w-4" />Print Record</button>
            <button onClick={discharge} className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"><ScrollText className="h-4 w-4" />Discharge Forms</button>
          </div>
        </div>
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
      </div>

      {/* Modals moved to child components */}
    </div>
  )
}

function Tab({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-md px-3 py-1 text-sm ${active ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{label}</button>
  )
}

// Dialogs removed; handled inside child components
