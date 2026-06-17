import React, { useEffect, useState } from 'react'
import { ipdApi } from '../../../../utils/api'
import ConfirmDialog from '../../../common/ConfirmDialog'

export default function PreoperativeNotes({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; when: string; npoFrom?: string; maintainIV?: string; shavePrepare?: string; specialConsent?: string; medication?: string; specialInstructions?: string }>>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<any>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await ipdApi.listIpdSurgeryRecords(encounterId, { status: 'scheduled', limit: 200 }) as any
      const items = (res.surgeryRecords || []).map((n: any)=>{
        const checklist = n.preOpChecklist || {}
        return {
          id: String(n._id),
          when: String(n.surgeryDate || n.createdAt || ''),
          npoFrom: checklist.npoStatus || '',
          maintainIV: checklist.ivAccess || '',
          shavePrepare: checklist.sitePreparation || '',
          specialConsent: checklist.consentStatus || '',
          medication: checklist.preOpMedications || '',
          specialInstructions: n.preOpNotes || '',
        }
      })
      setRows(items)
    }catch{}
  }

  const add = async (d: { npoFrom?: string; maintainIV?: string; shavePrepare?: string; specialConsent?: string; medication?: string; specialInstructions?: string; when?: string }) => {
    try{
      const when = d.when || new Date().toISOString()
      await ipdApi.createIpdSurgeryRecord(encounterId, {
        surgeryDate: when,
        preOpNotes: d.specialInstructions,
        preOpChecklist: {
          npoStatus: d.npoFrom,
          ivAccess: d.maintainIV,
          sitePreparation: d.shavePrepare,
          consentStatus: d.specialConsent,
          preOpMedications: d.medication,
        },
        status: 'scheduled',
      })
      setOpen(false)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to add pre-operative note') }
  }

  const update = async (d: any) => {
    if (!editingId) return
    try{
      await ipdApi.updateIpdSurgeryRecord(editingId, {
        surgeryDate: d.when || new Date().toISOString(),
        preOpNotes: d.specialInstructions,
        preOpChecklist: { npoStatus: d.npoFrom, ivAccess: d.maintainIV, sitePreparation: d.shavePrepare, consentStatus: d.specialConsent, preOpMedications: d.medication },
      })
      setEditingId(null); setEditingData(null); await reload()
    }catch(e: any){ alert(e?.message || 'Failed to update pre-operative note') }
  }

  const remove = async (id: string) => {
    setDeleteId(id)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try { await ipdApi.deleteIpdSurgeryRecord(deleteId); await reload() } catch (e: any) { alert(e?.message || 'Failed to delete') }
    setDeleteId(null)
  }

  const startEdit = (r: any) => { setEditingId(r.id); setEditingData(r); setOpen(true); }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-2 flex items-center justify-between print:hidden">
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
                <th className="px-3 py-2 font-medium print:hidden">Actions</th>
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
                  <td className="px-3 py-2 print:hidden">
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(r)} className="rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                      <button onClick={() => remove(r.id)} className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <PreopDialog key={editingId || 'add'} open={open} onClose={()=>{ setOpen(false); setEditingId(null); setEditingData(null) }} onSave={editingId ? update : add} initial={editingData} />
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Pre-Operative Note"
        message="Are you sure you want to delete this pre-operative note?"
        onConfirm={() => { handleDeleteConfirm(); setDeleteConfirmOpen(false) }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null) }}
      />
    </div>
  )
}

function PreopDialog({ open, onClose, onSave, initial }: { open: boolean; onClose: ()=>void; onSave: (d: { npoFrom?: string; maintainIV?: string; shavePrepare?: string; specialConsent?: string; medication?: string; specialInstructions?: string; when?: string })=>void; initial?: any }){
  if(!open) return null
  const now = new Date()
  const defaultDateTime = initial?.when ? new Date(new Date(initial.when).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSave({
      when: String(fd.get('when')||''),
      npoFrom: String(fd.get('npoFrom')||''),
      maintainIV: String(fd.get('maintainIV')||''),
      shavePrepare: String(fd.get('shavePrepare')||''),
      specialConsent: String(fd.get('specialConsent')||''),
      medication: String(fd.get('medication')||''),
      specialInstructions: String(fd.get('specialInstructions')||''),
    })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">{initial ? 'Edit Pre-Operative Note' : 'Add Pre-Operative Note'}</div>
        <div className="px-5 py-4 text-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="preop-when" className="block text-xs font-medium text-slate-600">Date/Time</label>
              <input id="preop-when" name="when" type="datetime-local" defaultValue={defaultDateTime} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="preop-npo" className="block text-xs font-medium text-slate-600">NPO From</label>
              <input id="preop-npo" name="npoFrom" defaultValue={initial?.npoFrom || ''} placeholder="e.g. 12:00 AM" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="preop-iv" className="block text-xs font-medium text-slate-600">Maintain I/V Line</label>
              <input id="preop-iv" name="maintainIV" defaultValue={initial?.maintainIV || ''} placeholder="e.g. Yes / 18G cannula" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="preop-shave" className="block text-xs font-medium text-slate-600">Shave & prepare / mark site</label>
              <input id="preop-shave" name="shavePrepare" defaultValue={initial?.shavePrepare || ''} placeholder="details" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="preop-consent" className="block text-xs font-medium text-slate-600">Take Special Consent</label>
              <input id="preop-consent" name="specialConsent" defaultValue={initial?.specialConsent || ''} placeholder="e.g. Taken / Pending" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="preop-medication" className="block text-xs font-medium text-slate-600">Medication</label>
              <textarea id="preop-medication" name="medication" defaultValue={initial?.medication || ''} className="h-20 w-full rounded-md border border-slate-300 px-3 py-2"></textarea>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="preop-instructions" className="block text-xs font-medium text-slate-600">Special Instructions</label>
              <textarea id="preop-instructions" name="specialInstructions" defaultValue={initial?.specialInstructions || ''} className="h-20 w-full rounded-md border border-slate-300 px-3 py-2"></textarea>
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
