import React, { useEffect, useMemo, useRef, useState } from 'react'
import { hospitalApi, pharmacyApi } from '../../utils/api'
import SuggestField from '../SuggestField'
import { ClinicalDialogShell, clinicalInp, clinicalLbl } from '../ui/ClinicalDialog'

export default function Medication({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; name: string; dose: string; route?: string; freq: string; duration?: string; start: string; end?: string; prn?: boolean; status?: string }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdMedOrders(encounterId, { limit: 200 }) as any
      const items = (res.orders || []).map((o: any)=>({
        id: String(o._id),
        name: o.drugName || o.drugId || '',
        dose: o.dose || '',
        route: o.route || '',
        freq: o.frequency || '',
        duration: o.duration || '',
        start: String(o.startAt || o.createdAt || ''),
        end: String(o.endAt || ''),
        prn: !!o.prn,
        status: String(o.status || ''),
      }))
      setRows(items)
    }catch{}
  }

  async function save(items: Array<{ name: string; dose: string; route: string; freq: string; duration: string; startDate: string; startTime: string; endDate?: string; endTime?: string; prn: boolean; status: 'active' | 'stopped' }>) {
    try {
      for (const d of items) {
        const name = String(d?.name || '').trim()
        const dose = String(d?.dose || '').trim()
        const route = String(d?.route || '').trim()
        const freq = String(d?.freq || '').trim()
        const duration = String(d?.duration || '').trim()
        const startDate = String(d?.startDate || '').trim()
        const startTime = String(d?.startTime || '').trim()
        const endDate = String(d?.endDate || '').trim()
        const endTime = String(d?.endTime || '').trim()
        const prn = !!d?.prn
        const status = (d?.status || 'active') as 'active' | 'stopped'

        const hasAny = [name, dose, route, freq, duration, startDate, startTime, endDate, endTime].some(x => String(x||'').trim().length > 0)
        if (!hasAny) continue

        if (!name || !dose || !route || !freq || !startDate) {
          alert('Please fill required fields: Name, Dose, Route, Frequency, Start Date')
          return
        }

        const startAt = startTime ? `${startDate}T${startTime}` : startDate
        const endAt = endDate ? (endTime ? `${endDate}T${endTime}` : endDate) : undefined

        await hospitalApi.createIpdMedOrder(encounterId, {
          drugName: name,
          dose,
          route,
          frequency: freq,
          duration: duration || undefined,
          startAt,
          endAt,
          prn,
          status,
        })
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
  onSave: (items: Array<{ name: string; dose: string; route: string; freq: string; duration: string; startDate: string; startTime: string; endDate?: string; endTime?: string; prn: boolean; status: 'active' | 'stopped' }>) => void
}){
  const [items, setItems] = useState<Array<{ name: string; dose: string; route: string; freq: string; duration: string; startDate: string; startTime: string; endDate: string; endTime: string; prn: boolean; status: 'active' | 'stopped' }>>([
    { name: '', dose: '', route: '', freq: '', duration: '', startDate: new Date().toISOString().slice(0, 10), startTime: new Date().toTimeString().slice(0, 5), endDate: '', endTime: '', prn: false, status: 'active' },
  ])

  const [medicineOptions, setMedicineOptions] = useState<string[]>([])
  const searchTimer = useRef<any>(null)

  const suggestions = useMemo(() => medicineOptions, [medicineOptions])

  useEffect(() => {
    if (open) {
      setItems([{ name: '', dose: '', route: '', freq: '', duration: '', startDate: new Date().toISOString().slice(0, 10), startTime: new Date().toTimeString().slice(0, 5), endDate: '', endTime: '', prn: false, status: 'active' }])
    }
  }, [open])

  useEffect(() => {
    let cancelled = false
    async function loadMedicines(){
      try{
        const res: any = await pharmacyApi.getAllMedicines()
        const meds: any[] = res?.medicines || []
        const names = meds.map((m:any)=> String(m?.name || '')).filter(Boolean)
        if (!cancelled) setMedicineOptions(names)
      }catch{
        if (!cancelled) setMedicineOptions([])
      }
    }
    if (open) loadMedicines()
    return ()=>{ cancelled = true }
  }, [open])

  if(!open) return null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(items)
  }

  const addRow = () => setItems([...items, { name: '', dose: '', route: '', freq: '', duration: '', startDate: new Date().toISOString().slice(0, 10), startTime: new Date().toTimeString().slice(0, 5), endDate: '', endTime: '', prn: false, status: 'active' }])
  const removeRow = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const updateRow = (idx: number, patch: Partial<{ name: string; dose: string; route: string; freq: string; duration: string; startDate: string; startTime: string; endDate: string; endTime: string; prn: boolean; status: 'active' | 'stopped' }>) =>
    setItems(items.map((r, i) => (i === idx ? { ...r, ...patch } : r)))

  const updateName = (idx: number, v: string) => {
    updateRow(idx, { name: v })
    const q = String(v || '').trim()
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (q.length < 2) return
    searchTimer.current = setTimeout(async () => {
      try{
        const res: any = await pharmacyApi.searchMedicines(q, 20)
        const rows: any[] = res?.suggestions || []
        const names = rows.map((r:any)=> String(r?.name || '')).filter(Boolean)
        if (names.length > 0) setMedicineOptions(prev => {
          const merged = Array.from(new Set([...(prev || []), ...names]))
          return merged
        })
      }catch{}
    }, 250)
  }

  const DOSE_OPTIONS = ['250mg','500mg','1g','5ml','10ml','1 tab','2 tab']
  const ROUTE_OPTIONS = ['PO','IV','IM','SC','SL','Neb','Topical']
  const FREQ_OPTIONS = ['OD','BD','TID','QID','HS','STAT','SOS','q4h','q6h','q8h','q12h']
  const DURATION_OPTIONS = ['1 day','3 days','5 days','7 days','10 days','14 days','1 month']

  return (
    <ClinicalDialogShell
      open={open}
      title="Add Medication"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-4">
        {items.map((row, idx) => (
          <div key={idx} className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-700">Medicine #{idx + 1}</div>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-3">
                <label className={clinicalLbl}>Name</label>
                <SuggestField
                  as="input"
                  value={row.name}
                  onChange={(v) => updateName(idx, v)}
                  suggestions={suggestions}
                  placeholder="Medicine name"
                  className={clinicalInp}
                />
              </div>

              <div>
                <label className={clinicalLbl}>Dose</label>
                <SuggestField
                  as="input"
                  value={row.dose}
                  onChange={(v) => updateRow(idx, { dose: v })}
                  suggestions={DOSE_OPTIONS}
                  placeholder="e.g. 500mg"
                  className={clinicalInp}
                />
              </div>

              <div>
                <label className={clinicalLbl}>Route</label>
                <select value={row.route} onChange={(e)=>updateRow(idx, { route: e.target.value })} className={clinicalInp}>
                  <option value="">Select</option>
                  {ROUTE_OPTIONS.map(o => (<option key={o} value={o}>{o}</option>))}
                </select>
              </div>

              <div>
                <label className={clinicalLbl}>Frequency</label>
                <SuggestField
                  as="input"
                  value={row.freq}
                  onChange={(v) => updateRow(idx, { freq: v })}
                  suggestions={FREQ_OPTIONS}
                  placeholder="e.g. BD"
                  className={clinicalInp}
                />
              </div>

              <div>
                <label className={clinicalLbl}>Duration</label>
                <SuggestField
                  as="input"
                  value={row.duration}
                  onChange={(v) => updateRow(idx, { duration: v })}
                  suggestions={DURATION_OPTIONS}
                  placeholder="e.g. 5 days"
                  className={clinicalInp}
                />
              </div>

              <div>
                <label className={clinicalLbl}>Status</label>
                <select value={row.status} onChange={(e)=>updateRow(idx, { status: e.target.value as any })} className={clinicalInp}>
                  <option value="active">Active</option>
                  <option value="stopped">Stopped</option>
                </select>
              </div>

              <div>
                <label className={clinicalLbl}>Start Date</label>
                <input type="date" value={row.startDate} onChange={(e)=>updateRow(idx, { startDate: e.target.value })} className={clinicalInp} />
              </div>
              <div>
                <label className={clinicalLbl}>Start Time</label>
                <input type="time" value={row.startTime} onChange={(e)=>updateRow(idx, { startTime: e.target.value })} className={clinicalInp} />
              </div>

              <div>
                <label className={clinicalLbl}>End Date (Optional)</label>
                <input type="date" value={row.endDate} onChange={(e)=>updateRow(idx, { endDate: e.target.value })} className={clinicalInp} />
              </div>
              <div>
                <label className={clinicalLbl}>End Time (Optional)</label>
                <input type="time" value={row.endTime} onChange={(e)=>updateRow(idx, { endTime: e.target.value })} className={clinicalInp} />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={row.prn} onChange={(e)=>updateRow(idx, { prn: e.target.checked })} />
                  PRN (as needed)
                </label>
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Add more
        </button>
      </div>
    </ClinicalDialogShell>
  )
}
