import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import NewBornBabyNotes from './Hospital_NewBornBabyNotes'

export default function Hospital_IpdNewBornBabyNotes({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<Array<{
    id: string
    recordedAt: string
    data: any
  }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'newborn-baby-notes', limit: 200 }) as any
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
      console.log('Saving newborn baby notes data:', d)
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'newborn-baby-notes',
        sign: '',
        data: d,
      })
      setOpen(false)
      await reload()
    }catch(e: any){ 
      console.error('Error saving newborn baby notes:', e)
      alert(e?.message || e?.error || 'Failed to save newborn baby notes') 
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">New Born Baby Notes</div>
        <button onClick={()=>setOpen(true)} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
          Add Notes
        </button>
      </div>

      {records.length === 0 ? (
        <div className="text-slate-500">No newborn baby notes records yet.</div>
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <NewBornBabyNotesDisplay data={r.data} />
              <div className="mt-2 text-right text-xs text-slate-500">
                Recorded: {new Date(r.recordedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <NewBornBabyNotesDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function NewBornBabyNotesDialog({
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
        <h3 className="mb-4 text-lg font-semibold">Add New Born Baby Notes</h3>

        <NewBornBabyNotes
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

function NewBornBabyNotesDisplay({ data }: { data: any }) {
  const exam = data || {}
  
  return (
    <div className="space-y-3 border border-slate-300 p-3 rounded-lg bg-slate-50 text-xs">
      <h5 className="font-bold text-slate-900 bg-slate-200 px-2 py-1 text-center">NEW BORN BABY NOTES</h5>

      {(exam.date || exam.time) && (
        <div className="grid grid-cols-2 gap-2">
          {exam.date && (
            <div className="border border-slate-300 p-2 bg-white">
              <div className="font-semibold mb-1">Date:</div>
              <div>{exam.date}</div>
            </div>
          )}
          {exam.time && (
            <div className="border border-slate-300 p-2 bg-white">
              <div className="font-semibold mb-1">Time:</div>
              <div>{exam.time}</div>
            </div>
          )}
        </div>
      )}

      <div className="border border-slate-300 p-2 bg-white">
        <div className="font-semibold mb-2">Patient's Particulars:</div>
        {exam.patientName && <div>Name: {exam.patientName}</div>}
        {exam.patientAge && <div>Age: {exam.patientAge}</div>}
        {exam.patientAddress && <div>Address: {exam.patientAddress}</div>}
        {exam.gynaecologist && <div>Gynaecologist: {exam.gynaecologist}</div>}
        {exam.anaesthetist && <div>Anaesthetist: {exam.anaesthetist}</div>}
        {exam.otSister && <div>OT Sister: {exam.otSister}</div>}
        {exam.aya && <div>Aya: {exam.aya}</div>}
        {exam.diagnosis && <div>Diagnosis: {exam.diagnosis}</div>}
        {exam.operation && <div>Operation: {exam.operation}</div>}
        {exam.anaesthesia && <div>Anaesthesia: {exam.anaesthesia}</div>}
        {exam.babySex && <div>Baby's Sex: {exam.babySex}</div>}
        {exam.congenitalAbnormality && <div>Congenital Abnormality: {exam.congenitalAbnormality}</div>}
      </div>

      {(exam.apgarScore1Min || exam.apgarScore5Min) && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">APGAR Scores:</div>
          <div className="grid grid-cols-2 gap-2">
            {exam.apgarScore1Min && <div>1 Minute: {exam.apgarScore1Min}</div>}
            {exam.apgarScore5Min && <div>5 Minutes: {exam.apgarScore5Min}</div>}
          </div>
        </div>
      )}

      {exam.remarks && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Remarks:</div>
          <div>{exam.remarks}</div>
        </div>
      )}

      {exam.footPrintNotes && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Foot Print Notes:</div>
          <div>{exam.footPrintNotes}</div>
        </div>
      )}
    </div>
  )
}
