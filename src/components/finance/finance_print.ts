/**
 * financePrint — branded print helper for every Finance ERP page.
 *
 * Usage:
 *   printFinanceReport({
 *     title: 'Trial Balance',
 *     subtitle: 'Period 2026-04-01 → 2026-04-20',
 *     columns: [{ header: 'Account', key: 'name' }, ...],
 *     rows: tbData.rows,
 *     totals: [{ label: 'Debits', value: '…' }, ...],
 *   })
 *
 * Fetches hospital settings (name, address, phone, logo) once per session and
 * renders them into a styled, eye-catching print header.
 */

import { hospitalApi } from '../../utils/api'

type Column<T> = { header: string; key?: keyof T | string; render?: (row: T) => string | number; align?: 'left' | 'right' | 'center' }
type Totals   = Array<{ label: string; value: string | number }>

export type FinancePrintOpts<T = any> = {
  title: string
  subtitle?: string
  columns: Array<Column<T>>
  rows: T[]
  totals?: Totals
  meta?: Array<{ label: string; value: string | number }>
  footer?: string
}

let cachedSettings: any | null = null
async function getBranding(){
  if (cachedSettings) return cachedSettings
  try {
    const s: any = await hospitalApi.getSettings()
    cachedSettings = s || {}
  } catch {
    cachedSettings = {}
  }
  return cachedSettings
}

function esc(v: any){
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function printFinanceReport<T = any>(opts: FinancePrintOpts<T>){
  const b = await getBranding()
  const name    = b?.name    || 'Hospital'
  const address = b?.address || ''
  const phone   = b?.phone   || ''
  const code    = b?.code    || ''
  const logo    = b?.logoDataUrl || ''
  const footer  = opts.footer || b?.slipFooter || ''

  const when = new Date().toLocaleString()
  const columns = opts.columns
  const rowsHtml = opts.rows.map(r => `<tr>${
    columns.map(c => {
      const v = c.render ? c.render(r) : (r as any)[c.key as any]
      const align = c.align === 'right' ? 'right' : c.align === 'center' ? 'center' : 'left'
      return `<td style="text-align:${align}">${esc(v)}</td>`
    }).join('')
  }</tr>`).join('')

  const headHtml = columns.map(c => {
    const align = c.align === 'right' ? 'right' : c.align === 'center' ? 'center' : 'left'
    return `<th style="text-align:${align}">${esc(c.header)}</th>`
  }).join('')

  const totalsHtml = (opts.totals && opts.totals.length)
    ? `<div class="totals">${opts.totals.map(t => `<div class="totals-row"><span>${esc(t.label)}</span><strong>${esc(t.value)}</strong></div>`).join('')}</div>`
    : ''

  const metaHtml = (opts.meta && opts.meta.length)
    ? `<div class="meta">${opts.meta.map(m => `<span><em>${esc(m.label)}:</em> ${esc(m.value)}</span>`).join('')}</div>`
    : ''

  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(opts.title)} — ${esc(name)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Poppins', 'Inter', Arial, sans-serif; color: #0f172a; margin: 0; }
  .brand {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 16px; border-radius: 12px;
    background: linear-gradient(135deg, #0f2d5c 0%, #1e40af 100%);
    color: #fff;
  }
  .brand img { width: 60px; height: 60px; object-fit: contain; background: #fff; border-radius: 10px; padding: 6px; }
  .brand .name { font-size: 22px; font-weight: 700; letter-spacing: 0.2px; }
  .brand .sub  { font-size: 12px; opacity: 0.85; }
  .brand .right { margin-left: auto; text-align: right; font-size: 11px; opacity: 0.9; }
  .brand .code { display:inline-block; margin-top:4px; background: rgba(255,255,255,0.15); padding: 2px 8px; border-radius: 999px; font-size: 10px; letter-spacing: 0.5px; }

  .title-row { display:flex; align-items:baseline; justify-content: space-between; margin: 16px 0 6px; }
  .title-row h1 { font-size: 18px; font-weight: 700; margin: 0; color: #0f172a; }
  .title-row .when { font-size: 11px; color: #64748b; }
  .subtitle { color: #475569; font-size: 12px; margin-bottom: 10px; }

  .meta { display:flex; flex-wrap:wrap; gap: 10px 18px; font-size: 11px; color: #334155; margin: 6px 0 10px; }
  .meta em { color: #64748b; font-style: normal; margin-right: 4px; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th {
    background: #0f172a; color: #fff;
    padding: 8px 10px; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.4px;
    border: 1px solid #0f172a;
  }
  tbody td { padding: 7px 10px; border: 1px solid #e2e8f0; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #f8fafc; }

  .totals { margin-top: 12px; display:flex; justify-content:flex-end; flex-wrap: wrap; gap: 10px 20px; }
  .totals-row { display:flex; flex-direction: column; align-items: flex-end; padding: 6px 12px; border-radius: 8px; background: #f1f5f9; min-width: 140px; }
  .totals-row span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; color: #64748b; }
  .totals-row strong { font-size: 16px; color: #0f172a; }

  .footer {
    margin-top: 22px; padding-top: 8px; border-top: 2px dashed #cbd5e1;
    font-size: 10px; color: #64748b; text-align: center; white-space: pre-line;
  }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="brand">
    ${logo ? `<img src="${logo}" alt="logo" />` : ''}
    <div>
      <div class="name">${esc(name)}</div>
      <div class="sub">${esc(address)}${phone ? ' · ' + esc(phone) : ''}</div>
      ${code ? `<span class="code">${esc(code)}</span>` : ''}
    </div>
    <div class="right">
      <div><strong>${esc(opts.title)}</strong></div>
      <div>${esc(when)}</div>
    </div>
  </div>

  <div class="title-row">
    <h1>${esc(opts.title)}</h1>
    <div class="when">Generated ${esc(when)}</div>
  </div>
  ${opts.subtitle ? `<div class="subtitle">${esc(opts.subtitle)}</div>` : ''}
  ${metaHtml}

  <table>
    <thead><tr>${headHtml}</tr></thead>
    <tbody>${rowsHtml || `<tr><td colspan="${columns.length}" style="text-align:center;color:#94a3b8;padding:18px">No data</td></tr>`}</tbody>
  </table>

  ${totalsHtml}

  ${footer ? `<div class="footer">${esc(footer)}</div>` : ''}
</body>
</html>`.trim()

  const w = window.open('', '_blank', 'width=980,height=1200')
  if (!w) {
    alert('Please allow pop-ups to print.')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
  // Wait for images to load before invoking print.
  w.onload = () => {
    try { w.focus(); w.print() } catch {}
  }
}

export default printFinanceReport
