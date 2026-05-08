import React, { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { useEncounterDefaults } from '../../hooks/useEncounterDefaults'
import { ClinicalDialogShell, ClinicalDatePicker, clinicalInp, clinicalLbl } from '../ui/ClinicalDialog'
import { HeartPulse, Pencil, Trash2, Printer, Plus } from 'lucide-react'
import ConfirmDialog from '../ui/ConfirmDialog'

type RecRow = { id: string; when: string; loc?: string; bp?: string; pulse?: string; rr?: string; spo2?: string; painStimulus?: string; doctorName?: string; sign?: string }

export default function Hospital_IpdAnesRecovery({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<RecRow[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<RecRow | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const encDefaults = useEncounterDefaults(encounterId)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'anes-recovery', limit: 200 }) as any
      const items = (res.notes || []).map((n: any)=>({
        id: String(n._id),
        when: String(n.recordedAt || n.createdAt || ''),
        loc: (n.data||{}).loc || '',
        bp: (n.data||{}).bp || '',
        pulse: (n.data||{}).pulse || '',
        rr: (n.data||{}).rr || '',
        spo2: (n.data||{}).spo2 || '',
        painStimulus: (n.data||{}).painStimulus || '',
        doctorName: n.doctorName || '',
        sign: n.sign || '',
      }))
      setRows(items)
    }catch{}
  }

  const add = async (d: any) => {
    try{
      if (editing?.id) {
        await hospitalApi.updateIpdClinicalNote(editing.id, { recordedAt: d.when || new Date().toISOString(), doctorName: d.doctorName, sign: d.sign, data: { loc: d.loc, bp: d.bp, pulse: d.pulse, rr: d.rr, spo2: d.spo2, painStimulus: d.painStimulus } })
      } else {
        await hospitalApi.createIpdClinicalNote(encounterId, { type: 'anes-recovery', recordedAt: d.when || new Date().toISOString(), doctorName: d.doctorName, sign: d.sign, data: { loc: d.loc, bp: d.bp, pulse: d.pulse, rr: d.rr, spo2: d.spo2, painStimulus: d.painStimulus } })
      }
      setOpen(false); setEditing(null); await reload()
    }catch(e: any){ alert(e?.message || 'Failed to save recovery status') }
  }

  const deleteRow = async () => {
    if (!confirmDeleteId) return
    try { await hospitalApi.deleteIpdClinicalNote(confirmDeleteId); setConfirmDeleteId(null); await reload() } catch (e: any) { alert(e?.message || 'Failed to delete') }
  }

  const printRow = (r: RecRow) => {
    const w = window.open('', '_blank'); if (!w) return
    const esc = (v?: string) => String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><style>@page{size:A4;margin:12mm}body{font-family:system-ui;color:#111;font-size:13px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #e2e8f0;padding:6px 10px;text-align:left}</style></head><body><h2 style="text-align:center">Recovery Status</h2><div style="font-size:11px;color:#666;margin-bottom:12px">${esc(new Date(r.when).toLocaleString())} | Dr: ${esc(r.doctorName)}</div><table><tr><th>LOC</th><th>BP</th><th>Pulse</th><th>RR</th><th>SpO2</th><th>Pain Stimulus</th></tr><tr><td>${esc(r.loc)}</td><td>${esc(r.bp)}</td><td>${esc(r.pulse)}</td><td>${esc(r.rr)}</td><td>${esc(r.spo2)}</td><td>${esc(r.painStimulus)}</td></tr></table><div style="margin-top:12px;font-size:11px;color:#666">Sign: ${esc(r.sign)}</div><script>setTimeout(()=>window.print(),200)</script></body></html>`)
    w.document.close(); w.focus()
  }

  const onEdit = (r: RecRow) => { setEditing(r); setOpen(true) }
  const onAdd = () => { setEditing(null); setOpen(true) }
  const onClose = () => { setOpen(false); setEditing(null) }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white"><HeartPulse className="h-4 w-4" /></div>
          <span className="text-sm font-bold text-slate-900">Recovery (Immediate Post Anesthesia)</span>
        </div>
        <button onClick={onAdd} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"><Plus className="h-3.5 w-3.5 inline mr-1" />Add Status</button>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">No recovery entries yet.</div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4 transition-shadow hover:shadow-sm">
              <div className="grid gap-2 text-sm sm:grid-cols-4">
                <div><span className="text-xs font-semibold text-slate-400">LOC</span><div className="font-bold text-slate-800">{r.loc || '-'}</div></div>
                <div><span className="text-xs font-semibold text-slate-400">BP</span><div className="font-bold text-slate-800">{r.bp || '-'}</div></div>
                <div><span className="text-xs font-semibold text-slate-400">Pulse</span><div className="font-bold text-slate-800">{r.pulse || '-'}</div></div>
                <div><span className="text-xs font-semibold text-slate-400">RR</span><div className="font-bold text-slate-800">{r.rr || '-'}</div></div>
                <div><span className="text-xs font-semibold text-slate-400">SpO2</span><div className="font-bold text-slate-800">{r.spo2 || '-'}</div></div>
                <div><span className="text-xs font-semibold text-slate-400">Pain Stimulus</span><div className="font-bold text-slate-800">{r.painStimulus || '-'}</div></div>
                <div className="sm:col-span-2"><span className="text-xs font-semibold text-slate-400">Doctor/Sign</span><div className="font-bold text-slate-800">{r.doctorName || '-'} {r.sign ? `/ ${r.sign}` : ''}</div></div>
              </div>
              <div className="text-xs text-slate-400 mt-2">{new Date(r.when).toLocaleString()}</div>
              <div className="mt-2 flex items-center justify-end gap-2 border-t border-slate-100 pt-2">
                <button onClick={()=>onEdit(r)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"><Pencil className="h-3 w-3" />Edit</button>
                <button onClick={()=>setConfirmDeleteId(r.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"><Trash2 className="h-3 w-3" />Delete</button>
                <button onClick={()=>printRow(r)} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"><Printer className="h-3 w-3" />Print</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <RecoveryDialog open={open} onClose={onClose} onSave={add} defaults={encDefaults} initial={editing} />
      <ConfirmDialog open={!!confirmDeleteId} title="Delete Recovery Entry" message="Are you sure you want to delete this recovery entry?" confirmText="Delete" onCancel={()=>setConfirmDeleteId(null)} onConfirm={deleteRow} />
    </div>
  )
}

function RecoveryDialog({ open, onClose, onSave, defaults, initial }: { open: boolean; onClose: ()=>void; onSave: (d: any)=>void; defaults?: any; initial?: RecRow | null }){
  const [form, setForm] = useState({ when: '', loc: '', bp: '', pulse: '', rr: '', spo2: '', painStimulus: '', doctorName: '', sign: '' })

  useEffect(()=>{
    if (!open) return
    if (initial) {
      setForm({ when: initial.when ? new Date(initial.when).toISOString().slice(0,16) : '', loc: initial.loc||'', bp: initial.bp||'', pulse: initial.pulse||'', rr: initial.rr||'', spo2: initial.spo2||'', painStimulus: initial.painStimulus||'', doctorName: initial.doctorName||'', sign: initial.sign||'' })
    } else {
      setForm({ when: new Date().toISOString().slice(0,16), loc: '', bp: '', pulse: '', rr: '', spo2: '', painStimulus: '', doctorName: defaults?.doctorName || '', sign: '' })
    }
  }, [open, initial])

  const submit = (e: React.FormEvent) => { e.preventDefault(); onSave(form) }

  return (
    <ClinicalDialogShell open={open} title={initial ? 'Edit Recovery Status' : 'Add Recovery Status'} subtitle="Immediate Post Anesthesia" icon={HeartPulse} onClose={onClose} onSubmit={submit}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <ClinicalDatePicker label="Date/Time" value={form.when} onChange={v=>setForm({...form,when:v})} />
          <div><label className={clinicalLbl}>LOC</label><input value={form.loc} onChange={e=>setForm({...form,loc:e.target.value})} className={clinicalInp} /></div>
          <div><label className={clinicalLbl}>BP</label><input value={form.bp} onChange={e=>setForm({...form,bp:e.target.value})} className={clinicalInp} /></div>
          <div><label className={clinicalLbl}>Pulse</label><input value={form.pulse} onChange={e=>setForm({...form,pulse:e.target.value})} className={clinicalInp} /></div>
          <div><label className={clinicalLbl}>RR</label><input value={form.rr} onChange={e=>setForm({...form,rr:e.target.value})} className={clinicalInp} /></div>
          <div><label className={clinicalLbl}>SpO2</label><input value={form.spo2} onChange={e=>setForm({...form,spo2:e.target.value})} className={clinicalInp} /></div>
          <div><label className={clinicalLbl}>Pain Stimulus</label><input value={form.painStimulus} onChange={e=>setForm({...form,painStimulus:e.target.value})} className={clinicalInp} /></div>
          <div><label className={clinicalLbl}>Doctor Name</label><input value={form.doctorName} onChange={e=>setForm({...form,doctorName:e.target.value})} className={clinicalInp} /></div>
          <div><label className={clinicalLbl}>Sign</label><input value={form.sign} onChange={e=>setForm({...form,sign:e.target.value})} className={clinicalInp} /></div>
        </div>
      </div>
    </ClinicalDialogShell>
  )
}
