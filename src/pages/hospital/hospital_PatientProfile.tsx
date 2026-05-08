import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { 
  FileText, Activity, LineChart, Scissors, ClipboardList, 
  Thermometer, Pill, History, ShieldAlert, CheckSquare, 
  Droplets, FileSignature, FlaskConical, RadioTower, Stethoscope,
  Printer, LogOut, ChevronLeft
} from 'lucide-react'
import DailyMonitoring from '../../components/hospital/Hospital_IpdDailyMonitoring'
import DailyProgress from '../../components/hospital/Hospital_IpdDailyProgress'
import Medication from '../../components/hospital/Hospital_IpdMedication.tsx'
import LabTests from '../../components/hospital/Hospital_IpdLabTests'
import DiagnosticTests from '../../components/hospital/Hospital_IpdDiagnosticTests'
import DoctorVisits from '../../components/hospital/Hospital_IpdDoctorVisits'
import ConsultantNotes from '../../components/hospital/Hospital_IpdConsultantNotes'
import Anesthesia from '../../components/hospital/Hospital_IpdAnesthesia'
import Surgery from '../../components/hospital/Hospital_IpdSurgery'
import ConsentForm from '../../components/hospital/Hospital_IpdConsentForm'
import IcuMonitoring from '../../components/hospital/Hospital_IpdIcuMonitoring'
import IcuConsentForm from '../../components/hospital/Hospital_IpdIcuConsentForm'
import InfectionControlChecklist from '../../components/hospital/Hospital_IpdInfectionControlChecklist'
import SurgicalSafetyChecklist from '../../components/hospital/Hospital_IpdSurgicalSafetyChecklist'
import BloodTransfusionNotes from '../../components/hospital/Hospital_IpdBloodTransfusionNotes'
import OperationConsent from '../../components/hospital/Hospital_IpdOperationConsent'
import HistoryExamination from '../../components/hospital/Hospital_IpdHistoryExamination'

 

function formatDateTime(s: string) {
  const d = new Date(s)
  return `${d.toLocaleDateString()}, ${d.toLocaleTimeString()}`
}

export default function Hospital_PatientProfile() {
  const { id } = useParams()
  const encounterIdRaw = String(id || '')
  const encounterId = (encounterIdRaw.match(/^[a-f0-9]{24}/i)?.[0] || encounterIdRaw).trim()
  const navigate = useNavigate()
  const location = useLocation()
  const fromSearch = !!(location as any)?.state?.fromSearch
  const backSnapshot = (location as any)?.state?.searchSnapshot
  const [encounter, setEncounter] = useState<any | null>(null)

  const tabs = useMemo(() => [
    { id: 'consent', label: 'Consent Form', icon: FileText },
    { id: 'icuconsent', label: 'ICU Consent', icon: FileText },
    { id: 'icu', label: 'ICU Monitoring', icon: Activity },
    { id: 'vitals', label: 'Daily Monitoring', icon: Activity },
    { id: 'progress', label: 'Daily Progress', icon: LineChart },
    { id: 'surgery', label: 'Surgery', icon: Scissors },
    { id: 'consult', label: 'Consultant Notes', icon: ClipboardList },
    { id: 'anesthesia', label: 'Anesthesia', icon: Thermometer },
    { id: 'meds', label: 'Medication', icon: Pill },
    { id: 'history', label: 'History & Examination', icon: History },
    { id: 'infection', label: 'Infection Control', icon: ShieldAlert },
    { id: 'surgical', label: 'Surgical Safety', icon: CheckSquare },
    { id: 'transfusion', label: 'Blood Transfusion', icon: Droplets },
    { id: 'opconsent', label: 'Operation Consent', icon: FileSignature },
    { id: 'lab', label: 'Lab Tests', icon: FlaskConical },
    { id: 'diagnostic', label: 'Diagnostic Tests', icon: RadioTower },
    { id: 'visits', label: 'Doctor Visits', icon: Stethoscope },
  ] as const, [])

  type TabId = typeof tabs[number]['id']

  const [tab, setTab] = useState<TabId>('consent')

  // child components handle their own state

  // moved to Billing component

  const discharge = () => {
    navigate(`/hospital/discharge/${encounterId}`)
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
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 to-indigo-600 text-xl font-black text-white shadow-lg shadow-sky-200 group-hover:scale-105 transition-transform">
                  {String((encounter as any)?.patientId?.fullName || 'P').trim().slice(0, 1).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white bg-green-500 shadow-sm" title="Active Admission"></div>
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-slate-900 capitalize tracking-tight">
                    {(encounter as any)?.patientId?.fullName || '-'}
                  </h1>
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-black text-sky-700 uppercase tracking-wider">IPD Patient</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                      <Activity size={12} className="stroke-3" />
                    </div>
                    <span className="text-xs font-bold text-slate-600">Bed: <span className="text-slate-900">{(encounter as any)?.bedLabel || (encounter as any)?.bedId || '-'}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                      <Stethoscope size={12} className="stroke-3" />
                    </div>
                    <span className="text-xs font-bold text-slate-600">Doctor: <span className="text-slate-900">{(encounter as any)?.doctorId?.name || '-'}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                      <History size={12} className="stroke-3" />
                    </div>
                    <span className="text-xs font-bold text-slate-600 text-nowrap">Admitted: <span className="text-slate-900">{(encounter as any)?.startAt ? formatDateTime(String((encounter as any)?.startAt)) : '-'}</span></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {fromSearch && (
                <button 
                  onClick={()=>navigate('/hospital/search-patients', { state: { searchSnapshot: backSnapshot } })} 
                  className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
                >
                  <ChevronLeft size={14} className="stroke-3" />
                  Back
                </button>
              )}
              <button 
                onClick={()=>navigate(`/hospital/patient/${encounterId}/print`)} 
                className="flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800 active:scale-95"
              >
                <Printer size={14} className="stroke-3" />
                Print File
              </button>
              <button 
                onClick={discharge} 
                className="flex h-9 items-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-black text-white shadow-lg shadow-rose-100 transition hover:bg-rose-700 active:scale-95"
              >
                <LogOut size={14} className="stroke-3" />
                Discharge
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-50/50 border-t border-slate-100 p-2">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {tabs.map((t) => (
              <Tab 
                key={t.id}
                label={t.label} 
                icon={t.icon}
                active={tab === t.id} 
                onClick={() => setTab(t.id)} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content Section with Animation */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {tab==='vitals' && (<DailyMonitoring encounterId={encounterId} />)}
        {tab==='progress' && (<DailyProgress encounterId={encounterId} />)}
        {tab==='surgery' && (<Surgery encounterId={encounterId} />)}
        {tab==='consult' && (<ConsultantNotes encounterId={encounterId} />)}
        {tab==='anesthesia' && (<Anesthesia encounterId={encounterId} />)}
        {tab==='meds' && (<Medication encounterId={encounterId} />)}
        {tab==='history' && (<HistoryExamination encounterId={encounterId} />)}
        {tab==='consent' && (<ConsentForm encounterId={encounterId} />)}
        {tab==='icuconsent' && (<IcuConsentForm encounterId={encounterId} />)}
        {tab==='icu' && (<IcuMonitoring encounterId={encounterId} />)}
        {tab==='infection' && (<InfectionControlChecklist encounterId={encounterId} />)}
        {tab==='surgical' && (<SurgicalSafetyChecklist encounterId={encounterId} />)}
        {tab==='transfusion' && (<BloodTransfusionNotes encounterId={encounterId} />)}
        {tab==='opconsent' && (<OperationConsent encounterId={encounterId} />)}
        {tab==='lab' && (<LabTests encounterId={encounterId} />)}
        {tab==='diagnostic' && (<DiagnosticTests encounterId={encounterId} />)}
        {tab==='visits' && (<DoctorVisits encounterId={encounterId} />)}
      </div>
    </div>
  )
}

function Tab({ label, icon: Icon, active, onClick }: { label: string; icon: any; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        group flex flex-col items-center justify-center gap-1.5 rounded-2xl p-2.5 transition-all active:scale-95 text-center
        ${active
          ? 'bg-navy text-white shadow-xl shadow-navy/20 ring-4 ring-navy/5'
          : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-slate-100 shadow-sm'
        }
      `}
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${active ? 'bg-white/10' : 'bg-slate-50 group-hover:bg-slate-100'}`}>
        <Icon size={18} className={active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
      </div>
      <span className="text-[10px] font-black uppercase tracking-tight leading-none truncate w-full">{label}</span>
    </button>
  )
}

// Dialogs removed; handled inside child components
