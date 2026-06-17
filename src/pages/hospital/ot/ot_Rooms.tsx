import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../../utils/api'
import { DoorOpen, Plus, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import ConfirmDialog from '../../../components/ui/ConfirmDialog'

export default function OT_Rooms() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  useEffect(() => { load() }, [page])

  async function load() {
    setLoading(true)
    try {
      const res = await hospitalApi.listOTRooms({ page, limit }) as any
      setRooms(res?.rooms || [])
      setTotal(res?.total || 0)
    } catch {}
    setLoading(false)
  }

  const totalPages = Math.ceil(total / limit)

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await hospitalApi.deleteOTRoom(deleteTarget._id)
      setDeleteTarget(null)
      if (rooms.length === 1 && page > 1) setPage(page - 1)
      else load()
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/hospital/ot')} className="text-slate-600 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-800">OT Rooms</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-purple-500" />
            <span className="font-medium">Operating Theater Rooms</span>
          </div>
          <button
            onClick={() => { setEditingRoom(null); setShowModal(true) }}
            className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Add Room
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Room Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{room.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 capitalize">{room.type || 'General'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          room.status === 'available' ? 'bg-green-500' :
                          room.status === 'occupied' ? 'bg-amber-500' :
                          'bg-slate-400'
                        }`} />
                        <span className="text-sm text-slate-600 capitalize">{room.status || 'Available'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditingRoom(room); setShowModal(true) }}
                          className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(room)}
                          className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rooms.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No OT rooms configured
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <span className="text-sm text-slate-500">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, i, arr) => (
                  <span key={p}>
                    {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 text-slate-400">…</span>}
                    <button
                      onClick={() => setPage(p)}
                      className={`rounded-md px-2.5 py-1 text-sm ${p === page ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >{p}</button>
                  </span>
                ))}
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Room"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      {showModal && (
        <RoomModal
          room={editingRoom}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}

function RoomModal({ room, onClose, onSaved }: { room?: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: room?.name || '',
    type: room?.type || 'general',
    status: room?.status || 'available',
    notes: room?.notes || '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (room) {
        await hospitalApi.updateOTRoom(room._id, form)
      } else {
        await hospitalApi.createOTRoom(form)
      }
      onSaved()
      onClose()
    } catch {}
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">{room ? 'Edit' : 'Add'} OT Room</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Room Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="general">General</option>
              <option value="cardiac">Cardiac</option>
              <option value="neuro">Neuro</option>
              <option value="orthopedic">Orthopedic</option>
              <option value="laparoscopic">Laparoscopic</option>
              <option value="endoscopy">Endoscopy</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-md bg-purple-600 px-4 py-2 text-sm text-white">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
