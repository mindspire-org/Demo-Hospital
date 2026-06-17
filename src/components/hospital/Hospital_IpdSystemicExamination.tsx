import { useState } from 'react'
import Hospital_IpdCardiovascularSystem from './Hospital_IpdCardiovascularSystem'
import Hospital_IpdRespiratorySystem from './Hospital_IpdRespiratorySystem'
import Hospital_IpdCentralNervousSystem from './Hospital_IpdCentralNervousSystem'
import Hospital_IpdCentralNervousSystemB from './Hospital_IpdCentralNervousSystemB'
import Hospital_IpdGastrointestinalSystem from './Hospital_IpdGastrointestinalSystem'
import Hospital_IpdHerniaRectalSystem from './Hospital_IpdHerniaRectalSystem'
import Hospital_IpdUrogenitalMusculoskeletalSystem from './Hospital_IpdUrogenitalMusculoskeletalSystem'
import Hospital_IpdGynecologicalObstetricSystem from './Hospital_IpdGynecologicalObstetricSystem'

export default function Hospital_IpdSystemicExamination({ encounterId }: { encounterId: string }){
  const [tab, setTab] = useState<'cardiovascular' | 'respiratory' | 'cns' | 'cns-b' | 'gastrointestinal' | 'hernia-rectal' | 'urogenital-musculoskeletal' | 'gynecological-obstetric'>('cardiovascular')
  return (
    <div className="space-y-3" data-encounterid={encounterId}>
      <div className="flex flex-wrap gap-1">
        <SystemTab label="Cardiovascular System" active={tab==='cardiovascular'} onClick={()=>setTab('cardiovascular')} />
        <SystemTab label="Respiratory System" active={tab==='respiratory'} onClick={()=>setTab('respiratory')} />
        <SystemTab label="Central Nervous System" active={tab==='cns'} onClick={()=>setTab('cns')} />
        <SystemTab label="Central Nervous System (B)" active={tab==='cns-b'} onClick={()=>setTab('cns-b')} />
        <SystemTab label="Gastrointestinal System" active={tab==='gastrointestinal'} onClick={()=>setTab('gastrointestinal')} />
        <SystemTab label="Hernia & Rectal" active={tab==='hernia-rectal'} onClick={()=>setTab('hernia-rectal')} />
        <SystemTab label="Urogenital & Musculoskeletal" active={tab==='urogenital-musculoskeletal'} onClick={()=>setTab('urogenital-musculoskeletal')} />
        <SystemTab label="Gynecological & Obstetric" active={tab==='gynecological-obstetric'} onClick={()=>setTab('gynecological-obstetric')} />
      </div>
      {tab==='cardiovascular' && (<Hospital_IpdCardiovascularSystem encounterId={encounterId} />)}
      {tab==='respiratory' && (<Hospital_IpdRespiratorySystem encounterId={encounterId} />)}
      {tab==='cns' && (<Hospital_IpdCentralNervousSystem encounterId={encounterId} />)}
      {tab==='cns-b' && (<Hospital_IpdCentralNervousSystemB encounterId={encounterId} />)}
      {tab==='gastrointestinal' && (<Hospital_IpdGastrointestinalSystem encounterId={encounterId} />)}
      {tab==='hernia-rectal' && (<Hospital_IpdHerniaRectalSystem encounterId={encounterId} />)}
      {tab==='urogenital-musculoskeletal' && (<Hospital_IpdUrogenitalMusculoskeletalSystem encounterId={encounterId} />)}
      {tab==='gynecological-obstetric' && (<Hospital_IpdGynecologicalObstetricSystem encounterId={encounterId} />)}
    </div>
  )
}

function SystemTab({ label, active, onClick }: { label: string; active?: boolean; onClick: ()=>void }){
  return (
    <button onClick={onClick} className={`rounded-md px-3 py-1 text-sm ${active ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{label}</button>
  )
}
