import React, { useEffect, useState, useRef } from 'react'
import { ipdApi, hospitalApi } from '../../utils/api'

export default function Hospital_IpdAnesAdverseEvents({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; when: string; anyEvent: boolean; details?: string; doctorName?: string }>>([])
  const [open, setOpen] = useState(false)
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([])

  useEffect(()=>{ (async()=>{ try { const res = await hospitalApi.listDoctors() as any; const items = (res?.doctors || res || []) as Array<{ _id: string; name: string }>; setDoctors(items) } catch { setDoctors([]) } })() }, [])

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await ipdApi.listIpdAnesthesiaRecords(encounterId, { limit: 200 }) as any
      const items = (res.anesthesiaRecords || []).map((n: any)=>({
        id: String(n._id),
        when: String(n.inductionTime || n.createdAt || ''),
        anyEvent: !!(n.complications && n.complications.length > 0),
        details: n.complicationDetails || '',
        doctorName: n.anesthesiologistName || '',
      }))
      setRows(items)
    }catch{}
  }

  const add = async (d: { when?: string; anyEvent?: string; details?: string; doctorName?: string }) => {
    try{
      await ipdApi.createIpdAnesthesiaRecord(encounterId, {
        inductionTime: d.when || new Date().toISOString(),
        anesthesiologistName: d.doctorName,
        complications: d.anyEvent === 'yes' ? [d.details || 'Adverse event'] : [],
        complicationDetails: d.details,
        status: 'completed',
      })
      setOpen(false); await reload()
    }catch(e: any){ alert(e?.message || 'Failed to save adverse event') }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Adverse Anesthesia Events</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Event</button>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No adverse events recorded.</div>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.map(r => (
            <li key={r.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <div>{new Date(r.when).toLocaleString()}</div>
                <div>{r.doctorName ? `Dr: ${r.doctorName}` : ''}</div>
              </div>
              <div className="mt-1">Any event: <span className="font-medium">{r.anyEvent ? 'Yes' : 'No'}</span></div>
              {r.details ? (<div className="mt-1 whitespace-pre-wrap">Details: {r.details}</div>) : null}
            </li>
          ))}
        </ul>
      )}
      <AdverseDialog open={open} onClose={()=>setOpen(false)} onSave={add} doctors={doctors} />
    </div>
  )
}

function AdverseDialog({ open, onClose, onSave, doctors }: { open: boolean; onClose: ()=>void; onSave: (d: { when?: string; anyEvent?: string; details?: string; doctorName?: string })=>void; doctors: Array<{ _id: string; name: string }> }){
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

  if (!open) return null

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const get = (k: string) => String(fd.get(k) || '')
    onSave({ when: get('when'), anyEvent: get('anyEvent'), details: get('details'), doctorName: selectedDoctor })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Record Adverse Event</div>
        <div className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="when">Date/Time</label>
            <input id="when" name="when" type="datetime-local" defaultValue={defaultDateTime} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="anyEvent">Any Adverse Event</label>
            <select id="anyEvent" name="anyEvent" className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600" htmlFor="details">Details</label>
            <textarea id="details" name="details" className="h-28 w-full rounded-md border border-slate-300 px-3 py-2"></textarea>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600">Doctor Name</label>
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
