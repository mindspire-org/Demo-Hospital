import React, { useEffect, useState } from 'react'
import { ipdApi } from '../../../../utils/api'
import ConfirmDialog from '../../../common/ConfirmDialog'

export default function PostOperativeOrder({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; when: string; text: string; doctorName?: string; sign?: string }>>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<any>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await ipdApi.listIpdSurgeryRecords(encounterId, { status: 'postop', limit: 200 }) as any
      const items = (res.surgeryRecords || []).map((n: any)=>({
        id: String(n._id),
        when: String(n.surgeryDate || n.createdAt || ''),
        text: String(n.postOpInstructions || ''),
        doctorName: n.surgeonName || '',
        sign: n.surgeonSign || '',
      }))
      setRows(items)
    }catch{}
  }

  const add = async (d: { when?: string; text?: string; doctorName?: string; sign?: string }) => {
    try{
      const when = d.when || new Date().toISOString()
      await ipdApi.createIpdSurgeryRecord(encounterId, {
        surgeryDate: when,
        postOpInstructions: d.text || '',
        surgeonName: d.doctorName,
        surgeonSign: d.sign,
        status: 'postop',
      })
      setOpen(false)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to add post-operative order') }
  }

  const update = async (d: any) => {
    if (!editingId) return
    try{
      await ipdApi.updateIpdSurgeryRecord(editingId, {
        surgeryDate: d.when || new Date().toISOString(),
        postOpInstructions: d.text || '',
        surgeonName: d.doctorName,
        surgeonSign: d.sign,
      })
      setEditingId(null); setEditingData(null); await reload()
    }catch(e: any){ alert(e?.message || 'Failed to update post-operative order') }
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
                  <div className="flex gap-1 print:hidden mt-1 justify-end">
                    <button onClick={() => startEdit(r)} className="rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                    <button onClick={() => remove(r.id)} className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <PostopDialog key={editingId || 'add'} open={open} onClose={()=>{ setOpen(false); setEditingId(null); setEditingData(null) }} onSave={editingId ? update : add} initial={editingData} />
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Post-Operative Order"
        message="Are you sure you want to delete this post-operative order?"
        onConfirm={() => { handleDeleteConfirm(); setDeleteConfirmOpen(false) }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null) }}
      />
    </div>
  )
}

function PostopDialog({ open, onClose, onSave, initial }: { open: boolean; onClose: ()=>void; onSave: (d: { when?: string; text?: string; doctorName?: string; sign?: string })=>void; initial?: any }){
  if(!open) return null
  const now = new Date()
  const defaultDateTime = initial?.when ? new Date(new Date(initial.when).getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
  const [form, setForm] = useState({
    when: defaultDateTime,
    text: '',
    doctorName: '',
    sign: '',
  })

  useEffect(() => {
    if (open) {
      setForm({
        when: defaultDateTime,
        text: initial?.text || '',
        doctorName: initial?.doctorName || '',
        sign: initial?.sign || '',
      })
    }
  }, [open, initial])

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSave(form)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">{initial ? 'Edit Post-Operative Order' : 'Add Post-Operative Order'}</div>
        <div className="px-5 py-4 text-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="postop-when" className="block text-xs font-medium text-slate-600">Date/Time</label>
              <input id="postop-when" name="when" type="datetime-local" defaultValue={defaultDateTime} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="postop-doctor" className="block text-xs font-medium text-slate-600">Doctor Name</label>
              <input id="postop-doctor" name="doctorName" defaultValue={initial?.doctorName || ''} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="postop-sign" className="block text-xs font-medium text-slate-600">Sign</label>
              <input id="postop-sign" name="sign" defaultValue={initial?.sign || ''} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="postop-text" className="block text-xs font-medium text-slate-600">Order</label>
              <textarea id="postop-text" name="text" defaultValue={initial?.text || ''} className="h-32 w-full rounded-md border border-slate-300 px-3 py-2"></textarea>
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
