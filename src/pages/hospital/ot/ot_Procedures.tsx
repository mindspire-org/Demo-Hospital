import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { otApi } from '../../../features/hospital/ot'
import { ArrowLeft, Plus, Scissors, Clock, Edit2, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import ConfirmDialog from '../../../components/ui/ConfirmDialog'

type Procedure = {
  _id: string
  name: string
  code?: string
  description?: string
  estimatedDuration?: number
  requiredEquipment?: string[]
  requiredStaff?: Array<{ role: string; count: number }>
  anesthesiaTypes?: string[]
  specialInstructions?: string
  price?: number
}

export default function OT_Procedures() {
  const navigate = useNavigate()
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Procedure | null>(null)
  const [editingItem, setEditingItem] = useState<Procedure | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    estimatedDuration: '',
    requiredEquipment: '',
    specialInstructions: '',
    price: '',
  })

  useEffect(() => { load() }, [page])

  async function load() {
    setLoading(true)
    try {
      const procRes = await otApi.listOTProcedures({ page, limit }) as any
      setProcedures(procRes?.procedures || [])
      setTotal(procRes?.total || 0)
    } catch {}
    setLoading(false)
  }

  const totalPages = Math.ceil(total / limit)

  function openAddModal() {
    setEditingItem(null)
    setForm({
      name: '', code: '', description: '',
      estimatedDuration: '', requiredEquipment: '', specialInstructions: '', price: ''
    })
    setShowModal(true)
  }

  function openEditModal(item: Procedure) {
    setEditingItem(item)
    setForm({
      name: item.name,
      code: item.code || '',
      description: item.description || '',
      estimatedDuration: item.estimatedDuration?.toString() || '',
      requiredEquipment: (item.requiredEquipment || []).join(', '),
      specialInstructions: item.specialInstructions || '',
      price: item.price?.toString() || '',
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) return
    try {
      const data = {
        name: form.name,
        code: form.code || undefined,
        description: form.description || undefined,
        estimatedDuration: form.estimatedDuration ? Number(form.estimatedDuration) : undefined,
        requiredEquipment: form.requiredEquipment 
          ? form.requiredEquipment.split(',').map(s => s.trim()).filter(Boolean) 
          : undefined,
        specialInstructions: form.specialInstructions || undefined,
        price: form.price ? Number(form.price) : undefined,
      }
      if (editingItem) {
        await otApi.updateOTProcedure(editingItem._id, data)
      } else {
        await otApi.createOTProcedure(data)
      }
      setShowModal(false)
      if (editingItem) load()
      else { setPage(1); load() }
    } catch (e: any) {
      alert(e?.message || 'Failed to save procedure')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await otApi.deleteOTProcedure(deleteTarget._id)
      setDeleteTarget(null)
      if (procedures.length === 1 && page > 1) setPage(page - 1)
      else load()
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
        <h1 className="text-xl font-semibold text-slate-800">OT Procedures</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-purple-500" />
            <span className="font-medium">Procedure Templates</span>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Add Procedure
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading...</div>
        ) : procedures.length === 0 ? (
          <div className="py-8 text-center text-slate-500">No procedures found. Click "Add Procedure" to add.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-left">Est. Duration</th>
                  <th className="px-3 py-2 text-left">Required Equipment</th>
                  <th className="px-3 py-2 text-left">Price</th>
                  <th className="px-3 py-2 text-left">Special Instructions</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {procedures.map((proc) => (
                  <tr key={proc._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">{proc.name}</td>
                    <td className="px-3 py-2">{proc.code || '-'}</td>
                    <td className="px-3 py-2 max-w-xs truncate" title={proc.description}>{proc.description || '-'}</td>
                    <td className="px-3 py-2">
                      {proc.estimatedDuration ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {proc.estimatedDuration} min
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2 max-w-xs truncate" title={proc.requiredEquipment?.join(', ')}>
                      {proc.requiredEquipment?.join(', ') || '-'}
                    </td>
                    <td className="px-3 py-2">{proc.price ? `₹${proc.price}` : '-'}</td>
                    <td className="px-3 py-2 max-w-xs truncate" title={proc.specialInstructions}>{proc.specialInstructions || '-'}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => openEditModal(proc)} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button onClick={() => setDeleteTarget(proc)} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-3 py-3">
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
        title="Delete Procedure"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingItem ? 'Edit Procedure' : 'Add Procedure'}
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
                    placeholder="e.g., PROC-001"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Est. Duration (min)</label>
                  <input
                    type="number"
                    value={form.estimatedDuration}
                    onChange={(e) => setForm({ ...form, estimatedDuration: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Required Equipment</label>
                  <input
                    type="text"
                    value={form.requiredEquipment}
                    onChange={(e) => setForm({ ...form, requiredEquipment: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Comma separated"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Price</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Amount"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Special Instructions</label>
                <textarea
                  value={form.specialInstructions}
                  onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })}
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
                  {editingItem ? 'Update' : 'Add'} Procedure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
