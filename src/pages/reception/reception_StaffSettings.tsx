import { useEffect, useMemo, useState } from 'react'
import { receptionApi } from '../../utils/api'

type Shift = {
  id: string
  name: string
  start: string
  end: string
}

export default function Reception_StaffSettings(){
  const [shifts, setShifts] = useState<Shift[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(()=>{
    let mounted = true
    ;(async () => {
      try {
        const res = await receptionApi.listShifts()
        if (!mounted) return
        const mapped: Shift[] = (res.items||[]).map((x:any)=>({
          id: x._id,
          name: x.name,
          start: x.start,
          end: x.end,
        }))
        setShifts(mapped)
      } catch(e){ console.error(e) }
    })()
    return ()=>{ mounted = false }
  }, [])

  const update = (i: number, patch: Partial<Shift>) => {
    setShifts(s => { const next = [...s]; next[i] = { ...next[i], ...patch } as Shift; return next })
  }

  const addShift = async () => {
    const created = await receptionApi.createShift({ name: `Shift ${shifts.length+1}`, start: '09:00', end: '17:00' })
    setShifts(s => [...s, {
      id: created._id,
      name: created.name,
      start: created.start,
      end: created.end,
    }])
  }
  const removeShift = async (id: string) => {
    await receptionApi.deleteShift(id)
    setShifts(s => s.filter(x=>x.id!==id))
  }

  const save = async () => {
    setSaving(true)
    try {
      await Promise.all(shifts.map(sh => receptionApi.updateShift(sh.id, {
        name: sh.name,
        start: sh.start,
        end: sh.end,
      })))
    } finally {
      setTimeout(()=>setSaving(false), 300)
    }
  }

  const total = useMemo(()=> shifts.length, [shifts.length])

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-slate-800 dark:text-slate-100">Staff Settings</div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">Shifts</div>
          <div className="ml-auto text-sm text-slate-600 dark:text-slate-400">Total: {total}</div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-t border-slate-200 dark:border-slate-700 rounded-tl-xl">Shift Name</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-t border-slate-200 dark:border-slate-700">Timing (Start/End)</th>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-t border-slate-200 dark:border-slate-700 rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {shifts.map((sh, i)=> (
                <tr key={sh.id} className="group hover:bg-slate-50/30 dark:hover:bg-slate-900/20 transition-all">
                  <td className="px-4 py-4">
                    <input 
                      value={sh.name} 
                      onChange={e=>update(i,{ name: e.target.value })} 
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 px-3 text-sm font-semibold dark:border-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                      placeholder="Shift Name"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <input 
                          type="time" 
                          value={sh.start} 
                          onChange={e=>update(i,{ start: e.target.value })} 
                          className="w-full h-9 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 px-2 text-sm font-medium dark:border-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                        />
                      </div>
                      <span className="text-slate-400 text-xs">to</span>
                      <div className="flex-1">
                        <input 
                          type="time" 
                          value={sh.end} 
                          onChange={e=>update(i,{ end: e.target.value })} 
                          className="w-full h-9 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 px-2 text-sm font-medium dark:border-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button 
                      onClick={()=>removeShift(sh.id)} 
                      className="text-slate-300 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all"
                      title="Remove Shift"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button onClick={addShift} className="btn-outline-navy">Add Shift</button>
          <button onClick={save} disabled={saving} className="btn disabled:opacity-50">{saving? 'Saving...' : 'Save Shifts'}</button>
        </div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Tip: Night shift that ends next day is supported by using an end time smaller than start time (e.g., 20:00 to 08:00).</div>
      </div>
    </div>
  )
}
