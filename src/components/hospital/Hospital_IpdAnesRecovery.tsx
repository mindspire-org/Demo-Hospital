import React, { useEffect, useState } from 'react'
import { ipdApi, hospitalApi } from '../../utils/api'

export default function Hospital_IpdAnesRecovery({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; when: string; loc?: string; bp?: string; pulse?: string; rr?: string; spo2?: string; painStimulus?: string; doctorName?: string }>>([])
  const [open, setOpen] = useState(false)
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([])

  useEffect(()=>{ (async()=>{ try { const res = await hospitalApi.listDoctors() as any; const items = (res?.doctors || res || []) as Array<{ _id: string; name: string }>; setDoctors(items) } catch { setDoctors([]) } })() }, [])

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await ipdApi.listIpdAnesthesiaRecords(encounterId, { status: 'recovery', limit: 200 }) as any
      const items = (res.anesthesiaRecords || []).map((n: any)=>{
        // Parse postAnesthesiaNotes to extract individual fields
        const notes = n.postAnesthesiaNotes || ''
        const parsed: any = {}
        notes.split(', ').forEach((part: string) => {
          const [key, val] = part.split(': ')
          if (key && val !== undefined) parsed[key.toLowerCase().trim()] = val.trim()
        })
        return {
          id: String(n._id),
          when: String(n.emergenceTime || n.createdAt || ''),
          loc: n.recoveryCondition || '',
          bp: parsed.bp || '',
          pulse: parsed.pulse || '',
          rr: parsed.rr || '',
          spo2: parsed.spo2 || '',
          painStimulus: n.postOpAnalgesia || '',
          doctorName: n.anesthesiologistName || '',
        }
      })
      setRows(items)
    }catch{}
  }

  const add = async (d: { when?: string; loc?: string; bp?: string; pulse?: string; rr?: string; spo2?: string; painStimulus?: string; doctorName?: string }) => {
    try{
      await ipdApi.createIpdAnesthesiaRecord(encounterId, {
        emergenceTime: d.when || new Date().toISOString(),
        anesthesiologistName: d.doctorName,
        recoveryCondition: d.loc,
        postOpAnalgesia: d.painStimulus,
        postAnesthesiaNotes: [
          d.bp && `BP: ${d.bp}`,
          d.pulse && `Pulse: ${d.pulse}`,
          d.rr && `RR: ${d.rr}`,
          d.spo2 && `SpO2: ${d.spo2}`,
        ].filter(Boolean).join(', ') || undefined,
        status: 'recovery',
      })
      setOpen(false); await reload()
    }catch(e: any){ alert(e?.message || 'Failed to save recovery status') }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Recovery (Immediate Post Anesthesia)</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Recovery Status</button>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No recovery entries yet.</div>
      ) : (
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Date/Time</th>
              <th className="px-3 py-2">LOC</th>
              <th className="px-3 py-2">BP</th>
              <th className="px-3 py-2">Pulse</th>
              <th className="px-3 py-2">RR</th>
              <th className="px-3 py-2">SpO2</th>
              <th className="px-3 py-2">Pain Stimulus</th>
              <th className="px-3 py-2">Doctor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map(r => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-xs text-slate-600">{new Date(r.when).toLocaleString()}</td>
                <td className="px-3 py-2">{r.loc || '-'}</td>
                <td className="px-3 py-2">{r.bp || '-'}</td>
                <td className="px-3 py-2">{r.pulse || '-'}</td>
                <td className="px-3 py-2">{r.rr || '-'}</td>
                <td className="px-3 py-2">{r.spo2 || '-'}</td>
                <td className="px-3 py-2">{r.painStimulus || '-'}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{r.doctorName || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <RecoveryDialog open={open} onClose={()=>setOpen(false)} onSave={add} doctors={doctors} />
    </div>
  )
}

function RecoveryDialog({ open, onClose, onSave, doctors }: { open: boolean; onClose: ()=>void; onSave: (d: { when?: string; loc?: string; bp?: string; pulse?: string; rr?: string; spo2?: string; painStimulus?: string; doctorName?: string })=>void; doctors: Array<{ _id: string; name: string }> }){
  const now = new Date()
  const defaultDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
  const [doctorSearch, setDoctorSearch] = useState('')
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const filteredDoctors = doctors.filter(d => d.name.toLowerCase().includes(doctorSearch.toLowerCase()))

  if (!open) return null

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const get = (k: string) => String(fd.get(k) || '')
    onSave({ when: get('when'), loc: get('loc'), bp: get('bp'), pulse: get('pulse'), rr: get('rr'), spo2: get('spo2'), painStimulus: get('painStimulus'), doctorName: selectedDoctor })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Recovery Status</div>
        <div className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="when">Date/Time</label>
            <input id="when" name="when" type="datetime-local" defaultValue={defaultDateTime} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          {['loc','bp','pulse','rr','spo2','painStimulus'].map(name => (
            <div key={name}>
              <label className="block text-xs font-medium text-slate-600" htmlFor={name}>{name.toUpperCase()}</label>
              <input id={name} name={name} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-slate-600">DOCTORNAME</label>
            <div className="relative">
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
