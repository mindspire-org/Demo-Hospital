import { useEffect, useMemo, useState } from 'react'
import { labApi } from '../../utils/api'
import MiniDashboard from '../../components/common/MiniDashboard'
import { Clock, AlertTriangle, CheckCircle2, TrendingUp, Search, Calendar, RefreshCw, Download, Timer } from 'lucide-react'

type Order = {
  id: string
  createdAt: string
  tokenNo?: string
  patient?: { fullName: string; mrn?: string }
  tests: Array<{ testId: string; testName: string; status: string; sampleTime?: string }>
  sampleTime?: string
  reportingTime?: string
  status: string
}

type LabTest = { id: string; name: string; turnaroundTime?: number }

type TATRecord = {
  tokenNo: string
  patient: string
  testName: string
  testId: string
  expectedTATMin: number | null
  createdAt: string
  sampleTime: string | null
  approvedAt: string | null
  sampleTATMin: number | null
  reportTATMin: number | null
  totalTATMin: number | null
  status: string
}

function diffMin(a: string, b: string): number | null {
  try {
    const ms = new Date(a).getTime() - new Date(b).getTime()
    if (!Number.isFinite(ms) || ms < 0) return null
    return Math.round(ms / 60000)
  } catch { return null }
}

export default function Lab_TAT() {
  const todayIso = new Date().toISOString().slice(0, 10)
  const [orders, setOrders] = useState<Order[]>([])
  const [tests, setTests] = useState<LabTest[]>([])
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [tatLimit, setTatLimit] = useState(60)
  const [from, setFrom] = useState(todayIso)
  const [to, setTo] = useState(todayIso)

  const testsMap = useMemo(() => {
    const m = new Map<string, LabTest>()
    for (const t of tests) m.set(t.id, t)
    return m
  }, [tests])

  const resultByOrderId = useMemo(() => {
    const m = new Map<string, any>()
    for (const r of results) {
      const oid = String(r.orderId || '')
      if (oid) m.set(oid, r)
    }
    return m
  }, [results])

  async function load() {
    setLoading(true)
    try {
      const [oRes, tRes, rRes]: any[] = await Promise.all([
        labApi.listOrders({ from: from || undefined, to: to || undefined, limit: 1000 }),
        labApi.listTests({ limit: 1000 }),
        labApi.listResults({ from: from || undefined, to: to || undefined, limit: 1000 }),
      ])
      const list: Order[] = (oRes?.items || []).map((x: any) => ({
        id: x._id,
        createdAt: x.createdAt || new Date().toISOString(),
        tokenNo: x.tokenNo,
        patient: x.patient,
        tests: (x.testStatuses || x.tests || []).map((t: any) => ({
          testId: t.testId,
          testName: t.testName || '-',
          status: t.status || 'pending',
          sampleTime: t.sampleTime,
        })),
        sampleTime: x.sampleTime,
        reportingTime: x.reportingTime,
        status: x.status,
      }))
      setOrders(list)
      setTests((tRes?.items || []).map((t: any) => ({ id: String(t._id), name: t.name, turnaroundTime: t.turnaroundTime || 0 })))
      setResults(rRes?.items || [])
    } catch (e) { console.error(e); setOrders([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [from, to])

  const tatRecords: TATRecord[] = useMemo(() => {
    const records: TATRecord[] = []
    for (const o of orders) {
      const res = resultByOrderId.get(String(o.id))
      const approvedAt = res?.approvedAt || null
      for (const t of o.tests) {
        const sampleT = t.sampleTime || o.sampleTime || null
        const reportT = approvedAt || o.reportingTime || null
        const sampleTAT = sampleT ? diffMin(sampleT, o.createdAt) : null
        const reportTAT = (sampleT && reportT) ? diffMin(reportT, sampleT) : null
        const totalTAT = reportT ? diffMin(reportT, o.createdAt) : null
        const testDef = testsMap.get(t.testId)
        const expectedTAT = testDef?.turnaroundTime || null
        records.push({
          tokenNo: o.tokenNo || o.id.slice(-6),
          patient: o.patient?.fullName || '-',
          testName: t.testName,
          testId: t.testId,
          expectedTATMin: expectedTAT,
          createdAt: o.createdAt,
          sampleTime: sampleT,
          approvedAt: reportT,
          sampleTATMin: sampleTAT,
          reportTATMin: reportTAT,
          totalTATMin: totalTAT,
          status: t.status,
        })
      }
    }
    return records
  }, [orders, testsMap, resultByOrderId])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return tatRecords
    return tatRecords.filter(r =>
      r.tokenNo.toLowerCase().includes(qq) ||
      r.patient.toLowerCase().includes(qq) ||
      r.testName.toLowerCase().includes(qq)
    )
  }, [tatRecords, q])

  const avgTotalTAT = useMemo(() => {
    const vals = filtered.map(r => r.totalTATMin).filter((v): v is number => v != null)
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  }, [filtered])

  const avgReportTAT = useMemo(() => {
    const vals = filtered.map(r => r.reportTATMin).filter((v): v is number => v != null)
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  }, [filtered])

  const breachedCount = useMemo(() =>
    filtered.filter(r => {
      const limit = r.expectedTATMin || tatLimit
      return r.totalTATMin != null && r.totalTATMin > limit
    }).length
  , [filtered, tatLimit])

  const completedCount = useMemo(() =>
    filtered.filter(r => r.status === 'approved' || r.status === 'completed').length
  , [filtered])

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-violet-600 via-sky-600 to-emerald-500 p-5 text-white shadow-lg shadow-sky-200/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Turn Around Time (TAT)</h2>
            <div className="mt-0.5 text-sm text-sky-100">Monitor sample-to-report turnaround and SLA breaches</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
              <Calendar className="h-4 w-4" />
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded border border-white/20 bg-transparent text-sm text-white outline-none" />
              <span className="text-xs">→</span>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded border border-white/20 bg-transparent text-sm text-white outline-none" />
            </div>
            <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <div className="flex items-center gap-1.5">
              <Timer className="h-4 w-4 text-sky-200" />
              <span className="text-xs text-sky-100">Default SLA:</span>
              <input type="number" min={10} max={1440} value={tatLimit} onChange={e => setTatLimit(Number(e.target.value) || 60)} className="w-16 rounded-lg border border-white/30 bg-white/20 px-2 py-1 text-sm text-white backdrop-blur-sm" />
              <span className="text-xs text-sky-100">min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mini Dashboard */}
      <MiniDashboard cards={[
        { label: 'Avg Total TAT', value: `${avgTotalTAT} min`, icon: Clock, color: 'bg-sky-500' },
        { label: 'Avg Report TAT', value: `${avgReportTAT} min`, icon: TrendingUp, color: 'bg-indigo-500' },
        { label: 'SLA Breaches', value: breachedCount, icon: AlertTriangle, color: 'bg-rose-500' },
        { label: 'Completed', value: completedCount, icon: CheckCircle2, color: 'bg-emerald-500' },
      ]} />

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by token, patient, or test..." className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Token</th>
              <th className="px-4 py-2.5">Patient</th>
              <th className="px-4 py-2.5">Test</th>
              <th className="px-4 py-2.5">Created</th>
              <th className="px-4 py-2.5">Expected</th>
              <th className="px-4 py-2.5">Sample TAT</th>
              <th className="px-4 py-2.5">Report TAT</th>
              <th className="px-4 py-2.5">Total TAT</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((r, i) => {
              const limit = r.expectedTATMin || tatLimit
              const breached = r.totalTATMin != null && r.totalTATMin > limit
              const pct = r.expectedTATMin && r.totalTATMin ? Math.min(100, Math.round((r.totalTATMin / r.expectedTATMin) * 100)) : null
              return (
                <tr key={i} className={`border-b border-slate-100 transition-colors hover:bg-slate-50/50 ${breached ? 'bg-rose-50/50' : ''}`}>
                  <td className="px-4 py-2.5 font-mono text-sm font-semibold text-slate-800">{r.tokenNo}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-700">{r.patient}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-700">{r.testName}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-500">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-sm">
                    {r.expectedTATMin ? (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">{r.expectedTATMin} min</span>
                    ) : <span className="text-xs text-slate-400">{tatLimit} min (default)</span>}
                  </td>
                  <td className="px-4 py-2.5 text-sm">
                    {r.sampleTATMin != null ? (
                      <span className={`font-semibold ${r.sampleTATMin > limit ? 'text-rose-600' : 'text-slate-700'}`}>{r.sampleTATMin} min</span>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-sm">
                    {r.reportTATMin != null ? (
                      <span className={`font-semibold ${r.reportTATMin > limit ? 'text-rose-600' : 'text-slate-700'}`}>{r.reportTATMin} min</span>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      {r.totalTATMin != null ? (
                        <>
                          <span className={`font-bold ${breached ? 'text-rose-600' : 'text-emerald-600'}`}>{r.totalTATMin} min</span>
                          {pct != null && (
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                              <div className={`h-full rounded-full transition-all ${breached ? 'bg-rose-500' : pct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                          )}
                        </>
                      ) : <span className="text-slate-400">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.status === 'approved' || r.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        r.status === 'result_entered' ? 'bg-amber-100 text-amber-700' :
                        r.status === 'sample_collected' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>{r.status}</span>
                      {breached && <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">SLA</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-6 text-sm text-slate-500">{loading ? 'Loading...' : 'No TAT records found'}</div>
        )}
        {filtered.length > 200 && (
          <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">Showing 200 of {filtered.length} records</div>
        )}
      </div>
    </div>
  )

  function exportCsv() {
    const cols = ['Token', 'Patient', 'Test', 'Created', 'Expected TAT (min)', 'Sample TAT (min)', 'Report TAT (min)', 'Total TAT (min)', 'Breached', 'Status']
    const esc = (v: any) => { const s = String(v ?? ''); return /[",\n\r]/g.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
    const csvRows = filtered.map(r => {
      const limit = r.expectedTATMin || tatLimit
      const breached = r.totalTATMin != null && r.totalTATMin > limit
      return [r.tokenNo, r.patient, r.testName, new Date(r.createdAt).toLocaleString(), r.expectedTATMin || tatLimit, r.sampleTATMin ?? '', r.reportTATMin ?? '', r.totalTATMin ?? '', breached ? 'YES' : 'NO', r.status].map(esc).join(',')
    })
    const csv = [cols.join(','), ...csvRows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `tat-report-${from}_${to}.csv`; a.click()
  }
}
