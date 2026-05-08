import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Plus, Search } from 'lucide-react'
import { api } from '../../api'

type Lab = {
  _id?: string
  name: string
  code?: string
  address?: string
  contactPerson?: string
  phone?: string
  email?: string
  shareMode: 'percent' | 'amount'
  status: 'Active' | 'Inactive'
  notes?: string
}

export default function Lab_OutsourceLabs() {
  const [items, setItems] = useState<Lab[]>([])
  const [editing, setEditing] = useState<Lab | null>(null)
  const [q, setQ] = useState('')

  async function load() {
    const r = await api('/lab/outsource-labs')
    setItems(r.items || [])
  }
  useEffect(() => { load() }, [])

  async function save(l: Lab) {
    if (l._id) await api(`/lab/outsource-labs/${l._id}`, { method: 'PUT', body: JSON.stringify(l) })
    else await api('/lab/outsource-labs', { method: 'POST', body: JSON.stringify(l) })
    setEditing(null); load()
  }
  async function del(id?: string) {
    if (!id || !confirm('Delete?')) return
    await api(`/lab/outsource-labs/${id}`, { method: 'DELETE' }); load()
  }

  const rows = useMemo(() => {
    const f = q.trim().toLowerCase()
    if (!f) return items
    return items.filter(l => (l.name || '').toLowerCase().includes(f) || (l.code || '').toLowerCase().includes(f) || (l.contactPerson || '').toLowerCase().includes(f) || (l.phone || '').toLowerCase().includes(f))
  }, [items, q])

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-violet-600 via-sky-600 to-emerald-500 p-5 text-white shadow-lg shadow-sky-200/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Outsource Laboratories</h2>
            <div className="mt-0.5 text-sm text-sky-100">Manage external labs and rate lists</div>
          </div>
          <button onClick={() => setEditing({ name: '', shareMode: 'percent', status: 'Active' })} className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/30">
            <Plus className="h-4 w-4" /> Add Lab
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-white p-4 shadow-sm">
            <div className="text-xs font-medium text-emerald-700">Total Labs</div>
            <div className="text-3xl font-extrabold tracking-tight text-emerald-900">{items.length}</div>
          </div>
          <div className="rounded-xl border border-sky-200 bg-linear-to-br from-sky-50 to-white p-4 shadow-sm">
            <div className="text-xs font-medium text-sky-700">Active</div>
            <div className="text-3xl font-extrabold tracking-tight text-sky-900">{items.filter(x => x.status === 'Active').length}</div>
          </div>
          <div className="rounded-xl border border-rose-200 bg-linear-to-br from-rose-50 to-white p-4 shadow-sm">
            <div className="text-xs font-medium text-rose-700">Inactive</div>
            <div className="text-3xl font-extrabold tracking-tight text-rose-900">{items.filter(x => x.status === 'Inactive').length}</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search lab name, code, contact, phone..." className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
          </div>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-slate-200 bg-slate-50">
            <tr className="text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Share</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!rows.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No outsource labs found.</td></tr>}
            {rows.map(l => (
              <tr key={l._id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-semibold text-slate-900">{l.name}</td>
                <td className="px-4 py-3 text-slate-700">{l.code || '-'}</td>
                <td className="px-4 py-3 text-slate-700">{l.contactPerson || '-'}</td>
                <td className="px-4 py-3 text-slate-700">{l.phone || '-'}</td>
                <td className="px-4 py-3 text-slate-700">{l.shareMode}</td>
                <td className="px-4 py-3">
                  {l.status === 'Active' ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">Active</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setEditing(l)}>Edit</button>
                    <button className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100" onClick={() => del(l._id)}>Delete</button>
                    <a className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100" href={`/lab/outsource-rates?labId=${l._id}`}>
                      Rate list <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <Editor value={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  )
}

function Editor({ value, onClose, onSave }: { value: Lab; onClose: () => void; onSave: (l: Lab) => void }) {
  const [v, setV] = useState<Lab>(value)
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-xl rounded bg-white p-4 shadow-xl">
        <h3 className="mb-3 font-semibold">{v._id ? 'Edit' : 'Add'} outsource lab</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="block"><span className="text-xs">Name *</span><input value={v.name} onChange={e => setV({ ...v, name: e.target.value })} className="w-full rounded border px-2 py-1" /></label>
          <label className="block"><span className="text-xs">Code</span><input value={v.code || ''} onChange={e => setV({ ...v, code: e.target.value })} className="w-full rounded border px-2 py-1" /></label>
          <label className="col-span-2 block"><span className="text-xs">Address</span><input value={v.address || ''} onChange={e => setV({ ...v, address: e.target.value })} className="w-full rounded border px-2 py-1" /></label>
          <label className="block"><span className="text-xs">Contact person</span><input value={v.contactPerson || ''} onChange={e => setV({ ...v, contactPerson: e.target.value })} className="w-full rounded border px-2 py-1" /></label>
          <label className="block"><span className="text-xs">Phone</span><input value={v.phone || ''} onChange={e => setV({ ...v, phone: e.target.value })} className="w-full rounded border px-2 py-1" /></label>
          <label className="block"><span className="text-xs">Email</span><input value={v.email || ''} onChange={e => setV({ ...v, email: e.target.value })} className="w-full rounded border px-2 py-1" /></label>
          <label className="block"><span className="text-xs">Share mode</span>
            <select value={v.shareMode} onChange={e => setV({ ...v, shareMode: e.target.value as any })} className="w-full rounded border px-2 py-1">
              <option value="percent">Percent</option><option value="amount">Amount</option>
            </select>
          </label>
          <label className="block"><span className="text-xs">Status</span>
            <select value={v.status} onChange={e => setV({ ...v, status: e.target.value as any })} className="w-full rounded border px-2 py-1">
              <option value="Active">Active</option><option value="Inactive">Inactive</option>
            </select>
          </label>
          <label className="col-span-2 block"><span className="text-xs">Notes</span><textarea value={v.notes || ''} onChange={e => setV({ ...v, notes: e.target.value })} className="w-full rounded border px-2 py-1" rows={2} /></label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => onSave(v)} className="rounded bg-blue-700 px-4 py-1.5 text-sm text-white">Save</button>
          <button onClick={onClose} className="rounded border px-4 py-1.5 text-sm">Close</button>
        </div>
      </div>
    </div>
  )
}
