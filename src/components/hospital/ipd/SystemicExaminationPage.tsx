import { Printer } from 'lucide-react'
import { useState, useRef } from 'react'
import CardiovascularPage from './systemic-examination/cardiovascular/CardiovascularPage'
import RespiratoryPage from './systemic-examination/respiratory/RespiratoryPage'
import CentralNervousSystemPage from './systemic-examination/cns/CentralNervousSystemPage'
import CentralNervousSystemBPage from './systemic-examination/cns-b/CentralNervousSystemBPage'
import GastrointestinalPage from './systemic-examination/gastrointestinal/GastrointestinalPage'
import HerniaRectalPage from './systemic-examination/hernia-rectal/HerniaRectalPage'
import UrogenitalMusculoskeletalPage from './systemic-examination/urogenital-musculoskeletal/UrogenitalMusculoskeletalPage'
import GynecologicalObstetricPage from './systemic-examination/gynecological-obstetric/GynecologicalObstetricPage'
import MusculoskeletalPage from './systemic-examination/urogenital-musculoskeletal/MusculoskeletalPage'
import { useReactToPrint } from 'react-to-print'
import IpdTabPrintHeader from './IpdTabPrintHeader'
import { useEncounterDefaults } from '../../../hooks/useEncounterDefaults'

export default function SystemicExaminationPage({ encounterId }: { encounterId: string }){
  const [tab, setTab] = useState<'cardiovascular' | 'respiratory' | 'cns' | 'cns-b' | 'gastrointestinal' | 'hernia-rectal' | 'urogenital-musculoskeletal' | 'gynecological-obstetric' | 'musculoskeletal'>('cardiovascular')
  const localPrintRef = useRef<HTMLDivElement>(null)
  const defaults = useEncounterDefaults(encounterId)

  const handleLocalPrint = useReactToPrint({
    contentRef: localPrintRef,
    documentTitle: `Systemic_${tab}_${encounterId}`,
    print: async (target: HTMLIFrameElement) => {
      const html = target.contentDocument?.documentElement.outerHTML
      if (html && (window as any).electronAPI?.printPreviewHtml) {
        await (window as any).electronAPI.printPreviewHtml(html)
      } else {
        target.contentWindow?.print()
      }
    }
  })

  const getTitle = (t: typeof tab) => {
    switch(t){
      case 'cardiovascular': return 'Cardiovascular System Examination'
      case 'respiratory': return 'Respiratory System Examination'
      case 'cns': return 'Central Nervous System Examination'
      case 'cns-b': return 'Central Nervous System (B) Examination'
      case 'gastrointestinal': return 'Gastrointestinal System Examination'
      case 'hernia-rectal': return 'Hernia & Rectal Examination'
      case 'urogenital-musculoskeletal': return 'Urogenital & Musculoskeletal Examination'
      case 'musculoskeletal': return 'Musculoskeletal Examination'
      case 'gynecological-obstetric': return 'Gynecological & Obstetric Examination'
      default: return 'Systemic Examination'
    }
  }

  return (
    <div className="space-y-3" data-encounterid={encounterId}>
      {/* Hidden div for local sub-tab printing only */}
      <div className="hidden">
        <div ref={localPrintRef} className="p-8">
          <IpdTabPrintHeader defaults={defaults} title={getTitle(tab)} />
          {tab==='cardiovascular' && (<CardiovascularPage encounterId={encounterId} />)}
          {tab==='respiratory' && (<RespiratoryPage encounterId={encounterId} />)}
          {tab==='cns' && (<CentralNervousSystemPage encounterId={encounterId} />)}
          {tab==='cns-b' && (<CentralNervousSystemBPage encounterId={encounterId} />)}
          {tab==='gastrointestinal' && (<GastrointestinalPage encounterId={encounterId} />)}
          {tab==='hernia-rectal' && (<HerniaRectalPage encounterId={encounterId} />)}
          {tab==='urogenital-musculoskeletal' && (<UrogenitalMusculoskeletalPage encounterId={encounterId} />)}
          {tab==='musculoskeletal' && (<MusculoskeletalPage encounterId={encounterId} />)}
          {tab==='gynecological-obstetric' && (<GynecologicalObstetricPage encounterId={encounterId} />)}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 justify-between items-center print:hidden">
        <div className="flex flex-wrap gap-1">
          <SystemTab label="Cardiovascular System" active={tab==='cardiovascular'} onClick={()=>setTab('cardiovascular')} />
          <SystemTab label="Respiratory System" active={tab==='respiratory'} onClick={()=>setTab('respiratory')} />
          <SystemTab label="Central Nervous System" active={tab==='cns'} onClick={()=>setTab('cns')} />
          <SystemTab label="Central Nervous System (B)" active={tab==='cns-b'} onClick={()=>setTab('cns-b')} />
          <SystemTab label="Gastrointestinal System" active={tab==='gastrointestinal'} onClick={()=>setTab('gastrointestinal')} />
          <SystemTab label="Hernia & Rectal" active={tab==='hernia-rectal'} onClick={()=>setTab('hernia-rectal')} />
          <SystemTab label="Urogenital & Musculoskeletal" active={tab==='urogenital-musculoskeletal'} onClick={()=>setTab('urogenital-musculoskeletal')} />
          <SystemTab label="Musculoskeletal Exam" active={tab==='musculoskeletal'} onClick={()=>setTab('musculoskeletal')} />
          <SystemTab label="Gynecological & Obstetric" active={tab==='gynecological-obstetric'} onClick={()=>setTab('gynecological-obstetric')} />
        </div>
        <button 
          onClick={() => handleLocalPrint()}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900"
        >
          <Printer className="h-4 w-4" />
          Print {getTitle(tab)}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Screen View */}
        <div className="p-4 print:hidden">
          {tab==='cardiovascular' && (<CardiovascularPage encounterId={encounterId} />)}
          {tab==='respiratory' && (<RespiratoryPage encounterId={encounterId} />)}
          {tab==='cns' && (<CentralNervousSystemPage encounterId={encounterId} />)}
          {tab==='cns-b' && (<CentralNervousSystemBPage encounterId={encounterId} />)}
          {tab==='gastrointestinal' && (<GastrointestinalPage encounterId={encounterId} />)}
          {tab==='hernia-rectal' && (<HerniaRectalPage encounterId={encounterId} />)}
          {tab==='urogenital-musculoskeletal' && (<UrogenitalMusculoskeletalPage encounterId={encounterId} />)}
          {tab==='musculoskeletal' && (<MusculoskeletalPage encounterId={encounterId} />)}
          {tab==='gynecological-obstetric' && (<GynecologicalObstetricPage encounterId={encounterId} />)}
        </div>

        {/* Print View (All Tabs) */}
        <div className="hidden print:block space-y-6 p-4">
          {(['cardiovascular', 'respiratory', 'cns', 'cns-b', 'gastrointestinal', 'hernia-rectal', 'urogenital-musculoskeletal', 'musculoskeletal', 'gynecological-obstetric'] as const).map((t) => (
            <section key={t}>
              <div className="mb-2 text-center text-lg font-bold uppercase border-b border-slate-300 inline-block">{getTitle(t)}</div>
              {t==='cardiovascular' && (<CardiovascularPage encounterId={encounterId} />)}
              {t==='respiratory' && (<RespiratoryPage encounterId={encounterId} />)}
              {t==='cns' && (<CentralNervousSystemPage encounterId={encounterId} />)}
              {t==='cns-b' && (<CentralNervousSystemBPage encounterId={encounterId} />)}
              {t==='gastrointestinal' && (<GastrointestinalPage encounterId={encounterId} />)}
              {t==='hernia-rectal' && (<HerniaRectalPage encounterId={encounterId} />)}
              {t==='urogenital-musculoskeletal' && (<UrogenitalMusculoskeletalPage encounterId={encounterId} />)}
              {t==='musculoskeletal' && (<MusculoskeletalPage encounterId={encounterId} />)}
              {t==='gynecological-obstetric' && (<GynecologicalObstetricPage encounterId={encounterId} />)}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function SystemTab({ label, active, onClick }: { label: string; active?: boolean; onClick: ()=>void }){
  return (
    <button onClick={onClick} className={`rounded-md px-3 py-1 text-sm ${active ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{label}</button>
  )
}
