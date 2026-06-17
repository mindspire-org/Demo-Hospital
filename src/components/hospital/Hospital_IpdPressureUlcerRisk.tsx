import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import PressureUlcerRiskAssessment from './Hospital_PressureUlcerRiskAssessment'

export default function Hospital_IpdPressureUlcerRisk({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<Array<{
    id: string
    recordedAt: string
    data: any
  }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'pressure-ulcer-risk', limit: 200 }) as any
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
      console.log('Saving pressure ulcer risk assessment data:', d)
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'pressure-ulcer-risk',
        sign: '',
        data: d,
      })
      setOpen(false)
      await reload()
    }catch(e: any){ 
      console.error('Error saving pressure ulcer risk assessment:', e)
      alert(e?.message || e?.error || 'Failed to save pressure ulcer risk assessment') 
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-4 flex items-center justify-between">
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
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Add Pressure Ulcer Risk Assessment</h3>

        <PressureUlcerRiskAssessment
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
  const assessments = exam.assessments || []
  
  return (
    <div className="space-y-3 border border-slate-300 p-3 rounded-lg bg-slate-50 text-xs">
      <h5 className="font-bold text-slate-900 bg-slate-200 px-2 py-1 text-center">PRESSURE ULCER RISK ASSESSMENT</h5>

      {assessments.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border border-slate-300 text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-300 px-2 py-1 text-left">Category</th>
                {assessments.map((a: any, i: number) => (
                  <th key={i} className="border border-slate-300 px-2 py-1">{a.date || `Assessment ${i+1}`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">Sensory Perception</td>
                {assessments.map((a: any, i: number) => (
                  <td key={i} className="border border-slate-300 px-2 py-1">{a.sensoryPerception || '-'}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">Moisture</td>
                {assessments.map((a: any, i: number) => (
                  <td key={i} className="border border-slate-300 px-2 py-1">{a.moisture || '-'}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">Activity</td>
                {assessments.map((a: any, i: number) => (
                  <td key={i} className="border border-slate-300 px-2 py-1">{a.activity || '-'}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">Mobility</td>
                {assessments.map((a: any, i: number) => (
                  <td key={i} className="border border-slate-300 px-2 py-1">{a.mobility || '-'}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">Nutrition</td>
                {assessments.map((a: any, i: number) => (
                  <td key={i} className="border border-slate-300 px-2 py-1">{a.nutrition || '-'}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">Friction & Shearing</td>
                {assessments.map((a: any, i: number) => (
                  <td key={i} className="border border-slate-300 px-2 py-1">{a.frictionShearing || '-'}</td>
                ))}
              </tr>
              <tr className="bg-slate-100">
                <td className="border border-slate-300 px-2 py-1 font-semibold">Total Score</td>
                {assessments.map((a: any, i: number) => (
                  <td key={i} className="border border-slate-300 px-2 py-1 font-semibold">{a.totalScore || '-'}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">Nurse Name Sign & ID</td>
                {assessments.map((a: any, i: number) => (
                  <td key={i} className="border border-slate-300 px-2 py-1">{a.nurseNameSignId || '-'}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {exam.riskFactor && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Risk Factor:</div>
          <div className="flex flex-wrap gap-2">
            {exam.riskFactor.highRisk && <div>✓ High Risk (H)</div>}
            {exam.riskFactor.moderate && <div>✓ Moderate (12-14)</div>}
            {exam.riskFactor.mild && <div>✓ Mild (15-18)</div>}
            {exam.riskFactor.notAtRisk && <div>✓ Not at Risk (&gt;18)</div>}
          </div>
        </div>
      )}

      {exam.affectedSites && exam.affectedSites.length > 0 && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Affected Sites with Pressure Ulcer:</div>
          <div className="flex flex-wrap gap-2">
            {exam.affectedSites.map((site: string) => (
              <div key={site}>✓ {site.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</div>
            ))}
          </div>
        </div>
      )}

      {exam.completionDateTime && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Completion Date/Time:</div>
          <div>{exam.completionDateTime}</div>
        </div>
      )}

      {exam.counterCheckedBy && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Counter Checked By:</div>
          <div className="flex flex-wrap gap-2">
            {exam.counterCheckedBy.headNurse && <div>✓ Head Nurse</div>}
            {exam.counterCheckedBy.chargeNurse && <div>✓ Charge Nurse</div>}
          </div>
        </div>
      )}

      {(exam.nurseName || exam.nurseSignId || exam.nameSignId) && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Nurse Information:</div>
          {exam.nurseName && <div>Name: {exam.nurseName}</div>}
          {exam.nurseSignId && <div>Sign & ID: {exam.nurseSignId}</div>}
          {exam.nameSignId && <div>Name Sign & ID: {exam.nameSignId}</div>}
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
