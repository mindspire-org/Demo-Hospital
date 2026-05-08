import { useEffect, useMemo, useState } from 'react'
import { Copy, RefreshCw, Save, Search } from 'lucide-react'
import { api } from '../../api'

type Center = { _id: string; name: string; code?: string }
type Test = { _id: string; name: string; price?: number; category?: string }
type Rate = {
  _id?: string; centerId: string; testId: string; testName: string; category?: string
  status: boolean; performAtCC: boolean
  labRate: number; ccPatientRate: number; ccShare: number; labShare: number
  discountBearByCCPct: number; discountBearByLabPct: number; maxDiscountPct: number
  etaDays: number; etaHours: number; etaMinutes: number
}

export default function Lab_CenterRateList() {
  const [centers, setCenters] = useState<Center[]>([])
  const [centerId, setCenterId] = useState('')
  const [tests, setTests] = useState<Test[]>([])
  const [rates, setRates] = useState<Record<string, Rate>>({})
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadCenters() { const r = await api('/lab/collection-centers'); setCenters(r.items || r) }
  async function loadAll() {
    if (!centerId) return
    setBusy(true)
    try {
      const [t, r] = await Promise.all([api('/lab/tests?limit=2000'), api(`/lab/center-rates?centerId=${centerId}`)])
      setTests(t.items || [])
      const map: Record<string, Rate> = {}
      for (const it of r.items || []) map[it.testId] = it
      setRates(map)
    } finally { setBusy(false) }
  }
  useEffect(() => { loadCenters() }, [])
  useEffect(() => { loadAll() }, [centerId])

  const rows = useMemo(() => {
    const f = q.trim().toLowerCase()
    return tests.filter(t => !f || t.name.toLowerCase().includes(f))
  }, [tests, q])

  const kpi = useMemo(() => {
    const active = Object.values(rates).filter(r => r.status).length
    const totalLabRate = Object.values(rates).reduce((s, r) => s + (r.status ? r.labRate : 0), 0)
    return { total: tests.length, active, totalLabRate }
  }, [tests, rates])

  const selCenter = centers.find(c => c._id === centerId)

  function update(testId: string, patch: Partial<Rate>) {
    const r = rates[testId] || ({ centerId, testId, testName: tests.find(t => t._id === testId)?.name || '', status: false, performAtCC: false, labRate: 0, ccPatientRate: 0, ccShare: 0, labShare: 0, discountBearByCCPct: 0, discountBearByLabPct: 100, maxDiscountPct: 0, etaDays: 0, etaHours: 0, etaMinutes: 0 } as Rate)
    setRates({ ...rates, [testId]: { ...r, ...patch } })
  }

  async function saveAll() {
    if (!centerId) return
    const items = Object.values(rates)
    await api('/lab/center-rates/bulk', { method: 'POST', body: JSON.stringify({ centerId, items }) })
    alert('Saved'); loadAll()
  }

  async function copyFrom() {
    const fromId = prompt('Copy rate list from collection center id:')
    if (!fromId) return
    await api(`/lab/center-rates/copy/${fromId}`, { method: 'POST', body: JSON.stringify({ toId: centerId }) })
    loadAll()
  }

  const ni = (r: any, k: keyof Rate) => (
    <input type="number" className="w-16 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs tabular-nums text-slate-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200" value={(r as any)[k] || 0} onChange={e => update(r.testId || '', { [k]: Number(e.target.value) } as any)} />
  )

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-violet-600 via-sky-600 to-emerald-500 p-5 text-white shadow-lg shadow-sky-200/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Center Rate List</h2>
            <div className="mt-0.5 text-sm text-sky-100">Configure per-test pricing for collection centres</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadAll} disabled={!centerId} className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Refresh</button>
            <button onClick={saveAll} disabled={!centerId || busy} className="inline-flex items-center gap-2 rounded-lg bg-white/30 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/40 disabled:opacity-50"><Save className="h-4 w-4" />Save</button>
            <button onClick={copyFrom} disabled={!centerId} className="inline-flex items-center gap-2 rounded-lg bg-white/30 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/40 disabled:opacity-50"><Copy className="h-4 w-4" />Copy Rates</button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-violet-200 bg-linear-to-br from-violet-50 to-white p-4 shadow-sm">
            <div className="text-xs font-medium text-violet-700">Selected Centre</div>
            <div className="text-lg font-extrabold tracking-tight text-violet-900">{selCenter?.name || 'None'}</div>
            {selCenter?.code && <div className="text-xs text-violet-600">Code: {selCenter.code}</div>}
          </div>
          <div className="rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4 shadow-sm">
            <div className="text-xs font-medium text-slate-700">Total Tests</div>
            <div className="text-3xl font-extrabold tracking-tight text-slate-900">{kpi.total}</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-white p-4 shadow-sm">
            <div className="text-xs font-medium text-emerald-700">Active Rates</div>
            <div className="text-3xl font-extrabold tracking-tight text-emerald-900">{kpi.active}</div>
            <div className="text-xs text-emerald-600">Total lab rate: PKR {kpi.totalLabRate.toFixed(0)}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-end gap-3 text-sm">
          <label className="block"><span className="text-xs font-medium text-slate-600">Collection Centre</span>
            <select value={centerId} onChange={e => setCenterId(e.target.value)} className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200">
              <option value="">-- Select --</option>
              {centers.map(c => <option key={c._id} value={c._id}>{c.name} ({c.code || ''})</option>)}
            </select>
          </label>
          <div className="relative">
            <span className="text-xs font-medium text-slate-600">Search Test</span>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter by test name…" className="rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Test</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Status</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Perform at CC</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Lab Rate</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">CC Patient Rate</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">CC Share</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Lab Share</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Disc. CC %</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Disc. Lab %</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Max Disc %</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">ETA d</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">h</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">m</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {busy && <tr><td colSpan={13} className="px-3 py-6 text-center text-sm text-slate-500">Loading…</td></tr>}
            {!busy && rows.length === 0 && <tr><td colSpan={13} className="px-3 py-6 text-center text-sm text-slate-500">No tests found. Select a centre above.</td></tr>}
            {!busy && rows.map(t => {
              const r = rates[t._id] || ({ testId: t._id, status: false, performAtCC: false, labRate: 0, ccPatientRate: 0, ccShare: 0, labShare: 0, discountBearByCCPct: 0, discountBearByLabPct: 100, maxDiscountPct: 0, etaDays: 0, etaHours: 0, etaMinutes: 0 } as any)
              return (
                <tr key={t._id} className="hover:bg-violet-50/40 transition-colors">
                  <td className="px-3 py-2 font-medium text-slate-900">{t.name}</td>
                  <td className="px-3 py-2"><input type="checkbox" checked={!!r.status} onChange={e => update(t._id, { status: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" /></td>
                  <td className="px-3 py-2"><input type="checkbox" checked={!!r.performAtCC} onChange={e => update(t._id, { performAtCC: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" /></td>
                  <td className="px-3 py-2">{ni(r, 'labRate')}</td>
                  <td className="px-3 py-2">{ni(r, 'ccPatientRate')}</td>
                  <td className="px-3 py-2">{ni(r, 'ccShare')}</td>
                  <td className="px-3 py-2">{ni(r, 'labShare')}</td>
                  <td className="px-3 py-2">{ni(r, 'discountBearByCCPct')}</td>
                  <td className="px-3 py-2">{ni(r, 'discountBearByLabPct')}</td>
                  <td className="px-3 py-2">{ni(r, 'maxDiscountPct')}</td>
                  <td className="px-3 py-2">{ni(r, 'etaDays')}</td>
                  <td className="px-3 py-2">{ni(r, 'etaHours')}</td>
                  <td className="px-3 py-2">{ni(r, 'etaMinutes')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
