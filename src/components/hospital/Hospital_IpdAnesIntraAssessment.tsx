import React, { useEffect, useState, useRef } from 'react'
import { ipdApi, hospitalApi } from '../../utils/api'
import Toast, { type ToastState } from '../ui/Toast'

type IntraRow = { time: string; pulse?: string; bp?: string; rr?: string; spo2?: string; drugs?: string; ivFluidsBlood?: string }

export default function Hospital_IpdAnesIntraAssessment({ encounterId }: { encounterId: string }){
  const [sessions, setSessions] = useState<Array<{ id: string; when: string; rows: IntraRow[]; totals?: { intakeFluidsBlood?: string; bloodLoss?: string; urineOutput?: string; others?: string }; doctorName?: string; inductionAgents?: any[]; maintenanceAgents?: any[]; fluidsGiven?: any[]; bloodTransfused?: any[] }>>([])
  const [open, setOpen] = useState(false)
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([])
  const [toast, setToast] = useState<ToastState>(null)

  useEffect(()=>{ (async()=>{ try { const res = await hospitalApi.listDoctors() as any; const items = (res?.doctors || res || []) as Array<{ _id: string; name: string }>; setDoctors(items) } catch { setDoctors([]) } })() }, [])

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await ipdApi.listIpdAnesthesiaRecords(encounterId, { status: 'in-progress', limit: 50 }) as any
      const items = (res.anesthesiaRecords || []).map((n: any)=>{
        // Parse preAnesthesiaNotes to get additional fields
        const notes = n.preAnesthesiaNotes || ''
        const parsed: any = {}
        notes.split(', ').forEach((part: string) => {
          const [key, val] = part.split(': ')
          if (key && val !== undefined) parsed[key.toLowerCase().trim()] = val.trim()
        })
        return {
          id: String(n._id),
          when: String(n.inductionTime || n.createdAt || ''),
          doctorName: n.anesthesiologistName || '',
          rows: (n.vitalPeriods || []).map((v: any) => ({
            time: v.time ? new Date(v.time).toLocaleTimeString() : '',
            pulse: v.hr ? String(v.hr) : '',
            bp: v.bp || '',
            rr: v.rr || parsed.rr || '',
            spo2: v.spo2 ? String(v.spo2) : '',
            drugs: v.drugs || parsed.drugs || '',
            ivFluidsBlood: v.fluidsGiven || '',
          })) as IntraRow[],
          totals: {
            intakeFluidsBlood: n.fluidsGiven?.map((f: any) => `${f.name} ${f.volume}`).join(', ') || '',
            bloodLoss: n.totalBloodLoss || '',
            urineOutput: n.totalUrineOutput || '',
            others: parsed.others || '',
          },
          inductionAgents: n.inductionAgents || [],
          maintenanceAgents: n.maintenanceAgents || [],
          fluidsGiven: n.fluidsGiven || [],
          bloodTransfused: n.bloodTransfused || [],
        }
      })
      setSessions(items)
    }catch{}
  }

  const add = async (d: { row: IntraRow; totals?: { intakeFluidsBlood?: string; bloodLoss?: string; urineOutput?: string; others?: string }; doctorName?: string; when?: string; inductionAgents?: any[]; maintenanceAgents?: any[]; fluidsGiven?: any[]; bloodTransfused?: any[] }) => {
    try{
      await ipdApi.createIpdAnesthesiaRecord(encounterId, {
        inductionTime: d.when || new Date().toISOString(),
        anesthesiologistName: d.doctorName,
        vitalPeriods: [{
          time: d.when || new Date().toISOString(),
          bp: d.row.bp,
          hr: d.row.pulse ? parseInt(d.row.pulse) : undefined,
          spo2: d.row.spo2 ? parseInt(d.row.spo2) : undefined,
          fluidsGiven: d.row.ivFluidsBlood,
        }],
        inductionAgents: d.inductionAgents?.filter(a => a.name) || [],
        maintenanceAgents: d.maintenanceAgents?.filter(a => a.name) || [],
        fluidsGiven: d.fluidsGiven?.filter(f => f.name) || [],
        bloodTransfused: d.bloodTransfused?.filter(b => b.type) || [],
        totalBloodLoss: d.totals?.bloodLoss,
        totalUrineOutput: d.totals?.urineOutput,
        preAnesthesiaNotes: [
          d.row.rr && `RR: ${d.row.rr}`,
          d.row.drugs && `Drugs: ${d.row.drugs}`,
          d.totals?.intakeFluidsBlood && `Intake: ${d.totals.intakeFluidsBlood}`,
          d.totals?.others && `Others: ${d.totals.others}`,
        ].filter(Boolean).join(', ') || undefined,
        status: 'in-progress',
      })
      setOpen(false); await reload()
      setToast({ type: 'success', message: 'Intra-anesthesia row saved successfully' })
    }catch(e: any){
      let errorMsg = 'Failed to save intra-anesthesia assessment'
      try {
        const parsed = JSON.parse(e?.message || '{}')
        errorMsg = parsed?.error || errorMsg
      } catch {
        errorMsg = e?.message || errorMsg
      }
      setToast({ type: 'error', message: errorMsg })
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">During / Intra-Anesthesia Assessment</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Row</button>
      </div>
      {sessions.length === 0 ? (
        <div className="text-slate-500">No intra-anesthesia rows yet.</div>
      ) : (
        <div className="space-y-4">
          {sessions.map(sess => (
            <div key={sess.id} className="overflow-x-auto rounded-md border border-slate-200">
              <div className="flex items-center justify-between bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <div>{new Date(sess.when).toLocaleString()}</div>
                <div>{sess.doctorName ? `Dr: ${sess.doctorName}` : ''}</div>
              </div>
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Pulse</th>
                    <th className="px-3 py-2">BP</th>
                    <th className="px-3 py-2">RR</th>
                    <th className="px-3 py-2">SpO2</th>
                    <th className="px-3 py-2">Drugs</th>
                    <th className="px-3 py-2">IV Fluid / Blood</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sess.rows.map((r, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">{r.time || '-'}</td>
                      <td className="px-3 py-2">{r.pulse || '-'}</td>
                      <td className="px-3 py-2">{r.bp || '-'}</td>
                      <td className="px-3 py-2">{r.rr || '-'}</td>
                      <td className="px-3 py-2">{r.spo2 || '-'}</td>
                      <td className="px-3 py-2">{r.drugs || '-'}</td>
                      <td className="px-3 py-2">{r.ivFluidsBlood || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="grid gap-2 border-t border-slate-200 p-3 text-sm sm:grid-cols-4">
                <div>Total Intake Fluid/Blood: <span className="font-medium">{sess.totals?.intakeFluidsBlood || '-'}</span></div>
                <div>Blood Loss: <span className="font-medium">{sess.totals?.bloodLoss || '-'}</span></div>
                <div>Urine Output: <span className="font-medium">{sess.totals?.urineOutput || '-'}</span></div>
                <div>Others: <span className="font-medium">{sess.totals?.others || '-'}</span></div>
              </div>
              {((sess.inductionAgents?.length || 0) > 0 || (sess.maintenanceAgents?.length || 0) > 0 || (sess.fluidsGiven?.length || 0) > 0 || (sess.bloodTransfused?.length || 0) > 0) && (
                <div className="grid gap-2 border-t border-slate-200 p-3 text-sm sm:grid-cols-2">
                  {(sess.inductionAgents?.length || 0) > 0 && (
                    <div>Induction Agents: <span className="font-medium">{sess.inductionAgents?.map(a => `${a.name} ${a.dose}`).join(', ')}</span></div>
                  )}
                  {(sess.maintenanceAgents?.length || 0) > 0 && (
                    <div>Maintenance Agents: <span className="font-medium">{sess.maintenanceAgents?.map(a => `${a.name} ${a.dose}`).join(', ')}</span></div>
                  )}
                  {(sess.fluidsGiven?.length || 0) > 0 && (
                    <div>Fluids Given: <span className="font-medium">{sess.fluidsGiven?.map(f => `${f.name} ${f.volume}`).join(', ')}</span></div>
                  )}
                  {(sess.bloodTransfused?.length || 0) > 0 && (
                    <div>Blood Transfused: <span className="font-medium">{sess.bloodTransfused?.map(b => `${b.type} ${b.units} units`).join(', ')}</span></div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <IntraDialog open={open} onClose={()=>setOpen(false)} onSave={add} doctors={doctors} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}

function IntraDialog({ open, onClose, onSave, doctors }: { open: boolean; onClose: ()=>void; onSave: (d: { row: IntraRow; totals?: { intakeFluidsBlood?: string; bloodLoss?: string; urineOutput?: string; others?: string }; doctorName?: string; when?: string; inductionAgents?: any[]; maintenanceAgents?: any[]; fluidsGiven?: any[]; bloodTransfused?: any[] })=>void; doctors: Array<{ _id: string; name: string }> }){
  const now = new Date()
  const defaultDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
  const [doctorSearch, setDoctorSearch] = useState('')
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const filteredDoctors = doctors.filter(d => d.name.toLowerCase().includes(doctorSearch.toLowerCase()))
  const [inductionAgents, setInductionAgents] = useState<Array<{ name: string; dose: string }>>([])
  const [maintenanceAgents, setMaintenanceAgents] = useState<Array<{ name: string; dose: string }>>([])
  const [fluidsGiven, setFluidsGiven] = useState<Array<{ name: string; volume: string }>>([])
  const [bloodTransfused, setBloodTransfused] = useState<Array<{ type: string; units: string }>>([])

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
    const row: IntraRow = { time: get('time'), pulse: get('pulse'), bp: get('bp'), rr: get('rr'), spo2: get('spo2'), drugs: get('drugs'), ivFluidsBlood: get('ivFluidsBlood') }
    const totals = { intakeFluidsBlood: get('intakeFluidsBlood'), bloodLoss: get('bloodLoss'), urineOutput: get('urineOutput'), others: get('others') }
    onSave({ row, totals, doctorName: selectedDoctor, when: get('when'), inductionAgents, maintenanceAgents, fluidsGiven, bloodTransfused })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl ring-1 ring-black/5 max-h-[90vh]">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Intra-Anesthesia Row</div>
        <div className="grid gap-4 px-5 py-4 text-sm sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="when">Date/Time</label>
            <input id="when" name="when" type="datetime-local" defaultValue={defaultDateTime} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
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
          <div></div>

          <div className="sm:col-span-3 font-semibold text-slate-800">Row</div>
          {['time','pulse','bp','rr','spo2','drugs','ivFluidsBlood'].map(name => (
            <div key={name}>
              <label className="block text-xs font-medium text-slate-600" htmlFor={name}>{name.toUpperCase()}</label>
              <input id={name} name={name} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          ))}

          <div className="sm:col-span-3 font-semibold text-slate-800">Totals</div>
          {[
            ['intakeFluidsBlood','Total Intake Fluid/Blood'], ['bloodLoss','Blood Loss'], ['urineOutput','Urine Output'], ['others','Others'],
          ].map(([name,label]) => (
            <div key={name}>
              <label className="block text-xs font-medium text-slate-600" htmlFor={name}>{label}</label>
              <input id={name} name={name} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          ))}

          <div className="sm:col-span-3 font-semibold text-slate-800">Induction Agents</div>
          {inductionAgents.map((a, i) => (
            <div key={i} className="sm:col-span-3 flex gap-2">
              <input placeholder="Agent name" value={a.name} onChange={e => setInductionAgents(inductionAgents.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="flex-1 rounded-md border border-slate-300 px-3 py-2" />
              <input placeholder="Dose" value={a.dose} onChange={e => setInductionAgents(inductionAgents.map((x, j) => j === i ? { ...x, dose: e.target.value } : x))} className="w-24 rounded-md border border-slate-300 px-3 py-2" />
              <button type="button" onClick={() => setInductionAgents(inductionAgents.filter((_, j) => j !== i))} className="text-red-500">×</button>
            </div>
          ))}
          <div className="sm:col-span-3">
            <button type="button" onClick={() => setInductionAgents([...inductionAgents, { name: '', dose: '' }])} className="text-sm text-blue-600">+ Add Induction Agent</button>
          </div>

          <div className="sm:col-span-3 font-semibold text-slate-800">Maintenance Agents</div>
          {maintenanceAgents.map((a, i) => (
            <div key={i} className="sm:col-span-3 flex gap-2">
              <input placeholder="Agent name" value={a.name} onChange={e => setMaintenanceAgents(maintenanceAgents.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="flex-1 rounded-md border border-slate-300 px-3 py-2" />
              <input placeholder="Dose" value={a.dose} onChange={e => setMaintenanceAgents(maintenanceAgents.map((x, j) => j === i ? { ...x, dose: e.target.value } : x))} className="w-24 rounded-md border border-slate-300 px-3 py-2" />
              <button type="button" onClick={() => setMaintenanceAgents(maintenanceAgents.filter((_, j) => j !== i))} className="text-red-500">×</button>
            </div>
          ))}
          <div className="sm:col-span-3">
            <button type="button" onClick={() => setMaintenanceAgents([...maintenanceAgents, { name: '', dose: '' }])} className="text-sm text-blue-600">+ Add Maintenance Agent</button>
          </div>

          <div className="sm:col-span-3 font-semibold text-slate-800">Fluids Given</div>
          {fluidsGiven.map((f, i) => (
            <div key={i} className="sm:col-span-3 flex gap-2">
              <input placeholder="Fluid name" value={f.name} onChange={e => setFluidsGiven(fluidsGiven.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="flex-1 rounded-md border border-slate-300 px-3 py-2" />
              <input placeholder="Volume" value={f.volume} onChange={e => setFluidsGiven(fluidsGiven.map((x, j) => j === i ? { ...x, volume: e.target.value } : x))} className="w-24 rounded-md border border-slate-300 px-3 py-2" />
              <button type="button" onClick={() => setFluidsGiven(fluidsGiven.filter((_, j) => j !== i))} className="text-red-500">×</button>
            </div>
          ))}
          <div className="sm:col-span-3">
            <button type="button" onClick={() => setFluidsGiven([...fluidsGiven, { name: '', volume: '' }])} className="text-sm text-blue-600">+ Add Fluid</button>
          </div>

          <div className="sm:col-span-3 font-semibold text-slate-800">Blood Transfused</div>
          {bloodTransfused.map((b, i) => (
            <div key={i} className="sm:col-span-3 flex gap-2">
              <input placeholder="Blood type" value={b.type} onChange={e => setBloodTransfused(bloodTransfused.map((x, j) => j === i ? { ...x, type: e.target.value } : x))} className="flex-1 rounded-md border border-slate-300 px-3 py-2" />
              <input placeholder="Units" value={b.units} onChange={e => setBloodTransfused(bloodTransfused.map((x, j) => j === i ? { ...x, units: e.target.value } : x))} className="w-24 rounded-md border border-slate-300 px-3 py-2" />
              <button type="button" onClick={() => setBloodTransfused(bloodTransfused.filter((_, j) => j !== i))} className="text-red-500">×</button>
            </div>
          ))}
          <div className="sm:col-span-3">
            <button type="button" onClick={() => setBloodTransfused([...bloodTransfused, { type: '', units: '' }])} className="text-sm text-blue-600">+ Add Blood</button>
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
