import { useEffect, useState } from 'react'
import { campApi } from '../../features/camp/camp.api'
import { Microscope, Search, Plus, Save } from 'lucide-react'

export default function Camp_Diagnostics() {
  const [patients, setPatients] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [q, setQ] = useState('')
  const [testName, setTestName] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    const res: any = await campApi.listPatients({ q })
    setPatients(res?.items || [])
  }

  useEffect(() => { load() }, [q])

  const addOrder = async () => {
    if (!selected || !testName) return
    setError('')
    try {
      const orders = [...(selected.diagnosticOrders || []), { testName, status: 'pending', result: '', diagnosticOrderId: '' }]
      await campApi.updatePatient(selected._id, { diagnosticOrders: orders })
      setTestName('')
      load()
      const refreshed: any = await campApi.getPatient(selected._id)
      setSelected(refreshed)
    } catch (err: any) {
      setError(err?.message || 'Failed to add diagnostic order')
    }
  }

  const updateResult = async (index: number) => {
    if (!selected) return
    setError('')
    try {
      const orders = [...(selected.diagnosticOrders || [])]
      orders[index] = { ...orders[index], result, status: 'completed' }
      await campApi.updatePatient(selected._id, { diagnosticOrders: orders })
      setResult('')
      load()
      const refreshed: any = await campApi.getPatient(selected._id)
      setSelected(refreshed)
    } catch (err: any) {
      setError(err?.message || 'Failed to update result')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Microscope className="h-6 w-6 text-emerald-600" /> Diagnostic Orders</h1>
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
          {!selected ? <div className="py-20 text-center text-slate-400">Select a patient to manage diagnostic orders</div> : (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div><div className="text-lg font-semibold text-slate-800">{selected.fullName}</div><div className="text-sm text-slate-500">Token: {selected.tokenNo}</div></div>
              </div>
              {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2 text-sm text-rose-700">{error}</div>}
              <div className="flex gap-2">
                <input value={testName} onChange={e => setTestName(e.target.value)} placeholder="Test name (e.g. X-Ray, Ultrasound)" className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-500" />
                <button onClick={addOrder} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"><Plus className="h-4 w-4" /> Add</button>
              </div>
              <div className="space-y-2">
                {(selected.diagnosticOrders || []).map((o: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-800">{o.testName}</div>
                      <div className="text-xs text-slate-500">Status: <span className={`font-medium ${o.status === 'completed' ? 'text-emerald-600' : 'text-amber-600'}`}>{o.status}</span></div>
                      {o.result && <div className="text-xs text-slate-600 mt-1">Result: {o.result}</div>}
                    </div>
                    {o.status !== 'completed' && (
                      <div className="flex gap-2">
                        <input value={result} onChange={e => setResult(e.target.value)} placeholder="Result" className="w-40 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none" />
                        <button onClick={() => updateResult(i)} className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"><Save className="h-3 w-3" /></button>
                      </div>
                    )}
                  </div>
                ))}
                {(!selected.diagnosticOrders || selected.diagnosticOrders.length === 0) && <div className="text-sm text-slate-400 py-4 text-center">No diagnostic orders yet</div>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
