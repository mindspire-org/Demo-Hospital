import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { diagnosticApi, corporateApi } from '../../utils/api'
import { DiagnosticTemplateRegistry } from '../../components/diagnostic/registry'
import type { ReportRendererProps } from '../../components/diagnostic/registry'
import Toast from '../../components/ui/Toast'
import { Building2, FileText, Printer, CheckCircle2, AlertCircle } from 'lucide-react'

type Order = { 
  id: string; 
  tokenNo?: string; 
  createdAt?: string; 
  patient: any; 
  tests: string[]; 
  referringConsultant?: string; 
  items?: Array<{ testId: string; status: 'received'|'completed'|'returned'; sampleTime?: string; reportingTime?: string }>; 
  status?: 'received'|'completed'|'returned'
  corporateId?: string
  corporateName?: string
  billingType?: 'cash' | 'corporate'
}
type Test = { id: string; name: string }

function formatDateTime(iso?: string) {
  const d = new Date(iso || new Date().toISOString());
  return d.toLocaleDateString() + ', ' + d.toLocaleTimeString()
}

function toTextFormData(fd: any){
  if (fd == null) return ''
  if (typeof fd === 'string') return fd
  try { return JSON.stringify(fd, null, 2) } catch { return String(fd) }
}

export default function Diagnostic_ResultEntry(){
  const [searchParams] = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [tests, setTests] = useState<Test[]>([])
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const testsMap = useMemo(()=> Object.fromEntries(tests.map(t=>[t.id, t.name])), [tests])

  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [selectedTestId, setSelectedTestId] = useState<string>('')
  const [value, setValue] = useState('')
  const [resultId, setResultId] = useState<string | null>(null)
  const [orderFromResult, setOrderFromResult] = useState<Order | null>(null)
  const formRef = useRef<HTMLDivElement | null>(null)
  const selectedOrder = useMemo(()=> orders.find(o=>o.id===selectedOrderId) || orderFromResult || null, [orders, selectedOrderId, orderFromResult])
  const selectedTestName = useMemo(()=> testsMap[selectedTestId] || '', [testsMap, selectedTestId])
  const [templateMappings, setTemplateMappings] = useState<Array<{ testId: string; templateKey: string }>>([])
  const templateKeyByTestId = useMemo(()=> Object.fromEntries((templateMappings||[]).map(m=> [String(m.testId), String(m.templateKey)])), [templateMappings])

  // Toast notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [saving, setSaving] = useState(false)

  // Filters & pagination (aligned with Sample Tracking)
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState<'all'|'received'|'completed'|'returned'>('received')
  const [rows, setRows] = useState(20)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Load tests list (for name mapping)
  useEffect(()=>{ (async()=>{
    try {
      const tr = await diagnosticApi.listTests({ limit: 1000 }) as any
      setTests((tr?.items||tr||[]).map((t:any)=>({ id: String(t._id||t.id), name: t.name })))
    } catch { setTests([]) }
  })() }, [])

  // Load companies list (for corporate billing display)
  useEffect(()=>{ (async()=>{
    try {
      const res: any = await corporateApi.listCompanies()
      setCompanies((res?.companies||[]).map((c:any)=>({ id: String(c._id||c.id), name: c.name })))
    } catch { setCompanies([]) }
  })() }, [])

  // Load template mappings from settings
  useEffect(()=>{ (async()=>{
    try {
      const s = await diagnosticApi.getSettings() as any
      const arr = Array.isArray(s?.templateMappings) ? s.templateMappings : []
      setTemplateMappings(arr.map((x:any)=> ({ testId: String(x.testId||''), templateKey: String(x.templateKey||'') })))
    } catch { setTemplateMappings([]) }
  })() }, [])

  // Load orders according to filters/pagination
  useEffect(()=>{ let mounted = true; (async()=>{
    try {
      // Important: do NOT filter by order.status when viewing 'received',
      // otherwise an order with any returned item would be excluded.
      const st = (status==='all' || status==='received') ? undefined : status
      const res = await diagnosticApi.listOrders({ q: q || undefined, from: from || undefined, to: to || undefined, status: st as any, page, limit: rows }) as any
      const companyNameMap: Record<string, string> = {}
      for (const c of companies) companyNameMap[c.id] = c.name
      const items: Order[] = (res.items||[]).map((x:any)=>({ 
        id: String(x._id), 
        tokenNo: x.tokenNo, 
        createdAt: x.createdAt, 
        patient: x.patient, 
        tests: x.tests||[], 
        referringConsultant: x.referringConsultant, 
        items: x.items||[], 
        status: x.status,
        corporateId: x.corporateId,
        corporateName: x.corporateName || companyNameMap[x.corporateId] || undefined,
        billingType: x.billingType || (x.corporateId ? 'corporate' : 'cash')
      }))
      if (mounted){ setOrders(items); setTotal(Number(res.total||items.length||0)); setTotalPages(Number(res.totalPages||1)) }
    } catch { if (mounted){ setOrders([]); setTotal(0); setTotalPages(1) } }
  })(); return ()=>{ mounted=false } }, [q, from, to, status, page, rows, companies])

  // When order/test change, load existing result or clear
  useEffect(()=>{ (async()=>{
    setValue(''); setResultId(null)
    if (!selectedOrderId || !selectedTestId) return
    try {
      const r = await diagnosticApi.listResults({ orderId: selectedOrderId, testId: selectedTestId, limit: 1 }) as any
      const item = (r?.items||[])[0]
      if (item){
        setResultId(String(item._id))
        setValue(toTextFormData((item as any)?.formData))
      }
    } catch {}
  })() }, [selectedOrderId, selectedTestId])

  // Support deep-linking via query params (orderId, testId, resultId)
  useEffect(()=>{ (async()=>{
    const oid = searchParams.get('orderId') || ''
    const tid = searchParams.get('testId') || ''
    const rid = searchParams.get('resultId') || ''
    if (oid) setSelectedOrderId(oid)
    if (tid) setSelectedTestId(tid)
    if (rid){
      try {
        const r = await diagnosticApi.getResult(rid) as any
        if (r){
          setResultId(String(r._id))
          setValue(toTextFormData((r as any)?.formData))
          if (r.orderId) setSelectedOrderId(String(r.orderId))
          if (r.testId) setSelectedTestId(String(r.testId))
          // Provide snapshot so Print/Finalize works even if the order is not in the received list
          setOrderFromResult({ id: String(r.orderId), tokenNo: r.tokenNo, createdAt: r.createdAt, patient: r.patient||{}, tests: Array.isArray((r as any)?.tests)? (r as any).tests : [], referringConsultant: (r as any)?.patient?.referringConsultant, items: [], status: undefined as any })
          // Ensure testsMap can resolve test name for form selection
          if (r.testId && r.testName){
            setTests(prev => prev.some(t=> t.id === String(r.testId)) ? prev : [...prev, { id: String(r.testId), name: String(r.testName) }])
          }
        }
      } catch {}
    }
  })() }, [searchParams])

  const FormComp = useMemo(()=>{
    const key = templateKeyByTestId[selectedTestId]
    return key ? (DiagnosticTemplateRegistry as any)[key]?.Form as React.ComponentType<ReportRendererProps> : undefined
  }, [selectedTestId, templateKeyByTestId])

  async function save(){
    if (!selectedOrder || !selectedTestId) return
    if (!String(value || '').trim()) {
      setToast({ type: 'error', message: 'Please enter the report result before finalizing.' })
      return
    }

    setSaving(true)
    const reportedAt = new Date().toISOString()
    try {
      const payload = {
        orderId: selectedOrder.id,
        testId: selectedTestId,
        testName: selectedTestName,
        tokenNo: selectedOrder.tokenNo,
        patient: selectedOrder.patient,
        formData: value,
        status: 'final',
        reportedAt,
      }
      if (resultId){
        await diagnosticApi.updateResult(resultId, { formData: value, status: 'final', reportedAt })
      } else {
        const created = await diagnosticApi.createResult(payload as any) as any
        setResultId(String(created?._id))
      }

      // Persist completion on the order item so it disappears from the "Received" queue on next fetch.
      await diagnosticApi.updateOrderItemTrack(selectedOrder.id, selectedTestId, { status: 'completed', reportingTime: reportedAt } as any)

      // Optimistically update current table view.
      setOrders(prev => prev.map(o => {
        if (o.id !== selectedOrder.id) return o
        const items = Array.isArray(o.items) ? o.items.slice() : []
        const idx = items.findIndex(i=> i.testId===selectedTestId)
        if (idx>=0) items[idx] = { ...items[idx], status: 'completed', reportingTime: reportedAt }
        else items.push({ testId: selectedTestId, status: 'completed', reportingTime: reportedAt })
        return { ...o, items }
      }))

      // Clear selection
      setSelectedOrderId(''); setSelectedTestId(''); setValue(''); setResultId(null); setOrderFromResult(null)
      setToast({ type: 'success', message: 'Result finalized successfully' })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to finalize result' })
    } finally {
      setSaving(false)
    }
  }

  async function printNow(){
    if (!selectedOrder || !selectedTestId) return
    const key = templateKeyByTestId[selectedTestId]
    const tpl = key ? (DiagnosticTemplateRegistry as any)[key] : null
    if (tpl?.print){
      await tpl.print({ tokenNo: selectedOrder.tokenNo, createdAt: selectedOrder.createdAt, reportedAt: new Date().toISOString(), patient: selectedOrder.patient, value, referringConsultant: selectedOrder.referringConsultant })
    } else {
      // Fallback: open a simple print window with the raw text
      const w = window.open('', '_blank')
      if (w){
        w.document.write(`<html><head><title>Report - ${selectedTestName}</title><style>body{font-family:sans-serif;padding:40px}h1{font-size:18px}pre{white-space:pre-wrap}</style></head><body><h1>${selectedTestName}</h1><p>Patient: ${selectedOrder?.patient?.fullName||'-'}</p><p>Token: ${selectedOrder?.tokenNo||'-'}</p><hr/><pre>${String(value||'').replace(/</g,'&lt;')}</pre></body></html>`)
        w.document.close(); w.print()
      }
    }
  }

  // Pagination helpers
  const pageCount = Math.max(1, totalPages)
  const curPage = Math.min(page, pageCount)
  const start = Math.min((curPage - 1) * rows + 1, total)
  const end = Math.min((curPage - 1) * rows + orders.length, total)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-2xl font-bold text-slate-900">Result Entry</div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="min-w-[260px] flex-1">
            <input value={q} onChange={e=>{ setQ(e.target.value); setPage(1) }} placeholder="Search by token, patient, or test..." className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input type="date" value={from} onChange={e=>{ setFrom(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1" />
            <input type="date" value={to} onChange={e=>{ setTo(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1" />
          </div>
          <div className="flex items-center gap-1 text-sm">
            <button onClick={()=>{ setStatus('all'); setPage(1) }} className={`rounded-md px-3 py-1.5 border ${status==='all'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>All</button>
            <button onClick={()=>{ setStatus('received'); setPage(1) }} className={`rounded-md px-3 py-1.5 border ${status==='received'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>Received</button>
            <button onClick={()=>{ setStatus('completed'); setPage(1) }} className={`rounded-md px-3 py-1.5 border ${status==='completed'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>Completed</button>
            <button onClick={()=>{ setStatus('returned'); setPage(1) }} className={`rounded-md px-3 py-1.5 border ${status==='returned'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>Returned</button>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span>Rows</span>
            <select value={rows} onChange={e=>{ setRows(Number(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Patient</th>
              <th className="px-4 py-2">Token No</th>
              <th className="px-4 py-2">Test</th>
              <th className="px-4 py-2">Billing</th>
              <th className="px-4 py-2">MR No</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.reduce((acc: any[], o) => {
              const token = o.tokenNo || '-'
              const visibleTests = (o.tests||[]).filter((tid)=>{
                const item = (o.items||[]).find(i=> i.testId===tid)
                const istatus: 'received'|'completed'|'returned' = (item?.status || 'received') as any
                if (status==='all') return true
                return istatus === status
              })
              visibleTests.forEach((tid, idx) => {
                const tname = testsMap[tid] || '—'
                const isActive = selectedOrderId===o.id && selectedTestId===tid
                acc.push(
                  <tr key={`${o.id}-${tid}-${idx}`} className={`border-b border-slate-100 ${isActive? 'bg-violet-50' : ''}`}>
                    <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(o.createdAt||'')}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{o.patient?.fullName || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{token}</td>
                    <td className="px-4 py-2">{tname}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {o.billingType === 'corporate' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700" title={o.corporateName || 'Corporate'}>
                          <Building2 className="h-3 w-3" />
                          {o.corporateName || 'Corporate'}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Cash</span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{o.patient?.mrn || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{o.patient?.phone || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <button onClick={()=>{ setOrderFromResult(null); setSelectedOrderId(o.id); setSelectedTestId(String(tid)); setTimeout(()=> formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100) }} className="rounded-md bg-violet-600 px-2 py-1 text-xs font-medium text-white hover:bg-violet-700">Enter Result</button>
                    </td>
                  </tr>
                )
              })
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
          <button disabled={curPage<=1} onClick={()=> setPage(p=> Math.max(1, p-1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40">Prev</button>
          <span>{curPage} / {pageCount}</span>
          <button disabled={curPage>=pageCount} onClick={()=> setPage(p=> p+1)} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>

      {/* Result Form Area */}
      <div ref={formRef} className={`rounded-xl border bg-white p-5 transition-all ${selectedOrderId && selectedTestId ? 'border-violet-300 shadow-lg shadow-violet-100/30' : 'border-slate-200'}`}>
        {/* Form header when a test is selected */}
        {selectedOrderId && selectedTestId && (
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">{selectedTestName || 'Unknown Test'}</div>
                <div className="text-xs text-slate-500">{selectedOrder?.patient?.fullName || '-'} · Token #{selectedOrder?.tokenNo || '-'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={printNow} disabled={saving || !selectedOrderId || !selectedTestId} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40">
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
              <button onClick={()=>save()} disabled={saving || !selectedOrderId || !selectedTestId} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-40">
                <CheckCircle2 className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Finalize'}
              </button>
            </div>
          </div>
        )}

        {/* No test selected */}
        {!selectedOrderId && !selectedTestId && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <FileText className="mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm font-medium">Click "Enter Result" on a row above to begin</p>
          </div>
        )}

        {/* Test selected but no template mapping — show fallback textarea */}
        {selectedOrderId && selectedTestId && !FormComp && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>No report template mapped for this test. You can still enter results as free text below. Map a template in <strong>Diagnostic Settings</strong> for structured forms.</span>
            </div>
            <textarea
              value={value}
              onChange={e => setValue(e.target.value)}
              rows={10}
              placeholder="Enter report findings, impression, and notes here..."
              className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            />
          </div>
        )}

        {/* Template-mapped form — key forces remount on test change */}
        {FormComp && selectedOrderId && selectedTestId && (
          <FormComp key={`${selectedOrderId}-${selectedTestId}`} value={value} onChange={setValue} />
        )}
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
