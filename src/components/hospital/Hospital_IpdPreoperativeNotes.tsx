import React, { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { ClinicalDialogShell, ClinicalDatePicker, clinicalInp, clinicalLbl } from '../ui/ClinicalDialog'
import { ClipboardList } from 'lucide-react'

export default function PreoperativeNotes({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; when: string; npoFrom?: string; maintainIV?: string; shavePrepare?: string; specialConsent?: string; medication?: string; specialInstructions?: string }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'preop', limit: 200 }) as any
      const items = (res.notes || []).map((n: any)=>{
        const d = n.data || {}
        return {
          id: String(n._id),
          when: String(n.recordedAt || n.createdAt || ''),
          npoFrom: d.npoFrom || '',
          maintainIV: d.maintainIV || '',
          shavePrepare: d.shavePrepare || '',
          specialConsent: d.specialConsent || '',
          medication: d.medication || '',
          specialInstructions: d.specialInstructions || '',
        }
      })
      setRows(items)
    }catch{}
  }

  const add = async (d: { npoFrom?: string; maintainIV?: string; shavePrepare?: string; specialConsent?: string; medication?: string; specialInstructions?: string; when?: string }) => {
    try{
      const when = d.when || new Date().toISOString()
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'preop',
        recordedAt: when,
        data: {
          npoFrom: d.npoFrom,
          maintainIV: d.maintainIV,
          shavePrepare: d.shavePrepare,
          specialConsent: d.specialConsent,
          medication: d.medication,
          specialInstructions: d.specialInstructions,
        },
      })
      setOpen(false)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to add pre-operative note') }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Pre-Operative Notes</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Pre-Op Note</button>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No pre-operative notes yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-medium">Date/Time</th>
                <th className="px-3 py-2 font-medium">NPO From</th>
                <th className="px-3 py-2 font-medium">Maintain I/V Line</th>
                <th className="px-3 py-2 font-medium">Shave & Prepare / Mark Site</th>
                <th className="px-3 py-2 font-medium">Special Consent</th>
                <th className="px-3 py-2 font-medium">Medication</th>
                <th className="px-3 py-2 font-medium">Special Instructions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-xs text-slate-600">{new Date(r.when).toLocaleString()}</td>
                  <td className="px-3 py-2">{r.npoFrom || '-'}</td>
                  <td className="px-3 py-2">{r.maintainIV || '-'}</td>
                  <td className="px-3 py-2">{r.shavePrepare || '-'}</td>
                  <td className="px-3 py-2">{r.specialConsent || '-'}</td>
                  <td className="px-3 py-2">{r.medication || '-'}</td>
                  <td className="px-3 py-2">{r.specialInstructions || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <PreopDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function PreopDialog({ open, onClose, onSave }: { open: boolean; onClose: ()=>void; onSave: (d: { npoFrom?: string; maintainIV?: string; shavePrepare?: string; specialConsent?: string; medication?: string; specialInstructions?: string; when?: string })=>void }){
  const [form, setForm] = useState({ when: new Date().toISOString().slice(0,16), npoFrom: '', maintainIV: '', shavePrepare: '', specialConsent: '', medication: '', specialInstructions: '' })

  useEffect(()=>{
    if (open) setForm({ when: new Date().toISOString().slice(0,16), npoFrom: '', maintainIV: '', shavePrepare: '', specialConsent: '', medication: '', specialInstructions: '' })
  }, [open])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }
  return (
    <ClinicalDialogShell open={open} title="Add Pre-Operative Note" subtitle="Pre-Surgical Orders" icon={ClipboardList} onClose={onClose} onSubmit={submit}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <ClinicalDatePicker label="Date/Time" value={form.when} onChange={v=>setForm({...form,when:v})} />
          <div>
            <label className={clinicalLbl}>NPO From</label>
            <input value={form.npoFrom} onChange={e=>setForm({...form,npoFrom:e.target.value})} placeholder="e.g. 12:00 AM" className={clinicalInp} />
          </div>
          <div>
            <label className={clinicalLbl}>Maintain I/V Line</label>
            <input value={form.maintainIV} onChange={e=>setForm({...form,maintainIV:e.target.value})} placeholder="e.g. Yes / 18G cannula" className={clinicalInp} />
          </div>
          <div>
            <label className={clinicalLbl}>Shave & Prepare / Mark Site</label>
            <input value={form.shavePrepare} onChange={e=>setForm({...form,shavePrepare:e.target.value})} placeholder="details" className={clinicalInp} />
          </div>
          <div>
            <label className={clinicalLbl}>Take Special Consent</label>
            <input value={form.specialConsent} onChange={e=>setForm({...form,specialConsent:e.target.value})} placeholder="e.g. Taken / Pending" className={clinicalInp} />
          </div>
        </div>
        <div>
          <label className={clinicalLbl}>Medication</label>
          <textarea value={form.medication} onChange={e=>setForm({...form,medication:e.target.value})} rows={3} className={clinicalInp + ' resize-none'}></textarea>
        </div>
        <div>
          <label className={clinicalLbl}>Special Instructions</label>
          <textarea value={form.specialInstructions} onChange={e=>setForm({...form,specialInstructions:e.target.value})} rows={3} className={clinicalInp + ' resize-none'}></textarea>
        </div>
      </div>
    </ClinicalDialogShell>
  )
}
