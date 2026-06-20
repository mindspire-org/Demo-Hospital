import { useEffect, useState } from 'react'
import { campApi } from '../../features/camp/camp.api'
import { MapPin, Plus, Search, Trash2, Edit3 } from 'lucide-react'

export default function Camp_Schedule() {
  const [camps, setCamps] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ name: '', location: '', address: '', startDate: '', endDate: '', organizer: '', contactPhone: '', description: '', expectedPatients: '' })

  const load = async () => {
    const res: any = await campApi.listCamps({ status: statusFilter, q })
    setCamps(res?.items || [])
  }

  useEffect(() => { load() }, [q, statusFilter])

  const resetForm = () => {
    setForm({ name: '', location: '', address: '', startDate: '', endDate: '', organizer: '', contactPhone: '', description: '', expectedPatients: '' })
    setEditing(null)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, expectedPatients: Number(form.expectedPatients) || 0 }
    if (editing) {
      await campApi.updateCamp(editing._id, payload)
    } else {
      await campApi.createCamp(payload)
    }
    setShowForm(false)
    resetForm()
    load()
  }

  const onEdit = (item: any) => {
    setEditing(item)
    setForm({
      name: item.name || '',
      location: item.location || '',
      address: item.address || '',
      startDate: item.startDate ? new Date(item.startDate).toISOString().slice(0, 16) : '',
      endDate: item.endDate ? new Date(item.endDate).toISOString().slice(0, 16) : '',
      organizer: item.organizer || '',
      contactPhone: item.contactPhone || '',
      description: item.description || '',
      expectedPatients: String(item.expectedPatients || ''),
    })
    setShowForm(true)
  }

  const onDelete = async (id: string) => {
    if (!confirm('Delete this camp?')) return
    await campApi.deleteCamp(id)
    load()
  }

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      planned: 'bg-slate-100 text-slate-700',
      active: 'bg-emerald-50 text-emerald-700',
      completed: 'bg-sky-50 text-sky-700',
      cancelled: 'bg-rose-50 text-rose-700',
    }
    return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${map[s] || map.planned}`}>{s}</span>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Camp Schedule</h1>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> New Camp
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search camps..." className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500">
          <option value="">All Status</option>
          <option value="planned">Planned</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">{editing ? 'Edit Camp' : 'New Camp'}</h2>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Camp Name" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
            <input required value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Location / City" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full Address" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
            <input value={form.organizer} onChange={e => setForm({ ...form, organizer: e.target.value })} placeholder="Organizer" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
            <input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} placeholder="Contact Phone" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
            <input type="number" value={form.expectedPatients} onChange={e => setForm({ ...form, expectedPatients: e.target.value })} placeholder="Expected Patients" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
            <input type="datetime-local" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
            <input type="datetime-local" required value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description / Notes" className="md:col-span-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" rows={3} />
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">{editing ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Location</th>
              <th className="px-6 py-3 font-medium">Dates</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {camps.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No camps found</td></tr>
            ) : (
              camps.map((c: any) => (
                <tr key={c._id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <div className="font-medium text-slate-800">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.organizer}</div>
                  </td>
                  <td className="px-6 py-3 text-slate-600">
                    <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.location}</div>
                  </td>
                  <td className="px-6 py-3 text-slate-500 text-xs">
                    {new Date(c.startDate).toLocaleDateString()} - {new Date(c.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">{statusBadge(c.status)}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onEdit(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Edit3 className="h-4 w-4" /></button>
                      <button onClick={() => onDelete(c._id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
