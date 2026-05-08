import { useEffect, useMemo, useState } from 'react'
import { Search, Calendar, Printer, RotateCcw, Barcode, Clock, DollarSign, ListChecks, FlaskConical, CheckCircle2, RefreshCw } from 'lucide-react'
import { labApi } from '../../utils/api'
import Lab_ReasonDialog from '../../components/lab/lab_ReasonDialog'
import Lab_TrackDialog from '../../components/lab/lab_TrackDialog'
import { printLabTokenSlip } from '../../utils/printLabToken'
import MiniDashboard from '../../components/common/MiniDashboard'
import { useLabSession } from '../../hooks/useLabSession'

type OrderTest = {
  _id: string
  testId: string
  testName: string
  price: number
  status: 'pending' | 'sample_collected' | 'in_progress' | 'result_entered' | 'approved' | 'completed' | 'returned'
  sampleTime?: string
  isReturned: boolean
  returnedAt?: string
  resultId?: string
  performedBy?: string
}

type Order = {
  id: string
  createdAt: string
  patient: { fullName: string; phone: string; cnic?: string; guardianName?: string; mrn?: string }
  tests: OrderTest[] // Now populated from LabOrderTest collection
  status: 'received'|'in_progress'|'completed'|'cancelled'
  tokenNo?: string
  barcode?: string
  sampleCollectedAt?: string
  referringConsultant?: string
  collectionCenterName?: string
  receivedAmount?: number
  receivableAmount?: number
}


function formatDateTime(iso: string) {
  const d = new Date(iso); return d.toLocaleDateString() + ', ' + d.toLocaleTimeString()
}

function genBarcode(order: Order) {
  const d = new Date(order.createdAt)
  const y = d.getFullYear()
  const part = String(order.tokenNo || order.id || '').replace(/\s+/g, '').replace(/[^a-z0-9_-]/gi, '')
  return `BC-${y}-${part}`
}

export default function Lab_Tracking() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  // no tick needed; backend drives pagination

  const [trackOpen, setTrackOpen] = useState(false)
  const [trackTokenNo, setTrackTokenNo] = useState<string | null>(null)

  // Filters
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState<'all' | 'received' | 'completed' | 'pending_lab' | 'pending_dues' | 'outsource' | 'deleted' | 'approved' | 'whatsapp_pending' | 'whatsapp_sent'>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'normal' | 'urgent' | 'stat'>('all')
  const [collectionCenters, setCollectionCenters] = useState<{_id: string, name: string}[]>([])
  const [selectedCenterId, setSelectedCenterId] = useState('')
  const [rows, setRows] = useState(20)
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState<{ text: string; kind: 'success'|'error' } | null>(null)

  const session = useLabSession()

  // Reason dialog state
  const [reasonOpen, setReasonOpen] = useState(false)
  const [reasonMode, setReasonMode] = useState<'return'|'undo'>('return')
  const [reasonCtx, setReasonCtx] = useState<{ id: string; testId: string } | null>(null)

  // Patient info dialog
  const [patientOpen, setPatientOpen] = useState(false)
  const [patientCtx, setPatientCtx] = useState<null | { patient: Order['patient']; token: string; barcode: string }>(null)

  const [receiveOpen, setReceiveOpen] = useState(false)
  const [receiveToken, setReceiveToken] = useState<string>('')
  const [receiveAmount, setReceiveAmount] = useState<string>('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res: any = await labApi.listActiveCollectionCenters()
        if (!mounted) return
        setCollectionCenters(res.items || [])
      } catch {}
    })()
    return () => { mounted = false }
  }, [])

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const apiStatus = status === 'all' ? undefined
          : status === 'pending_lab' ? 'received'
          : status === 'pending_dues' ? 'received'
          : status === 'deleted' ? 'cancelled'
          : status === 'approved' ? 'completed'
          : status === 'whatsapp_pending' ? 'completed'
          : status === 'whatsapp_sent' ? 'completed'
          : status
        const ordRes: any = await labApi.listOrders({ 
          q: q || undefined, 
          from: from || undefined, 
          to: to || undefined, 
          status: apiStatus as any,
          collectionCenterId: selectedCenterId || undefined,
          page, 
          limit: rows 
        })
        if (!mounted) return
        const items: Order[] = (ordRes.items||[]).map((x:any)=>({
          id: x._id,
          createdAt: x.createdAt || new Date().toISOString(),
          patient: x.patient || { fullName: '-', phone: '' },
          tests: x.tests || [], // LabOrderTest documents from API
          status: x.status || 'received',
          tokenNo: x.tokenNo,
          barcode: x.barcode,
          sampleCollectedAt: x.sampleCollectedAt,
          referringConsultant: x.referringConsultant,
          collectionCenterName: x.collectionCenterName,
        }))
        setOrders(items)
        setTotal(Number(ordRes.total||items.length||0))
        setTotalPages(Number(ordRes.totalPages||1))
      } catch(e){ console.error(e); setOrders([]); setTotal(0); setTotalPages(1) }
    })()
    return ()=>{ mounted = false }
  }, [q, from, to, status, selectedCenterId, page, rows])

  const pageCount = totalPages
  const curPage = Math.min(page, pageCount)
  const start = Math.min((curPage - 1) * rows + 1, total)
  const end = Math.min((curPage - 1) * rows + orders.length, total)
  const items = orders

  const downloadRegister = () => {
    const win = window.open('', 'print', 'width=900,height=700')
    if (!win) return
    const rowsHtml = items.map(o => {
      const token = o.tokenNo || o.id
      return o.tests.map(t => {
        const tname = t.testName || t.testId || '-'
        return `<tr>
          <td>${formatDateTime(o.createdAt)}</td>
          <td>${o.patient.fullName}</td>
          <td>${token}</td>
          <td>${tname}</td>
          <td>${o.patient.mrn || '-'}</td>
          <td>${o.patient.phone || '-'}</td>
          <td>${t.sampleTime || '-'}</td>
          <td>${t.status}</td>
          <td>${(t as any).performedBy || '-'}</td>
        </tr>`
      }).join('')
    }).join('')
    win.document.write(`<!doctype html><html><head><title>Daily Register</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;padding:24px;color:#0f172a}
        h1{font-size:18px;margin:0 0 12px 0}
        .meta{font-size:12px;color:#475569;margin-bottom:12px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #e2e8f0;padding:6px;text-align:left}
        th{background:#f8fafc}
      </style>
    </head><body>`)
    win.document.write(`<h1>Lab Daily Register</h1>`)
    win.document.write(`<div class="meta">Generated: ${new Date().toLocaleString()}</div>`)
    win.document.write(`<div class="meta">Filters — Status: ${status}, From: ${from||'-'} To: ${to||'-'}; Search: ${q||'-'}; Page Count: ${total}</div>`)
    win.document.write(`<table><thead><tr>
      <th>Date</th><th>Patient</th><th>Token</th><th>Tests</th><th>MR No</th><th>Phone</th><th>Sample Time</th><th>Status</th><th>Performed By</th>
    </tr></thead><tbody>${rowsHtml}</tbody></table>`)
    win.document.write('</body></html>')
    win.document.close(); win.focus(); win.print();
  }

  const submitReceive = async () => {
    const tokenNo = String(receiveToken || '').trim()
    const amount = Math.max(0, Number(receiveAmount) || 0)
    if (!tokenNo || !amount) return
    try {
      const r: any = await labApi.receiveTokenPayment(tokenNo, { amount })
      const rec = Number(r?.receivedAmount || 0)
      const recvbl = Number(r?.receivableAmount || 0)
      setOrders(prev => prev.map(o => (o.tokenNo || o.id) === tokenNo ? { ...o, receivedAmount: rec, receivableAmount: recvbl } : o))
      setNotice({ text: 'Payment received', kind: 'success' })
      setReceiveOpen(false)
    } catch (e){
      console.error(e)
      setNotice({ text: 'Failed to receive payment', kind: 'error' })
    }
  }

  const openReceive = (tokenNo: string) => {
    // Compute receivable amount from local orders data for this token
    const sameToken = orders.filter(x => (x.tokenNo || genBarcode(x)) === tokenNo)
    const activeTests = sameToken.flatMap(x => (x.tests || []).filter((t: OrderTest) => !t.isReturned))
    const tokenNet = activeTests.reduce((s, t) => s + Number(t.price || 0), 0)
    const currentReceived = sameToken[0]?.receivedAmount || 0
    const receivable = Math.max(0, tokenNet - Number(currentReceived || 0))

    setReceiveToken(tokenNo)
    setReceiveAmount(receivable > 0 ? String(receivable) : '')
    setReceiveOpen(true)
  }

  const setSampleTimeFor = async (id: string, testId: string, time: string) => {
    try {
      await labApi.updateOrderTrack(id, { testId, sampleTime: time })
      setOrders(prev => prev.map(o => o.id === id ? { 
        ...o, 
        tests: o.tests.map(t => 
          String(t.testId) === String(testId) ? { ...t, sampleTime: time } : t
        ) 
      } : o))
    } catch (e) { console.error(e) }
  }

  const openReturn = (id: string, testId: string) => { setReasonMode('return'); setReasonCtx({ id, testId }); setReasonOpen(true) }
  const openUndo = (id: string, testId: string) => { setReasonMode('undo'); setReasonCtx({ id, testId }); setReasonOpen(true) }

  const onReasonConfirm = async (note: string) => {
    if (!reasonCtx) return
    const { id, testId } = reasonCtx
    const o = orders.find(x => x.id === id); if (!o) { setReasonOpen(false); return }
    try {
      if (reasonMode === 'return'){
        // Find the test to get its price for refund calculation
        const test = o.tests.find(t => String(t.testId) === String(testId))
        const price = test ? Number(test.price || 0) : 0
        
        // Call track update with return info
        await labApi.updateOrderTrack(id, { 
          testId: String(testId), 
          orderTestId: (test as any)?.orderTestId,
          status: 'returned', 
          isReturned: true, 
          returnReason: note || 'Customer Return',
          refundAmount: price,
          refundMethod: 'cash'
        })

        setOrders(prev => prev.map(x => {
          if (x.id !== id) return x
          const updatedTests = x.tests.map(t => 
            String(t.testId) === String(testId) 
              ? { ...t, isReturned: true, status: 'returned' as const, returnedAt: new Date().toISOString() }
              : t
          )
          return { ...x, tests: updatedTests }
        }))
      } else {
        // Undo return
        const test = o.tests.find(t => String(t.testId) === String(testId))
        await labApi.updateOrderTrack(id, { 
          testId: String(testId), 
          orderTestId: (test as any)?.orderTestId,
          status: 'sample_collected', 
          isReturned: false 
        })

        setOrders(prev => prev.map(x => {
          if (x.id !== id) return x
          const updatedTests = x.tests.map(t => 
            String(t.testId) === String(testId) 
              ? { ...t, isReturned: false, status: 'sample_collected' as const, returnedAt: undefined }
              : t
          )
          return { ...x, tests: updatedTests }
        }))
      }
    } catch (e){ console.error(e); setNotice({ text: `Failed to ${reasonMode==='return'?'return':'undo'} test`, kind: 'error' }); try { setTimeout(()=> setNotice(null), 2500) } catch {} }
    setReasonOpen(false)
  }

  const printToken = async (id: string) => {
    const o = orders.find(x => x.id === id); if (!o) return
    const tokenNo = o.tokenNo || genBarcode(o)

    // Fetch token timeline to get updated financial data (like Today's Tokens does)
    let tl: any = null
    let tlToken: any = null
    let testStatuses: any[] = []
    try {
      tl = await labApi.getTokenTimeline(tokenNo)
      tlToken = tl?.token
      testStatuses = Array.isArray(tl?.testStatuses) ? tl.testStatuses : []
    } catch {}

    const sameToken = orders.filter(x => (x.tokenNo || genBarcode(x)) === tokenNo)
    const allTests: Array<{ testId: string; testName: string; price: number; isReturned?: boolean; status?: string }> = []
    sameToken.forEach(x => {
      (x.tests || []).forEach((t: OrderTest) => {
        allTests.push({ testId: t.testId, testName: t.testName, price: Number(t.price || 0), isReturned: t.isReturned, status: t.status })
      })
    })

    // Build test rows from timeline data if available (includes returned state and correct prices)
    const rows = (testStatuses.length > 0 ? testStatuses : allTests).map((t: any) => ({
      name: (t.isReturned || t.status === 'returned') 
        ? `${t.testName || t.testId} (Returned)` 
        : (t.testName || t.testId),
      price: Number(t.price || 0)
    }))

    const activeSubtotal = rows.reduce((s: number, r: any) => s + (r.name.includes('(Returned)') ? 0 : Number(r.price || 0)), 0)

    // Use timeline financial data if available (includes return/undo adjustments)
    const subtotal = Number(tlToken?.subtotal || tl?.order?.subtotal || activeSubtotal)
    const discount = Number(tlToken?.discount || 0)
    const net = Number(tlToken?.net || tl?.order?.net || Math.max(0, subtotal - discount))
    const receivedAmount = Number(tlToken?.receivedAmount || tl?.order?.receivedAmount || 0)
    const receivableAmount = Number(tlToken?.receivableAmount || tl?.order?.receivableAmount || Math.max(0, net - receivedAmount))
    let age: string | undefined = (o as any)?.patient?.age ? String((o as any).patient.age) : undefined
    let gender: string | undefined = (o as any)?.patient?.gender ? String((o as any).patient.gender) : undefined
    try {
      if (!age || !gender){
        let p: any = null
        if (o.patient?.mrn){
          const r: any = await labApi.getPatientByMrn(o.patient.mrn).catch(()=>null)
          p = r?.patient || r
        } else if (o.patient?.phone){
          const r: any = await labApi.searchPatients({ phone: o.patient.phone, limit: 1 }).catch(()=>null)
          p = (r?.items?.[0]) || (Array.isArray(r)? r[0] : null)
        }
        if (p){
          if (!gender && p.gender) gender = String(p.gender)
          if (!age){
            if (p.age) age = String(p.age)
            else if (p.dateOfBirth || p.dob){
              const dob = String(p.dateOfBirth || p.dob)
              const d = new Date(dob); const now = new Date();
              if (!isNaN(d.getTime())){
                let years = now.getFullYear() - d.getFullYear();
                const m = now.getMonth() - d.getMonth();
                if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--
                age = String(years)
              }
            }
          }
        }
      }
    } catch {}
    let printedBy = ''
    try {
      const raw = localStorage.getItem('lab.session')
      if (raw){ const s = JSON.parse(raw||'{}'); printedBy = s?.username || s?.user?.username || '' }
      if (!printedBy){
        const d = localStorage.getItem('diagnostic.user'); if (d){ const u = JSON.parse(d||'{}'); printedBy = u?.username || u?.name || '' }
      }
      if (!printedBy){
        const h = localStorage.getItem('hospital.session'); if (h){ const u = JSON.parse(h||'{}'); printedBy = u?.username || '' }
      }
    } catch {}
    await printLabTokenSlip({ tokenNo, createdAt: o.createdAt, patient: { fullName: o.patient.fullName, mrn: o.patient.mrn, phone: o.patient.phone, gender, age }, tests: rows, subtotal, discount, net, receivedAmount, receivableAmount, printedBy })
  }

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { pending: 0, sample_collected: 0, in_progress: 0, result_entered: 0, approved: 0, returned: 0 }
    for (const o of orders) {
      for (const t of o.tests) {
        const s = String(t.status || 'pending')
        counts[s] = (counts[s] || 0) + 1
      }
    }
    return counts
  }, [orders])

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-violet-600 via-sky-600 to-emerald-500 p-5 text-white shadow-lg shadow-sky-200/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Sample Tracking</h2>
            <div className="mt-0.5 text-sm text-sky-100">Track sample status, returns, and payments</div>
          </div>
          <button
            type="button"
            onClick={() => { setPage(1) }}
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Mini Dashboard */}
      <MiniDashboard cards={[
        { label: 'Total Samples', value: orders.reduce((s, o) => s + o.tests.length, 0), icon: ListChecks, color: 'bg-sky-500' },
        { label: 'Pending', value: statusCounts['pending'] || 0, icon: Clock, color: 'bg-amber-500' },
        { label: 'Collected', value: statusCounts['sample_collected'] || 0, icon: FlaskConical, color: 'bg-blue-500' },
        { label: 'Approved', value: statusCounts['approved'] || 0, icon: CheckCircle2, color: 'bg-emerald-500' },
      ]} />

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={q} onChange={e=>{ setQ(e.target.value); setPage(1) }} placeholder="Search by sample ID, patient, or test..." className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-2 text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
            <Lab_ReasonDialog open={reasonOpen} title={reasonMode==='return'?'Return Reason':'Undo Return Reason'} placeholder="Reason (optional)" confirmText={reasonMode==='return'?'Return':'Undo'} onConfirm={onReasonConfirm} onClose={()=>setReasonOpen(false)} />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-slate-500" />
            <input type="date" value={from} onChange={e=>{ setFrom(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-900" />
            <input type="date" value={to} onChange={e=>{ setTo(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-900" />
          </div>
          <div className="flex flex-wrap items-center gap-1 text-sm">
            {([
              ['all', 'All'],
              ['pending_lab', 'Pending at Lab'],
              ['pending_dues', 'Pending Dues'],
              ['outsource', 'Outsource'],
              ['deleted', 'Deleted'],
              ['approved', 'Approved'],
              ['whatsapp_pending', 'Approved & Pending WhatsApp'],
              ['whatsapp_sent', 'WhatsApp Sent'],
            ] as const).map(([val, label]) => (
              <button key={val} type="button" onClick={()=>{setStatus(val as any); setPage(1)}} className={`rounded-md px-3 py-1.5 border text-xs ${status===val?'bg-sky-600 text-white border-sky-600':'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>{label}</button>
            ))}
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-xs text-slate-500">Priority:</span>
            {(['all', 'normal', 'urgent', 'stat'] as const).map(p => (
              <button key={p} type="button" onClick={()=>{setPriorityFilter(p); setPage(1)}} className={`rounded-md px-2 py-1 border text-xs ${priorityFilter===p?'bg-violet-600 text-white border-violet-600':'border-slate-300 text-slate-700 hover:bg-slate-50'} ${p==='urgent'?'border-amber-300':''} ${p==='stat'?'border-rose-300':''}`}>{p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <select
              value={selectedCenterId}
              onChange={e => { setSelectedCenterId(e.target.value); setPage(1) }}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-200 outline-none"
            >
              <option value="">All Locations</option>
              <option value="internal">Main Lab</option>
              {collectionCenters.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span>Rows</span>
            <select value={rows} onChange={e=>{ setRows(Number(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-900">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <button type="button" onClick={downloadRegister} className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">Download Daily Register</button>
          </div>
        </div>
        {notice && (
          <div className={`mt-3 rounded-md border px-3 py-2 text-sm ${notice.kind==='success'? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{notice.text}</div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Patient</th>
              <th className="px-4 py-2">Token No</th>
              <th className="px-4 py-2">Barcode</th>
              <th className="px-4 py-2">Test(s)</th>
              <th className="px-4 py-2">Sample Time</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Performed By</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.reduce((acc: any[], o) => {
              const token = o.tokenNo || o.id
              if (Array.isArray(o.tests)) {
                o.tests.forEach((t, idx) => {
                  const tid = t.testId
                  const tname = t.testName || tid || '—'
                  const rowStatus = t.status
                  const isReturned = t.isReturned || rowStatus === 'returned'
                  
                  acc.push(
                    <tr key={`${o.id}-${tid}-${idx}`} className={`border-b border-slate-100 text-slate-700 hover:bg-slate-50/70 ${isReturned ? 'bg-rose-50/30' : ''}`}>
                      <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{o.patient.fullName}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{token}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-xs">
                          <Barcode className="h-4 w-4 text-slate-400" />
                          <span className="font-mono">{o.barcode || genBarcode(o)}</span>
                        </div>
                      </td>
                      <td className={`px-4 py-2 ${isReturned ? 'line-through text-slate-400' : ''}`}>{tname}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <input type="time" disabled={isReturned} value={t.sampleTime || ''} onChange={e=>setSampleTimeFor(o.id, String(tid), e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-900 disabled:opacity-50" />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          rowStatus === 'completed' || rowStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          rowStatus === 'result_entered' ? 'bg-orange-100 text-orange-700' :
                          rowStatus === 'sample_collected' ? 'bg-blue-100 text-blue-700' :
                          rowStatus === 'returned' ? 'bg-rose-100 text-rose-700' :
                          rowStatus === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          rowStatus === 'pending' ? 'bg-slate-100 text-slate-500' :
                          'bg-slate-100 text-slate-700'
                        }`}>{rowStatus}</span>
                        {(o as any).sampleType === 'urgent' && <span className="ml-1 rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">URG</span>}
                        {(o as any).sampleType === 'stat' && <span className="ml-1 rounded bg-rose-700 px-1.5 py-0.5 text-[10px] font-bold text-white">STAT</span>}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-600">{t.performedBy || '—'}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={()=>printToken(o.id)} title="Print Token" className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"><Printer className="h-4 w-4" /></button>
                          <button
                            type="button"
                            onClick={() => { setTrackTokenNo(token); setTrackOpen(true) }}
                            title="Test Tracking"
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={()=>openReceive(token)} title="Receive Payment" className="inline-flex items-center justify-center rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"><DollarSign className="h-4 w-4" /></button>
                          {session.isMainLab && <button type="button" onClick={()=>openReturn(o.id, String(tid))} title="Return" className="inline-flex items-center justify-center rounded-md p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"><RotateCcw className="h-4 w-4" /></button>}
                          {session.isMainLab && <button type="button" onClick={()=>openUndo(o.id, String(tid))} title="Undo Return" className="inline-flex items-center justify-center rounded-md p-1.5 text-violet-600 hover:bg-violet-50 hover:text-violet-700"><RotateCcw className="h-4 w-4" /></button>}
                        </div>
                      </td>
                    </tr>
                  )
                })
              }
              return acc
            }, [] as any[])}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="p-6 text-sm text-slate-500">No samples found</div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <div>{total === 0 ? '0' : `${start}-${end}`} of {total}</div>
        <div className="flex items-center gap-2">
          <span>Page</span>
          <span>{curPage} / {pageCount}</span>
        </div>
      </div>

      {patientOpen && patientCtx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Patient Information</div>
            <div className="px-5 py-4 text-sm text-slate-700 space-y-3">
              <div>
                <div className="text-xs text-slate-500">Patient</div>
                <div className="mt-1 font-semibold text-slate-900">{patientCtx.patient.fullName || '-'}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-500">MR No</div>
                  <div className="mt-1 text-slate-900">{patientCtx.patient.mrn || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Phone</div>
                  <div className="mt-1 text-slate-900">{patientCtx.patient.phone || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">CNIC</div>
                  <div className="mt-1 text-slate-900">{patientCtx.patient.cnic || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Father Name</div>
                  <div className="mt-1 text-slate-900">{patientCtx.patient.guardianName || '-'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-slate-500">Token</div>
                  <div className="mt-1 font-mono text-slate-900">{patientCtx.token}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-slate-500">Barcode</div>
                  <div className="mt-1 font-mono text-slate-900">{patientCtx.barcode}</div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={() => { setPatientOpen(false); setPatientCtx(null) }} className="btn-outline-navy">Close</button>
            </div>
          </div>
        </div>
      )}

      {receiveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Receive Payment</div>
            <div className="px-5 py-4 text-sm text-slate-700 space-y-3">
              <div>
                <div className="text-xs text-slate-500">Token</div>
                <div className="mt-1 font-mono text-slate-900">{receiveToken}</div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Amount</label>
                <input value={receiveAmount} onChange={e=>setReceiveAmount(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="0" autoFocus />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={()=>setReceiveOpen(false)} className="btn-outline-navy">Cancel</button>
              <button type="button" onClick={submitReceive} className="btn bg-emerald-600 hover:bg-emerald-700">Receive</button>
            </div>
          </div>
        </div>
      )}

      <Lab_TrackDialog open={trackOpen} onClose={() => setTrackOpen(false)} tokenNo={trackTokenNo || undefined} />
    </div>
  )
}
