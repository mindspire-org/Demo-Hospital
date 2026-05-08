/**
 * PatientCardPrint — standalone printable patient card (image 1 in spec).
 *
 * Opens a new window, renders a self-contained HTML document with patient
 * details + MRN + hospital registration # + QR code (generated via an SVG
 * data URL using the QRServer public API when online; falls back to text-only
 * when offline).
 */
export type PatientCardData = {
  patientImageUrl?: string
  fullName: string
  age?: string
  gender?: string
  mrn?: string
  hospitalRegistrationNumber?: string
  phone?: string
  cnic?: string
  bloodGroup?: string
  issuedAt?: string
  expiresAt?: string
  validVisits?: number
  cardKind?: string
  cardNo?: string
  labName?: string
  labAddress?: string
  labPhone?: string
  logoDataUrl?: string
}

export function buildPatientCardHtml(data: PatientCardData): string {
  const qrPayload = encodeURIComponent(JSON.stringify({
    mrn: data.mrn || '',
    cardNo: data.cardNo || '',
    hrn: data.hospitalRegistrationNumber || '',
    name: data.fullName || '',
  }))
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrPayload}`
  const img = data.patientImageUrl
    ? `<img src="${data.patientImageUrl}" style="width:80px;height:96px;object-fit:cover;border:1px solid #bbb;border-radius:4px" />`
    : `<div style="width:80px;height:96px;border:1px solid #bbb;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#888;font-size:11px">No photo</div>`
  const row = (k: string, v?: string | number) =>
    `<div style="display:flex;justify-content:space-between;font-size:12px;padding:2px 0"><b>${k}:</b><span>${v ?? '-'}</span></div>`
  return `<!doctype html><html><head><meta charset="utf-8"><title>Patient Card ${data.cardNo || ''}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:0;background:#f3f4f6}
  .card{width:360px;border:1px solid #d1d5db;border-radius:8px;padding:12px;margin:10px auto;background:#fff;
        box-shadow:0 1px 3px rgba(0,0,0,.08)}
  .hdr{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #1e3a8a;padding-bottom:6px;margin-bottom:8px}
  .hdr h2{margin:0;font-size:16px;color:#1e3a8a}
  .hdr small{color:#374151}
  .row{display:flex;gap:10px;align-items:flex-start}
  .meta{flex:1}
  .qr{display:flex;justify-content:center;margin-top:8px}
  .footer{font-size:10px;color:#6b7280;text-align:center;margin-top:8px;border-top:1px dashed #d1d5db;padding-top:6px}
  @media print{body{background:#fff}.card{box-shadow:none;border:1px solid #999}}
</style></head><body>
<div class="card">
  <div class="hdr">
    <div>
      <h2>${data.labName || 'Lab / Diagnostic Dept.'}</h2>
      <small>${data.labAddress || ''}</small>
    </div>
    ${data.logoDataUrl ? `<img src="${data.logoDataUrl}" style="height:36px" />` : ''}
  </div>
  <div class="row">
    ${img}
    <div class="meta">
      ${row('Name', data.fullName)}
      ${row('Age / Gender', `${data.age || '-'} / ${data.gender || '-'}`)}
      ${row('MRN', data.mrn)}
      ${row('Hospital Reg#', data.hospitalRegistrationNumber)}
      ${row('Phone', data.phone)}
      ${row('CNIC', data.cnic)}
      ${row('Blood Group', data.bloodGroup)}
      ${row('Card #', data.cardNo)}
      ${row('Card kind', data.cardKind)}
      ${row('Issued', data.issuedAt ? new Date(data.issuedAt).toLocaleDateString() : '-')}
      ${row('Expires', data.expiresAt ? new Date(data.expiresAt).toLocaleDateString() : '-')}
      ${row('Valid visits', data.validVisits?.toString() || '∞')}
    </div>
  </div>
  <div class="qr"><img src="${qrUrl}" alt="QR" onerror="this.style.display='none'" /></div>
  <div class="footer">${data.labPhone ? `Phone: ${data.labPhone}` : ''} — Please keep this card for all future visits.</div>
</div>
<script>setTimeout(function(){try{window.print()}catch(e){}},400)</script>
</body></html>`
}

export function openPatientCardPrint(data: PatientCardData) {
  const w = window.open('', '_blank', 'width=480,height=720')
  if (!w) return
  w.document.open()
  w.document.write(buildPatientCardHtml(data))
  w.document.close()
}

/**
 * React convenience component — renders a button that triggers the print.
 */
export default function PatientCardPrintButton({ data, className = '', children }: {
  data: PatientCardData
  className?: string
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => openPatientCardPrint(data)}
      className={`inline-flex items-center gap-1 rounded border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 ${className}`}
      title="Print patient card"
    >
      {children || <>Print Patient Card</>}
    </button>
  )
}
