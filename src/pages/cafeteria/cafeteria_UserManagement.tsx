import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { cafeteriaApi } from '../../features/cafeteria'

export default function Cafeteria_UserManagement() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ username: '', password: '', role: 'admin' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await cafeteriaApi.listUsers()
      setUsers(r?.items || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm({ username: '', password: '', role: 'admin' })
    setShowForm(true)
  }

  function openEdit(u: any) {
    setEditing(u)
    setForm({ username: u.username, password: '', role: u.role })
    setShowForm(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editing) {
        const patch: any = { username: form.username, role: form.role }
        if (form.password) patch.password = form.password
        await cafeteriaApi.updateUser(editing._id, patch)
      } else {
        await cafeteriaApi.createUser(form)
      }
      setShowForm(false)
      load()
    } catch (err: any) { setError(err?.message || 'Save failed') } finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Delete this user?')) return
    try { await cafeteriaApi.deleteUser(id); load() } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">User Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage cafeteria staff accounts</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="px-4 py-3 text-left font-medium text-slate-500">Username</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Role</th>
              <th className="px-4 py-3 text-center font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="py-8 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={3} className="py-8 text-center text-slate-400">No users found</td></tr>
            ) : users.map(u => (
              <tr key={u._id} className="border-b border-slate-50 dark:border-slate-800/50">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{u.username}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{u.role}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openEdit(u)} className="flex h-8 w-8 items-center justify-center rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(u._id)} className="flex h-8 w-8 items-center justify-center rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-slate-900" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">{editing ? 'Edit User' : 'Add User'}</h3>
            {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>}
            <form onSubmit={save} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
                <input type="text" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{editing ? 'New Password (leave blank to keep)' : 'Password'}</label>
                <input type="password" required={!editing} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                  <option value="admin">Admin</option>
                  <option value="cashier">Cashier</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
