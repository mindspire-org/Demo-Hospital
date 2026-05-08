import React, { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { useEncounterDefaults } from '../../hooks/useEncounterDefaults'
import { ClinicalDialogShell, ClinicalDatePicker, clinicalInp, clinicalLbl } from '../ui/ClinicalDialog'
import { ClipboardList } from 'lucide-react'

export default function PostOperativeOrder({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; when: string; text: string; doctorName?: string; sign?: string }>>([])
  const [open, setOpen] = useState(false)
  const encDefaults = useEncounterDefaults(encounterId)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'postop', limit: 200 }) as any
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
      const when = d.when || new Date().toISOString()
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'postop',
        recordedAt: when,
        doctorName: d.doctorName,
        sign: d.sign,
        data: { text: d.text || '' },
      })
      setOpen(false)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to add post-operative order') }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Post-Operative Order</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Post-Op Order</button>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No post-operative orders yet.</div>
      ) : (
        <ul className="space-y-2 text-sm text-slate-800">
          {rows.map(r => (
            <li key={r.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="whitespace-pre-wrap">{r.text || '-'}</div>
                <div className="text-right text-xs text-slate-600">
                  <div>{new Date(r.when).toLocaleString()}</div>
                  {r.doctorName ? <div>Dr: {r.doctorName}</div> : null}
                  {r.sign ? <div>Sign: {r.sign}</div> : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <PostopDialog open={open} onClose={()=>setOpen(false)} onSave={add} defaults={encDefaults} />
    </div>
  )
}

function PostopDialog({ open, onClose, onSave, defaults }: { open: boolean; onClose: ()=>void; onSave: (d: { when?: string; text?: string; doctorName?: string; sign?: string })=>void; defaults?: any }){
  const [form, setForm] = useState({ when: new Date().toISOString().slice(0,16), text: '', doctorName: '', sign: '' })

  useEffect(()=>{
    if (open) setForm({ when: new Date().toISOString().slice(0,16), text: '', doctorName: defaults?.doctorName || '', sign: '' })
  }, [open])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }
  return (
    <ClinicalDialogShell open={open} title="Add Post-Operative Order" subtitle="Post-Surgical Orders" icon={ClipboardList} onClose={onClose} onSubmit={submit}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <ClinicalDatePicker label="Date/Time" value={form.when} onChange={v=>setForm({...form,when:v})} />
          <div>
            <label className={clinicalLbl}>Doctor Name</label>
            <input value={form.doctorName} onChange={e=>setForm({...form,doctorName:e.target.value})} className={clinicalInp} />
          </div>
          <div>
            <label className={clinicalLbl}>Sign</label>
            <input value={form.sign} onChange={e=>setForm({...form,sign:e.target.value})} className={clinicalInp} />
          </div>
        </div>
        <div>
          <label className={clinicalLbl}>Order</label>
          <textarea value={form.text} onChange={e=>setForm({...form,text:e.target.value})} rows={5} className={clinicalInp + ' resize-none'}></textarea>
        </div>
      </div>
    </ClinicalDialogShell>
  )
}
