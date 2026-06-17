import React, { useEffect, useState, useRef } from 'react'
import { ipdApi, hospitalApi } from '../../utils/api'

export default function ConsultantNotes({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; when: string; text: string; doctorName?: string }>>([])
  const [open, setOpen] = useState(false)
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([])

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  useEffect(()=>{ (async()=>{ try { const res = await hospitalApi.listDoctors() as any; const items = (res?.doctors || res || []) as Array<{ _id: string; name: string }>; setDoctors(items) } catch { setDoctors([]) } })() }, [])

  async function reload(){
    try{
      const res = await ipdApi.listIpdEmrClinicalNotes(encounterId, { noteType: 'progress-note', limit: 200 }) as any
      const items = (res.clinicalNotes || []).map((n: any)=>({
        id: String(n._id),
        when: String(n.noteDate || n.createdAt || ''),
        text: String(n.content || ''),
        doctorName: n.authorName || '',
      }))
      setRows(items)
    }catch{}
  }

  const add = async (d: { when?: string; text?: string; doctorName?: string }) => {
    try{
      const when = d.when || new Date().toISOString()
      await ipdApi.createIpdEmrClinicalNote(encounterId, {
        noteType: 'progress-note',
        noteDate: when,
        content: d.text || '',
        authorName: d.doctorName,
        authorRole: 'doctor',
        status: 'final',
      })
      setOpen(false)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to add consultant note') }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">CONSULTANT / MO / WMO - NOTES</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Note</button>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No notes yet.</div>
      ) : (
        <ul className="space-y-2 text-sm text-slate-800">
          {rows.map(r => (
            <li key={r.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="whitespace-pre-wrap">{r.text || '-'}</div>
                <div className="text-right text-xs text-slate-600">
                  <div>{new Date(r.when).toLocaleString()}</div>
                  {r.doctorName ? <div>Dr: {r.doctorName}</div> : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConsultantDialog open={open} onClose={()=>setOpen(false)} onSave={add} doctors={doctors} />
    </div>
  )
}

function ConsultantDialog({ open, onClose, onSave, doctors }: { open: boolean; onClose: ()=>void; onSave: (d: { when?: string; text?: string; doctorName?: string })=>void; doctors: Array<{ _id: string; name: string }> }){
  if(!open) return null
  const now = new Date()
  const defaultDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
  const [doctorSearch, setDoctorSearch] = useState('')
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const filteredDoctors = doctors.filter(d => d.name.toLowerCase().includes(doctorSearch.toLowerCase()))

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
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Note</div>
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
              <textarea id="cn-text" name="text" className="h-40 w-full rounded-md border border-slate-300 px-3 py-2"></textarea>
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
