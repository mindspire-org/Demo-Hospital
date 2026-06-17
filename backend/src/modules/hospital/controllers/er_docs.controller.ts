import { Request, Response } from 'express'
import { HospitalEncounter } from '../models/Encounter'
import { HospitalSettings } from '../models/Settings'
import { LabPatient } from '../../lab/models/Patient'
import { HospitalDoctor } from '../models/Doctor'
import { HospitalBed } from '../models/Bed'
import { HospitalFloor } from '../models/Floor'
import { HospitalWard } from '../models/Ward'
import { HospitalRoom } from '../models/Room'

async function getErEncounterOr404(id: string, res: Response) {
  const enc: any = await HospitalEncounter.findById(id).lean()
  if (!enc) {
    res.status(404).json({ error: 'Encounter not found' })
    return null
  }
  if (enc.type !== 'ER') {
    res.status(400).json({ error: 'Not an ER encounter' })
    return null
  }
  return enc
}

export async function printErMedicalRecord(req: Request, res: Response) {
  const { id } = req.params as any
  const enc = await getErEncounterOr404(String(id), res)
  if (!enc) return

  // Fetch all ER records
  const { HospitalErInitialAssessment } = await import('../models/ErInitialAssessment')
  const { HospitalErVital } = await import('../models/ErVital')
  const { HospitalErClinicalNote } = await import('../models/ErClinicalNote')
  const { HospitalErMedicationOrder } = await import('../models/ErMedicationOrder')
  const { HospitalToken } = await import('../models/Token')

  const [initialAssessments, vitals, clinicalNotes, medications, token] = await Promise.all([
    HospitalErInitialAssessment.find({ encounterId: enc._id }).sort({ assessmentTime: -1 }).limit(10).lean(),
    HospitalErVital.find({ encounterId: enc._id }).sort({ recordedAt: -1 }).limit(50).lean(),
    HospitalErClinicalNote.find({ encounterId: enc._id }).sort({ recordedAt: -1 }).limit(50).lean(),
    HospitalErMedicationOrder.find({ encounterId: enc._id }).sort({ createdAt: -1 }).limit(50).lean(),
    enc.tokenId ? HospitalToken.findById(enc.tokenId).lean() : null,
  ])

  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = await LabPatient.findById(enc.patientId).lean()
  const doctor: any = enc.doctorId ? await HospitalDoctor.findById(enc.doctorId).lean() : null
  const bed: any = enc.bedId ? await HospitalBed.findById(enc.bedId).lean() : null
  let bedInfo = '-'
  if (bed) {
    const floor: any = bed.floorId ? await HospitalFloor.findById(bed.floorId).lean() : null
    let locationName = ''
    if (bed.locationType === 'ward' && bed.locationId) {
      const ward: any = await HospitalWard.findById(bed.locationId).lean()
      locationName = ward?.name || ''
    } else if (bed.locationType === 'room' && bed.locationId) {
      const room: any = await HospitalRoom.findById(bed.locationId).lean()
      locationName = room?.name || ''
    }
    const parts: string[] = []
    if (floor?.name) parts.push(floor.name)
    if (locationName) parts.push(locationName)
    if (bed.label) parts.push(`Bed: ${bed.label}`)
    bedInfo = parts.join(' / ') || '-'
  }

  const html = renderErMedicalRecordHTML(settings, enc, patient, doctor, token, bedInfo, initialAssessments, vitals, clinicalNotes, medications)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
}

function renderErMedicalRecordHTML(
  settings: any,
  enc: any,
  patient: any,
  doctor: any,
  token: any,
  bedInfo: string,
  assessments: any[],
  vitals: any[],
  notes: any[],
  meds: any[]
) {
  const fmtDateTime = (d: any) => {
    if (!d) return '-'
    try {
      const x = new Date(d)
      if (isNaN(x.getTime())) return '-'
      return x.toLocaleString()
    } catch {
      return '-'
    }
  }

  // Header
  const logo = settings?.logoDataUrl ? `<img src="${settings.logoDataUrl}" style="height:40px;" />` : ''
  const header = `
    <div style="display:grid; grid-template-columns:1fr auto 1fr; align-items:center; border-bottom:2px solid #dc2626; padding-bottom:8px; margin-bottom:12px;">
      <div style="justify-self:start;">${logo}</div>
      <div style="justify-self:center; text-align:center;">
        <div style="font-size:18px; font-weight:700;">${escapeHtml(settings?.name || 'Hospital')}</div>
        <div style="font-size:11px; color:#555;">${escapeHtml(settings?.address || '')} ${settings?.phone ? '| ' + escapeHtml(settings.phone) : ''}</div>
      </div>
      <div></div>
    </div>
    <div style="background:#dc2626; color:#fff; text-align:center; padding:8px; font-weight:700; font-size:14px; margin-bottom:12px;">EMERGENCY ROOM - MEDICAL RECORD</div>
  `

  // Patient Info
  const tokenNo = token?.tokenNo || enc.tokenNo || ''
  const pInfo = `
    <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:12px;">
      <tr style="background:#fef2f2;">
        <td style="padding:6px; border:1px solid #e5e7eb; font-weight:700;">Token #</td>
        <td style="padding:6px; border:1px solid #e5e7eb;">${escapeHtml(tokenNo)}</td>
        <td style="padding:6px; border:1px solid #e5e7eb; font-weight:700;">MRN</td>
        <td style="padding:6px; border:1px solid #e5e7eb;">${escapeHtml(patient?.mrn || '')}</td>
        <td style="padding:6px; border:1px solid #e5e7eb; font-weight:700;">Patient</td>
        <td style="padding:6px; border:1px solid #e5e7eb;">${escapeHtml(patient?.fullName || '')}</td>
      </tr>
      <tr>
        <td style="padding:6px; border:1px solid #e5e7eb; font-weight:700;">Age</td>
        <td style="padding:6px; border:1px solid #e5e7eb;">${escapeHtml(patient?.age || '')}</td>
        <td style="padding:6px; border:1px solid #e5e7eb; font-weight:700;">Gender</td>
        <td style="padding:6px; border:1px solid #e5e7eb;">${escapeHtml(patient?.gender || '')}</td>
        <td style="padding:6px; border:1px solid #e5e7eb; font-weight:700;">Phone</td>
        <td style="padding:6px; border:1px solid #e5e7eb;">${escapeHtml(patient?.phoneNormalized || '')}</td>
      </tr>
      <tr style="background:#fef2f2;">
        <td style="padding:6px; border:1px solid #e5e7eb; font-weight:700;">Doctor</td>
        <td style="padding:6px; border:1px solid #e5e7eb;">${escapeHtml(doctor?.fullName || doctor?.name || '')}</td>
        <td style="padding:6px; border:1px solid #e5e7eb; font-weight:700;">Triage</td>
        <td style="padding:6px; border:1px solid #e5e7eb;">${escapeHtml((enc.triage || '').toUpperCase())}</td>
        <td style="padding:6px; border:1px solid #e5e7eb; font-weight:700;">Arrival</td>
        <td style="padding:6px; border:1px solid #e5e7eb;">${escapeHtml(enc.arrivalMode || '')}</td>
      </tr>
      <tr>
        <td style="padding:6px; border:1px solid #e5e7eb; font-weight:700;">Check In</td>
        <td style="padding:6px; border:1px solid #e5e7eb;">${fmtDateTime(enc.startAt)}</td>
        <td style="padding:6px; border:1px solid #e5e7eb; font-weight:700;">Discharged</td>
        <td style="padding:6px; border:1px solid #e5e7eb;">${fmtDateTime(enc.endAt)}</td>
        <td style="padding:6px; border:1px solid #e5e7eb; font-weight:700;">Bed Information</td>
        <td style="padding:6px; border:1px solid #e5e7eb;">${escapeHtml(bedInfo)}</td>
      </tr>
    </table>
  `

  // Initial Assessments Section
  let assessmentsSection = ''
  if (assessments.length > 0) {
    const aRows = assessments
      .map((a: any) => `
      <div style="border:1px solid #e5e7eb; border-radius:6px; padding:8px; margin-bottom:8px; background:#fff;">
        <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; margin-bottom:6px;">
          <span><b>Arrival:</b> ${fmtDateTime(a.arrivalTime)} | <b>Assessment:</b> ${fmtDateTime(a.assessmentTime)}</span>
          <span><b>By:</b> ${escapeHtml(a.assessedBy || a.staffName || '-')}</span>
        </div>
        <div style="font-size:11px; margin-bottom:4px;"><b>Chief Complaint:</b> ${escapeHtml(a.chiefComplaint || '-')}</div>
        ${a.historyOfPresentingIllness ? `<div style="font-size:11px; margin-bottom:4px;"><b>History of Presenting Illness:</b> ${nl2br(escapeHtml(a.historyOfPresentingIllness))}</div>` : ''}
        ${a.pastMedicalHistory ? `<div style="font-size:11px; margin-bottom:4px;"><b>Past Medical History:</b> ${nl2br(escapeHtml(a.pastMedicalHistory))}</div>` : ''}
        ${a.medications ? `<div style="font-size:11px; margin-bottom:4px;"><b>Current Medications:</b> ${nl2br(escapeHtml(a.medications))}</div>` : ''}
        ${a.allergies ? `<div style="font-size:11px; margin-bottom:4px;"><b>Allergies:</b> ${escapeHtml(a.allergies)}</div>` : ''}
        ${a.vitals ? `<div style="font-size:11px; margin-bottom:4px;"><b>Vitals at Assessment:</b> BP: ${a.vitals.bp || '-'} | Pulse: ${a.vitals.pulse || '-'} | Temp: ${a.vitals.temp || '-'}°F | RR: ${a.vitals.rr || '-'} | SpO2: ${a.vitals.spo2 || '-'}%${a.vitals.pain ? ` | Pain: ${a.vitals.pain}` : ''}</div>` : ''}
        ${a.nurseNotes ? `<div style="font-size:11px;"><b>Nurse Notes:</b> ${nl2br(escapeHtml(a.nurseNotes))}</div>` : ''}
      </div>
    `)
      .join('')
    assessmentsSection = `
      <div style="background:#fef2f2; padding:6px 10px; font-weight:700; font-size:12px; margin-bottom:8px;">1. Initial Assessment</div>
      ${aRows}
    `
  }

  // Vitals Section
  let vitalsSection = ''
  if (vitals.length > 0) {
    const vRows = vitals
      .map(
        (v: any) => `
      <tr>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${fmtDateTime(v.recordedAt).slice(0, 16)}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(v.shift || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(v.bp || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${v.hr || '-'}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${v.temp || '-'}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${v.rr || '-'}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${v.spo2 || '-'}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${v.bsr || '-'}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(v.intakeIV || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(v.urine || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(v.nurseSign || '-')}</td>
      </tr>
    `
      )
      .join('')
    vitalsSection = `
      <div style="background:#fef2f2; padding:6px 10px; font-weight:700; font-size:12px; margin-bottom:8px;">2. Daily Monitoring (Vitals)</div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Date/Time</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Shift</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">BP</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Pulse</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Temp</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">RR</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">SpO2</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">BSR</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Intake</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Urine</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Nurse</th>
          </tr>
        </thead>
        <tbody>${vRows}</tbody>
      </table>
    `
  }

  // Clinical Notes Section (grouped by type)
  let notesSection = ''
  if (notes.length > 0) {
    const consultantNotes = notes.filter(n => n.type === 'consultant')
    const nursingNotes = notes.filter(n => n.type === 'nursing')
    const progressNotes = notes.filter(n => n.type === 'progress')
    const erNotes = notes.filter(n => n.type === 'er-notes')
    
    const renderNoteGroup = (noteList: any[], title: string) => {
      if (noteList.length === 0) return ''
      const rows = noteList.map((n: any) => {
        const noteText = n.text || n.data?.text || n.data?.note || JSON.stringify(n.data || {})
        return `
        <div style="border:1px solid #e5e7eb; border-radius:6px; padding:8px; margin-bottom:6px; background:#fff;">
          <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; margin-bottom:4px;">
            <span>${fmtDateTime(n.recordedAt)}</span>
            <span>${n.doctorName ? `<b>Dr:</b> ${escapeHtml(n.doctorName)}` : n.createdBy ? `<b>By:</b> ${escapeHtml(n.createdBy)}` : ''}</span>
          </div>
          <div style="font-size:11px;">${nl2br(escapeHtml(noteText))}</div>
        </div>
      `}).join('')
      return `<div style="background:#fef2f2; padding:6px 10px; font-weight:700; font-size:12px; margin-bottom:8px; margin-top:12px;">${title}</div>${rows}`
    }
    
    notesSection = renderNoteGroup(consultantNotes, '3. Consultant Notes')
    notesSection += renderNoteGroup(progressNotes, '4. Progress Notes')
    notesSection += renderNoteGroup(nursingNotes, '5. Nursing Notes')
    notesSection += renderNoteGroup(erNotes, '6. ER Notes')
  }

  // Medications Section
  let medsSection = ''
  if (meds.length > 0) {
    const mRows = meds
      .map(
        (m: any) => `
      <tr>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(m.drugName || m.drugId?.name || '-')}${m.prn ? ' <span style=\"color:#dc2626;\">(PRN)</span>' : ''}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(m.dose || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(m.route || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(m.frequency || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(m.duration || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${m.startAt ? fmtDateTime(m.startAt).slice(0, 16) : '-'}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(m.prescribedBy || '-')}</td>
      </tr>
    `
      )
      .join('')
    medsSection = `
      <div style="background:#fef2f2; padding:6px 10px; font-weight:700; font-size:12px; margin-bottom:8px;">${notes.length > 0 ? '7' : '3'}. Medication Orders</div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:left;">Medicine</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:left;">Dose</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:left;">Route</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:left;">Frequency</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:left;">Duration</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:left;">Start</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:left;">Prescribed By</th>
          </tr>
        </thead>
        <tbody>${mRows}</tbody>
      </table>
    `
  }

  // Footer
  const footer = `
    <div style="margin-top:16px; padding-top:8px; border-top:1px solid #e5e7eb; font-size:10px; color:#64748b; display:flex; justify-content:space-between;">
      <span>Generated: ${new Date().toLocaleString()}</span>
      <span>ER Medical Record</span>
    </div>
  `

  return wrap(`${header}${pInfo}${assessmentsSection}${vitalsSection}${notesSection}${medsSection}${footer}`)
}

function wrap(inner: string) {
  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ER Medical Record</title>
  <style>
    body{font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#0f172a; padding:12px; background:#ffffff; font-size:12px; line-height:1.35;}
    .page{max-width:780px; margin:0 auto;}
    @media print { body { padding: 0; } .page{margin:0 auto;} }
  </style>
  </head><body>
  <div class="page">${inner}</div>
  </body></html>`
}

function nl2br(s: string) {
  return String(s || '').replace(/\n/g, '<br/>')
}

function escapeHtml(s: any) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c])
}
