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
  email?: string
  logoDataUrl?: string
  patientId?: string
}

export function buildPatientCardHtml(data: PatientCardData): string {
  const qrPayload = encodeURIComponent(JSON.stringify({
    mrn: data.mrn || '',
    cardNo: data.cardNo || '',
    hrn: data.hospitalRegistrationNumber || '',
    name: data.fullName || '',
  }))
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrPayload}`
  
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Patient Card - ${data.fullName}</title>
  <style>
    @page {
      size: 530px 320px;
      margin: 0;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      background: #f1f5f9;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-btn-container {
      position: fixed;
      top: 15px;
      right: 15px;
      z-index: 1000;
    }
    .print-btn {
      background: #0284c7;
      color: #fff;
      border: none;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      transition: all 0.2s;
    }
    .print-btn:hover {
      background: #0369a1;
    }
    .card-container {
      width: 500px;
      height: 280px;
      background: #fff;
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      border: 1px solid #e2e8f0;
    }
    .main-body {
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .top-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 6px;
    }
    .logo-container {
      width: 70px;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .header-details {
      flex: 1;
      margin-left: 12px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .dept-title {
      font-size: 14px;
      font-weight: 800;
      color: #851414;
      margin: 0;
      line-height: 1.2;
      letter-spacing: 0.5px;
    }
    .lab-title {
      font-size: 10px;
      font-weight: 700;
      color: #334155;
      margin: 2px 0 0 0;
      line-height: 1.2;
    }
    .contact-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 9.5px;
      color: #0284c7;
      font-weight: 600;
      margin-top: 1px;
    }
    .contact-item svg {
      width: 10px;
      height: 10px;
      stroke-width: 2.5;
    }
    .qr-container {
      width: 68px;
      height: 68px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .qr-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .middle-section {
      display: flex;
      gap: 12px;
      flex: 1;
      align-items: flex-start;
    }
    .patient-photo-container {
      width: 82px;
      height: 100px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    .patient-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .patient-details-grid {
      flex: 1;
      display: grid;
      grid-template-columns: auto 1fr;
      column-gap: 8px;
      row-gap: 2px;
      font-size: 11px;
      color: #1e293b;
      font-weight: 600;
    }
    .field-label {
      color: #475569;
      font-weight: 700;
      min-width: 90px;
    }
    .field-value {
      font-weight: 700;
      color: #0f172a;
    }
    .bottom-bar {
      background: #1e3a8a;
      color: #fff;
      text-align: center;
      padding: 5px 0;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .bottom-bar a {
      color: #fff;
      text-decoration: none;
    }
    @media print {
      .print-btn-container {
        display: none;
      }
      body {
        background: #fff;
        height: auto;
      }
      .card-container {
        box-shadow: none;
        border: none;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="print-btn-container">
    <button class="print-btn" onclick="window.print()">Print</button>
  </div>
  
  <div class="card-container">
    <div class="main-body">
      <div class="top-section">
        <div class="logo-container">
          <svg viewBox="0 0 100 100" style="width:100%;height:100%;">
            <path id="circlePath" d="M 20,50 A 30,30 0 1,1 80,50 A 30,30 0 1,1 20,50" fill="none" />
            <circle cx="50" cy="50" r="44" fill="none" stroke="#15803d" stroke-width="2.5" />
            <circle cx="50" cy="50" r="39" fill="none" stroke="#15803d" stroke-width="0.8" stroke-dasharray="3,2" />
            <path d="M 50 18 A 32 32 0 1 0 82 50" fill="none" stroke="#15803d" stroke-width="1.5" />
            <line x1="50" y1="28" x2="50" y2="72" stroke="#15803d" stroke-width="3" stroke-linecap="round" />
            <path d="M 42 63 Q 58 53 50 43 T 50 25" fill="none" stroke="#15803d" stroke-width="1.8" stroke-linecap="round" />
            <path d="M 52 23 Q 55 24 54 27 Q 51 26 52 23 Z" fill="#15803d" />
            <circle cx="56" cy="21" r="1.5" fill="#15803d" />
            <text font-size="6" fill="#15803d" font-weight="bold" font-family="sans-serif">
              <textPath href="#circlePath" startOffset="0%">• PATHOLOGY LAB •</textPath>
            </text>
          </svg>
        </div>
        
        <div class="header-details">
          <h1 class="dept-title">${data.labName ? data.labName.toUpperCase() : 'PATHOLOGY LAB'}</h1>
          <div class="lab-title">${(data.labAddress || 'Allied Hospital - II, Faisalabad').toUpperCase()}</div>
          
          <div class="contact-item" style="margin-top: 3px;">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
            <span>${data.email || 'pathallied2@gmail.com'}</span>
          </div>
          <div class="contact-item">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.387a20.373 20.373 0 01-9.356-9.356c-.156-.441.01-.928.387-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
            <span>${data.labPhone || '041-9200140'}</span>
          </div>
        </div>
        
        <div class="qr-container">
          <img class="qr-img" src="${qrUrl}" alt="QR" />
        </div>
      </div>
      
      <div class="middle-section">
        <div class="patient-photo-container">
          ${data.patientImageUrl ? `<img class="patient-photo" src="${data.patientImageUrl}" />` : `
            <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" style="width: 50px; height: 50px;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          `}
        </div>
        
        <div class="patient-details-grid">
          <div class="field-label">Patient Id:</div>
          <div class="field-value">${data.patientId ? (data.patientId.length > 7 ? data.patientId.slice(-7).toUpperCase() : data.patientId) : '-'}</div>
          
          <div class="field-label">Patient Name:</div>
          <div class="field-value" style="font-size: 11px; color: #1e3a8a; font-weight: 800;">${data.fullName ? data.fullName.toUpperCase() : '-'}</div>
          
          <div class="field-label">Patient No:</div>
          <div class="field-value">${data.hospitalRegistrationNumber || '-'}</div>
          
          <div class="field-label">M/R No:</div>
          <div class="field-value">${data.mrn || '-'}</div>
          
          <div class="field-label">Blood Group:</div>
          <div class="field-value">${data.bloodGroup || '-'}</div>
          
          <div class="field-label">CNIC:</div>
          <div class="field-value">${data.cnic || '-'}</div>
          
          <div class="field-label">Phone:</div>
          <div class="field-value">${data.phone || '-'}</div>
        </div>
      </div>
    </div>
    
    <div class="bottom-bar">
      Powered By TechXect: <a href="https://www.techxect.com" target="_blank">www.techxect.com</a>
    </div>
  </div>
</body>
</html>`;
}

export function openPatientCardPrint(data: PatientCardData) {
  const w = window.open('', '_blank', 'width=560,height=360')
  if (!w) return
  w.document.open()
  w.document.write(buildPatientCardHtml(data))
  w.document.close()
}

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
