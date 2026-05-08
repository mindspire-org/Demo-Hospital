import { useEffect, useMemo, useState } from 'react'
import { labApi } from '../../utils/api'
import { fmt12 } from '../../utils/timeFormat'
import MiniDashboard from '../../components/common/MiniDashboard'
import { BarChart3, FlaskConical, Banknote, TrendingUp, RefreshCw, Download, Printer } from 'lucide-react'
import { useLabSession } from '../../hooks/useLabSession'

export default function Lab_Reports() {
  const session = useLabSession()
  const today = new Date()
  const lastWeek = new Date(today.getTime() - 6*24*60*60*1000)
  const iso = (d: Date)=> d.toISOString().slice(0,10)
  const [from, setFrom] = useState(iso(lastWeek))
  const [to, setTo] = useState(iso(today))
  const [tick, setTick] = useState(0)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<any>({})
  const [dailyRevenue, setDailyRevenue] = useState<Array<{ date: string; value: number }>>([])
  const [comparison, setComparison] = useState<Array<{ label: string; value: number }>>([])
  const [invStats, setInvStats] = useState<any>(null)
  const [shifts, setShifts] = useState<Array<{ id: string; name: string; start: string; end: string }>>([])
  const [filterShiftId, setFilterShiftId] = useState('')
  const [fromTime, setFromTime] = useState('')
  const [toTime, setToTime] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshMs, setRefreshMs] = useState(7000)
  const [testWiseData, setTestWiseData] = useState<Array<{ testName: string; count: number; revenue: number }>>([])

  // Compute effective window for global filters: time overrides shift; shift applies when single day
  const effectiveWindow = useMemo(()=>{
    try{
      if (fromTime && toTime){
        return { from: `${from}T${fromTime}:00`, to: `${to}T${toTime}:59` }
      }
      if (filterShiftId && from === to){
        const sh = shifts.find(s=>s.id===filterShiftId)
        const win = getShiftWindow(from, sh)
        if (win){
          const f = new Date(win.start.getTime() - (win.start.getTimezoneOffset()*60000)).toISOString().slice(0,19)
          const t = new Date(win.end.getTime() - (win.end.getTimezoneOffset()*60000)).toISOString().slice(0,19)
          return { from: f, to: t }
        }
      }
    } catch {}
    return { from, to }
  }, [from, to, fromTime, toTime, filterShiftId, shifts])

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      setLoading(true)
      try{
        const [res, inv]: any = await Promise.all([
          labApi.reportsSummary({ from: effectiveWindow.from, to: effectiveWindow.to }),
          labApi.inventorySummary({ limit: 1 }),
        ])
        if (!mounted) return
        setSummary(res || {})
        setDailyRevenue(res?.dailyRevenue || [])
        setComparison(res?.comparison || [])
        setInvStats(inv?.stats || null)
        // Compute test-wise counts from summary if available
        const tw: Array<{ testName: string; count: number; revenue: number }> = Array.isArray(res?.testWise) ? res.testWise : []
        setTestWiseData(tw.sort((a: any, b: any) => (b.count || 0) - (a.count || 0)))
      }catch(e){ console.error(e); setSummary({}); setDailyRevenue([]); setComparison([]); setInvStats(null); setTestWiseData([]) }
      finally { setLoading(false) }
    })()
    return ()=>{ mounted = false }
  }, [tick, effectiveWindow.from, effectiveWindow.to])

  const maxRev = Math.max(...dailyRevenue.map(d => d.value), 1)
  const maxComp = Math.max(...comparison.map(d => d.value), 1)

  // Auto refresh when enabled; also on focus/visibility restore
  useEffect(()=>{
    let id: any
    const pump = ()=> setTick(t => t + 1)
    const onFocus = ()=> { if (document.visibilityState === 'visible' && autoRefresh) pump() }
    if (autoRefresh){
      id = setInterval(()=> {
        if (document.visibilityState === 'visible') pump()
      }, Math.max(2000, Number(refreshMs)||7000))
    }
    window.addEventListener('focus', onFocus)
    const onStorage = (e: StorageEvent)=> {
      const k = String(e.key || '')
      if (k.startsWith('lab.last') || k.includes('lab.refresh')) pump()
    }
    window.addEventListener('storage', onStorage)
    return ()=>{
      if (id) clearInterval(id)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('storage', onStorage)
    }
  }, [autoRefresh, refreshMs])

  // Load shifts once
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try{
        const res: any = await labApi.listShifts()
        if (!mounted) return
        const arr = (res?.items || res || []).map((x:any)=> ({ id: String(x._id||x.id), name: x.name, start: x.start, end: x.end }))
        setShifts(arr)
      } catch {}
    })()
    return ()=>{ mounted = false }
  }, [])

  function getShiftWindow(dateStr: string, sh?: { start: string; end: string }){
    try{
      if (!sh) return null
      const [y,m,d] = dateStr.split('-').map(n=>parseInt(n,10))
      const [shh,smm] = String(sh.start||'00:00').split(':').map(n=>parseInt(n||'0',10))
      const [ehh,emm] = String(sh.end||'00:00').split(':').map(n=>parseInt(n||'0',10))
      const start = new Date(y, m-1, d, shh||0, smm||0, 0)
      let end = new Date(y, m-1, d, ehh||0, emm||0, 0)
      if (end <= start) end = new Date(end.getTime() + 24*60*60*1000)
      return { start, end }
    } catch { return null }
  }

  

  const apply = () => setTick(t => t + 1)

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-violet-600 via-sky-600 to-emerald-500 p-5 text-white shadow-lg shadow-sky-200/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Lab Summary Report</h2>
            <div className="mt-0.5 text-sm text-sky-100">Revenue, expenses, and test analytics</div>
          </div>
          <button
            type="button"
            onClick={apply}
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Mini Dashboard */}
      <MiniDashboard cards={[
        { label: 'Total Tests', value: summary.totalTests || 0, icon: FlaskConical, color: 'bg-sky-500' },
        { label: 'Revenue', value: `PKR ${(summary.totalRevenue||0).toLocaleString()}`, icon: Banknote, color: 'bg-emerald-500' },
        { label: 'Received', value: `PKR ${(summary.totalReceived||0).toLocaleString()}`, icon: TrendingUp, color: 'bg-indigo-500' },
        { label: 'Pending Results', value: summary.pendingResults || 0, icon: BarChart3, color: 'bg-amber-500' },
      ]} />

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">From</label>
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">To</label>
              <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">From Time (optional)</label>
              <input type="time" value={fromTime} onChange={e=>setFromTime(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">To Time (optional)</label>
              <input type="time" value={toTime} onChange={e=>setToTime(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            </div>
          </div>
          <div className="flex items-end">
            <div className="flex flex-wrap items-center gap-2">
              <select value={filterShiftId} onChange={e=>setFilterShiftId(e.target.value)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="">All Shifts</option>
                {shifts.map(s=> <option key={s.id} value={s.id}>{s.name} ({fmt12(s.start)}-{fmt12(s.end)})</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)} />
                Auto refresh
              </label>
              <select value={String(refreshMs)} onChange={e=>setRefreshMs(Number(e.target.value)||7000)} className="rounded-md border border-slate-200 bg-white px-2 py-2 text-sm">
                <option value="5000">5s</option>
                <option value="7000">7s</option>
                <option value="10000">10s</option>
                <option value="15000">15s</option>
              </select>
              <button onClick={apply} className="btn">Apply</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard title="Total Tests" value={loading? '…' : `${summary.totalTests||0}`} bg="bg-sky-50" border="border-sky-200" />
        <SummaryCard title="Total Purchase Amount" value={loading? '…' : `PKR ${(summary.totalPurchasesAmount||0).toLocaleString()}`} bg="bg-emerald-50" border="border-emerald-200" />
        <SummaryCard title="Total Expenses" value={loading? '…' : `PKR ${(summary.totalExpenses||0).toLocaleString()}`} bg="bg-rose-50" border="border-rose-200" />
        <SummaryCard title="Total Revenue" value={loading? '…' : `PKR ${(summary.totalRevenue||0).toLocaleString()}`} bg="bg-indigo-50" border="border-indigo-200" />
        <SummaryCard title="Total Received" value={loading? '…' : `PKR ${(summary.totalReceived||0).toLocaleString()}`} bg="bg-emerald-50" border="border-emerald-200" />
        <SummaryCard title="Total Receivable" value={loading? '…' : `PKR ${(summary.totalReceivable||0).toLocaleString()}`} bg="bg-amber-50" border="border-amber-200" />
        <SummaryCard title="Pending Results" value={loading? '…' : `${summary.pendingResults||0}`} bg="bg-cyan-50" border="border-cyan-200" />
        <SummaryCard title="Pending Approval" value={loading? '…' : `${summary.pendingApproval||0}`} bg="bg-violet-50" border="border-violet-200" />
        <SummaryCard title="Completed Tests" value={loading? '…' : `${summary.completedTests||0}`} bg="bg-sky-50" border="border-sky-200" />
        <SummaryCard title="Stock Value" value={loading? '…' : `PKR ${(invStats?.stockSaleValue||0).toLocaleString()}`} bg="bg-amber-50" border="border-amber-200" />
        <SummaryCard title="Low Stock Items" value={loading? '…' : `${invStats?.lowStockCount||0}`} bg="bg-amber-50" border="border-amber-200" />
        <SummaryCard title="Expiring Soon" value={loading? '…' : `${invStats?.expiringSoonCount||0}`} bg="bg-amber-50" border="border-amber-200" />
        <SummaryCard title="Out of Stock" value={loading? '…' : `${invStats?.outOfStockCount||0}`} bg="bg-rose-50" border="border-rose-200" />
      </div>

      {/* Shift-wise Cash removed; global filters above apply to all widgets */}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 font-medium text-slate-800">Daily Revenue</div>
          <div className="h-48 w-full rounded-md border border-slate-100 bg-slate-50 p-3">
            <div className="flex h-full items-end gap-3">
              {dailyRevenue.map(d => (
                <div key={d.date} className="flex-1 h-full flex flex-col items-center justify-end">
                  <div
                    className="mx-auto w-6 rounded-t-md bg-sky-500"
                    style={{ height: `${Math.max(8, (d.value/maxRev)*100)}%` }}
                    title={`${d.date.slice(0,10)} — PKR ${d.value.toLocaleString()}`}
                  />
                  <div className="mt-2 text-center text-xs text-slate-600">{d.date.slice(0,10)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 font-medium text-slate-800">Comparison: Revenue, Expenses, Purchases</div>
          <div className="h-48 w-full rounded-md border border-slate-100 bg-slate-50 p-3">
            <div className="flex h-full items-end gap-6 justify-center">
              {comparison.map(d => (
                <div key={d.label} className="text-center h-full flex flex-col justify-end">
                  <div
                    className="mx-auto w-10 rounded-t-md bg-emerald-500"
                    style={{ height: `${Math.max(8, (d.value/maxComp)*100)}%` }}
                    title={`${d.label} — PKR ${d.value.toLocaleString()}`}
                  />
                  <div className="mt-2 text-xs text-slate-600">{d.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Test-wise Counts */}
      {testWiseData.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-medium text-slate-800">Test-wise Counts</div>
            <div className="flex items-center gap-2">
              {session.isAdmin && <button onClick={() => {
                const csv = ['Test,Count,Revenue', ...testWiseData.map(t => `"${t.testName}",${t.count},${t.revenue}`)].join('\n')
                const blob = new Blob([csv], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a'); a.href = url; a.download = `test-wise-report-${from}-to-${to}.csv`; a.click()
                URL.revokeObjectURL(url)
              }} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"><Download className="h-3 w-3" /> CSV</button>}
              <button onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"><Printer className="h-3 w-3" /> Print</button>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Table */}
            <div className="overflow-auto max-h-80 rounded-lg border border-slate-100">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Test Name</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-700">Count</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-700">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {testWiseData.map((t, i) => (
                    <tr key={i} className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-3 py-1.5 text-slate-800">{t.testName}</td>
                      <td className="px-3 py-1.5 text-right font-semibold text-slate-900">{t.count}</td>
                      <td className="px-3 py-1.5 text-right text-slate-700">PKR {t.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0 bg-slate-100 font-bold">
                  <tr>
                    <td className="px-3 py-2 text-slate-800">Total</td>
                    <td className="px-3 py-2 text-right text-slate-900">{testWiseData.reduce((s, t) => s + t.count, 0)}</td>
                    <td className="px-3 py-2 text-right text-slate-900">PKR {testWiseData.reduce((s, t) => s + t.revenue, 0).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {/* Chart */}
            <div className="h-80 w-full rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="flex h-full items-end gap-1 overflow-x-auto">
                {testWiseData.slice(0, 20).map((t, i) => {
                  const maxCount = Math.max(...testWiseData.slice(0, 20).map(x => x.count), 1)
                  const pct = Math.max(8, (t.count / maxCount) * 100)
                  const colors = ['bg-sky-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-blue-500']
                  return (
                    <div key={i} className="flex-1 min-w-[40px] h-full flex flex-col items-center justify-end" title={`${t.testName}: ${t.count} (PKR ${t.revenue.toLocaleString()})`}>
                      <div className="text-[10px] font-bold text-slate-700 mb-1">{t.count}</div>
                      <div className={`w-full max-w-[32px] rounded-t-md ${colors[i % colors.length]}`} style={{ height: `${pct}%` }} />
                      <div className="mt-1 text-center text-[9px] leading-tight text-slate-500 truncate w-full" title={t.testName}>{t.testName.length > 10 ? t.testName.slice(0, 9) + '…' : t.testName}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ title, value, bg, border }: { title: string; value: string; bg: string; border: string }) {
  return (
    <div className={`rounded-xl border ${border} ${bg} p-4`}>
      <div className="text-xs font-medium text-slate-600">{title}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  )
}
