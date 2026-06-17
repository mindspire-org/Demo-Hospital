import { useEffect, useState } from 'react'
import { ipdApi } from '../../../../utils/api'
import ConfirmDialog from '../../../common/ConfirmDialog'

export default function Hospital_IpdAnesAdverseEvents({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; when: string; anyEvent: boolean; details?: string; doctorName?: string }>>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<any>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await ipdApi.listIpdAnesPostOps(encounterId, { limit: 200 }) as any
      const allRows: Array<{ id: string; when: string; anyEvent: boolean; details?: string; doctorName?: string }> = []
      for (const n of (res.anesPostOps || [])) {
        const adverseEvents = n.adverseEvents || []
        if (adverseEvents.length > 0) {
          for (const ae of adverseEvents) {
            allRows.push({
              id: String(n._id),
              when: String(ae.when || n.createdAt || ''),
              anyEvent: !!ae.anyEvent,
              details: ae.details || '',
              doctorName: n.anesthesiologistName || '',
            })
          }
        } else if (n.complications && n.complications.length > 0) {
          allRows.push({
            id: String(n._id),
            when: String(n.createdAt || ''),
            anyEvent: true,
            details: n.complicationDetails || n.complications.join(', '),
            doctorName: n.anesthesiologistName || '',
          })
        }
      }
      setRows(allRows)
    }catch{}
  }

  const add = async (d: { when?: string; anyEvent?: string; details?: string; doctorName?: string }) => {
    try{
      await ipdApi.createIpdAnesPostOp(encounterId, {
        adverseEvents: [{
          when: d.when || new Date().toISOString(),
          anyEvent: d.anyEvent === 'yes',
          details: d.details,
        }],
        complications: d.anyEvent === 'yes' ? [d.details || 'Adverse event'] : [],
        complicationDetails: d.details,
        anesthesiologistName: d.doctorName,
        status: 'completed',
      })
      setOpen(false); await reload()
    }catch(e: any){ alert(e?.message || 'Failed to save adverse event') }
  }

  const update = async (d: any) => {
    if (!editingId) return
    try{
      await ipdApi.updateIpdAnesPostOp(editingId, {
        adverseEvents: [{ when: d.when || new Date().toISOString(), anyEvent: d.anyEvent === 'yes', details: d.details }],
        complications: d.anyEvent === 'yes' ? [d.details || 'Adverse event'] : [],
        complicationDetails: d.details,
        anesthesiologistName: d.doctorName,
      })
      setEditingId(null); setEditingData(null); await reload()
    }catch(e: any){ alert(e?.message || 'Failed to update adverse event') }
  }

  const remove = async (id: string) => {
    setDeleteId(id)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try { await ipdApi.deleteIpdAnesPostOp(deleteId); await reload() } catch (e: any) { alert(e?.message || 'Failed to delete') }
    setDeleteId(null)
  }

  const startEdit = (r: any) => { setEditingId(r.id); setEditingData(r); setOpen(true); }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-2 flex items-center justify-between print:hidden">
        <div className="text-lg font-semibold text-slate-900">Adverse Anesthesia Events</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Event</button>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No adverse events recorded.</div>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.map(r => (
            <li key={r.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <div>{new Date(r.when).toLocaleString()}</div>
                <div className="flex items-center gap-2">
                  <div>{r.doctorName ? `Dr: ${r.doctorName}` : ''}</div>
                  <div className="flex gap-1 print:hidden">
                    <button onClick={() => startEdit(r)} className="rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                    <button onClick={() => remove(r.id)} className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
                  </div>
                </div>
              </div>
              <div className="mt-1">Any event: <span className="font-medium">{r.anyEvent ? 'Yes' : 'No'}</span></div>
              {r.details ? (<div className="mt-1 whitespace-pre-wrap">Details: {r.details}</div>) : null}
            </li>
          ))}
        </ul>
      )}
      <AdverseDialog key={editingId || 'add'} open={open} onClose={()=>{ setOpen(false); setEditingId(null); setEditingData(null) }} onSave={editingId ? update : add} initial={editingData} />
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Adverse Event"
        message="Are you sure you want to delete this adverse event?"
        onConfirm={() => { handleDeleteConfirm(); setDeleteConfirmOpen(false) }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null) }}
      />
    </div>
  )
}

function AdverseDialog({ open, onClose, onSave, initial }: { open: boolean; onClose: ()=>void; onSave: (d: { when?: string; anyEvent?: string; details?: string; doctorName?: string })=>void; initial?: any }){
  const now = new Date()
  const defaultDateTime = initial?.when ? new Date(new Date(initial.when).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
  const [doctorName, setDoctorName] = useState(initial?.doctorName || '')

  useEffect(() => {
    if (open) {
      setDoctorName(initial?.doctorName || '')
    }
  }, [open, initial])

  if (!open) return null

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const get = (k: string) => String(fd.get(k) || '')
    onSave({ when: get('when'), anyEvent: get('anyEvent'), details: get('details'), doctorName })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">{initial ? 'Edit Adverse Event' : 'Record Adverse Event'}</div>
        <div className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="when">Date/Time</label>
            <input id="when" name="when" type="datetime-local" defaultValue={defaultDateTime} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="anyEvent">Any Adverse Event</label>
            <select id="anyEvent" name="anyEvent" defaultValue={initial?.anyEvent ? 'yes' : 'no'} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600" htmlFor="details">Details</label>
            <textarea id="details" name="details" defaultValue={initial?.details || ''} className="h-28 w-full rounded-md border border-slate-300 px-3 py-2"></textarea>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600">Doctor Name</label>
            <input type="text" value={doctorName} onChange={e => setDoctorName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
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
