import { useEffect, useState } from 'react'
import { campApi } from '../../features/camp/camp.api'
import { LayoutDashboard, Save, RotateCcw } from 'lucide-react'

export default function Camp_SidebarPermissions() {
  const [roles, setRoles] = useState<string[]>([])
  const [selectedRole, setSelectedRole] = useState('')
  const [permissions, setPermissions] = useState<any[]>([])
  const [newRole, setNewRole] = useState('')

  const loadRoles = async () => {
    const res: any = await campApi.listSidebarRoles()
    setRoles(res?.items || [])
  }

  useEffect(() => { loadRoles() }, [])

  useEffect(() => {
    if (!selectedRole) return
    campApi.getSidebarPermissions(selectedRole).then((res: any) => setPermissions(res?.permissions || []))
  }, [selectedRole])

  const toggle = (path: string) => {
    setPermissions(prev => prev.map(p => p.path === path ? { ...p, visible: !p.visible } : p))
  }

  const save = async () => {
    if (!selectedRole) return
    await campApi.updateSidebarPermissions(selectedRole, permissions)
    alert('Permissions saved')
  }

  const reset = async () => {
    if (!selectedRole) return
    await campApi.resetSidebarPermissions(selectedRole)
    const res: any = await campApi.getSidebarPermissions(selectedRole)
    setPermissions(res?.permissions || [])
    alert('Permissions reset to defaults')
  }

  const createRole = async () => {
    if (!newRole.trim()) return
    await campApi.createSidebarRole(newRole.trim())
    setNewRole('')
    loadRoles()
  }

  const deleteRole = async (role: string) => {
    if (!confirm(`Delete role "${role}"?`)) return
    await campApi.deleteSidebarRole(role)
    setSelectedRole('')
    loadRoles()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><LayoutDashboard className="h-6 w-6 text-emerald-600" /> Sidebar Permissions</h1>

      <div className="flex flex-wrap gap-3 items-center">
        <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500">
          <option value="">Select Role</option>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={save} disabled={!selectedRole} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"><Save className="h-4 w-4" /> Save</button>
        <button onClick={reset} disabled={!selectedRole} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RotateCcw className="h-4 w-4" /> Reset</button>
        <button onClick={() => selectedRole && deleteRole(selectedRole)} disabled={!selectedRole} className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50">Delete Role</button>
      </div>

      <div className="flex gap-2">
        <input value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="New role name" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
        <button onClick={createRole} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">Create Role</button>
      </div>

      {selectedRole && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-2">
          <h2 className="text-lg font-semibold text-slate-800 mb-2 capitalize">{selectedRole}</h2>
          {permissions.map(p => (
            <label key={p.path} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 cursor-pointer hover:bg-slate-100">
              <input type="checkbox" checked={p.visible !== false} onChange={() => toggle(p.path)} className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
              <span className="text-sm font-medium text-slate-700">{p.label}</span>
              <span className="ml-auto text-xs text-slate-400">{p.path}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
