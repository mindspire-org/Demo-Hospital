import React, { useEffect, useState } from 'react'
import { ipdApi } from '../../../../utils/api'
import ConfirmDialog from '../../../common/ConfirmDialog'
import Toast, { type ToastState } from '../../../ui/Toast'

type IntraRow = { time: string; pulse?: string; bp?: string; rr?: string; spo2?: string; drugs?: string; ivFluidsBlood?: string }

export default function Hospital_IpdAnesIntraAssessment({ encounterId }: { encounterId: string }){
  const [sessions, setSessions] = useState<Array<{ id: string; when: string; rows: IntraRow[]; totals?: { intakeFluidsBlood?: string; bloodLoss?: string; urineOutput?: string; others?: string }; doctorName?: string; inductionAgents?: any[]; maintenanceAgents?: any[]; fluidsGiven?: any[]; bloodTransfused?: any[] }>>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<any>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await ipdApi.listIpdAnesthesiaRecords(encounterId, { limit: 50 }) as any
      const items = (res.anesthesiaRecords || []).map((n: any)=>({
        id: String(n._id),
        when: String(n.inductionTime || n.createdAt || ''),
        doctorName: n.anesthesiologistName || '',
        rows: (n.vitalPeriods || []).map((v: any) => ({
          time: v.time ? new Date(v.time).toLocaleTimeString() : '',
          pulse: v.hr ? String(v.hr) : '',
          bp: v.bp || '',
          rr: v.rr || '',
          spo2: v.spo2 ? String(v.spo2) : '',
          drugs: v.drugs || '',
          ivFluidsBlood: v.fluidsGiven || '',
        })) as IntraRow[],
        totals: {
          intakeFluidsBlood: n.fluidsGiven?.map((f: any) => `${f.name} ${f.volume}`).join(', ') || '',
          bloodLoss: n.totalBloodLoss || '',
          urineOutput: n.totalUrineOutput || '',
          others: '',
        },
        inductionAgents: n.inductionAgents || [],
        maintenanceAgents: n.maintenanceAgents || [],
        fluidsGiven: n.fluidsGiven || [],
        bloodTransfused: n.bloodTransfused || [],
      }))
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
          rr: d.row.rr || undefined,
          spo2: d.row.spo2 ? parseInt(d.row.spo2) : undefined,
          drugs: d.row.drugs || undefined,
          fluidsGiven: d.row.ivFluidsBlood || undefined,
        }],
        inductionAgents: d.inductionAgents?.filter(a => a.name) || [],
        maintenanceAgents: d.maintenanceAgents?.filter(a => a.name) || [],
        fluidsGiven: d.fluidsGiven?.filter(f => f.name) || [],
        bloodTransfused: d.bloodTransfused?.filter(b => b.type) || [],
        totalBloodLoss: d.totals?.bloodLoss,
        totalUrineOutput: d.totals?.urineOutput,
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

  const update = async (d: any) => {
    if (!editingId) return
    try{
      await ipdApi.updateIpdAnesthesiaRecord(editingId, {
        inductionTime: d.when || new Date().toISOString(),
        anesthesiologistName: d.doctorName,
        vitalPeriods: [{
          time: d.when || new Date().toISOString(),
          bp: d.row.bp, hr: d.row.pulse ? parseInt(d.row.pulse) : undefined,
          rr: d.row.rr || undefined, spo2: d.row.spo2 ? parseInt(d.row.spo2) : undefined,
          drugs: d.row.drugs || undefined, fluidsGiven: d.row.ivFluidsBlood || undefined,
        }],
        inductionAgents: d.inductionAgents?.filter((a: any) => a.name) || [],
        maintenanceAgents: d.maintenanceAgents?.filter((a: any) => a.name) || [],
        fluidsGiven: d.fluidsGiven?.filter((f: any) => f.name) || [],
        bloodTransfused: d.bloodTransfused?.filter((b: any) => b.type) || [],
        totalBloodLoss: d.totals?.bloodLoss, totalUrineOutput: d.totals?.urineOutput,
      })
      setEditingId(null); setEditingData(null); await reload()
      setToast({ type: 'success', message: 'Intra-anesthesia record updated' })
    }catch(e: any){ setToast({ type: 'error', message: 'Failed to update intra-anesthesia record' }) }
  }

  const remove = async (id: string) => {
    setDeleteId(id)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try { await ipdApi.deleteIpdAnesthesiaRecord(deleteId); await reload() } catch (e: any) { alert(e?.message || 'Failed to delete') }
    setDeleteId(null)
  }

  const startEdit = (sess: any) => {
    setEditingId(sess.id)
    setEditingData(sess)
    setOpen(true)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-2 flex items-center justify-between print:hidden">
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
                <div className="flex items-center gap-2">
                  <div>{sess.doctorName ? `Dr: ${sess.doctorName}` : ''}</div>
                  <div className="flex gap-1 print:hidden">
                    <button onClick={() => startEdit(sess)} className="rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                    <button onClick={() => remove(sess.id)} className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
                  </div>
                </div>
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
      <IntraDialog key={editingId || 'add'} open={open} onClose={()=>{ setOpen(false); setEditingId(null); setEditingData(null) }} onSave={editingId ? update : add} initial={editingData} />
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Intra-Assessment"
        message="Are you sure you want to delete this intra-assessment?"
        onConfirm={() => { handleDeleteConfirm(); setDeleteConfirmOpen(false) }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null) }}
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}

function IntraDialog({ open, onClose, onSave, initial }: { open: boolean; onClose: ()=>void; onSave: (d: { row: IntraRow; totals?: { intakeFluidsBlood?: string; bloodLoss?: string; urineOutput?: string; others?: string }; doctorName?: string; when?: string; inductionAgents?: any[]; maintenanceAgents?: any[]; fluidsGiven?: any[]; bloodTransfused?: any[] })=>void; initial?: any }){
  const now = new Date()
  const defaultDateTime = initial?.when ? new Date(new Date(initial.when).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
  const [doctorName, setDoctorName] = useState(initial?.doctorName || '')
  const [inductionAgents, setInductionAgents] = useState<Array<{ name: string; dose: string }>>(initial?.inductionAgents?.map((a: any) => ({ name: a.name || '', dose: a.dose || '' })) || [])
  const [maintenanceAgents, setMaintenanceAgents] = useState<Array<{ name: string; dose: string }>>(initial?.maintenanceAgents?.map((a: any) => ({ name: a.name || '', dose: a.dose || '' })) || [])
  const [fluidsGiven, setFluidsGiven] = useState<Array<{ name: string; volume: string }>>(initial?.fluidsGiven?.map((f: any) => ({ name: f.name || '', volume: f.volume || '' })) || [])
  const [bloodTransfused, setBloodTransfused] = useState<Array<{ type: string; units: string }>>(initial?.bloodTransfused?.map((b: any) => ({ type: b.type || '', units: String(b.units || '') })) || [])

  useEffect(() => {
    if (open) {
      setDoctorName(initial?.doctorName || '')
      setInductionAgents(initial?.inductionAgents?.map((a: any) => ({ name: a.name || '', dose: a.dose || '' })) || [])
      setMaintenanceAgents(initial?.maintenanceAgents?.map((a: any) => ({ name: a.name || '', dose: a.dose || '' })) || [])
      setFluidsGiven(initial?.fluidsGiven?.map((f: any) => ({ name: f.name || '', volume: f.volume || '' })) || [])
      setBloodTransfused(initial?.bloodTransfused?.map((b: any) => ({ type: b.type || '', units: String(b.units || '') })) || [])
    }
  }, [open, initial])

  if (!open) return null
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const get = (k: string) => String(fd.get(k) || '')
    const row: IntraRow = { time: get('time'), pulse: get('pulse'), bp: get('bp'), rr: get('rr'), spo2: get('spo2'), drugs: get('drugs'), ivFluidsBlood: get('ivFluidsBlood') }
    const totals = { intakeFluidsBlood: get('intakeFluidsBlood'), bloodLoss: get('bloodLoss'), urineOutput: get('urineOutput'), others: get('others') }
    onSave({ row, totals, doctorName, when: get('when'), inductionAgents, maintenanceAgents, fluidsGiven, bloodTransfused })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl ring-1 ring-black/5 max-h-[90vh]">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">{initial ? 'Edit Intra-Anesthesia Row' : 'Add Intra-Anesthesia Row'}</div>
        <div className="grid gap-4 px-5 py-4 text-sm sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="when">Date/Time</label>
            <input id="when" name="when" type="datetime-local" defaultValue={defaultDateTime} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Doctor Name</label>
            <input type="text" value={doctorName} onChange={e => setDoctorName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
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
