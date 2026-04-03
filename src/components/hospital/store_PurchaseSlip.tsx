import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'

type Supplier = { id: string; name: string; company?: string; phone?: string; address?: string }

type PurchaseSlipProps = {
  purchase: any
  supplier?: Supplier
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

export function printPurchaseSlipA4(purchase: any, supplier?: Supplier, settings?: any) {
  const headerName = settings?.name || 'Hospital'
  const headerPhone = settings?.phone || ''
  const headerAddress = settings?.address || ''
  const headerFooter = settings?.slipFooter || ''
  const logo = settings?.logoDataUrl || ''
  const items = (purchase?.items || []) as any[]
  const total = Number(purchase?.totalAmount || 0)

  const escapeHtml = (v: any) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const formatDateLong = (d: any) => {
    try {
      const x = d ? new Date(d) : new Date()
      return x.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch {
      return String(d || '')
    }
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Purchase Slip - ${escapeHtml(purchase?.invoiceNo || '')}</title>
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
            <div class="label">Purchase Slip</div>
            <div class="value">${escapeHtml(purchase?.invoiceNo || '')}</div>
          </div>
        </div>

        <div class="grid">
          <div class="box">
            <h3>Supplier Information</h3>
            <div class="name">${escapeHtml(purchase?.supplierName || supplier?.name || '')}</div>
            ${supplier?.company ? `<p class="muted">${escapeHtml(supplier.company)}</p>` : ''}
            ${supplier?.phone ? `<p class="muted">${escapeHtml(supplier.phone)}</p>` : ''}
            ${supplier?.address ? `<p class="muted">${escapeHtml(supplier.address)}</p>` : ''}
          </div>
          <div class="box">
            <h3>Purchase Details</h3>
            <p><span class="muted">Date:</span> <strong>${escapeHtml(formatDateLong(purchase?.date || purchase?.createdAt || ''))}</strong></p>
            <p><span class="muted">Payment Mode:</span> <strong>${escapeHtml((purchase?.paymentMode || '').toString().toUpperCase())}</strong></p>
            ${purchase?.storeLocation ? `<p><span class="muted">Store Location:</span> <strong>${escapeHtml(purchase.storeLocation)}</strong></p>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:36px">#</th>
              <th>Item Name</th>
              <th style="width:120px">Category</th>
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
                const cost = Number(it.purchaseCost || 0)
                const sub = qty * cost
                return `
                  <tr>
                    <td class="center">${i + 1}</td>
                    <td><strong>${escapeHtml(it.itemName || '')}</strong></td>
                    <td>${escapeHtml(it.category || '')}</td>
                    <td class="center">${escapeHtml(qty)}</td>
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
            <p class="muted">${escapeHtml(purchase?.notes || '')}</p>
          </div>
          <div class="totals">
            <div class="row"><span>Total Amount</span><strong>Rs ${escapeHtml(total.toFixed(2))}</strong></div>
          </div>
        </div>

        <div class="sign">
          <div class="sigBox">
            <div class="lbl">PREPARED BY</div>
            <div class="val">Signature</div>
          </div>
          <div class="sigBox">
            <div class="lbl">APPROVED BY</div>
            <div class="val">Signature</div>
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
export function useAutoPrintPurchase(purchase: any, supplier?: Supplier, settings?: any) {
  useEffect(() => {
    if (!purchase) return
    try {
      const key = `store.purchase.printed.${String(purchase._id || purchase.id || '')}`
      if (sessionStorage.getItem(key) === '1') return
      sessionStorage.setItem(key, '1')
      printPurchaseSlipA4(purchase, supplier, settings)
    } catch {
      printPurchaseSlipA4(purchase, supplier, settings)
    }
  }, [purchase, supplier, settings])
}

export default function Store_PurchaseSlip({ purchase, supplier, onPrinted }: PurchaseSlipProps) {
  const settings = useHospitalSettings()

  const handlePrint = () => {
    printPurchaseSlipA4(purchase, supplier, settings)
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
