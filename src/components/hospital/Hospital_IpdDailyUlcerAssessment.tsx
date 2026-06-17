import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import DailyUlcerAssessment from './Hospital_DailyUlcerAssessment'
import Dialysis_UrduConsentForm from '../dialysis/Dialysis_UrduConsentForm'

export default function Hospital_IpdDailyUlcerAssessment({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<Array<{
    id: string
    recordedAt: string
    data: any
  }>>([])
  const [open, setOpen] = useState(false)
  const [dialysisFormOpen, setDialysisFormOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'daily-ulcer-assessment', limit: 200 }) as any
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
      console.log('Saving daily ulcer assessment data:', d)
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'daily-ulcer-assessment',
        sign: '',
        data: d,
      })
      setOpen(false)
      await reload()
    }catch(e: any){ 
      console.error('Error saving daily ulcer assessment:', e)
      alert(e?.message || e?.error || 'Failed to save daily ulcer assessment') 
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Daily Ulcer Assessment</div>
        <div className="flex gap-2">
          <button onClick={()=>setDialysisFormOpen(true)} className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
            ڈائیلاسز فارم
          </button>
          <button onClick={()=>setOpen(true)} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
            Add Assessment
          </button>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="text-slate-500">No daily ulcer assessment records yet.</div>
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <DailyUlcerAssessmentDisplay data={r.data} />
              <div className="mt-2 text-right text-xs text-slate-500">
                Recorded: {new Date(r.recordedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <DailyUlcerAssessmentDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
      
      <Dialysis_UrduConsentForm
        open={dialysisFormOpen}
        onClose={() => setDialysisFormOpen(false)}
        patientName=""
        patientMRN=""
      />
    </div>
  )
}

function DailyUlcerAssessmentDialog({
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
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Add Daily Ulcer Assessment</h3>

        <DailyUlcerAssessment
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

function DailyUlcerAssessmentDisplay({ data }: { data: any }) {
  const exam = data || {}
  const assessments = exam.assessments || []
  
  return (
    <div className="space-y-3 border border-slate-300 p-3 rounded-lg bg-slate-50 text-xs">
      <h5 className="font-bold text-slate-900 bg-slate-200 px-2 py-1 text-center">DAILY ULCER ASSESSMENT</h5>

      {assessments.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border border-slate-300 text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-300 px-2 py-1 text-left">Description</th>
                {assessments.map((a: any, i: number) => (
                  <th key={i} className="border border-slate-300 px-2 py-1">{a.date || `Day ${i+1}`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">Size (L x W)</td>
                {assessments.map((a: any, i: number) => (
                  <td key={i} className="border border-slate-300 px-2 py-1">{a.size || '-'}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">Depth</td>
                {assessments.map((a: any, i: number) => (
                  <td key={i} className="border border-slate-300 px-2 py-1">{a.depth || '-'}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">Edge</td>
                {assessments.map((a: any, i: number) => (
                  <td key={i} className="border border-slate-300 px-2 py-1">
                    {a.edge?.clearVisible && '✓ Clear '}
                    {a.edge?.attachedToWoundBase && '✓ Attached '}
                    {a.edge?.fibroticScarred && '✓ Fibrotic'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">Undermining</td>
                {assessments.map((a: any, i: number) => (
                  <td key={i} className="border border-slate-300 px-2 py-1">{a.undermining || '-'}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">Necrotic Tissue</td>
                {assessments.map((a: any, i: number) => (
                  <td key={i} className="border border-slate-300 px-2 py-1">{a.necroticTissue || '-'}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">Slough</td>
                {assessments.map((a: any, i: number) => (
                  <td key={i} className="border border-slate-300 px-2 py-1">{a.slough || '-'}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">Eschar</td>
                {assessments.map((a: any, i: number) => (
                  <td key={i} className="border border-slate-300 px-2 py-1">{a.eschar || '-'}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">Exudate</td>
                {assessments.map((a: any, i: number) => (
                  <td key={i} className="border border-slate-300 px-2 py-1">
                    {a.exudate?.serous && '✓ Serous '}
                    {a.exudate?.serosanguinous && '✓ Serosang. '}
                    {a.exudate?.purulent && '✓ Purulent'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">Granulation</td>
                {assessments.map((a: any, i: number) => (
                  <td key={i} className="border border-slate-300 px-2 py-1">
                    {a.granulation?.healthy && '✓ Healthy '}
                    {a.granulation?.septic && '✓ Septic'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">Epithelialization</td>
                {assessments.map((a: any, i: number) => (
                  <td key={i} className="border border-slate-300 px-2 py-1">{a.epithelialization || '-'}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">Surrounding Skin</td>
                {assessments.map((a: any, i: number) => (
                  <td key={i} className="border border-slate-300 px-2 py-1">
                    {a.surroundingSkin?.brightRed && '✓ Red '}
                    {a.surroundingSkin?.blanchable && '✓ Blanch '}
                    {a.surroundingSkin?.edematous && '✓ Edema '}
                    {a.surroundingSkin?.indurated && '✓ Indur.'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">Stage</td>
                {assessments.map((a: any, i: number) => (
                  <td key={i} className="border border-slate-300 px-2 py-1">{a.stageOfPressureUlcer || '-'}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">Nurse Sign & ID</td>
                {assessments.map((a: any, i: number) => (
                  <td key={i} className="border border-slate-300 px-2 py-1">{a.nurseSignatureId || '-'}</td>
                ))}
              </tr>
            </tbody>
          </table>
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
