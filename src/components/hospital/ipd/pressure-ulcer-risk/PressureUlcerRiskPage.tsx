import { useEffect, useState } from 'react'
import { hospitalApi } from '../../../../utils/api'
import PressureUlcerRiskForm from './PressureUlcerRiskForm'

export default function PressureUlcerRiskPage({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<Array<{
    id: string
    recordedAt: string
    data: any
  }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdPressureUlcerRisks(encounterId, { limit: 200 }) as any
      const items = (res.pressureUlcerRisks || []).map((n: any) => ({
        id: String(n._id),
        recordedAt: String(n.recordedAt || n.createdAt || ''),
        data: n,
      }))
      setRecords(items)
    }catch{}
  }

  const add = async (d: any) => {
    try{
      console.log('Saving pressure ulcer risk data:', d)
      await hospitalApi.createIpdPressureUlcerRisk(encounterId, d)
      setOpen(false)
      await reload()
    }catch(e: any){ 
      console.error('Error saving pressure ulcer risk:', e)
      alert(e?.message || e?.error || 'Failed to save pressure ulcer risk') 
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div className="text-lg font-semibold text-slate-900">Pressure Ulcer Risk Assessment</div>
        <button onClick={()=>setOpen(true)} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
          Add Assessment
        </button>
      </div>

      {records.length === 0 ? (
        <div className="text-slate-500">No pressure ulcer risk assessment records yet.</div>
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <PressureUlcerRiskDisplay data={r.data} />
              <div className="mt-2 text-right text-xs text-slate-500">
                Recorded: {new Date(r.recordedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <PressureUlcerRiskDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function PressureUlcerRiskDialog({
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
        <h3 className="mb-4 text-lg font-semibold">Add Pressure Ulcer Risk Assessment</h3>

        <PressureUlcerRiskForm
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

function PressureUlcerRiskDisplay({ data }: { data: any }) {
  const exam = data || {}
  const totalScore = (exam.sensoryPerception || 0) + (exam.moisture || 0) + (exam.activity || 0) + (exam.mobility || 0) + (exam.nutrition || 0) + (exam.frictionShear || 0)
  const riskLevel = totalScore <= 14 ? 'High Risk' : totalScore <= 18 ? 'Moderate Risk' : 'Low Risk'
  
  return (
    <div className="space-y-3 border border-slate-300 p-3 rounded-lg bg-slate-50 text-xs">
      <h5 className="font-bold text-slate-900 bg-slate-200 px-2 py-1">PRESSURE ULCER RISK ASSESSMENT</h5>

      <div className="overflow-x-auto">
        <table className="w-full border border-slate-300 text-xs">
          <thead className="bg-slate-100">
            <tr>
              <th className="border border-slate-300 px-2 py-1 text-left">Assessment Item</th>
              <th className="border border-slate-300 px-2 py-1">Score</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-300 px-2 py-1 font-semibold">Sensory Perception</td>
              <td className="border border-slate-300 px-2 py-1">{exam.sensoryPerception || '-'}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1 font-semibold">Moisture</td>
              <td className="border border-slate-300 px-2 py-1">{exam.moisture || '-'}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1 font-semibold">Activity</td>
              <td className="border border-slate-300 px-2 py-1">{exam.activity || '-'}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1 font-semibold">Mobility</td>
              <td className="border border-slate-300 px-2 py-1">{exam.mobility || '-'}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1 font-semibold">Nutrition</td>
              <td className="border border-slate-300 px-2 py-1">{exam.nutrition || '-'}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1 font-semibold">Friction & Shear</td>
              <td className="border border-slate-300 px-2 py-1">{exam.frictionShear || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border border-slate-300 p-2 bg-white">
        <div className="font-semibold mb-1">Total Score: {totalScore}</div>
        <div className="font-semibold">Risk Level: {riskLevel}</div>
      </div>

      {exam.notes && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Notes / Recommendations:</div>
          <div>{exam.notes}</div>
        </div>
      )}

      {exam.others && (<div className="border border-slate-300 p-2 bg-white"><div className="font-semibold mb-1">Others:</div><div>{exam.others}</div></div>)}
    </div>
  )
}
