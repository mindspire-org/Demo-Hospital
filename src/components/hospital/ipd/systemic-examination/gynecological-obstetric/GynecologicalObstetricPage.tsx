import { useState, useEffect } from 'react'
import { hospitalApi } from '../../../../../utils/api'
import GynecologicalObstetricForm from './GynecologicalObstetricForm'

export default function GynecologicalObstetricPage({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<Array<{
    id: string
    recordedAt: string
    data: any
  }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdSystemicExams(encounterId, { systemType: 'gynecological-obstetric', limit: 200 }) as any
      const items = (res.systemicExams || []).map((n: any) => ({
        id: String(n._id),
        recordedAt: String(n.recordedAt || n.createdAt || ''),
        data: n.gynecologicalObstetric || n.data || {},
      }))
      setRecords(items)
    }catch{}
  }

  const add = async (d: any) => {
    try{
      console.log('Saving gynecological & obstetric exam data:', d)
      await hospitalApi.createIpdSystemicExam(encounterId, {
        systemType: 'gynecological-obstetric',
        gynecologicalObstetric: d,
      })
      setOpen(false)
      await reload()
    }catch(e: any){ 
      console.error('Error saving gynecological & obstetric examination:', e)
      alert(e?.message || e?.error || 'Failed to save gynecological & obstetric examination') 
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div className="text-lg font-semibold text-slate-900">Gynecological & Obstetric Examination</div>
        <button onClick={()=>setOpen(true)} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
          Add Examination
        </button>
      </div>

      {records.length === 0 ? (
        <div className="text-slate-500">No gynecological & obstetric examination records yet.</div>
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <GynecologicalObstetricDisplay data={r.data} />
              <div className="mt-2 text-right text-xs text-slate-500">
                Recorded: {new Date(r.recordedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <GynecologicalObstetricDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function GynecologicalObstetricDialog({
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
        <h3 className="mb-4 text-lg font-semibold">Add Gynecological & Obstetric Examination</h3>

        <GynecologicalObstetricForm
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

function GynecologicalObstetricDisplay({ data }: { data: any }) {
  const exam = data || {}
  
  return (
    <div className="space-y-3 border border-slate-300 p-3 rounded-lg bg-slate-50 text-xs">
      <h5 className="font-bold text-slate-900 bg-slate-200 px-2 py-1">GYNECOLOGICAL & OBSTETRIC EXAMINATION</h5>

      {exam.menstruating && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Menstruating:</div>
          <div className="flex flex-wrap gap-2">
            {exam.menstruating.no && <div>✓ No</div>}
            {exam.menstruating.yes && <div>✓ Yes</div>}
            {exam.menstruating.ageAtMenarche && <div>Age at Menarche: {exam.menstruating.ageAtMenarche}</div>}
            {exam.menstruating.lastMenstrualPeriod && <div>Last Menstrual Period: {exam.menstruating.lastMenstrualPeriod}</div>}
          </div>
        </div>
      )}

      {exam.menstrualCycle && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Menstrual Cycle:</div>
          <div className="flex flex-wrap gap-2">
            {exam.menstrualCycle.regular && <div>✓ Regular</div>}
            {exam.menstrualCycle.irregular && <div>✓ Irregular</div>}
            {exam.menstrualCycle.duration && <div>Duration: {exam.menstrualCycle.duration} days</div>}
            {exam.menstrualCycle.contraceptiveNo && <div>Contraceptive: No</div>}
            {exam.menstrualCycle.contraceptiveYes && <div>Contraceptive: Yes</div>}
            {exam.menstrualCycle.contraceptiveType && <div>Type: {exam.menstrualCycle.contraceptiveType}</div>}
          </div>
        </div>
      )}

      {exam.menstrualLoss && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Menstrual Loss:</div>
          <div className="flex flex-wrap gap-2">
            {exam.menstrualLoss.scanty && <div>✓ Scanty</div>}
            {exam.menstrualLoss.moderate && <div>✓ Moderate</div>}
            {exam.menstrualLoss.excessive && <div>✓ Excessive</div>}
            {exam.menstrualLoss.padsUsed && <div>Pads Used/Day: {exam.menstrualLoss.padsUsed}</div>}
            {exam.menstrualLoss.papSmearFindings && <div>PAP Smear: {exam.menstrualLoss.papSmearFindings}</div>}
          </div>
        </div>
      )}

      {(exam.dysmenorrhea || exam.dyspareunia) && (
        <div className="grid grid-cols-2 gap-2">
          {exam.dysmenorrhea && (
            <div className="border border-slate-300 p-2 bg-white">
              <div className="font-semibold mb-1">Dysmenorrhea:</div>
              <div className="flex flex-wrap gap-2">
                {exam.dysmenorrhea.beforeOnset && <div>✓ Before Onset</div>}
                {exam.dysmenorrhea.zeroToTwoDays && <div>✓ 0-2 Days of Menses</div>}
                {exam.dysmenorrhea.afterMenses && <div>✓ After Menses</div>}
              </div>
            </div>
          )}
          {exam.dyspareunia && (
            <div className="border border-slate-300 p-2 bg-white">
              <div className="font-semibold mb-1">Dyspareunia:</div>
              <div className="flex flex-wrap gap-2">
                {exam.dyspareunia.superficial && <div>✓ Superficial</div>}
                {exam.dyspareunia.deep && <div>✓ Deep</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {exam.gpa && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">G P A:</div>
          <div className="flex flex-wrap gap-2">
            {exam.gpa.gravida && <div>G: {exam.gpa.gravida}</div>}
            {exam.gpa.para && <div>P: {exam.gpa.para}</div>}
            {exam.gpa.abortions && <div>A: {exam.gpa.abortions}</div>}
            {exam.gpa.lastBornChild && <div>Last born: {exam.gpa.lastBornChild}</div>}
            {exam.gpa.livingChildren && <div>Living children: {exam.gpa.livingChildren}</div>}
            {exam.gpa.complications && <div>Complications: {exam.gpa.complications}</div>}
          </div>
        </div>
      )}

      {exam.menopause && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Menopause:</div>
          <div className="flex flex-wrap gap-2">
            {exam.menopause.no && <div>✓ No</div>}
            {exam.menopause.yes && <div>✓ Yes</div>}
            {exam.menopause.age && <div>Age: {exam.menopause.age}</div>}
          </div>
        </div>
      )}

      {exam.skin && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Skin:</div>
          <div className="flex flex-wrap gap-2">
            {exam.skin.rash && <div>✓ Rash</div>}
            {exam.skin.scar && <div>✓ Scar</div>}
            {exam.skin.diaphoretic && <div>✓ Diaphoretic</div>}
            {exam.skin.petechiae && <div>✓ Petechiae</div>}
            {exam.skin.ecchymosed && <div>✓ Ecchymosed</div>}
            {exam.skin.bruises && <div>✓ Bruises</div>}
            {exam.skin.pressureSores && <div>✓ Pressure Sores</div>}
            {exam.skin.incisionsDrains && <div>✓ Incisions/Drains</div>}
            {exam.skin.others && <div>Others: {exam.skin.others}</div>}
          </div>
        </div>
      )}

      {exam.skinColor && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Skin Color:</div>
          <div className="flex flex-wrap gap-2">
            {exam.skinColor.normal && <div>✓ Normal</div>}
            {exam.skinColor.pale && <div>✓ Pale</div>}
            {exam.skinColor.flushed && <div>✓ Flushed</div>}
            {exam.skinColor.cyanotic && <div>✓ Cyanotic</div>}
            {exam.skinColor.jaundiced && <div>✓ Jaundiced</div>}
            {exam.skinColor.mottled && <div>✓ Mottled</div>}
            {exam.skinColor.other && <div>Other: {exam.skinColor.other}</div>}
          </div>
        </div>
      )}

      {exam.skinTurgor && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Skin Turgor:</div>
          <div className="flex flex-wrap gap-2">
            {exam.skinTurgor.adequate && <div>✓ Adequate</div>}
            {exam.skinTurgor.poor && <div>✓ Poor</div>}
            {exam.skinTurgor.good && <div>✓ Good</div>}
            {exam.skinTurgor.moist && <div>✓ Moist</div>}
            {exam.skinTurgor.taut && <div>✓ Taut</div>}
            {exam.skinTurgor.other && <div>Other: {exam.skinTurgor.other}</div>}
          </div>
        </div>
      )}

      {exam.hairScalp && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Hair / Scalp:</div>
          <div className="flex flex-wrap gap-2">
            {exam.hairScalp.clean && <div>✓ Clean</div>}
            {exam.hairScalp.lice && <div>✓ Lice</div>}
            {exam.hairScalp.flakes && <div>✓ Flakes</div>}
            {exam.hairScalp.wound && <div>✓ Wound</div>}
            {exam.hairScalp.lesion && <div>✓ Lesion</div>}
            {exam.hairScalp.ulcers && <div>✓ Ulcers</div>}
            {exam.hairScalp.other && <div>Other: {exam.hairScalp.other}</div>}
          </div>
        </div>
      )}

      {exam.others && (<div className="border border-slate-300 p-2 bg-white"><div className="font-semibold mb-1">Others:</div><div>{exam.others}</div></div>)}
    </div>
  )
}
