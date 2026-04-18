import { useState, useEffect, useMemo, useRef } from 'react'
import { hospitalApi, pharmacyApi } from '../../utils/api'

type SearchOption = { value: string; label: string }
function SearchSelect({ options, value, onChange, placeholder }: { options: SearchOption[]; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as any)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  const selectedLabel = useMemo(() => (options.find(o => String(o.value) === String(value))?.label || ''), [options, value])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return options.filter(o => !q || o.label.toLowerCase().includes(q)).slice(0, 100)
  }, [options, query])
  return (
    <div ref={ref} className="relative">
      <input
        value={open ? query : selectedLabel}
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
      />
      <button type="button" onClick={() => setOpen(o => !o)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">▾</button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">No results</div>
          ) : filtered.map(opt => (
            <button
              type="button"
              key={String(opt.value)}
              onClick={() => { onChange(String(opt.value)); setOpen(false) }}
              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50"
            >
              <div className="text-sm text-slate-800">{opt.label}</div>
              {String(opt.value) === String(value) ? <span className="text-xs text-violet-600">✓</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Hospital_ErMedication({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; name: string; dose: string; freq: string; start: string }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listErMedOrders(encounterId, { limit: 200 }) as any
      const items = (res.orders || []).map((o: any)=>({
        id: String(o._id),
        name: o.drugName || o.drugId || '',
        dose: o.dose || '',
        freq: o.frequency || '',
        start: String(o.startAt || o.createdAt || ''),
      }))
      setRows(items)
    }catch{}
  }

  async function save(items: Array<{ name: string; dose: string; freq: string; start: string }>) {
    try {
      for (const d of items) {
        const name = String(d?.name || '').trim()
        const dose = String(d?.dose || '').trim()
        const freq = String(d?.freq || '').trim()
        const start = String(d?.start || '').trim()
        if (!name && !dose && !freq && !start) continue
        await hospitalApi.createErMedOrder(encounterId, { drugName: name, dose, frequency: freq, startAt: start || undefined })
      }
      setOpen(false)
      await reload()
    } catch (e: any) {
      alert(e?.message || 'Failed to add medication')
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Medication</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Medication</button>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No medications added.</div>
      ) : (
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Dose</th>
              <th className="px-3 py-2 font-medium">Frequency</th>
              <th className="px-3 py-2 font-medium">Start</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map(m => (
              <tr key={m.id}>
                <td className="px-3 py-2">{m.name}</td>
                <td className="px-3 py-2">{m.dose}</td>
                <td className="px-3 py-2">{m.freq}</td>
                <td className="px-3 py-2">{m.start}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <MedicationDialog open={open} onClose={()=>setOpen(false)} onSave={save} />
    </div>
  )
}

function MedicationDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (items: Array<{ name: string; dose: string; freq: string; start: string }>) => void
}){
  const [items, setItems] = useState<Array<{ name: string; dose: string; freq: string; start: string }>>([
    { name: '', dose: '', freq: '', start: '' },
  ])
  const [medicineOptions, setMedicineOptions] = useState<Array<{ id: string; name: string }>>([])
  const [loadingMedicines, setLoadingMedicines] = useState(false)

  // Load all medicines from pharmacy inventory on open
  useEffect(() => {
    if (open) {
      setItems([{ name: '', dose: '', freq: '', start: '' }])
      loadMedicines()
    }
  }, [open])

  const loadMedicines = async () => {
    setLoadingMedicines(true)
    try {
      const res = await pharmacyApi.listInventory({ limit: 500 })
      const meds = (res?.items || []).map((it: any) => ({
        id: String(it._id || it.id || ''),
        name: String(it.name || '')
      })).filter((m: any) => m.name)
      setMedicineOptions(meds)
    } catch {
      setMedicineOptions([])
    } finally {
      setLoadingMedicines(false)
    }
  }

  if(!open) return null

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSave(items)
  }

  const addRow = () => setItems([...items, { name: '', dose: '', freq: '', start: '' }])
  const removeRow = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const updateRow = (idx: number, patch: Partial<{ name: string; dose: string; freq: string; start: string }>) =>
    setItems(items.map((r, i) => (i === idx ? { ...r, ...patch } : r)))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Medication</div>
        <div className="space-y-4 px-5 py-4 text-sm">
          {items.map((row, idx) => (
            <div key={idx} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-700">Medicine #{idx + 1}</div>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeRow(idx)} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Remove</button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Name</label>
                  {loadingMedicines ? (
                    <div className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-400">Loading medicines...</div>
                  ) : (
                    <SearchSelect
                      options={medicineOptions.map(m => ({ value: m.name, label: m.name }))}
                      value={row.name}
                      onChange={(v) => updateRow(idx, { name: v })}
                      placeholder="Search medicine..."
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">Dose</label>
                  <input
                    value={row.dose}
                    onChange={(e) => updateRow(idx, { dose: e.target.value })}
                    placeholder="e.g. 500mg"
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">Frequency</label>
                  <input
                    value={row.freq}
                    onChange={(e) => updateRow(idx, { freq: e.target.value })}
                    placeholder="e.g. BID"
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">Start Date</label>
                  <input
                    value={row.start}
                    onChange={(e) => updateRow(idx, { start: e.target.value })}
                    type="date"
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addRow} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Add more
          </button>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn">Save</button>
        </div>
      </form>
    </div>
  )
}
