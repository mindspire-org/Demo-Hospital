import { useState, useEffect, useMemo, useRef } from 'react'
import { hospitalApi, pharmacyApi, opdApi, ipdApi } from '../../../../utils/api'
import ConfirmDialog from '../../../common/ConfirmDialog'

type SearchOption = { value: string; label: string }

function SearchSelect({ options, value, onChange, placeholder }: { options: SearchOption[]; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as any)) {
        if (query.trim() && !options.some(o => o.label.toLowerCase() === query.trim().toLowerCase())) {
          onChange(query.trim())
        }
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [query, options, onChange])
  const selectedLabel = useMemo(() => (options.find(o => String(o.value) === String(value))?.label || value || ''), [options, value])
  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    return options.filter(o => !q || o.label.toLowerCase().includes(q)).slice(0, 100)
  }, [options, query])
  return (
    <div ref={ref} className="relative">
      <input
        value={open ? (query || '') : (selectedLabel || '')}
        onFocus={() => { setOpen(true); setQuery(value || '') }}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onChange((query || '').trim())
            setOpen(false)
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
      />
      <button type="button" onClick={() => setOpen(o => !o)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">▾</button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">
              No results. Press Enter to use "{query}"
            </div>
          ) : filtered.map(opt => (
            <button
              type="button"
              key={String(opt.value)}
              onClick={() => { onChange(String(opt.value)); setQuery(opt.label); setOpen(false) }}
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

function MedicationDialog({
  open,
  onClose,
  onSave,
  editingData,
}: {
  open: boolean
  onClose: () => void
  onSave: (items: Array<{ name: string; dose: string; route: string; freq: string; duration: string; prescribedBy: string; prescribingDoctorId: string }>) => void
  editingData?: any
}){
  const [items, setItems] = useState<Array<{ name: string; dose: string; route: string; freq: string; duration: string; prescribedBy: string; prescribingDoctorId: string }>>([
    { name: '', dose: '', route: '', freq: '', duration: '', prescribedBy: '', prescribingDoctorId: '' },
  ])
  const [medicineOptions, setMedicineOptions] = useState<Array<{ id: string; name: string }>>([])
  const [loadingMedicines, setLoadingMedicines] = useState(false)
  const [doctorOptions, setDoctorOptions] = useState<Array<{ _id: string; name: string }>>([])

  useEffect(() => {
    if (open) {
      if (editingData) {
        setItems([{ 
          name: editingData.name || '', 
          dose: editingData.dose || '', 
          route: editingData.route || '', 
          freq: editingData.freq || '', 
          duration: editingData.duration || '', 
          prescribedBy: editingData.prescribedBy || '',
          prescribingDoctorId: editingData.prescribingDoctorId || '',
        }])
      } else {
        setItems([{ name: '', dose: '', route: '', freq: '', duration: '', prescribedBy: '', prescribingDoctorId: '' }])
      }
      loadMedicines()
      loadDoctors()
    }
  }, [open, editingData])

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

  const loadDoctors = async () => {
    try {
      const res = await hospitalApi.listDoctors() as any
      const docs = (res?.doctors || res || []) as Array<{ _id: string; name: string }>
      setDoctorOptions(docs)
    } catch {
      setDoctorOptions([])
    }
  }

  if(!open) return null

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSave(items)
  }

  const addRow = () => {
    setItems([...items, { name: '', dose: '', route: '', freq: '', duration: '', prescribedBy: '', prescribingDoctorId: '' }])
  }
  const removeRow = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const updateRow = (idx: number, patch: Partial<{ name: string; dose: string; route: string; freq: string; duration: string; prescribedBy: string; prescribingDoctorId: string }>) =>
    setItems(items.map((r, i) => (i === idx ? { ...r, ...patch } : r)))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">{editingData ? 'Edit Medication' : 'Add Medication'}</div>
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
                      value={row.name || ''}
                      onChange={(v) => updateRow(idx, { name: v })}
                      placeholder="Search medicine..."
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">Dose</label>
                  <input
                    value={row.dose || ''}
                    onChange={(e) => updateRow(idx, { dose: e.target.value })}
                    placeholder="e.g. 500mg"
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Route</label>
                    <select
                      value={row.route || ''}
                      onChange={(e) => updateRow(idx, { route: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                    >
                      <option value="">Select Route</option>
                      <option value="Oral">Oral</option>
                      <option value="IV">IV</option>
                      <option value="IM">IM</option>
                      <option value="SC">SC</option>
                      <option value="Topical">Topical</option>
                      <option value="Inhalation">Inhalation</option>
                      <option value="Sublingual">Sublingual</option>
                      <option value="PR">PR</option>
                      <option value="NGT">NGT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Frequency</label>
                    <select
                      value={row.freq || ''}
                      onChange={(e) => updateRow(idx, { freq: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                    >
                      <option value="">Select Frequency</option>
                      <option value="OD">OD (Once Daily)</option>
                      <option value="BID">BID (Twice Daily)</option>
                      <option value="TID">TID (Thrice Daily)</option>
                      <option value="QID">QID (Four Times Daily)</option>
                      <option value="Q4H">Q4H (Every 4 Hours)</option>
                      <option value="Q6H">Q6H (Every 6 Hours)</option>
                      <option value="Q8H">Q8H (Every 8 Hours)</option>
                      <option value="Q12H">Q12H (Every 12 Hours)</option>
                      <option value="SOS">SOS (As Needed)</option>
                      <option value="STAT">STAT (Immediately)</option>
                      <option value="HS">HS (At Bedtime)</option>
                      <option value="AC">AC (Before Meals)</option>
                      <option value="PC">PC (After Meals)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Duration</label>
                    <input
                      value={row.duration || ''}
                      onChange={(e) => updateRow(idx, { duration: e.target.value })}
                      placeholder="e.g. 5 days"
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Prescribed By</label>
                    <SearchSelect
                      options={doctorOptions.map(d => ({ value: d._id, label: d.name }))}
                      value={row.prescribingDoctorId || ''}
                      onChange={(v) => {
                        const doc = doctorOptions.find(d => d._id === v)
                        updateRow(idx, { prescribingDoctorId: v, prescribedBy: doc?.name || v })
                      }}
                      placeholder="Search doctor..."
                    />
                  </div>
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

function ExecutionDialog({
  open,
  onClose,
  onSave,
  order,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: { quantity: number; remarks: string; executedAt: string; performedBy?: string }) => void
  order: any
}) {
  const [quantity, setQuantity] = useState(1)
  const [remarks, setRemarks] = useState('')
  const [performedBy, setPerformedBy] = useState('')
  const [execDate, setExecDate] = useState('')
  const [execTime, setExecTime] = useState('')

  useEffect(() => {
    if (open) {
      setQuantity(1)
      setRemarks('')
      setPerformedBy('')
      const now = new Date()
      const offset = now.getTimezoneOffset() * 60000
      const local = new Date(now.getTime() - offset)
      setExecDate(local.toISOString().slice(0, 10))
      setExecTime(local.toTimeString().slice(0, 5))
    }
  }, [open])

  const handleSubmit = () => {
    if (!execDate || !execTime) return
    const executedAt = `${execDate}T${execTime}`
    onSave({ quantity, remarks, executedAt, performedBy: performedBy.trim() || undefined })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">
          <span className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-emerald-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Execution
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="border border-slate-200 rounded-lg overflow-hidden">
             <table className="w-full text-xs">
               <thead>
                 <tr className="bg-slate-50 border-b border-slate-200">
                   <th className="px-4 py-2 text-left font-medium border-r border-slate-200">Description</th>
                   <th className="px-4 py-2 text-center font-medium w-32">Quantity</th>
                 </tr>
               </thead>
               <tbody>
                 <tr>
                   <td className="px-4 py-3 border-r border-slate-200">
                     <div className="font-bold text-blue-700 uppercase tracking-wide">Medications</div>
                     <div className="mt-1"><span className="font-semibold text-slate-700">Route:</span> {order?.route || 'N/A'}</div>
                     <div className="mt-0.5"><span className="font-semibold text-slate-700">Description:</span> {order?.name} {order?.dose} {order?.freq} {order?.duration}</div>
                     <div className="mt-0.5"><span className="font-semibold text-slate-700">Prescribed By:</span> {order?.prescribedBy || '-'}</div>
                   </td>
                   <td className="px-4 py-3 align-top text-center">
                     <input
                       type="number"
                       min={1}
                       value={quantity || 1}
                       onChange={e => setQuantity(Number(e.target.value))}
                       className="w-full rounded-md border border-slate-300 px-3 py-2 text-center"
                     />
                   </td>
                 </tr>
               </tbody>
             </table>
          </div>

          {/* Modern Date/Time Picker */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Execution Time
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={execDate}
                    onChange={e => setExecDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pl-9 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
              </div>
              <div className="relative">
                <label className="mb-1 block text-xs font-medium text-slate-600">Time</label>
                <div className="relative">
                  <input
                    type="time"
                    value={execTime}
                    onChange={e => setExecTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pl-9 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Performed By <span className="font-normal normal-case text-slate-400">(Optional)</span></label>
              <input
                value={performedBy || ''}
                onChange={e => setPerformedBy(e.target.value)}
                placeholder="e.g. Nurse Name"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Remarks</label>
              <textarea
                value={remarks || ''}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Execution Remarks"
                rows={1}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200">Submit</button>
        </div>
      </div>
    </div>
  )
}

export default function Hospital_IpdMedication({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ 
    id: string; 
    name: string; 
    dose: string; 
    route: string; 
    freq: string; 
    duration: string; 
    prescribedBy: string;
    prescribingDoctorId: string;
    status: 'active' | 'stopped';
    executions: Array<{
      quantity: number;
      remarks: string;
      executedAt: string;
      staffName: string;
    }>;
  }>>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<any>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  
  const [execOpen, setExecOpen] = useState(false)
  const [executingOrder, setExecutingOrder] = useState<any>(null)

  const [patientMrn, setPatientMrn] = useState<string>('')
  const [opdPrescriptions, setOpdPrescriptions] = useState<any[]>([])
  const [loadOpdOpen, setLoadOpdOpen] = useState(false)
  const [loadingOpd, setLoadingOpd] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function resolvePatientMrn(): Promise<string> {
    if (patientMrn) return patientMrn
    try {
      const res: any = await ipdApi.getIPDAdmissionById(encounterId)
      const mrn = String(res?.encounter?.patientId?.mrn || res?.encounter?.patientId || '')
      if (mrn) setPatientMrn(mrn)
      return mrn
    } catch { return '' }
  }

  async function openLoadOpd() {
    setLoadingOpd(true)
    try {
      const mrn = await resolvePatientMrn()
      if (!mrn) { alert('Could not determine patient MRN'); setLoadingOpd(false); return }
      const res: any = await opdApi.listPrescriptions({ patientMrn: mrn, limit: 20 })
      const list = (res?.prescriptions || []).filter((p: any) => Array.isArray(p.items) && p.items.length > 0)
      if (list.length === 0) { alert('No OPD prescriptions found for this patient'); setLoadingOpd(false); return }
      setOpdPrescriptions(list)
      setLoadOpdOpen(true)
    } catch (e: any) { alert(e?.message || 'Failed to load OPD prescriptions') }
    setLoadingOpd(false)
  }

  async function importOpdMeds(prescription: any) {
    if (!prescription) return
    const items = (prescription.items || []).filter((it: any) => String(it?.name || it?.medicine || '').trim())
    if (items.length === 0) { alert('No medicines in this prescription'); return }

    const doctorName = String(prescription.encounterId?.doctorId?.name || prescription.doctorId?.name || 'OPD Doctor')
    const doctorId = String(prescription.encounterId?.doctorId?._id || prescription.doctorId?._id || '')

    try {
      for (const it of items) {
        const name = String(it.name || it.medicine || '').trim()
        const dose = String(it.dose || it.dosage || '').trim()
        const freq = String(it.frequency || '').trim()
        const dur = String(it.duration || '').trim()
        const route = String(it.route || '').trim()
        if (!name) continue
        await hospitalApi.createIpdMedOrder(encounterId, {
          drugName: name, dose, route, frequency: freq, duration: dur,
          prescribedBy: doctorName, prescribingDoctorId: doctorId,
        })
      }
      setLoadOpdOpen(false)
      await reload()
    } catch (e: any) { alert(e?.message || 'Failed to import medications') }
  }

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
        prescribedBy: o.prescribedBy || '',
        prescribingDoctorId: o.prescribingDoctorId || '',
        status: o.status || 'active',
        executions: (o.executions || []).map((e: any) => ({
          quantity: e.quantity,
          remarks: e.remarks,
          executedAt: e.executedAt,
          staffName: e.staffName
        }))
      }))
      setRows(items)
    }catch{}
  }

  async function save(items: Array<{ name: string; dose: string; route: string; freq: string; duration: string; prescribedBy: string; prescribingDoctorId: string }>) {
    try {
      for (const d of items) {
        const name = String(d?.name || '').trim()
        const dose = String(d?.dose || '').trim()
        const route = String(d?.route || '').trim()
        const freq = String(d?.freq || '').trim()
        const duration = String(d?.duration || '').trim()
        const prescribedBy = String(d?.prescribedBy || '').trim()
        const prescribingDoctorId = String(d?.prescribingDoctorId || '').trim()
        if (!name && !dose && !freq) continue
        await hospitalApi.createIpdMedOrder(encounterId, { drugName: name, dose, route, frequency: freq, duration, prescribedBy, prescribingDoctorId })
      }
      setOpen(false)
      await reload()
    } catch (e: any) {
      alert(e?.message || 'Failed to add medication')
    }
  }

  async function update(d: { name: string; dose: string; route: string; freq: string; duration: string; prescribedBy: string; prescribingDoctorId: string }) {
    if (!editingId) return
    try {
      await hospitalApi.createIpdMedOrder(encounterId, { drugName: d.name, dose: d.dose, route: d.route, frequency: d.freq, duration: d.duration, prescribedBy: d.prescribedBy, prescribingDoctorId: d.prescribingDoctorId })
      await hospitalApi.deleteIpdMedOrder(editingId)
      setEditingId(null); setEditingData(null); setOpen(false)
      await reload()
    } catch (e: any) {
      alert(e?.message || 'Failed to update medication')
    }
  }

  const stopMed = async (id: string) => {
    try {
      await hospitalApi.stopIpdMedOrder(id)
      await reload()
    } catch (e: any) {
      alert(e?.message || 'Failed to stop medication')
    }
  }

  const executeMed = (m: any) => {
    setExecutingOrder(m)
    setExecOpen(true)
  }

  const handleExecuteSave = async (data: { quantity: number; remarks: string; executedAt: string; performedBy?: string }) => {
    if (!executingOrder) return
    try {
      await hospitalApi.executeIpdMedOrder(executingOrder.id, data)
      setExecOpen(false)
      setExecutingOrder(null)
      await reload()
    } catch (e: any) {
      alert(e?.message || 'Failed to record execution')
    }
  }

  const allExecutionTimes = useMemo(() => {
    const times = new Set<string>()
    rows.forEach(r => {
      r.executions.forEach(e => {
        const d = new Date(e.executedAt)
        const str = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
        times.add(str)
      })
    })
    return Array.from(times).sort()
  }, [rows])

  const remove = (id: string) => { setDeleteId(id); setDeleteConfirmOpen(true) }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try { await hospitalApi.deleteIpdMedOrder(deleteId); await reload() } catch (e: any) { alert(e?.message || 'Failed to delete') }
    setDeleteId(null)
  }

  const startEdit = (r: any) => { setEditingId(r.id); setEditingData(r); setOpen(true) }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 overflow-x-auto">
      <div className="mb-2 flex items-center justify-between min-w-max print:hidden">
        <div className="text-lg font-semibold text-slate-900">Medication</div>
        <div className="flex items-center gap-2">
          <button
            onClick={openLoadOpd}
            disabled={loadingOpd}
            className="inline-flex items-center gap-1.5 rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50"
          >
            {loadingOpd ? (
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="10" x2="16" y2="10"/></svg>
            )}
            Load OPD Medication
          </button>
          <button onClick={()=>setOpen(true)} className="btn">Add Medication</button>
        </div>
      </div>

      {loadOpdOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">
              <span>Load OPD Prescription</span>
              <button onClick={() => setLoadOpdOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-3">
              {opdPrescriptions.length === 0 ? (
                <div className="text-sm text-slate-500">No prescriptions found.</div>
              ) : (
                opdPrescriptions.map((pres: any) => (
                  <div key={pres._id} className="rounded-lg border border-slate-200 p-3 hover:border-sky-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-800">
                        {pres.createdAt ? new Date(pres.createdAt).toLocaleDateString('en-GB') : 'Unknown date'}
                      </div>
                      <button
                        onClick={() => importOpdMeds(pres)}
                        className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                      >
                        Import {pres.items?.length || 0} med{pres.items?.length !== 1 ? 's' : ''}
                      </button>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Doctor: {pres.encounterId?.doctorId?.name || pres.doctorId?.name || 'Unknown'}
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
                      {(pres.items || []).map((it: any, idx: number) => (
                        <span key={idx} className="inline-block mr-2 mb-1 rounded bg-slate-100 px-1.5 py-0.5">
                          {it.name || it.medicine || '-'} {it.dose || it.dosage || ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={() => setLoadOpdOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="text-slate-500">No medications added.</div>
      ) : (
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2 font-medium border border-slate-200">Description</th>
              <th className="px-3 py-2 font-medium border border-slate-200">Category</th>
              <th className="px-3 py-2 font-medium border border-slate-200 print:hidden">Action</th>
              {allExecutionTimes.map(t => (
                <th key={t} className="px-3 py-2 font-medium border border-slate-200 text-center">{t}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map(m => (
              <tr key={m.id}>
                <td className="px-3 py-2 border border-slate-200">
                  <div className="font-bold text-blue-700 uppercase">Medications</div>
                  <div><span className="font-bold">Route:</span> {m.route || 'N/A'}</div>
                  <div><span className="font-bold">Description:</span> {m.name} {m.dose} {m.freq} {m.duration}</div>
                  <div><span className="font-bold">Prescribed By:</span> {m.prescribedBy || '-'}</div>
                </td>
                <td className="px-3 py-2 border border-slate-200">Prescriptions</td>
                <td className="px-3 py-2 border border-slate-200 print:hidden">
                  <div className="flex gap-2">
                    {m.status === 'active' && (
                      <button onClick={() => executeMed(m)} title="Execute" className="text-emerald-600 hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
                      </button>
                    )}
                    {m.status === 'active' && (
                      <button onClick={() => stopMed(m.id)} title="Stop" className="text-rose-600 hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18 18H6V6h12v12z"/></svg>
                      </button>
                    )}
                    {m.status === 'stopped' && <span className="text-rose-500 font-bold italic">Stopped</span>}
                  </div>
                  <div className="mt-1 flex gap-1">
                    <button onClick={() => startEdit(m)} className="text-[10px] text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => remove(m.id)} className="text-[10px] text-red-600 hover:underline">Delete</button>
                  </div>
                </td>
                {allExecutionTimes.map(t => {
                  const exec = m.executions.find(e => {
                    const d = new Date(e.executedAt)
                    const str = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
                    return str === t
                  })
                  return (
                    <td key={t} className="px-3 py-2 border border-slate-200 text-center align-middle min-w-[100px]">
                      {exec ? (
                        <div className="flex flex-col items-center text-[10px] leading-tight text-slate-700">
                          <div className="text-emerald-600 mb-1">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          </div>
                          <div className="font-bold">Qty: {exec.quantity}</div>
                          <div className="truncate w-full max-w-[120px]" title={exec.remarks}>{exec.remarks}</div>
                          <div className="text-slate-500 italic">{exec.staffName}</div>
                        </div>
                      ) : null}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <MedicationDialog key={editingId || 'add'} open={open} onClose={()=>{ setOpen(false); setEditingId(null); setEditingData(null) }} onSave={editingId ? (items) => update(items[0]) : save} editingData={editingData} />
      <ExecutionDialog open={execOpen} onClose={() => { setExecOpen(false); setExecutingOrder(null) }} onSave={handleExecuteSave} order={executingOrder} />
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Medication"
        message="Are you sure you want to delete this medication?"
        onConfirm={() => { handleDeleteConfirm(); setDeleteConfirmOpen(false) }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null) }}
      />
    </div>
  )
}
