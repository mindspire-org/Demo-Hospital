import { previewHospitalRxPdf } from './prescription/templates/hospitalRxPdf'
import { previewSpecialistClinicPdf } from './prescription/templates/specialistClinicPrescription'
import { previewMinimalCleanPdf } from './prescription/templates/minimalClean'
import { previewModernGradientPdf } from './prescription/templates/modernGradient'
import { previewClinicalProfessionalPdf } from './prescription/templates/clinicalProfessional'
import { previewPremiumDarkHeaderPdf } from './prescription/templates/premiumDarkHeader'
import { previewCompactPharmacyPdf } from './prescription/templates/compactPharmacy'
import { previewPediatricFriendlyPdf } from './prescription/templates/pediatricFriendly'
import { buildPrescriptionOne } from './prescription/templates/templateOne'
import { buildPrescriptionTwo } from './prescription/templates/templateTwo'

export type PrescriptionPdfTemplate =
  | 'hospital-rx'
  | 'minimal-rx'
  | 'letterhead-rx'
  | 'specialist-clinic'
  | 'minimal-clean'
  | 'modern-gradient'
  | 'clinical-professional'
  | 'premium-dark-header'
  | 'compact-pharmacy'
  | 'pediatric-friendly'
  | 'template-one'
  | 'template-two'

export interface PrescriptionPdfData {
  doctor: {
    name?: string
    qualification?: string
    specialization?: string
    departmentName?: string
    phone?: string
    title?: string
  }
  settings: {
    name: string
    address: string
    phone: string
    logoDataUrl?: string
  }
  patient: {
    name: string
    mrn: string
    gender?: string
    age?: string
    fatherName?: string
    phone?: string
    address?: string
    cnic?: string
  }
  items: Array<{
    name: string
    dose?: string
    frequency?: string
    duration?: string
    route?: string
    instruction?: string
    qty?: number | string
    durationText?: string
  }>
  labTests?: string[]
  labNotes?: string
  diagnosticTests?: string[]
  diagnosticNotes?: string
  vitals?: {
    pulse?: number
    temperatureC?: number
    temperatureF?: number
    bloodPressureSys?: number
    bloodPressureDia?: number
    respiratoryRate?: number
    bloodSugar?: number
    weightKg?: number
    heightCm?: number
    bmi?: number
    bsa?: number
    spo2?: number
  }
  primaryComplaint?: string
  primaryComplaintHistory?: string
  familyHistory?: string
  allergyHistory?: string
  treatmentHistory?: string
  history?: string
  examFindings?: string
  diagnosis?: string
  advice?: string
  tokenNo?: string
  createdAt?: Date | string
}

// ─── Constants ──────────────────────────────────────────────
export const PRESCRIPTION_PDF_TEMPLATES: PrescriptionPdfTemplate[] = [
  'hospital-rx',
  'minimal-rx',
  'letterhead-rx',
  'specialist-clinic',
  'minimal-clean',
  'modern-gradient',
  'clinical-professional',
  'premium-dark-header',
  'compact-pharmacy',
  'pediatric-friendly',
  'template-one',
  'template-two',
]

export const TEMPLATE_LABELS: Record<PrescriptionPdfTemplate, string> = {
  'hospital-rx': 'Modern Clinical',
  'minimal-rx': 'Minimal Compact',
  'letterhead-rx': 'Letterhead Classic',
  'specialist-clinic': 'Specialist Clinic',
  'minimal-clean': 'Minimal Clean',
  'modern-gradient': 'Modern Gradient',
  'clinical-professional': 'Clinical Professional',
  'premium-dark-header': 'Premium Dark Header',
  'compact-pharmacy': 'Compact Pharmacy',
  'pediatric-friendly': 'Pediatric Friendly',
  'template-one': 'Bhatti Clinic V1',
  'template-two': 'Bhatti Clinic V2',
}

// ─── shared helpers ────────────────────────────────────────
const fmtDate = (d?: Date | string) => {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
}

const esc = (s?: string) =>
  (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const vitalsLabel: Record<string, string> = {
  pulse: 'Pulse',
  temperatureC: 'Temp (°C)',
  bloodPressureSys: 'Sys BP',
  bloodPressureDia: 'Dia BP',
  respiratoryRate: 'RR',
  bloodSugar: 'Blood Sugar',
  weightKg: 'Weight (kg)',
  heightCm: 'Height (cm)',
  spo2: 'SpO₂ (%)',
}

const vitalsUnit: Record<string, string> = {
  pulse: '/min',
  temperatureC: '°C',
  bloodPressureSys: 'mmHg',
  bloodPressureDia: 'mmHg',
  respiratoryRate: '/min',
  bloodSugar: 'mg/dL',
  weightKg: 'kg',
  heightCm: 'cm',
  spo2: '%',
}

// ─── Legacy Template Imports ────────────────────────────────

// ─── Template: Modern Clinical (hospital-rx) ───────────────
function buildModernClinical(data: PrescriptionPdfData): string {
  const { doctor, settings, patient, items, vitals, labTests = [], diagnosticTests = [] } = data

  const vitalsEntries = Object.entries(vitals || {}).filter(([, v]) => v != null)
  const medRows = items
    .filter(m => m.name?.trim())
    .map(
      (m, i) => `
      <tr>
        <td><span class="num">${i + 1}</span>${esc(m.name)}${m.instruction ? `<br/><span class="inst">${esc(m.instruction)}</span>` : ''}</td>
        <td>${esc(m.dose) || '—'}</td>
        <td>${esc(m.frequency) || '—'}</td>
        <td>${esc(m.duration) || '—'}</td>
        <td>${esc(m.route) || 'Oral'}</td>
      </tr>`,
    )
    .join('')

  const labChips = labTests.map(t => `<span class="chip">${esc(t)}</span>`).join('')
  const diagChips = diagnosticTests.map(t => `<span class="chip">${esc(t)}</span>`).join('')
  const vitalsHtml = vitalsEntries
    .map(
      ([k, v]) =>
        `<div class="vchip"><div class="vl">${vitalsLabel[k] || k}</div><div class="vv">${v}${vitalsUnit[k] ? ' ' + vitalsUnit[k] : ''}</div></div>`,
    )
    .join('')

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'DM Sans',sans-serif;font-size:11px;color:#111827;background:#fff;line-height:1.5}
  @page{size:A4;margin:14mm 14mm 18mm}

  /* ── Header ── */
  .hdr{display:grid;grid-template-columns:50px 1fr auto;gap:12px;align-items:center;padding-bottom:10px;border-bottom:2px solid #111827}
  .logo{width:46px;height:46px;background:#111827;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'DM Serif Display',serif;font-size:18px}
  .hosp-name{font-family:'DM Serif Display',serif;font-size:16px;color:#111827}
  .hosp-sub{font-size:9px;color:#6b7280;letter-spacing:.06em;text-transform:uppercase;margin-top:2px}
  .hosp-contact{font-size:9px;color:#6b7280;margin-top:1px}
  .dr-name{font-size:13px;font-weight:600;text-align:right}
  .dr-detail{font-size:9px;color:#6b7280;text-align:right;margin-top:2px}

  /* ── Dark Banner ── */
  .banner{background:#111827;color:#fff;padding:5px 14px;display:flex;justify-content:space-between;align-items:center;margin:0 -14mm;padding-left:14mm;padding-right:14mm}
  .rx-sym{font-family:'DM Serif Display',serif;font-size:20px}
  .banner-meta{display:flex;gap:20px;font-size:9px;opacity:.8;letter-spacing:.06em}
  .banner-meta strong{opacity:1;font-weight:600}

  /* ── Patient Bar ── */
  .pat-bar{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid #e5e7eb}
  .pf{padding:6px 10px;border-right:0.5px solid #e5e7eb}
  .pf:last-child{border-right:none}
  .pf-lbl{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;font-weight:600;margin-bottom:2px}
  .pf-val{font-size:11px;font-weight:500}

  /* ── Body ── */
  .body{display:grid;grid-template-columns:160px 1fr;border-bottom:1px solid #e5e7eb;min-height:260px}
  .left-col{padding:12px 10px;border-right:0.5px solid #e5e7eb}
  .right-col{padding:12px 14px}
  .sec-lbl{font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af;font-weight:600;margin-bottom:4px;padding-bottom:3px;border-bottom:0.5px solid #f3f4f6;margin-top:10px}
  .sec-lbl:first-child{margin-top:0}
  .sec-val{font-size:10px;color:#374151;line-height:1.6}
  .dx{font-size:11px;font-weight:600;color:#111827;margin-top:3px}
  .icd{font-size:9px;color:#9ca3af;margin-top:1px}

  /* ── Vitals ── */
  .vitals-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:5px}
  .vchip{background:#f9fafb;border:0.5px solid #e5e7eb;border-radius:5px;padding:4px 6px}
  .vl{font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;font-weight:600}
  .vv{font-size:11px;font-weight:500;color:#111827;margin-top:1px}

  /* ── Med Table ── */
  table{width:100%;border-collapse:collapse}
  th{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;font-weight:600;padding:3px 5px;border-bottom:1px solid #e5e7eb;text-align:left}
  td{padding:5px 5px;font-size:10px;border-bottom:0.5px solid #f3f4f6;vertical-align:top}
  .num{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;background:#111827;color:#fff;border-radius:50%;font-size:8px;font-weight:600;margin-right:4px;flex-shrink:0;vertical-align:middle}
  .inst{font-size:9px;color:#9ca3af;font-style:italic}

  /* ── Chips ── */
  .chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}
  .chip{background:#f3f4f6;border:0.5px solid #e5e7eb;border-radius:10px;padding:2px 8px;font-size:9px;color:#374151}

  /* ── Footer ── */
  .footer{display:flex;justify-content:space-between;align-items:flex-end;padding:10px 0 4px}
  .sig-line{width:110px;border-bottom:0.5px solid #111827;margin:0 0 3px}
  .sig-lbl{font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af}
  .next-visit{display:inline-block;border:0.5px solid #111827;border-radius:3px;padding:2px 8px;font-size:9px;font-weight:500;margin-top:5px}
  .advice-text{font-size:10px;color:#374151;max-width:380px;line-height:1.65}
  .stamp-area{font-size:8px;color:#9ca3af;text-align:center;margin-top:2px}
</style>
</head><body>

<div class="hdr">
  <div class="logo">H+</div>
  <div>
    <div class="hosp-name">${esc(settings.name)}</div>
    <div class="hosp-sub">Outpatient Department · Digital Prescription</div>
    <div class="hosp-contact">${esc(settings.address)}${settings.phone ? ' · ' + esc(settings.phone) : ''}</div>
  </div>
  <div>
    <div class="dr-name">${esc(doctor.name || 'Physician')}</div>
    <div class="dr-detail">${esc(doctor.qualification || '')}</div>
    <div class="dr-detail">${esc(doctor.specialization || '')}${doctor.departmentName ? ' — ' + esc(doctor.departmentName) : ''}</div>
    ${doctor.phone ? `<div class="dr-detail">${esc(doctor.phone)}</div>` : ''}
  </div>
</div>

<div class="banner">
  <span class="rx-sym">℞</span>
  <div class="banner-meta">
    <span>Date: <strong>${fmtDate(data.createdAt)}</strong></span>
    ${data.tokenNo ? `<span>Token: <strong>${esc(data.tokenNo)}</strong></span>` : ''}
    <span>MRN: <strong>${esc(patient.mrn)}</strong></span>
  </div>
</div>

<div class="pat-bar">
  <div class="pf"><div class="pf-lbl">Patient Name</div><div class="pf-val">${esc(patient.name)}</div></div>
  <div class="pf"><div class="pf-lbl">Age / Gender</div><div class="pf-val">${patient.age ? esc(patient.age) + ' yrs' : '—'} / ${esc(patient.gender) || '—'}</div></div>
  <div class="pf"><div class="pf-lbl">Father / Guardian</div><div class="pf-val">${esc(patient.fatherName) || '—'}</div></div>
  <div class="pf"><div class="pf-lbl">Contact</div><div class="pf-val">${esc(patient.phone) || '—'}</div></div>
</div>

<div class="body">
  <div class="left-col">
    ${data.primaryComplaint ? `<div class="sec-lbl">Chief Complaint</div><div class="sec-val">${esc(data.primaryComplaint)}</div>` : ''}
    ${data.history ? `<div class="sec-lbl">History</div><div class="sec-val">${esc(data.history)}</div>` : ''}
    ${data.examFindings ? `<div class="sec-lbl">Examination</div><div class="sec-val">${esc(data.examFindings)}</div>` : ''}
    ${data.diagnosis ? `<div class="sec-lbl">Diagnosis</div><div class="dx">${esc(data.diagnosis)}</div>` : ''}
    ${vitalsEntries.length ? `<div class="sec-lbl">Vitals</div><div class="vitals-grid">${vitalsHtml}</div>` : ''}
    ${data.allergyHistory ? `<div class="sec-lbl">Allergy</div><div class="sec-val" style="color:#dc2626">${esc(data.allergyHistory)}</div>` : ''}
  </div>
  <div class="right-col">
    <div class="sec-lbl" style="margin-top:0">Medications</div>
    <table>
      <thead><tr><th style="width:36%">Medicine</th><th>Dose</th><th>Frequency</th><th>Duration</th><th>Route</th></tr></thead>
      <tbody>${medRows}</tbody>
    </table>
    ${labTests.length ? `<div class="sec-lbl">Lab Orders</div><div class="chips">${labChips}</div>` : ''}
    ${diagnosticTests.length ? `<div class="sec-lbl">Diagnostic Orders</div><div class="chips">${diagChips}</div>` : ''}
  </div>
</div>

<div class="footer">
  <div>
    ${data.advice ? `<div style="font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;font-weight:600;margin-bottom:3px">Advice &amp; Instructions</div><div class="advice-text">${esc(data.advice)}</div>` : ''}
    <div class="next-visit">Follow-up: _______________</div>
  </div>
  <div style="text-align:center">
    <div style="height:30px"></div>
    <div class="sig-line"></div>
    <div class="sig-lbl">Signature &amp; Stamp</div>
    <div class="stamp-area">${esc(doctor.name || '')} &nbsp;|&nbsp; ${esc(settings.name)}</div>
  </div>
</div>

</body></html>`
}

// ─── Template: Minimal Compact (minimal-rx) ────────────────
function buildMinimalCompact(data: PrescriptionPdfData): string {
  const { doctor, settings, patient, items, vitals, labTests = [], diagnosticTests = [] } = data
  const vitalsEntries = Object.entries(vitals || {}).filter(([, v]) => v != null)

  const medRows = items
    .filter(m => m.name?.trim())
    .map(
      (m, i) =>
        `<tr><td style="padding:5px 0;border-bottom:1px solid #f3f4f6;font-size:10px"><strong style="font-size:10px">${i + 1}. ${esc(m.name)}</strong>${m.instruction ? ' — <em style="color:#9ca3af;font-size:9px">' + esc(m.instruction) + '</em>' : ''}</td>` +
        `<td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;font-size:10px;color:#374151;text-align:center">${esc(m.dose) || '—'}</td>` +
        `<td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;font-size:10px;color:#374151">${esc(m.frequency) || '—'}</td>` +
        `<td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;font-size:10px;color:#374151">${esc(m.duration) || '—'}</td></tr>`,
    )
    .join('')

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;1,400&family=IBM+Plex+Serif:wght@400;600&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'IBM Plex Sans',sans-serif;font-size:11px;color:#111;background:#fff;line-height:1.6}
  @page{size:A4;margin:16mm 18mm 20mm}
  .top-rule{height:3px;background:#111;margin-bottom:14px}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;padding-bottom:10px;border-bottom:0.5px solid #ddd}
  .hosp{font-family:'IBM Plex Serif',serif;font-size:18px;letter-spacing:-.02em}
  .hosp-sub{font-size:9px;color:#888;margin-top:2px;text-transform:uppercase;letter-spacing:.08em}
  .dr-side{text-align:right}
  .dr-n{font-size:12px;font-weight:500}
  .dr-d{font-size:9px;color:#888;margin-top:2px}
  .rx-line{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #111;margin-bottom:10px;padding-bottom:5px}
  .rx-big{font-family:'IBM Plex Serif',serif;font-size:28px;letter-spacing:-.05em;line-height:1}
  .meta{font-size:9px;color:#888;display:flex;gap:16px;letter-spacing:.04em}
  .pat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px 20px;margin-bottom:12px;padding:8px 10px;background:#f9f9f9;border-radius:4px}
  .prow{display:flex;gap:6px;align-items:baseline}
  .pk{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#888;font-weight:500;min-width:68px}
  .pv{font-size:10px;font-weight:500}
  .col2{display:grid;grid-template-columns:150px 1fr;gap:16px;margin-bottom:12px}
  .sub-lbl{font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:#888;font-weight:600;margin-bottom:4px;margin-top:10px}
  .sub-lbl:first-child{margin-top:0}
  .txt{font-size:10px;color:#333;line-height:1.65}
  .dx-name{font-size:12px;font-weight:500;margin-top:3px}
  table{width:100%;border-collapse:collapse}
  th{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#888;padding:3px 8px 3px 0;border-bottom:1px solid #111;text-align:left;font-weight:600}
  .chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
  .chip{border:0.5px solid #ccc;border-radius:10px;padding:2px 9px;font-size:9px;color:#333}
  .vitals-row{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
  .vit{font-size:9px;color:#333}<span class="vit-k" style="color:#888"></span>
  .footer-line{border-top:1px solid #111;margin-top:14px;padding-top:10px;display:flex;justify-content:space-between;align-items:flex-end}
  .sig-l{width:100px;border-bottom:0.5px solid #111;margin-bottom:3px}
  .sig-t{font-size:8px;color:#888;text-transform:uppercase;letter-spacing:.06em}
  .nxt{display:inline-block;border:0.5px solid #111;padding:2px 8px;font-size:9px;margin-top:5px}
</style>
</head><body>

<div class="top-rule"></div>
<div class="hdr">
  <div>
    <div class="hosp">${esc(settings.name)}</div>
    <div class="hosp-sub">${esc(settings.address)}${settings.phone ? '  ·  ' + esc(settings.phone) : ''}</div>
  </div>
  <div class="dr-side">
    <div class="dr-n">${esc(doctor.name || 'Physician')}</div>
    <div class="dr-d">${esc(doctor.qualification || '')} ${doctor.specialization ? '· ' + esc(doctor.specialization) : ''}</div>
    ${doctor.phone ? `<div class="dr-d">${esc(doctor.phone)}</div>` : ''}
  </div>
</div>

<div class="rx-line">
  <span class="rx-big">℞</span>
  <div class="meta">
    <span>${fmtDate(data.createdAt)}</span>
    ${data.tokenNo ? `<span>Token ${esc(data.tokenNo)}</span>` : ''}
    <span>MRN ${esc(patient.mrn)}</span>
  </div>
</div>

<div class="pat-grid">
  <div class="prow"><span class="pk">Patient</span><span class="pv">${esc(patient.name)}</span></div>
  <div class="prow"><span class="pk">Age / Sex</span><span class="pv">${patient.age ? esc(patient.age) + ' yrs' : '—'} / ${esc(patient.gender) || '—'}</span></div>
  <div class="prow"><span class="pk">Guardian</span><span class="pv">${esc(patient.fatherName) || '—'}</span></div>
  <div class="prow"><span class="pk">Contact</span><span class="pv">${esc(patient.phone) || '—'}</span></div>
</div>

<div class="col2">
  <div>
    ${data.primaryComplaint ? `<div class="sub-lbl">Complaint</div><div class="txt">${esc(data.primaryComplaint)}</div>` : ''}
    ${data.history ? `<div class="sub-lbl">History</div><div class="txt">${esc(data.history)}</div>` : ''}
    ${data.examFindings ? `<div class="sub-lbl">Examination</div><div class="txt">${esc(data.examFindings)}</div>` : ''}
    ${data.diagnosis ? `<div class="sub-lbl">Diagnosis</div><div class="dx-name">${esc(data.diagnosis)}</div>` : ''}
    ${vitalsEntries.length ? `<div class="sub-lbl">Vitals</div><div class="vitals-row">${vitalsEntries.map(([k, v]) => `<span class="chip">${vitalsLabel[k]}: <strong>${v}</strong></span>`).join('')}</div>` : ''}
    ${data.allergyHistory ? `<div class="sub-lbl" style="color:#dc2626">⚠ Allergy</div><div class="txt" style="color:#dc2626">${esc(data.allergyHistory)}</div>` : ''}
  </div>
  <div>
    <div class="sub-lbl" style="margin-top:0">Medications</div>
    <table>
      <thead><tr><th>Medicine</th><th>Dose</th><th>Frequency</th><th>Duration</th></tr></thead>
      <tbody>${medRows}</tbody>
    </table>
    ${labTests.length ? `<div class="sub-lbl">Lab Orders</div><div class="chips">${labTests.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
    ${diagnosticTests.length ? `<div class="sub-lbl">Diagnostics</div><div class="chips">${diagnosticTests.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
    ${data.advice ? `<div class="sub-lbl">Advice</div><div class="txt">${esc(data.advice)}</div>` : ''}
  </div>
</div>

<div class="footer-line">
  <div><div class="nxt">Follow-up: _______________</div></div>
  <div>
    <div class="sig-l"></div>
    <div class="sig-t">Signature &amp; Stamp</div>
  </div>
</div>
</body></html>`
}

// ─── Template: Letterhead Classic (letterhead-rx) ──────────
function buildLetterheadClassic(data: PrescriptionPdfData): string {
  const { doctor, settings, patient, items, vitals, labTests = [], diagnosticTests = [] } = data
  const vitalsEntries = Object.entries(vitals || {}).filter(([, v]) => v != null)

  const medRows = items
    .filter(m => m.name?.trim())
    .map(
      (m, i) =>
        `<tr>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:10px"><strong>${i + 1}. ${esc(m.name)}</strong>${m.instruction ? '<br/><span style="font-size:9px;color:#666;font-style:italic">' + esc(m.instruction) + '</span>' : ''}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:10px;text-align:center">${esc(m.dose) || '—'}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:10px">${esc(m.frequency) || '—'}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:10px">${esc(m.duration) || '—'}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:10px">${esc(m.route) || 'Oral'}</td>` +
        `</tr>`,
    )
    .join('')

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&family=Source+Sans+3:wght@300;400;500;600&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Source Sans 3',sans-serif;font-size:11px;color:#1c1c1c;background:#fff;line-height:1.6}
  @page{size:A4;margin:0;padding:0}

  .page{padding:14mm 16mm 18mm;min-height:297mm}
  .letterhead{border-bottom:3px double #1c1c1c;padding-bottom:10px;margin-bottom:12px;display:grid;grid-template-columns:1fr auto}
  .lh-left .hosp{font-family:'Lora',serif;font-size:20px;font-weight:600;letter-spacing:.01em}
  .lh-left .tag{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#888;margin-top:2px}
  .lh-left .contact{font-size:9px;color:#666;margin-top:3px}
  .lh-right{text-align:right}
  .lh-right .dr{font-family:'Lora',serif;font-size:14px;font-weight:500}
  .lh-right .drd{font-size:9px;color:#666;margin-top:2px}
  .rx-header{display:flex;justify-content:space-between;align-items:center;background:#f5f5f0;padding:6px 12px;border:0.5px solid #ddd;border-radius:4px;margin-bottom:10px}
  .rxs{font-family:'Lora',serif;font-size:24px;font-weight:600;color:#1c1c1c}
  .rx-meta{font-size:9px;color:#666;display:flex;gap:16px}
  .pat-grid{display:grid;grid-template-columns:repeat(4,1fr);border:0.5px solid #ddd;border-radius:4px;overflow:hidden;margin-bottom:12px}
  .pc{padding:6px 10px;border-right:0.5px solid #ddd}
  .pc:last-child{border-right:none}
  .pcl{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#888;font-weight:600;margin-bottom:2px}
  .pcv{font-size:10px;font-weight:500}
  .two-col{display:grid;grid-template-columns:155px 1fr;gap:14px;border:0.5px solid #ddd;border-radius:4px;overflow:hidden;margin-bottom:10px}
  .clinical{padding:10px 12px;background:#fafaf7;border-right:0.5px solid #ddd}
  .meds-col{padding:10px 12px}
  .s-lbl{font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:#999;font-weight:600;margin:8px 0 3px;border-bottom:0.5px solid #eee;padding-bottom:2px}
  .s-lbl:first-child{margin-top:0}
  .s-val{font-size:10px;color:#333;line-height:1.65}
  .dx{font-size:11px;font-weight:600;color:#1c1c1c;font-family:'Lora',serif}
  table{width:100%;border-collapse:collapse}
  th{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#999;font-weight:600;padding:3px 8px 3px 0;border-bottom:1px solid #ddd;text-align:left}
  .chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
  .chip{background:#f5f5f0;border:0.5px solid #ddd;border-radius:10px;padding:2px 9px;font-size:9px;color:#444}
  .vchip{display:inline-flex;align-items:center;gap:4px;background:#f5f5f0;border:0.5px solid #ddd;border-radius:3px;padding:2px 7px;font-size:9px;margin:2px}
  .footer{border-top:1px solid #1c1c1c;margin-top:12px;padding-top:10px;display:flex;justify-content:space-between;align-items:flex-end}
  .adv{font-size:10px;color:#333;max-width:340px;line-height:1.65}
  .sig-l{width:120px;border-bottom:0.5px solid #1c1c1c;margin-bottom:3px}
  .sig-t{font-size:8px;color:#999;text-transform:uppercase;letter-spacing:.06em}
  .disclaim{font-size:8px;color:#bbb;text-align:center;margin-top:8px;border-top:0.5px solid #eee;padding-top:6px}
  .nxt{border:0.5px solid #1c1c1c;border-radius:3px;padding:2px 9px;font-size:9px;display:inline-block;margin-top:4px}
  .allergy-warn{background:#fff0f0;border:0.5px solid #fca5a5;border-radius:3px;padding:3px 8px;font-size:9px;color:#dc2626;display:inline-block;margin-top:4px}
</style>
</head><body><div class="page">

<div class="letterhead">
  <div class="lh-left">
    <div class="hosp">${esc(settings.name)}</div>
    <div class="tag">Health Information Management System · OPD Prescription</div>
    <div class="contact">${esc(settings.address)}${settings.phone ? '  ·  Tel: ' + esc(settings.phone) : ''}</div>
  </div>
  <div class="lh-right">
    <div class="dr">${esc(doctor.name || 'Physician')}</div>
    <div class="drd">${esc(doctor.qualification || '')} ${doctor.specialization ? ' · ' + esc(doctor.specialization) : ''}</div>
    ${doctor.departmentName ? `<div class="drd">${esc(doctor.departmentName)}</div>` : ''}
    ${doctor.phone ? `<div class="drd">${esc(doctor.phone)}</div>` : ''}
  </div>
</div>

<div class="rx-header">
  <span class="rxs">℞ Prescription</span>
  <div class="rx-meta">
    <span>Date: <strong>${fmtDate(data.createdAt)}</strong></span>
    ${data.tokenNo ? `<span>Token: <strong>${esc(data.tokenNo)}</strong></span>` : ''}
    <span>MRN: <strong>${esc(patient.mrn)}</strong></span>
  </div>
</div>

<div class="pat-grid">
  <div class="pc"><div class="pcl">Patient Name</div><div class="pcv">${esc(patient.name)}</div></div>
  <div class="pc"><div class="pcl">Age / Gender</div><div class="pcv">${patient.age ? esc(patient.age) + ' yrs' : '—'} / ${esc(patient.gender) || '—'}</div></div>
  <div class="pc"><div class="pcl">Father / Guardian</div><div class="pcv">${esc(patient.fatherName) || '—'}</div></div>
  <div class="pc"><div class="pcl">Contact No.</div><div class="pcv">${esc(patient.phone) || '—'}</div></div>
</div>

<div class="two-col">
  <div class="clinical">
    ${data.primaryComplaint ? `<div class="s-lbl">Chief Complaint</div><div class="s-val">${esc(data.primaryComplaint)}</div>` : ''}
    ${data.history ? `<div class="s-lbl">Medical History</div><div class="s-val">${esc(data.history)}</div>` : ''}
    ${data.examFindings ? `<div class="s-lbl">Examination</div><div class="s-val">${esc(data.examFindings)}</div>` : ''}
    ${data.diagnosis ? `<div class="s-lbl">Diagnosis</div><div class="dx">${esc(data.diagnosis)}</div>` : ''}
    ${vitalsEntries.length ? `<div class="s-lbl">Vitals</div><div style="margin-top:3px">${vitalsEntries.map(([k, v]) => `<div class="vchip"><span style="color:#999">${vitalsLabel[k]}:</span> <strong>${v}</strong></div>`).join('')}</div>` : ''}
    ${data.allergyHistory ? `<div class="s-lbl">Allergy</div><div class="allergy-warn">⚠ ${esc(data.allergyHistory)}</div>` : ''}
    ${data.familyHistory ? `<div class="s-lbl">Family Hx</div><div class="s-val">${esc(data.familyHistory)}</div>` : ''}
  </div>
  <div class="meds-col">
    <div class="s-lbl" style="margin-top:0">Medications</div>
    <table>
      <thead><tr><th style="width:36%">Medicine</th><th>Dose</th><th>Frequency</th><th>Duration</th><th>Route</th></tr></thead>
      <tbody>${medRows}</tbody>
    </table>
    ${labTests.length ? `<div class="s-lbl">Laboratory Orders</div><div class="chips">${labTests.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
    ${diagnosticTests.length ? `<div class="s-lbl">Diagnostic Investigations</div><div class="chips">${diagnosticTests.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
    ${data.advice ? `<div class="s-lbl">Advice</div><div class="s-val">${esc(data.advice)}</div>` : ''}
  </div>
</div>

<div class="footer">
  <div>
    <div class="nxt">Next Visit: _______________</div>
  </div>
  <div style="text-align:center">
    <div style="height:28px"></div>
    <div class="sig-l"></div>
    <div class="sig-t">Signature &amp; Stamp</div>
  </div>
</div>

<div class="disclaim">This prescription is computer-generated under ${esc(settings.name)} HIMS. Valid only with physician stamp and signature.</div>
</div></body></html>`
}

// ─── Internal: run template then optionally apply overlays ────────
async function renderTemplate(data: PrescriptionPdfData, template: PrescriptionPdfTemplate) {
  let html: string = ''
  if (template === 'minimal-rx') html = buildMinimalCompact(data)
  else if (template === 'letterhead-rx') html = buildLetterheadClassic(data)
  else if (template === 'hospital-rx') html = buildModernClinical(data)
  else {
    // Fallback for jsPDF based templates
    switch (template) {
      case 'specialist-clinic':
        await previewSpecialistClinicPdf(data as any)
        return
      case 'minimal-clean':
        await previewMinimalCleanPdf(data as any)
        return
      case 'modern-gradient':
        await previewModernGradientPdf(data as any)
        return
      case 'clinical-professional':
        await previewClinicalProfessionalPdf(data as any)
        return
      case 'premium-dark-header':
        await previewPremiumDarkHeaderPdf(data as any)
        return
      case 'compact-pharmacy':
        await previewCompactPharmacyPdf(data as any)
        return
      case 'pediatric-friendly':
        await previewPediatricFriendlyPdf(data as any)
        return
      case 'template-one':
        const pdf1 = await buildPrescriptionOne(data as any)
        window.open(pdf1.output('bloburl'), '_blank')
        return
      case 'template-two':
        const pdf2 = await buildPrescriptionTwo(data as any)
        window.open(pdf2.output('bloburl'), '_blank')
        return
      default:
        html = buildModernClinical(data)
    }
  }

  if (html) {
    const win = window.open('', '_blank', 'width=900,height=750,scrollbars=yes')
    if (!win) return
    win.document.open()
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { try { win.print() } catch {} }, 800)
  }
}

export async function downloadPrescriptionPdf(data: PrescriptionPdfData, fileName: string, template?: PrescriptionPdfTemplate) {
  // For HTML templates, we just trigger preview/print as standard download isn't directly supported via window.open
  // For jsPDF templates, we can use their specific download logic
  await previewPrescriptionPdf(data, template || 'hospital-rx')
}

export async function previewPrescriptionPdf(data: PrescriptionPdfData, template: PrescriptionPdfTemplate = 'hospital-rx') {
  await renderTemplate(data, template)
}

export function isPrescriptionPdfTemplate(v: any): v is PrescriptionPdfTemplate {
  return PRESCRIPTION_PDF_TEMPLATES.includes(v)
}

export function getSavedPrescriptionPdfTemplate(doctorId?: string | null): PrescriptionPdfTemplate {
  try {
    const k = `doctor.rx.template.${doctorId || 'anon'}`
    const raw = localStorage.getItem(k)
    if (isPrescriptionPdfTemplate(raw)) return raw
  } catch { }
  return 'hospital-rx'
}
