import { useMemo, useState } from 'react'
import Hospital_Modal from './Hospital_Modal'
import { Pencil, Trash2, Check, X, BedDouble } from 'lucide-react'

type BedRef = { id: string; label: string; floorId: string; locationType: 'room'|'ward'; locationId: string; charges?: number; category?: string }
type FloorRef = { id: string; name: string }
type RoomRef = { id: string; name: string; floorId: string }
type WardRef = { id: string; name: string; floorId: string }

const CAT_COLORS: Record<string, string> = {
  'ER': 'bg-amber-50 text-amber-700 border-amber-200',
  'ICU': 'bg-rose-50 text-rose-700 border-rose-200',
  'Private': 'bg-violet-50 text-violet-700 border-violet-200',
  'General': 'bg-slate-50 text-slate-700 border-slate-200',
}

type Props = {
  open: boolean
  onClose: () => void
  beds: BedRef[]
  floorsMap: Record<string, FloorRef>
  rooms: RoomRef[]
  wards: WardRef[]
  onUpdate: (id: string, data: { label?: string; charges?: number; category?: string }) => void
  onDelete: (id: string) => void
}

export default function Hospital_ManageBedsModal({ open, onClose, beds, floorsMap, rooms, wards, onUpdate, onDelete }: Props){
  const [edits, setEdits] = useState<Record<string, { label: string; charges: string; category: string }>>({})
  const bedsSorted = useMemo(() => [...beds].sort((a,b)=>a.label.localeCompare(b.label)), [beds])
  const titleOf = (b: BedRef) => {
    const locName = b.locationType === 'room' ? (rooms.find(r=>r.id===b.locationId)?.name || 'Room') : (wards.find(w=>w.id===b.locationId)?.name || 'Ward')
    const floorName = floorsMap[b.floorId]?.name || 'Floor'
    return `${locName} · ${floorName}`
  }
  const startEdit = (b: BedRef) => setEdits(prev => ({ ...prev, [b.id]: { label: b.label, charges: b.charges!=null? String(b.charges):'', category: b.category || '' } }))
  const cancelEdit = (id: string) => setEdits(prev => { const c = { ...prev }; delete c[id]; return c })
  const save = (id: string) => {
    const e = edits[id]; if (!e) return
    const payload: any = {}
    if (e.label.trim()) payload.label = e.label.trim()
    if (e.charges.trim()) payload.charges = Number(e.charges)
    if (e.category.trim()) payload.category = e.category.trim()
    else payload.category = ''
    onUpdate(id, payload)
    cancelEdit(id)
  }
  return (
    <Hospital_Modal open={open} onClose={onClose}>
      <div className="px-1">
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          <BedDouble className="h-5 w-5 text-violet-500" />
          Manage Beds
        </div>
        <div className="mt-4 space-y-3 max-h-[60vh] overflow-auto pr-1">
          {bedsSorted.map(b => {
            const e = edits[b.id]
            const catCls = CAT_COLORS[b.category || ''] || CAT_COLORS['General']
            return (
              <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                {!e ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-slate-800">{b.label}</span>
                        {b.category && (
                          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${catCls}`}>
                            {b.category}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">{titleOf(b)}</div>
                      {b.charges != null && (
                        <div className="mt-1 text-xs font-medium text-slate-600">Rs {b.charges.toLocaleString()} / day</div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => startEdit(b)}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={() => onDelete(b.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Pencil className="h-4 w-4 text-violet-500" />
                      Editing Bed {b.label}
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Bed Label</label>
                        <input
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                          value={e.label}
                          onChange={ev => setEdits(prev => ({ ...prev, [b.id]: { ...prev[b.id], label: ev.target.value } }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Charges / Day</label>
                        <input
                          type="number"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                          value={e.charges}
                          onChange={ev => setEdits(prev => ({ ...prev, [b.id]: { ...prev[b.id], charges: ev.target.value } }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Category</label>
                        <select
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                          value={e.category}
                          onChange={ev => setEdits(prev => ({ ...prev, [b.id]: { ...prev[b.id], category: ev.target.value } }))}
                        >
                          <option value="">None</option>
                          <option>General</option>
                          <option>Private</option>
                          <option>ICU</option>
                          <option>ER</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => save(b.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                      >
                        <Check className="h-3.5 w-3.5" /> Save Changes
                      </button>
                      <button
                        onClick={() => cancelEdit(b.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" /> Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {!bedsSorted.length && (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <BedDouble className="h-8 w-8 mb-2 opacity-40" />
              <div className="text-sm">No beds found</div>
            </div>
          )}
        </div>
      </div>
    </Hospital_Modal>
  )
}
