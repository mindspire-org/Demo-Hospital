import React, { useEffect, useState } from 'react'
import { ipdApi } from '../../../../utils/api'
import ConfirmDialog from '../../../common/ConfirmDialog'

export default function OperationNotes({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; when: string; incision?: string; procedure?: string; findings?: string; drain?: string; specimenRemoved?: string; histopathology?: string; conditionAtEnd?: string }>>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<any>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await ipdApi.listIpdSurgeryRecords(encounterId, { status: 'completed', limit: 200 }) as any
      const items = (res.surgeryRecords || []).map((n: any)=>{
        return {
          id: String(n._id),
          when: String(n.surgeryDate || n.createdAt || ''),
          incision: n.intraOpFindings || '',
          procedure: (n.procedures || []).map((p: any) => p.name).join(', ') || '',
          findings: n.intraOpFindings || '',
          drain: n.drainsPlaced || '',
          specimenRemoved: n.specimenDetails || '',
          histopathology: n.specimensSent ? 'Sent' : '',
          conditionAtEnd: n.postOpCondition || '',
        }
      })
      setRows(items)
    }catch{}
  }

  const add = async (d: { when?: string; incision?: string; procedure?: string; findings?: string; drain?: string; specimenRemoved?: string; histopathology?: string; conditionAtEnd?: string }) => {
    try{
      const when = d.when || new Date().toISOString()
      await ipdApi.createIpdSurgeryRecord(encounterId, {
        surgeryDate: when,
        diagnosis: d.findings,
        procedures: d.procedure ? [{ name: d.procedure }] : [],
        intraOpFindings: d.findings,
        drainsPlaced: d.drain,
        specimensSent: !!d.specimenRemoved,
        specimenDetails: d.specimenRemoved,
        postOpCondition: d.conditionAtEnd,
        status: 'completed',
      })
      setOpen(false)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to add operation note') }
  }

  const update = async (d: any) => {
    if (!editingId) return
    try{
      await ipdApi.updateIpdSurgeryRecord(editingId, {
        surgeryDate: d.when || new Date().toISOString(),
        diagnosis: d.findings,
        procedures: d.procedure ? [{ name: d.procedure }] : [],
        intraOpFindings: d.findings,
        drainsPlaced: d.drain,
        specimensSent: !!d.specimenRemoved,
        specimenDetails: d.specimenRemoved,
        postOpCondition: d.conditionAtEnd,
      })
      setEditingId(null); setEditingData(null); await reload()
    }catch(e: any){ alert(e?.message || 'Failed to update operation note') }
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
                <th className="px-3 py-2 font-medium print:hidden">Actions</th>
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
      <OperationDialog key={editingId || 'add'} open={open} onClose={()=>{ setOpen(false); setEditingId(null); setEditingData(null) }} onSave={editingId ? update : add} initial={editingData} />
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Operation Note"
        message="Are you sure you want to delete this operation note?"
        onConfirm={() => { handleDeleteConfirm(); setDeleteConfirmOpen(false) }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null) }}
      />
    </div>
  )
}

function OperationDialog({ open, onClose, onSave, initial }: { open: boolean; onClose: ()=>void; onSave: (d: { when?: string; incision?: string; procedure?: string; findings?: string; drain?: string; specimenRemoved?: string; histopathology?: string; conditionAtEnd?: string })=>void; initial?: any }){
  if(!open) return null
  const now = new Date()
  const defaultDateTime = initial?.when ? new Date(new Date(initial.when).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSave({
      when: String(fd.get('when')||''),
      incision: String(fd.get('incision')||''),
      procedure: String(fd.get('procedure')||''),
      findings: String(fd.get('findings')||''),
      drain: String(fd.get('drain')||''),
      specimenRemoved: String(fd.get('specimenRemoved')||''),
      histopathology: String(fd.get('histopathology')||''),
      conditionAtEnd: String(fd.get('conditionAtEnd')||''),
    })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">{initial ? 'Edit Operation Note' : 'Add Operation Note'}</div>
        <div className="px-5 py-4 text-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="op-when" className="block text-xs font-medium text-slate-600">Date/Time</label>
              <input id="op-when" name="when" type="datetime-local" defaultValue={defaultDateTime} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="op-incision" className="block text-xs font-medium text-slate-600">Incision</label>
              <textarea id="op-incision" name="incision" defaultValue={initial?.incision || ''} className="h-16 w-full rounded-md border border-slate-300 px-3 py-2"></textarea>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="op-procedure" className="block text-xs font-medium text-slate-600">Procedure</label>
              <textarea id="op-procedure" name="procedure" defaultValue={initial?.procedure || ''} className="h-16 w-full rounded-md border border-slate-300 px-3 py-2"></textarea>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="op-findings" className="block text-xs font-medium text-slate-600">Findings</label>
              <textarea id="op-findings" name="findings" defaultValue={initial?.findings || ''} className="h-16 w-full rounded-md border border-slate-300 px-3 py-2"></textarea>
            </div>
            <div>
              <label htmlFor="op-drain" className="block text-xs font-medium text-slate-600">Drain</label>
              <input id="op-drain" name="drain" defaultValue={initial?.drain || ''} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="op-specimen" className="block text-xs font-medium text-slate-600">Specimen (if Removed)</label>
              <input id="op-specimen" name="specimenRemoved" defaultValue={initial?.specimenRemoved || ''} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="op-hp" className="block text-xs font-medium text-slate-600">Histopathology</label>
              <input id="op-hp" name="histopathology" defaultValue={initial?.histopathology || ''} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="op-condition" className="block text-xs font-medium text-slate-600">Condition at the end of surgery</label>
              <textarea id="op-condition" name="conditionAtEnd" defaultValue={initial?.conditionAtEnd || ''} className="h-16 w-full rounded-md border border-slate-300 px-3 py-2"></textarea>
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
