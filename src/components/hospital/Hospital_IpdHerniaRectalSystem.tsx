import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import HerniaRectalExam from './Hospital_HerniaRectalExam'

export default function Hospital_IpdHerniaRectalSystem({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<Array<{
    id: string
    recordedAt: string
    data: any
  }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'hernia-rectal-exam', limit: 200 }) as any
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
      console.log('Saving hernia & rectal exam data:', d)
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'hernia-rectal-exam',
        sign: '',
        data: d,
      })
      setOpen(false)
      await reload()
    }catch(e: any){ 
      console.error('Error saving hernia & rectal examination:', e)
      alert(e?.message || e?.error || 'Failed to save hernia & rectal examination') 
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Hernia & Rectal Examination</div>
        <button onClick={()=>setOpen(true)} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
          Add Examination
        </button>
      </div>

      {records.length === 0 ? (
        <div className="text-slate-500">No hernia & rectal examination records yet.</div>
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <HerniaRectalExamDisplay data={r.data} />
              <div className="mt-2 text-right text-xs text-slate-500">
                Recorded: {new Date(r.recordedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <HerniaRectalDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function HerniaRectalDialog({
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
        <h3 className="mb-4 text-lg font-semibold">Add Hernia & Rectal Examination</h3>

        <HerniaRectalExam
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

function HerniaRectalExamDisplay({ data }: { data: any }) {
  const exam = data || {}
  
  return (
    <div className="space-y-3 border border-slate-300 p-3 rounded-lg bg-slate-50 text-xs">
      <h5 className="font-bold text-slate-900 bg-slate-200 px-2 py-1">HERNIA & RECTAL EXAMINATION</h5>

      {/* Hernia Section */}
      {exam.hernia && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Hernia:</div>
          
          {exam.hernia.inguinal && (
            <div className="mb-2">
              <div className="font-semibold">Inguinal:</div>
              <div className="flex flex-wrap gap-2">
                {exam.hernia.inguinal.type?.direct && <div>✓ Direct</div>}
                {exam.hernia.inguinal.type?.indirect && <div>✓ Indirect</div>}
                {exam.hernia.inguinal.location?.bilateral && <div>• Bilateral</div>}
                {exam.hernia.inguinal.location?.unilateral && <div>• Unilateral</div>}
                {exam.hernia.inguinal.location?.l && <div>• L</div>}
                {exam.hernia.inguinal.location?.r && <div>• R</div>}
                {exam.hernia.inguinal.reducibility?.reducible && <div>• Reducible</div>}
                {exam.hernia.inguinal.reducibility?.irreducible && <div>• Irreducible</div>}
                {exam.hernia.inguinal.reducibility?.strangulated && <div>• Strangulated</div>}
                {exam.hernia.inguinal.coughImpulse?.positive && <div>• Cough Impulse +ve</div>}
                {exam.hernia.inguinal.coughImpulse?.negative && <div>• Cough Impulse -ve</div>}
                {exam.hernia.inguinal.other && <div>• Other: {exam.hernia.inguinal.other}</div>}
              </div>
            </div>
          )}

          {exam.hernia.femoral?.present && (
            <div className="mb-2">
              <div className="font-semibold">Femoral:</div>
              <div className="flex flex-wrap gap-2">
                {exam.hernia.femoral.location?.bilateral && <div>• Bilateral</div>}
                {exam.hernia.femoral.location?.unilateral && <div>• Unilateral</div>}
                {exam.hernia.femoral.location?.l && <div>• L</div>}
                {exam.hernia.femoral.location?.r && <div>• R</div>}
                {exam.hernia.femoral.reducibility?.reducible && <div>• Reducible</div>}
                {exam.hernia.femoral.reducibility?.irreducible && <div>• Irreducible</div>}
                {exam.hernia.femoral.reducibility?.strangulated && <div>• Strangulated</div>}
                {exam.hernia.femoral.coughImpulse?.positive && <div>• Cough Impulse +ve</div>}
                {exam.hernia.femoral.coughImpulse?.negative && <div>• Cough Impulse -ve</div>}
                {exam.hernia.femoral.other && <div>• Other: {exam.hernia.femoral.other}</div>}
              </div>
            </div>
          )}

          {exam.hernia.umbilical?.present && (
            <div className="mb-2">
              <div className="font-semibold">Umbilical:</div>
              <div className="flex flex-wrap gap-2">
                {exam.hernia.umbilical.location?.bilateral && <div>• Bilateral</div>}
                {exam.hernia.umbilical.location?.unilateral && <div>• Unilateral</div>}
                {exam.hernia.umbilical.location?.l && <div>• L</div>}
                {exam.hernia.umbilical.location?.r && <div>• R</div>}
                {exam.hernia.umbilical.reducibility?.reducible && <div>• Reducible</div>}
                {exam.hernia.umbilical.reducibility?.irreducible && <div>• Irreducible</div>}
                {exam.hernia.umbilical.reducibility?.strangulated && <div>• Strangulated</div>}
                {exam.hernia.umbilical.coughImpulse?.positive && <div>• Cough Impulse +ve</div>}
                {exam.hernia.umbilical.coughImpulse?.negative && <div>• Cough Impulse -ve</div>}
                {exam.hernia.umbilical.other && <div>• Other: {exam.hernia.umbilical.other}</div>}
              </div>
            </div>
          )}

          {exam.hernia.surgical?.present && (
            <div className="mb-2">
              <div className="font-semibold">Surgical:</div>
              <div className="flex flex-wrap gap-2">
                {exam.hernia.surgical.location?.bilateral && <div>• Bilateral</div>}
                {exam.hernia.surgical.location?.unilateral && <div>• Unilateral</div>}
                {exam.hernia.surgical.location?.l && <div>• L</div>}
                {exam.hernia.surgical.location?.r && <div>• R</div>}
                {exam.hernia.surgical.reducibility?.reducible && <div>• Reducible</div>}
                {exam.hernia.surgical.reducibility?.irreducible && <div>• Irreducible</div>}
                {exam.hernia.surgical.reducibility?.strangulated && <div>• Strangulated</div>}
                {exam.hernia.surgical.coughImpulse?.positive && <div>• Cough Impulse +ve</div>}
                {exam.hernia.surgical.coughImpulse?.negative && <div>• Cough Impulse -ve</div>}
                {exam.hernia.surgical.other && <div>• Other: {exam.hernia.surgical.other}</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rectal Section */}
      {exam.rectal && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Rectal:</div>
          <div className="flex flex-wrap gap-2">
            {exam.rectal.fissures && <div>✓ Fissures</div>}
            {exam.rectal.hemorrhoids && <div>✓ Hemorrhoids</div>}
            {exam.rectal.prolapse && <div>✓ Prolapse</div>}
            {exam.rectal.perinalAbscess && <div>✓ Perianal Abscess</div>}
            {exam.rectal.abnormalMasses && <div>✓ Abnormal Masses</div>}
            {exam.rectal.analWarts && <div>✓ Anal Warts</div>}
            {exam.rectal.analTags && <div>✓ Anal Tags</div>}
            {exam.rectal.others && <div>Others: {exam.rectal.others}</div>}
          </div>
          
          {exam.rectal.digitalExam && (
            <div className="mt-2">
              <div className="font-semibold">Digital Rectal Examination:</div>
              <div>
                {exam.rectal.digitalExam.performed && <div>✓ Performed</div>}
                {exam.rectal.digitalExam.notPerformed && <div>✓ Not Performed</div>}
                {exam.rectal.digitalExam.findings && <div className="mt-1">Findings: {exam.rectal.digitalExam.findings}</div>}
              </div>
            </div>
          )}
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
