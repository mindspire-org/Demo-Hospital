import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, SlidersHorizontal } from 'lucide-react'
import { api } from '../../api'

type Lab = { _id: string; name: string }
type Disp = {
  _id: string
  outsourceLabName?: string
  outsourceLabId: string
  tokenNo?: string
  patientName?: string
  testName: string
  status: 'dispatched' | 'in_progress' | 'received' | 'cancelled'
  dispatchedAt: string
  receivedAt?: string
  externalReportUrl?: string
  externalResultText?: string
  notes?: string
}

export default function Lab_OutsourceDispatch() {
  const [labs, setLabs] = useState<Lab[]>([])
  const [labId, setLabId] = useState('')
  const [status, setStatus] = useState('')
  const [items, setItems] = useState<Disp[]>([])
  const [q, setQ] = useState('')

  async function load() {
    const q = new URLSearchParams()
    if (labId) q.set('outsourceLabId', labId)
    if (status) q.set('status', status)
    const r = await api(`/lab/outsource-dispatches?${q}`)
    setItems(r.items || [])
  }
  useEffect(() => { (async () => { const r = await api('/lab/outsource-labs'); setLabs(r.items || []) })() }, [])
  useEffect(() => { load() }, [labId, status])

  async function update(id: string, patch: any) {
    await api(`/lab/outsource-dispatches/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
    load()
  }

  const rows = useMemo(() => {
    const f = q.trim().toLowerCase()
    if (!f) return items
    return items.filter(d => (d.tokenNo || '').toLowerCase().includes(f) || (d.patientName || '').toLowerCase().includes(f) || (d.testName || '').toLowerCase().includes(f) || (d.outsourceLabName || '').toLowerCase().includes(f))
  }, [items, q])

  const kpi = useMemo(() => {
    const total = items.length
    const dispatched = items.filter(x => x.status === 'dispatched').length
    const inProgress = items.filter(x => x.status === 'in_progress').length
    const received = items.filter(x => x.status === 'received').length
    return { total, dispatched, inProgress, received }
  }, [items])

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-violet-600 via-sky-600 to-emerald-500 p-5 text-white shadow-lg shadow-sky-200/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Outsource Dispatches</h2>
            <div className="mt-0.5 text-sm text-sky-100">Track samples sent to external labs</div>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4 shadow-sm">
            <div className="text-xs font-medium text-slate-700">Total</div>
            <div className="text-3xl font-extrabold tracking-tight text-slate-900">{kpi.total}</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-linear-to-br from-amber-50 to-white p-4 shadow-sm">
            <div className="text-xs font-medium text-amber-700">Dispatched</div>
            <div className="text-3xl font-extrabold tracking-tight text-amber-900">{kpi.dispatched}</div>
          </div>
          <div className="rounded-xl border border-sky-200 bg-linear-to-br from-sky-50 to-white p-4 shadow-sm">
            <div className="text-xs font-medium text-sky-700">In Progress</div>
            <div className="text-3xl font-extrabold tracking-tight text-sky-900">{kpi.inProgress}</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-white p-4 shadow-sm">
            <div className="text-xs font-medium text-emerald-700">Received</div>
            <div className="text-3xl font-extrabold tracking-tight text-emerald-900">{kpi.received}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 text-sm">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </div>
          <label className="block"><span className="text-xs text-slate-600">Outsource lab</span>
            <select value={labId} onChange={e => setLabId(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5">
              <option value="">All</option>
              {labs.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
          </label>
          <label className="block"><span className="text-xs text-slate-600">Status</span>
            <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5">
              <option value="">All</option>
              <option value="dispatched">Dispatched</option>
              <option value="in_progress">In progress</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search token, patient, test, lab..." className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />
          </div>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-slate-200 bg-slate-50">
            <tr className="text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Dispatched</th>
              <th className="px-4 py-3">Lab</th>
              <th className="px-4 py-3">Token</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Test</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!rows.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No dispatches.</td></tr>}
            {rows.map(d => (
              <tr key={d._id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 whitespace-nowrap text-slate-700">{new Date(d.dispatchedAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-900 font-medium">{d.outsourceLabName}</td>
                <td className="px-4 py-3 font-mono font-semibold text-slate-900">{d.tokenNo}</td>
                <td className="px-4 py-3 text-slate-700">{d.patientName}</td>
                <td className="px-4 py-3 text-slate-700">{d.testName}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${d.status === 'received' ? 'bg-emerald-100 text-emerald-700 ring-emerald-200' : d.status === 'cancelled' ? 'bg-rose-100 text-rose-700 ring-rose-200' : d.status === 'in_progress' ? 'bg-sky-100 text-sky-700 ring-sky-200' : 'bg-amber-100 text-amber-700 ring-amber-200'}`}>{d.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2 text-xs">
                    {d.status !== 'received' && (
                      <button onClick={() => update(d._id, { status: 'received' })} className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700 hover:bg-emerald-100">Mark received</button>
                    )}
                    {d.status === 'dispatched' && (
                      <button onClick={() => update(d._id, { status: 'in_progress' })} className="rounded-md border border-sky-300 bg-sky-50 px-3 py-1.5 font-semibold text-sky-700 hover:bg-sky-100">Start</button>
                    )}
                    {d.status !== 'cancelled' && d.status !== 'received' && (
                      <button onClick={() => update(d._id, { status: 'cancelled' })} className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 font-semibold text-rose-700 hover:bg-rose-100">Cancel</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
