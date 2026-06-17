import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import CentralNervousExamB from './Hospital_CentralNervousExamB'

export default function Hospital_IpdCentralNervousSystemB({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<Array<{
    id: string
    recordedAt: string
    data: any
  }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'cns-exam-b', limit: 200 }) as any
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
      console.log('Saving CNS exam B data:', d)
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'cns-exam-b',
        sign: '',
        data: d,
      })
      setOpen(false)
      await reload()
    }catch(e: any){ 
      console.error('Error saving CNS examination B:', e)
      alert(e?.message || e?.error || 'Failed to save CNS examination B') 
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Central Nervous System Examination (B)</div>
        <button onClick={()=>setOpen(true)} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
          Add Examination
        </button>
      </div>

      {records.length === 0 ? (
        <div className="text-slate-500">No CNS examination (B) records yet.</div>
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <CentralNervousExamBDisplay data={r.data} />
              <div className="mt-2 text-right text-xs text-slate-500">
                Recorded: {new Date(r.recordedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <CentralNervousDialogB open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function CentralNervousDialogB({
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
        <h3 className="mb-4 text-lg font-semibold">Add Central Nervous System Examination (B)</h3>

        <CentralNervousExamB
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

function CentralNervousExamBDisplay({ data }: { data: any }) {
  const exam = data || {}
  
  return (
    <div className="space-y-3 border border-slate-300 p-3 rounded-lg bg-slate-50 text-xs">
      <h5 className="font-bold text-slate-900 bg-slate-200 px-2 py-1">CENTRAL NERVOUS SYSTEM EXAMINATION (B)</h5>

      {/* Sensory Function */}
      {exam.sensoryFunction && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Sensory Function:</div>
          <div className="space-y-1">
            {Object.entries(exam.sensoryFunction).map(([key, value]: [string, any]) => {
              const labels: any = {
                fineTouch: 'Fine Touch',
                crudeTouch: 'Crude Touch',
                temperature: 'Temperature',
                position: 'Position',
                vibration: 'Vibration',
                pain: 'Pain',
              }
              if (value?.intact || value?.notIntact) {
                return (
                  <div key={key}>
                    {labels[key]}: {value.intact ? 'Intact' : ''} {value.notIntact ? 'Not Intact' : ''}
                  </div>
                )
              }
              return null
            })}
          </div>
        </div>
      )}

      {/* Motor Function */}
      {exam.motorFunction && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Motor Function:</div>
          <div className="flex flex-wrap gap-2">
            {exam.motorFunction.normal && <div>✓ Normal</div>}
            {exam.motorFunction.involuntaryMovement && <div>✓ Involuntary Movement</div>}
            {exam.motorFunction.neckStiffness && <div>✓ Neck Stiffness</div>}
            {exam.motorFunction.kerningSign && <div>✓ Kerning's Sign</div>}
            {exam.motorFunction.brudzinskiSign && <div>✓ Brudzinski's Sign</div>}
            {exam.motorFunction.straightLegRaising && <div>✓ Straight Leg Raising</div>}
            {exam.motorFunction.others && <div>Others: {exam.motorFunction.others}</div>}
          </div>
        </div>
      )}

      {/* Bulk/Tone/Power */}
      {exam.bulkTonePower && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Bulk / Tone / Power:</div>
          <div className="space-y-1">
            {exam.bulkTonePower.bulk && <div>Bulk: {exam.bulkTonePower.bulk}</div>}
            {exam.bulkTonePower.tone && <div>Tone: {exam.bulkTonePower.tone}</div>}
            {exam.bulkTonePower.power && <div>Power: {exam.bulkTonePower.power}</div>}
          </div>
        </div>
      )}

      {/* Reflexes */}
      {exam.reflexes && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Reflexes:</div>
          <div className="space-y-1">
            {Object.entries(exam.reflexes).map(([key, value]: [string, any]) => {
              const labels: any = {
                biceps: 'Biceps',
                triceps: 'Triceps',
                supinator: 'Supinator',
                abdominal: 'Abdominal',
                knee: 'Knee',
                ankle: 'Ankle',
                plantar: 'Plantar',
                babinski: 'Babinski',
                clonus: 'Clonus',
              }
              if (value?.right || value?.left) {
                return (
                  <div key={key}>
                    {labels[key]}: R: {value.right || '-'} | L: {value.left || '-'}
                  </div>
                )
              }
              return null
            })}
          </div>
        </div>
      )}

      {/* Limbs */}
      {exam.limbs && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Limbs:</div>
          <div className="space-y-1">
            {exam.limbs.upperRight && <div>Upper Limb (R): {exam.limbs.upperRight}</div>}
            {exam.limbs.upperLeft && <div>Upper Limb (L): {exam.limbs.upperLeft}</div>}
            {exam.limbs.lowerRight && <div>Lower Limb (R): {exam.limbs.lowerRight}</div>}
            {exam.limbs.lowerLeft && <div>Lower Limb (L): {exam.limbs.lowerLeft}</div>}
          </div>
        </div>
      )}
    </div>
  )
}
