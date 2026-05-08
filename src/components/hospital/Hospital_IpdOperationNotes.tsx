import React, { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { ClinicalDialogShell, ClinicalDatePicker, clinicalInp, clinicalLbl } from '../ui/ClinicalDialog'
import { Stethoscope } from 'lucide-react'

export default function OperationNotes({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; when: string; incision?: string; procedure?: string; findings?: string; drain?: string; specimenRemoved?: string; histopathology?: string; conditionAtEnd?: string }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'operation', limit: 200 }) as any
      const items = (res.notes || []).map((n: any)=>{
        const d = n.data || {}
        return {
          id: String(n._id),
          when: String(n.recordedAt || n.createdAt || ''),
          incision: d.incision || '',
          procedure: d.procedure || '',
          findings: d.findings || '',
          drain: d.drain || '',
          specimenRemoved: d.specimenRemoved || '',
          histopathology: d.histopathology || '',
          conditionAtEnd: d.conditionAtEnd || '',
        }
      })
      setRows(items)
    }catch{}
  }

  const add = async (d: { when?: string; incision?: string; procedure?: string; findings?: string; drain?: string; specimenRemoved?: string; histopathology?: string; conditionAtEnd?: string }) => {
    try{
      const when = d.when || new Date().toISOString()
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'operation',
        recordedAt: when,
        data: {
          incision: d.incision,
          procedure: d.procedure,
          findings: d.findings,
          drain: d.drain,
          specimenRemoved: d.specimenRemoved,
          histopathology: d.histopathology,
          conditionAtEnd: d.conditionAtEnd,
        },
      })
      setOpen(false)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to add operation note') }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Operation Notes</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Operation Note</button>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No operation notes yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-medium">Date/Time</th>
                <th className="px-3 py-2 font-medium">Incision</th>
                <th className="px-3 py-2 font-medium">Procedure</th>
                <th className="px-3 py-2 font-medium">Findings</th>
                <th className="px-3 py-2 font-medium">Drain</th>
                <th className="px-3 py-2 font-medium">Specimen (if Removed)</th>
                <th className="px-3 py-2 font-medium">Histopathology</th>
                <th className="px-3 py-2 font-medium">Condition at end</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-xs text-slate-600">{new Date(r.when).toLocaleString()}</td>
                  <td className="px-3 py-2">{r.incision || '-'}</td>
                  <td className="px-3 py-2">{r.procedure || '-'}</td>
                  <td className="px-3 py-2">{r.findings || '-'}</td>
                  <td className="px-3 py-2">{r.drain || '-'}</td>
                  <td className="px-3 py-2">{r.specimenRemoved || '-'}</td>
                  <td className="px-3 py-2">{r.histopathology || '-'}</td>
                  <td className="px-3 py-2">{r.conditionAtEnd || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <OperationDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function OperationDialog({ open, onClose, onSave }: { open: boolean; onClose: ()=>void; onSave: (d: { when?: string; incision?: string; procedure?: string; findings?: string; drain?: string; specimenRemoved?: string; histopathology?: string; conditionAtEnd?: string })=>void }){
  const [form, setForm] = useState({ when: new Date().toISOString().slice(0,16), incision: '', procedure: '', findings: '', drain: '', specimenRemoved: '', histopathology: '', conditionAtEnd: '' })

  useEffect(()=>{
    if (open) setForm({ when: new Date().toISOString().slice(0,16), incision: '', procedure: '', findings: '', drain: '', specimenRemoved: '', histopathology: '', conditionAtEnd: '' })
  }, [open])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }
  return (
    <ClinicalDialogShell open={open} title="Add Operation Note" subtitle="Surgical Record" icon={Stethoscope} onClose={onClose} onSubmit={submit} maxWidth="max-w-4xl">
      <div className="space-y-4">
        <ClinicalDatePicker label="Date/Time" value={form.when} onChange={v=>setForm({...form,when:v})} />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={clinicalLbl}>Incision</label>
            <textarea rows={2} value={form.incision} onChange={e=>setForm({...form,incision:e.target.value})} className={clinicalInp + ' resize-none'}></textarea>
          </div>
          <div>
            <label className={clinicalLbl}>Procedure</label>
            <textarea rows={2} value={form.procedure} onChange={e=>setForm({...form,procedure:e.target.value})} className={clinicalInp + ' resize-none'}></textarea>
          </div>
        </div>
        <div>
          <label className={clinicalLbl}>Findings</label>
          <textarea rows={2} value={form.findings} onChange={e=>setForm({...form,findings:e.target.value})} className={clinicalInp + ' resize-none'}></textarea>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={clinicalLbl}>Drain</label>
            <input value={form.drain} onChange={e=>setForm({...form,drain:e.target.value})} className={clinicalInp} />
          </div>
          <div>
            <label className={clinicalLbl}>Specimen (if Removed)</label>
            <input value={form.specimenRemoved} onChange={e=>setForm({...form,specimenRemoved:e.target.value})} className={clinicalInp} />
          </div>
          <div>
            <label className={clinicalLbl}>Histopathology</label>
            <input value={form.histopathology} onChange={e=>setForm({...form,histopathology:e.target.value})} className={clinicalInp} />
          </div>
        </div>
        <div>
          <label className={clinicalLbl}>Condition at the End of Surgery</label>
          <textarea rows={2} value={form.conditionAtEnd} onChange={e=>setForm({...form,conditionAtEnd:e.target.value})} className={clinicalInp + ' resize-none'}></textarea>
        </div>
      </div>
    </ClinicalDialogShell>
  )
}
