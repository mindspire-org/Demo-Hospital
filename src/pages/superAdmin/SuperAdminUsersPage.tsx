import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { superAdminApi } from '../../features/superAdmin'
import { ArrowLeft, Home, Users, Plus, Trash2, Loader2 } from 'lucide-react'

export default function SuperAdminUsersPage() {
  const navigate = useNavigate()
  const [admins, setAdmins] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [masterKey, setMasterKey] = useState('')
  const [newUser, setNewUser] = useState({ username: '', password: '', fullName: '', email: '', phone: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => { loadAdmins() }, [])

  async function loadAdmins() {
    setLoading(true)
    try {
      const data = await superAdminApi.listSuperAdmins()
      setAdmins(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load admins')
    } finally { setLoading(false) }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true); setError('')
    try {
      await superAdminApi.createSuperAdmin(newUser, masterKey)
      setShowCreate(false)
      setNewUser({ username: '', password: '', fullName: '', email: '', phone: '' })
      setMasterKey('')
      await loadAdmins()
    } catch (err: any) { setError(err?.message || 'Failed to create admin') }
    finally { setCreating(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this admin?')) return
    try { await superAdminApi.deleteSuperAdmin(id); await loadAdmins() }
    catch (err: any) { setError(err?.message || 'Failed to delete admin') }
  }

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/super-admin')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </button>
            <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" title="Home">
              <Home className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </button>
            <Users className="h-5 w-5 text-amber-600" />
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Super Admin Users</h1>
          </div>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 text-sm transition-colors">
            <Plus className="h-4 w-4" /> Add Admin
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-6">
        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">{error}</div>}

        {showCreate && (
          <form onSubmit={handleCreate} className="mb-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Create New Super Admin</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input required value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} placeholder="Username" className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
              <input required type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="Password" className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
              <input value={newUser.fullName} onChange={e => setNewUser(p => ({ ...p, fullName: e.target.value }))} placeholder="Full Name" className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
              <input type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="Email" className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
              <input value={newUser.phone} onChange={e => setNewUser(p => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
              <input type="password" value={masterKey} onChange={e => setMasterKey(e.target.value)} placeholder="Your Master Key (optional if logged in)" className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={creating} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 text-sm disabled:opacity-50">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Username</th>
                  <th className="text-left px-4 py-3 font-medium">Full Name</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {admins.map((a: any) => (
                  <tr key={a._id}>
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-medium">{a.username}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{a.fullName || '-'}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{a.email || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full text-xs px-2 py-0.5 font-medium ${a.active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {a.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(a._id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No super admins found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
