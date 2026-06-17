import { Printer } from 'lucide-react'
import { useState, useRef } from 'react'
import PreoperativeNotes from './Hospital_IpdPreoperativeNotes'
import OperationNotes from './Hospital_IpdOperationNotes'
import PostOperativeOrder from './Hospital_IpdPostOperativeOrder'
import { useReactToPrint } from 'react-to-print'
import IpdTabPrintHeader from '../IpdTabPrintHeader'
import { useEncounterDefaults } from '../../../../hooks/useEncounterDefaults'

export default function Hospital_IpdSurgery({ encounterId }: { encounterId: string }){
  const [tab, setTab] = useState<'preop'|'operation'|'postop'>('preop')
  const localPrintRef = useRef<HTMLDivElement>(null)
  const defaults = useEncounterDefaults(encounterId)

  const handleLocalPrint = useReactToPrint({
    contentRef: localPrintRef,
    documentTitle: `Surgery_${tab}_${encounterId}`,
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
      case 'preop': return 'Pre-Operative Notes'
      case 'operation': return 'Operation Notes'
      case 'postop': return 'Post-Operative Orders'
      default: return 'Surgery Notes'
    }
  }

  return (
    <div className="space-y-3" data-encounterid={encounterId}>
      {/* Hidden div for local sub-tab printing only */}
      <div className="hidden">
        <div ref={localPrintRef} className="p-8">
          <IpdTabPrintHeader defaults={defaults} title={getTitle(tab)} />
          {tab==='preop' && (<PreoperativeNotes encounterId={encounterId} />)}
          {tab==='operation' && (<OperationNotes encounterId={encounterId} />)}
          {tab==='postop' && (<PostOperativeOrder encounterId={encounterId} />)}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 justify-between items-center print:hidden">
        <div className="flex gap-1">
          <SurgeryTab label="Pre-Operative" active={tab==='preop'} onClick={()=>setTab('preop')} />
          <SurgeryTab label="Operation Notes" active={tab==='operation'} onClick={()=>setTab('operation')} />
          <SurgeryTab label="Post-Operative" active={tab==='postop'} onClick={()=>setTab('postop')} />
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
          {tab==='preop' && (<PreoperativeNotes encounterId={encounterId} />)}
          {tab==='operation' && (<OperationNotes encounterId={encounterId} />)}
          {tab==='postop' && (<PostOperativeOrder encounterId={encounterId} />)}
        </div>

        {/* Print View (All Tabs) */}
        <div className="hidden print:block space-y-6 p-4">
          <section>
            <div className="mb-2 text-center text-lg font-bold uppercase border-b border-slate-300 inline-block">{getTitle('preop')}</div>
            <PreoperativeNotes encounterId={encounterId} />
          </section>
          <section>
            <div className="mb-2 text-center text-lg font-bold uppercase border-b border-slate-300 inline-block">{getTitle('operation')}</div>
            <OperationNotes encounterId={encounterId} />
          </section>
          <section>
            <div className="mb-2 text-center text-lg font-bold uppercase border-b border-slate-300 inline-block">{getTitle('postop')}</div>
            <PostOperativeOrder encounterId={encounterId} />
          </section>
        </div>
      </div>
    </div>
  )
}

function SurgeryTab({ label, active, onClick }: { label: string; active?: boolean; onClick: ()=>void }){
  return (
    <button onClick={onClick} className={`rounded-md px-3 py-1 text-sm ${active ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{label}</button>
  )
}
