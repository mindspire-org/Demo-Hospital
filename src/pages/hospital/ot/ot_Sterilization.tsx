import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { otApi } from '../../../features/hospital/ot'
import { ArrowLeft, Plus, Thermometer, Clock, X, Edit2, Trash2 } from 'lucide-react'

type Sterilization = {
  _id: string
  cycleNumber?: string
  type: 'autoclave' | 'eto' | 'plasma' | 'dry-heat'
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  startedAt?: string
  completedAt?: string
  temperature?: number
  pressure?: number
  duration?: number
  items?: string[]
  operatorId?: { _id: string; name: string }
  verifiedBy?: { _id: string; name: string }
  notes?: string
}

export default function OT_Sterilization() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<Sterilization[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Sterilization | null>(null)
  const [form, setForm] = useState({
    cycleNumber: '',
    type: 'autoclave' as 'autoclave' | 'eto' | 'plasma' | 'dry-heat',
    status: 'pending' as 'pending' | 'in-progress' | 'completed' | 'failed',
    startedAt: '',
    completedAt: '',
    temperature: '',
    pressure: '',
    duration: '',
    items: '',
    operatorId: '',
    verifiedBy: '',
    notes: '',
  })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [sterRes, staffRes] = await Promise.all([
        otApi.listOTSterilizations({ limit: 50 }) as any,
        fetch('/api/hospital/staff').then(r => r.json()).then((d: any) => d || []),
      ])
      setLogs(sterRes?.sterilizations || [])
      setStaff(Array.isArray(staffRes) ? staffRes : (staffRes?.staff || []))
    } catch {}
    setLoading(false)
  }

  function openAddModal() {
    setEditingItem(null)
    setForm({
      cycleNumber: '', type: 'autoclave', status: 'pending', startedAt: '', completedAt: '',
      temperature: '', pressure: '', duration: '', items: '', operatorId: '', verifiedBy: '', notes: ''
    })
    setShowModal(true)
  }

  function openEditModal(item: Sterilization) {
    setEditingItem(item)
    setForm({
      cycleNumber: item.cycleNumber || '',
      type: item.type,
      status: item.status,
      startedAt: item.startedAt ? item.startedAt.slice(0, 16) : '',
      completedAt: item.completedAt ? item.completedAt.slice(0, 16) : '',
      temperature: item.temperature?.toString() || '',
      pressure: item.pressure?.toString() || '',
      duration: item.duration?.toString() || '',
      items: (item.items || []).join(', '),
      operatorId: item.operatorId?._id || '',
      verifiedBy: item.verifiedBy?._id || '',
      notes: item.notes || '',
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const data = {
        cycleNumber: form.cycleNumber || undefined,
        type: form.type,
        status: form.status,
        startedAt: form.startedAt || undefined,
        completedAt: form.completedAt || undefined,
        temperature: form.temperature ? Number(form.temperature) : undefined,
        pressure: form.pressure ? Number(form.pressure) : undefined,
        duration: form.duration ? Number(form.duration) : undefined,
        items: form.items ? form.items.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        operatorId: form.operatorId || undefined,
        verifiedBy: form.verifiedBy || undefined,
        notes: form.notes || undefined,
      }
      if (editingItem) {
        await otApi.updateOTSterilization(editingItem._id, data)
      } else {
        await otApi.createOTSterilization(data)
      }
      setShowModal(false)
      load()
    } catch (e: any) {
      alert(e?.message || 'Failed to save')
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this sterilization record?')) return
    try {
      await otApi.deleteOTSterilization(id)
      load()
    } catch (e: any) {
      alert(e?.message || 'Failed to delete')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/hospital/ot')} className="text-slate-600 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-800">Sterilization Logs</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-purple-500" />
            <span className="font-medium">Sterilization Cycles</span>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            New Cycle
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2 text-left">Cycle #</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Started</th>
                  <th className="px-3 py-2 text-left">Items</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">{log.cycleNumber || '-'}</td>
                    <td className="px-3 py-2 capitalize">{log.type}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                        log.status === 'completed' ? 'bg-green-100 text-green-700' :
                        log.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                        log.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {log.startedAt ? new Date(log.startedAt).toLocaleString() : '-'}
                      </div>
                    </td>
                    <td className="px-3 py-2">{(log.items || []).length} items</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => openEditModal(log)} className="text-slate-600 hover:text-purple-600">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteItem(log._id)} className="text-slate-600 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                      No sterilization logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingItem ? 'Edit Sterilization' : 'New Sterilization Cycle'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Cycle Number</label>
                  <input
                    type="text"
                    value={form.cycleNumber}
                    onChange={(e) => setForm({ ...form, cycleNumber: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="autoclave">Autoclave</option>
                    <option value="eto">ETO</option>
                    <option value="plasma">Plasma</option>
                    <option value="dry-heat">Dry Heat</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Started At</label>
                  <input
                    type="datetime-local"
                    value={form.startedAt}
                    onChange={(e) => setForm({ ...form, startedAt: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Temp (°C)</label>
                  <input
                    type="number"
                    value={form.temperature}
                    onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Pressure</label>
                  <input
                    type="number"
                    value={form.pressure}
                    onChange={(e) => setForm({ ...form, pressure: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Duration (min)</label>
                  <input
                    type="number"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Items (comma separated)</label>
                <input
                  type="text"
                  value={form.items}
                  onChange={(e) => setForm({ ...form, items: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Instrument set, Tray 1, Tray 2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Operator</label>
                  <select
                    value={form.operatorId}
                    onChange={(e) => setForm({ ...form, operatorId: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select</option>
                    {staff.map((s: any) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Verified By</label>
                  <select
                    value={form.verifiedBy}
                    onChange={(e) => setForm({ ...form, verifiedBy: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select</option>
                    {staff.map((s: any) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                >
                  {editingItem ? 'Update' : 'Create'} Cycle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
