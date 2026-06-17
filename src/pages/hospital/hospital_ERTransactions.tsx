import { useEffect, useMemo, useState } from 'react'
import { LogOut } from 'lucide-react'
import { hospitalApi } from '../../utils/api'
import { fmtDateTime12, fmtDate } from '../../utils/timeFormat'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { previewGatePassPdf } from '../../utils/hospital_documents'

function currency(n: number){ return `Rs ${Number(n||0).toFixed(2)}` }
function escapeHtml(x: any){ return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') }
function fmtTime12(iso: string){ try{ const d=new Date(iso); if(isNaN(d.getTime())) return '-'; const PAK=5*60*60*1000; const t=new Date(d.getTime()+PAK); let h=t.getUTCHours(); const m=String(t.getUTCMinutes()).padStart(2,'0'); const s=String(t.getUTCSeconds()).padStart(2,'0'); const am=h<12; const h12=(h%12)||12; const hh=String(h12).padStart(2,'0'); return `${hh}:${m}:${s} ${am?'AM':'PM'}` }catch{ return '-' } }

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
      await printReceiptHtml(rec, charges, payments, encounter)
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

  async function printReceiptHtml(rec: any, charges: any[], payments: any[], encounter: any){
    const s: any = await hospitalApi.getSettings().catch(()=>({}))
    const name = s?.name || 'Hospital'
    const address = s?.address || '-'
    const phone = s?.phone || ''
    const logo = s?.logoDataUrl || ''
    const nowIso = new Date().toISOString()

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

    const linesHtml = charges.length
      ? charges.map((c:any, idx:number) => {
          const qty = Number(c.qty || 1)
          const paid = Number(c.paidAmount || 0)
          const amt = Number(c.amount || 0)
          const remaining = Math.max(0, amt - paid)
          const status = remaining <= 0 ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'UNPAID')
          return `<tr>
            <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center">${idx + 1}</td>
            <td style="padding:6px 8px;border:1px solid #cbd5e1">${escapeHtml(c.description||'')}</td>
            <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center">${qty}</td>
            <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:right">${currency(amt)}</td>
            <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center">${status}</td>
          </tr>`
        }).join('')
      : `<tr><td colspan="5" style="padding:16px 8px;text-align:center;color:#94a3b8">No charges</td></tr>`

    const paysHtml = payments.length
      ? payments.map((p:any) => `<tr>
        <td style="padding:6px 8px;border:1px solid #cbd5e1">${fmtDateTime12(p.receivedAt||nowIso)}</td>
        <td style="padding:6px 8px;border:1px solid #cbd5e1">${escapeHtml(p.method||'-')}</td>
        <td style="padding:6px 8px;border:1px solid #cbd5e1">${escapeHtml(p.refNo||'')}</td>
        <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:right">${currency(Number(p.amount||0))}</td>
      </tr>`).join('')
      : `<tr><td colspan="4" style="padding:16px 8px;text-align:center;color:#94a3b8">No payments</td></tr>`

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>ER Final Invoice</title>
      <style>
        @page { size: A4 portrait; margin: 10mm }
        body{ font-family: ui-sans-serif, system-ui, Segoe UI, Roboto, Arial; color:#0f172a; font-size:13px; line-height:1.35 }
        .wrap{ width:100%; max-width: 190mm; margin: 0 auto }
        .hdr{ display:flex; align-items:center; gap:12px; margin-bottom:8px }
        .logo img{ height:56px; width:auto; object-fit:contain }
        .hinfo{ text-align:center; flex:1 }
        .htitle{ font-size:22px; font-weight:800; color:#2563eb; letter-spacing:0.5px }
        .muted{ color:#475569; font-size:12px }
        .hr{ border-bottom:1px solid #0ea5e9; margin:10px 0 }
        .section-title{ font-size:16px; font-weight:700; margin:14px 0 8px }
        .box{ border:1px solid #0f172a; border-radius:6px; padding:10px 14px; margin:10px 0 }
        .kv-grid{ display:grid; grid-template-columns: 1fr 1fr; gap:6px 24px; font-size:13px }
        .kv-item b{ margin-right:4px }
        table{ width:100%; border-collapse:collapse; font-size:13px }
        th{ background:#f1f5f9; text-align:left; padding:8px; border:1px solid #0f172a; font-weight:700 }
        td{ vertical-align:top }
        .right{ text-align:right }
        .summary-row{ display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e2e8f0; font-size:13px }
        .summary-row:last-child{ border-bottom:none }
        .summary-row .label{ font-weight:700 }
        .green{ color:#16a34a; font-weight:700 }
        .red{ color:#dc2626; font-weight:700 }
        .footer{ text-align:center; color:#64748b; margin-top:14px; font-size:11px }
      </style></head><body>
      <div class="wrap">
        <div class="hdr">
          <div class="logo">${logo? `<img src="${escapeHtml(logo)}" alt="logo"/>` : ''}</div>
          <div class="hinfo">
            <div class="htitle">${escapeHtml(name)}</div>
            <div class="muted">${escapeHtml(address)}</div>
            <div class="muted">Tel: ${escapeHtml(phone)}</div>
          </div>
        </div>
        <div class="hr"></div>

        <div class="section-title">ER Final Invoice</div>

        <div class="box">
          <div class="kv-grid">
            <div class="kv-item"><b>MR #</b> ${escapeHtml(mrn)}</div>
            <div class="kv-item"><b>Pt. Name</b> ${escapeHtml(patientName)}</div>
            <div class="kv-item"><b>Father Name</b> ${escapeHtml(fatherName)}</div>
            <div class="kv-item"><b>Age / Gender</b> ${escapeHtml(age)} / ${escapeHtml(gender)}</div>
            <div class="kv-item"><b>Phone</b> ${escapeHtml(patientPhone)}</div>
            <div class="kv-item"><b>Address</b> ${escapeHtml(patientAddress)}</div>
            <div class="kv-item"><b>Date Of Admission</b> ${fmtDate(startAt)}</div>
            <div class="kv-item"><b>Time Of Admission</b> ${fmtTime12(startAt)}</div>
            ${isDischarged ? `<div class="kv-item"><b>Date Of Discharge</b> ${fmtDate(endAt)}</div><div class="kv-item"><b>Time Of Discharge</b> ${fmtTime12(endAt)}</div>` : ''}
          </div>
        </div>

        <div class="box" style="padding:0; overflow:hidden">
          <div style="padding:10px 14px; font-weight:700; border-bottom:1px solid #0f172a">Charges</div>
          <table>
            <thead>
              <tr>
                <th style="width:40px;text-align:center">#</th>
                <th>Description</th>
                <th style="width:60px;text-align:center">Qty</th>
                <th class="right" style="width:100px">Amount</th>
                <th style="width:80px;text-align:center">Status</th>
              </tr>
            </thead>
            <tbody>${linesHtml}</tbody>
            ${charges.length ? `<tfoot><tr><td colspan="3" style="padding:8px;border:1px solid #0f172a;text-align:right;font-weight:700">Total</td><td style="padding:8px;border:1px solid #0f172a;text-align:right;font-weight:700">${currency(total)}</td><td style="padding:8px;border:1px solid #0f172a"></td></tr></tfoot>` : ''}
          </table>
        </div>

        <div class="box" style="padding:0; overflow:hidden">
          <div style="padding:10px 14px; font-weight:700; border-bottom:1px solid #0f172a">Payments</div>
          <table>
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>Method</th>
                <th>Ref</th>
                <th class="right" style="width:100px">Amount</th>
              </tr>
            </thead>
            <tbody>${paysHtml}</tbody>
            ${payments.length ? `<tfoot><tr><td colspan="3" style="padding:8px;border:1px solid #0f172a;text-align:right;font-weight:700">Total Paid</td><td style="padding:8px;border:1px solid #0f172a;text-align:right;font-weight:700">${currency(grossPaid)}</td></tr></tfoot>` : ''}
          </table>
        </div>

        <div class="box">
          <div class="summary-row"><span class="label">Total Bill</span><span>${currency(total)}</span></div>
          <div class="summary-row"><span class="label">Total Paid</span><span class="green">${currency(grossPaid)}</span></div>
          <div class="summary-row"><span class="label">Balance</span><span class="green">${currency(Math.abs(total - grossPaid))}</span></div>
        </div>

        <div class="footer">System Generated Receipt</div>
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
