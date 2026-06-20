import { useEffect, useState } from 'react'
import { campApi } from '../../features/camp/camp.api'
import { Pill, Search, Plus } from 'lucide-react'

export default function Camp_Dispensing() {
  const [patients, setPatients] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [q, setQ] = useState('')
  const [medicine, setMedicine] = useState({ name: '', qty: '', dosage: '', timing: '', days: '' })
  const [error, setError] = useState('')

  const load = async () => {
    const res: any = await campApi.listPatients({ q })
    setPatients(res?.items || [])
  }

  useEffect(() => { load() }, [q])

  const addMedicine = async () => {
    if (!selected || !medicine.name) return
    setError('')
    try {
      const medicines = [...(selected.medicinesDispensed || []), medicine]
      await campApi.updatePatient(selected._id, { medicinesDispensed: medicines })
      setMedicine({ name: '', qty: '', dosage: '', timing: '', days: '' })
      load()
      const refreshed: any = await campApi.getPatient(selected._id)
      setSelected(refreshed)
    } catch (err: any) {
      setError(err?.message || 'Failed to dispense medicine')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Pill className="h-6 w-6 text-emerald-600" /> Dispensing</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm h-fit">
          <div className="relative mb-3"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search patients..." className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm outline-none focus:border-emerald-500" /></div>
          <div className="max-h-[70vh] overflow-y-auto space-y-2">
            {patients.map(p => (
              <button key={p._id} onClick={() => setSelected(p)} className={`w-full text-left rounded-xl border px-3 py-2 text-sm transition ${selected?._id === p._id ? 'border-emerald-300 bg-emerald-50' : 'border-slate-100 hover:bg-slate-50'}`}>
                <div className="font-medium text-slate-800">{p.tokenNo} — {p.fullName}</div>
                <div className="text-xs text-slate-500">{p.age} / {p.gender}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          {!selected ? <div className="py-20 text-center text-slate-400">Select a patient to dispense medicines</div> : (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div><div className="text-lg font-semibold text-slate-800">{selected.fullName}</div><div className="text-sm text-slate-500">Token: {selected.tokenNo}</div></div>
              </div>
              {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2 text-sm text-rose-700">{error}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                <input value={medicine.name} onChange={e => setMedicine({ ...medicine, name: e.target.value })} placeholder="Medicine" className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                <input value={medicine.qty} onChange={e => setMedicine({ ...medicine, qty: e.target.value })} placeholder="Qty" className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                <input value={medicine.dosage} onChange={e => setMedicine({ ...medicine, dosage: e.target.value })} placeholder="Dosage" className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                <input value={medicine.timing} onChange={e => setMedicine({ ...medicine, timing: e.target.value })} placeholder="Timing" className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                <input value={medicine.days} onChange={e => setMedicine({ ...medicine, days: e.target.value })} placeholder="Days" className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              </div>
              <button onClick={addMedicine} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"><Plus className="h-4 w-4" /> Add Medicine</button>
              <div className="space-y-2">
                {(selected.medicinesDispensed || []).map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex-1 grid grid-cols-5 gap-2 text-sm">
                      <div className="font-medium text-slate-800">{m.name}</div>
                      <div className="text-slate-500">Qty: {m.qty}</div>
                      <div className="text-slate-500">{m.dosage}</div>
                      <div className="text-slate-500">{m.timing}</div>
                      <div className="text-slate-500">{m.days} days</div>
                    </div>
                  </div>
                ))}
                {(!selected.medicinesDispensed || selected.medicinesDispensed.length === 0) && <div className="text-sm text-slate-400 py-4 text-center">No medicines dispensed yet</div>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
