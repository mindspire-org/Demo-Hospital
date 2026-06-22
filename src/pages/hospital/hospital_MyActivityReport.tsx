import { useEffect, useMemo, useState } from 'react'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { hospitalApi } from '../../utils/api'
import { fmt12, fmtDateTime12 } from '../../utils/timeFormat'
import { 
  RefreshCw, 
  Calendar, 
  Clock, 
  Ticket,
  Stethoscope,
  Bed,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  FileText
} from 'lucide-react'

function currency(n: number){
  return `Rs ${Number(n || 0).toFixed(2)}`
}

function escHtml(v: any){
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c] || c)
}


function buildReportHtml({
  title,
  user,
  mode,
  shift,
  range,
  summary,
  unifiedItems,
}: {
  title: string
  user: string
  mode: 'today' | 'shift'
  shift?: any
  range?: any
  summary?: any
  unifiedItems: any[]
}){
  const now = new Date()
  const printedNow = fmtDateTime12(now.toISOString())
  const printedDate = printedNow.split(', ')[0] || ''
  const printedTime = printedNow.split(', ')[1] || ''
  const periodLabel = mode === 'today' ? 'Today' : 'Current Shift'
  const shiftLabel = shift ? `${shift.name}: ${fmt12(shift.start)}-${fmt12(shift.end)}` : '-'
  const rangeLabel = range?.label || `${range?.start ? fmtDateTime12(range.start) : '-'} → ${range?.end ? fmtDateTime12(range.end) : '-'}`

  const table = (label: string, head: string[], bodyRows: string[][]) => {
    const th = head.map(h => `<th>${escHtml(h)}</th>`).join('')
    const rows = (bodyRows || []).map(r => `<tr>${r.map((c, i) => {
      const content = String(c || '');
      const isHtml = content.includes('<div') || content.includes('<span');
      const escaped = isHtml ? content : escHtml(content);
      const isMoney = /^(financials|amount|fee|net|payment details|payment info)$/i.test(String(head[i] || ''));
      return `<td class="${isMoney ? 'right' : ''}">${escaped}</td>`
    }).join('')}</tr>`).join('')
    const empty = `<tr><td class="empty" colspan="${head.length}">No rows</td></tr>`
    return `
      <div class="section">
        <div class="section-title">${escHtml(label)}</div>
        <table>
          <colgroup>
            <col style="width: 14%">
            <col style="width: 22%">
            <col style="width: 18%">
            <col style="width: 12%">
            <col style="width: 12%">
            <col style="width: 22%">
          </colgroup>
          <thead><tr>${th}</tr></thead>
          <tbody>${rows || empty}</tbody>
        </table>
      </div>
    `
  }

  const summaryNet = Number(summary?.net || 0)
  const netClass = summaryNet > 0 ? 'pos' : (summaryNet < 0 ? 'neg' : 'zero')
  const money = (n: any) => `Rs ${Number(n || 0).toFixed(2)}`

  const bodyData = (unifiedItems || []).map((item: any) => {
    const dt = fmtDateTime12(item.dateTime)
    const patientInfoHtml = item.patientName ? `
      <div class="merged-col">
        <div class="merged-title">${escHtml(item.patientName)}</div>
        <div class="merged-sub">
          ${item.mrn && item.mrn !== '-' ? `MRN: ${escHtml(item.mrn)}` : ''}
          ${item.tokenNo && item.tokenNo !== '-' ? `${item.mrn && item.mrn !== '-' ? ' | ' : ''}Tok: ${escHtml(item.tokenNo)}` : ''}
          ${item.admissionNo && item.admissionNo !== '-' ? `${(item.mrn && item.mrn !== '-') || (item.tokenNo && item.tokenNo !== '-') ? ' | ' : ''}Adm: ${escHtml(item.admissionNo)}` : ''}
        </div>
      </div>
    ` : '-'

    let financialsHtml = `<div class="merged-col"><div class="merged-title">${money(item.financials.amount || 0)}</div>`
    if (item.financials.subtotal !== undefined || item.financials.discount !== undefined) {
      financialsHtml += `<div class="merged-sub">Sub: ${money(item.financials.subtotal || 0)} | Disc: ${money(item.financials.discount || 0)}</div>`
    }
    if (item.financials.received !== undefined || item.financials.pending !== undefined) {
      financialsHtml += `<div class="merged-sub">Rcvd: ${money(item.financials.received || 0)} | Pend: ${money(item.financials.pending || 0)}</div>`
    }
    if (item.financials.label) {
      financialsHtml += `<div class="merged-sub">${escHtml(item.financials.label)}</div>`
    }
    financialsHtml += '</div>'

    const pb = escHtml(item.performedBy)
    const mod = `<span class="badge blue">${escHtml(item.module)}</span>`
    const tt = escHtml(item.transactionType)

    return [dt, patientInfoHtml, financialsHtml, pb, mod, tt]
  })

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8"/>
      <title>${escHtml(title)}</title>
      <style>
        @page { size: A4 portrait; margin: 10mm }
        *{ box-sizing:border-box }
        body{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#0f172a; line-height:1.35; font-size:12px }
        .header{ border:1px solid #e2e8f0; border-radius:10px; padding:14px; margin-bottom:14px }
        .h1{ font-size:18px; font-weight:800; margin:0 0 6px 0 }
        .meta-grid{ display:grid; grid-template-columns: 1fr 1fr; gap:6px 12px }
        .meta{ color:#334155 }
        .meta b{ color:#0f172a }
        .net{ margin-top:10px; display:flex; align-items:baseline; justify-content:space-between; padding-top:10px; border-top:1px solid #e2e8f0 }
        .net .label{ color:#64748b; font-weight:600 }
        .net .value{ font-size:18px; font-weight:900 }
        .pos{ color:#059669 }
        .neg{ color:#dc2626 }
        .zero{ color:#334155 }
        .kpis{ margin-top:10px; display:grid; grid-template-columns: repeat(4, 1fr); gap:8px }
        .kpi{ border:1px solid #e2e8f0; border-radius:10px; padding:10px }
        .kpi .k{ color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.3px }
        .kpi .v{ margin-top:2px; font-size:14px; font-weight:800 }
        .kpi .s{ margin-top:2px; color:#64748b; font-size:11px }
        .section{ margin-top:12px; page-break-inside:avoid; background:#fff; border-radius:10px; overflow:hidden; border:1px solid #e2e8f0; }
        .section-title{ font-size:12px; font-weight:800; background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:8px 12px; color:#1e293b; }
        table{ width:100%; border-collapse:collapse; table-layout:fixed }
        th,td{ border-bottom:1px solid #f1f5f9; padding:8px 10px; vertical-align:top; word-wrap:break-word; font-size:10px }
        th{ background:#f8fafc; font-weight:700; color:#475569; border-bottom:1px solid #e2e8f0; text-align:left; text-transform:uppercase; font-size:9px; letter-spacing:0.05em; }
        td.right, th.right{ text-align:right }
        .empty{ text-align:center; color:#64748b; padding:16px; font-style:italic }
        .footer{ margin-top:14px; color:#94a3b8; font-size:10px; text-align:center }
        .merged-col{ display:flex; flex-direction:column; gap:2px }
        .merged-title{ font-weight:700; color:#0f172a }
        .merged-sub{ font-size:9px; color:#64748b }
        .badge{ display:inline-block; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:600; background:#f1f5f9; color:#475569 }
        .badge.emerald{ background:#d1fae5; color:#065f46 }
        .badge.blue{ background:#dbeafe; color:#1e40af }
        .badge.amber{ background:#fef3c7; color:#92400e }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="h1">My Activity Report</div>
        <div class="meta-grid">
          <div class="meta"><b>User:</b> ${escHtml(user || '-')}</div>
          <div class="meta"><b>Printed:</b> ${escHtml(printedDate)} ${escHtml(printedTime)}</div>
          <div class="meta"><b>Period:</b> ${escHtml(periodLabel)}</div>
          <div class="meta"><b>Shift:</b> ${escHtml(shiftLabel)}</div>
          <div class="meta" style="grid-column: 1 / -1"><b>Range:</b> ${escHtml(rangeLabel)}</div>
        </div>
        <div class="net">
          <div><div class="label">Net Balance</div></div>
          <div class="value ${netClass}">${escHtml(money(summaryNet))}</div>
        </div>
        <div class="kpis">
          <div class="kpi">
            <div class="k">Tokens</div>
            <div class="v">${escHtml(money(summary?.tokens?.revenue || 0))}</div>
            <div class="s">Count: ${escHtml(summary?.tokens?.count ?? 0)} | Discount: ${escHtml(money(summary?.tokens?.discount || 0))}</div>
          </div>
          <div class="kpi">
            <div class="k">ER Payments</div>
            <div class="v">${escHtml(money(summary?.erPayments?.total || 0))}</div>
            <div class="s">Count: ${escHtml(summary?.erPayments?.count ?? 0)}</div>
          </div>
          <div class="kpi">
            <div class="k">IPD Payments</div>
            <div class="v">${escHtml(money(summary?.ipdPayments?.total || 0))}</div>
            <div class="s">Count: ${escHtml(summary?.ipdPayments?.count ?? 0)}</div>
          </div>
          <div class="kpi">
            <div class="k">Outflow</div>
            <div class="v">${escHtml(money((summary?.expenses?.total || 0) + (summary?.doctorPayouts?.total || 0)))}</div>
            <div class="s">Expenses: ${escHtml(money(summary?.expenses?.total || 0))} | Doctor: ${escHtml(money(summary?.doctorPayouts?.total || 0))}</div>
          </div>
        </div>
      </div>
      ${table(
        `All Activities (${bodyData.length})`,
        ['Date/Time', 'Patient Info', 'Financials', 'Performed By', 'Module', 'Transaction Type'],
        bodyData
      )}
      <div class="footer">Generated by Hospital Management System</div>
    </body>
  </html>`
}

function SummaryCard({ 
  icon: Icon, 
  iconColor, 
  iconBg, 
  label, 
  count, 
  value, 
  subValue 
}: { 
  icon: any
  iconColor: string
  iconBg: string
  label: string
  count: number
  value: string
  subValue?: string
}){
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`h-9 w-9 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      <div className="mt-2">
        <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
        <div className="text-base font-bold text-slate-800">{value}</div>
        {subValue && <div className="text-xs text-slate-400 mt-0.5">{subValue}</div>}
      </div>
    </div>
  )
}

function Section({ title, children, icon: Icon }: { title: string; children: any; icon?: any }){
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/50 px-5 py-3.5 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-slate-500" />}
        <span className="text-[13px] font-bold uppercase tracking-wide text-slate-800">{title}</span>
      </div>
      <div className="p-4 bg-slate-50/20">{children}</div>
    </div>
  )
}

function PatientInfo({ name, mrn, token, adm }: { name: string, mrn?: string, token?: string, adm?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="font-semibold text-slate-900">{name || '-'}</div>
      <div className="text-[11px] text-slate-500 font-medium">
        {mrn ? <span className="mr-2">MRN: <span className="text-slate-700">{mrn}</span></span> : null}
        {token ? <span>Token: <span className="text-slate-700">{token}</span></span> : null}
        {adm ? <span>Adm: <span className="text-slate-700">{adm}</span></span> : null}
      </div>
    </div>
  )
}

function FinancialsInfo({ amount, subtotal, discount, received, pending, label }: { amount?: number, subtotal?: number, discount?: number, received?: number, pending?: number, label?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="font-bold text-slate-900">{currency(amount || 0)}</div>
      <div className="text-[11px] text-slate-500 font-medium grid grid-cols-2 gap-x-2 w-max">
        {subtotal !== undefined ? <span>Sub: <span className="text-slate-700">{currency(subtotal)}</span></span> : null}
        {discount !== undefined ? <span>Disc: <span className="text-slate-700">{currency(discount)}</span></span> : null}
        {received !== undefined ? <span>Rcvd: <span className="text-slate-700">{currency(received)}</span></span> : null}
        {pending !== undefined ? <span>Pend: <span className="text-slate-700">{currency(pending)}</span></span> : null}
        {label ? <span className="col-span-2 text-slate-600">{label}</span> : null}
      </div>
    </div>
  )
}

function Badge({ children, variant = 'gray' }: { children: React.ReactNode, variant?: 'emerald' | 'amber' | 'blue' | 'gray' }) {
  const styles = {
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    gray: 'bg-slate-100 text-slate-700 border-slate-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${styles[variant]}`}>
      {children}
    </span>
  )
}

function SimpleTable({ head, rows }: { head: string[]; rows: any[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.length === 0 ? (
            <tr><td colSpan={head.length} className="px-4 py-8 text-center text-slate-500 italic">No data available</td></tr>
          ) : rows.map((r, idx) => (
            <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
              {r.map((c, j) => (
                <td key={j} className="px-4 py-3 text-slate-700 align-top">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Hospital_MyActivityReport(){
  const [mode, setMode] = useState<'today'|'shift'>('today')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [toast, setToast] = useState<ToastState>(null)

  async function load(){
    setLoading(true)
    try{
      const res: any = await hospitalApi.myActivityReport({ mode })
      setData(res || null)
    }catch(e: any){
      setData(null)
      setToast({ type: 'error', message: e?.message || 'Failed to load report' })
    }finally{
      setLoading(false)
    }
  }

  const summary = data?.summary || {}
  const range = data?.range || {}
  const shift = data?.shift

  const tokens = data?.items?.tokens || []
  const erPayments = data?.items?.erPayments || []
  const ipdPayments = data?.items?.ipdPayments || []
  const expenses = data?.items?.expenses || []
  const doctorPayouts = data?.items?.doctorPayouts || []

  const unifiedItems = useMemo(() => {
    const list: any[] = []

    tokens.forEach((t: any) => {
      const serviceText = t.serviceNames || (Array.isArray(t.serviceIds) ? t.serviceIds.map((s:any)=>s.name||s).join(', ') : '') || 'OPD Visit'
      list.push({
        id: `opd-${t._id || t.tokenNo || t.createdAt}`,
        dateTime: t.createdAt || t.dateIso || '',
        patientName: t.patientName,
        mrn: t.mrn,
        tokenNo: t.tokenNo,
        financials: { amount: t.fee, discount: t.discount },
        performedBy: t.createdByUsername || t.performedBy || '-',
        module: 'OPD Token',
        transactionType: serviceText,
      })
    })

    erPayments.forEach((p: any) => {
      list.push({
        id: `er-${p._id || p.createdAt}`,
        dateTime: p.receivedAt || p.createdAt || '',
        patientName: p.patientName || p.patient,
        mrn: p.mrn || p.patientMrn,
        tokenNo: p.tokenNo || p.tokenNoFromToken || p.tokenNoFromTags,
        financials: { amount: p.amount, label: `Method: ${p.method || '-'} | Ref: ${p.refNo || '-'}` },
        performedBy: p.createdByUsername || p.performedBy || '-',
        module: 'ER Payment',
        transactionType: p.notes || 'ER Patient Payment',
      })
    })

    ipdPayments.forEach((p: any) => {
      list.push({
        id: `ipd-${p._id || p.createdAt}`,
        dateTime: p.receivedAt || p.createdAt || '',
        patientName: p.patientName || p.patient,
        mrn: p.mrn || p.patientMrn,
        admissionNo: p.admissionNo || p.admission,
        financials: { amount: p.amount, pending: p.pendingAmount, label: `Method: ${p.method || '-'} | Ref: ${p.refNo || '-'}` },
        performedBy: p.createdByUsername || p.performedBy || '-',
        module: 'IPD Payment',
        transactionType: p.notes || 'IPD Patient Payment',
      })
    })

    expenses.forEach((e: any) => {
      list.push({
        id: `exp-${e._id || e.createdAt}`,
        dateTime: e.createdAt || e.dateIso || '',
        patientName: undefined,
        mrn: undefined,
        tokenNo: undefined,
        financials: { amount: e.amount, label: `Method: ${e.method || '-'} | Ref: ${e.ref || e.refNo || '-'}` },
        performedBy: e.createdByUsername || e.performedBy || '-',
        module: 'Expense',
        transactionType: `${e.category || ''}${e.note || e.description ? ' (Note: ' + (e.note || e.description) + ')' : ''}`,
      })
    })

    doctorPayouts.forEach((p: any) => {
      list.push({
        id: `payout-${p.id || p.createdAt}`,
        dateTime: p.createdAt || p.dateIso || '',
        patientName: undefined,
        mrn: undefined,
        tokenNo: undefined,
        financials: { amount: p.amount, label: `Method: ${p.method || '-'} | Ref: ${p.refNo || p.ref || '-'}` },
        performedBy: p.createdByUsername || p.performedBy || '-',
        module: 'Doctor Payout',
        transactionType: `Doctor: ${p.doctorName || '-'}${p.memo ? ' (Memo: ' + p.memo + ')' : ''}`,
      })
    })

    return list.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
  }, [tokens, erPayments, ipdPayments, expenses, doctorPayouts])

  async function downloadPdf(){
    try{
      if (!data) {
        setToast({ type: 'error', message: 'No data to export' })
        return
      }
      const htmlDoc = buildReportHtml({
        title: 'My Activity Report',
        user: data?.user?.username || '-',
        mode,
        shift,
        range,
        summary,
        unifiedItems,
      })
      if (!htmlDoc) {
        setToast({ type: 'error', message: 'Nothing to export' })
        return
      }

      const api = (window as any).electronAPI
      if (api && typeof api.printPreviewHtml === 'function'){
        const r = await api.printPreviewHtml(htmlDoc, { printBackground: true, marginsType: 0 })
        if (r && r.ok === false) {
          setToast({ type: 'error', message: r.error || 'Failed to generate PDF' })
          return
        }
        return
      }

      const w = window.open('', '_blank')
      if (!w) {
        setToast({ type: 'error', message: 'Popup blocked. Please allow popups to export.' })
        return
      }
      w.document.open()
      w.document.write(htmlDoc)
      w.document.close()
      w.focus()
      setTimeout(() => {
        try { w.print() } catch {}
      }, 250)
    }catch(err: any){
      setToast({ type: 'error', message: err?.message || 'Failed to generate PDF' })
    }
  }

  useEffect(()=>{ load().catch(()=>{}) }, [mode])

  const netTone = useMemo(()=>{
    const v = Number(summary?.net || 0)
    if (v > 0) return 'text-emerald-700'
    if (v < 0) return 'text-rose-700'
    return 'text-slate-700'
  }, [summary?.net])

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-linear-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">My Activity Report</div>
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              {mode === 'today' ? 'Today summary' : 'Assigned shift summary'}
              {shift && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                  <Clock className="h-3 w-3" />
                  {shift.name}: {fmt12(shift.start)}-{fmt12(shift.end)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select 
              value={mode} 
              onChange={e=>setMode(e.target.value as any)} 
              className="appearance-none rounded-lg border border-slate-300 bg-white pl-9 pr-8 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              <option value="today">Today</option>
              <option value="shift">Current Shift</option>
            </select>
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
          <button 
            onClick={load} 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all disabled:opacity-50"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button
            onClick={downloadPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!data || loading}
          >
            Export PDF
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading report data...</span>
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50/50 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-slate-800">Financial Summary</span>
              </div>
              <div className="text-xs text-slate-500">
                User: <span className="font-medium text-slate-700">{data?.user?.username || '-'}</span>
              </div>
            </div>
            
            <div className="p-4">
              <div className={`rounded-xl p-4 mb-4 ${Number(summary?.net || 0) >= 0 ? 'bg-linear-to-r from-emerald-50 to-teal-50 border border-emerald-100' : 'bg-linear-to-r from-rose-50 to-red-50 border border-rose-100'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-600">Net Balance</div>
                    <div className={`text-3xl font-bold mt-1 ${netTone}`}>
                      {currency(summary?.net || 0)}
                    </div>
                  </div>
                  <div className="text-xs font-medium text-slate-700 bg-white/60 px-2 py-1 rounded">
                    {data?.user?.username || '-'}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <SummaryCard 
                  icon={Ticket}
                  iconColor="text-blue-600"
                  iconBg="bg-blue-50"
                  label="Tokens"
                  count={summary?.tokens?.count ?? 0}
                  value={currency(summary?.tokens?.revenue || 0)}
                  subValue={`Discount: ${currency(summary?.tokens?.discount || 0)}`}
                />
                <SummaryCard 
                  icon={Stethoscope}
                  iconColor="text-amber-600"
                  iconBg="bg-amber-50"
                  label="ER Payments"
                  count={summary?.erPayments?.count ?? 0}
                  value={currency(summary?.erPayments?.total || 0)}
                />
                <SummaryCard 
                  icon={Bed}
                  iconColor="text-purple-600"
                  iconBg="bg-purple-50"
                  label="IPD Payments"
                  count={summary?.ipdPayments?.count ?? 0}
                  value={currency(summary?.ipdPayments?.total || 0)}
                />
                <SummaryCard 
                  icon={Wallet}
                  iconColor="text-rose-600"
                  iconBg="bg-rose-50"
                  label="Outflow"
                  count={(summary?.expenses?.count ?? 0) + (summary?.doctorPayouts?.count ?? 0)}
                  value={currency((summary?.expenses?.total || 0) + (summary?.doctorPayouts?.total || 0))}
                  subValue={`Exp: ${currency(summary?.expenses?.total || 0)} | Doc: ${currency(summary?.doctorPayouts?.total || 0)}`}
                />
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <ArrowUpRight className="h-4 w-4" />
                    <span className="text-sm font-medium">Total Inflow</span>
                  </div>
                  <div className="text-lg font-bold text-emerald-700 mt-1">{currency(summary?.inflowTotal || 0)}</div>
                </div>
                <div className="rounded-lg bg-rose-50 border border-rose-100 p-3">
                  <div className="flex items-center gap-2 text-rose-700">
                    <ArrowDownRight className="h-4 w-4" />
                    <span className="text-sm font-medium">Total Outflow</span>
                  </div>
                  <div className="text-lg font-bold text-rose-700 mt-1">{currency(summary?.outflowTotal || 0)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Section title={`All Activities (${unifiedItems.length})`} icon={Ticket}>
              <SimpleTable
                head={['Date/Time', 'Patient Info', 'Financial Details', 'Performed By', 'Module', 'Transaction Type']}
                rows={unifiedItems.map((item: any) => [
                  fmtDateTime12(item.dateTime),
                  item.patientName ? <PatientInfo key={1} name={item.patientName} mrn={item.mrn} token={item.tokenNo} adm={item.admissionNo} /> : '-',
                  <FinancialsInfo 
                    key={2} 
                    amount={item.financials.amount} 
                    subtotal={item.financials.subtotal} 
                    discount={item.financials.discount} 
                    received={item.financials.received} 
                    pending={item.financials.pending} 
                    label={item.financials.label} 
                  />,
                  String(item.performedBy || '-'),
                  <Badge key={3} variant={item.module.includes('Token') ? 'emerald' : item.module.includes('Payment') ? 'blue' : 'gray'}>{item.module}</Badge>,
                  <div key={4} className="text-slate-600 font-medium max-w-xs break-words">{item.transactionType || '-'}</div>,
                ])}
              />
            </Section>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No data.
        </div>
      )}

      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
}
