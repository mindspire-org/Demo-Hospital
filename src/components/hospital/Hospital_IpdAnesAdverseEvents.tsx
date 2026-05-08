import React, { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { useEncounterDefaults } from '../../hooks/useEncounterDefaults'
import { ClinicalDialogShell, ClinicalDatePicker, clinicalInp, clinicalLbl } from '../ui/ClinicalDialog'
import { AlertTriangle, Pencil, Trash2, Printer, Plus } from 'lucide-react'
import ConfirmDialog from '../ui/ConfirmDialog'

type AdverseRow = { id: string; when: string; anyEvent: boolean; details?: string; doctorName?: string; sign?: string }

export default function Hospital_IpdAnesAdverseEvents({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<AdverseRow[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AdverseRow | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const encDefaults = useEncounterDefaults(encounterId)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'anes-adverse', limit: 200 }) as any
      const items = (res.notes || []).map((n: any)=>({
        id: String(n._id),
        when: String(n.recordedAt || n.createdAt || ''),
        anyEvent: !!((n.data||{}).anyEvent),
        details: (n.data||{}).details || '',
        doctorName: n.doctorName || '',
        sign: n.sign || '',
      }))
      setRows(items)
    }catch{}
  }

  const add = async (d: { when?: string; anyEvent?: string; details?: string; doctorName?: string; sign?: string }) => {
    try{
      if (editing?.id) {
        await hospitalApi.updateIpdClinicalNote(editing.id, {
          recordedAt: d.when || new Date().toISOString(),
          doctorName: d.doctorName,
          sign: d.sign,
          data: { anyEvent: d.anyEvent === 'yes', details: d.details },
        })
      } else {
        await hospitalApi.createIpdClinicalNote(encounterId, {
          type: 'anes-adverse',
          recordedAt: d.when || new Date().toISOString(),
          doctorName: d.doctorName,
          sign: d.sign,
          data: { anyEvent: d.anyEvent === 'yes', details: d.details },
        })
      }
      setOpen(false); setEditing(null); await reload()
    }catch(e: any){ alert(e?.message || 'Failed to save adverse event') }
  }

  const deleteRow = async () => {
    if (!confirmDeleteId) return
    try { await hospitalApi.deleteIpdClinicalNote(confirmDeleteId); setConfirmDeleteId(null); await reload() } catch (e: any) { alert(e?.message || 'Failed to delete') }
  }

  const printRow = (r: AdverseRow) => {
    const w = window.open('', '_blank'); if (!w) return
    const esc = (v?: string) => String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><style>@page{size:A4;margin:12mm}body{font-family:system-ui;color:#111;font-size:13px}</style></head><body><h2 style="text-align:center">Adverse Anesthesia Event</h2><div style="display:flex;justify-content:space-between;font-size:11px;color:#666;margin-bottom:12px"><span>Date: ${esc(new Date(r.when).toLocaleString())}</span><span>Dr: ${esc(r.doctorName)}</span></div><div style="margin-bottom:8px;font-weight:700">Any Event: ${r.anyEvent ? 'Yes' : 'No'}</div><div style="white-space:pre-wrap;line-height:1.6">${esc(r.details)}</div><div style="margin-top:24px;font-size:11px;color:#666">Sign: ${esc(r.sign)}</div><script>setTimeout(()=>window.print(),200)</script></body></html>`)
    w.document.close(); w.focus()
  }

  const onEdit = (r: AdverseRow) => { setEditing(r); setOpen(true) }
  const onAdd = () => { setEditing(null); setOpen(true) }
  const onClose = () => { setOpen(false); setEditing(null) }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white"><AlertTriangle className="h-4 w-4" /></div>
          <span className="text-sm font-bold text-slate-900">Adverse Anesthesia Events</span>
        </div>
        <button onClick={onAdd} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"><Plus className="h-3.5 w-3.5 inline mr-1" />Add Event</button>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">No adverse events recorded.</div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4 transition-shadow hover:shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-xs text-slate-500 mb-1">{new Date(r.when).toLocaleString()} {r.doctorName ? `• Dr: ${r.doctorName}` : ''}</div>
                  <div className="text-sm font-semibold text-slate-800">Any event: {r.anyEvent ? 'Yes' : 'No'}</div>
                  {r.details ? (<div className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{r.details}</div>) : null}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-2">
                <button onClick={()=>onEdit(r)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"><Pencil className="h-3 w-3" />Edit</button>
                <button onClick={()=>setConfirmDeleteId(r.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"><Trash2 className="h-3 w-3" />Delete</button>
                <button onClick={()=>printRow(r)} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"><Printer className="h-3 w-3" />Print</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <AdverseDialog open={open} onClose={onClose} onSave={add} defaults={encDefaults} initial={editing} />
      <ConfirmDialog open={!!confirmDeleteId} title="Delete Adverse Event" message="Are you sure you want to delete this adverse event record?" confirmText="Delete" onCancel={()=>setConfirmDeleteId(null)} onConfirm={deleteRow} />
    </div>
  )
}

function AdverseDialog({ open, onClose, onSave, defaults, initial }: { open: boolean; onClose: ()=>void; onSave: (d: { when?: string; anyEvent?: string; details?: string; doctorName?: string; sign?: string })=>void; defaults?: any; initial?: AdverseRow | null }){
  const [form, setForm] = useState({ when: '', anyEvent: 'no', details: '', doctorName: '', sign: '' })

  useEffect(()=>{
    if (!open) return
    if (initial) {
      setForm({ when: initial.when ? new Date(initial.when).toISOString().slice(0,16) : '', anyEvent: initial.anyEvent ? 'yes' : 'no', details: initial.details || '', doctorName: initial.doctorName || '', sign: initial.sign || '' })
    } else {
      setForm({ when: new Date().toISOString().slice(0,16), anyEvent: 'no', details: '', doctorName: defaults?.doctorName || '', sign: '' })
    }
  }, [open, initial])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ when: form.when, anyEvent: form.anyEvent, details: form.details, doctorName: form.doctorName, sign: form.sign })
  }

  return (
    <ClinicalDialogShell open={open} title={initial ? 'Edit Adverse Event' : 'Record Adverse Event'} subtitle="Anesthesia Safety" icon={AlertTriangle} onClose={onClose} onSubmit={submit}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <ClinicalDatePicker label="Date/Time" value={form.when} onChange={v=>setForm({...form,when:v})} />
          <div><label className={clinicalLbl}>Any Adverse Event</label><select value={form.anyEvent} onChange={e=>setForm({...form,anyEvent:e.target.value})} className={clinicalInp}><option value="no">No</option><option value="yes">Yes</option></select></div>
        </div>
        <div><label className={clinicalLbl}>Details</label><textarea value={form.details} onChange={e=>setForm({...form,details:e.target.value})} rows={4} className={clinicalInp+' resize-none'}></textarea></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={clinicalLbl}>Doctor Name</label><input value={form.doctorName} onChange={e=>setForm({...form,doctorName:e.target.value})} className={clinicalInp} /></div>
          <div><label className={clinicalLbl}>Sign</label><input value={form.sign} onChange={e=>setForm({...form,sign:e.target.value})} className={clinicalInp} /></div>
        </div>
      </div>
    </ClinicalDialogShell>
  )
}
