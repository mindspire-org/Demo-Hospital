import { Printer } from 'lucide-react'
import { useState, useRef } from 'react'
import AnesPreAssessment from './AnesPreAssessmentForm'
import AnesIntraAssessment from './AnesIntraAssessmentForm'
import AnesRecovery from './AnesRecoveryForm'
import AnesPostRecovery from './AnesPostRecoveryForm'
import AnesAdverseEvents from './AnesAdverseEventsForm'
import { useReactToPrint } from 'react-to-print'
import IpdTabPrintHeader from '../IpdTabPrintHeader'
import { useEncounterDefaults } from '../../../../hooks/useEncounterDefaults'

export default function AnesthesiaPage({ encounterId }: { encounterId: string }){
  const [tab, setTab] = useState<'pre'|'intra'|'recovery'|'post'|'adverse'>('pre')
  const localPrintRef = useRef<HTMLDivElement>(null)
  const defaults = useEncounterDefaults(encounterId)

  const handleLocalPrint = useReactToPrint({
    contentRef: localPrintRef,
    documentTitle: `Anesthesia_${tab}_${encounterId}`,
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
      case 'pre': return 'Pre-Anesthesia Assessment'
      case 'intra': return 'Intra-Operative Anesthesia'
      case 'recovery': return 'Recovery Room Notes'
      case 'post': return 'Post-Recovery Assessment'
      case 'adverse': return 'Anesthesia Adverse Events'
      default: return 'Anesthesia Notes'
    }
  }

  return (
    <div className="space-y-3" data-encounterid={encounterId}>
      {/* Hidden div for local sub-tab printing only */}
      <div className="hidden">
        <div ref={localPrintRef} className="p-8">
          <IpdTabPrintHeader defaults={defaults} title={getTitle(tab)} />
          {tab==='pre' && (<AnesPreAssessment encounterId={encounterId} />)}
          {tab==='intra' && (<AnesIntraAssessment encounterId={encounterId} />)}
          {tab==='recovery' && (<AnesRecovery encounterId={encounterId} />)}
          {tab==='post' && (<AnesPostRecovery encounterId={encounterId} />)}
          {tab==='adverse' && (<AnesAdverseEvents encounterId={encounterId} />)}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 justify-between items-center print:hidden">
        <div className="flex flex-wrap gap-1">
          <TabBtn label="Pre-Anesthesia" active={tab==='pre'} onClick={()=>setTab('pre')} />
          <TabBtn label="Intra-Operative" active={tab==='intra'} onClick={()=>setTab('intra')} />
          <TabBtn label="Recovery Room" active={tab==='recovery'} onClick={()=>setTab('recovery')} />
          <TabBtn label="Post-Recovery" active={tab==='post'} onClick={()=>setTab('post')} />
          <TabBtn label="Adverse Events" active={tab==='adverse'} onClick={()=>setTab('adverse')} />
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
        {/* Screen View: Only active tab */}
        <div className="p-4 print:hidden">
          {tab==='pre' && (<AnesPreAssessment encounterId={encounterId} />)}
          {tab==='intra' && (<AnesIntraAssessment encounterId={encounterId} />)}
          {tab==='recovery' && (<AnesRecovery encounterId={encounterId} />)}
          {tab==='post' && (<AnesPostRecovery encounterId={encounterId} />)}
          {tab==='adverse' && (<AnesAdverseEvents encounterId={encounterId} />)}
        </div>

        {/* Print View (All Tabs): Triggered by parent "Print Tab" button */}
        <div className="hidden print:block space-y-6 p-4">
          <section>
            <div className="mb-2 text-center text-lg font-bold uppercase border-b border-slate-300 inline-block">{getTitle('pre')}</div>
            <AnesPreAssessment encounterId={encounterId} />
          </section>
          <section>
            <div className="mb-2 text-center text-lg font-bold uppercase border-b border-slate-300 inline-block">{getTitle('intra')}</div>
            <AnesIntraAssessment encounterId={encounterId} />
          </section>
          <section>
            <div className="mb-2 text-center text-lg font-bold uppercase border-b border-slate-300 inline-block">{getTitle('recovery')}</div>
            <AnesRecovery encounterId={encounterId} />
          </section>
          <section>
            <div className="mb-2 text-center text-lg font-bold uppercase border-b border-slate-300 inline-block">{getTitle('post')}</div>
            <AnesPostRecovery encounterId={encounterId} />
          </section>
          <section>
            <div className="mb-2 text-center text-lg font-bold uppercase border-b border-slate-300 inline-block">{getTitle('adverse')}</div>
            <AnesAdverseEvents encounterId={encounterId} />
          </section>
        </div>
      </div>
    </div>
  )
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: ()=>void }){
  return (
    <button onClick={onClick} className={`rounded-md px-3 py-1 text-sm font-medium ${active ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{label}</button>
  )
}
