import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../../utils/api'
import { Bed, Plus, ArrowLeft, Edit2, Trash2, Wind, Shield, Sparkles } from 'lucide-react'

export default function ICU_Beds() {
  const navigate = useNavigate()
  const [beds, setBeds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBed, setEditingBed] = useState<any>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await hospitalApi.listICUBeds({ limit: 50 }) as any
      setBeds(res?.beds || [])
    } catch {}
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this bed?')) return
    try {
      await hospitalApi.deleteICUBed(id)
      load()
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/hospital/icu')} className="text-slate-600 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-800">ICU Beds</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bed className="h-5 w-5 text-rose-500" />
            <span className="font-medium">Intensive Care Beds</span>
          </div>
          <button
            onClick={() => { setEditingBed(null); setShowModal(true) }}
            className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm text-white hover:bg-rose-700"
          >
            <Plus className="h-4 w-4" />
            Add Bed
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {beds.map((bed) => (
              <div key={bed._id} className={`rounded-lg border p-4 ${
                bed.status === 'available' ? 'border-green-200 bg-green-50' :
                bed.status === 'occupied' ? 'border-amber-200 bg-amber-50' :
                bed.status === 'cleaning' ? 'border-blue-200 bg-blue-50' :
                'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-slate-800">{bed.name}</h3>
                    <p className="text-sm text-slate-500 capitalize">{bed.type || 'General'}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {bed.isolationType && bed.isolationType !== 'none' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700" title={`Isolation: ${bed.isolationType}`}>
                          <Shield className="h-3 w-3" />
                          {bed.isolationType}
                        </span>
                      )}
                      {bed.cleaningStatus && bed.cleaningStatus !== 'clean' && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                          bed.cleaningStatus === 'ready' ? 'bg-green-100 text-green-700' :
                          bed.cleaningStatus === 'in-progress' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`} title={`Cleaning: ${bed.cleaningStatus}`}>
                          <Sparkles className="h-3 w-3" />
                          {bed.cleaningStatus}
                        </span>
                      )}
                      {bed.clinicalStatus && bed.clinicalStatus !== 'empty' && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                          bed.clinicalStatus === 'critical' ? 'bg-red-100 text-red-700' :
                          bed.clinicalStatus === 'unstable' ? 'bg-orange-100 text-orange-700' :
                          bed.clinicalStatus === 'emergency' ? 'bg-red-200 text-red-800' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {bed.clinicalStatus}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {bed.ventilatorAvailable && (
                      <span title="Ventilator Available"><Wind className="h-4 w-4 text-blue-500" /></span>
                    )}
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      bed.status === 'available' ? 'bg-green-500' :
                      bed.status === 'occupied' ? 'bg-amber-500' :
                      bed.status === 'cleaning' ? 'bg-blue-500' :
                      'bg-slate-400'
                    }`} />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => { setEditingBed(bed); setShowModal(true) }}
                    className="rounded p-1 text-slate-600 hover:bg-slate-100"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(bed._id)}
                    className="rounded p-1 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {beds.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-500">
                No ICU beds configured
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <BedModal
          bed={editingBed}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}

function BedModal({ bed, onClose, onSaved }: { bed?: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: bed?.name || '',
    type: bed?.type || 'general',
    status: bed?.status || 'available',
    clinicalStatus: bed?.clinicalStatus || 'empty',
    isolationType: bed?.isolationType || 'none',
    cleaningStatus: bed?.cleaningStatus || 'clean',
    ventilatorAvailable: bed?.ventilatorAvailable || false,
    notes: bed?.notes || '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (bed) {
        await hospitalApi.updateICUBed(bed._id, form)
      } else {
        await hospitalApi.createICUBed(form)
      }
      onSaved()
      onClose()
    } catch {}
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">{bed ? 'Edit' : 'Add'} ICU Bed</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Bed Name *</label>
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
              <option value="surgical">Surgical</option>
              <option value="cardiac">Cardiac</option>
              <option value="neonatal">Neonatal</option>
              <option value="pediatric">Pediatric</option>
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
              <option value="cleaning">Cleaning</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Clinical Status</label>
            <select
              value={form.clinicalStatus}
              onChange={(e) => setForm({ ...form, clinicalStatus: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="empty">Empty</option>
              <option value="stable">Stable</option>
              <option value="critical">Critical</option>
              <option value="unstable">Unstable</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Isolation Type</label>
            <select
              value={form.isolationType}
              onChange={(e) => setForm({ ...form, isolationType: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="none">None</option>
              <option value="contact">Contact</option>
              <option value="droplet">Droplet</option>
              <option value="airborne">Airborne</option>
              <option value="protective">Protective</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Cleaning Status</label>
            <select
              value={form.cleaningStatus}
              onChange={(e) => setForm({ ...form, cleaningStatus: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="clean">Clean</option>
              <option value="ready">Ready</option>
              <option value="in-progress">In Progress</option>
              <option value="dirty">Dirty</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ventilator"
              checked={form.ventilatorAvailable}
              onChange={(e) => setForm({ ...form, ventilatorAvailable: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            <label htmlFor="ventilator" className="text-sm text-slate-700">
              Ventilator Available
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-md bg-rose-600 px-4 py-2 text-sm text-white">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
