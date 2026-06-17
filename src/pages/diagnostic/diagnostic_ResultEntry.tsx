import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { diagnosticApi, corporateApi } from '../../utils/api'
import { DiagnosticTemplateRegistry } from '../../components/diagnostic/registry'
import type { ReportRendererProps } from '../../components/diagnostic/registry'
import Toast from '../../components/ui/Toast'
import { Building2, Printer as PrinterIcon, Save as SaveIcon } from 'lucide-react'

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
  const selectedOrder = useMemo(()=> orders.find(o=>o.id===selectedOrderId) || orderFromResult || null, [orders, selectedOrderId, orderFromResult])
  const selectedTestName = useMemo(()=> testsMap[selectedTestId] || '', [testsMap, selectedTestId])
  const [templateMappings, setTemplateMappings] = useState<Array<{ testId: string; templateKey: string }>>([])
  const templateKeyByTestId = useMemo(()=> Object.fromEntries((templateMappings||[]).map(m=> [String(m.testId), String(m.templateKey)])), [templateMappings])

  // Toast notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

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
        const fd = (item as any)?.formData
        setValue(typeof fd === 'string' ? fd : JSON.stringify(fd || ''))
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
          const fd = (r as any)?.formData
          setValue(typeof fd === 'string' ? fd : JSON.stringify(fd || ''))
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

  // Rich text templates from settings
  const [richTextTemplates, setRichTextTemplates] = useState<Array<{ name: string; content: string }>>([])

  useEffect(()=>{ (async()=>{
    try {
      const s = await diagnosticApi.getSettings() as any
      const arr = Array.isArray(s?.reportTemplates) ? s.reportTemplates : []
      setRichTextTemplates(arr.map((x:any)=> ({ name: String(x.name||''), content: String(x.content||'') })).filter((t:any)=> t.name && t.content))
    } catch { setRichTextTemplates([]) }
  })() }, [])

  const formMeta = useMemo(()=>{
    const key = templateKeyByTestId[selectedTestId]
    if (key && (DiagnosticTemplateRegistry as any)[key]) {
      return { type: 'mapped' as const, Component: (DiagnosticTemplateRegistry as any)[key]?.Form as React.ComponentType<ReportRendererProps> }
    }
    // Fallback to generic rich text editor for unmapped tests
    return { type: 'richtext' as const, Component: (DiagnosticTemplateRegistry as any)['GenericParagraph'] as React.ComponentType<ReportRendererProps> }
  }, [selectedTestId, templateKeyByTestId])

  async function save(){
    if (!selectedOrder || !selectedTestId) return
    const payload = {
      orderId: selectedOrder.id,
      testId: selectedTestId,
      testName: selectedTestName,
      tokenNo: selectedOrder.tokenNo,
      patient: selectedOrder.patient,
      formData: value,
      status: 'final',
      reportedAt: new Date().toISOString(),
    }
    if (resultId){
      await diagnosticApi.updateResult(resultId, { formData: value, status: 'final', reportedAt: payload.reportedAt })
    } else {
      const created = await diagnosticApi.createResult(payload as any) as any
      setResultId(String(created?._id))
    }
    // Optimistically mark this test as completed so it disappears from the list (received filter)
    setOrders(prev => prev.map(o => {
      if (o.id !== selectedOrder.id) return o
      const items = Array.isArray(o.items) ? o.items.slice() : []
      const idx = items.findIndex(i=> i.testId===selectedTestId)
      const now = new Date().toISOString()
      if (idx>=0) items[idx] = { ...items[idx], status: 'completed', reportingTime: now }
      else items.push({ testId: selectedTestId, status: 'completed', reportingTime: now })
      return { ...o, items }
    }))
    // Clear selection
    setSelectedOrderId(''); setSelectedTestId(''); setValue(''); setResultId(null); setOrderFromResult(null)
    setToast({ type: 'success', message: 'Result finalized successfully' })
  }

  async function printNow(){
    if (!selectedOrder || !selectedTestId) return
    const key = templateKeyByTestId[selectedTestId]
    const tpl = key ? (DiagnosticTemplateRegistry as any)[key] : null
    if (tpl && tpl.print) {
      await tpl.print({ tokenNo: selectedOrder.tokenNo, createdAt: selectedOrder.createdAt, reportedAt: new Date().toISOString(), patient: selectedOrder.patient, value, referringConsultant: selectedOrder.referringConsultant })
    } else {
      // Generic rich text print
      await printGenericReport({ tokenNo: selectedOrder.tokenNo, createdAt: selectedOrder.createdAt, reportedAt: new Date().toISOString(), patient: selectedOrder.patient, value, referringConsultant: selectedOrder.referringConsultant, testName: selectedTestName })
    }
  }

  async function printGenericReport(input: { tokenNo?: string; createdAt?: string; reportedAt?: string; patient: any; value: string; referringConsultant?: string; testName: string }){
    const s: any = await diagnosticApi.getSettings().catch(()=>({}))
    const name = s?.diagnosticName || 'Diagnostic Center'
    const address = s?.address || '-'
    const phone = s?.phone || ''
    const email = s?.email || ''
    const department = s?.department || 'Department of Diagnostics'
    const logo = s?.logoDataUrl || ''
    const footer = s?.reportFooter || 'System Generated Report. No Signature Required.'
    const esc = (str: string) => str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
    const fmt = (iso?: string)=>{ const d = iso? new Date(iso): new Date(); return d.toLocaleDateString()+' '+d.toLocaleTimeString() }
    // Strip empty sections from rich text HTML
    const stripEmptySections = (html: string) => {
      const div = document.createElement('div')
      div.innerHTML = html
      // Remove empty paragraphs, empty list items, empty headings
      div.querySelectorAll('p,li,h1,h2,h3,h4').forEach(el => {
        if (!el.textContent?.trim()) el.remove()
      })
      // Remove empty ul/ol
      div.querySelectorAll('ul,ol').forEach(el => {
        if (!el.querySelector('li')) el.remove()
      })
      return div.innerHTML || '<p>No findings recorded.</p>'
    }
    const content = stripEmptySections(input.value || '')
    const html = `<!doctype html><html><head><meta charset="utf-8"/>
    <style>
      @page { size: A4 portrait; margin: 12mm }
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
      body{ font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#1e293b; }
      .wrap{ padding: 0 6mm; min-height: 100vh; display:flex; flex-direction:column }
      @media print { .wrap{ min-height: calc(100vh - 36mm) } }
      .hdr{display:grid;grid-template-columns:80px 1fr 80px;align-items:center;padding-bottom:10px;border-bottom:3px solid #0f172a;margin-bottom:8px}
      .hdr .title{font-size:26px;font-weight:800;text-align:center;letter-spacing:0.5px;color:#0f172a}
      .hdr .muted{color:#64748b;font-size:11px;text-align:center;margin-top:3px}
      .dept{font-style:italic;text-align:center;margin:6px 0 2px 0;font-size:13px;color:#334155;font-weight:500}
      .hr{border-bottom:1px solid #cbd5e1;margin:4px 0}
      .box{border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;margin:8px 0;background:#fafafa}
      .kv{display:grid;grid-template-columns: 130px minmax(0,1fr) 130px minmax(0,1fr) 130px minmax(0,1fr);gap:5px 12px;font-size:11.5px;align-items:start}
      .kv > div{line-height:1.3;color:#475569}
      .kv > div:nth-child(odd){font-weight:600;color:#334155}
      .kv > div:nth-child(2n){word-break:break-word;color:#0f172a}
      .title-mid{font-size:17px;font-weight:700;text-align:center;margin-top:6px;color:#0f172a;letter-spacing:0.3px}
      .sec{margin-top:10px}
      .sec-title{font-size:13px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px;padding-bottom:3px;border-bottom:1px solid #e2e8f0}
      .sec-text{white-space:normal;font-size:12.5px;line-height:1.6;color:#1e293b}
      .sec-text p{margin:0 0 6px 0}
      .sec-text ul,.sec-text ol{margin:0 0 6px 16px;padding:0}
      .sec-text li{margin-bottom:2px}
      .footnote{margin-top:20px;text-align:center;color:#64748b;font-size:10.5px}
      .foot-hr{border-bottom:1px solid #94a3b8;margin:10px 0}
      .spacer{flex:1}
      .footer-block{ page-break-inside: avoid; break-inside: avoid }
      .consult-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 20px;margin-top:8px}
      .consult .name{font-weight:700;text-transform:uppercase;font-size:12px;color:#0f172a}
      .consult .deg{font-size:11px;color:#475569}
      .consult .title{font-weight:600;font-size:11px;color:#334155}
    </style></head><body>
    <div class="wrap">
      <div class="hdr">
        <div>${logo? `<img src="${esc(logo)}" alt="logo" style="height:70px;width:auto;object-fit:contain"/>` : ''}</div>
        <div>
          <div class="title">${esc(name)}</div>
          <div class="muted">${esc(address)}</div>
          <div class="muted">Ph: ${esc(phone)} ${email? ' • '+esc(email): ''}</div>
        </div>
        <div></div>
      </div>
      <div class="dept">${esc(department)}</div>
      <div class="hr"></div>
      <div class="box">
        <div class="kv">
          <div>Medical Record No :</div><div>${esc(input.patient?.mrn || '-')}</div>
          <div>Sample No / Lab No :</div><div>${esc(input.tokenNo || '-')}</div>
          <div>Patient Name :</div><div>${esc(input.patient?.fullName || '-')}</div>
          <div>Age / Gender :</div><div>${esc(input.patient?.age || '')} / ${esc(input.patient?.gender || '')}</div>
          <div>Reg. & Sample Time :</div><div>${fmt(input.createdAt)}</div>
          <div>Reporting Time :</div><div>${fmt(input.reportedAt || new Date().toISOString())}</div>
          <div>Contact No :</div><div>${esc(input.patient?.phone || '-')}</div>
          <div>Referring Consultant :</div><div>${esc(input.referringConsultant || '-')}</div>
          <div>Address :</div><div>${esc(input.patient?.address || '-')}</div>
        </div>
      </div>
      <div class="title-mid">DIAGNOSTIC REPORT</div>
      <div class="box"><div class="sec-text">${content}</div></div>
      <div class="spacer"></div>
      <div class="footer-block">
        <div class="footnote">${esc(footer)}</div>
        <div class="foot-hr"></div>
      </div>
    </div>
    </body></html>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(()=>{ w.print() }, 300)
  }

  // Pagination helpers
  const pageCount = Math.max(1, totalPages)
  const curPage = Math.min(page, pageCount)
  const start = Math.min((curPage - 1) * rows + 1, total)
  const end = Math.min((curPage - 1) * rows + orders.length, total)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 rounded-full bg-violet-600" />
          <h1 className="text-xl font-bold text-slate-900">Result Entry</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[260px] flex-1">
            <input value={q} onChange={e=>{ setQ(e.target.value); setPage(1) }} placeholder="Search by token, patient, or test..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input type="date" value={from} onChange={e=>{ setFrom(e.target.value); setPage(1) }} className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all" />
            <span className="text-slate-400">→</span>
            <input type="date" value={to} onChange={e=>{ setTo(e.target.value); setPage(1) }} className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all" />
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            {(['all','received','completed','returned'] as const).map(st => (
              <button key={st} onClick={()=>{ setStatus(st); setPage(1) }} className={`rounded-lg px-3 py-2 text-xs font-medium border transition-colors ${status===st?'bg-violet-600 text-white border-violet-600 shadow-sm':'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
                {st==='all'?'All':st.charAt(0).toUpperCase()+st.slice(1)}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-xs text-slate-500">Rows</span>
            <select value={rows} onChange={e=>{ setRows(Number(e.target.value)); setPage(1) }} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-violet-500 outline-none">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-linear-to-r from-slate-50 to-slate-100 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Patient</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Token No</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Test</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Billing</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">MR No</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Phone</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Action</th>
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
                      <button onClick={()=>{ setOrderFromResult(null); setSelectedOrderId(o.id); setSelectedTestId(String(tid)) }} className="rounded-md bg-violet-600 px-2 py-1 text-xs font-medium text-white hover:bg-violet-700">Enter Result</button>
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

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        {!formMeta.Component && (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-8 justify-center">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <span>Select a sample row and click <strong>Enter Result</strong> to load the form.</span>
          </div>
        )}
        {formMeta.Component && formMeta.type === 'richtext' && (
          <formMeta.Component
            value={value}
            onChange={setValue}
            templates={richTextTemplates}
            onPrint={printNow}
            onSave={save}
          />
        )}
        {formMeta.Component && formMeta.type === 'mapped' && (
          <formMeta.Component value={value} onChange={setValue} />
        )}
      </div>

      {formMeta.type !== 'richtext' && (
        <div className="flex items-center justify-end gap-3">
          <button onClick={printNow} disabled={!formMeta.Component || !selectedOrderId || !selectedTestId} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40">
            <PrinterIcon className="w-4 h-4" /> Print
          </button>
          <button onClick={()=>save()} disabled={!formMeta.Component || !selectedOrderId || !selectedTestId} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors disabled:opacity-40 shadow-sm">
            <SaveIcon className="w-4 h-4" /> Finalize
          </button>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
