import React, { useEffect, useState, useRef } from 'react'
import { ipdApi, hospitalApi } from '../../../../utils/api'
import ConfirmDialog from '../../../common/ConfirmDialog'

export default function ConsultantNotes({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; when: string; text: string; doctorName?: string }>>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<{ when?: string; text?: string; doctorName?: string } | null>(null)
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([])
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  useEffect(()=>{ (async()=>{ try { const res = await hospitalApi.listDoctors() as any; const items = (res?.doctors || res || []) as Array<{ _id: string; name: string }>; setDoctors(items) } catch { setDoctors([]) } })() }, [])

  async function reload(){
    try{
      const res = await ipdApi.listIpdEmrClinicalNotes(encounterId, { noteType: 'consultant-note', limit: 200 }) as any
      const items = (res.clinicalNotes || []).map((n: any)=>({
        id: String(n._id),
        when: String(n.noteDate || n.createdAt || ''),
        text: String(n.content || ''),
        doctorName: n.consultantName || n.authorName || '',
      }))
      setRows(items)
    }catch{}
  }

  const add = async (d: { when?: string; text?: string; doctorName?: string }) => {
    try{
      const when = d.when || new Date().toISOString()
      await ipdApi.createIpdEmrClinicalNote(encounterId, {
        type: 'consultant-note',
        noteType: 'consultant-note',
        noteDate: when,
        content: d.text || '',
        consultantName: d.doctorName,
        authorName: d.doctorName,
        authorRole: 'doctor',
        status: 'final',
      } as any)
      setOpen(false)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to add consultant note') }
  }

  const update = async (d: { when?: string; text?: string; doctorName?: string }) => {
    if (!editingId) return
    try{
      const when = d.when || new Date().toISOString()
      await ipdApi.updateIpdEmrClinicalNote(editingId, {
        noteDate: when,
        content: d.text || '',
        consultantName: d.doctorName,
        authorName: d.doctorName,
      })
      setEditingId(null); setEditingData(null)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to update consultant note') }
  }

  const remove = async (id: string) => {
    setDeleteId(id)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try{
      await ipdApi.deleteIpdEmrClinicalNote(deleteId)
      setDeleteId(null)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to delete note') }
  }

  const startEdit = (r: { id: string; when: string; text: string; doctorName?: string }) => {
    setEditingId(r.id)
    setEditingData({ when: r.when, text: r.text, doctorName: r.doctorName })
    setOpen(true)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-2 flex items-center justify-between print:hidden">
        <div className="text-lg font-semibold text-slate-900">CONSULTANT / MO / WMO - NOTES</div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setOpen(true)} className="btn">Add Note</button>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No notes yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-800">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Date/Time</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3 text-right print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3">{new Date(r.when).toLocaleString()}</td>
                  <td className="whitespace-nowrap px-4 py-3">{r.doctorName || '-'}</td>
                  <td className="px-4 py-3 whitespace-pre-wrap">{r.text || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right print:hidden">
                    <button onClick={() => startEdit(r)} className="rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                    <button onClick={() => remove(r.id)} className="ml-2 rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConsultantDialog key={editingId || 'add'} open={open} onClose={()=>{ setOpen(false); setEditingId(null); setEditingData(null) }} onSave={editingId ? update : add} doctors={doctors} initial={editingData} />
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Note"
        message="Are you sure you want to delete this note?"
        onConfirm={() => { handleDeleteConfirm(); setDeleteConfirmOpen(false) }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null) }}
      />
    </div>
  )
}

function ConsultantDialog({ open, onClose, onSave, doctors, initial }: { open: boolean; onClose: ()=>void; onSave: (d: { when?: string; text?: string; doctorName?: string })=>void; doctors: Array<{ _id: string; name: string }>; initial?: { when?: string; text?: string; doctorName?: string } | null }){
  if(!open) return null
  const now = new Date()
  const defaultDateTime = initial?.when ? new Date(new Date(initial.when).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
  const [doctorSearch, setDoctorSearch] = useState(initial?.doctorName || '')
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState(initial?.doctorName || '')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const filteredDoctors = doctors.filter(d => d.name.toLowerCase().includes(doctorSearch.toLowerCase()))

  useEffect(() => {
    if (open) {
      setDoctorSearch(initial?.doctorName || '')
      setSelectedDoctor(initial?.doctorName || '')
    }
  }, [open, initial])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDoctorDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSave({
      when: String(fd.get('when')||''),
      text: String(fd.get('text')||''),
      doctorName: selectedDoctor,
    })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">{initial ? 'Edit Note' : 'Add Note'}</div>
        <div className="px-5 py-4 text-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="cn-when" className="block text-xs font-medium text-slate-600">Date/Time</label>
              <input id="cn-when" name="when" type="datetime-local" defaultValue={defaultDateTime} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="cn-doctor" className="block text-xs font-medium text-slate-600">Doctor Name</label>
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
            <div className="sm:col-span-2">
              <label htmlFor="cn-text" className="block text-xs font-medium text-slate-600">Notes</label>
              <textarea id="cn-text" name="text" defaultValue={initial?.text || ''} className="h-40 w-full rounded-md border border-slate-300 px-3 py-2"></textarea>
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
