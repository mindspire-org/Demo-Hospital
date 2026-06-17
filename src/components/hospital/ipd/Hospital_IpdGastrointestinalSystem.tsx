import { useEffect, useState } from 'react'
import { hospitalApi } from '../../../utils/api'
import GastrointestinalExam from './Hospital_GastrointestinalExam'

export default function Hospital_IpdGastrointestinalSystem({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<Array<{
    id: string
    recordedAt: string
    data: any
  }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'gastrointestinal-exam', limit: 200 }) as any
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
      console.log('Saving gastrointestinal exam data:', d)
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'gastrointestinal-exam',
        sign: '',
        data: d,
      })
      setOpen(false)
      await reload()
    }catch(e: any){ 
      console.error('Error saving gastrointestinal examination:', e)
      alert(e?.message || e?.error || 'Failed to save gastrointestinal examination') 
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Gastrointestinal System Examination</div>
        <button onClick={()=>setOpen(true)} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
          Add Examination
        </button>
      </div>

      {records.length === 0 ? (
        <div className="text-slate-500">No gastrointestinal examination records yet.</div>
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <GastrointestinalExamDisplay data={r.data} />
              <div className="mt-2 text-right text-xs text-slate-500">
                Recorded: {new Date(r.recordedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <GastrointestinalDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function GastrointestinalDialog({
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
        <h3 className="mb-4 text-lg font-semibold">Add Gastrointestinal System Examination</h3>

        <GastrointestinalExam
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

function GastrointestinalExamDisplay({ data }: { data: any }) {
  const gi = data || {}
  
  return (
    <div className="space-y-3 border border-slate-300 p-3 rounded-lg bg-slate-50 text-xs">
      <h5 className="font-bold text-slate-900 bg-slate-200 px-2 py-1">GASTROINTESTINAL SYSTEM</h5>

      {gi.alternativeRoute && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Alternative Route:</div>
          <div className="flex flex-wrap gap-2">
            {gi.alternativeRoute.gastrostomy && <div>✓ Gastrostomy</div>}
            {gi.alternativeRoute.jejunostomy && <div>✓ Jejunostomy</div>}
            {gi.alternativeRoute.nasoGastric && <div>✓ Naso-Gastric</div>}
            {gi.alternativeRoute.urogastric && <div>✓ Urogastric</div>}
            {gi.alternativeRoute.ivh && <div>✓ IVH</div>}
            {gi.alternativeRoute.other && <div>Other: {gi.alternativeRoute.other}</div>}
          </div>
        </div>
      )}

      <div className="border border-slate-300 p-2 bg-white">
        <div className="font-semibold mb-1">Symptoms:</div>
        <div className="flex flex-wrap gap-2">
          {gi.heartBurnEpigastricPain && <div>✓ Heart Burn / Epigastric Pain</div>}
          {gi.abdPain && <div>✓ Abd. Pain</div>}
          {gi.nausea && <div>✓ Nausea</div>}
          {gi.vomiting && <div>✓ Vomiting</div>}
          {gi.chronicConstipation && <div>✓ Chronic Constipation</div>}
          {gi.diarrhoea && <div>✓ Diarrhoea</div>}
          {gi.dyspepsia && <div>✓ Dyspepsia</div>}
          {gi.dysphagia && <div>✓ Dysphagia</div>}
        </div>
      </div>

      {gi.bowelContent && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Bowel Content:</div>
          <div className="flex flex-wrap gap-2">
            {gi.bowelContent.formed && <div>✓ Formed</div>}
            {gi.bowelContent.watery && <div>✓ Watery</div>}
            {gi.bowelContent.hard && <div>✓ Hard</div>}
            {gi.bowelContent.mucus && <div>✓ Mucus</div>}
            {gi.bowelContent.blood && <div>✓ Blood</div>}
          </div>
        </div>
      )}

      {gi.bowelFrequency && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Bowel Frequency:</div>
          <div>{gi.bowelFrequency}</div>
        </div>
      )}

      {gi.inspection && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Inspection:</div>
          <div className="flex flex-wrap gap-2">
            {gi.inspection.normal && <div>✓ Normal</div>}
            {gi.inspection.distorted && <div>✓ Distorted</div>}
            {gi.inspection.scaphoid && <div>✓ Scaphoid</div>}
            {gi.inspection.sunken && <div>✓ Sunken</div>}
            {gi.inspection.synus && <div>✓ Synus</div>}
            {gi.inspection.pigmentation && <div>✓ Pigmentation</div>}
            {gi.inspection.dilatedVeins && <div>✓ Dilated Veins</div>}
            {gi.inspection.other && <div>✓ Other</div>}
          </div>
        </div>
      )}

      {gi.palpation && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Palpation:</div>
          <div className="flex flex-wrap gap-2">
            {gi.palpation.soft && <div>✓ Soft</div>}
            {gi.palpation.rigid && <div>✓ Rigid</div>}
            {gi.palpation.tender && <div>✓ Tender</div>}
            {gi.palpation.reboundTenderness && <div>✓ Rebound Tenderness</div>}
            {gi.palpation.palpableMasses && <div>✓ Palpable Masses</div>}
            {gi.palpation.organomegaly && <div>✓ Organomegaly</div>}
            {gi.palpation.fluidThrill && <div>✓ Fluid Thrill</div>}
          </div>
        </div>
      )}

      {gi.percussion && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Percussion:</div>
          <div className="flex flex-wrap gap-2">
            {gi.percussion.tympanic && <div>✓ Tympanic</div>}
            {gi.percussion.shiftingDullness && <div>✓ Shifting Dullness</div>}
            {gi.percussion.absent && <div>✓ Absent</div>}
          </div>
        </div>
      )}

      {gi.auscultation && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Auscultation:</div>
          <div className="flex flex-wrap gap-2">
            {gi.auscultation.bowelSounds && <div>✓ Bowel Sounds</div>}
            {gi.auscultation.normoactive && <div>✓ Normoactive</div>}
            {gi.auscultation.hyperPeristalsis && <div>✓ Hyper Peristalsis</div>}
            {gi.auscultation.hypoPeristalsis && <div>✓ Hypo Peristalsis</div>}
            {gi.auscultation.liverBruit && <div>✓ Liver Bruit</div>}
            {gi.auscultation.renalBruit && <div>✓ Renal Bruit</div>}
          </div>
        </div>
      )}

      {gi.others && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Others:</div>
          <div>{gi.others}</div>
        </div>
      )}
    </div>
  )
}
