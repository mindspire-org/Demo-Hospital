import { diagnosticApi } from '../../utils/api'

export type DiagnosticPrintSection = {
  key: string
  title: string
  html: string
}

export type DiagnosticPrintInput = {
  tokenNo?: string
  createdAt?: string
  reportedAt?: string
  patient: {
    fullName: string
    phone?: string
    mrn?: string
    age?: string
    gender?: string
    address?: string
  }
  referringConsultant?: string
  reportTitle: string
  sections: DiagnosticPrintSection[]
  extraStyles?: string
}

function esc(x: any) {
  return String(x == null ? '' : x)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fmt(iso?: string) {
  const d = iso ? new Date(iso) : new Date()
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString()
}

export async function printDiagnosticReport(input: DiagnosticPrintInput) {
  const s: any = await diagnosticApi.getSettings().catch(() => ({}))

  const name = s?.diagnosticName || 'Diagnostic Center'
  const address = s?.address || '-'
  const phone = s?.phone || ''
  const email = s?.email || ''
  const department = s?.department || 'Department of Diagnostics'
  const logo = s?.logoDataUrl || ''
  const footer = s?.reportFooter || ''

  const sectionsConfig: Record<string, boolean> = s?.reportSections || { findings: true }

  // Build consultants block
  const consultants: Array<{ name?: string; degrees?: string; title?: string }> = []
  consultants.push({
    name: s?.consultantName,
    degrees: s?.consultantDegrees,
    title: s?.consultantTitle,
  })
  const extra = Array.isArray(s?.consultants) ? s.consultants : []
  for (const c of extra) consultants.push({ name: c?.name, degrees: c?.degrees, title: c?.title })
  const filteredConsultants = consultants.filter((c) => c?.name || c?.degrees || c?.title).slice(0, 3)

  // Filter sections by settings; always allow sections not in config (backward compat)
  const filteredSections = input.sections.filter((sec) => {
    const cfg = sectionsConfig[sec.key]
    return cfg === undefined ? true : !!cfg
  })

  const sectionsHtml = filteredSections
    .map((sec) => {
      const hasHtml = sec.html && sec.html.replace(/<[^>]+>/g, '').trim()
      if (!hasHtml) return ''
      return `<div class="report-section">
        <div class="report-section-title">${esc(sec.title)}</div>
        <div class="report-section-body">${sec.html}</div>
      </div>`
    })
    .filter(Boolean)
    .join('')

  const consultHtml = filteredConsultants.length
    ? `<div class="consultants-row">
        ${filteredConsultants
          .map(
            (c) => `<div class="consultant-block">
              <div class="consultant-name">${esc(c.name || '')}</div>
              <div class="consultant-deg">${esc(c.degrees || '')}</div>
              <div class="consultant-title">${esc(c.title || '')}</div>
            </div>`
          )
          .join('')}
      </div>`
    : ''

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${esc(input.reportTitle)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    @page { size: A4 portrait; margin: 14mm }
    * { box-sizing: border-box }
    body {
      font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      margin: 0;
      padding: 0;
    }
    .page {
      min-height: calc(100vh - 28mm);
      display: flex;
      flex-direction: column;
      padding: 0 2mm;
    }

    /* Header */
    .header {
      display: grid;
      grid-template-columns: 64px 1fr 64px;
      align-items: center;
      gap: 12px;
      padding-bottom: 10px;
      border-bottom: 2.5px solid #0f172a;
      margin-bottom: 6px;
    }
    .header-logo img {
      height: 56px;
      width: auto;
      object-fit: contain;
      display: block;
    }
    .header-center { text-align: center }
    .header-name {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0.3px;
      color: #0f172a;
      line-height: 1.2;
    }
    .header-meta {
      font-size: 11px;
      color: #64748b;
      margin-top: 3px;
      line-height: 1.4;
    }

    .department {
      text-align: center;
      font-size: 13px;
      font-weight: 500;
      color: #334155;
      font-style: italic;
      margin: 6px 0 2px;
    }

    /* Patient info */
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 14px;
      margin: 8px 0 10px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 120px 1fr 120px 1fr;
      gap: 6px 14px;
      font-size: 11.5px;
    }
    .info-grid .label {
      font-weight: 600;
      color: #475569;
      line-height: 1.35;
    }
    .info-grid .value {
      color: #0f172a;
      word-break: break-word;
      line-height: 1.35;
    }

    /* Report title */
    .report-title {
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin: 8px 0 4px;
    }

    /* Sections */
    .report-section {
      margin-top: 10px;
    }
    .report-section-title {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 6px;
    }
    .report-section-body {
      font-size: 12.5px;
      color: #1e293b;
      line-height: 1.65;
    }
    .report-section-body p { margin: 0 0 6px }
    .report-section-body ul, .report-section-body ol { margin: 0 0 6px 18px; padding: 0 }
    .report-section-body li { margin-bottom: 2px }

    /* Footer */
    .spacer { flex: 1 }
    .footer-block {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-top: 14px;
    }
    .footer-line {
      border-top: 1px solid #cbd5e1;
      margin: 10px 0 8px;
    }
    .footer-note {
      font-size: 10.5px;
      color: #64748b;
      text-align: center;
      margin-bottom: 10px;
    }

    /* Consultants */
    .consultants-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: nowrap;
    }
    .consultant-block {
      text-align: center;
      flex: 1;
    }
    .consultant-name {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .consultant-deg {
      font-size: 11px;
      color: #475569;
      margin-top: 2px;
    }
    .consultant-title {
      font-size: 11px;
      font-weight: 600;
      color: #334155;
      margin-top: 2px;
    }

    /* Doctor signature right-bottom */
    .signature-row {
      display: flex;
      justify-content: flex-end;
      align-items: flex-end;
      margin-top: 20px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .signature-box {
      text-align: center;
      min-width: 180px;
    }
    .signature-line {
      border-bottom: 1.5px solid #0f172a;
      width: 160px;
      margin: 0 auto 4px;
      height: 30px;
    }
    .signature-label {
      font-size: 11px;
      font-weight: 600;
      color: #334155;
    }
    .signature-name {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      margin-top: 2px;
    }

    /* Responsive print */
    @media print {
      .page { min-height: calc(100vh - 28mm) }
    }
    ${input.extraStyles || ''}
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-logo">${logo ? `<img src="${esc(logo)}" alt="logo"/>` : ''}</div>
      <div class="header-center">
        <div class="header-name">${esc(name)}</div>
        <div class="header-meta">${esc(address)}${phone ? ` &nbsp;|&nbsp; Ph: ${esc(phone)}` : ''}${email ? ` &nbsp;|&nbsp; ${esc(email)}` : ''}</div>
      </div>
      <div></div>
    </div>
    <div class="department">${esc(department)}</div>

    <div class="info-card">
      <div class="info-grid">
        <div class="label">Patient Name</div><div class="value">${esc(input.patient.fullName)}</div>
        <div class="label">Age / Gender</div><div class="value">${esc(input.patient.age || '')} / ${esc(input.patient.gender || '')}</div>
        <div class="label">Medical Record No</div><div class="value">${esc(input.patient.mrn || '-')}</div>
        <div class="label">Token No</div><div class="value">${esc(input.tokenNo || '-')}</div>
        <div class="label">Contact No</div><div class="value">${esc(input.patient.phone || '-')}</div>
        <div class="label">Referring Consultant</div><div class="value">${esc(input.referringConsultant || '-')}</div>
        <div class="label">Reg. Date</div><div class="value">${fmt(input.createdAt)}</div>
        <div class="label">Reporting Date</div><div class="value">${fmt(input.reportedAt || new Date().toISOString())}</div>
        <div class="label">Address</div><div class="value" style="grid-column: span 3">${esc(input.patient.address || '-')}</div>
      </div>
    </div>

    <div class="report-title">${esc(input.reportTitle)}</div>

    ${sectionsHtml}

    <div class="spacer"></div>

    <div class="footer-block">
      ${footer ? `<div class="footer-note">${esc(footer)}</div>` : ''}
      <div class="footer-line"></div>
      ${consultHtml}
    </div>

    ${filteredConsultants.length > 0 ? `
    <div class="signature-row">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Doctor's Signature</div>
        <div class="signature-name">${esc(filteredConsultants[0]?.name || '')}</div>
      </div>
    </div>` : ''}
  </div>
</body>
</html>`

  // Prefer Electron in-app preview if available
  try {
    const api = (window as any).electronAPI
    if (api && typeof api.printPreviewHtml === 'function') {
      await api.printPreviewHtml(html, {})
      return
    }
  } catch {}

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.visibility = 'hidden'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) return
  doc.open()
  doc.write(html)
  doc.close()
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch {}
    setTimeout(() => {
      try {
        iframe.remove()
      } catch {}
    }, 8000)
  }
}
