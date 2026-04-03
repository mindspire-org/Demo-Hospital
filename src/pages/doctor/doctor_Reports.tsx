import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { diagnosticApi, labApi, hospitalApi } from '../../utils/api'
import { previewLabReportPdf } from '../../utils/printLabReport'
import { printEchocardiographyReport } from '../../components/diagnostic/diagnostic_Echocardiography'
import { printUltrasoundReport } from '../../components/diagnostic/diagnostic_UltrasoundGeneric'
import { printCTScanReport } from '../../components/diagnostic/diagnostic_CTScan'
import { printColonoscopyReport } from '../../components/diagnostic/diagnostic_Colonoscopy'
import { printUpperGIEndoscopyReport } from '../../components/diagnostic/diagnostic_UpperGIEndoscopy'
import Toast from '../../components/ui/Toast'

function resolveDiagKey(name: string){
  const n = (name||'').toLowerCase()
  if (n.includes('ultrasound')) return 'Ultrasound'
  if (n.replace(/\s+/g,'') === 'ctscan') return 'CTScan'
  if (n.includes('echocardio')) return 'Echocardiography'
  if (n.includes('colonoscopy')) return 'Colonoscopy'
  if (n.includes('uppergi')) return 'UpperGiEndoscopy'
  return name
}

type DoctorSession = { id: string; name: string; username: string }

type DiagResult = { id: string; orderId?: string; testId?: string; testName: string; tokenNo?: string; createdAt?: string; reportedAt?: string; status: 'draft'|'final'; patient?: any; formData?: string }

type LabResultRec = { id: string; orderId: string; rows: any[]; interpretation?: string; createdAt: string }

type LabOrder = { id: string; createdAt: string; tokenNo?: string; patient?: any; tests?: string[]; sampleTime?: string; reportingTime?: string; referringConsultant?: string }

type UnifiedResult = { id: string; kind: 'lab'|'diagnostic'; date: string; patientName: string; mrn: string; token?: string; testName: string; status: string; raw: any }

export default function Doctor_Reports(){
  const location = useLocation()
  const today = new Date()
  const lastWeek = new Date(today.getTime() - 6*24*60*60*1000)
  const iso = (d: Date)=> d.toISOString().slice(0,10)

  const [doc, setDoc] = useState<DoctorSession | null>(null)

  // Filters
  const [from, setFrom] = useState(iso(lastWeek))
  const [to, setTo] = useState(iso(today))
  const [q, setQ] = useState('')
  const [type, setType] = useState<'all'|'lab'|'diagnostic'>('all')
  const [rows, setRows] = useState(20)
  const [page, setPage] = useState(1)
  const [mrnFilter, setMrnFilter] = useState('')
  const [toast, setToast] = useState<{type: 'success'|'error', message: string} | null>(null)

  // Load doctor session
  useEffect(()=>{
    try{
      const raw = localStorage.getItem('doctor.session')
      const sess = raw ? JSON.parse(raw) : null
      setDoc(sess)
      const hex24 = /^[a-f\d]{24}$/i
      if (sess && !hex24.test(String(sess.id||''))) {
        ;(async () => {
          try {
            const res = await hospitalApi.listDoctors() as any
            const docs: any[] = res?.doctors || []
            const match = docs.find(d => String(d.username||'').toLowerCase() === String(sess.username||'').toLowerCase()) ||
                          docs.find(d => String(d.name||'').toLowerCase() === String(sess.name||'').toLowerCase())
            if (match) {
              const fixed = { ...sess, id: String(match._id || match.id) }
              try { localStorage.setItem('doctor.session', JSON.stringify(fixed)) } catch {}
              setDoc(fixed)
            }
          } catch {}
        })()
      }
    }catch{}
  }, [])

  // Initialize filters from query params
  useEffect(()=>{
    try{
      const qs = new URLSearchParams(location.search)
      const mrn = qs.get('mrn') || ''
      const tp = (qs.get('type')||'').toLowerCase()
      if (mrn) setMrnFilter(mrn)
      if (tp==='lab' || tp==='diagnostic' || tp==='all') setType(tp as any)
    }catch{}
  }, [])

  // Diagnostic results
  const [diagItems, setDiagItems] = useState<DiagResult[]>([])
  const diagReq = useRef(0)
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try{
        const my = ++diagReq.current
        const res: any = await diagnosticApi.listResults({
          q: q||undefined,
          from: from||undefined,
          to: to||undefined,
          page: 1,
          limit: 500,
        })
        if (!mounted || my !== diagReq.current) return
        const arr: DiagResult[] = (res?.items||[]).map((x:any)=>({
          id: String(x._id || x.id),
          orderId: x.orderId ? String(x.orderId) : undefined,
          testId: x.testId ? String(x.testId) : undefined,
          testName: String(x.testName||''),
          tokenNo: x.tokenNo,
          createdAt: x.createdAt,
          reportedAt: x.reportedAt,
          status: x.status || 'draft',
          patient: x.patient,
          formData: typeof x.formData==='string'? x.formData : JSON.stringify(x.formData||''),
        }))
        setDiagItems(arr)
      } catch {
        setDiagItems([])
      }
    })()
    return ()=>{ mounted = false }
  }, [q, from, to])

  // Lab results + orders map
  const [labResults, setLabResults] = useState<LabResultRec[]>([])
  const [labOrders, setLabOrders] = useState<LabOrder[]>([])
  const labReq = useRef(0)
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try{
        const my = ++labReq.current
        const res: any = await labApi.listResults({ from: from||undefined, to: to||undefined, page: 1, limit: 500 })
        if (!mounted || my !== labReq.current) return
        const rlist: LabResultRec[] = (res?.items||[]).map((x:any)=>({ id: String(x._id||x.id), orderId: String(x.orderId||''), rows: x.rows||[], interpretation: x.interpretation, createdAt: x.createdAt || new Date().toISOString() }))
        setLabResults(rlist)
        const ordRes: any = await labApi.listOrders({ q: mrnFilter || undefined, from: from||undefined, to: to||undefined, limit: 500 })
        const olist: LabOrder[] = (ordRes?.items||[]).map((o:any)=>({ id: String(o._id||o.id), createdAt: o.createdAt || new Date().toISOString(), tokenNo: o.tokenNo, patient: o.patient||{}, tests: o.tests||[], sampleTime: o.sampleTime, reportingTime: o.reportingTime, referringConsultant: o.referringConsultant }))
        if (mounted) setLabOrders(olist)
      } catch {
        if (mounted){ setLabResults([]); setLabOrders([]) }
      }
    })()
    return ()=>{ mounted = false }
  }, [from, to, mrnFilter])

  const ordersMap = useMemo(()=> Object.fromEntries((labOrders||[]).map(o => [o.id, o])), [labOrders])

  // Combine into unified list
  const unifiedList = useMemo((): UnifiedResult[]=>{
    const term = q.trim().toLowerCase()
    const mrn = mrnFilter.trim().toLowerCase()
    const diagRows: UnifiedResult[] = (diagItems||[]).filter(r => (
      (r.patient?.fullName||'').toLowerCase().includes(term) ||
      (r.patient?.mrn||'').toLowerCase().includes(mrn) ||
      (r.tokenNo||'').toLowerCase().includes(term) ||
      (r.testName||'').toLowerCase().includes(term)
    )).map(r => ({
      id: r.id,
      kind: 'diagnostic' as const,
      date: r.createdAt || '',
      patientName: r.patient?.fullName || '-',
      mrn: r.patient?.mrn || '-',
      token: r.tokenNo || '-',
      testName: r.testName || '-',
      status: r.status,
      raw: r,
    }))
    const labRows: UnifiedResult[] = (labResults||[]).filter(r => {
      const ord = ordersMap[r.orderId]
      if (!ord) return false
      return (
        (ord.patient?.fullName||'').toLowerCase().includes(term) ||
        (ord.patient?.mrn||'').toLowerCase().includes(mrn) ||
        String(ord?.tokenNo||'').toLowerCase().includes(term)
      )
    }).map(r => {
      const ord = ordersMap[r.orderId]
      return {
        id: r.id,
        kind: 'lab' as const,
        date: r.createdAt || ord?.createdAt || '',
        patientName: ord?.patient?.fullName || '-',
        mrn: ord?.patient?.mrn || '-',
        token: ord?.tokenNo || '-',
        testName: (ord?.tests||[]).join(', ') || 'Lab Tests',
        status: 'final',
        raw: { rec: r, order: ord },
      }
    })
    let combined = [...diagRows, ...labRows].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime())
    if (type !== 'all') combined = combined.filter(r => r.kind === type)
    return combined
  }, [diagItems, labResults, ordersMap, q, mrnFilter, type])

  // Pagination
  const totalItems = unifiedList.length
  const pageCount = Math.max(1, Math.ceil(totalItems / rows))
  const curPage = Math.min(page, pageCount)
  const startIdx = (curPage - 1) * rows
  const pagedItems = unifiedList.slice(startIdx, startIdx + rows)

  // Print handlers
  function handlePrint(item: UnifiedResult){
    if (item.kind === 'diagnostic') {
      const r = item.raw as DiagResult
      const key = resolveDiagKey(r.testName)
      const payload = { tokenNo: r.tokenNo, createdAt: r.createdAt, reportedAt: r.reportedAt||r.createdAt, patient: r.patient as any, value: r.formData||'', referringConsultant: (r as any)?.patient?.referringConsultant }
      if (key === 'Echocardiography'){ printEchocardiographyReport(payload as any); return }
      if (key === 'Ultrasound'){ printUltrasoundReport(payload as any); return }
      if (key === 'CTScan'){ printCTScanReport(payload as any); return }
      if (key === 'Colonoscopy'){ printColonoscopyReport(payload as any); return }
      if (key === 'UpperGiEndoscopy'){ printUpperGIEndoscopyReport(payload as any); return }
      setToast({ type: 'error', message: 'Unknown diagnostic template for this test' })
    } else {
      const { rec, order } = item.raw as { rec: LabResultRec; order: LabOrder }
      if (!order) return
      previewLabReportPdf({
        tokenNo: order.tokenNo || '-',
        createdAt: order.createdAt,
        sampleTime: order.sampleTime,
        reportingTime: order.reportingTime,
        patient: {
          fullName: order.patient?.fullName,
          phone: order.patient?.phone,
          mrn: order.patient?.mrn,
          age: order.patient?.age,
          gender: order.patient?.gender,
          address: order.patient?.address,
        },
        rows: (rec.rows||[]).map((row: any)=>({
          test: row.test,
          normal: row.normal,
          unit: row.unit,
          value: row.value,
          prevValue: (row as any).prevValue,
          flag: row.flag,
          comment: row.comment,
        })),
        interpretation: rec.interpretation,
        referringConsultant: order.referringConsultant,
      }).catch(()=>{})
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-sky-100 to-violet-100 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-600">Doctor Portal</div>
            <div className="mt-1 text-2xl font-semibold text-slate-800">Reports</div>
            <div className="mt-1 text-sm text-slate-600">Diagnostic + Lab results in one place</div>
          </div>
          <div className="rounded-xl border border-white/40 bg-white/60 px-3 py-2 text-xs text-slate-700 shadow-sm">
            Range
            <div className="mt-0.5 font-medium">{from} → {to}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-800">Filters</div>
          <div className="text-xs text-slate-500">Tip: search by MRN or token</div>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <label className="mb-1 block text-xs font-medium text-slate-600">Search</label>
            <input value={q} onChange={e=>{ setQ(e.target.value); setPage(1) }} placeholder="Name, MRN, Token, Test" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Patient MRN</label>
            <input value={mrnFilter} onChange={e=>{ setMrnFilter(e.target.value); setPage(1) }} placeholder="MRN" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">From</label>
            <input type="date" value={from} onChange={e=>{ setFrom(e.target.value); setPage(1) }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">To</label>
            <input type="date" value={to} onChange={e=>{ setTo(e.target.value); setPage(1) }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Type</label>
            <select value={type} onChange={e=>{ setType(e.target.value as any); setPage(1) }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
              <option value="all">All</option>
              <option value="diagnostic">Diagnostic</option>
              <option value="lab">Lab</option>
            </select>
          </div>
        </div>
      </div>

      {/* Unified Results Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">Results</div>
            <div className="text-xs text-slate-500">{totalItems ? `${startIdx + 1}-${Math.min(startIdx + rows, totalItems)} of ${totalItems}` : ''}</div>
          </div>
          <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">{unifiedList.length} rows</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 border-b border-slate-200 bg-white/95 text-left text-slate-600 backdrop-blur">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">MRN</th>
                <th className="px-4 py-3">Token</th>
                <th className="px-4 py-3">Test</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedItems.map((r: UnifiedResult) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700">{new Date(r.date).toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${r.kind==='lab'?'bg-sky-50 text-sky-700':'bg-violet-50 text-violet-700'}`}>
                      {r.kind==='lab'?'Lab':'Diagnostic'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">{r.patientName}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700">{r.mrn}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700">{r.token}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700">{r.testName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${r.status==='final'?'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100':'bg-slate-100 text-slate-700 ring-1 ring-slate-200'}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button onClick={()=>handlePrint(r)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">Open PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pagedItems.length===0 && (
            <div className="p-8">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">No results for these filters.</div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-slate-50" disabled={curPage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">Page <span className="font-medium text-slate-800">{curPage}</span> / {pageCount}</span>
            <select value={rows} onChange={e=>{ setRows(parseInt(e.target.value)||20); setPage(1) }} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm outline-none">
              <option value={10}>10 rows</option>
              <option value={20}>20 rows</option>
              <option value={50}>50 rows</option>
            </select>
          </div>
          <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-slate-50" disabled={curPage>=pageCount} onClick={()=>setPage(p=>p+1)}>Next</button>
        </div>
      </div>

      {toast && <Toast toast={toast} onClose={()=>setToast(null)} />}
    </div>
  )
}
import { printUltrasoundReport } from '../../components/diagnostic/diagnostic_UltrasoundGeneric'
import { printCTScanReport } from '../../components/diagnostic/diagnostic_CTScan'
import { printColonoscopyReport } from '../../components/diagnostic/diagnostic_Colonoscopy'
import { printUpperGIEndoscopyReport } from '../../components/diagnostic/diagnostic_UpperGIEndoscopy'
import Toast from '../../components/ui/Toast'

function resolveDiagKey(name: string){
  const n = (name||'').toLowerCase()
  if (n.includes('ultrasound')) return 'Ultrasound'
  if (n.replace(/\s+/g,'') === 'ctscan') return 'CTScan'
  if (n.includes('echocardio')) return 'Echocardiography'
  if (n.includes('colonoscopy')) return 'Colonoscopy'
  if (n.includes('uppergi')) return 'UpperGiEndoscopy'
  return name
}

type DoctorSession = { id: string; name: string; username: string }

type DiagResult = { id: string; orderId?: string; testId?: string; testName: string; tokenNo?: string; createdAt?: string; reportedAt?: string; status: 'draft'|'final'; patient?: any; formData?: string }

type LabResultRec = { id: string; orderId: string; rows: any[]; interpretation?: string; createdAt: string }

type LabOrder = { id: string; createdAt: string; tokenNo?: string; patient?: any; tests?: string[]; sampleTime?: string; reportingTime?: string; referringConsultant?: string }

type UnifiedResult = { id: string; kind: 'lab'|'diagnostic'; date: string; patientName: string; mrn: string; token?: string; testName: string; status: string; raw: any }

export default function Doctor_Reports(){
  const location = useLocation()
  const today = new Date()
  const lastWeek = new Date(today.getTime() - 6*24*60*60*1000)
  const iso = (d: Date)=> d.toISOString().slice(0,10)

  const [doc, setDoc] = useState<DoctorSession | null>(null)

  // Filters
  const [from, setFrom] = useState(iso(lastWeek))
  const [to, setTo] = useState(iso(today))
  const [q, setQ] = useState('')
  const [type, setType] = useState<'all'|'lab'|'diagnostic'>('all')
  const [rows, setRows] = useState(20)
  const [diagPage, setDiagPage] = useState(1)
  const [labPage, setLabPage] = useState(1)
  const [mrnFilter, setMrnFilter] = useState('')
  const [toast, setToast] = useState<{type: 'success'|'error', message: string} | null>(null)
  const [page, setPage] = useState(1)

  // Load doctor session (and ensure id is the Mongo _id when possible)
  useEffect(()=>{
    try{
      const raw = localStorage.getItem('doctor.session')
      const sess = raw ? JSON.parse(raw) : null
      setDoc(sess)
      const hex24 = /^[a-f\d]{24}$/i
      if (sess && !hex24.test(String(sess.id||''))) {
        ;(async () => {
          try {
            const res = await hospitalApi.listDoctors() as any
            const docs: any[] = res?.doctors || []
            const match = docs.find(d => String(d.username||'').toLowerCase() === String(sess.username||'').toLowerCase()) ||
                          docs.find(d => String(d.name||'').toLowerCase() === String(sess.name||'').toLowerCase())
            if (match) {
              const fixed = { ...sess, id: String(match._id || match.id) }
              try { localStorage.setItem('doctor.session', JSON.stringify(fixed)) } catch {}
              setDoc(fixed)
            }
          } catch {}
        })()
      }
    }catch{}
  }, [])

  // Initialize filters from query params (mrn, my, type)
  useEffect(()=>{
    try{
      const qs = new URLSearchParams(location.search)
      const mrn = qs.get('mrn') || ''
      const tp = (qs.get('type')||'').toLowerCase()
      if (mrn) setMrnFilter(mrn)
      if (tp==='lab' || tp==='diagnostic' || tp==='all') setType(tp as any)
    }catch{}
    // run once for initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Diagnostic results
  const [diagItems, setDiagItems] = useState<DiagResult[]>([])
  const [diagTotal, setDiagTotal] = useState(0)
  const [diagTotalPages, setDiagTotalPages] = useState(1)
  const diagReq = useRef(0)
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try{
        const my = ++diagReq.current
        const res: any = await diagnosticApi.listResults({
          q: q||undefined,
          from: from||undefined,
          to: to||undefined,
          page: diagPage,
          limit: rows,
        })
        if (!mounted || my !== diagReq.current) return
        const arr: DiagResult[] = (res?.items||[]).map((x:any)=>({
          id: String(x._id || x.id),
          orderId: x.orderId ? String(x.orderId) : undefined,
          testId: x.testId ? String(x.testId) : undefined,
          testName: String(x.testName||''),
          tokenNo: x.tokenNo,
          createdAt: x.createdAt,
          reportedAt: x.reportedAt,
          status: x.status || 'draft',
          patient: x.patient,
          formData: typeof x.formData==='string'? x.formData : JSON.stringify(x.formData||''),
        }))
        setDiagItems(arr)
        setDiagTotal(Number(res?.total || arr.length || 0))
        setDiagTotalPages(Number(res?.totalPages || 1))
      } catch {
        setDiagItems([]); setDiagTotal(0); setDiagTotalPages(1)
      }
    })()
    return ()=>{ mounted = false }
  }, [q, from, to, diagPage, rows])

  // Lab results + orders map
  const [labResults, setLabResults] = useState<LabResultRec[]>([])
  const [labOrders, setLabOrders] = useState<LabOrder[]>([])
  const [labTotal, setLabTotal] = useState(0)
  const [labTotalPages, setLabTotalPages] = useState(1)
  const labReq = useRef(0)
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try{
        const my = ++labReq.current
        // Results page
        const res: any = await labApi.listResults({ from: from||undefined, to: to||undefined, page: labPage, limit: rows })
        if (!mounted || my !== labReq.current) return
        const rlist: LabResultRec[] = (res?.items||[]).map((x:any)=>({ id: String(x._id||x.id), orderId: String(x.orderId||''), rows: x.rows||[], interpretation: x.interpretation, createdAt: x.createdAt || new Date().toISOString() }))
        setLabResults(rlist)
        setLabTotal(Number(res?.total || rlist.length || 0))
        setLabTotalPages(Number(res?.totalPages || 1))
        // Load orders window
        const ordRes: any = await labApi.listOrders({ q: mrnFilter || undefined, from: from||undefined, to: to||undefined, limit: 500 })
        const olist: LabOrder[] = (ordRes?.items||[]).map((o:any)=>({ id: String(o._id||o.id), createdAt: o.createdAt || new Date().toISOString(), tokenNo: o.tokenNo, patient: o.patient||{}, tests: o.tests||[], sampleTime: o.sampleTime, reportingTime: o.reportingTime, referringConsultant: o.referringConsultant }))
        if (mounted) setLabOrders(olist)
      } catch {
        if (mounted){ setLabResults([]); setLabOrders([]); setLabTotal(0); setLabTotalPages(1) }
      }
    })()
    return ()=>{ mounted = false }
  }, [from, to, labPage, rows, mrnFilter])

  // Fetch my referrals (pending orders)
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      if (!doc?.id) { if (mounted) setMyReferrals([]); return }
      setRefLoading(true)
      try{
        const [labRefs, diagRefs]: any = await Promise.all([
          hospitalApi.listReferrals({ type: 'lab', doctorId: doc.id, from: from||undefined, to: to||undefined, page: 1, limit: 100 }),
          hospitalApi.listReferrals({ type: 'diagnostic', doctorId: doc.id, from: from||undefined, to: to||undefined, page: 1, limit: 100 }),
        ])
        const labRows: Referral[] = (labRefs?.referrals||[]).map((r: any)=>({
          id: String(r._id||r.id),
          type: 'lab',
          patientName: r.patientName || r.patient?.fullName || r.patientId?.fullName || '-',
          mrNo: r.mrNo || r.patient?.mrn || r.patientId?.mrn || '-',
          tests: r.tests || [],
          notes: r.notes || '',
          status: r.status || 'pending',
          createdAt: r.createdAt || new Date().toISOString(),
          encounterId: r.encounterId,
        }))
        const diagRows: Referral[] = (diagRefs?.referrals||[]).map((r: any)=>({
          id: String(r._id||r.id),
          type: 'diagnostic',
          patientName: r.patientName || r.patient?.fullName || r.patientId?.fullName || '-',
          mrNo: r.mrNo || r.patient?.mrn || r.patientId?.mrn || '-',
          tests: r.tests || [],
          notes: r.notes || '',
          status: r.status || 'pending',
          createdAt: r.createdAt || new Date().toISOString(),
          encounterId: r.encounterId,
        }))
        if (mounted) setMyReferrals([...labRows, ...diagRows].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()))
      } catch { if (mounted) setMyReferrals([]) }
      finally { if (mounted) setRefLoading(false) }
    })()
    return ()=>{ mounted = false }
  }, [doc?.id, from, to])

  const ordersMap = useMemo(()=> Object.fromEntries((labOrders||[]).map(o => [o.id, o])), [labOrders])

  // Combine into unified list
  const unifiedList = useMemo((): UnifiedResult[]=>{
    const term = q.trim().toLowerCase()
    const mrn = mrnFilter.trim().toLowerCase()
    const diagRows: UnifiedResult[] = (diagItems||[]).filter(r => (
      (r.patient?.fullName||'').toLowerCase().includes(term) ||
      (r.patient?.mrn||'').toLowerCase().includes(mrn) ||
      (r.tokenNo||'').toLowerCase().includes(term) ||
      (r.testName||'').toLowerCase().includes(term)
    )).map(r => ({
      id: r.id,
      kind: 'diagnostic',
      date: r.createdAt || '',
      patientName: r.patient?.fullName || '-',
      mrn: r.patient?.mrn || '-',
      token: r.tokenNo || '-',
      testName: r.testName || '-',
      status: r.status,
      raw: r,
    }))
    const labRows: UnifiedResult[] = (labResults||[]).filter(r => {
      const ord = ordersMap[r.orderId]
      if (!ord) return false
      return (
        (ord.patient?.fullName||'').toLowerCase().includes(term) ||
        (ord.patient?.mrn||'').toLowerCase().includes(mrn) ||
        String(ord?.tokenNo||'').toLowerCase().includes(term)
      )
    }).map(r => {
      const ord = ordersMap[r.orderId]
      return {
        id: r.id,
        kind: 'lab',
        date: r.createdAt || ord?.createdAt || '',
        patientName: ord?.patient?.fullName || '-',
        mrn: ord?.patient?.mrn || '-',
        token: ord?.tokenNo || '-',
        testName: (ord?.tests||[]).join(', ') || 'Lab Tests',
        status: 'final',
        raw: { ...r, order: ord },
      }
    })
    let combined = [...diagRows, ...labRows].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime())
    if (type !== 'all') combined = combined.filter(r => r.kind === type)
    return combined
  }, [diagItems, labResults, ordersMap, q, mrnFilter, type])

  // Pagination
  const totalItems = unifiedList.length
  const pageCount = Math.max(1, Math.ceil(totalItems / rows))
  const curPage = Math.min(page, pageCount)
  const startIdx = (curPage - 1) * rows
  const pagedItems = unifiedList.slice(startIdx, startIdx + rows)

  // Print handlers
  function onPrint(item: UnifiedResult){
    if (item.kind === 'diagnostic') onPrintDiag(item.raw as DiagResult)
    else onPrintLab((item.raw as any).rec as LabResultRec)
  }

  // Printing actions
  async function onPrintDiag(r: DiagResult){
    const key = resolveDiagKey(r.testName)
    const payload = { tokenNo: r.tokenNo, createdAt: r.createdAt, reportedAt: r.reportedAt||r.createdAt, patient: r.patient as any, value: r.formData||'', referringConsultant: (r as any)?.patient?.referringConsultant }
    if (key === 'Echocardiography'){ await printEchocardiographyReport(payload as any); return }
    if (key === 'Ultrasound'){ await printUltrasoundReport(payload as any); return }
    if (key === 'CTScan'){ await printCTScanReport(payload as any); return }
    if (key === 'Colonoscopy'){ await printColonoscopyReport(payload as any); return }
    if (key === 'UpperGiEndoscopy'){ await printUpperGIEndoscopyReport(payload as any); return }
    setToast({ type: 'error', message: 'Unknown diagnostic template for this test' })
  }

  async function onPrintLab(rec: LabResultRec){
    const ord = ordersMap[rec.orderId]; if (!ord) return
    try{
      await previewLabReportPdf({
        tokenNo: ord.tokenNo || '-',
        createdAt: ord.createdAt,
        sampleTime: ord.sampleTime,
        reportingTime: ord.reportingTime,
        patient: {
          fullName: ord.patient?.fullName,
          phone: ord.patient?.phone,
          mrn: ord.patient?.mrn,
          age: ord.patient?.age,
          gender: ord.patient?.gender,
          address: ord.patient?.address,
        },
        rows: (rec.rows||[]).map((row: any)=>({
          test: row.test,
          normal: row.normal,
          unit: row.unit,
          value: row.value,
          prevValue: (row as any).prevValue,
          flag: row.flag,
          comment: row.comment,
        })),
        interpretation: rec.interpretation,
        referringConsultant: ord.referringConsultant,
      })
    } catch (e){}
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-sky-100 to-violet-100 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-600">Doctor Portal</div>
            <div className="mt-1 text-2xl font-semibold text-slate-800">Reports</div>
            <div className="mt-1 text-sm text-slate-600">Diagnostic + Lab results in one place</div>
          </div>
          <div className="rounded-xl border border-white/40 bg-white/60 px-3 py-2 text-xs text-slate-700 shadow-sm">
            Range
            <div className="mt-0.5 font-medium">{from} → {to}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-800">Filters</div>
          <div className="text-xs text-slate-500">Tip: search by MRN or token</div>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <label className="mb-1 block text-xs font-medium text-slate-600">Search</label>
            <input value={q} onChange={e=>{ setQ(e.target.value); setDiagPage(1); setLabPage(1) }} placeholder="Name, MRN, Token, Test" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Patient MRN</label>
            <input value={mrnFilter} onChange={e=>{ setMrnFilter(e.target.value); setDiagPage(1); setLabPage(1) }} placeholder="MRN" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">From</label>
            <input type="date" value={from} onChange={e=>{ setFrom(e.target.value); setDiagPage(1); setLabPage(1) }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">To</label>
            <input type="date" value={to} onChange={e=>{ setTo(e.target.value); setDiagPage(1); setLabPage(1) }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Type</label>
            <select value={type} onChange={e=> setType(e.target.value as any)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
              <option value="all">All</option>
              <option value="diagnostic">Diagnostic</option>
              <option value="lab">Lab</option>
            </select>
          </div>
        </div>
      </div>

      {(type==='diagnostic' || type==='all') && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">Diagnostic Results</div>
              <div className="text-xs text-slate-500">{diagTotal ? `${diagStart}-${diagEnd} of ${diagTotal}` : ''}</div>
            </div>
            <div className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">{diagFiltered.length} rows</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-slate-200 bg-white/95 text-left text-slate-600 backdrop-blur">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">MRN</th>
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3">Test</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {diagFiltered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">{new Date(r.createdAt || '').toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">{r.patient?.fullName || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">{r.patient?.mrn || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">{r.tokenNo || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">{r.testName || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${r.status==='final'?'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100':'bg-slate-100 text-slate-700 ring-1 ring-slate-200'}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button onClick={()=>onPrintDiag(r)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">Open PDF</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {diagFiltered.length===0 && (
              <div className="p-8">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">No diagnostic results for these filters.</div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-slate-50" disabled={diagCurPage<=1} onClick={()=>setDiagPage(p=>Math.max(1,p-1))}>Prev</button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">Page <span className="font-medium text-slate-800">{diagCurPage}</span> / {diagPageCount}</span>
              <select value={rows} onChange={e=>{ setRows(parseInt(e.target.value)||20); setDiagPage(1); setLabPage(1) }} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm outline-none">
                <option value={10}>10 rows</option>
                <option value={20}>20 rows</option>
                <option value={50}>50 rows</option>
              </select>
            </div>
            <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-slate-50" disabled={diagCurPage>=diagPageCount} onClick={()=>setDiagPage(p=>p+1)}>Next</button>
          </div>
        </div>
      )}

      {(type==='lab' || type==='all') && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">Lab Results</div>
              <div className="text-xs text-slate-500">{labTotal ? `${labStart}-${labEnd} of ${labTotal}` : ''}</div>
            </div>
            <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">{labFiltered.length} rows</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-slate-200 bg-white/95 text-left text-slate-600 backdrop-blur">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">MRN</th>
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {labFiltered.map(r => {
                  const o = ordersMap[r.orderId]
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">{new Date(r.createdAt || o?.createdAt || '').toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">{o?.patient?.fullName || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">{o?.patient?.mrn || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">{o?.tokenNo || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button onClick={()=>onPrintLab(r)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">Open PDF</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {labFiltered.length===0 && (
              <div className="p-8">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">No lab results for these filters.</div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-slate-50" disabled={labCurPage<=1} onClick={()=>setLabPage(p=>Math.max(1,p-1))}>Prev</button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">Page <span className="font-medium text-slate-800">{labCurPage}</span> / {labPageCount}</span>
              <select value={rows} onChange={e=>{ setRows(parseInt(e.target.value)||20); setDiagPage(1); setLabPage(1) }} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm outline-none">
                <option value={10}>10 rows</option>
                <option value={20}>20 rows</option>
                <option value={50}>50 rows</option>
              </select>
            </div>
            <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-slate-50" disabled={labCurPage>=labPageCount} onClick={()=>setLabPage(p=>p+1)}>Next</button>
          </div>
        </div>
      )}

      {/* My Referrals - Pending Orders */}
      {(type==='all' || type==='lab' || type==='diagnostic') && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">My Referrals (Pending Orders)</div>
              <div className="text-xs text-slate-500">Lab and Diagnostic referrals you created</div>
            </div>
            <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">{myReferrals.length} pending</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-slate-200 bg-white/95 text-left text-slate-600 backdrop-blur">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">MRN</th>
                  <th className="px-4 py-3">Tests</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myReferrals.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${r.type==='lab'?'bg-sky-50 text-sky-700':'bg-violet-50 text-violet-700'}`}>
                        {r.type==='lab'?'Lab':'Diagnostic'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">{r.patientName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">{r.mrNo}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{(r.tests||[]).join(', ') || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700">{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {myReferrals.length===0 && !refLoading && (
              <div className="p-8">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">No pending referrals. Create referrals from the Prescription History page.</div>
              </div>
            )}
            {refLoading && (
              <div className="p-8 text-center text-sm text-slate-500">Loading referrals...</div>
            )}
          </div>
        </div>
      )}
      {toast && <Toast toast={toast} onClose={()=>setToast(null)} />}
    </div>
  )
}
