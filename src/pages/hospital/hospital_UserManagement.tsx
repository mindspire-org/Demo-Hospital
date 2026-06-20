import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { fmt12 } from '../../utils/timeFormat'
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Trash2, 
  Edit, 
  Clock, 
  AlertCircle,
  Plus,
  Search
} from 'lucide-react'

type Shift = { _id: string; name: string; start: string; end: string }
type User = { _id: string; username: string; role: string; shiftId?: string; shiftRestricted?: boolean }

export default function Hospital_UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [roles, setRoles] = useState<string[]>(['admin','staff'])
  const [newRoleName, setNewRoleName] = useState('')
  const [creatingRole, setCreatingRole] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newRole, setNewRole] = useState<string>('staff')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<{ _id: string; username: string; role: string; shiftId?: string; shiftRestricted?: boolean; password?: string } | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [notice, setNotice] = useState<{ text: string; kind: 'success'|'error' } | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [addUserError, setAddUserError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Current logged-in user role
  const [currentRole, setCurrentRole] = useState<string>('')
  useEffect(() => {
    try {
      const s = localStorage.getItem('hospital.session')
      if (s) {
        const parsed = JSON.parse(s)
        setCurrentRole(String(parsed?.role || '').toLowerCase())
      }
    } catch {}
  }, [])
  const isAdmin = currentRole === 'admin'

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const [rolesRes, usersRes, shiftsRes] = await Promise.allSettled([
          hospitalApi.listSidebarRoles() as any,
          hospitalApi.listHospitalUsers() as any,
          hospitalApi.listShifts() as any,
        ])
        if (!mounted) return
        if (rolesRes.status === 'fulfilled'){
          const list = (rolesRes.value?.items || []) as string[]
          if (Array.isArray(list) && list.length) setRoles(list)
        }
        if (usersRes.status === 'fulfilled'){
          const arr = (usersRes.value?.users || usersRes.value?.items || usersRes.value || []) as any[]
          const list: User[] = arr.map((u: any) => ({ 
            _id: String(u._id || u.id), 
            username: u.username, 
            role: u.role,
            shiftId: u.shiftId,
            shiftRestricted: u.shiftRestricted 
          }))
          setUsers(list)
        }
        if (shiftsRes.status === 'fulfilled'){
          const list = (shiftsRes.value?.items || []) as any[]
          setShifts(list.map((s: any) => ({ _id: String(s._id || s.id), name: s.name, start: s.start, end: s.end })))
        }
      } catch (e) { console.error(e); if (mounted){ setUsers([]) } }
      finally { if (mounted) setLoading(false) }
    })()
    return () => { mounted = false }
  }, [])

  const addUser = async () => {
    setAddUserError('')
    if (!newUsername.trim()) { setAddUserError('Username is required'); return }
    if (!newPassword || newPassword.length < 4) { setAddUserError('Password must be at least 4 characters'); return }
    try {
      const created = await hospitalApi.createHospitalUser({ username: newUsername.trim(), password: newPassword, role: newRole }) as any
      const u = created?.user || created
      
      if (u) setUsers(prev => [...prev, { _id: String(u._id || u.id), username: u.username, role: u.role }])
      setNewUsername(''); setNewPassword(''); setNewRole(roles[0] || 'staff')
      setNotice({ text: 'User added', kind: 'success' })
      try { setTimeout(()=> setNotice(null), 2500) } catch {}
    } catch (e: any) {
      let msg = e?.message || 'Failed to add user'
      try {
        const raw = e?.message
        if (raw && typeof raw === 'string' && raw.trim().startsWith('{')) {
          const j = JSON.parse(raw)
          if (Array.isArray(j?.issues) && j.issues.length) msg = j.issues[0]?.message || j?.message || msg
          else msg = j?.message || j?.error || msg
        }
      } catch {}
      setAddUserError(msg)
    }
  }

  const performDelete = async () => {
    const id = deleteId; if (!id) { setDeleteOpen(false); return }
    try { await hospitalApi.deleteHospitalUser(id); setUsers(prev=> prev.filter(u=> (u._id !== id && u._id !== String(id)) && (u._id !== String((u as any).id)))) ; setNotice({ text: 'User deleted', kind: 'success' }) }
    catch (e){ console.error(e); setNotice({ text: 'Failed to delete user', kind: 'error' }) }
    finally { setDeleteOpen(false); setDeleteId(null); try { setTimeout(()=> setNotice(null), 2500) } catch {} }
  }

  const saveEdit = async () => {
    if (!editing) return
    setSavingEdit(true)
    try {
      const payload: any = {
        username: editing.username, 
        role: editing.role,
        ...(editing.password && editing.password.trim() ? { password: editing.password } : {})
      }
      if (editing.shiftId !== undefined) payload.shiftId = editing.shiftId || null
      if (editing.shiftRestricted !== undefined) payload.shiftRestricted = editing.shiftRestricted
      const updated = await hospitalApi.updateHospitalUser(editing._id, payload) as any
      const u = updated?.user || updated
      setUsers(prev => prev.map(x => (x._id === editing._id ? ({ 
        ...x, 
        username: u?.username ?? editing.username, 
        role: u?.role ?? editing.role,
        shiftId: u?.shiftId ?? editing.shiftId,
        shiftRestricted: u?.shiftRestricted ?? editing.shiftRestricted
      }) : x)))
      setEditing(null)
      setNotice({ text: 'User updated', kind: 'success' })
      setTimeout(() => setNotice(null), 2500)
    } catch (e: any) {
      console.error(e)
      setNotice({ text: e?.message || 'Failed to update user', kind: 'error' })
      setTimeout(() => setNotice(null), 3000)
    } finally { setSavingEdit(false) }
  }

  const createRole = async () => {
    const role = String(newRoleName || '').trim().toLowerCase()
    if (!role) return
    setCreatingRole(true)
    try {
      await hospitalApi.createSidebarRole(role)
      const next = Array.from(new Set([...(roles || []), role])).sort()
      setRoles(next)
      setNewRoleName('')
      setNewRole(role)
      setNotice({ text: `Role created: ${role}`, kind: 'success' })
      try { setTimeout(()=> setNotice(null), 2500) } catch {}
    } catch (e: any) {
      setNotice({ text: e?.message || 'Failed to create role', kind: 'error' })
      try { setTimeout(()=> setNotice(null), 3000) } catch {}
    } finally { setCreatingRole(false) }
  }

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-[70dvh] space-y-6 p-4 max-w-[1600px] mx-auto">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
          <p className="text-slate-500 text-sm">Manage system access, roles, and shift restrictions</p>
        </div>
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition-all ${loading ? 'border-slate-200 bg-white text-slate-400' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
          <div className={`h-2 w-2 rounded-full ${loading ? 'bg-slate-300 animate-pulse' : 'bg-emerald-500'}`} />
          {loading ? 'Refreshing...' : `${users.length} Total Users`}
        </div>
      </div>

      {notice && (
        <div className={`animate-in fade-in slide-in-from-top-4 duration-300 rounded-xl border px-4 py-3 shadow-md flex items-center gap-3 ${notice.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {notice.kind === 'success' ? <ShieldCheck className="h-5 w-5 text-emerald-500" /> : <AlertCircle className="h-5 w-5 text-rose-500" />}
          <span className="font-medium">{notice.text}</span>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Left Column: User List */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by username or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 shadow-sm transition-all"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[11px] font-bold">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role & Access</th>
                    <th className="px-6 py-4">Shift Details</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(u => {
                    const assignedShift = shifts.find(s => s._id === u.shiftId)
                    return (
                      <tr key={u._id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="h-11 w-11 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-inner bg-linear-to-br from-blue-500 to-indigo-600">
                              {(u.username||'U').slice(0,1).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-base">{u.username}</div>
                              <div className="text-[10px] font-mono text-slate-400">UUID: {String(u._id).slice(-8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tight bg-slate-100 text-slate-700 border border-slate-200">
                            <ShieldCheck className="h-3 w-3" />
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {assignedShift ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                <Clock className="h-3 w-3 text-blue-500" />
                                {assignedShift.name}
                              </div>
                              <div className="text-xs text-slate-500 font-medium">
                                {fmt12(assignedShift.start)} — {fmt12(assignedShift.end)}
                              </div>
                              {u.shiftRestricted && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-700 border border-amber-200">
                                  Restricted
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 italic text-xs">No shift assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 transition-opacity">
                            {isAdmin && (
                              <>
                                <button
                                  onClick={()=>setEditing({ _id: u._id, username: u.username, role: u.role, shiftId: u.shiftId, shiftRestricted: u.shiftRestricted })}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit User"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={()=>{ setDeleteId(u._id); setDeleteOpen(true) }}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredUsers.length === 0 && !loading && (
                    <tr>
                      <td className="px-6 py-12 text-center" colSpan={4}>
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-3 bg-slate-50 rounded-full">
                            <Users className="h-6 w-6 text-slate-300" />
                          </div>
                          <p className="text-slate-400 font-medium">No users found matching your search</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Creation Forms */}
        <div className="space-y-8">
          {/* Create Role Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-slate-100 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-slate-600" />
              </div>
              <h3 className="font-bold text-slate-800">System Roles</h3>
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {roles.map(r => (
                  <span key={r} className="px-2.5 py-1 bg-slate-50 text-slate-600 text-[11px] font-bold rounded-md border border-slate-100 uppercase">
                    {r}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  value={newRoleName} 
                  onChange={e=>setNewRoleName(e.target.value)} 
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all" 
                  placeholder="New role name..." 
                />
                <button 
                  type="button" 
                  onClick={createRole} 
                  disabled={creatingRole || !newRoleName.trim()} 
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all disabled:opacity-30"
                >
                  {creatingRole ? <Plus className="h-4 w-4 animate-spin" /> : 'Add'}
                </button>
              </div>
            </div>
          </div>

          {/* Add User Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 rounded-lg">
                <UserPlus className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-800">Add New User</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Username</label>
                <input 
                  value={newUsername} 
                  onChange={e=>setNewUsername(e.target.value)} 
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all" 
                  placeholder="Login identifier" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Access Level</label>
                <select 
                  value={newRole} 
                  onChange={e=>setNewRole(e.target.value)} 
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all appearance-none bg-white"
                >
                  {(roles||[]).map(r=> <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Password</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={e=>setNewPassword(e.target.value)} 
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all" 
                  placeholder="Min 4 characters" 
                />
              </div>

              <button 
                onClick={addUser} 
                className="w-full mt-2 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Create Account
              </button>

              {addUserError && (
                <div className="p-3 rounded-xl border border-rose-100 bg-rose-50 text-[11px] text-rose-700 font-medium flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {addUserError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800">Edit User Profile</h3>
              <button onClick={()=>setEditing(null)} className="p-1 hover:bg-white rounded-full transition-colors text-slate-400">
                <Plus className="h-5 w-5 rotate-45" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Username</label>
                <input value={editing.username} onChange={e=>setEditing(prev=> prev? { ...prev, username: e.target.value } : prev)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">System Role</label>
                <select value={editing.role} onChange={e=>setEditing(prev=> prev? { ...prev, role: e.target.value } : prev)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm appearance-none bg-white">
                  {(roles||[]).map(r=> <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Reset Password</label>
                <input type="password" value={editing.password || ''} onChange={e=>setEditing(prev=> prev? { ...prev, password: e.target.value } : prev)} placeholder="Keep blank to remain unchanged" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" />
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-50">
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Duty Shift Assignment
                </label>
                <select 
                  value={editing.shiftId || ''} 
                  onChange={e=>setEditing(prev=> prev? { ...prev, shiftId: e.target.value || undefined } : prev)} 
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm appearance-none bg-white"
                >
                  <option value="">No shift (Unrestricted access)</option>
                  {shifts.map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({fmt12(s.start)}-{fmt12(s.end)})</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 cursor-pointer group hover:border-amber-200 transition-colors">
                <input 
                  type="checkbox" 
                  checked={!!editing.shiftRestricted} 
                  onChange={e=>setEditing(prev=> prev? { ...prev, shiftRestricted: e.target.checked } : prev)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-bold text-slate-700">Strict Shift Timing</div>
                  <div className="text-[10px] text-slate-500">Prevent login outside of assigned hours</div>
                </div>
              </label>

              {editing.shiftRestricted && !editing.shiftId && (
                <div className="p-3 rounded-xl border border-amber-100 bg-amber-50 text-[11px] text-amber-700 flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Crucial: Assign a shift before enabling timing restrictions.
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50/50 flex items-center justify-end gap-3">
              <button type="button" onClick={()=>setEditing(null)} className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
              <button 
                type="button" 
                onClick={saveEdit} 
                disabled={savingEdit} 
                className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all disabled:opacity-30 shadow-md"
              >
                {savingEdit ? 'Updating...' : 'Update User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteOpen && (
        <div className="fixed inset-0 z-130 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-[32px] bg-white shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-5">
              <Trash2 className="h-8 w-8 text-rose-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Delete User?</h3>
            <p className="text-slate-500 mb-8 text-sm leading-relaxed">This will permanently remove access for this user. This action cannot be undone.</p>
            <div className="flex items-center gap-3">
              <button 
                onClick={()=>{ setDeleteOpen(false); setDeleteId(null) }} 
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
              >
                Keep User
              </button>
              <button 
                onClick={performDelete} 
                className="flex-1 py-3 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
