import { useEffect, useState } from 'react'
import { campApi } from '../../features/camp/camp.api'
import { ShieldCheck, Plus, Trash2, Edit3 } from 'lucide-react'

export default function Camp_UserManagement() {
  const [users, setUsers] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ username: '', fullName: '', role: 'admin', password: '', active: true })

  const load = async () => {
    const res: any = await campApi.listUsers()
    setUsers(res?.items || [])
  }

  useEffect(() => { load() }, [])

  const resetForm = () => {
    setForm({ username: '', fullName: '', role: 'admin', password: '', active: true })
    setEditing(null)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) await campApi.updateUser(editing._id, form)
    else await campApi.createUser(form)
    setShowForm(false)
    resetForm()
    load()
  }

  const onEdit = (u: any) => {
    setEditing(u)
    setForm({ username: u.username, fullName: u.fullName || '', role: u.role || 'admin', password: '', active: u.active !== false })
    setShowForm(true)
  }

  const onDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return
    await campApi.deleteUser(id)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-emerald-600" /> User Management</h1>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"><Plus className="h-4 w-4" /> Add User</button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">{editing ? 'Edit User' : 'Add User'}</h2>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Username" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
            <input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Full Name" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500">
              <option value="admin">Admin</option><option value="doctor">Doctor</option><option value="nurse">Nurse</option><option value="pharmacist">Pharmacist</option><option value="lab-tech">Lab Tech</option><option value="coordinator">Coordinator</option>
            </select>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editing ? 'New password (optional)' : 'Password'} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="rounded border-slate-300" /> Active</label>
            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">{editing ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500"><tr><th className="px-6 py-3 font-medium">Username</th><th className="px-6 py-3 font-medium">Full Name</th><th className="px-6 py-3 font-medium">Role</th><th className="px-6 py-3 font-medium">Status</th><th className="px-6 py-3 font-medium text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No users found</td></tr> :
              users.map((u: any) => (
                <tr key={u._id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-800">{u.username}</td>
                  <td className="px-6 py-3">{u.fullName || '-'}</td>
                  <td className="px-6 py-3"><span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 capitalize">{u.role}</span></td>
                  <td className="px-6 py-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${u.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{u.active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-6 py-3 text-right"><div className="flex items-center justify-end gap-2"><button onClick={() => onEdit(u)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Edit3 className="h-4 w-4" /></button><button onClick={() => onDelete(u._id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
