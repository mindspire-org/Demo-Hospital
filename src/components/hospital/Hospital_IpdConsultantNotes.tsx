import React, { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { useEncounterDefaults } from '../../hooks/useEncounterDefaults'
import { ClinicalDialogShell, ClinicalDatePicker, clinicalInp, clinicalLbl } from '../ui/ClinicalDialog'
import { Stethoscope, Pencil, Trash2, Printer, Plus } from 'lucide-react'
import ConfirmDialog from '../ui/ConfirmDialog'

export default function ConsultantNotes({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; when: string; text: string; doctorName?: string; sign?: string }>>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<typeof rows[0] | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const encDefaults = useEncounterDefaults(encounterId)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'consultant', limit: 200 }) as any
      const items = (res.notes || []).map((n: any)=>({
        id: String(n._id),
        when: String(n.recordedAt || n.createdAt || ''),
        text: String((n.data||{}).text || ''),
        doctorName: n.doctorName || '',
        sign: n.sign || '',
      }))
      setRows(items)
    }catch{}
  }

  const add = async (d: { when?: string; text?: string; doctorName?: string; sign?: string }) => {
    try{
      if (editing?.id) {
        await hospitalApi.updateIpdClinicalNote(editing.id, {
          recordedAt: d.when || new Date().toISOString(),
          doctorName: d.doctorName,
          sign: d.sign,
          data: { text: d.text || '' },
        })
      } else {
        const when = d.when || new Date().toISOString()
        await hospitalApi.createIpdClinicalNote(encounterId, {
          type: 'consultant',
          recordedAt: when,
          doctorName: d.doctorName,
          sign: d.sign,
          data: { text: d.text || '' },
        })
      }
      setOpen(false); setEditing(null)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to save consultant note') }
  }

  const deleteRow = async () => {
    if (!confirmDeleteId) return
    try {
      await hospitalApi.deleteIpdClinicalNote(confirmDeleteId)
      setConfirmDeleteId(null)
      await reload()
    } catch (e: any) { alert(e?.message || 'Failed to delete') }
  }

  const printRow = (r: typeof rows[0]) => {
    const w = window.open('', '_blank'); if (!w) return
    const esc = (v?: string) => String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><style>@page{size:A4;margin:12mm}body{font-family:system-ui;color:#111;font-size:13px}.lbl{font-weight:700;color:#555}.val{border-bottom:1px solid #222;min-height:20px;padding:2px 0}</style></head><body>
      <h2 style="text-align:center;margin-bottom:4px">Consultant Note</h2>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#666;margin-bottom:12px"><span>Date: ${esc(new Date(r.when).toLocaleString())}</span><span>Dr: ${esc(r.doctorName)}</span></div>
      <div style="white-space:pre-wrap;line-height:1.6">${esc(r.text)}</div>
      <div style="margin-top:24px;font-size:11px;color:#666">Sign: ${esc(r.sign)}</div>
      <script>setTimeout(()=>window.print(),200)</script>
    </body></html>`)
    w.document.close(); w.focus()
  }

  const onEdit = (r: typeof rows[0]) => { setEditing(r); setOpen(true) }
  const onAdd = () => { setEditing(null); setOpen(true) }
  const onClose = () => { setOpen(false); setEditing(null) }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white"><Stethoscope className="h-4 w-4" /></div>
          <span className="text-sm font-bold text-slate-900">Consultant / MO / WMO Notes</span>
        </div>
        <button onClick={onAdd} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]">
          <Plus className="h-3.5 w-3.5 inline mr-1" />Add Note
        </button>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">No consultant notes yet.</div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4 transition-shadow hover:shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="whitespace-pre-wrap text-sm text-slate-800 flex-1">{r.text || '-'}</div>
                <div className="text-right text-xs text-slate-500 shrink-0">
                  <div>{new Date(r.when).toLocaleString()}</div>
                  {r.doctorName ? <div>Dr: {r.doctorName}</div> : null}
                  {r.sign ? <div>Sign: {r.sign}</div> : null}
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
      <ConsultantDialog open={open} onClose={onClose} onSave={add} defaults={encDefaults} initial={editing} />
      <ConfirmDialog open={!!confirmDeleteId} title="Delete Consultant Note" message="Are you sure you want to delete this note?" confirmText="Delete" onCancel={()=>setConfirmDeleteId(null)} onConfirm={deleteRow} />
    </div>
  )
}

type ConsultNote = { id: string; when: string; text: string; doctorName?: string; sign?: string }

function ConsultantDialog({ open, onClose, onSave, defaults, initial }: { open: boolean; onClose: ()=>void; onSave: (d: { when?: string; text?: string; doctorName?: string; sign?: string })=>void; defaults?: any; initial?: ConsultNote | null }){
  const [form, setForm] = useState({ when: '', text: '', doctorName: '', sign: '' })

  useEffect(()=>{
    if (!open) return
    if (initial) {
      setForm({
        when: initial.when ? new Date(initial.when).toISOString().slice(0,16) : '',
        text: initial.text || '',
        doctorName: initial.doctorName || defaults?.doctorName || '',
        sign: initial.sign || '',
      })
    } else {
      setForm({ when: new Date().toISOString().slice(0,16), text: '', doctorName: defaults?.doctorName || '', sign: '' })
    }
  }, [open, initial])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ when: form.when, text: form.text, doctorName: form.doctorName, sign: form.sign })
  }

  return (
    <ClinicalDialogShell open={open} title={initial ? 'Edit Consultant Note' : 'Add Consultant Note'} subtitle="Clinical Documentation" icon={Stethoscope} onClose={onClose} onSubmit={submit}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <ClinicalDatePicker label="Date/Time" value={form.when} onChange={v=>setForm({...form, when:v})} />
          <div>
            <label className={clinicalLbl}>Doctor Name</label>
            <input value={form.doctorName} onChange={e=>setForm({...form, doctorName:e.target.value})} className={clinicalInp} />
          </div>
          <div>
            <label className={clinicalLbl}>Sign</label>
            <input value={form.sign} onChange={e=>setForm({...form, sign:e.target.value})} className={clinicalInp} />
          </div>
        </div>
        <div>
          <label className={clinicalLbl}>Notes</label>
          <textarea value={form.text} onChange={e=>setForm({...form, text:e.target.value})} rows={6} className={clinicalInp + ' resize-none'}></textarea>
        </div>
      </div>
    </ClinicalDialogShell>
  )
}
