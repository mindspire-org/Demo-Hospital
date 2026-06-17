import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { fmtDate } from '../../utils/timeFormat'

type Department = { id: string; name: string }

type IssueSlipProps = {
  issue: any
  department?: Department
  onPrinted?: () => void
}

export function useHospitalSettings() {
  const [settings, setSettings] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const s = await hospitalApi.getSettings() as any
        if (!cancelled) setSettings(s || null)
      } catch {}
    }
    load()
    return () => { cancelled = true }
  }, [])

  return settings
}

export function printIssueSlipA4(issue: any, department?: Department, settings?: any) {
  const headerName = settings?.name || 'Hospital'
  const headerPhone = settings?.phone || ''
  const headerAddress = settings?.address || ''
  const headerFooter = settings?.slipFooter || ''
  const logo = settings?.logoDataUrl || ''
  const items = (issue?.items || []) as any[]
  const total = Number(issue?.totalAmount || 0)

  const escapeHtml = (v: any) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const formatDateLong = (d: any) => {
    try {
      return fmtDate(d)
    } catch {
      return String(d || '')
    }
  }

  const issueNo = issue?.issueNo || String(issue?._id || issue?.id || '').slice(-8).toUpperCase()
  const itemCount = items.length
  const itemLabel = itemCount === 1 ? 'item' : 'items'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Issue Slip - ${escapeHtml(issueNo)}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #111827; margin: 0; padding: 0; }
        .page { width: 210mm; min-height: 297mm; padding: 14mm; box-sizing: border-box; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
        .brand { display: flex; gap: 12px; align-items: center; }
        .brand img { height: 56px; width: 56px; object-fit: contain; }
        .brand h1 { margin: 0; font-size: 20px; letter-spacing: 0.2px; }
        .brand .muted { color: #475569; font-size: 12px; margin-top: 2px; }
        .docTitle { text-align: right; }
        .docTitle .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; }
        .docTitle .value { font-size: 18px; font-weight: 700; margin-top: 6px; }

        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 18px; }
        .box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #f8fafc; }
        .box h3 { margin: 0 0 10px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
        .box .name { font-size: 15px; font-weight: 700; margin-bottom: 6px; }
        .box p { margin: 3px 0; font-size: 13px; color: #0f172a; }
        .box p.muted { color: #475569; }

        table { width: 100%; border-collapse: collapse; margin-top: 18px; }
        thead th { background: #f1f5f9; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; }
        tbody td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
        td.center, th.center { text-align: center; }

        .footerRow { display: grid; grid-template-columns: 1fr 320px; gap: 18px; margin-top: 16px; }
        .totals { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
        .totals .row { display: flex; justify-content: space-between; align-items: center; margin: 6px 0; font-size: 14px; }
        .totals .row strong { font-weight: 700; }

        .sign { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-top: 22px; }
        .sigBox { padding-top: 18px; border-top: 1px solid #cbd5e1; text-align: center; }
        .sigBox .lbl { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
        .sigBox .val { margin-top: 8px; font-size: 13px; font-weight: 700; }

        @media print {
          @page { size: A4; margin: 0; }
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; color: #000 !important; }
          .page, .page * { color: #000 !important; background: transparent !important; background-color: transparent !important; border-color: #000 !important; }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div class="brand">
            ${logo ? `<img src="${escapeHtml(logo)}" alt="Logo" />` : ''}
            <div>
              <h1>${escapeHtml(headerName)}</h1>
              ${headerAddress ? `<div class="muted">${escapeHtml(headerAddress)}</div>` : ''}
              ${headerPhone ? `<div class="muted">Phone: ${escapeHtml(headerPhone)}</div>` : ''}
            </div>
          </div>
          <div class="docTitle">
            <div class="label">Store Issue Slip</div>
            <div class="value">#${escapeHtml(issueNo)}</div>
          </div>
        </div>

        <div class="grid">
          <div class="box">
            <h3>Issued To (Department)</h3>
            <div class="name">${escapeHtml(issue?.departmentName || department?.name || '')}</div>
            ${issue?.issuedTo ? `<p class="muted">Recipient: <strong>${escapeHtml(issue.issuedTo)}</strong></p>` : ''}
          </div>
          <div class="box">
            <h3>Issue Details</h3>
            <p><span class="muted">Date:</span> <strong>${escapeHtml(formatDateLong(issue?.date || issue?.createdAt || ''))}</strong></p>
            <p><span class="muted">Items:</span> <strong>${itemCount} ${itemLabel}</strong></p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:36px">#</th>
              <th>Item Name</th>
              <th class="center" style="width:70px">Qty</th>
              <th class="center" style="width:70px">Unit</th>
              <th class="num" style="width:90px">Cost</th>
              <th class="num" style="width:110px">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map((it, i) => {
                const qty = Number(it.quantity || 0)
                const cost = Number(it.costPerUnit || 0)
                const sub = qty * cost
                return `
                  <tr>
                    <td class="center">${i + 1}</td>
                    <td><strong>${escapeHtml(it.itemName || '')}</strong></td>
                    <td class="center">${qty}</td>
                    <td class="center">${escapeHtml(it.unit || '')}</td>
                    <td class="num">${escapeHtml(cost.toFixed(2))}</td>
                    <td class="num">${escapeHtml(sub.toFixed(2))}</td>
                  </tr>
                `
              })
              .join('')}
          </tbody>
        </table>

        <div class="footerRow">
          <div class="box">
            <h3>Notes</h3>
            <p class="muted">${escapeHtml(issue?.notes || '')}</p>
          </div>
          <div class="totals">
            <div class="row"><span>Total Value</span><strong>Rs ${escapeHtml(total.toFixed(2))}</strong></div>
          </div>
        </div>

        <div class="sign">
          <div class="sigBox">
            <div class="lbl">ISSUED BY</div>
            <div class="val">Signature</div>
          </div>
          <div class="sigBox">
            <div class="lbl">RECEIVED BY</div>
            <div class="val">${escapeHtml(issue?.issuedTo || 'Signature')}</div>
          </div>
          <div class="sigBox">
            <div class="lbl">DATE</div>
            <div class="val">${escapeHtml(formatDateLong(new Date()))}</div>
          </div>
        </div>

        ${headerFooter ? `<div style="margin-top:18px;text-align:center;color:#475569;font-size:12px">${escapeHtml(headerFooter)}</div>` : ''}
      </div>
    </body>
    </html>
  `

  try {
    const api = (window as any).electronAPI
    if (api && typeof api.printPreviewHtml === 'function') {
      api.printPreviewHtml(html)
      return
    }
  } catch {}

  const frame = document.createElement('iframe')
  frame.style.position = 'fixed'
  frame.style.right = '0'
  frame.style.bottom = '0'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'
  document.body.appendChild(frame)
  const doc = frame.contentWindow?.document || frame.contentDocument
  if (!doc) return
  doc.open()
  doc.write(html)
  doc.close()
  frame.onload = () => {
    try {
      frame.contentWindow?.focus()
      frame.contentWindow?.print()
    } catch {}
    setTimeout(() => {
      try { document.body.removeChild(frame) } catch {}
    }, 500)
  }
}

// Hook for auto-printing with session guard
export function useAutoPrintIssue(issue: any, department?: Department, settings?: any) {
  useEffect(() => {
    if (!issue) return
    try {
      const key = `store.issue.printed.${String(issue._id || issue.id || '')}`
      if (sessionStorage.getItem(key) === '1') return
      sessionStorage.setItem(key, '1')
      printIssueSlipA4(issue, department, settings)
    } catch {
      printIssueSlipA4(issue, department, settings)
    }
  }, [issue, department, settings])
}

export default function Store_IssueSlip({ issue, department, onPrinted }: IssueSlipProps) {
  const settings = useHospitalSettings()

  const handlePrint = () => {
    printIssueSlipA4(issue, department, settings)
    onPrinted?.()
  }

  return (
    <button
      onClick={handlePrint}
      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      Print (A4)
    </button>
  )
}
