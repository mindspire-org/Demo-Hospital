import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Pencil, Search, Barcode, Clock, ListChecks, AlertTriangle, RefreshCw, Printer, FileCheck, User, FlaskConical, CalendarDays, Activity, ChevronRight } from 'lucide-react'
import { labApi } from '../../utils/api'
import { previewLabReportPdf } from '../../utils/printLabReport'
import Lab_TrackDialog from '../../components/lab/lab_TrackDialog'
import MiniDashboard from '../../components/common/MiniDashboard'
import { useLabSession } from '../../hooks/useLabSession'

type ResultRow = { id: string; test: string; normal?: string; unit?: string; prevValue?: string; value?: string; flag?: 'normal'|'abnormal'|'critical'; comment?: string }

type ResultRecord = { id: string; orderId: string; testId?: string; testName?: string; rows: ResultRow[]; interpretation?: string; createdAt: string; submittedBy?: string; approvedBy?: string; approvedAt?: string }

type Order = {
  id: string
  createdAt: string
  patient: { fullName: string; phone: string; mrn?: string; age?: string; gender?: string; address?: string }
  tests: Array<string | { testId: string; testName: string; price: number }>
  status: 'received'|'completed'
  tokenNo?: string
  sampleTime?: string
  reportingTime?: string
  referringConsultant?: string
  barcode?: string
  sampleType?: 'normal' | 'urgent' | 'stat'
}

type Track = { status: 'received' | 'completed'; sampleTime?: string; reportingTime?: string; tokenNo: string }

type LabTest = { id: string; name: string; category?: string }

function genToken(dateIso: string, id: string) {
  const d = new Date(dateIso)
  const part = `${d.getDate().toString().padStart(2,'0')}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getFullYear()}`
  return `D${part}_${id.slice(-3)}`
}

function genBarcode(order: Order) {
  const d = new Date(order.createdAt)
  const y = d.getFullYear()
  const part = String(order.tokenNo || order.id || '').replace(/\s+/g, '').replace(/[^a-z0-9_-]/gi, '')
  return `BC-${y}-${part}`
}

export default function Lab_ReportApproval() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId') || ''
  const resultId = searchParams.get('resultId') || ''
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [result, setResult] = useState<ResultRecord | null>(null)
  const [tests, setTests] = useState<LabTest[]>([])
  const testsMap = useMemo(() => Object.fromEntries(tests.map(t => [t.id, t.name])), [tests])

  const [q, setQ] = useState('')
  const [resultTab, setResultTab] = useState<'all' | 'outsource' | 'pending_perform' | 'pending_approval' | 'approved' | 'printed'>('pending_approval')
  const [listLoading, setListLoading] = useState(false)
  const [list, setList] = useState<Array<{ order: Order; result: any }>>([])
  const [trackOpen, setTrackOpen] = useState(false)
  const [trackTokenNo, setTrackTokenNo] = useState<string | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectLoading, setRejectLoading] = useState(false)
  const [rejectError, setRejectError] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approveOpen, setApproveOpen] = useState(false)
  const [approveLoading, setApproveLoading] = useState(false)
  const [batchPrintLoading, setBatchPrintLoading] = useState(false)

  const session = useLabSession()

  useEffect(() => {
    let mounted = true
    setLoading(false)
    setOrder(null)
    setResult(null)
    if (!orderId) return
    setLoading(true)
    ;(async () => {
      try {
        const [ordRes, resRes, tstRes] = await Promise.all([
          labApi.listOrders({ limit: 500 }),
          labApi.listResults({ orderId, limit: 100 }),
          labApi.listTests({ limit: 1000 }),
        ])
        if (!mounted) return
        const found = (ordRes.items || []).find((x: any) => String(x._id) === String(orderId))
        const o: Order | null = found
          ? {
              id: found._id,
              createdAt: found.createdAt || new Date().toISOString(),
              patient: found.patient || { fullName: '-', phone: '' },
              tests: found.tests || [],
              status: found.status || 'received',
              tokenNo: found.tokenNo,
              sampleTime: found.sampleTime,
              reportingTime: found.reportingTime,
              referringConsultant: found.referringConsultant,
              barcode: found.barcode,
            }
          : null
        setOrder(o)

        // Find specific result by resultId if provided, otherwise take first pending result
        let rec = null
        if (Array.isArray(resRes.items) && resRes.items.length) {
          if (resultId) {
            rec = resRes.items.find((r: any) => String(r._id) === String(resultId))
          }
          // Fallback to first pending result if specific one not found
          if (!rec) {
            rec = resRes.items.find((r: any) => r.reportStatus === 'pending' || r.reportStatus === 'rejected') || resRes.items[0]
          }
        }
        setResult(
          rec
            ? {
                id: String(rec._id || rec.id),
                orderId: String(rec.orderId || orderId),
                testId: rec.testId,
                testName: rec.testName,
                rows: (rec.rows || []).map((r: any) => ({
                  id: String(r.id || r._id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
                  test: String(r.test || ''),
                  normal: r.normal,
                  unit: r.unit,
                  prevValue: r.prevValue,
                  value: r.value,
                  flag: r.flag,
                  comment: r.comment,
                })),
                interpretation: rec.interpretation,
                createdAt: String(rec.createdAt || new Date().toISOString()),
                submittedBy: rec.submittedBy,
                approvedBy: rec.approvedBy,
                approvedAt: rec.approvedAt,
              }
            : null
        )

        setTests((tstRes.items || []).map((t: any) => ({ id: t._id, name: t.name, category: t.category || '' })))
      } catch (e) {
        console.error(e)
        if (mounted) {
          setOrder(null)
          setResult(null)
          setTests([])
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [orderId, resultId])

  useEffect(() => {
    let mounted = true
    if (orderId) return
    setListLoading(true)
    ;(async () => {
      try {
        // Fetch all results and filter by tab
        const [resRes, ordRes, tstRes] = await Promise.all([
          labApi.listResults({ limit: 1000 }),
          labApi.listOrders({ limit: 1000 }),
          labApi.listTests({ limit: 1000 }),
        ])
        if (!mounted) return

        const results: any[] = (resRes.items || [])
        // Filter by tab
        const filtered = resultTab === 'all' ? results
          : resultTab === 'pending_perform' ? results.filter((r: any) => !r.reportStatus || r.reportStatus === 'draft')
          : resultTab === 'pending_approval' ? results.filter((r: any) => r.reportStatus === 'pending' || r.reportStatus === 'rejected')
          : resultTab === 'approved' ? results.filter((r: any) => r.reportStatus === 'approved' && !r.printedAt)
          : resultTab === 'printed' ? results.filter((r: any) => r.printedAt)
          : resultTab === 'outsource' ? results.filter((r: any) => r.outsourceLabId)
          : results

        const allOrders: Order[] = (ordRes.items || []).map((x: any) => ({
          id: x._id,
          createdAt: x.createdAt || new Date().toISOString(),
          patient: x.patient || { fullName: '-', phone: '' },
          tests: x.tests || [],
          status: x.status || 'result_entered',
          tokenNo: x.tokenNo,
          sampleTime: x.sampleTime,
          reportingTime: x.reportingTime,
          referringConsultant: x.referringConsultant,
          barcode: x.barcode,
        }))
        const orderById = new Map<string, Order>(allOrders.map(o => [o.id, o]))

        setTests((tstRes.items || []).map((t: any) => ({ id: t._id, name: t.name, category: t.category || '' })))

        // Build list from filtered results + their orders
        const listItems = filtered
          .map(r => {
            const oid = String(r?.orderId || '')
            const order = orderById.get(oid)
            if (!order) return null
            return { order, result: r }
          })
          .filter(Boolean)
          .map(x => {
            // Use testName from result if available, otherwise fall back to matching
            const resultTestName = x!.result?.testName
            if (resultTestName) {
              return { ...x!, order: { ...x!.order, tests: [{ testId: x!.result?.testId, testName: resultTestName, price: 0 }] } }
            }
            // Fallback: Filter tests to only show those in the result (for legacy results without testName)
            const resultTestNames = new Set((x!.result?.rows || []).map((r: any) => String(r.test).toLowerCase()))
            const filteredTests = x!.order.tests.filter((t: any) => {
              const tname = typeof t === 'object' && t?.testName ? t.testName : testsMap[typeof t === 'object' ? t.testId : String(t)]
              return resultTestNames.has(String(tname || '').toLowerCase())
            })
            return { ...x!, order: { ...x!.order, tests: filteredTests } }
          })

        setList(listItems)
      } catch (e) {
        console.error(e)
        if (mounted) {
          setList([])
          setTests([])
        }
      } finally {
        if (mounted) setListLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [orderId, q, resultTab])

  const tokenNo = useMemo(() => {
    if (!order) return '-'
    return order.tokenNo || genToken(order.createdAt, order.id)
  }, [order])

  const track: Track | null = useMemo(() => {
    if (!order) return null
    return {
      status: order.status,
      tokenNo,
      sampleTime: order.sampleTime,
      reportingTime: order.reportingTime,
    }
  }, [order, tokenNo])

  const testsStr = useMemo(() => {
    // Use result's testName if available (for new results)
    if (result?.testName) return result.testName
    // Fallback: derive from order tests
    if (!order) return ''
    return (order.tests || []).map((t: any) => {
      const tid = typeof t === 'object' && t?.testId ? t.testId : String(t)
      const tname = typeof t === 'object' && t?.testName ? t.testName : testsMap[tid]
      return tname
    }).filter(Boolean).join(', ')
  }, [order, testsMap, result])

  const isApproved = useMemo(() => {
    return String((result as any)?.reportStatus || 'pending') === 'approved'
  }, [result])

  const preview = async (skipHeaderFooter = false) => {
    if (!order || !result) return
    await previewLabReportPdf({
      tokenNo,
      barcode: order.barcode,
      createdAt: order.createdAt,
      sampleTime: track?.sampleTime,
      reportingTime: track?.reportingTime,
      approvedAt: result.approvedAt,
      approvedBy: result.approvedBy || undefined,
      patient: {
        fullName: order.patient.fullName,
        phone: order.patient.phone,
        mrn: order.patient.mrn,
        age: order.patient.age,
        gender: order.patient.gender,
        address: order.patient.address,
      },
      rows: result.rows,
      interpretation: result.interpretation,
      referringConsultant: order.referringConsultant,
      profileLabel: testsStr,
      skipHeaderFooter,
    })
    const tokenId = (order as any).tokenId || (order as any).tokenNo || tokenNo
    labApi.markReportPrinted(tokenId).catch(()=>{})
  }

  // Status counts for MiniDashboard — must be ABOVE conditional returns (Rules of Hooks)
  const listStatusCounts = useMemo(() => {
    const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0, draft: 0, printed: 0 }
    for (const { result } of list) {
      const st = String(result?.reportStatus || 'pending')
      counts[st] = (counts[st] || 0) + 1
    }
    return counts
  }, [list])

  // Batch print all approved reports — defined before conditional returns (Rules of Hooks / variable scope)
  const batchPrint = async () => {
    if (batchPrintLoading) return
    const approvedItems = list.filter(({ result }) => String(result?.reportStatus || '') === 'approved')
    if (!approvedItems.length) { alert('No approved reports to print'); return }
    setBatchPrintLoading(true)
    try {
      for (const { order: o, result: r } of approvedItems) {
        const tk = o.tokenNo || genToken(o.createdAt, o.id)
        await previewLabReportPdf({
          tokenNo: tk,
          barcode: o.barcode,
          createdAt: o.createdAt,
          patient: { fullName: o.patient.fullName, phone: o.patient.phone, mrn: o.patient.mrn, age: o.patient.age, gender: o.patient.gender, address: o.patient.address },
          rows: (r.rows || []).filter((row: any) => (row.value || '').trim().length > 0),
          interpretation: r.interpretation,
          referringConsultant: o.referringConsultant,
          approvedAt: r.approvedAt,
          approvedBy: r.approvedBy || undefined,
          profileLabel: r.testName || undefined,
        })
        const tokenId = (o as any).tokenId || (o as any).tokenNo || tk
        labApi.markReportPrinted(tokenId).catch(() => {})
      }
    } catch (e) { console.error(e) }
    finally { setBatchPrintLoading(false) }
  }

  if (!orderId) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        {/* Header */}
        <div className="rounded-2xl bg-linear-to-r from-violet-600 via-sky-600 to-emerald-500 p-5 text-white shadow-lg shadow-sky-200/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Report Approval</h2>
              <div className="mt-0.5 text-sm text-sky-100">Review, approve, and manage lab reports</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={batchPrint}
                disabled={batchPrintLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30 disabled:opacity-50"
              >
                <Printer className={`h-4 w-4 ${batchPrintLoading ? 'animate-pulse' : ''}`} /> {batchPrintLoading ? 'Printing...' : 'Print All Approved'}
              </button>
              <button
                type="button"
                onClick={() => setResultTab(resultTab)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30"
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Mini Dashboard */}
        <MiniDashboard cards={[
          { label: 'Total Reports', value: list.length, icon: ListChecks, color: 'bg-sky-500' },
          { label: 'Pending Approval', value: listStatusCounts['pending'] || 0, icon: AlertTriangle, color: 'bg-amber-500' },
          { label: 'Approved', value: listStatusCounts['approved'] || 0, icon: CheckCircle2, color: 'bg-emerald-500' },
          { label: 'Printed', value: listStatusCounts['printed'] || 0, icon: Printer, color: 'bg-violet-500' },
        ]} />

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[260px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by token / patient / MRN..." className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1 text-sm">
            {([
              ['all', 'All'],
              ['pending_perform', 'Pending Perform'],
              ['pending_approval', 'Pending Approval'],
              ['approved', 'Approved'],
              ['printed', 'Printed'],
              ['outsource', 'Outsource Dispatched'],
            ] as const).map(([val, label]) => (
              <button key={val} type="button" onClick={()=>setResultTab(val as any)} className={`rounded-md px-3 py-1.5 border text-xs ${resultTab===val?'bg-violet-600 text-white border-violet-600':'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>{label}</button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Patient</th>
                <th className="px-3 py-2">MR No</th>
                <th className="px-3 py-2">Token</th>
                <th className="px-3 py-2">Barcode</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Test(s)</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(({ order, result }, idx) => {
                const token = order.tokenNo || genToken(order.createdAt, order.id)
                const testsStr = (order.tests || []).map((t: any) => {
                  const tid = typeof t === 'object' && t?.testId ? t.testId : String(t)
                  const tname = typeof t === 'object' && t?.testName ? t.testName : testsMap[tid]
                  return tname
                }).filter(Boolean).join(', ')
                const st = String(result?.reportStatus || 'pending')
                return (
                  <tr key={`${order.id}-${result?.id || idx}`} className="border-b border-slate-100">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(order.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{order.patient.fullName}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{order.patient.mrn || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-mono">{token}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-xs">
                        <Barcode className="h-4 w-4 text-slate-400" />
                        <span className="font-mono">{order.barcode || genBarcode(order)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        order.sampleType === 'urgent' ? 'bg-rose-100 text-rose-700' : 
                        order.sampleType === 'stat' ? 'bg-orange-100 text-orange-700' : 
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {order.sampleType || 'normal'}
                      </span>
                    </td>
                    <td className="px-3 py-2">{testsStr || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${st === 'approved' ? 'bg-emerald-100 text-emerald-700' : st === 'pending' ? 'bg-amber-100 text-amber-700' : st === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>{st}</span>
                      {(result as any).sampleType === 'urgent' && <span className="ml-1 rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">URG</span>}
                      {(result as any).sampleType === 'stat' && <span className="ml-1 rounded bg-rose-700 px-1.5 py-0.5 text-[10px] font-bold text-white">STAT</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/lab/report-approval?orderId=${encodeURIComponent(order.id)}&resultId=${encodeURIComponent(result?.id || '')}`)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Open</button>
                        <button onClick={() => { setTrackTokenNo(token); setTrackOpen(true) }} className="rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50"><Clock className="h-3 w-3" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!listLoading && list.length === 0 && (
            <div className="p-6 text-sm text-slate-500">No results awaiting approval</div>
          )}
          {listLoading && <div className="p-6 text-sm text-slate-600">Loading...</div>}
        </div>

        <Lab_TrackDialog open={trackOpen} onClose={() => setTrackOpen(false)} tokenNo={trackTokenNo || undefined} />
      </div>
    )
  }

  // Approve action should be restricted to admin / authorized roles
  const canApprove = session.isAdmin || session.role?.toLowerCase() === 'pathologist' || session.role?.toLowerCase() === 'senior'

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-violet-600 via-sky-600 to-emerald-500 p-5 text-white shadow-lg shadow-sky-200/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Report Approval</h2>
            <div className="mt-1 text-sm text-sky-100">
              Token: <span className="font-mono">{tokenNo}</span>
              {' · '}
              Patient: {order?.patient?.fullName || '-'}
              {' · '}
              MR No: {order?.patient?.mrn || '-'}
            </div>
            <div className="mt-1 text-xs text-sky-200">Tests: {testsStr || '-'}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setTrackTokenNo(tokenNo); setTrackOpen(true) }}
              className="inline-flex items-center gap-1 rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-xs text-white backdrop-blur-sm hover:bg-white/30"
            >
              <Clock className="h-4 w-4" />
              Track
            </button>
            <span className={`rounded-full px-2 py-0.5 text-xs ${isApproved ? 'bg-emerald-400/30 text-emerald-100' : 'bg-amber-400/30 text-amber-100'}`}>
              {isApproved ? 'approved' : 'pending approval'}
            </span>
          </div>
        </div>
      </div>

      {/* Modern Report Detail Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
        {loading && <div className="p-8 text-center text-sm text-slate-500">Loading report...</div>}
        {!loading && (!order || !result) && (
          <div className="p-8 text-center text-sm text-slate-500">No result found for this order.</div>
        )}

        {!loading && order && result && (
          <>
            {/* Patient Info Banner */}
            <div className="bg-linear-to-r from-slate-50 to-slate-100/50 border-b border-slate-200 px-6 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{order.patient.fullName}</h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>MR No: <strong className="text-slate-700">{order.patient.mrn || '-'}</strong></span>
                      <span>Age/Gender: <strong className="text-slate-700">{order.patient.age || '-'} / {order.patient.gender || '-'}</strong></span>
                      <span>Phone: <strong className="text-slate-700">{order.patient.phone || '-'}</strong></span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-lg bg-white px-3 py-1.5 text-xs shadow-sm ring-1 ring-slate-200">
                    <span className="text-slate-500">Token:</span> <span className="font-mono font-bold text-slate-800">{tokenNo}</span>
                  </div>
                  <div className="rounded-lg bg-white px-3 py-1.5 text-xs shadow-sm ring-1 ring-slate-200">
                    <span className="text-slate-500">Barcode:</span> <span className="font-mono font-bold text-slate-800">{order.barcode || genBarcode(order)}</span>
                  </div>
                  <div className="rounded-lg bg-white px-3 py-1.5 text-xs shadow-sm ring-1 ring-slate-200">
                    <FlaskConical className="mr-1 inline h-3 w-3 text-violet-500" />
                    <span className="font-semibold text-slate-800">{testsStr || '-'}</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span><CalendarDays className="mr-1 inline h-3 w-3" />Reg: {new Date(order.createdAt).toLocaleString()}</span>
                {track?.sampleTime && <span>Sample: {track.sampleTime}</span>}
                {track?.reportingTime && <span>Report: {track.reportingTime}</span>}
                {order.referringConsultant && <span>Ref: {order.referringConsultant}</span>}
                {result.submittedBy && <span>Entered by: <strong className="text-slate-700">{result.submittedBy}</strong></span>}
              </div>
            </div>

            {/* Results Table */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Activity className="h-4 w-4 text-violet-500" /> Test Results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => preview(false)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                    title="Print full report with header and footer"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print Full
                  </button>
                  <button
                    onClick={() => preview(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm hover:bg-violet-100 transition-colors"
                    title="Print without header/footer for pre-printed letterhead paper"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print Letterhead
                  </button>
                  <button
                    onClick={() => navigate(`/lab/results?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(tokenNo)}`)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5">Test</th>
                      <th className="px-4 py-2.5">Normal</th>
                      <th className="px-4 py-2.5">Unit</th>
                      <th className="px-4 py-2.5">Previous</th>
                      <th className="px-4 py-2.5">Result</th>
                      <th className="px-4 py-2.5">Flag</th>
                      <th className="px-4 py-2.5">Comment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.rows.map(r => {
                      const flagColor = r.flag?.startsWith('critical') ? 'text-rose-600 bg-rose-50' : r.flag?.startsWith('abnormal') ? 'text-amber-600 bg-amber-50' : r.flag === 'normal' ? 'text-emerald-600 bg-emerald-50' : ''
                      return (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-slate-800">{r.test}</td>
                        <td className="px-4 py-2.5 text-slate-500">{r.normal || '-'}</td>
                        <td className="px-4 py-2.5 text-slate-500">{r.unit || '-'}</td>
                        <td className="px-4 py-2.5 text-slate-500">{r.prevValue || '-'}</td>
                        <td className={`px-4 py-2.5 font-bold ${r.value ? 'text-slate-900' : 'text-slate-400'}`}>{r.value || '-'}</td>
                        <td className="px-4 py-2.5">{flagColor ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${flagColor}`}>{r.flag}</span> : '-'}</td>
                        <td className="px-4 py-2.5 text-slate-500">{r.comment || '-'}</td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Interpretation */}
            {result.interpretation && (
              <div className="mx-6 mb-4 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-violet-800">
                  <FileCheck className="h-4 w-4" /> Clinical Interpretation
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-violet-700">{result.interpretation}</div>
              </div>
            )}

            {/* Action Bar */}
            <div className="border-t border-slate-200 bg-slate-50/50 px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => navigate('/lab/report-approval')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" /> Back to List
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => { setRejectError(null); setRejectOpen(true) }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-rose-200 hover:bg-rose-700 active:scale-95 transition-all"
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                  <button
                    onClick={() => navigate(`/lab/results?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(tokenNo)}&returnTo=report-approval`)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                  {canApprove && !isApproved && (
                  <button
                    onClick={() => setApproveOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </button>
                  )}
                  {isApproved && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-4 py-2.5 text-sm font-bold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> Approved
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Approve Confirmation Modal */}
      {approveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
            <div className="bg-linear-to-r from-emerald-500 to-emerald-600 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-bold">Confirm Approval</div>
                  <div className="text-xs text-emerald-100">This action will lock the results</div>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 text-sm text-slate-600">
              <p>Approve this report for <strong className="text-slate-800">{order?.patient?.fullName}</strong>?</p>
              <p className="mt-1 text-xs text-slate-400">Token: {tokenNo} · Test: {testsStr}</p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={() => setApproveOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                disabled={approveLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!result) return
                  setApproveLoading(true)
                  try {
                    await labApi.updateResult(result.id, { reportStatus: 'approved', approvedAt: new Date().toISOString(), approvedBy: session.username || undefined })
                    setApproveOpen(false)
                    navigate('/lab/report-approval')
                  } catch (e) {
                    console.error(e)
                    alert('Failed to approve report')
                  } finally {
                    setApproveLoading(false)
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                disabled={approveLoading}
              >
                {approveLoading ? 'Approving...' : 'Approve & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
            <div className="bg-linear-to-r from-rose-500 to-rose-600 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-bold">Reject Report</div>
                  <div className="text-xs text-rose-100">Send back to Result Entry</div>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 text-sm text-slate-700 space-y-3">
              <div>Reject this report and send back to Result Entry?</div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Rejection Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-shadow"
                  placeholder="Enter reason for rejection..."
                />
              </div>
              {rejectError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{rejectError}</div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={() => { if (!rejectLoading) { setRejectOpen(false); setRejectError(null); setRejectReason('') } }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                disabled={rejectLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!order || !result) return
                  setRejectLoading(true)
                  setRejectError(null)
                  try {
                    await labApi.updateResult(result.id, { 
                      reportStatus: 'rejected', 
                      rejectionReason: rejectReason || 'Not specified' 
                    })
                    await labApi.updateOrderTrack(order.id, { status: 'received' })
                    setRejectOpen(false)
                    setRejectReason('')
                    navigate('/lab/report-approval')
                  } catch (e: any) {
                    console.error(e)
                    setRejectError(e?.message || 'Failed to reject report')
                  } finally {
                    setRejectLoading(false)
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                disabled={rejectLoading}
              >
                {rejectLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Lab_TrackDialog open={trackOpen} onClose={() => setTrackOpen(false)} tokenNo={trackTokenNo || undefined} />
    </div>
  )
}
