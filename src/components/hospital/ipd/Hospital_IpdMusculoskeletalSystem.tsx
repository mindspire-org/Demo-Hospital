import { useState } from 'react'
import MusculoskeletalExam from './Hospital_MusculoskeletalExam'

export default function Hospital_IpdMusculoskeletalSystem({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<Array<{
    id: string
    recordedAt: string
    data: any
  }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'musculoskeletal-exam', limit: 200 }) as any
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
      console.log('Saving musculoskeletal exam data:', d)
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'musculoskeletal-exam',
        sign: '',
        data: d,
      })
      setOpen(false)
      await reload()
    }catch(e: any){ 
      console.error('Error saving musculoskeletal examination:', e)
      alert(e?.message || e?.error || 'Failed to save musculoskeletal examination') 
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Musculoskeletal System Examination</div>
        <button onClick={()=>setOpen(true)} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
          Add Examination
        </button>
      </div>

      {records.length === 0 ? (
        <div className="text-slate-500">No musculoskeletal examination records yet.</div>
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <MusculoskeletalExamDisplay data={r.data} />
              <div className="mt-2 text-right text-xs text-slate-500">
                Recorded: {new Date(r.recordedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <MusculoskeletalDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function MusculoskeletalDialog({
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
        <h3 className="mb-4 text-lg font-semibold">Add Musculoskeletal System Examination</h3>

        <MusculoskeletalExam
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

function MusculoskeletalExamDisplay({ data }: { data: any }) {
  const msk = data || {}
  
  return (
    <div className="space-y-3 border border-slate-300 p-3 rounded-lg bg-slate-50 text-xs">
      <h5 className="font-bold text-slate-900 bg-slate-200 px-2 py-1">MUSCULOSKELETAL SYSTEM</h5>

      {/* Sensory Function */}
      {msk.sensory && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Sensory Function:</div>
          <div className="grid grid-cols-2 gap-2">
            {msk.sensory.fineTouch && (
              <div>Fine Touch: {msk.sensory.fineTouch.intact && 'Intact'} {msk.sensory.fineTouch.notIntact && 'Not Intact'}</div>
            )}
            {msk.sensory.crudeTouch && (
              <div>Crude Touch: {msk.sensory.crudeTouch.intact && 'Intact'} {msk.sensory.crudeTouch.notIntact && 'Not Intact'}</div>
            )}
            {msk.sensory.temperature && (
              <div>Temperature: {msk.sensory.temperature.intact && 'Intact'} {msk.sensory.temperature.notIntact && 'Not Intact'}</div>
            )}
            {msk.sensory.pain && (
              <div>Pain: {msk.sensory.pain.intact && 'Intact'} {msk.sensory.pain.notIntact && 'Not Intact'}</div>
            )}
            {msk.sensory.vibration && (
              <div>Vibration: {msk.sensory.vibration.intact && 'Intact'} {msk.sensory.vibration.notIntact && 'Not Intact'}</div>
            )}
            {msk.sensory.position && (
              <div>Position: {msk.sensory.position.intact && 'Intact'} {msk.sensory.position.notIntact && 'Not Intact'}</div>
            )}
          </div>
        </div>
      )}

      {/* Bulk, Tone, Power, Reflexes, Coordination */}
      {(msk.bulk || msk.tone || msk.power || msk.reflexes || msk.coordination) && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Motor Function:</div>
          <table className="w-full border border-slate-300 text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-300 px-2 py-1"></th>
                <th className="border border-slate-300 px-2 py-1">Upper Limb (R)</th>
                <th className="border border-slate-300 px-2 py-1">Upper Limb (L)</th>
                <th className="border border-slate-300 px-2 py-1">Lower Limb (R)</th>
                <th className="border border-slate-300 px-2 py-1">Lower Limb (L)</th>
              </tr>
            </thead>
            <tbody>
              {msk.bulk && (
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold">Bulk</td>
                  <td className="border border-slate-300 px-2 py-1">{msk.bulk.upperR}</td>
                  <td className="border border-slate-300 px-2 py-1">{msk.bulk.upperL}</td>
                  <td className="border border-slate-300 px-2 py-1">{msk.bulk.lowerR}</td>
                  <td className="border border-slate-300 px-2 py-1">{msk.bulk.lowerL}</td>
                </tr>
              )}
              {msk.tone && (
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold">Tone</td>
                  <td className="border border-slate-300 px-2 py-1">{msk.tone.upperR}</td>
                  <td className="border border-slate-300 px-2 py-1">{msk.tone.upperL}</td>
                  <td className="border border-slate-300 px-2 py-1">{msk.tone.lowerR}</td>
                  <td className="border border-slate-300 px-2 py-1">{msk.tone.lowerL}</td>
                </tr>
              )}
              {msk.power && (
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold">Power</td>
                  <td className="border border-slate-300 px-2 py-1">{msk.power.upperR}</td>
                  <td className="border border-slate-300 px-2 py-1">{msk.power.upperL}</td>
                  <td className="border border-slate-300 px-2 py-1">{msk.power.lowerR}</td>
                  <td className="border border-slate-300 px-2 py-1">{msk.power.lowerL}</td>
                </tr>
              )}
              {msk.reflexes && (
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold">Reflexes</td>
                  <td className="border border-slate-300 px-2 py-1">{msk.reflexes.biceps?.right || msk.reflexes.triceps?.right || msk.reflexes.supinator?.right || ''}</td>
                  <td className="border border-slate-300 px-2 py-1">{msk.reflexes.biceps?.left || msk.reflexes.triceps?.left || msk.reflexes.supinator?.left || ''}</td>
                  <td className="border border-slate-300 px-2 py-1">{msk.reflexes.knee?.right || msk.reflexes.ankle?.right || msk.reflexes.plantar?.right || ''}</td>
                  <td className="border border-slate-300 px-2 py-1">{msk.reflexes.knee?.left || msk.reflexes.ankle?.left || msk.reflexes.plantar?.left || ''}</td>
                </tr>
              )}
              {msk.coordination && (
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold">Coordination</td>
                  <td className="border border-slate-300 px-2 py-1">{msk.coordination.upperR}</td>
                  <td className="border border-slate-300 px-2 py-1">{msk.coordination.upperL}</td>
                  <td className="border border-slate-300 px-2 py-1">{msk.coordination.lowerR}</td>
                  <td className="border border-slate-300 px-2 py-1">{msk.coordination.lowerL}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Joint Examination */}
      {msk.jointExamination && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Joint Examination:</div>
          <div className="flex flex-wrap gap-2">
            {msk.jointExamination.swelling && <div>✓ Swelling</div>}
            {msk.jointExamination.tenderness && <div>✓ Tenderness</div>}
            {msk.jointExamination.deformity && <div>✓ Deformity</div>}
            {msk.jointExamination.rangeOfMotion && <div>✓ Range of Motion</div>}
            {msk.jointExamination.crepitus && <div>✓ Crepitus</div>}
            {msk.jointExamination.instability && <div>✓ Instability</div>}
          </div>
          {msk.jointExamination.details && <div className="mt-2">Details: {msk.jointExamination.details}</div>}
        </div>
      )}

      {/* Spine Examination */}
      {msk.spineExamination && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Spine Examination:</div>
          <div className="flex flex-wrap gap-2">
            {msk.spineExamination.normalCurvature && <div>✓ Normal Curvature</div>}
            {msk.spineExamination.kyphosis && <div>✓ Kyphosis</div>}
            {msk.spineExamination.lordosis && <div>✓ Lordosis</div>}
            {msk.spineExamination.scoliosis && <div>✓ Scoliosis</div>}
            {msk.spineExamination.tenderness && <div>✓ Tenderness</div>}
            {msk.spineExamination.rangeOfMotion && <div>✓ Range of Motion</div>}
          </div>
          {msk.spineExamination.details && <div className="mt-2">Details: {msk.spineExamination.details}</div>}
        </div>
      )}

      {/* Gait */}
      {msk.gait && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Gait:</div>
          <div className="flex flex-wrap gap-2">
            {msk.gait.normal && <div>✓ Normal</div>}
            {msk.gait.antalgic && <div>✓ Antalgic</div>}
            {msk.gait.trendelenburg && <div>✓ Trendelenburg</div>}
            {msk.gait.ataxic && <div>✓ Ataxic</div>}
            {msk.gait.waddling && <div>✓ Waddling</div>}
            {msk.gait.steppage && <div>✓ Steppage</div>}
          </div>
        </div>
      )}

      {/* Others */}
      {msk.others && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Others:</div>
          <div>{msk.others}</div>
        </div>
      )}
    </div>
  )
}
