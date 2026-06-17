import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import NicuEvaluationForm from './Hospital_NicuEvaluationForm'

export default function Hospital_IpdNicuEvaluation({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<Array<{
    id: string
    recordedAt: string
    data: any
  }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'nicu-evaluation', limit: 200 }) as any
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
      console.log('Saving NICU evaluation data:', d)
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'nicu-evaluation',
        sign: '',
        data: d,
      })
      setOpen(false)
      await reload()
    }catch(e: any){ 
      console.error('Error saving NICU evaluation:', e)
      alert(e?.message || e?.error || 'Failed to save NICU evaluation') 
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">NICU Evaluation</div>
        <button onClick={()=>setOpen(true)} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
          Add Evaluation
        </button>
      </div>

      {records.length === 0 ? (
        <div className="text-slate-500">No NICU evaluation records yet.</div>
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <NicuEvaluationDisplay data={r.data} />
              <div className="mt-2 text-right text-xs text-slate-500">
                Recorded: {new Date(r.recordedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <NicuEvaluationDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function NicuEvaluationDialog({
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
        <h3 className="mb-4 text-lg font-semibold">Add NICU Evaluation</h3>

        <NicuEvaluationForm
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

function NicuEvaluationDisplay({ data }: { data: any }) {
  const exam = data || {}
  
  return (
    <div className="space-y-3 border border-slate-300 p-3 rounded-lg bg-slate-50 text-xs">
      <h5 className="font-bold text-slate-900 bg-slate-200 px-2 py-1 text-center">NICU EVALUATION</h5>

      {exam.gpe && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">GPE:</div>
          <div>{exam.gpe}</div>
        </div>
      )}

      {exam.colour && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Colour:</div>
          <div>{exam.colour}</div>
        </div>
      )}

      {(exam.af || exam.afTension) && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">A/F:</div>
          <div>{exam.af} {exam.afTension && `- ${exam.afTension}`}</div>
        </div>
      )}

      {(exam.ofc || exam.weight) && (
        <div className="grid grid-cols-2 gap-2">
          {exam.ofc && (
            <div className="border border-slate-300 p-2 bg-white">
              <div className="font-semibold mb-1">OFC:</div>
              <div>{exam.ofc}</div>
            </div>
          )}
          {exam.weight && (
            <div className="border border-slate-300 p-2 bg-white">
              <div className="font-semibold mb-1">Weight:</div>
              <div>{exam.weight}</div>
            </div>
          )}
        </div>
      )}

      {(exam.eyes || exam.ear || exam.nose) && (
        <div className="grid grid-cols-3 gap-2">
          {exam.eyes && (
            <div className="border border-slate-300 p-2 bg-white">
              <div className="font-semibold mb-1">Eyes:</div>
              <div>{exam.eyes}</div>
            </div>
          )}
          {exam.ear && (
            <div className="border border-slate-300 p-2 bg-white">
              <div className="font-semibold mb-1">Ear:</div>
              <div>{exam.ear}</div>
            </div>
          )}
          {exam.nose && (
            <div className="border border-slate-300 p-2 bg-white">
              <div className="font-semibold mb-1">Nose:</div>
              <div>{exam.nose}</div>
            </div>
          )}
        </div>
      )}

      {exam.oralCavity && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Oral Cavity/Lips/Plate:</div>
          <div>{exam.oralCavity}</div>
        </div>
      )}

      {exam.chestAbdomen && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Chest and Abdomen:</div>
          <div>{exam.chestAbdomen}</div>
        </div>
      )}

      {exam.cord && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Cord:</div>
          <div>{exam.cord}</div>
        </div>
      )}

      {exam.genetalia && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Genetalia:</div>
          <div>{exam.genetalia}</div>
        </div>
      )}

      {exam.testies && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Testies:</div>
          <div>{exam.testies}</div>
        </div>
      )}

      {exam.backSpine && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Back and Spine:</div>
          <div>{exam.backSpine}</div>
        </div>
      )}

      {exam.analOpening && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Anal Opening:</div>
          <div>{exam.analOpening}</div>
        </div>
      )}

      {exam.handFoot && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Hand and Foot:</div>
          <div>{exam.handFoot}</div>
        </div>
      )}

      {exam.vitals && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Vitals:</div>
          <div className="grid grid-cols-3 gap-2">
            {exam.vitals.hr && <div>H/R: {exam.vitals.hr}</div>}
            {exam.vitals.rr && <div>R/R: {exam.vitals.rr}</div>}
            {exam.vitals.spo2 && <div>SPO2: {exam.vitals.spo2}</div>}
          </div>
        </div>
      )}

      {exam.neonatalReflexes && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Neonatal Reflexes:</div>
          <div>{exam.neonatalReflexes}</div>
        </div>
      )}

      {exam.sucking && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Sucking:</div>
          <div>{exam.sucking}</div>
        </div>
      )}

      {exam.routing && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Routing:</div>
          <div>{exam.routing}</div>
        </div>
      )}

      {exam.syestemic && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Syestemic:</div>
          <div>{exam.syestemic}</div>
        </div>
      )}

      {exam.cvs && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">CVS:</div>
          <div>{exam.cvs}</div>
        </div>
      )}

      {exam.cns && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">CNS:</div>
          <div>{exam.cns}</div>
        </div>
      )}

      {exam.resp && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">RESP:</div>
          <div>{exam.resp}</div>
        </div>
      )}

      {exam.git && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">GIT:</div>
          <div>{exam.git}</div>
        </div>
      )}

      {exam.adv && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">ADV:</div>
          <div>{exam.adv}</div>
        </div>
      )}

      {exam.others && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Others:</div>
          <div>{exam.others}</div>
        </div>
      )}
    </div>
  )
}
