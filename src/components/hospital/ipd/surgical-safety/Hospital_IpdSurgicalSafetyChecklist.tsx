import { Printer } from 'lucide-react'
import { useState, useRef } from 'react'
import SignIn from './Hospital_IpdSurgicalSafetySignIn'
import TimeOut from './Hospital_IpdSurgicalSafetyTimeOut'
import SignOut from './Hospital_IpdSurgicalSafetySignOut'
import { useReactToPrint } from 'react-to-print'
import IpdTabPrintHeader from '../IpdTabPrintHeader'
import { useEncounterDefaults } from '../../../../hooks/useEncounterDefaults'

export default function Hospital_IpdSurgicalSafetyChecklist({ encounterId }: { encounterId: string }) {
  const [tab, setTab] = useState<'signin' | 'timeout' | 'signout'>('signin')
  const localPrintRef = useRef<HTMLDivElement>(null)
  const defaults = useEncounterDefaults(encounterId)

  const handleLocalPrint = useReactToPrint({
    contentRef: localPrintRef,
    documentTitle: `SurgicalSafety_${tab}_${encounterId}`,
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
      case 'signin': return 'Surgical Safety - Sign In'
      case 'timeout': return 'Surgical Safety - Time Out'
      case 'signout': return 'Surgical Safety - Sign Out'
      default: return 'Surgical Safety Checklist'
    }
  }

  return (
    <div className="space-y-3" data-encounterid={encounterId}>
      {/* Hidden div for local sub-tab printing only */}
      <div className="hidden">
        <div ref={localPrintRef} className="p-8">
          <IpdTabPrintHeader defaults={defaults} title={getTitle(tab)} />
          {tab === 'signin' && <SignIn encounterId={encounterId} />}
          {tab === 'timeout' && <TimeOut encounterId={encounterId} />}
          {tab === 'signout' && <SignOut encounterId={encounterId} />}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 justify-between items-center print:hidden">
        <div className="flex flex-wrap gap-1">
          <SubTab label="Sign In" active={tab === 'signin'} onClick={() => setTab('signin')} />
          <SubTab label="Time Out" active={tab === 'timeout'} onClick={() => setTab('timeout')} />
          <SubTab label="Sign Out" active={tab === 'signout'} onClick={() => setTab('signout')} />
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
          {tab === 'signin' && <SignIn encounterId={encounterId} />}
          {tab === 'timeout' && <TimeOut encounterId={encounterId} />}
          {tab === 'signout' && <SignOut encounterId={encounterId} />}
        </div>

        {/* Print View (All Tabs) */}
        <div className="hidden print:block space-y-6 p-4">
          <section>
            <div className="mb-2 text-center text-lg font-bold uppercase border-b border-slate-300 inline-block">{getTitle('signin')}</div>
            <SignIn encounterId={encounterId} />
          </section>
          <section>
            <div className="mb-2 text-center text-lg font-bold uppercase border-b border-slate-300 inline-block">{getTitle('timeout')}</div>
            <TimeOut encounterId={encounterId} />
          </section>
          <section>
            <div className="mb-2 text-center text-lg font-bold uppercase border-b border-slate-300 inline-block">{getTitle('signout')}</div>
            <SignOut encounterId={encounterId} />
          </section>
        </div>
      </div>
    </div>
  )
}

function SubTab({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1 text-sm ${active ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
    >
      {label}
    </button>
  )
}
