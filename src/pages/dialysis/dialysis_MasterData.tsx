import { useEffect, useMemo, useState } from 'react'
import { dialysisApi } from '../../utils/api'

type Tab = 'machines' | 'shifts' | 'sessionTypes' | 'dialyzerTypes'

type MachineRow = { _id: string; name: string; code?: string; status?: string; active?: boolean }

type ShiftRow = { _id: string; name: string; start?: string; end?: string; active?: boolean }

type SessionTypeRow = { _id: string; name: string; code?: string; price?: number; active?: boolean }

type DialyzerTypeRow = { _id: string; name: string; active?: boolean }

function toTimeValue(v?: string) {
  const s = String(v || '').trim()
  if (!s) return ''
  const m24 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (m24) {
    const hh = Math.min(23, Math.max(0, Number(m24[1] || 0)))
    const mm = Math.min(59, Math.max(0, Number(m24[2] || 0)))
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }

  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (m12) {
    let hh = Math.min(12, Math.max(1, Number(m12[1] || 0)))
    const mm = Math.min(59, Math.max(0, Number(m12[2] || 0)))
    const ap = String(m12[3] || '').toUpperCase()
    if (ap === 'PM' && hh !== 12) hh += 12
    if (ap === 'AM' && hh === 12) hh = 0
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }

  return ''
}

export default function Dialysis_MasterData({ initialTab = 'machines' as Tab }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const [machines, setMachines] = useState<MachineRow[]>([])
  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [sessionTypes, setSessionTypes] = useState<SessionTypeRow[]>([])
  const [dialyzerTypes, setDialyzerTypes] = useState<DialyzerTypeRow[]>([])

  const [newMachine, setNewMachine] = useState({ name: '', code: '', status: 'available', active: true })
  const [newShift, setNewShift] = useState({ name: '', start: '', end: '', active: true })
  const [newSessionType, setNewSessionType] = useState({ name: '', code: '', price: 0, active: true })
  const [newDialyzerType, setNewDialyzerType] = useState({ name: '', active: true })

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<any>({})

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const title = useMemo(() => {
    if (tab === 'machines') return 'Machines'
    if (tab === 'shifts') return 'Shifts'
    if (tab === 'sessionTypes') return 'Session Types'
    return 'Dialyzer Types'
  }, [tab])

  const show = (kind: 'success' | 'error', text: string) => {
    setNotice({ kind, text })
    setTimeout(() => setNotice(null), 2500)
  }

  const refresh = async () => {
    setLoading(true)
    try {
      if (tab === 'machines') {
        const r: any = await dialysisApi.listMachines()
        setMachines((r?.items || r || []).map((x: any) => ({ ...x, _id: String(x._id || x.id) })))
      } else if (tab === 'shifts') {
        const r: any = await dialysisApi.listShifts()
        setShifts((r?.items || r || []).map((x: any) => ({ ...x, _id: String(x._id || x.id) })))
      } else if (tab === 'sessionTypes') {
        const r: any = await dialysisApi.listSessionTypes()
        setSessionTypes((r?.items || r || []).map((x: any) => ({ ...x, _id: String(x._id || x.id) })))
      } else {
        const r: any = await dialysisApi.listDialyzerTypes()
        setDialyzerTypes((r?.items || r || []).map((x: any) => ({ ...x, _id: String(x._id || x.id) })))
      }
    } catch (e: any) {
      show('error', e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (row: any) => {
    setEditForm({ ...row })
    setEditDialogOpen(true)
  }

  const cancelEdit = () => {
    setEditDialogOpen(false)
    setEditForm({})
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      const id = String(editForm._id)
      if (tab === 'machines') {
        await dialysisApi.updateMachine(id, editForm)
      } else if (tab === 'shifts') {
        await dialysisApi.updateShift(id, editForm)
      } else if (tab === 'sessionTypes') {
        await dialysisApi.updateSessionType(id, editForm)
      } else {
        await dialysisApi.updateDialyzerType(id, editForm)
      }
      show('success', 'Saved')
      setEditDialogOpen(false)
      setEditForm({})
      await refresh()
    } catch (e: any) {
      show('error', e?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const removeRow = async (id: string) => {
    if (!confirm('Delete this item?')) return
    setSaving(true)
    try {
      if (tab === 'machines') await dialysisApi.deleteMachine(id)
      else if (tab === 'shifts') await dialysisApi.deleteShift(id)
      else if (tab === 'sessionTypes') await dialysisApi.deleteSessionType(id)
      else await dialysisApi.deleteDialyzerType(id)
      show('success', 'Deleted')
      await refresh()
    } catch (e: any) {
      show('error', e?.message || 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  const addNew = async () => {
    setSaving(true)
    try {
      if (tab === 'machines') {
        if (!newMachine.name.trim()) return
        await dialysisApi.createMachine(newMachine)
        setNewMachine({ name: '', code: '', status: 'available', active: true })
      } else if (tab === 'shifts') {
        if (!newShift.name.trim()) return
        await dialysisApi.createShift(newShift)
        setNewShift({ name: '', start: '', end: '', active: true })
      } else if (tab === 'sessionTypes') {
        if (!newSessionType.name.trim()) return
        await dialysisApi.createSessionType(newSessionType)
        setNewSessionType({ name: '', code: '', price: 0, active: true })
      } else {
        if (!newDialyzerType.name.trim()) return
        await dialysisApi.createDialyzerType(newDialyzerType)
        setNewDialyzerType({ name: '', active: true })
      }
      show('success', 'Added')
      await refresh()
    } catch (e: any) {
      show('error', e?.message || 'Failed to add')
    } finally {
      setSaving(false)
    }
  }

  const tabBtn = (k: Tab, label: string) => (
    <button
      onClick={() => setTab(k)}
      className={`rounded-md border px-3 py-1.5 text-sm ${tab === k ? 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'border-transparent bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
      type="button"
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-4 min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Dialysis Master Data</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage dropdown lists used in session forms</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          type="button"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {notice && (
        <div className={`rounded-md border px-3 py-2 text-sm ${notice.kind === 'success' ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' : 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300'}`}>
          {notice.text}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {tabBtn('machines', 'Machines')}
        {tabBtn('shifts', 'Shifts')}
        {tabBtn('sessionTypes', 'Session Types')}
        {tabBtn('dialyzerTypes', 'Dialyzer Types')}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="border-b border-slate-200 dark:border-slate-700 px-4 py-3">
          <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</div>
        </div>

        <div className="space-y-4 p-4">
          {tab === 'machines' && (
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Machine Name</div>
                <input value={newMachine.name} onChange={e=>setNewMachine(v=>({ ...v, name: e.target.value }))} placeholder="Machine name" className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Code</div>
                <input value={newMachine.code} onChange={e=>setNewMachine(v=>({ ...v, code: e.target.value }))} placeholder="Code (optional)" className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Status</div>
                <select value={newMachine.status} onChange={e=>setNewMachine(v=>({ ...v, status: e.target.value }))} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm">
                  <option value="available">available</option>
                  <option value="maintenance">maintenance</option>
                  <option value="busy">busy</option>
                </select>
              </div>
              <button onClick={addNew} disabled={saving} className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50" type="button">Add</button>
            </div>
          )}

          {tab === 'shifts' && (
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Shift Name</div>
                <input value={newShift.name} onChange={e=>setNewShift(v=>({ ...v, name: e.target.value }))} placeholder="Shift name" className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Start Time</div>
                <input type="time" value={toTimeValue(newShift.start)} onChange={e=>setNewShift(v=>({ ...v, start: e.target.value }))} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">End Time</div>
                <input type="time" value={toTimeValue(newShift.end)} onChange={e=>setNewShift(v=>({ ...v, end: e.target.value }))} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm" />
              </div>
              <button onClick={addNew} disabled={saving} className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50" type="button">Add</button>
            </div>
          )}

          {tab === 'sessionTypes' && (
            <div className="grid gap-3 md:grid-cols-5">
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Type Name</div>
                <input value={newSessionType.name} onChange={e=>setNewSessionType(v=>({ ...v, name: e.target.value }))} placeholder="Type name" className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Code</div>
                <input value={newSessionType.code} onChange={e=>setNewSessionType(v=>({ ...v, code: e.target.value }))} placeholder="Code (optional)" className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Price (Rs)</div>
                <input type="number" min="0" step="1" value={newSessionType.price} onChange={e=>setNewSessionType(v=>({ ...v, price: parseFloat(e.target.value) || 0 }))} placeholder="0" className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm" />
              </div>
              <div className="hidden md:block" />
              <button onClick={addNew} disabled={saving} className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50" type="button">Add</button>
            </div>
          )}

          {tab === 'dialyzerTypes' && (
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Dialyzer Name</div>
                <input value={newDialyzerType.name} onChange={e=>setNewDialyzerType(v=>({ ...v, name: e.target.value }))} placeholder="Dialyzer name (e.g. F8)" className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm" />
              </div>
              <div className="hidden md:block" />
              <div className="hidden md:block" />
              <button onClick={addNew} disabled={saving} className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50" type="button">Add</button>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Name</th>
                  {(tab === 'machines' || tab === 'sessionTypes') && <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Code</th>}
                  {tab === 'sessionTypes' && <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Price</th>}
                  {tab === 'machines' && <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Status</th>}
                  {tab === 'shifts' && <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Start</th>}
                  {tab === 'shifts' && <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">End</th>}
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                {(
                  tab === 'machines'
                    ? machines
                    : tab === 'shifts'
                      ? shifts
                      : tab === 'sessionTypes'
                        ? sessionTypes
                        : dialyzerTypes
                ).map((row: any) => {
                  return (
                    <tr key={row._id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="px-4 py-3">
                        <span className="font-medium">{row.name}</span>
                      </td>

                      {(tab === 'machines' || tab === 'sessionTypes') && (
                        <td className="px-4 py-3">
                          <span className="text-slate-600 dark:text-slate-400">{row.code || '—'}</span>
                        </td>
                      )}

                      {tab === 'sessionTypes' && (
                        <td className="px-4 py-3">
                          <span className="text-slate-600 dark:text-slate-400">{row.price ? `Rs. ${row.price.toLocaleString()}` : '—'}</span>
                        </td>
                      )}

                      {tab === 'machines' && (
                        <td className="px-4 py-3">
                          <span className="text-slate-600 dark:text-slate-400">{row.status || '—'}</span>
                        </td>
                      )}

                      {tab === 'shifts' && (
                        <td className="px-4 py-3">
                          <span className="text-slate-600 dark:text-slate-400">{row.start || '—'}</span>
                        </td>
                      )}

                      {tab === 'shifts' && (
                        <td className="px-4 py-3">
                          <span className="text-slate-600 dark:text-slate-400">{row.end || '—'}</span>
                        </td>
                      )}

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => startEdit(row)}
                            className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600"
                            type="button"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => removeRow(String(row._id))}
                            disabled={saving}
                            className="rounded-md border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 disabled:opacity-50"
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {(
                  (tab === 'machines' && machines.length === 0) ||
                  (tab === 'shifts' && shifts.length === 0) ||
                  (tab === 'sessionTypes' && sessionTypes.length === 0) ||
                  (tab === 'dialyzerTypes' && dialyzerTypes.length === 0)
                ) && (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-500 dark:text-slate-400" colSpan={6}>
                      {loading ? 'Loading…' : 'No items'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      {editDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 dark:text-slate-100">Edit {title}</h3>

            <div className="space-y-4">
              {/* Name field - common to all */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Name</label>
                <input
                  value={editForm.name || ''}
                  onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm"
                />
              </div>

              {/* Code field - machines and sessionTypes */}
              {(tab === 'machines' || tab === 'sessionTypes') && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Code</label>
                  <input
                    value={editForm.code || ''}
                    onChange={e => setEditForm((f: any) => ({ ...f, code: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              )}

              {/* Price field - sessionTypes */}
              {tab === 'sessionTypes' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Price (Rs)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editForm.price || 0}
                    onChange={e => setEditForm((f: any) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              )}

              {/* Status field - machines */}
              {tab === 'machines' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
                  <select
                    value={editForm.status || 'available'}
                    onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="available">available</option>
                    <option value="maintenance">maintenance</option>
                    <option value="busy">busy</option>
                  </select>
                </div>
              )}

              {/* Start/End time fields - shifts */}
              {tab === 'shifts' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={toTimeValue(editForm.start)}
                      onChange={e => setEditForm((f: any) => ({ ...f, start: e.target.value }))}
                      className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">End Time</label>
                    <input
                      type="time"
                      value={toTimeValue(editForm.end)}
                      onChange={e => setEditForm((f: any) => ({ ...f, end: e.target.value }))}
                      className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="px-4 py-2 bg-gray-200 dark:bg-slate-700 dark:text-slate-200 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
