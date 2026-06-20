import { useEffect, useMemo, useState } from 'react'
import { LogOut } from 'lucide-react'
import { hospitalApi } from '../../utils/api'
import { fmtDateTime12, fmtDate } from '../../utils/timeFormat'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { previewGatePassPdf } from '../../utils/hospital_documents'

function currency(n: number){ return `Rs ${Number(n||0).toFixed(2)}` }
function escapeHtml(x: any){ return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') }
// Print history tracking (shared across hospital/reception)
const PRINT_HISTORY_KEY = 'hospital.er.printHistory'
interface PrintHistory { firstPrintAt: string; printCount: number }
function recordPrint(encounterId: string): PrintHistory {
  try {
    const raw = localStorage.getItem(PRINT_HISTORY_KEY) || '{}'
    const all = JSON.parse(raw)
    const existing = all[encounterId]
    const now = new Date().toISOString()
    const updated: PrintHistory = existing
      ? { firstPrintAt: existing.firstPrintAt, printCount: existing.printCount + 1 }
      : { firstPrintAt: now, printCount: 1 }
    all[encounterId] = updated
    localStorage.setItem(PRINT_HISTORY_KEY, JSON.stringify(all))
    return updated
  } catch {
    const now = new Date().toISOString()
    return { firstPrintAt: now, printCount: 1 }
  }
}

type BedLocation = {
  floor: string
  type: 'room' | 'ward'
  location: string
  bed: string
}

function formatBedLocation(bedLoc?: BedLocation) {
  if (!bedLoc) return '-'
  return `${bedLoc.floor} / ${bedLoc.location} / Bed: ${bedLoc.bed}`
}

export default function Reception_ERTransactions(){
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [toast, setToast] = useState<ToastState>(null)

  useEffect(()=>{ loadRecent() }, [])

  async function loadRecent(){
    setLoading(true)
    try{
      // Use new API to get recent ER payments directly
      const fromD = new Date(Date.now() - 7*24*60*60*1000); const from = `${fromD.getFullYear()}-${String(fromD.getMonth() + 1).padStart(2, '0')}-${String(fromD.getDate()).padStart(2, '0')}`
      const toD = new Date(); const to = `${toD.getFullYear()}-${String(toD.getMonth() + 1).padStart(2, '0')}-${String(toD.getDate()).padStart(2, '0')}`
      
      console.log('Fetching ER payments from', from, 'to', to)
      const res: any = await hospitalApi.erRecentPayments({ from, to })
      console.log('ER payments response:', res)
      const payments = res?.payments || []
      
      const rows = payments.map((p: any) => ({
        id: String(p._id || Math.random()),
        encounterId: String(p.encounterId),
        tokenNo: p.tokenNo || '-',
        patientName: p.patientName || '-',
        mrn: p.mrn || '-',
        amount: Number(p.amount || 0),
        method: p.method || '-',
        refNo: p.refNo || '',
        receivedAt: p.receivedAt || new Date().toISOString(),
        performedBy: p.performedBy || '-',
        bedLocation: p.bedLocation || p.bedId || p.bed || undefined,
      }))
      
      console.log('Processed rows:', rows.length)
      setRows(rows)
      setPage(1)
    }catch(err) { 
      console.error('Failed to load ER payments:', err)
      setRows([]) 
    }
    setLoading(false)
  }

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter(r =>
      r.patientName.toLowerCase().includes(s) ||
      String(r.mrn||'').toLowerCase().includes(s) ||
      String(r.tokenNo||'').toLowerCase().includes(s) ||
      String(r.method||'').toLowerCase().includes(s) ||
      String(r.refNo||'').toLowerCase().includes(s) ||
      String(r.performedBy||'').toLowerCase().includes(s) ||
      formatBedLocation(r.bedLocation).toLowerCase().includes(s)
    )
  }, [q, rows])

  async function printReceipt(rec: any){
    try{
      const [chRes, payRes, encRes] = await Promise.all([
        hospitalApi.listErCharges(rec.encounterId, { limit: 500 }) as any,
        hospitalApi.erListPayments(rec.encounterId, { limit: 500 }) as any,
        hospitalApi.getEREncounterById(rec.encounterId).catch(() => null) as any,
      ])
      const charges = (chRes.charges||[])
      const payments = (payRes.payments||[])
      const encounter = encRes?.encounter || null
      const printHistory = recordPrint(rec.encounterId)
      await printReceiptHtml(rec, charges, payments, encounter, printHistory)
    }catch(e: any){
      const msg = e?.message || 'Server error'
      if (msg.includes('404') || msg.includes('not found') || msg.toLowerCase().includes('not found')) {
        setToast({ type: 'error', message: 'Encounter not found. It may have been deleted from the hospital records.' })
      } else {
        setToast({ type: 'error', message: 'Server error while loading receipt data' })
      }
    }
  }

  async function printGatePass(rec: any) {
    try {
      const [encRes, settings] = await Promise.all([
        hospitalApi.getEREncounterById(rec.encounterId) as any,
        hospitalApi.getSettings() as any,
      ])
      const enc = encRes?.encounter
      const patient = enc?.patientId || {}
      
      let bedStr = ''
      if (enc?.bedLocation) {
        const bl = enc.bedLocation
        bedStr = `${bl.floor} / ${bl.location} / Bed: ${bl.bed}`
      } else if (rec.bedLocation) {
        bedStr = formatBedLocation(rec.bedLocation)
      } else {
        bedStr = String(enc?.bed || '-')
      }

      await previewGatePassPdf({
        settings: {
          name: settings?.name,
          address: settings?.address,
          phone: settings?.phone,
          logoDataUrl: settings?.logoDataUrl,
        },
        patient: {
          name: patient.fullName || patient.name || rec.patientName,
          mrn: patient.mrn || rec.mrn,
          age: patient.age || '-',
          gender: patient.gender || '-',
          department: 'Emergency',
          bed: bedStr,
          admitDate: enc?.startAt || enc?.createdAt || rec.receivedAt,
          dischargeDate: enc?.endAt || enc?.dischargedAt,
          dischargeTime: enc?.endAt || enc?.dischargedAt ? new Date(enc.endAt || enc.dischargedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''
        }
      })
    } catch (e) {
      setToast({ type: 'error', message: 'Failed to generate gate pass' })
    }
  }

  async function printReceiptHtml(rec: any, charges: any[], payments: any[], encounter: any, printHistory?: PrintHistory){
    const s: any = await hospitalApi.getSettings().catch(()=>({}))
    const name = s?.name || 'Hospital'
    const address = s?.address || '-'
    const phone = s?.phone || ''
    const logo = s?.logoDataUrl || ''
    const nowIso = new Date().toISOString()
    const isReprint = (printHistory?.printCount || 1) > 1
    const firstPrintAt = printHistory?.firstPrintAt || nowIso

    const total = charges.reduce((sum:number,c:any)=> sum + Number(c.amount||0), 0)

    // Total paid = (advance + cash payments) - advance returns - refunds
    const grossPaid = payments.reduce((s:number,p:any)=>{
      const amt = Number(p.amount||0)
      const isReturn = String(p.type||'').toLowerCase()==='refund' || String(p.method||'').toLowerCase()==='advance return'
      return s + (isReturn ? -amt : amt)
    }, 0)

    const patient = encounter?.patientId || encounter?.patient || {};
    const startAt = encounter?.startAt || encounter?.createdAt || rec?.receivedAt || nowIso;
    const endAt = encounter?.endAt || encounter?.dischargedAt || '';
    const isDischarged = !!endAt;
    const mrn = String(patient?.mrn || rec?.mrn || encounter?.mrn || '-');
    const patientName = String(patient?.fullName || patient?.name || rec?.patientName || '-');
    const patientPhone = String(patient?.phone || patient?.phoneNo || patient?.phoneNormalized || patient?.mobile || rec?.phone || rec?.phoneNormalized || '-');
    const patientAddress = String(patient?.address || patient?.city || '-');
    const fatherName = String(patient?.fatherName || patient?.guardianName || '-');
    const age = String(patient?.age || '-');
    const gender = String(patient?.gender || '-');

    const isFullyPaid = grossPaid >= total
    const linesHtml = charges.length
      ? charges.map((c:any, idx:number) => {
          const qty = Number(c.qty || 1)
          const itemPaid = Number(c.paidAmount || 0)
          const amt = Number(c.amount || 0)
          const remaining = Math.max(0, amt - itemPaid)
          const statusCls = isFullyPaid ? 'badge-paid' : (remaining <= 0 ? 'badge-paid' : (itemPaid > 0 ? 'badge-partial' : 'badge-unpaid'))
          const statusText = isFullyPaid ? 'PAID' : (remaining <= 0 ? 'PAID' : (itemPaid > 0 ? 'PARTIAL' : 'UNPAID'))
          return `<tr>
            <td class="center">${idx + 1}</td>
            <td>${escapeHtml(c.description||'')}</td>
            <td class="center">${qty}</td>
            <td class="right">${currency(amt)}</td>
            <td class="center"><span class="badge ${statusCls}">${statusText}</span></td>
          </tr>`
        }).join('')
      : `<tr><td colspan="5" style="padding:16px 8px;text-align:center;color:#94a3b8">No charges</td></tr>`

    const paysHtml = payments.length
      ? payments.map((p:any) => `<tr>
        <td>${fmtDateTime12(p.receivedAt||nowIso)}</td>
        <td>${escapeHtml(p.method||'-')}</td>
        <td>${escapeHtml(p.refNo||'')}</td>
        <td class="right">${currency(Number(p.amount||0))}</td>
      </tr>`).join('')
      : `<tr><td colspan="4" style="padding:16px 8px;text-align:center;color:#94a3b8">No payments</td></tr>`

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>ER Final Invoice</title>
      <style>
        @page { size: A4 portrait; margin: 12mm }
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        body{ font-family: 'Poppins', ui-sans-serif, system-ui, Roboto, Arial, sans-serif; color:#1e293b; font-size:12px; line-height:1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .wrap{ width:100%; max-width: 186mm; margin: 0 auto }

        /* Header */
        .header{ text-align:center; padding: 10px 16px; background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color:#fff; border-radius: 6px 6px 0 0 }
        .header .logo img{ height:40px; width:auto; object-fit:contain; filter: brightness(0) invert(1); }
        .header .hname{ font-size:20px; font-weight:800; letter-spacing:0.3px; margin: 4px 0 1px }
        .header .htag{ font-size:10px; opacity:0.85; text-transform:uppercase; letter-spacing:1.5px }
        .header .hcontact{ font-size:10px; opacity:0.9; margin-top:2px }
        .inv-bar{ background:#f8fafc; padding:6px 16px; border-left:3px solid #2563eb; border-right:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center }
        .inv-bar .inv-title{ font-size:15px; font-weight:700; color:#1e3a5f }
        .inv-bar .inv-meta{ font-size:10px; color:#64748b }
        .patient-card{ padding:8px 16px; border:1px solid #e2e8f0; border-top:none; background:#fff }
        .patient-card .grid{ display:grid; grid-template-columns: repeat(2, 1fr); gap: 4px 24px }
        .patient-card .item{ display:flex; font-size:11px }
        .patient-card .item .lbl{ color:#64748b; min-width:100px; font-weight:500 }
        .patient-card .item .val{ color:#1e293b; font-weight:600 }
        .sec-header{ background:#f1f5f9; padding:5px 16px; font-size:11px; font-weight:700; color:#1e3a5f; text-transform:uppercase; letter-spacing:0.5px; border-left:3px solid #2563eb; border-right:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0 }
        table{ width:100%; border-collapse:collapse; font-size:11px }
        thead th{ background:#f8fafc; padding:5px 8px; text-align:left; font-weight:700; color:#475569; border-bottom:1px solid #cbd5e1; border-right:1px solid #e2e8f0 }
        thead th:last-child{ border-right:none }
        tbody td{ padding:4px 8px; border-bottom:1px solid #e2e8f0; border-right:1px solid #f1f5f9; vertical-align:top; color:#334155 }
        tbody td:last-child{ border-right:none }
        tbody tr:nth-child(even){ background:#fafbfc }
        tfoot td{ padding:6px 8px; background:#f8fafc; border-top:1px solid #cbd5e1; font-weight:700; color:#1e293b }
        .right{ text-align:right }
        .center{ text-align:center }
        .badge{ display:inline-block; padding:1px 6px; border-radius:10px; font-size:9px; font-weight:700; text-transform:uppercase }
        .badge-paid{ background:#dcfce7; color:#166534 }
        .badge-partial{ background:#fef3c7; color:#92400e }
        .badge-unpaid{ background:#fee2e2; color:#991b1b }
        .summary-box{ margin-top:10px; border:1px solid #e2e8f0; border-radius:4px; overflow:hidden }
        .summary-box .row{ display:flex; justify-content:space-between; padding:6px 16px; border-bottom:1px solid #e2e8f0; font-size:12px }
        .summary-box .row:last-child{ border-bottom:none }
        .summary-box .row .lbl{ color:#475569; font-weight:600 }
        .summary-box .row .amt{ font-weight:700 }
        .summary-box .total-row{ background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color:#fff }
        .summary-box .total-row .lbl, .summary-box .total-row .amt{ color:#fff }
        .signatures{ display:flex; justify-content:space-between; margin-top:16px; padding: 0 16px }
        .sign-box{ text-align:center; width:140px }
        .sign-line{ border-top:1px solid #94a3b8; padding-top:4px; font-size:10px; color:#64748b }
        .footer-note{ text-align:center; margin-top:12px; padding:8px; color:#94a3b8; font-size:9px; border-top:1px solid #e2e8f0 }
      </style></head><body>
      <div class="wrap">
        <div class="header">
          <div class="logo">${logo? `<img src="${escapeHtml(logo)}" alt="logo"/>` : ''}</div>
          <div class="hname">${escapeHtml(name)}</div>
          <div class="htag">Emergency Department</div>
          <div class="hcontact">${escapeHtml(address)} &nbsp;|&nbsp; Tel: ${escapeHtml(phone)}</div>
        </div>

        <div class="inv-bar">
          <div class="inv-title">ER Final Invoice</div>
          <div class="inv-meta">Invoice Date: ${fmtDate(nowIso)} &nbsp;|&nbsp; Token: ${escapeHtml(rec.tokenNo||encounter?.tokenId?.tokenNo||encounter?.tokenNo||'-')}</div>
        </div>
        <div class="print-meta" style="padding:4px 16px;background:#f8fafc;border-left:3px solid #2563eb;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;font-size:10px;color:#475569;display:flex;gap:16px;flex-wrap:wrap">
          ${isReprint
            ? `<span><strong>First Printed:</strong> ${fmtDateTime12(firstPrintAt)}</span><span style="color:#dc2626"><strong>Duplicate Print:</strong> ${fmtDateTime12(nowIso)}</span>`
            : `<span><strong>Printed:</strong> ${fmtDateTime12(nowIso)}</span>`
          }
        </div>

        <div class="patient-card">
          <div class="grid">
            <div class="item"><span class="lbl">Patient Name</span><span class="val">${escapeHtml(patientName)}</span></div>
            <div class="item"><span class="lbl">MR #</span><span class="val">${escapeHtml(mrn)}</span></div>
            <div class="item"><span class="lbl">Father / Guardian</span><span class="val">${escapeHtml(fatherName)}</span></div>
            <div class="item"><span class="lbl">Age / Gender</span><span class="val">${escapeHtml(age)} / ${escapeHtml(gender)}</span></div>
            <div class="item"><span class="lbl">Phone</span><span class="val">${escapeHtml(patientPhone)}</span></div>
            <div class="item"><span class="lbl">Address</span><span class="val">${escapeHtml(patientAddress)}</span></div>
            <div class="item"><span class="lbl">Admission Date</span><span class="val">${fmtDate(startAt)} at ${fmtDateTime12(startAt)}</span></div>
            ${isDischarged ? `<div class="item"><span class="lbl">Discharge Date</span><span class="val">${fmtDate(endAt)} at ${fmtDateTime12(endAt)}</span></div>` : '<div class="item"><span class="lbl">Status</span><span class="val" style="color:#2563eb">Active</span></div>'}
          </div>
        </div>

        <div class="sec-header">Services & Charges</div>
        <table>
          <thead>
            <tr>
              <th class="center" style="width:40px">#</th>
              <th>Description</th>
              <th class="center" style="width:50px">Qty</th>
              <th class="right" style="width:100px">Amount</th>
              <th class="center" style="width:80px">Status</th>
            </tr>
          </thead>
          <tbody>${linesHtml}</tbody>
          ${charges.length ? `<tfoot><tr><td colspan="3" class="right">Total Charges</td><td class="right">${currency(total)}</td><td></td></tr></tfoot>` : ''}
        </table>

        <div class="sec-header" style="margin-top:16px">Payment History</div>
        <table>
          <thead>
            <tr>
              <th style="width:130px">Date / Time</th>
              <th>Method</th>
              <th style="width:100px">Ref #</th>
              <th class="right" style="width:100px">Amount</th>
            </tr>
          </thead>
          <tbody>${paysHtml}</tbody>
          ${payments.length ? `<tfoot><tr><td colspan="3" class="right">Total Paid</td><td class="right" style="color:#16a34a">${currency(grossPaid)}</td></tr></tfoot>` : ''}
        </table>

        <div class="summary-box">
          <div class="row"><span class="lbl">Total Bill</span><span class="amt">${currency(total)}</span></div>
          <div class="row"><span class="lbl">Total Paid</span><span class="amt" style="color:#16a34a">${currency(grossPaid)}</span></div>
          <div class="row total-row"><span class="lbl">Balance / Net Due</span><span class="amt">${currency(Math.max(0, total - grossPaid))}</span></div>
        </div>

        <div class="signatures">
          <div class="sign-box">
            <div class="sign-line">Patient / Attendant Signature</div>
          </div>
          <div class="sign-box">
            <div class="sign-line">Cashier / Reception Signature</div>
          </div>
        </div>

        <div class="footer-note">System Generated Receipt &bull; ${escapeHtml(name)}</div>
      </div>
    </body></html>`
    try{
      const api = (window as any).electronAPI
      if (api && typeof api.printPreviewHtml === 'function'){ await api.printPreviewHtml(html, {}); return }
    }catch{}
    try{
      const w = window.open('', '_blank'); if (!w) return
      w.document.write(html + '<script>window.onload=()=>{window.print();}</script>');
      w.document.close();
    }catch{}
  }

  // Pagination - server-side style with client data
  const startIdx = (page - 1) * rowsPerPage
  const endIdx = startIdx + rowsPerPage
  const paginatedRows = filtered.slice(startIdx, endIdx)
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const total = useMemo(()=> paginatedRows.reduce((s,r)=> s + Number(r.amount||0), 0), [paginatedRows])
  const displayStart = Math.min(startIdx + 1, filtered.length)
  const displayEnd = Math.min(endIdx, filtered.length)

  return (
    <>
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-lg font-semibold">Recent ER Payments</div>
          <div className="text-sm text-slate-600">{loading? 'Loading...' : `${filtered.length} payments`} · Total {currency(total)}</div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name / MRN / Token / Method / Ref / Performed By" className="min-w-[280px] flex-1 rounded-md border border-slate-300 px-3 py-2" />
          <button onClick={loadRecent} className="btn" disabled={loading}>{loading? 'Refreshing...' : 'Refresh'}</button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {filtered.length===0 ? (
          <div className="text-sm text-slate-500">No recent ER payments</div>
        ) : (
          <div className="overflow-x-auto text-sm">
            <table className="min-w-full">
              <thead className="bg-slate-100/50 text-slate-700 border-b-2 border-slate-300">
                <tr>
                  <th className="px-2 py-3 text-left font-extrabold uppercase tracking-wider text-[13px]">Date/Time</th>
                  <th className="px-2 py-3 text-left font-extrabold uppercase tracking-wider text-[13px]">Token</th>
                  <th className="px-2 py-3 text-left font-extrabold uppercase tracking-wider text-[13px]">Patient</th>
                  <th className="px-2 py-3 text-left font-extrabold uppercase tracking-wider text-[13px]">MRN</th>
                  <th className="px-2 py-3 text-left font-extrabold uppercase tracking-wider text-[13px]">Bed</th>
                  <th className="px-2 py-3 text-left font-extrabold uppercase tracking-wider text-[13px]">Method</th>
                  <th className="px-2 py-3 text-left font-extrabold uppercase tracking-wider text-[13px]">Ref</th>
                  <th className="px-2 py-3 text-left font-extrabold uppercase tracking-wider text-[13px]">Performed By</th>
                  <th className="px-2 py-3 text-right font-extrabold uppercase tracking-wider text-[13px]">Amount</th>
                  <th className="px-2 py-3 text-left font-extrabold uppercase tracking-wider text-[13px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedRows.map(r => (
                  <tr key={r.id}>
                    <td className="px-2 py-1">{fmtDateTime12(r.receivedAt)}</td>
                    <td className="px-2 py-1">{r.tokenNo}</td>
                    <td className="px-2 py-1">{r.patientName}</td>
                    <td className="px-2 py-1">{r.mrn}</td>
                    <td className="px-2 py-1">{formatBedLocation(r.bedLocation)}</td>
                    <td className="px-2 py-1">{r.method}</td>
                    <td className="px-2 py-1">{r.refNo}</td>
                    <td className="px-2 py-1">{r.createdByUsername || r.createdBy || r.performedBy || '-'}</td>
                    <td className="px-2 py-1 text-right">{currency(r.amount)}</td>
                    <td className="px-2 py-1">
                      <div className="flex items-center gap-2">
                        <button className="btn-outline-navy" onClick={()=>printReceipt(r)}>Print Receipt</button>
                        <button className="btn-outline-navy flex items-center gap-1" onClick={()=>printGatePass(r)}><LogOut className="h-3 w-3" />Gate Pass</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination Controls */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600 mt-4">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <select 
                value={rowsPerPage} 
                onChange={e=>{setRowsPerPage(parseInt(e.target.value)); setPage(1)}} 
                className="rounded-md border border-slate-300 px-2 py-1"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div>Page {page} of {totalPages} ({displayStart}-{displayEnd} of {filtered.length})</div>
            <div className="flex items-center gap-2">
              <button 
                onClick={()=>setPage(p=>Math.max(1, p-1))} 
                disabled={page <= 1}
                className="rounded-md border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:opacity-50"
              >
                Prev
              </button>
              <button 
                onClick={()=>setPage(p=>Math.min(totalPages, p+1))} 
                disabled={page >= totalPages}
                className="rounded-md border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  )
}
