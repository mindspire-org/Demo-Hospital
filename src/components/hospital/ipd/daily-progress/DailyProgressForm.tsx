import React, { useEffect, useState, useRef } from 'react'
import { hospitalApi } from '../../../../utils/api'
import Toast, { type ToastState } from '../../../ui/Toast'
import ConfirmDialog from '../../../common/ConfirmDialog'

type ProgressRow = {
  _id: string
  when: string
  doctorName?: string
  subjective?: string
  objective?: string
  assessment?: string
  plan?: string
}

export default function DailyProgressSheet({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<ProgressRow[]>([])
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<ProgressRow | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdDailyProgress(encounterId, { limit: 200 }) as any
      const items = (res?.consultations || []).map((v: any)=>({
        _id: String(v._id),
        when: String(v.noteDate || v.createdAt || new Date().toISOString()),
        doctorName: v?.doctorName || v?.doctorId?.name,
        subjective: v.subjective,
        objective: v.objective,
        assessment: v.assessment,
        plan: v.plan,
      })) as ProgressRow[]
      const filtered = items.filter(r => {
        const s = (r.subjective||'').trim()
        const o = (r.objective||'').trim()
        const a = (r.assessment||'').trim()
        const p = (r.plan||'').trim()
        return !!(s || o || a || p)
      })
      filtered.sort((a,b)=> new Date(b.when).getTime() - new Date(a.when).getTime())
      setRows(filtered)
    }catch{}
  }

  async function handleCreate(d: { doctorId?: string; date?: string; time?: string; subjective?: string; objective?: string; assessment?: string; plan?: string }){
    try{
      const hasAny = [d.subjective, d.objective, d.assessment, d.plan].some(x => (x||'').trim().length>0)
      if (!hasAny){ setToast({ type: 'error', message: 'Please enter at least one of Subjective, Objective, Assessment, or Plan' }); return }
      const noteDate = d.date && d.time ? `${d.date}T${d.time}` : new Date().toISOString()
      await hospitalApi.createIpdDailyProgress(encounterId, {
        doctorId: d.doctorId,
        noteDate,
        subjective: d.subjective,
        objective: d.objective,
        assessment: d.assessment,
        plan: d.plan,
      })
      await reload(); setOpen(false)
      setToast({ type: 'success', message: 'Progress entry saved to consultations' })
    }catch(e: any){ setToast({ type: 'error', message: e?.message || 'Failed to create progress entry' }) }
  }

  async function handleUpdate(d: { doctorId?: string; date?: string; time?: string; subjective?: string; objective?: string; assessment?: string; plan?: string }){
    if (!editingId) return
    try{
      const noteDate = d.date && d.time ? `${d.date}T${d.time}` : new Date().toISOString()
      await hospitalApi.updateIpdDailyProgress(editingId, {
        noteDate,
        subjective: d.subjective,
        objective: d.objective,
        assessment: d.assessment,
        plan: d.plan,
      })
      setEditingId(null); setEditingData(null); await reload(); setOpen(false)
      setToast({ type: 'success', message: 'Progress entry updated' })
    }catch(e: any){ setToast({ type: 'error', message: e?.message || 'Failed to update progress entry' }) }
  }

  const remove = (id: string) => { setDeleteId(id); setDeleteConfirmOpen(true) }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try { await hospitalApi.deleteIpdDailyProgress(deleteId); await reload() } catch (e: any) { setToast({ type: 'error', message: e?.message || 'Failed to delete' }) }
    setDeleteId(null)
  }

  const startEdit = (r: ProgressRow) => { setEditingId(r._id); setEditingData(r); setOpen(true) }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 print:hidden">
        <div className="text-lg font-semibold text-slate-900">Daily Progress Sheet</div>
        <button className="btn" onClick={()=>setOpen(true)}>Add Progress</button>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-6 text-slate-500">No progress entries yet.</div>
      ) : (
        <div className="overflow-x-auto p-4">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Subjective</th>
                <th className="px-3 py-2 font-medium">Objective</th>
                <th className="px-3 py-2 font-medium">Assessment</th>
                <th className="px-3 py-2 font-medium">Plan</th>
                <th className="px-3 py-2 font-medium">Doctor Name</th>
                <th className="px-3 py-2 font-medium print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map(r => {
                const d = new Date(r.when)
                const date = d.toISOString().slice(0,10)
                const time = d.toTimeString().slice(0,5)
                return (
                  <tr key={r._id}>
                    <td className="px-3 py-2 text-xs text-slate-600">{date}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{time}</td>
                    <td className="px-3 py-2 whitespace-pre-wrap">{r.subjective || '-'}</td>
                    <td className="px-3 py-2 whitespace-pre-wrap">{r.objective || '-'}</td>
                    <td className="px-3 py-2 whitespace-pre-wrap">{r.assessment || '-'}</td>
                    <td className="px-3 py-2 whitespace-pre-wrap">{r.plan || '-'}</td>
                    <td className="px-3 py-2">{r.doctorName || '-'}</td>
                    <td className="px-3 py-2 print:hidden">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(r)} className="rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                        <button onClick={() => remove(r._id)} className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <DailyProgressDialog key={editingId || 'add'} open={open} onClose={()=>{ setOpen(false); setEditingId(null); setEditingData(null) }} onSave={editingId ? handleUpdate : handleCreate} initial={editingData} />
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Progress Entry"
        message="Are you sure you want to delete this progress entry?"
        onConfirm={() => { handleDeleteConfirm(); setDeleteConfirmOpen(false) }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null) }}
      />
      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
}

function DailyProgressDialog({ open, onClose, onSave, initial }: { open: boolean; onClose: ()=>void; onSave: (d: { doctorId?: string; date?: string; time?: string; subjective?: string; objective?: string; assessment?: string; plan?: string })=>void; initial?: ProgressRow | null }){
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([])
  const [doctorSearch, setDoctorSearch] = useState('')
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const filteredDoctors = doctors.filter(d => d.name.toLowerCase().includes(doctorSearch.toLowerCase()))

  useEffect(() => {
    if (open && initial?.doctorName) {
      setSelectedDoctor(initial.doctorName)
      setDoctorSearch(initial.doctorName)
    } else if (open) {
      setSelectedDoctor('')
      setDoctorSearch('')
    }
  }, [open, initial])

  useEffect(()=>{ if(open){ (async()=>{ try { const res = await hospitalApi.listDoctors() as any; const items = (res?.doctors || res || []) as Array<{ _id: string; name: string }>; setDoctors(items) } catch { setDoctors([]) } })() } }, [open])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDoctorDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if(!open) return null

  const now = new Date()
  const defaultDate = initial?.when ? new Date(initial.when).toISOString().split('T')[0] : now.toISOString().split('T')[0]
  const defaultTime = initial?.when ? new Date(initial.when).toTimeString().slice(0,5) : now.toTimeString().slice(0,5)
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const selectedDoctorId = doctors.find(d => d.name === selectedDoctor)?._id || ''
    onSave({
      doctorId: selectedDoctorId,
      date: String(fd.get('date')||''),
      time: String(fd.get('time')||''),
      subjective: String(fd.get('subjective')||''),
      objective: String(fd.get('objective')||''),
      assessment: String(fd.get('assessment')||''),
      plan: String(fd.get('plan')||''),
    })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">{initial ? 'Edit Daily Progress' : 'Add Daily Progress'}</div>
        <div className="px-5 py-4 text-sm">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label htmlFor="prog-date" className="block text-xs font-medium text-slate-600">Date</label>
              <input id="prog-date" name="date" type="date" defaultValue={defaultDate} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="prog-time" className="block text-xs font-medium text-slate-600">Time</label>
              <input id="prog-time" name="time" type="time" defaultValue={defaultTime} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="prog-doctor" className="block text-xs font-medium text-slate-600">Doctor</label>
              <div className="relative" ref={dropdownRef}>
                <input
                  type="text"
                  value={selectedDoctor || doctorSearch}
                  onChange={(e) => { setDoctorSearch(e.target.value); setShowDoctorDropdown(true); setSelectedDoctor(''); }}
                  onFocus={() => setShowDoctorDropdown(true)}
                  placeholder="Search doctor..."
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
                {showDoctorDropdown && filteredDoctors.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border border-slate-300 bg-white shadow-lg">
                    {filteredDoctors.map(d => (
                      <div
                        key={d._id}
                        onClick={() => { setSelectedDoctor(d.name); setDoctorSearch(d.name); setShowDoctorDropdown(false); }}
                        className="cursor-pointer px-3 py-2 hover:bg-slate-100"
                      >
                        {d.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <div>
              <label htmlFor="prog-subj" className="block text-xs font-medium text-slate-600">Subjective</label>
              <textarea id="prog-subj" name="subjective" rows={3} defaultValue={initial?.subjective || ''} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="prog-obj" className="block text-xs font-medium text-slate-600">Objective</label>
              <textarea id="prog-obj" name="objective" rows={3} defaultValue={initial?.objective || ''} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="prog-asm" className="block text-xs font-medium text-slate-600">Assessment</label>
              <textarea id="prog-asm" name="assessment" rows={3} defaultValue={initial?.assessment || ''} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="prog-plan" className="block text-xs font-medium text-slate-600">Plan</label>
              <textarea id="prog-plan" name="plan" rows={3} defaultValue={initial?.plan || ''} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn">Save</button>
        </div>
      </form>
    </div>
  )
}
