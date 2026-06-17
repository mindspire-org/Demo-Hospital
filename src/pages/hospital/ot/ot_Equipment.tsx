import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { otApi } from '../../../features/hospital/ot'
import { ArrowLeft, Plus, Wrench, Calendar, Edit2, Trash2, X } from 'lucide-react'

type Equipment = {
  _id: string
  name: string
  code?: string
  roomId?: { _id: string; name: string }
  status: 'available' | 'in-use' | 'maintenance' | 'retired'
  manufacturer?: string
  model?: string
  serialNumber?: string
  purchaseDate?: string
  warrantyExpiry?: string
  lastMaintenance?: string
  nextMaintenance?: string
  notes?: string
}

export default function OT_Equipment() {
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Equipment | null>(null)
  const [form, setForm] = useState({
    name: '',
    code: '',
    roomId: '',
    status: 'available' as 'available' | 'in-use' | 'maintenance' | 'retired',
    manufacturer: '',
    model: '',
    serialNumber: '',
    purchaseDate: '',
    warrantyExpiry: '',
    lastMaintenance: '',
    nextMaintenance: '',
    notes: '',
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [eqRes, roomsRes] = await Promise.all([
        otApi.listOTEquipment({ limit: 100 }) as any,
        otApi.listOTRooms({ limit: 50 }) as any,
      ])
      setEquipment(eqRes?.equipment || [])
      setRooms(Array.isArray(roomsRes) ? roomsRes : (roomsRes?.rooms || []))
    } catch {}
    setLoading(false)
  }

  function openAddModal() {
    setEditingItem(null)
    setForm({
      name: '', code: '', roomId: '', status: 'available', manufacturer: '', model: '',
      serialNumber: '', purchaseDate: '', warrantyExpiry: '', lastMaintenance: '', nextMaintenance: '', notes: ''
    })
    setShowModal(true)
  }

  function openEditModal(item: Equipment) {
    setEditingItem(item)
    setForm({
      name: item.name,
      code: item.code || '',
      roomId: item.roomId?._id || '',
      status: item.status,
      manufacturer: item.manufacturer || '',
      model: item.model || '',
      serialNumber: item.serialNumber || '',
      purchaseDate: item.purchaseDate ? item.purchaseDate.slice(0, 10) : '',
      warrantyExpiry: item.warrantyExpiry ? item.warrantyExpiry.slice(0, 10) : '',
      lastMaintenance: item.lastMaintenance ? item.lastMaintenance.slice(0, 10) : '',
      nextMaintenance: item.nextMaintenance ? item.nextMaintenance.slice(0, 10) : '',
      notes: item.notes || '',
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) return
    try {
      if (editingItem) {
        await otApi.updateOTEquipment(editingItem._id, form)
      } else {
        await otApi.createOTEquipment(form)
      }
      setShowModal(false)
      load()
    } catch (e: any) {
      alert(e?.message || 'Failed to save equipment')
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this equipment?')) return
    try {
      await otApi.deleteOTEquipment(id)
      load()
    } catch (e: any) {
      alert(e?.message || 'Failed to delete')
    }
  }

  const statusColors: Record<string, string> = {
    available: 'bg-green-100 text-green-700',
    'in-use': 'bg-blue-100 text-blue-700',
    maintenance: 'bg-amber-100 text-amber-700',
    retired: 'bg-slate-100 text-slate-700',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/hospital/ot')} className="text-slate-600 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-800">OT Equipment</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-purple-500" />
            <span className="font-medium">Equipment Inventory</span>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Add Equipment
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading...</div>
        ) : equipment.length === 0 ? (
          <div className="py-8 text-center text-slate-500">No equipment found. Click "Add Equipment" to add.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Room</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Next Maintenance</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((eq) => (
                  <tr key={eq._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">{eq.name}</td>
                    <td className="px-3 py-2">{eq.code || '-'}</td>
                    <td className="px-3 py-2">{eq.roomId?.name || '-'}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[eq.status]}`}>
                        {eq.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {eq.nextMaintenance ? new Date(eq.nextMaintenance).toLocaleDateString() : '-'}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => openEditModal(eq)} className="text-slate-600 hover:text-purple-600">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteItem(eq._id)} className="text-slate-600 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                {editingItem ? 'Edit Equipment' : 'Add Equipment'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Code</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Room</label>
                  <select
                    value={form.roomId}
                    onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select Room</option>
                    {rooms.map((r) => (
                      <option key={r._id} value={r._id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="available">Available</option>
                    <option value="in-use">In Use</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Manufacturer</label>
                  <input
                    type="text"
                    value={form.manufacturer}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Model</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Serial Number</label>
                <input
                  type="text"
                  value={form.serialNumber}
                  onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Purchase Date</label>
                  <input
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Warranty Expiry</label>
                  <input
                    type="date"
                    value={form.warrantyExpiry}
                    onChange={(e) => setForm({ ...form, warrantyExpiry: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Last Maintenance</label>
                  <input
                    type="date"
                    value={form.lastMaintenance}
                    onChange={(e) => setForm({ ...form, lastMaintenance: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Next Maintenance</label>
                  <input
                    type="date"
                    value={form.nextMaintenance}
                    onChange={(e) => setForm({ ...form, nextMaintenance: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
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
                  {editingItem ? 'Update' : 'Add'} Equipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
