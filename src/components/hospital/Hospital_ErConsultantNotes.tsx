import React, { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { ClinicalDialogShell, ClinicalDatePicker, clinicalInp, clinicalLbl } from '../ui/ClinicalDialog'
import { Stethoscope } from 'lucide-react'

export default function Hospital_ErConsultantNotes({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; when: string; text: string; doctorName?: string; sign?: string }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listErClinicalNotes(encounterId, { type: 'consultant', limit: 200 }) as any
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
      await hospitalApi.createErClinicalNote(encounterId, {
        type: 'consultant',
        recordedAt: when,
        doctorName: d.doctorName,
        sign: d.sign,
        data: { text: d.text || '' },
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
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2">Date/Time</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2">Doctor</th>
                <th className="px-3 py-2">Sign</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">{r.when ? new Date(r.when).toLocaleString() : '-'}</td>
                  <td className="px-3 py-2 whitespace-pre-wrap text-slate-800">{r.text || '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.doctorName || '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.sign || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ErConsultDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function ErConsultDialog({ open, onClose, onSave }: { open: boolean; onClose: ()=>void; onSave: (d: { when?: string; text?: string; doctorName?: string; sign?: string })=>void }){
  const [form, setForm] = useState({ when: new Date().toISOString().slice(0,16), text: '', doctorName: '', sign: '' })

  useEffect(()=>{
    if (open) setForm({ when: new Date().toISOString().slice(0,16), text: '', doctorName: '', sign: '' })
  }, [open])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
    onClose()
  }
  return (
    <ClinicalDialogShell open={open} title="Add Consultant Note" subtitle="ER Documentation" icon={Stethoscope} onClose={onClose} onSubmit={submit}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <ClinicalDatePicker label="Date/Time" value={form.when} onChange={v=>setForm({...form,when:v})} />
          <div><label className={clinicalLbl}>Doctor Name</label><input value={form.doctorName} onChange={e=>setForm({...form,doctorName:e.target.value})} placeholder="Doctor name" className={clinicalInp} /></div>
        </div>
        <div><label className={clinicalLbl}>Notes</label><textarea value={form.text} onChange={e=>setForm({...form,text:e.target.value})} rows={4} placeholder="Enter notes..." className={clinicalInp + ' resize-none'}></textarea></div>
        <div><label className={clinicalLbl}>Sign</label><input value={form.sign} onChange={e=>setForm({...form,sign:e.target.value})} placeholder="Signature" className={clinicalInp} /></div>
      </div>
    </ClinicalDialogShell>
  )
}
