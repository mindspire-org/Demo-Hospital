import { useEffect, useMemo, useState } from 'react'
import { Copy, RefreshCw, Save, Search, SlidersHorizontal } from 'lucide-react'
import { api } from '../../api'

type Lab = { _id: string; name: string; shareMode: 'percent' | 'amount' }
type Test = { _id: string; name: string; price?: number; category?: string }
type Rate = { _id?: string; outsourceLabId: string; testId: string; testName: string; category?: string; status: boolean; labRate: number; outsourceShareRs: number; outsourceSharePct: number }

export default function Lab_OutsourceRateList() {
  const labId = (() => { try { return new URLSearchParams(location.search).get('labId') || '' } catch { return '' } })()
  const [labs, setLabs] = useState<Lab[]>([])
  const [activeId, setActiveId] = useState(labId)
  const [tests, setTests] = useState<Test[]>([])
  const [rates, setRates] = useState<Record<string, Rate>>({})
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'agreed' | 'non_agreed'>('all')
  const [busy, setBusy] = useState(false)

  async function loadLabs() {
    const r = await api('/lab/outsource-labs')
    setLabs(r.items || [])
    if (!activeId && r.items?.[0]) setActiveId(r.items[0]._id)
  }
  async function loadAll() {
    if (!activeId) return
    setBusy(true)
    try {
      const [t, r] = await Promise.all([api('/lab/tests?limit=2000'), api(`/lab/outsource-rates?outsourceLabId=${activeId}`)])
      setTests(t.items || [])
      const map: Record<string, Rate> = {}
      for (const it of r.items || []) map[it.testId] = it
      setRates(map)
    } finally { setBusy(false) }
  }
  useEffect(() => { loadLabs() }, [])
  useEffect(() => { loadAll() }, [activeId])

  const rows = useMemo(() => {
    const f = q.trim().toLowerCase()
    return tests.filter(t => !f || t.name.toLowerCase().includes(f)).filter(t => {
      if (statusFilter === 'all') return true
      const r = rates[t._id]
      const agreed = !!(r && r.status)
      return statusFilter === 'agreed' ? agreed : !agreed
    })
  }, [tests, q, rates, statusFilter])

  function update(testId: string, patch: Partial<Rate>) {
    const r = rates[testId] || ({ outsourceLabId: activeId, testId, testName: tests.find(t => t._id === testId)?.name || '', status: false, labRate: 0, outsourceShareRs: 0, outsourceSharePct: 0 } as Rate)
    setRates({ ...rates, [testId]: { ...r, ...patch } })
  }

  async function saveAll() {
    if (!activeId) return
    const items = Object.values(rates)
    await api('/lab/outsource-rates/bulk', { method: 'POST', body: JSON.stringify({ outsourceLabId: activeId, items }) })
    alert('Saved')
    loadAll()
  }

  async function copyFrom() {
    const fromId = prompt('Copy rate list from outsource lab id:')
    if (!fromId) return
    await api(`/lab/outsource-rates/copy/${fromId}`, { method: 'POST', body: JSON.stringify({ toId: activeId }) })
    loadAll()
  }

  const activeLab = labs.find(l => l._id === activeId)
  const agreedCount = useMemo(() => {
    let c = 0
    for (const t of tests) {
      const r = rates[t._id]
      if (r && r.status) c++
    }
    return c
  }, [tests, rates])

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-violet-600 via-sky-600 to-emerald-500 p-5 text-white shadow-lg shadow-sky-200/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Outsource Rate List</h2>
            <div className="mt-0.5 text-sm text-sky-100">Set agreed rates per test for external labs</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={loadAll} disabled={!activeId || busy} className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={saveAll} disabled={!activeId || busy} className="inline-flex items-center gap-2 rounded-lg bg-white/30 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/40 disabled:opacity-50">
              <Save className="h-4 w-4" /> Save
            </button>
            <button onClick={copyFrom} disabled={!activeId || busy} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              <Copy className="h-4 w-4" /> Copy
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-indigo-200 bg-linear-to-br from-indigo-50 to-white p-4 shadow-sm">
            <div className="text-xs font-medium text-indigo-700">Selected Lab</div>
            <div className="text-base font-bold text-indigo-900">{activeLab?.name || '—'}</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-white p-4 shadow-sm">
            <div className="text-xs font-medium text-emerald-700">Agreed Tests</div>
            <div className="text-3xl font-extrabold tracking-tight text-emerald-900">{agreedCount}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4 shadow-sm">
            <div className="text-xs font-medium text-slate-700">Total Tests</div>
            <div className="text-3xl font-extrabold tracking-tight text-slate-900">{tests.length}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 text-sm">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </div>
          <label className="block">
            <span className="text-xs text-slate-600">Outsource lab</span>
            <select value={activeId} onChange={e => setActiveId(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5">
              <option value="">--</option>
              {labs.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-slate-600">Status</span>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5">
              <option value="all">All</option>
              <option value="agreed">Agreed</option>
              <option value="non_agreed">Non-agreed</option>
            </select>
          </label>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search test" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
          </div>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-slate-200 bg-slate-50">
            <tr className="text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Test</th>
              <th className="px-4 py-3">Agreed</th>
              <th className="px-4 py-3">Lab rate</th>
              <th className="px-4 py-3">Outsource share (Rs.)</th>
              <th className="px-4 py-3">Outsource share (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {busy && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Loading…</td></tr>}
            {!busy && !rows.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No tests found.</td></tr>}
            {!busy && rows.map(t => {
              const r = rates[t._id] || ({ status: false, labRate: 0, outsourceShareRs: 0, outsourceSharePct: 0 } as any)
              return (
                <tr key={t._id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-900">{t.name}</td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={!!r.status} onChange={e => update(t._id, { status: e.target.checked })} />
                      <span className={`text-xs font-semibold ${r.status ? 'text-emerald-700' : 'text-slate-500'}`}>{r.status ? 'Agreed' : 'No'}</span>
                    </label>
                  </td>
                  <td className="px-4 py-3"><input type="number" className="w-28 rounded-md border border-slate-300 px-2 py-1.5" value={r.labRate || 0} onChange={e => update(t._id, { labRate: Number(e.target.value) })} /></td>
                  <td className="px-4 py-3"><input type="number" className="w-32 rounded-md border border-slate-300 px-2 py-1.5" value={r.outsourceShareRs || 0} onChange={e => update(t._id, { outsourceShareRs: Number(e.target.value) })} /></td>
                  <td className="px-4 py-3"><input type="number" className="w-28 rounded-md border border-slate-300 px-2 py-1.5" value={r.outsourceSharePct || 0} onChange={e => update(t._id, { outsourceSharePct: Number(e.target.value) })} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
