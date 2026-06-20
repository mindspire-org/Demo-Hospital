import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home, Users, Plus, Trash2, Loader2, KeyRound, Pencil, LogOut,
  Stethoscope, FlaskConical, Pill, FileText, UsersRound, Microscope, Building2,
  Droplets, Sparkles, Search, X
} from 'lucide-react'
import { useAdminAuth } from '../../hooks/useAdminAuth'
import { adminUsersApi } from '../../features/admin/adminUsers.api'
import { useSystemConfig } from '../../contexts/SystemConfigContext'
import Toast, { type ToastState } from '../../components/ui/Toast'

// Map portal API keys to module registry IDs
const PORTAL_TO_MODULE: Record<string, string> = {
  hospital: 'hospital',
  reception: 'reception',
  lab: 'lab',
  pharmacy: 'pharmacy',
  'indoor-pharmacy': 'indoorPharmacy',
  finance: 'finance',
  dialysis: 'dialysis',
  diagnostic: 'diagnostic',
  aesthetic: 'aesthetic',
}

interface UserItem {
  _id: string
  username: string
  role: string
  fullName?: string
  email?: string
  phone?: string
  active?: boolean
  createdAt?: string
  updatedAt?: string
}

const PORTAL_ICONS: Record<string, React.ReactNode> = {
  hospital: <Stethoscope className="h-4 w-4" />,
  reception: <UsersRound className="h-4 w-4" />,
  lab: <FlaskConical className="h-4 w-4" />,
  pharmacy: <Pill className="h-4 w-4" />,
  'indoor-pharmacy': <Building2 className="h-4 w-4" />,
  finance: <FileText className="h-4 w-4" />,
  dialysis: <Droplets className="h-4 w-4" />,
  diagnostic: <Microscope className="h-4 w-4" />,
  aesthetic: <Sparkles className="h-4 w-4" />,
}

export default function AdminUserManagementPage() {
  const navigate = useNavigate()
  const { logout } = useAdminAuth()
  const { getModuleEnabled } = useSystemConfig()
  const [activePortal, setActivePortal] = useState('')
  const [portals, setPortals] = useState<Record<string, string>>({})
  const [roles, setRoles] = useState<Record<string, string[]>>({})
  const [users, setUsers] = useState<Record<string, UserItem[]>>({})
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<ToastState>(null)

  // Modal states
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetTarget, setResetTarget] = useState<{ portal: string; id: string; username: string } | null>(null)
  const [newPassword, setNewPassword] = useState('123')
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [form, setForm] = useState({
    username: '', password: '', role: '', fullName: '', email: '', phone: '',
  })

  const isPortalEnabled = (portalKey: string) => {
    const moduleId = PORTAL_TO_MODULE[portalKey]
    if (!moduleId) return false
    return getModuleEnabled(moduleId)
  }

  async function load() {
    setLoading(true)
    try {
      const data = await adminUsersApi.listAllUsers()
      // Exclude super-admin AND hidden/disabled portals
      const filteredPortals: Record<string, string> = {}
      const filteredRoles: Record<string, string[]> = {}
      const filteredUsers: Record<string, UserItem[]> = {}

      for (const [key, label] of Object.entries(data.portals || {})) {
        if (key === 'super-admin') continue
        if (!isPortalEnabled(key)) continue
        filteredPortals[key] = label as string
        filteredRoles[key] = (data.roles || {})[key] || []
        filteredUsers[key] = (data.users || {})[key] || []
      }

      setPortals(filteredPortals)
      setRoles(filteredRoles)
      setUsers(filteredUsers)

      // Default active portal to first enabled one
      const enabledKeys = Object.keys(filteredPortals)
      if (enabledKeys.length > 0 && (!activePortal || !filteredPortals[activePortal])) {
        setActivePortal(enabledKeys[0])
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to load users' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filteredUsers = useMemo(() => {
    const list = users[activePortal] || []
    if (!search.trim()) return list
    const q = search.trim().toLowerCase()
    return list.filter(
      (u) =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q) ||
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
    )
  }, [users, activePortal, search])

  function openCreate() {
    setForm({ username: '', password: '', role: (roles[activePortal] || [])[0] || '', fullName: '', email: '', phone: '' })
    setShowCreate(true)
  }

  function openEdit(user: UserItem) {
    setEditingUser(user)
    setForm({
      username: user.username || '',
      password: '',
      role: user.role || '',
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
    })
    setShowEdit(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.username || !form.password || !form.role) {
      setToast({ type: 'error', message: 'Username, password, and role are required' })
      return
    }
    try {
      await adminUsersApi.createUser({
        portal: activePortal,
        username: form.username,
        password: form.password,
        role: form.role,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
      })
      setToast({ type: 'success', message: 'User created successfully' })
      setShowCreate(false)
      await load()
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to create user' })
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return
    try {
      const payload: any = { username: form.username, role: form.role }
      if (form.fullName) payload.fullName = form.fullName
      if (form.email) payload.email = form.email
      if (form.phone) payload.phone = form.phone
      if (form.password) payload.password = form.password
      await adminUsersApi.updateUser(activePortal, editingUser._id, payload)
      setToast({ type: 'success', message: 'User updated successfully' })
      setShowEdit(false)
      await load()
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to update user' })
    }
  }

  async function handleDelete(portal: string, id: string) {
    if (!confirm('Are you sure you want to delete this user?')) return
    try {
      await adminUsersApi.deleteUser(portal, id)
      setToast({ type: 'success', message: 'User deleted' })
      await load()
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to delete user' })
    }
  }

  function openReset(user: UserItem) {
    setResetTarget({ portal: activePortal, id: user._id, username: user.username })
    setNewPassword('123')
    setShowReset(true)
  }

  async function doReset() {
    if (!resetTarget) return
    try {
      await adminUsersApi.resetPassword(resetTarget.portal, resetTarget.id, newPassword)
      setToast({ type: 'success', message: `Password reset for ${resetTarget.username}` })
      setShowReset(false)
      setResetTarget(null)
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to reset password' })
    }
  }

  const portalKeys = Object.keys(portals)

  const getPortalColor = (key: string) => {
    const colors: Record<string, string> = {
      hospital: 'bg-sky-50 text-sky-700 border-sky-200',
      reception: 'bg-slate-50 text-slate-700 border-slate-200',
      lab: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      pharmacy: 'bg-violet-50 text-violet-700 border-violet-200',
      'indoor-pharmacy': 'bg-cyan-50 text-cyan-700 border-cyan-200',
      finance: 'bg-amber-50 text-amber-700 border-amber-200',
      dialysis: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      diagnostic: 'bg-teal-50 text-teal-700 border-teal-200',
      aesthetic: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    }
    return colors[key] || 'bg-slate-50 text-slate-700 border-slate-200'
  }

  return (
    <div className="min-h-dvh bg-white">
      {/* Header */}
      <header className="border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-400 hover:text-slate-600"
            >
              <Home className="h-5 w-5" />
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">User Management</h1>
              <p className="text-xs text-slate-400">Admin-only access</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
            >
              <Loader2 className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Portal Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {portalKeys.map((key) => (
            <button
              key={key}
              onClick={() => { setActivePortal(key); setSearch('') }}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                activePortal === key
                  ? `${getPortalColor(key)} shadow-sm`
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              <span className={activePortal === key ? 'opacity-100' : 'opacity-50'}>
                {PORTAL_ICONS[key] || <Users className="h-4 w-4" />}
              </span>
              {portals[key] || key}
              <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activePortal === key ? 'bg-white/60' : 'bg-slate-100 text-slate-500'
              }`}>
                {(users[key] || []).length}
              </span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username, role, or name..."
              className="w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm focus:bg-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition"
            />
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-medium px-5 py-2.5 text-sm transition shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add User
          </button>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Name</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Contact</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2 text-slate-400">
                        <Loader2 className="h-5 w-5 animate-spin" /> Loading...
                      </div>
                    ) : (
                      <div className="text-slate-400">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No users found</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u._id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{u.username}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        {u.role || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell text-slate-600">{u.fullName || '—'}</td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <div className="text-slate-600 text-xs">{u.email || '—'}</div>
                      <div className="text-slate-400 text-xs">{u.phone || ''}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                        u.active !== false
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${u.active !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {u.active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-2 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openReset(u)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition"
                          title="Reset Password"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(activePortal, u._id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5">
              <h2 className="text-base font-bold text-slate-900">Add User</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="px-6 pb-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Username</label>
                <input
                  required value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
                  placeholder="username"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</label>
                <input
                  required type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
                  placeholder="••••••"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</label>
                <select
                  required value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition bg-white"
                >
                  <option value="">Select role</option>
                  {(roles[activePortal] || []).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</label>
                  <input
                    value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</label>
                  <input
                    value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
                <input
                  type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button type="submit" className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5">
              <h2 className="text-base font-bold text-slate-900">Edit {editingUser.username}</h2>
              <button onClick={() => setShowEdit(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="px-6 pb-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Username</label>
                <input
                  required value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">New Password</label>
                <input
                  type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Leave blank to keep current"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</label>
                <select
                  required value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition bg-white"
                >
                  {(roles[activePortal] || []).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</label>
                  <input
                    value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</label>
                  <input
                    value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
                <input
                  type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEdit(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button type="submit" className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showReset && resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="px-6 pt-6 pb-2 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <KeyRound className="h-6 w-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Reset Password</h2>
              <p className="text-sm text-slate-500 mt-1">
                Set a new password for <span className="font-semibold text-slate-700">{resetTarget.username}</span>
              </p>
            </div>
            <div className="px-6 pb-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">New Password</label>
                <input
                  autoFocus
                  type="text"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-mono tracking-wide focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition"
                />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  User will need this password to sign in. Default is <span className="font-mono font-semibold text-slate-500">123</span>.
                </p>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowReset(false); setResetTarget(null) }}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={doReset}
                  className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition shadow-sm"
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
