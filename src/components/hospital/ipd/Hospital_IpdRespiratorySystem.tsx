import { useEffect, useState } from 'react'
import { hospitalApi } from '../../../utils/api'
import RespiratoryExam from './Hospital_RespiratoryExam'

export default function Hospital_IpdRespiratorySystem({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<Array<{
    id: string
    recordedAt: string
    data: any
  }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'respiratory-exam', limit: 200 }) as any
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
      console.log('Saving respiratory exam data:', d)
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'respiratory-exam',
        sign: '',
        data: d,
      })
      setOpen(false)
      await reload()
    }catch(e: any){ 
      console.error('Error saving respiratory examination:', e)
      alert(e?.message || e?.error || 'Failed to save respiratory examination') 
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Respiratory System Examination</div>
        <button onClick={()=>setOpen(true)} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
          Add Examination
        </button>
      </div>

      {records.length === 0 ? (
        <div className="text-slate-500">No respiratory examination records yet.</div>
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <RespiratoryExamDisplay data={r.data} />
              <div className="mt-2 text-right text-xs text-slate-500">
                Recorded: {new Date(r.recordedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <RespiratoryDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function RespiratoryDialog({
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
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Add Respiratory System Examination</h3>

        <RespiratoryExam
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

function RespiratoryExamDisplay({ data }: { data: any }) {
  const resp = data || {}
  
  return (
    <div className="space-y-3 border border-slate-300 p-3 rounded-lg bg-slate-50 text-xs">
      <h5 className="font-bold text-slate-900 bg-slate-200 px-2 py-1">RESPIRATORY SYSTEM</h5>

      {/* Row 1 */}
      <div className="grid grid-cols-5 gap-2">
        {resp.dyspnoea && <div>✓ Dyspnoea</div>}
        {resp.tachypnoea && <div>✓ Tachypnoea</div>}
        {resp.useOfAccessoryMuscles && <div>✓ Use of Accessory Muscles</div>}
        {resp.orthopnoea && <div>✓ Orthopnoea</div>}
        {resp.runningNose && <div>✓ Running Nose</div>}
      </div>

      {/* Cough */}
      {resp.cough && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Cough:</div>
          <div className="flex flex-wrap gap-2">
            {resp.cough.dry && <div>✓ Dry</div>}
            {resp.cough.productive && <div>✓ Productive</div>}
            {resp.cough.colour && <div>✓ Colour</div>}
            {resp.cough.white && <div>✓ White</div>}
            {resp.cough.yellow && <div>✓ Yellow</div>}
            {resp.cough.green && <div>✓ Green</div>}
          </div>
          {resp.cough.ifYes && <div className="mt-1">If Yes: {resp.cough.ifYes}</div>}
          {(resp.cough.central || resp.cough.peripheral) && (
            <div className="mt-1">Central: {resp.cough.central || '-'} | Peripheral: {resp.cough.peripheral || '-'}</div>
          )}
        </div>
      )}

      {/* Inspection */}
      {resp.inspection && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Inspection:</div>
          <div className="flex gap-3">
            {resp.inspection.symmetrical && <div>✓ Symmetrical</div>}
            {resp.inspection.asymmetrical && <div>✓ Asymmetrical</div>}
          </div>
        </div>
      )}

      {/* Expansion */}
      {resp.expansion && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Expansion:</div>
          <div className="flex flex-wrap gap-2">
            {resp.expansion.pigeon && <div>✓ Pigeon</div>}
            {resp.expansion.flat && <div>✓ Flat</div>}
            {resp.expansion.dumBell && <div>✓ Dum Bell</div>}
            {resp.expansion.kyphosis && <div>✓ Kyphosis</div>}
            {resp.expansion.funnel && <div>✓ Funnel</div>}
            {resp.expansion.barrel && <div>✓ Barrel</div>}
            {resp.expansion.other && <div>✓ Other</div>}
          </div>
        </div>
      )}

      {/* Transverse Diameter */}
      {resp.transverseDiameter && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Transverse Diameter:</div>
          <div className="grid grid-cols-2 gap-2">
            {resp.transverseDiameter.rr && <div>R/R: {resp.transverseDiameter.rr}</div>}
            {resp.transverseDiameter.breathsPerMin && <div>Breaths/min: {resp.transverseDiameter.breathsPerMin}</div>}
          </div>
        </div>
      )}

      {/* Intotrusion of Chest */}
      {resp.intotrusionOfChest && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Intotrusion of Chest:</div>
          <div className="flex flex-wrap gap-2">
            {resp.intotrusionOfChest.unilateral && <div>✓ Unilateral</div>}
            {resp.intotrusionOfChest.bilateral && <div>✓ Bilateral</div>}
            {resp.intotrusionOfChest.hollowingOfChest && <div>Hollowing: {resp.intotrusionOfChest.hollowingOfChest}</div>}
          </div>
        </div>
      )}

      {/* Breathing Pattern */}
      {resp.breathingPattern && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Breathing Pattern:</div>
          <div className="flex flex-wrap gap-2">
            {resp.breathingPattern.abdominoThoracic && <div>✓ Abdomino-thoracic</div>}
            {resp.breathingPattern.thoracoAbdominal && <div>✓ Thoraco-abdominal</div>}
            {resp.breathingPattern.mediastinalShift && <div>Mediastinal Shift: {resp.breathingPattern.mediastinalShift}</div>}
            {resp.breathingPattern.central && <div>✓ Central</div>}
            {resp.breathingPattern.left && <div>✓ Left</div>}
            {resp.breathingPattern.right && <div>✓ Right</div>}
          </div>
        </div>
      )}

      {/* Palpation */}
      {resp.palpation && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Palpation:</div>
          <div className="grid grid-cols-3 gap-2">
            {resp.palpation.tenderSpot && <div>Tender Spot: {resp.palpation.tenderSpot}</div>}
            {resp.palpation.swelling && <div>Swelling: {resp.palpation.swelling}</div>}
            {resp.palpation.trachea?.vocalFremitus && <div>✓ Vocal Fremitus</div>}
          </div>
        </div>
      )}

      {/* Percussion */}
      {resp.percussion && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Percussion:</div>
          <div className="flex flex-wrap gap-2">
            {resp.percussion.normal && <div>✓ Normal</div>}
            {resp.percussion.dull && <div>✓ Dull</div>}
            {resp.percussion.stonyDull && <div>✓ Stony Dull</div>}
            {resp.percussion.resonant && <div>✓ Resonant</div>}
            {resp.percussion.hyperResonant && <div>✓ Hyper Resonant</div>}
          </div>
        </div>
      )}

      {/* Auscultation */}
      {resp.auscultation && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Auscultation:</div>
          <div className="space-y-1">
            {resp.auscultation.breathing && <div>Breathing: {resp.auscultation.breathing}</div>}
            <div className="flex gap-2">
              {resp.auscultation.vesicular && <div>✓ Vesicular</div>}
              {resp.auscultation.bronchial && <div>✓ Bronchial</div>}
            </div>
            {resp.auscultation.additionalSounds && <div>Additional Sounds: {resp.auscultation.additionalSounds}</div>}
            <div className="flex gap-2">
              {resp.auscultation.wheezeOrStridor && <div>✓ Wheeze or Stridor</div>}
              {resp.auscultation.pleuralRub && <div>✓ Pleural Rub</div>}
            </div>
          </div>
        </div>
      )}

      {/* Others */}
      {resp.others && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Others:</div>
          <div>{resp.others}</div>
        </div>
      )}
    </div>
  )
}
