import { useEffect, useState } from 'react'
import { campApi } from '../../features/camp/camp.api'
import { UserCog, Plus, Search, Trash2, Edit3 } from 'lucide-react'

export default function Camp_Staff() {
  const [staff, setStaff] = useState<any[]>([])
  const [camps, setCamps] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ campId: '', userId: '', role: 'doctor', fullName: '', phone: '', email: '', startDate: '', endDate: '', shift: 'morning', notes: '' })

  const load = async () => {
    const [s, c] = await Promise.all([
      campApi.listStaff(q ? { q } : {}),
      campApi.listCamps({}),
    ])
    setStaff((s as any)?.items || [])
    setCamps((c as any)?.items || [])
  }

  useEffect(() => { load() }, [q])

  const resetForm = () => {
    setForm({ campId: '', userId: '', role: 'doctor', fullName: '', phone: '', email: '', startDate: '', endDate: '', shift: 'morning', notes: '' })
    setEditing(null)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) await campApi.updateStaff(editing._id, form)
    else await campApi.createStaff(form)
    setShowForm(false)
    resetForm()
    load()
  }

  const onEdit = (item: any) => {
    setEditing(item)
    setForm({
      campId: item.campId || '', userId: item.userId || '', role: item.role || 'doctor',
      fullName: item.fullName || '', phone: item.phone || '', email: item.email || '',
      startDate: item.startDate ? new Date(item.startDate).toISOString().slice(0, 10) : '',
      endDate: item.endDate ? new Date(item.endDate).toISOString().slice(0, 10) : '',
      shift: item.shift || 'morning', notes: item.notes || '',
    })
    setShowForm(true)
  }

  const onDelete = async (id: string) => {
    if (!confirm('Remove this staff assignment?')) return
    await campApi.deleteStaff(id)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><UserCog className="h-6 w-6 text-emerald-600" /> Staff</h1>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"><Plus className="h-4 w-4" /> Assign Staff</button>
      </div>
      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search staff..." className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm outline-none focus:border-emerald-500" /></div>

      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">{editing ? 'Edit Assignment' : 'Assign Staff'}</h2>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select required value={form.campId} onChange={e => setForm({ ...form, campId: e.target.value })} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"><option value="">Select Camp</option>{camps.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
            <input required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Full Name" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
            <select required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500">
              <option value="doctor">Doctor</option><option value="nurse">Nurse</option><option value="pharmacist">Pharmacist</option><option value="lab-tech">Lab Tech</option><option value="coordinator">Coordinator</option>
            </select>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
            <input value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })} placeholder="Shift (morning/evening/night)" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
            <input type="date" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
            <input type="date" required value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="md:col-span-3 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" rows={2} />
            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">{editing ? 'Update' : 'Assign'}</button>
              <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500"><tr><th className="px-6 py-3 font-medium">Name</th><th className="px-6 py-3 font-medium">Role</th><th className="px-6 py-3 font-medium">Camp</th><th className="px-6 py-3 font-medium">Dates</th><th className="px-6 py-3 font-medium">Shift</th><th className="px-6 py-3 font-medium text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {staff.length === 0 ? <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No staff assigned</td></tr> :
              staff.map((s: any) => (
                <tr key={s._id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-800">{s.fullName}</td>
                  <td className="px-6 py-3"><span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 capitalize">{s.role}</span></td>
                  <td className="px-6 py-3 text-slate-500">{camps.find((c: any) => c._id === s.campId)?.name || s.campId}</td>
                  <td className="px-6 py-3 text-slate-500 text-xs">{new Date(s.startDate).toLocaleDateString()} - {new Date(s.endDate).toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-slate-500 text-xs capitalize">{s.shift}</td>
                  <td className="px-6 py-3 text-right"><div className="flex items-center justify-end gap-2"><button onClick={() => onEdit(s)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Edit3 className="h-4 w-4" /></button><button onClick={() => onDelete(s._id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
