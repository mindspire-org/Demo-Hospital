import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { Edit2, Trash2, Plus, X, Save, Clock, Info } from 'lucide-react'

type Shift = {
  id: string
  name: string
  start: string
  end: string
  
  absentCharges?: number
  lateDeduction?: number
  earlyOutDeduction?: number
  lateThreshold?: number
  bonusPerPresent?: number
  deductionPerAbsent?: number
  deductionPerLate?: number
  deductionPerMinLate?: number
  deductionPerMinEarlyOut?: number
  enableAbsentChargesRate?: boolean
}

export default function Hospital_StaffSettings(){
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [formState, setFormState] = useState<Partial<Shift>>({})
  const [saving, setSaving] = useState(false)

  useEffect(()=>{
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const res = await hospitalApi.listShifts()
        if (!mounted) return
        const mapped: Shift[] = (res.items||[]).map((x:any)=>({
          id: x._id,
          name: x.name,
          start: x.start,
          end: x.end,
          
          absentCharges: Number(x.absentCharges||0),
          lateDeduction: Number(x.lateDeduction||0),
          earlyOutDeduction: Number(x.earlyOutDeduction||0),
          lateThreshold: Number(x.lateThreshold||0),
          bonusPerPresent: Number(x.bonusPerPresent||0),
          deductionPerAbsent: Number(x.deductionPerAbsent||0),
          deductionPerLate: Number(x.deductionPerLate||0),
          deductionPerMinLate: Number(x.deductionPerMinLate||0),
          deductionPerMinEarlyOut: Number(x.deductionPerMinEarlyOut||0),
          enableAbsentChargesRate: !!x.enableAbsentChargesRate,
        }))
        setShifts(mapped)
      } catch(e){ console.error(e) } finally { setLoading(false) }
    })()
    return ()=>{ mounted = false }
  }, [])

  const openAddDialog = () => {
    setEditingShift(null)
    setFormState({
      name: `Shift ${shifts.length + 1}`,
      start: '09:00',
      end: '17:00',
      lateThreshold: 15,
      bonusPerPresent: 0,
      deductionPerAbsent: 0,
      deductionPerLate: 0,
      deductionPerMinLate: 0,
      deductionPerMinEarlyOut: 0,
      enableAbsentChargesRate: false
    })
    setIsDialogOpen(true)
  }

  const openEditDialog = (sh: Shift) => {
    setEditingShift(sh)
    setFormState({ ...sh })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        name: formState.name || '',
        start: formState.start || '09:00',
        end: formState.end || '17:00',
        lateThreshold: formState.lateThreshold || 0,
        bonusPerPresent: formState.bonusPerPresent || 0,
        deductionPerAbsent: formState.deductionPerAbsent || 0,
        deductionPerLate: formState.deductionPerLate || 0,
        deductionPerMinLate: formState.deductionPerMinLate || 0,
        deductionPerMinEarlyOut: formState.deductionPerMinEarlyOut || 0,
        enableAbsentChargesRate: !!formState.enableAbsentChargesRate
      }

      if (editingShift) {
        await hospitalApi.updateShift(editingShift.id, payload)
        setShifts(prev => prev.map(s => s.id === editingShift.id ? { ...s, ...payload } : s))
      } else {
        const created = await hospitalApi.createShift(payload)
        const newShift: Shift = {
          id: created._id,
          ...payload
        }
        setShifts(prev => [...prev, newShift])
      }
      setIsDialogOpen(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const removeShift = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shift?')) return
    try {
      await hospitalApi.deleteShift(id)
      setShifts(s => s.filter(x=>x.id!==id))
    } catch (e) {
      console.error(e)
    }
  }

  const total = useMemo(()=> shifts.length, [shifts.length])

  const to12Hour = (time: string) => {
    if (!time) return ''
    const [h, m] = time.split(':')
    const hours = parseInt(h)
    const suffix = hours >= 12 ? 'PM' : 'AM'
    const h12 = hours % 12 || 12
    return `${h12}:${m} ${suffix}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-slate-800 dark:text-slate-100">Staff Settings</div>
        <button 
          onClick={openAddDialog} 
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-emerald-200 dark:shadow-none"
        >
          <Plus className="h-4 w-4" />
          Add Shift
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">Shift Management</div>
          <div className="ml-auto text-sm text-slate-500 dark:text-slate-400 font-medium">Total Shifts: {total}</div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/80">
                <th rowSpan={2} className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">Shift Details</th>
                <th colSpan={2} className="px-4 py-2 text-center text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 border-b border-l border-slate-200 dark:border-slate-700 bg-emerald-50/30 dark:bg-emerald-900/10">Rewards</th>
                <th colSpan={2} className="px-4 py-2 text-center text-[9px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 border-b border-t border-l border-slate-200 dark:border-slate-700 bg-rose-50/30 dark:bg-rose-900/10">Fixed Deductions</th>
                <th colSpan={2} className="px-4 py-2 text-center text-[9px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 border-b border-t border-l border-slate-200 dark:border-slate-700 bg-purple-50/30 dark:bg-purple-900/10">Variable Deductions</th>
                <th rowSpan={2} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-l border-slate-200 dark:border-slate-700">Absent Logic</th>
                <th rowSpan={2} className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">Actions</th>
              </tr>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                <th className="px-4 py-2 text-left text-[9px] font-bold uppercase text-slate-400 border-b border-l border-slate-200 dark:border-slate-700">Late Thr.</th>
                <th className="px-4 py-2 text-left text-[9px] font-bold uppercase text-slate-400 border-b border-l border-slate-200 dark:border-slate-700">Bonus/Day</th>
                <th className="px-4 py-2 text-left text-[9px] font-bold uppercase text-slate-400 border-b border-l border-slate-200 dark:border-slate-700">Absent</th>
                <th className="px-4 py-2 text-left text-[9px] font-bold uppercase text-slate-400 border-b border-l border-slate-200 dark:border-slate-700">Late</th>
                <th className="px-4 py-2 text-left text-[9px] font-bold uppercase text-slate-400 border-b border-l border-slate-200 dark:border-slate-700">Late/Min</th>
                <th className="px-4 py-2 text-left text-[9px] font-bold uppercase text-slate-400 border-b border-l border-slate-200 dark:border-slate-700">Early/Min</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {shifts.map((sh)=> (
                <tr key={sh.id} className="group hover:bg-slate-50/30 dark:hover:bg-slate-900/20 transition-all">
                  <td className="sticky left-0 z-10 bg-white dark:bg-slate-800 group-hover:bg-slate-50/30 dark:group-hover:bg-slate-900/20 px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-slate-700 dark:text-slate-200 text-sm tracking-tight">{sh.name}</span>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        <Clock className="h-3 w-3" />
                        <span>{to12Hour(sh.start)} - {to12Hour(sh.end)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-l border-slate-100 dark:border-slate-800 text-sm text-orange-600 dark:text-orange-400 font-bold">
                    {sh.lateThreshold} <span className="text-[10px] font-medium text-slate-400 uppercase">min</span>
                  </td>
                  <td className="px-4 py-3 border-l border-slate-100 dark:border-slate-800 text-sm text-emerald-600 dark:text-emerald-400 font-bold">
                    Rs. {sh.bonusPerPresent?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 border-l border-slate-100 dark:border-slate-800 text-sm text-rose-600 dark:text-rose-400 font-bold">
                    Rs. {sh.deductionPerAbsent?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 border-l border-slate-100 dark:border-slate-800 text-sm text-amber-600 dark:text-amber-400 font-bold">
                    Rs. {sh.deductionPerLate?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 border-l border-slate-100 dark:border-slate-800 text-sm text-purple-600 dark:text-purple-400 font-bold">
                    Rs. {sh.deductionPerMinLate?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 border-l border-slate-100 dark:border-slate-800 text-sm text-pink-600 dark:text-pink-400 font-bold">
                    Rs. {sh.deductionPerMinEarlyOut?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 border-l border-slate-100 dark:border-slate-800">
                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${sh.enableAbsentChargesRate ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                      {sh.enableAbsentChargesRate ? 'DAILY RATE' : 'FIXED'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={()=>openEditDialog(sh)} 
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
                        title="Edit Shift"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={()=>removeShift(sh.id)} 
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                        title="Remove Shift"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {shifts.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 dark:text-slate-400 italic">
                    No shifts configured. Add one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700">
        <Info className="h-5 w-5 text-slate-400 mt-0.5" />
        <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          <p className="font-bold text-slate-600 dark:text-slate-300 mb-1">Shift Configuration Tips:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Night shifts (e.g., 20:00 to 08:00) are fully supported.</li>
            <li><strong>Late Threshold:</strong> Grace period before attendance is marked as late.</li>
            <li><strong>Daily Rate:</strong> If enabled, absent deductions are calculated as (Salary / 30).</li>
          </ul>
        </div>
      </div>

      {/* Shift Modal */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                {editingShift ? <Edit2 className="h-5 w-5 text-emerald-600" /> : <Plus className="h-5 w-5 text-emerald-600" />}
                {editingShift ? 'Edit Shift' : 'Add New Shift'}
              </h3>
              <button onClick={() => setIsDialogOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="grid gap-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Shift Name</label>
                    <input 
                      value={formState.name || ''} 
                      onChange={e => setFormState(s => ({ ...s, name: e.target.value }))}
                      className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all dark:text-slate-200"
                      placeholder="e.g. Morning Shift"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Start Time</label>
                    <input 
                      type="time"
                      value={formState.start || ''} 
                      onChange={e => setFormState(s => ({ ...s, start: e.target.value }))}
                      className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all dark:text-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">End Time</label>
                    <input 
                      type="time"
                      value={formState.end || ''} 
                      onChange={e => setFormState(s => ({ ...s, end: e.target.value }))}
                      className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-700" />

                {/* Configuration Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Rewards */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                      <div className="h-1 w-4 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
                      Rewards & Limits
                    </h4>
                    <div className="grid gap-4">
                      <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/30 dark:border-orange-900/20 dark:bg-orange-900/10 space-y-2">
                        <div className="text-xs font-bold text-orange-700 dark:text-orange-400">Late Threshold (Minutes)</div>
                        <input 
                          type="number" 
                          value={formState.lateThreshold || 0} 
                          onChange={e => setFormState(s => ({ ...s, lateThreshold: Number(e.target.value) }))}
                          className="w-full h-10 rounded-lg border border-orange-200 dark:border-orange-800/50 bg-white dark:bg-slate-800 px-3 text-sm font-bold dark:text-slate-200"
                        />
                      </div>
                      <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 dark:border-emerald-900/20 dark:bg-emerald-900/10 space-y-2">
                        <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Bonus Per Present Day (Rs)</div>
                        <input 
                          type="number" 
                          value={formState.bonusPerPresent || 0} 
                          onChange={e => setFormState(s => ({ ...s, bonusPerPresent: Number(e.target.value) }))}
                          className="w-full h-10 rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-white dark:bg-slate-800 px-3 text-sm font-bold dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fixed Deductions */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest flex items-center gap-2">
                      <div className="h-1 w-4 bg-rose-600 dark:bg-rose-400 rounded-full" />
                      Fixed Deductions
                    </h4>
                    <div className="grid gap-4">
                      <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 dark:border-rose-900/20 dark:bg-rose-900/10 space-y-2">
                        <div className="text-xs font-bold text-rose-700 dark:text-rose-400">Deduction Per Absent (Rs)</div>
                        <input 
                          type="number" 
                          value={formState.deductionPerAbsent || 0} 
                          onChange={e => setFormState(s => ({ ...s, deductionPerAbsent: Number(e.target.value) }))}
                          className="w-full h-10 rounded-lg border border-rose-200 dark:border-rose-800/50 bg-white dark:bg-slate-800 px-3 text-sm font-bold dark:text-slate-200"
                        />
                      </div>
                      <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/30 dark:border-amber-900/20 dark:bg-amber-900/10 space-y-2">
                        <div className="text-xs font-bold text-amber-700 dark:text-amber-400">Deduction Per Late (Rs)</div>
                        <input 
                          type="number" 
                          value={formState.deductionPerLate || 0} 
                          onChange={e => setFormState(s => ({ ...s, deductionPerLate: Number(e.target.value) }))}
                          className="w-full h-10 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-white dark:bg-slate-800 px-3 text-sm font-bold dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Variable Deductions */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-2">
                      <div className="h-1 w-4 bg-purple-600 dark:bg-purple-400 rounded-full" />
                      Variable Deductions
                    </h4>
                    <div className="grid gap-4">
                      <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/30 dark:border-purple-900/20 dark:bg-purple-900/10 space-y-2">
                        <div className="text-xs font-bold text-purple-700 dark:text-purple-400">Deduction Per Minute Late (Rs)</div>
                        <input 
                          type="number" 
                          value={formState.deductionPerMinLate || 0} 
                          onChange={e => setFormState(s => ({ ...s, deductionPerMinLate: Number(e.target.value) }))}
                          className="w-full h-10 rounded-lg border border-purple-200 dark:border-purple-800/50 bg-white dark:bg-slate-800 px-3 text-sm font-bold dark:text-slate-200"
                        />
                      </div>
                      <div className="p-4 rounded-xl border border-pink-100 bg-pink-50/30 dark:border-pink-900/20 dark:bg-pink-900/10 space-y-2">
                        <div className="text-xs font-bold text-pink-700 dark:text-pink-400">Deduction Per Minute Early (Rs)</div>
                        <input 
                          type="number" 
                          value={formState.deductionPerMinEarlyOut || 0} 
                          onChange={e => setFormState(s => ({ ...s, deductionPerMinEarlyOut: Number(e.target.value) }))}
                          className="w-full h-10 rounded-lg border border-pink-200 dark:border-pink-800/50 bg-white dark:bg-slate-800 px-3 text-sm font-bold dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Logic */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <div className="h-1 w-4 bg-slate-600 dark:bg-slate-400 rounded-full" />
                      Advanced Logic
                    </h4>
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 h-[100px] flex items-center">
                      <label className="flex items-start gap-3 cursor-pointer group/toggle w-full">
                        <div className="mt-1">
                          <input 
                            type="checkbox" 
                            checked={formState.enableAbsentChargesRate} 
                            onChange={e => setFormState(s => ({ ...s, enableAbsentChargesRate: e.target.checked }))}
                            className="h-5 w-5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer transition-all" 
                          />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover/toggle:text-emerald-600 transition-colors">Daily Rate Calculation</div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Deduct (Salary / 30) for absences instead of a fixed amount.</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsDialogOpen(false)}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-50"
              >
                {saving ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {editingShift ? 'Update Shift' : 'Save Shift'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

