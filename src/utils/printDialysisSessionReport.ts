import { dialysisApi } from './api'

function esc(s: any) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function printDialysisSessionReport(input: {
  center?: { name?: string; address?: string; phone?: string; email?: string; logoDataUrl?: string }
  patient: {
    dialysisPatientId?: string
    mrn?: string
    fullName?: string
    fatherName?: string
    phone?: string
    cnic?: string
    gender?: string
    age?: string
    address?: string
  }
  session: any
}) {
  const s: any = input.center || (await dialysisApi.getSettings().catch(() => ({})))
  const centerName = s?.centerName || s?.dialysisCenterName || s?.name || 'Dialysis Center'
  const address = s?.address || '-'
  const phone = s?.phone || ''
  const email = s?.email || ''
  const logo = s?.logoDataUrl || ''

  const p = input.patient || ({} as any)
  const sess = input.session || ({} as any)

  const overlayId = 'dialysis-session-report-overlay'
  const old = document.getElementById(overlayId)
  if (old) old.remove()

  const overlay = document.createElement('div')
  overlay.id = overlayId
  overlay.style.position = 'fixed'
  overlay.style.inset = '0'
  overlay.style.background = 'rgba(15,23,42,0.5)'
  overlay.style.zIndex = '9999'
  overlay.style.display = 'flex'
  overlay.style.alignItems = 'center'
  overlay.style.justifyContent = 'center'
  overlay.style.padding = '16px'

  const get = (obj: any, key: string) => {
    const v = obj?.[key]
    return v == null || String(v).trim() === '' ? '-' : String(v)
  }

  const html = `
  <style>
    .card{width:794px;max-width:100%;background:#fff;border-radius:12px;box-shadow:0 10px 25px rgba(2,6,23,0.2);overflow:hidden}
    .toolbar{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #e2e8f0;background:#f8fafc}
    .toolbar-title{font-weight:700;color:#0f172a}
    .btn{border:1px solid #cbd5e1;border-radius:8px;padding:6px 10px;font-size:12px;color:#334155;background:#fff}
    .wrap{padding:16px 20px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#0f172a}
    .hdr{display:grid;grid-template-columns:96px 1fr 96px;align-items:center}
    .hdr .title{font-size:26px;font-weight:800;text-align:center}
    .hdr .muted{color:#64748b;font-size:12px;text-align:center}
    .section-title{font-size:16px;font-weight:800;color:#0f172a;margin:14px 0 8px 0;border-bottom:2px solid #0f172a;padding-bottom:4px}
    .box{border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin:8px 0}
    .kv{display:grid;grid-template-columns: 160px 1fr 160px 1fr;gap:8px 16px;font-size:13px;align-items:start}
    .kv > div{line-height:1.35}
    .kv > div:nth-child(2n){word-break:break-word}
    .kv-label{font-weight:700;color:#374151}
    .footer{margin-top:18px;text-align:center;color:#475569;font-size:11px}
    .box, .hdr, .section-title { break-inside: avoid }
    @media print{
      @page { size: A4 portrait; margin: 12mm }
      body *{ visibility:hidden !important }
      #${overlayId}, #${overlayId} *{ visibility:visible !important }
      #${overlayId}{ position:static !important; background:transparent !important; padding:0 !important }
      .toolbar{ display:none !important }
      .card{ box-shadow:none !important; width:auto !important }
    }
  </style>
  <div class="card">
    <div class="toolbar">
      <div class="toolbar-title">Dialysis Session Report</div>
      <div>
        <button class="btn" id="dialysis-session-report-print">Print (Ctrl+P)</button>
        <button class="btn" id="dialysis-session-report-close" style="margin-left:8px">Close (Ctrl+D)</button>
      </div>
    </div>
    <div class="wrap">
      <div class="hdr">
        <div>${logo ? `<img src="${esc(logo)}" alt="logo" style="height:70px;width:auto;object-fit:contain"/>` : ''}</div>
        <div>
          <div class="title"><strong>${esc(centerName)}</strong></div>
          <div class="muted"><strong>${esc(address)}</strong></div>
          <div class="muted"><strong>Ph: ${esc(phone)} ${email ? ' • ' + esc(email) : ''}</strong></div>
        </div>
        <div></div>
      </div>

      <div class="section-title">Patient Information</div>
      <div class="box">
        <div class="kv">
          <div class="kv-label">Dialysis Unique ID:</div><div>${esc(get(p,'dialysisPatientId'))}</div>
          <div class="kv-label">MRN:</div><div>${esc(get(p,'mrn'))}</div>
          <div class="kv-label">Patient Name:</div><div>${esc(get(p,'fullName'))}</div>
          <div class="kv-label">S/O, D/O, W/O:</div><div>${esc(get(p,'fatherName'))}</div>
          <div class="kv-label">Contact:</div><div>${esc(get(p,'phone'))}</div>
          <div class="kv-label">CNIC:</div><div>${esc(get(p,'cnic'))}</div>
          <div class="kv-label">Gender:</div><div>${esc(get(p,'gender'))}</div>
          <div class="kv-label">Age:</div><div>${esc(get(p,'age'))}</div>
          <div class="kv-label">Address:</div><div>${esc(get(p,'address'))}</div>
        </div>
      </div>

      <div class="section-title">Part 2 — Technical Data</div>
      <div class="box">
        <div class="kv">
          <div class="kv-label">Date:</div><div>${esc(get(sess,'dateIso'))}</div>
          <div class="kv-label">Token #:</div><div>${esc(get(sess,'tokenNo'))}</div>
          <div class="kv-label">Start:</div><div>${esc(get(sess,'timeStarted'))}</div>
          <div class="kv-label">End:</div><div>${esc(get(sess,'timeCompleted'))}</div>
          <div class="kv-label">Dialyzer:</div><div>${esc(get(sess,'dialyzerTypeName'))}</div>
          <div class="kv-label">No of Use:</div><div>${esc(get(sess,'noOfUse'))}</div>
          <div class="kv-label">Blood Flow Rate:</div><div>${esc(get(sess,'bloodFlowRate'))}</div>
          <div class="kv-label">Dialysate Flow Rate:</div><div>${esc(get(sess,'dialysateFlowRate'))}</div>
          <div class="kv-label">Venous Pressure:</div><div>${esc(get(sess,'venousPressure'))}</div>
          <div class="kv-label">Heparin Loading Dose:</div><div>${esc(get(sess,'heparinLoadingDose'))}</div>
          <div class="kv-label">Heparin Infusion:</div><div>${esc(get(sess,'heparinInfusion'))}</div>
          <div class="kv-label">BP Pre HD (Sys/Dia):</div><div>${esc(`${get(sess,'bpPreSys')}/${get(sess,'bpPreDia')}`.replace('-/-','-'))}</div>
          <div class="kv-label">BP Intra (Sys/Dia):</div><div>${esc(`${get(sess,'bpIntraSys')}/${get(sess,'bpIntraDia')}`.replace('-/-','-'))}</div>
          <div class="kv-label">BP Post HD (Sys/Dia):</div><div>${esc(`${get(sess,'bpPostSys')}/${get(sess,'bpPostDia')}`.replace('-/-','-'))}</div>
          <div class="kv-label">Weight Dry:</div><div>${esc(get(sess,'weightDry'))}</div>
          <div class="kv-label">Weight Pre HD:</div><div>${esc(get(sess,'weightPre'))}</div>
          <div class="kv-label">Weight Post HD:</div><div>${esc(get(sess,'weightPost'))}</div>
          <div class="kv-label">IDWG:</div><div>${esc(get(sess,'idwg'))}</div>
          <div class="kv-label">Medication — EPO:</div><div>${esc(get(sess,'medEpo'))}</div>
          <div class="kv-label">Medication — Iron:</div><div>${esc(get(sess,'medIron'))}</div>
          <div class="kv-label">Medication — Calcltriol:</div><div>${esc(get(sess,'medCalctriol'))}</div>
          <div class="kv-label">Kt/V or URR:</div><div>${esc(get(sess,'medKtVOrUrr'))}</div>
          <div class="kv-label">Target UF:</div><div>${esc(get(sess,'targetUF'))}</div>
          <div class="kv-label">Data entry name:</div><div>${esc(get(sess,'dataEntryName'))}</div>
          <div class="kv-label">Designation:</div><div>${esc(get(sess,'dataEntryDesignation'))}</div>
          <div class="kv-label">Any problem of patient:</div><div>${esc(get(sess,'patientProblem'))}</div>
          <div class="kv-label">Nephrologist/SMO:</div><div>${esc(get(sess,'nephrologistName'))}</div>
          <div class="kv-label">Nephrologist Time:</div><div>${esc(get(sess,'nephrologistTime'))}</div>
        </div>
      </div>

      <div class="footer">System Generated Report - ${esc(new Date().toLocaleDateString())} ${esc(new Date().toLocaleTimeString())}</div>
    </div>
  </div>`

  overlay.innerHTML = html
  document.body.appendChild(overlay)

  const onClose = () => {
    try {
      document.removeEventListener('keydown', onKey)
      overlay.remove()
    } catch {}
  }
  const onPrint = () => {
    try {
      const api = (window as any).electronAPI
      if (api && typeof api.printPreviewCurrent === 'function') {
        api.printPreviewCurrent({})
        return
      }
    } catch {}
    try {
      window.print()
    } catch {}
  }
  const onKey = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault()
      onClose()
    }
    if (e.key === 'Escape') onClose()
  }

  document.getElementById('dialysis-session-report-close')?.addEventListener('click', onClose)
  document.getElementById('dialysis-session-report-print')?.addEventListener('click', onPrint)
  document.addEventListener('keydown', onKey)
}
