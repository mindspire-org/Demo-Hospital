import React, { useEffect, useState, useRef } from 'react'
import { ipdApi, hospitalApi } from '../../../../utils/api'
import ConfirmDialog from '../../../common/ConfirmDialog'

export default function Hospital_IpdAnesPostRecovery({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; when: string; bp?: string; pulse?: string; rr?: string; spo2?: string; pain?: string; temp?: string; aldreteScore?: string; vomiting?: string; shivering?: string; siteBleedingHematoma?: string; doctorName?: string }>>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<any>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([])

  useEffect(()=>{ (async()=>{ try { const res = await hospitalApi.listDoctors() as any; const items = (res?.doctors || res || []) as Array<{ _id: string; name: string }>; setDoctors(items) } catch { setDoctors([]) } })() }, [])

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await ipdApi.listIpdAnesPostOps(encounterId, { status: 'post-recovery', limit: 200 }) as any
      const items = (res.anesPostOps || []).map((n: any)=>({
        id: String(n._id),
        when: String(n.postRecovery?.shiftTime || n.createdAt || ''),
        bp: n.postRecovery?.bp || '',
        pulse: n.postRecovery?.pulse || '',
        rr: n.postRecovery?.rr || '',
        spo2: n.postRecovery?.spo2 || '',
        pain: n.postRecovery?.pain || '',
        temp: n.postRecovery?.temp || '',
        aldreteScore: n.postRecovery?.aldreteScore || '',
        vomiting: n.postRecovery?.vomiting || '',
        shivering: n.postRecovery?.shivering || '',
        siteBleedingHematoma: n.postRecovery?.siteBleedingHematoma || '',
        doctorName: n.anesthesiologistName || '',
      }))
      setRows(items)
    }catch{}
  }

  const add = async (d: { when?: string; bp?: string; pulse?: string; rr?: string; spo2?: string; pain?: string; temp?: string; aldreteScore?: string; vomiting?: string; shivering?: string; siteBleedingHematoma?: string; doctorName?: string }) => {
    try{
      await ipdApi.createIpdAnesPostOp(encounterId, {
        postRecovery: {
          shiftTime: d.when || new Date().toISOString(),
          bp: d.bp,
          pulse: d.pulse,
          rr: d.rr,
          spo2: d.spo2,
          pain: d.pain,
          temp: d.temp,
          aldreteScore: d.aldreteScore,
          vomiting: d.vomiting,
          shivering: d.shivering,
          siteBleedingHematoma: d.siteBleedingHematoma,
        },
        anesthesiologistName: d.doctorName,
        status: 'post-recovery',
      })
      setOpen(false); await reload()
    }catch(e: any){ alert(e?.message || 'Failed to save post-recovery note') }
  }

  const update = async (d: any) => {
    if (!editingId) return
    try{
      await ipdApi.updateIpdAnesPostOp(editingId, {
        postRecovery: { shiftTime: d.when || new Date().toISOString(), bp: d.bp, pulse: d.pulse, rr: d.rr, spo2: d.spo2, pain: d.pain, temp: d.temp, aldreteScore: d.aldreteScore, vomiting: d.vomiting, shivering: d.shivering, siteBleedingHematoma: d.siteBleedingHematoma },
        anesthesiologistName: d.doctorName,
      })
      setEditingId(null); setEditingData(null); await reload()
    }catch(e: any){ alert(e?.message || 'Failed to update post-recovery note') }
  }

  const remove = async (id: string) => {
    setDeleteId(id)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try { await ipdApi.deleteIpdAnesPostOp(deleteId); await reload() } catch (e: any) { alert(e?.message || 'Failed to delete') }
    setDeleteId(null)
  }

  const startEdit = (r: any) => { setEditingId(r.id); setEditingData(r); setOpen(true); }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-2 flex items-center justify-between print:hidden">
        <div className="text-lg font-semibold text-slate-900">Post Anesthesia Notes (at Shifting from Recovery Room)</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Post-Recovery Note</button>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No post-recovery notes yet.</div>
      ) : (
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Date/Time</th>
              <th className="px-3 py-2">BP</th>
              <th className="px-3 py-2">Pulse</th>
              <th className="px-3 py-2">RR</th>
              <th className="px-3 py-2">SpO2</th>
              <th className="px-3 py-2">Pain</th>
              <th className="px-3 py-2">Temp</th>
              <th className="px-3 py-2">Aldrete</th>
              <th className="px-3 py-2">Vomiting</th>
              <th className="px-3 py-2">Shivering</th>
              <th className="px-3 py-2">Site Bleeding/Hematoma</th>
              <th className="px-3 py-2">Doctor</th>
              <th className="px-3 py-2 print:hidden">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map(r => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-xs text-slate-600">{new Date(r.when).toLocaleString()}</td>
                <td className="px-3 py-2">{r.bp || '-'}</td>
                <td className="px-3 py-2">{r.pulse || '-'}</td>
                <td className="px-3 py-2">{r.rr || '-'}</td>
                <td className="px-3 py-2">{r.spo2 || '-'}</td>
                <td className="px-3 py-2">{r.pain || '-'}</td>
                <td className="px-3 py-2">{r.temp || '-'}</td>
                <td className="px-3 py-2">{r.aldreteScore || '-'}</td>
                <td className="px-3 py-2">{r.vomiting || '-'}</td>
                <td className="px-3 py-2">{r.shivering || '-'}</td>
                <td className="px-3 py-2">{r.siteBleedingHematoma || '-'}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{r.doctorName || '-'}</td>
                <td className="px-3 py-2 print:hidden">
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(r)} className="rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                    <button onClick={() => remove(r.id)} className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <PostRecDialog key={editingId || 'add'} open={open} onClose={()=>{ setOpen(false); setEditingId(null); setEditingData(null) }} onSave={editingId ? update : add} doctors={doctors} initial={editingData} />
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Post-Recovery Record"
        message="Are you sure you want to delete this post-recovery record?"
        onConfirm={() => { handleDeleteConfirm(); setDeleteConfirmOpen(false) }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null) }}
      />
    </div>
  )
}

function PostRecDialog({ open, onClose, onSave, doctors, initial }: { open: boolean; onClose: ()=>void; onSave: (d: { when?: string; bp?: string; pulse?: string; rr?: string; spo2?: string; pain?: string; temp?: string; aldreteScore?: string; vomiting?: string; shivering?: string; siteBleedingHematoma?: string; doctorName?: string })=>void; doctors: Array<{ _id: string; name: string }>; initial?: any }){
  const now = new Date()
  const defaultDateTime = initial?.when ? new Date(new Date(initial.when).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
  const [doctorSearch, setDoctorSearch] = useState(initial?.doctorName || '')
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState(initial?.doctorName || '')
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

  if (!open) return null

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const get = (k: string) => String(fd.get(k) || '')
    onSave({ when: get('when'), bp: get('bp'), pulse: get('pulse'), rr: get('rr'), spo2: get('spo2'), pain: get('pain'), temp: get('temp'), aldreteScore: get('aldreteScore'), vomiting: get('vomiting'), shivering: get('shivering'), siteBleedingHematoma: get('siteBleedingHematoma'), doctorName: selectedDoctor })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">{initial ? 'Edit Post-Recovery Note' : 'Add Post-Recovery Note'}</div>
        <div className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="when">Date/Time</label>
            <input id="when" name="when" type="datetime-local" defaultValue={defaultDateTime} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          {['bp','pulse','rr','spo2','pain','temp','aldreteScore','vomiting','shivering','siteBleedingHematoma'].map(name => (
            <div key={name}>
              <label className="block text-xs font-medium text-slate-600" htmlFor={name}>{name.toUpperCase()}</label>
              <input id={name} name={name} defaultValue={(initial as any)?.[name] || ''} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-slate-600">DOCTORNAME</label>
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
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn">Save</button>
        </div>
      </form>
    </div>
  )
}
