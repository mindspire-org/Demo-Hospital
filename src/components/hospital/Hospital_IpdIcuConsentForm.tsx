import React, { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import ConfirmDialog from '../ui/ConfirmDialog'
import { printIcuConsentForm } from '../../utils/printConsentForm'

const ICU_CONSENT_NOTE_PREFIX = '[ICU_CONSENT_FORM]:'

type IcuConsentRecord = {
  id: string
  recordedAt: string
  patientName: string
  mrn: string
  age: string
  gender: string
  address: string
  bedLabel: string
  doctorName: string
  cnic: string
  contact: string
  guardianName: string
  relation: string
  witnessName: string
  date: string
  time: string
}

const inp = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-shadow focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:bg-slate-900 dark:border-slate-700 dark:text-white'
const lbl = 'mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400'

export default function Hospital_IpdIcuConsentForm({ encounterId }: { encounterId: string }){
  const [encounter, setEncounter] = useState<any | null>(null)
  const [records, setRecords] = useState<IcuConsentRecord[]>([])
  const [open, setOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<IcuConsentRecord | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(()=>{ if(encounterId){ void reload() } }, [encounterId])

  const getEncounterSnapshot = async () => {
    try {
      const res = await hospitalApi.getIPDAdmissionById(encounterId) as any
      const enc = res?.encounter || null
      setEncounter(enc)
      return enc
    } catch {
      setEncounter(null)
      return null
    }
  }

  async function reload(){
    try{
      const enc = await getEncounterSnapshot()
      const patient = enc?.patientId || {}
      const doctorName = enc?.doctorId?.name || ''
      const res = await hospitalApi.listIpdNotes(encounterId, { limit: 200, noteType: 'nursing' } as any) as any
      const items = (res.notes || [])
        .filter((n: any) => n.note?.startsWith(ICU_CONSENT_NOTE_PREFIX))
        .map((n: any) => {
          try {
            const data = JSON.parse(n.note.substring(ICU_CONSENT_NOTE_PREFIX.length))
            return {
              id: String(n._id),
              recordedAt: String(n.createdAt || ''),
              patientName: data.patientName || patient?.fullName || '',
              mrn: data.mrn || patient?.mrn || '',
              age: data.age || patient?.age || '',
              gender: data.gender || patient?.gender || '',
              address: data.address || patient?.address || '',
              bedLabel: data.bedLabel || enc?.bedLabel || enc?.bedId || '',
              doctorName: data.doctorName || doctorName || '',
              cnic: data.cnic || patient?.cnicNormalized || '',
              contact: data.contact || patient?.phoneNormalized || '',
              guardianName: data.guardianName || patient?.fatherName || patient?.fullName || '',
              relation: data.relation || data.guardianRel || '',
              witnessName: data.witnessName || '',
              date: data.date || '',
              time: data.time || '',
            } satisfies IcuConsentRecord
          } catch {
            return null
          }
        })
        .filter(Boolean) as IcuConsentRecord[]
      setRecords(items)
    } catch {}
  }

  const buildPayload = (d: Partial<IcuConsentRecord>) => {
    const enc = encounter
    const patient = enc?.patientId || {}
    return {
      patientName: d.patientName || String(patient?.fullName || ''),
      mrn: d.mrn || String(patient?.mrn || ''),
      age: d.age || String(patient?.age || ''),
      gender: d.gender || String(patient?.gender || ''),
      address: d.address || String(patient?.address || ''),
      bedLabel: d.bedLabel || String(enc?.bedLabel || enc?.bedId || ''),
      doctorName: d.doctorName || String(enc?.doctorId?.name || ''),
      cnic: d.cnic || String(patient?.cnicNormalized || ''),
      contact: d.contact || String(patient?.phoneNormalized || ''),
      guardianName: d.guardianName || String(patient?.fatherName || patient?.fullName || ''),
      relation: d.relation || String(patient?.guardianRel || ''),
      witnessName: d.witnessName || '',
      date: d.date || '',
      time: d.time || '',
    }
  }

  const add = async (d: Partial<IcuConsentRecord>) => {
    try{
      const payload = buildPayload(d)
      await hospitalApi.createIpdNote(encounterId, {
        noteType: 'nursing',
        text: ICU_CONSENT_NOTE_PREFIX + JSON.stringify(payload),
      })
      setOpen(false)
      await reload()
    } catch(e: any){ alert(e?.message || 'Failed to add ICU consent') }
  }

  const update = async (d: Partial<IcuConsentRecord>) => {
    if (!editRecord) return
    try{
      const payload = buildPayload(d)
      await hospitalApi.updateIpdNote(encounterId, editRecord.id, {
        text: ICU_CONSENT_NOTE_PREFIX + JSON.stringify(payload),
      })
      setEditRecord(null)
      await reload()
    } catch(e: any){ alert(e?.message || 'Failed to update ICU consent') }
  }

  const deleteRecord = async () => {
    if (!confirmDeleteId) return
    try{
      await hospitalApi.deleteIpdNote(encounterId, confirmDeleteId)
      setConfirmDeleteId(null)
      await reload()
    } catch(e: any){ alert(e?.message || 'Failed to delete ICU consent') }
  }

  const printRecord = (id: string) => {
    const r = records.find(rec => rec.id === id)
    if (!r) return
    void printIcuConsentForm(r)
  }

  const defaults: Record<string, string> = encounter ? {
    patientName: String((encounter as any)?.patientId?.fullName || ''),
    mrn: String((encounter as any)?.patientId?.mrn || ''),
    age: String((encounter as any)?.patientId?.age || ''),
    gender: String((encounter as any)?.patientId?.gender || ''),
    address: String((encounter as any)?.patientId?.address || ''),
    bedLabel: String((encounter as any)?.bedLabel || (encounter as any)?.bedId || ''),
    doctorName: String((encounter as any)?.doctorId?.name || ''),
    cnic: String((encounter as any)?.patientId?.cnicNormalized || ''),
    contact: String((encounter as any)?.patientId?.phoneNormalized || ''),
    guardianName: String((encounter as any)?.patientId?.fatherName || (encounter as any)?.patientId?.fullName || ''),
    relation: String((encounter as any)?.patientId?.guardianRel || ''),
  } : {}

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-bold text-white">ICU</span>
          <span className="text-base font-bold text-slate-900">ICU Line / Vent Consent</span>
        </div>
        <button onClick={()=>setOpen(true)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]">+ Add Form</button>
      </div>

      {records.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">No ICU consent forms yet.</div>
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <div key={r.id} className="rounded-xl border border-slate-200 p-4 transition-shadow hover:shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-800">{r.patientName || '-'}</span>
                  {r.mrn ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">MRN: {r.mrn}</span> : null}
                  {r.bedLabel ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">Bed: {r.bedLabel}</span> : null}
                  {r.doctorName ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">Dr: {r.doctorName}</span> : null}
                </div>
                <div className="flex gap-2">
                  <button type="button" className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => setEditRecord(r)}>Edit</button>
                  <button type="button" className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50" onClick={() => setConfirmDeleteId(r.id)}>Delete</button>
                  <button type="button" className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800" onClick={() => printRecord(r.id)}>Print</button>
                </div>
              </div>
              <div className="mt-2 text-right text-xs text-slate-400">Recorded: {new Date(r.recordedAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      <IcuConsentDialog
        open={open}
        onClose={()=>setOpen(false)}
        onSave={add}
        defaults={defaults}
      />

      <IcuConsentDialog
        open={!!editRecord}
        onClose={()=>setEditRecord(null)}
        onSave={update}
        defaults={editRecord || defaults}
        title="Edit ICU Consent"
      />

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete ICU Consent"
        message="Are you sure you want to delete this ICU consent form? This action cannot be undone."
        confirmText="Delete"
        onCancel={()=>setConfirmDeleteId(null)}
        onConfirm={deleteRecord}
      />
    </div>
  )
}

function IcuConsentDialog({ open, onClose, onSave, defaults, title = 'Add ICU Consent' }: {
  open: boolean
  onClose: () => void
  onSave: (d: any) => void
  defaults: Record<string, any>
  title?: string
}){
  const [d, setD] = useState<any>({})
  useEffect(()=>{
    if (open) setD({ ...defaults })
  }, [open])

  if (!open) return null

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(d)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="text-sm font-bold text-slate-900">{title}</div>
        </div>
        <form onSubmit={save} className="p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className={lbl}>Patient Name</label>
              <input value={d.patientName || ''} onChange={e=>setD((p: any)=>({ ...p, patientName: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className={lbl}>MRN</label>
              <input value={d.mrn || ''} onChange={e=>setD((p: any)=>({ ...p, mrn: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className={lbl}>Age</label>
              <input value={d.age || ''} onChange={e=>setD((p: any)=>({ ...p, age: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className={lbl}>Gender</label>
              <input value={d.gender || ''} onChange={e=>setD((p: any)=>({ ...p, gender: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className={lbl}>Bed</label>
              <input value={d.bedLabel || ''} onChange={e=>setD((p: any)=>({ ...p, bedLabel: e.target.value }))} className={inp} />
            </div>
            <div className="md:col-span-2">
              <label className={lbl}>Doctor</label>
              <input value={d.doctorName || ''} onChange={e=>setD((p: any)=>({ ...p, doctorName: e.target.value }))} className={inp} />
            </div>
            <div className="md:col-span-3">
              <label className={lbl}>Address</label>
              <input value={d.address || ''} onChange={e=>setD((p: any)=>({ ...p, address: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className={lbl}>CNIC</label>
              <input value={d.cnic || ''} onChange={e=>setD((p: any)=>({ ...p, cnic: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className={lbl}>Contact</label>
              <input value={d.contact || ''} onChange={e=>setD((p: any)=>({ ...p, contact: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className={lbl}>Guardian Name</label>
              <input value={d.guardianName || ''} onChange={e=>setD((p: any)=>({ ...p, guardianName: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className={lbl}>Relation</label>
              <input value={d.relation || ''} onChange={e=>setD((p: any)=>({ ...p, relation: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className={lbl}>Witness</label>
              <input value={d.witnessName || ''} onChange={e=>setD((p: any)=>({ ...p, witnessName: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className={lbl}>Date</label>
              <input value={d.date || ''} onChange={e=>setD((p: any)=>({ ...p, date: e.target.value }))} className={inp} placeholder="YYYY-MM-DD" />
            </div>
            <div>
              <label className={lbl}>Time</label>
              <input value={d.time || ''} onChange={e=>setD((p: any)=>({ ...p, time: e.target.value }))} className={inp} placeholder="HH:MM" />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}
