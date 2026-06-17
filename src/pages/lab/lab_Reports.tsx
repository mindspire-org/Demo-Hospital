import { useEffect, useMemo, useRef, useState } from 'react'
import { useReactToPrint } from 'react-to-print'
import { labApi } from '../../utils/api'
import { Activity, RefreshCw, Printer, Download, FileSpreadsheet } from 'lucide-react'
import LabReportsFilters from '../../components/lab/reports/LabReportsFilters'
import LabReportsKPI from '../../components/lab/reports/LabReportsKPI'
import LabReportsCharts from '../../components/lab/reports/LabReportsCharts'
import LabReportsTables from '../../components/lab/reports/LabReportsTables'
import { exportPdf, exportExcel } from '../../components/lab/reports/LabReportsExports'

const iso = (d: Date) => d.toISOString().slice(0, 10)
const todayIso = () => iso(new Date())
const firstOfMonth = () => { const d = new Date(); return iso(new Date(d.getFullYear(), d.getMonth(), 1)) }

function getShiftWindow(dateStr: string, sh?: any) {
  if (!sh) return null
  const [y, m, d] = dateStr.split('-').map(n => parseInt(n, 10))
  const [shh, smm] = String(sh.start || '00:00').split(':').map(n => parseInt(n || '0', 10))
  const [ehh, emm] = String(sh.end || '00:00').split(':').map(n => parseInt(n || '0', 10))
  const start = new Date(y, m - 1, d, shh || 0, smm || 0, 0)
  let end = new Date(y, m - 1, d, ehh || 0, emm || 0, 0)
  if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

export default function Lab_Reports() {
  const printRef = useRef<HTMLDivElement>(null)
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(todayIso())
  const [tick, setTick] = useState(0)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<any>({})
  const [shifts, setShifts] = useState<any[]>([])
  const [filterShiftId, setFilterShiftId] = useState('')
  const [fromTime, setFromTime] = useState('')
  const [toTime, setToTime] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshMs, setRefreshMs] = useState(30000)
  const [invStats, setInvStats] = useState<any>(null)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Lab-Report-${from}-to-${to}`,
    pageStyle: `@page { size: A4 landscape; margin: 10mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`,
  })

  const effectiveWindow = useMemo(() => {
    try {
      if (fromTime && toTime) return { from: `${from}T${fromTime}:00`, to: `${to}T${toTime}:59` }
      if (filterShiftId && from === to) {
        const sh = shifts.find((s: any) => s.id === filterShiftId)
        const win = getShiftWindow(from, sh)
        if (win) {
          const f = new Date(win.start.getTime() - (win.start.getTimezoneOffset() * 60000)).toISOString().slice(0, 19)
          const t = new Date(win.end.getTime() - (win.end.getTimezoneOffset() * 60000)).toISOString().slice(0, 19)
          return { from: f, to: t }
        }
      }
    } catch { }
    return { from, to }
  }, [from, to, fromTime, toTime, filterShiftId, shifts])

  useEffect(() => {
    let mounted = true
    ; (async () => {
      setLoading(true)
      try {
        const [res, inv, ccRev]: any = await Promise.all([
          labApi.reportsSummary({ from: effectiveWindow.from, to: effectiveWindow.to }),
          labApi.inventorySummary({ limit: 1 }).catch(() => null),
          labApi.getCollectionCentersRevenueSummary({ from: effectiveWindow.from, to: effectiveWindow.to }).catch(() => null),
        ])
        if (!mounted) return
        setSummary({ ...res, collectionCenters: ccRev?.centers || res?.collectionCenters || [], categoryWise: res?.categoryWise || [] })
        setInvStats(inv?.stats || null)
      } catch (e) { console.error(e); setSummary({}); setInvStats(null) }
      finally { setLoading(false) }
    })()
    return () => { mounted = false }
  }, [tick, effectiveWindow.from, effectiveWindow.to])

  useEffect(() => {
    let mounted = true
    ; (async () => {
      try {
        const res: any = await labApi.listShifts()
        if (!mounted) return
        setShifts((res?.items || res || []).map((x: any) => ({ id: String(x._id || x.id), name: x.name, start: x.start, end: x.end })))
      } catch { }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let id: any
    const pump = () => setTick(t => t + 1)
    const onFocus = () => { if (document.visibilityState === 'visible' && autoRefresh) pump() }
    if (autoRefresh) {
      id = setInterval(() => { if (document.visibilityState === 'visible') pump() }, Math.max(5000, Number(refreshMs) || 30000))
    }
    window.addEventListener('focus', onFocus)
    return () => { if (id) clearInterval(id); window.removeEventListener('focus', onFocus) }
  }, [autoRefresh, refreshMs])

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-indigo-600 via-violet-600 to-sky-500 p-6 text-white shadow-xl shadow-indigo-200/40">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 shadow-inner backdrop-blur-sm">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Lab Analytics & Reports</h1>
              <p className="mt-0.5 text-sm font-semibold text-indigo-100/80">Comprehensive operational, financial and clinical insights</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setTick(t => t + 1)} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-sm font-bold backdrop-blur-sm transition hover:bg-white/25">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={handlePrint} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-sm font-bold backdrop-blur-sm transition hover:bg-white/25">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button onClick={() => exportPdf(summary, from, to)} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-sm font-bold backdrop-blur-sm transition hover:bg-white/25">
              <Download className="h-4 w-4" /> PDF
            </button>
            <button onClick={() => exportExcel(summary, from, to)} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-sm font-bold backdrop-blur-sm transition hover:bg-white/25">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <LabReportsFilters
        from={from} setFrom={setFrom} to={to} setTo={setTo}
        fromTime={fromTime} setFromTime={setFromTime} toTime={toTime} setToTime={setToTime}
        filterShiftId={filterShiftId} setFilterShiftId={setFilterShiftId} shifts={shifts}
        autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh}
        refreshMs={refreshMs} setRefreshMs={setRefreshMs}
        onApply={() => setTick(t => t + 1)}
      />

      {/* Printable content */}
      <div ref={printRef} className="space-y-6">
        <LabReportsKPI summary={summary} loading={loading} invStats={invStats} />
        <LabReportsCharts summary={summary} />
        <LabReportsTables summary={summary} />
      </div>
    </div>
  )
}
