import React, { useEffect, useState } from 'react'
import { hospitalApi } from '../../../../utils/api'
import Toast, { type ToastState } from '../../../ui/Toast'
import ConfirmDialog from '../../../ui/ConfirmDialog'
import SuggestField from '../../../SuggestField'

export default function DoctorVisits({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; doctor: string; when: string; done?: boolean }>>([])
  const [open, setOpen] = useState(false)
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<any>(null)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdDoctorVisits(encounterId, { limit: 200, category: 'visit' }) as any
      const docName = '-'
      const items = (res.visits || []).map((v: any)=>({ id: String(v._id), doctor: (v?.doctorId?.name || docName), when: String(v.when || v.createdAt || ''), done: !!v.done }))
      setRows(items)
    }catch{}
  }

  useEffect(()=>{ (async()=>{ try { const res = await hospitalApi.listDoctors() as any; const items = (res?.doctors || res || []) as Array<{ _id: string; name: string }>; setDoctors(items) } catch { setDoctors([]) } })() }, [])

  async function save(d: { doctorId: string; date: string; time: string }){
    try{
      const dt = `${d.date}T${d.time}`
      await hospitalApi.createIpdDoctorVisit(encounterId, { doctorId: d.doctorId, when: dt, category: 'visit' })
      setOpen(false); await reload()
      setToast({ type: 'success', message: 'Doctor visit added' })
    }catch(e: any){ setToast({ type: 'error', message: e?.message || 'Failed to add doctor visit' }) }
  }

  async function updateVisit(d: { doctorId: string; date: string; time: string }){
    if (!editingId) return
    try{
      const dt = `${d.date}T${d.time}`
      await hospitalApi.updateIpdDoctorVisit(editingId, { doctorId: d.doctorId, when: dt })
      setEditingId(null); setEditingData(null); setOpen(false); await reload()
      setToast({ type: 'success', message: 'Doctor visit updated' })
    }catch(e: any){ setToast({ type: 'error', message: e?.message || 'Failed to update doctor visit' }) }
  }

  const startEdit = (r: any) => { setEditingId(r.id); setEditingData(r); setOpen(true) }

  async function markDone(id: string){
    try {
      await hospitalApi.updateIpdDoctorVisit(id, { done: true })
      try { window.dispatchEvent(new CustomEvent('doctor:notifications-updated')) } catch {}
      await reload()
      setToast({ type: 'success', message: 'Marked as done' })
    } catch (e: any){ setToast({ type: 'error', message: e?.message || 'Failed to mark done' }) }
  }

  async function removeVisit(id: string){
    setConfirmDeleteId(String(id))
  }

  async function confirmDelete(){
    const id = confirmDeleteId
    setConfirmDeleteId('')
    if (!id) return
    try {
      await hospitalApi.deleteIpdDoctorVisit(id)
      try { window.dispatchEvent(new CustomEvent('doctor:notifications-updated')) } catch {}
      await reload()
      setToast({ type: 'success', message: 'Deleted' })
    } catch (e: any){ setToast({ type: 'error', message: e?.message || 'Failed to delete' }) }
  }

  return (
    <>
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between print:hidden">
        <div className="text-lg font-semibold text-slate-900">Doctor Visits</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Doctor Visit</button>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No visits yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-2 font-medium">Doctor</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {rows.map(v => {
                const dt = new Date(v.when)
                return (
                  <tr key={v.id}>
                    <td className="px-4 py-2">{v.doctor}</td>
                    <td className="px-4 py-2">{dt.toLocaleDateString()}</td>
                    <td className="px-4 py-2">{dt.toLocaleTimeString()}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        {!v.done && (
                          <button onClick={()=>markDone(v.id)} className="btn-outline-navy text-xs">Mark as done</button>
                        )}
                        <button onClick={() => startEdit(v)} className="rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                        <button onClick={()=>removeVisit(v.id)} className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700">Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <VisitDialog key={editingId || 'add'} open={open} onClose={()=>{ setOpen(false); setEditingId(null); setEditingData(null) }} onSave={editingId ? updateVisit : save} doctors={doctors} initial={editingData} />
    </div>
    <ConfirmDialog
      open={!!confirmDeleteId}
      title="Confirm"
      message="Delete this doctor visit?"
      confirmText="Delete"
      onCancel={()=>setConfirmDeleteId('')}
      onConfirm={confirmDelete}
    />
    <Toast toast={toast} onClose={()=>setToast(null)} />
    </>
  )
}

function VisitDialog({ open, onClose, onSave, doctors, initial }: { open: boolean; onClose: ()=>void; onSave: (d: { doctorId: string; date: string; time: string })=>void; doctors: Array<{ _id: string; name: string }>; initial?: any }){
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState<{ _id: string; name: string } | null>(null)

  useEffect(() => {
    if (open) {
      if (initial) {
        const dt = new Date(initial.when)
        setDate(dt.toISOString().split('T')[0])
        setTime(dt.toTimeString().slice(0, 5))
        const found = doctors.find(d => d.name === initial.doctor)
        setSelectedDoctor(found || null)
      } else {
        const now = new Date()
        setDate(now.toISOString().split('T')[0])
        setTime(now.toTimeString().slice(0, 5))
        setSelectedDoctor(null)
      }
    }
  }, [open, initial, doctors])

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSave({ doctorId: String(selectedDoctor?._id||''), date: String(date||''), time: String(time||'00:00') })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">{initial ? 'Edit Doctor Visit' : 'Add Doctor Visit'}</div>
        <div className="space-y-3 px-5 py-4 text-sm">
          <label htmlFor="visit-doctor" className="block text-xs font-medium text-slate-600">Doctor</label>
          <SuggestField
            as="input"
            value={selectedDoctor?.name || ''}
            onChange={(v) => {
              const found = doctors.find(d => d.name.toLowerCase() === v.toLowerCase())
              setSelectedDoctor(found || null)
            }}
            suggestions={doctors.map(d => d.name)}
            placeholder="Select doctor"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
          <input type="hidden" name="doctorId" value={selectedDoctor?._id || ''} />
          <label htmlFor="visit-date" className="block text-xs font-medium text-slate-600">Date</label>
          <input id="visit-date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full rounded-md border border-slate-300 px-3 py-2" />
          <label htmlFor="visit-time" className="block text-xs font-medium text-slate-600">Time</label>
          <input id="visit-time" name="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required className="w-full rounded-md border border-slate-300 px-3 py-2" />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn">Save</button>
        </div>
      </form>
    </div>
  )
}
