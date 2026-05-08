import { useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, Printer, RefreshCw, Search } from 'lucide-react'
import { labApi } from '../../utils/api'

/**
 * Main Register — printable daily register grouped by patient, with each
 * test and its parameter rows.
 * Backed by /lab/results + /lab/orders.
 */

type Row = { test: string; value?: string; unit?: string; normal?: string; flag?: string }
type Result = {
  _id: string
  orderId: string
  testName?: string
  rows?: Row[]
  interpretation?: string
  reportStatus?: string
  performedAt?: string
  createdAt: string
}
type Order = {
  _id: string
  tokenNo?: string
  labNumber?: number
  createdAt: string
  patient?: { fullName?: string; mrn?: string; age?: string; gender?: string }
}

export default function Lab_MainRegister() {
  const today = new Date().toISOString().slice(0, 10)
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [orders, setOrders] = useState<Order[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [oRes, rRes]: any[] = await Promise.all([
        labApi.listOrders({ from, to, limit: 1000 }),
        labApi.listResults({ from, to, limit: 1000 }),
      ])
      setOrders(oRes?.items || [])
      setResults(rRes?.items || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const byOrder = useMemo(() => {
    const map = new Map<string, Result[]>()
    for (const r of results) {
      const k = String(r.orderId)
      const arr = map.get(k) || []
      arr.push(r)
      map.set(k, arr)
    }
    return map
  }, [results])

  const kpi = useMemo(() => {
    const totalResults = results.length
    const totalParams = results.reduce((s, r) => s + (r.rows?.length || 0), 0)
    const critical = results.reduce((s, r) => s + (r.rows || []).filter(row => row.flag === 'critical').length, 0)
    return { patients: orders.length, totalResults, totalParams, critical }
  }, [orders, results])

  function exportCsv() {
    const lines: string[] = [['Date', 'Lab #', 'Token', 'Patient', 'MRN', 'Age', 'Sex', 'Test', 'Parameter', 'Value', 'Unit', 'Normal', 'Flag'].join(',')]
    for (const o of orders) {
      const rs = byOrder.get(String(o._id)) || []
      for (const r of rs) {
        for (const row of r.rows || []) {
          lines.push([
            new Date(o.createdAt).toLocaleDateString(),
            o.labNumber || '',
            o.tokenNo || '',
            o.patient?.fullName || '',
            o.patient?.mrn || '',
            o.patient?.age || '',
            o.patient?.gender || '',
            r.testName || '',
            row.test,
            row.value || '',
            row.unit || '',
            row.normal || '',
            row.flag || '',
          ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        }
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `main-register-${from}_${to}.csv`; a.click()
  }

  const flagBadge = (f?: string) => {
    if (!f) return ''
    const m: Record<string, string> = {
      critical: 'bg-rose-100 text-rose-700 ring-rose-600/20',
      high: 'bg-amber-100 text-amber-700 ring-amber-600/20',
      low: 'bg-sky-100 text-sky-700 ring-sky-600/20',
      normal: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
    }
    return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${m[f] || 'bg-slate-100 text-slate-700 ring-slate-500/20'}`}>{f}</span>
  }

  return (
    <div className="space-y-4 p-4 md:p-6 print:p-0 print:space-y-0">
      {/* Print-only header */}
      <div className="hidden print:block print:mb-4 print:px-4 print:pt-4">
        <h1 className="text-xl font-bold text-slate-900">Main Register — {from} → {to}</h1>
        <p className="text-xs text-slate-500">Generated: {new Date().toLocaleString()} · {kpi.patients} patients · {kpi.totalResults} results</p>
        <hr className="mt-2 border-slate-300" />
      </div>
      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-violet-600 via-sky-600 to-emerald-500 p-5 text-white shadow-lg shadow-sky-200/50 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Main Register</h2>
            <div className="mt-0.5 text-sm text-sky-100">Daily register — patients, tests &amp; parameter results</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30"><Printer className="h-4 w-4" />Print</button>
            <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-white/30 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/40"><FileSpreadsheet className="h-4 w-4" />CSV</button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:hidden">
        <div className="rounded-xl border border-indigo-200 bg-linear-to-br from-indigo-50 to-white p-4 shadow-sm">
          <div className="text-xs font-medium text-indigo-700">Patients</div>
          <div className="text-3xl font-extrabold tracking-tight text-indigo-900">{kpi.patients}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-700">Total Results</div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900">{kpi.totalResults}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-white p-4 shadow-sm">
          <div className="text-xs font-medium text-emerald-700">Parameters</div>
          <div className="text-3xl font-extrabold tracking-tight text-emerald-900">{kpi.totalParams}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-linear-to-br from-rose-50 to-white p-4 shadow-sm">
          <div className="text-xs font-medium text-rose-700">Critical Flags</div>
          <div className="text-3xl font-extrabold tracking-tight text-rose-900">{kpi.critical}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 text-sm print:hidden">
        <label className="block"><span className="text-xs font-medium text-slate-600">From</span>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" />
        </label>
        <label className="block"><span className="text-xs font-medium text-slate-600">To</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" />
        </label>
        <button onClick={load} className="h-[38px] rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"><Search className="mr-1.5 inline h-4 w-4" />Search</button>
      </div>

      <div className="mb-2 text-right text-xs text-slate-500 print:text-slate-700">{orders.length} patient(s) · {from} → {to}</div>

      {/* Patient Sections */}
      <div className="space-y-4">
        {loading && <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading…</div>}
        {!loading && !orders.length && <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No data for the selected date range.</div>}
        {orders.map(o => {
          const rs = byOrder.get(String(o._id)) || []
          return (
            <section key={o._id} className="break-inside-avoid rounded-xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none print:border-b print:border-slate-300">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-linear-to-r from-indigo-50/60 to-white px-4 py-3 print:bg-white print:px-2 print:py-1.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{(o.patient?.fullName || '?')[0]}</div>
                  <div>
                    <span className="text-sm font-semibold text-slate-900">{o.patient?.fullName || '-'}</span>
                    <span className="ml-2 text-xs text-slate-500">MRN: {o.patient?.mrn || '-'} · {o.patient?.age || '-'}/{o.patient?.gender || '-'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">Token {o.tokenNo || '-'}</span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">Lab# {o.labNumber || '-'}</span>
                  <span>{new Date(o.createdAt).toLocaleString()}</span>
                </div>
              </header>
              <div className="p-4">
                {!rs.length && <div className="text-xs text-slate-400 italic">No results entered.</div>}
                {rs.map(r => (
                  <div key={r._id} className="mb-3 last:mb-0">
                    <div className="mb-1.5 text-xs font-semibold text-indigo-700">{r.testName}</div>
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50/80">
                        <tr>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-600">Parameter</th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-600">Value</th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-600">Unit</th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-600">Reference</th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-600">Flag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(r.rows || []).map((row, i) => (
                          <tr key={`${r._id}-${i}`} className="hover:bg-indigo-50/30 transition-colors">
                            <td className="px-3 py-1.5 font-medium text-slate-900">{row.test}</td>
                            <td className={`px-3 py-1.5 ${row.flag === 'critical' ? 'font-bold text-rose-700' : 'text-slate-900'}`}>{row.value || '-'}</td>
                            <td className="px-3 py-1.5 text-slate-600">{row.unit || ''}</td>
                            <td className="px-3 py-1.5 text-slate-600">{row.normal || ''}</td>
                            <td className="px-3 py-1.5">{flagBadge(row.flag)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
