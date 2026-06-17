import { useEffect, useState } from 'react'
import { hospitalApi } from '../../../utils/api'
import CentralNervousExam from './Hospital_CentralNervousExam'

export default function Hospital_IpdCentralNervousSystem({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<Array<{
    id: string
    recordedAt: string
    data: any
  }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'cns-exam', limit: 200 }) as any
      const items = (res.notes || []).map((n: any) => ({
        id: String(n._id),
        recordedAt: String(n.recordedAt || n.createdAt || ''),
        data: n.data || {},
      }))
      setRecords(items)
    }catch{}
  }

  const add = async (d: any) => {
    try{
      console.log('Saving CNS exam data:', d)
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'cns-exam',
        sign: '',
        data: d,
      })
      setOpen(false)
      await reload()
    }catch(e: any){ 
      console.error('Error saving CNS examination:', e)
      alert(e?.message || e?.error || 'Failed to save CNS examination') 
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Central Nervous System Examination</div>
        <button onClick={()=>setOpen(true)} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
          Add Examination
        </button>
      </div>

      {records.length === 0 ? (
        <div className="text-slate-500">No CNS examination records yet.</div>
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <CentralNervousExamDisplay data={r.data} />
              <div className="mt-2 text-right text-xs text-slate-500">
                Recorded: {new Date(r.recordedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <CentralNervousDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function CentralNervousDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (d: any) => void
}) {
  const [form, setForm] = useState({})

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Add Central Nervous System Examination</h3>

        <CentralNervousExam
          data={form}
          onChange={(data) => setForm(data)}
        />

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function CentralNervousExamDisplay({ data }: { data: any }) {
  const cns = data || {}
  
  return (
    <div className="space-y-3 border border-slate-300 p-3 rounded-lg bg-slate-50 text-xs">
      <h5 className="font-bold text-slate-900 bg-slate-200 px-2 py-1">CENTRAL NERVOUS SYSTEM</h5>

      {/* Symptoms */}
      <div className="flex flex-wrap gap-2">
        {cns.headaches && <div>✓ Headaches</div>}
        {cns.dizziness && <div>✓ Dizziness</div>}
        {cns.faintingOrLossOfConsciousness && <div>✓ Fainting or Loss of Consciousness</div>}
        {cns.numbnessOrTingling && <div>✓ Numbness or Tingling</div>}
        {cns.memoryLoss && <div>✓ Memory Loss</div>}
      </div>

      {/* Orientation */}
      {cns.orientation && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Orientation:</div>
          <div className="space-y-1">
            {cns.orientation.oriented?.yes && <div>✓ Oriented: Yes</div>}
            {cns.orientation.oriented?.no && <div>✓ Oriented: No</div>}
            {cns.orientation.disorientedTo && <div>Disoriented to: {cns.orientation.disorientedTo}</div>}
            <div className="flex gap-2">
              {cns.orientation.time && <div>✓ Time</div>}
              {cns.orientation.place && <div>✓ Place</div>}
              {cns.orientation.person && <div>✓ Person</div>}
            </div>
            {cns.orientation.other && <div>Other: {cns.orientation.other}</div>}
          </div>
        </div>
      )}

      {/* Behavior */}
      {cns.behavior && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Behavior:</div>
          <div className="flex flex-wrap gap-2">
            {cns.behavior.appropriateCooperative && <div>✓ Appropriate/Cooperative</div>}
            {cns.behavior.anxious && <div>✓ Anxious</div>}
            {cns.behavior.agitated && <div>✓ Agitated</div>}
            {cns.behavior.violent && <div>✓ Violent</div>}
            {cns.behavior.withdrawnQuite && <div>✓ Withdrawn/Quite</div>}
            {cns.behavior.other && <div>Other: {cns.behavior.other}</div>}
          </div>
        </div>
      )}

      {/* Speech */}
      {cns.speech && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Speech:</div>
          <div className="flex flex-wrap gap-2">
            {cns.speech.normal && <div>✓ Normal</div>}
            {cns.speech.slurred && <div>✓ Slurred</div>}
            {cns.speech.aphasic && <div>✓ Aphasic</div>}
            {cns.speech.stammering && <div>✓ Stammering</div>}
            {cns.speech.withArtificialAirway && <div>✓ With Artificial Airway</div>}
            {cns.speech.dysarthria && <div>✓ Dysarthria</div>}
            {cns.speech.spastic && <div>✓ Spastic</div>}
            {cns.speech.other && <div>Other: {cns.speech.other}</div>}
          </div>
        </div>
      )}

      {/* Level of Consciousness */}
      {cns.levelOfConsciousness && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Level of Consciousness:</div>
          <div className="flex flex-wrap gap-2">
            {cns.levelOfConsciousness.alert && <div>✓ Alert</div>}
            {cns.levelOfConsciousness.respondsToVoice && <div>✓ Responds to Voice</div>}
            {cns.levelOfConsciousness.respondsToPain && <div>✓ Responds to Pain</div>}
            {cns.levelOfConsciousness.unconscious && <div>✓ Unconscious</div>}
            {cns.levelOfConsciousness.drowsy && <div>✓ Drowsy</div>}
            {cns.levelOfConsciousness.lethargy && <div>✓ Lethargy</div>}
          </div>
        </div>
      )}

      {/* Glasgow Coma Scale */}
      {cns.glasgowComaScale && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Glasgow Coma Scale:</div>
          <div className="flex flex-wrap gap-2">
            {cns.glasgowComaScale.eyeResponse && <div>✓ Eye Response</div>}
            {cns.glasgowComaScale.verbalResponse && <div>✓ Verbal Response</div>}
            {cns.glasgowComaScale.motorResponse && <div>✓ Motor Response</div>}
            {cns.glasgowComaScale.total && <div>Total: {cns.glasgowComaScale.total}/15</div>}
          </div>
        </div>
      )}

      {/* Cranial Nerves */}
      {cns.cranialNerves && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Cranial Nerves:</div>
          <div className="space-y-1 text-xs">
            {cns.cranialNerves.olfactory && (
              <div>I-Olfactory: R: {cns.cranialNerves.olfactory.right || '-'} | L: {cns.cranialNerves.olfactory.left || '-'}</div>
            )}
            {cns.cranialNerves.optic && (
              <div>
                <div>II-Optic:</div>
                {cns.cranialNerves.optic.visualAcuity && <div className="ml-2">Visual Acuity - R: {cns.cranialNerves.optic.visualAcuity.right || '-'} | L: {cns.cranialNerves.optic.visualAcuity.left || '-'}</div>}
                {cns.cranialNerves.optic.visualFields && <div className="ml-2">Visual Fields - R: {cns.cranialNerves.optic.visualFields.right || '-'} | L: {cns.cranialNerves.optic.visualFields.left || '-'}</div>}
                {cns.cranialNerves.optic.fundus && <div className="ml-2">Fundus - R: {cns.cranialNerves.optic.fundus.right || '-'} | L: {cns.cranialNerves.optic.fundus.left || '-'}</div>}
              </div>
            )}
            {cns.cranialNerves.oculomotor && (
              <div>III-IV-VI Oculomotor: R: {cns.cranialNerves.oculomotor.right || '-'} | L: {cns.cranialNerves.oculomotor.left || '-'}</div>
            )}
            {cns.cranialNerves.trigeminal && (
              <div>V-Trigeminal: R: {cns.cranialNerves.trigeminal.right || '-'} | L: {cns.cranialNerves.trigeminal.left || '-'}</div>
            )}
            {cns.cranialNerves.facial && (
              <div>VII-Facial: R: {cns.cranialNerves.facial.right || '-'} | L: {cns.cranialNerves.facial.left || '-'}</div>
            )}
            {cns.cranialNerves.vestibulocochlear && (
              <div>VIII-Vestibulocochlear: R: {cns.cranialNerves.vestibulocochlear.right || '-'} | L: {cns.cranialNerves.vestibulocochlear.left || '-'}</div>
            )}
            {cns.cranialNerves.glossopharyngeal && (
              <div>IX-Glossopharyngeal: R: {cns.cranialNerves.glossopharyngeal.right || '-'} | L: {cns.cranialNerves.glossopharyngeal.left || '-'}</div>
            )}
            {cns.cranialNerves.vagus && (
              <div>X-Vagus: R: {cns.cranialNerves.vagus.right || '-'} | L: {cns.cranialNerves.vagus.left || '-'}</div>
            )}
            {cns.cranialNerves.accessory && (
              <div>XI-Accessory: R: {cns.cranialNerves.accessory.right || '-'} | L: {cns.cranialNerves.accessory.left || '-'}</div>
            )}
            {cns.cranialNerves.hypoglossal && (
              <div>XII-Hypoglossal: R: {cns.cranialNerves.hypoglossal.right || '-'} | L: {cns.cranialNerves.hypoglossal.left || '-'}</div>
            )}
          </div>
        </div>
      )}

      {/* Gait */}
      {cns.gait && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Gait:</div>
          <div className="flex flex-wrap gap-2">
            {cns.gait.normal && <div>✓ Normal</div>}
            {cns.gait.sensory && <div>✓ Sensory</div>}
            {cns.gait.neuropathicHighStepping && <div>✓ Neuropathic/High-stepping</div>}
            {cns.gait.hemiplegic && <div>✓ Hemiplegic</div>}
            {cns.gait.choreiform && <div>✓ Choreiform</div>}
            {cns.gait.diplegicSpastic && <div>✓ Diplegic/Spastic</div>}
            {cns.gait.myopathicWaddling && <div>✓ Myopathic/Waddling</div>}
            {cns.gait.parkinsonianFestinant && <div>✓ Parkinsonian/Festinant</div>}
            {cns.gait.drunken && <div>✓ Drunken</div>}
          </div>
        </div>
      )}

      {/* Others */}
      {cns.others && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Others:</div>
          <div>{cns.others}</div>
        </div>
      )}
    </div>
  )
}
