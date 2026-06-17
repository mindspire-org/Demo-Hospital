import { Request, Response } from 'express'
import { HospitalEncounter } from '../models/Encounter'
import { HospitalSettings } from '../models/Settings'
import { LabPatient } from '../../lab/models/Patient'
import { HospitalDoctor } from '../models/Doctor'
import { HospitalDepartment } from '../models/Department'
import { HospitalBed } from '../models/Bed'
import { HospitalFloor } from '../models/Floor'
import { HospitalWard } from '../models/Ward'
import { HospitalRoom } from '../models/Room'

async function getIpdEncounterOr404(id: string, res: Response) {
  const enc: any = await HospitalEncounter.findById(id).lean()
  if (!enc) {
    res.status(404).json({ error: 'Encounter not found' })
    return null
  }
  if (enc.type !== 'IPD') {
    res.status(400).json({ error: 'Not an IPD encounter' })
    return null
  }
  return enc
}

export async function printIpdMedicalRecord(req: Request, res: Response) {
  const { id } = req.params as any
  const enc = await getIpdEncounterOr404(String(id), res)
  if (!enc) return

  // Dynamically import all IPD models
  const { HospitalIpdVital } = await import('../models/IpdVital')
  const { HospitalIpdClinicalNote } = await import('../models/IpdClinicalNote')
  const { HospitalIpdMedicationOrder } = await import('../models/IpdMedicationOrder')
  const { HospitalIpdConsultation } = await import('../models/IpdConsultation')
  const { HospitalIpdSurgeryRecord } = await import('../models/IpdSurgeryRecord')
  const { HospitalIpdHistoryExam } = await import('../models/IpdHistoryExam')
  const { HospitalIpdBillingItem } = await import('../models/IpdBillingItem')
  const { HospitalIpdPayment } = await import('../models/IpdPayment')
  const { HospitalIpdFluidBalance } = await import('../models/IpdFluidBalance')
  const { HospitalIpdBloodTransfusion } = await import('../models/IpdBloodTransfusion')
  const { HospitalIpdConsentForm } = await import('../models/IpdConsentForm')
  const { HospitalIpdAnesthesiaRecord } = await import('../models/IpdAnesthesiaRecord')
  const { HospitalIpdAnesthesiaPreAssessment } = await import('../models/IpdAnesthesiaPreAssessment')
  const { HospitalIpdAnesthesiaPostOp } = await import('../models/IpdAnesthesiaPostOp')
  const { HospitalIpdSurgicalSafety } = await import('../models/IpdSurgicalSafety')
  const { HospitalIpdIcuMonitoring } = await import('../models/IpdIcuMonitoring')
  const { HospitalIpdDischargeSummary } = await import('../models/IpdDischargeSummary')
  const { HospitalIpdLabLink } = await import('../models/IpdLabLink')
  const { HospitalIpdDocument } = await import('../models/IpdDocument')
  const { HospitalIpdInfectionControl } = await import('../models/IpdInfectionControl')
  const { HospitalIpdOperationConsent } = await import('../models/IpdOperationConsent')

  // Fetch all data in parallel
  const [
    vitals,
    clinicalNotes,
    medications,
    consultations,
    surgeryRecords,
    historyExams,
    billingItems,
    payments,
    fluidBalance,
    bloodTransfusions,
    consentForms,
    anesthesiaRecords,
    anesPreAssessments,
    anesPostOps,
    surgicalSafety,
    icuMonitoring,
    dischargeSummary,
    labLinks,
    documents,
    infectionControls,
    operationConsents,
  ] = await Promise.all([
    HospitalIpdVital.find({ encounterId: enc._id }).sort({ recordedAt: -1 }).limit(100).lean(),
    HospitalIpdClinicalNote.find({ encounterId: enc._id }).sort({ recordedAt: -1 }).limit(50).lean(),
    HospitalIpdMedicationOrder.find({ encounterId: enc._id }).sort({ createdAt: -1 }).limit(100).lean(),
    HospitalIpdConsultation.find({ encounterId: enc._id }).sort({ noteDate: -1, requestedAt: -1 }).limit(50).lean(),
    HospitalIpdSurgeryRecord.find({ encounterId: enc._id }).sort({ surgeryDate: -1 }).lean(),
    HospitalIpdHistoryExam.find({ encounterId: enc._id }).sort({ createdAt: 1 }).lean(),
    HospitalIpdBillingItem.find({ encounterId: enc._id }).sort({ date: 1 }).lean(),
    HospitalIpdPayment.find({ encounterId: enc._id }).sort({ receivedAt: 1 }).lean(),
    HospitalIpdFluidBalance.find({ encounterId: enc._id }).sort({ date: -1 }).limit(30).lean(),
    HospitalIpdBloodTransfusion.find({ encounterId: enc._id }).sort({ transfusionDate: -1 }).lean(),
    HospitalIpdConsentForm.find({ encounterId: enc._id }).sort({ createdAt: -1 }).lean(),
    HospitalIpdAnesthesiaRecord.find({ encounterId: enc._id }).sort({ inductionTime: -1 }).lean(),
    HospitalIpdAnesthesiaPreAssessment.find({ encounterId: enc._id }).sort({ createdAt: -1 }).lean(),
    HospitalIpdAnesthesiaPostOp.find({ encounterId: enc._id }).sort({ createdAt: -1 }).lean(),
    HospitalIpdSurgicalSafety.find({ encounterId: enc._id }).sort({ createdAt: -1 }).lean(),
    HospitalIpdIcuMonitoring.find({ encounterId: enc._id }).sort({ recordedAt: -1 }).limit(50).lean(),
    HospitalIpdDischargeSummary.findOne({ encounterId: enc._id }).lean(),
    HospitalIpdLabLink.find({ encounterId: enc._id }).sort({ createdAt: -1 }).lean(),
    HospitalIpdDocument.find({ encounterId: enc._id }).sort({ createdAt: -1 }).lean(),
    HospitalIpdInfectionControl.find({ encounterId: enc._id }).sort({ createdAt: -1 }).lean(),
    HospitalIpdOperationConsent.find({ encounterId: enc._id }).sort({ createdAt: -1 }).lean(),
  ])

  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = await LabPatient.findById(enc.patientId).lean()
  const doctor: any = enc.doctorId ? await HospitalDoctor.findById(enc.doctorId).lean() : null
  const department: any = enc.departmentId ? await HospitalDepartment.findById(enc.departmentId).lean() : null
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

  const html = renderIpdMedicalRecordHTML(
    settings, enc, patient, doctor, department, bed, bedInfo,
    vitals, clinicalNotes, medications, consultations, surgeryRecords,
    historyExams, billingItems, payments, fluidBalance, bloodTransfusions,
    consentForms, anesthesiaRecords, anesPreAssessments, anesPostOps, surgicalSafety, icuMonitoring,
    dischargeSummary, labLinks, documents, infectionControls, operationConsents
  )
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
}

function renderIpdMedicalRecordHTML(
  settings: any,
  enc: any,
  patient: any,
  doctor: any,
  department: any,
  bed: any,
  bedInfo: string,
  vitals: any[],
  clinicalNotes: any[],
  medications: any[],
  consultations: any[],
  surgeryRecords: any[],
  historyExams: any[],
  billingItems: any[],
  payments: any[],
  fluidBalance: any[],
  bloodTransfusions: any[],
  consentForms: any[],
  anesthesiaRecords: any[],
  anesPreAssessments: any[],
  anesPostOps: any[],
  surgicalSafety: any[],
  icuMonitoring: any[],
  dischargeSummary: any,
  labLinks: any[],
  documents: any[],
  infectionControls: any[],
  operationConsents: any[]
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

  const fmtDate = (d: any) => {
    if (!d) return '-'
    try {
      const x = new Date(d)
      if (isNaN(x.getTime())) return '-'
      return x.toLocaleDateString()
    } catch {
      return '-'
    }
  }

  // Header
  const logo = settings?.logoDataUrl ? `<img src="${settings.logoDataUrl}" style="height:40px;" />` : ''
  const header = `
    <div style="display:grid; grid-template-columns:1fr auto 1fr; align-items:center; border-bottom:2px solid #1e40af; padding-bottom:8px; margin-bottom:12px;">
      <div style="justify-self:start;">${logo}</div>
      <div style="justify-self:center; text-align:center;">
        <div style="font-size:18px; font-weight:700;">${escapeHtml(settings?.name || 'Hospital')}</div>
        <div style="font-size:11px; color:#555;">${escapeHtml(settings?.address || '')} ${settings?.phone ? '| ' + escapeHtml(settings.phone) : ''}</div>
      </div>
      <div></div>
    </div>
    <div style="background:#1e40af; color:#fff; text-align:center; padding:8px; font-weight:700; font-size:14px; margin-bottom:12px;">INPATIENT - COMPLETE MEDICAL RECORD</div>
  `

  // Patient Info
  const pInfo = `
    <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:12px;">
      <tr style="background:#eff6ff;">
        <td style="padding:6px; border:1px solid #e5e7eb; font-weight:700;">Admission #</td>
        <td style="padding:6px; border:1px solid #e5e7eb;">${escapeHtml(enc.admissionNo || '')}</td>
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
      <tr style="background:#eff6ff;">
        <td style="padding:6px; border:1px solid #e5e7eb; font-weight:700;">Doctor</td>
        <td style="padding:6px; border:1px solid #e5e7eb;">${escapeHtml(doctor?.fullName || doctor?.name || '')}</td>
        <td style="padding:6px; border:1px solid #e5e7eb; font-weight:700;">Department</td>
        <td style="padding:6px; border:1px solid #e5e7eb;">${escapeHtml(department?.name || '')}</td>
        <td style="padding:6px; border:1px solid #e5e7eb; font-weight:700;">Bed Information</td>
        <td style="padding:6px; border:1px solid #e5e7eb;">${escapeHtml(bedInfo)}</td>
      </tr>
      <tr>
        <td style="padding:6px; border:1px solid #e5e7eb; font-weight:700;">Admitted</td>
        <td style="padding:6px; border:1px solid #e5e7eb;">${fmtDateTime(enc.startAt)}</td>
        <td style="padding:6px; border:1px solid #e5e7eb;"></td>
        <td style="padding:6px; border:1px solid #e5e7eb;"></td>
        <td style="padding:6px; border:1px solid #e5e7eb; font-weight:700;">Status</td>
        <td style="padding:6px; border:1px solid #e5e7eb;">${escapeHtml(enc.status || '')}</td>
      </tr>
    </table>
  `

  // Section counter
  let sectionNum = 1

  // 1. History & Examination Section
  let historySection = ''
  if (historyExams.length > 0) {
    const hRows = historyExams.map((h: any) => `
      <div style="border:1px solid #e5e7eb; border-radius:6px; padding:10px; margin-bottom:10px; background:#fff;">
        <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; margin-bottom:8px;">
          <span><b>Type:</b> ${escapeHtml(h.examType || 'Admission')} | <b>Date:</b> ${fmtDateTime(h.createdAt)}</span>
          <span><b>Doctor:</b> ${escapeHtml(h.doctorName || '-')}</span>
        </div>
        ${h.chiefComplaint ? `<div style="font-size:11px; margin-bottom:4px;"><b>Chief Complaint:</b> ${escapeHtml(h.chiefComplaint)}</div>` : ''}
        ${h.historyOfPresentIllness ? `<div style="font-size:11px; margin-bottom:4px;"><b>History of Present Illness:</b> ${nl2br(escapeHtml(h.historyOfPresentIllness))}</div>` : ''}
        ${h.pastMedicalHistory ? `<div style="font-size:11px; margin-bottom:4px;"><b>Past Medical History:</b> ${nl2br(escapeHtml(h.pastMedicalHistory))}</div>` : ''}
        ${h.pastSurgicalHistory ? `<div style="font-size:11px; margin-bottom:4px;"><b>Past Surgical History:</b> ${nl2br(escapeHtml(h.pastSurgicalHistory))}</div>` : ''}
        ${h.familyHistory ? `<div style="font-size:11px; margin-bottom:4px;"><b>Family History:</b> ${escapeHtml(h.familyHistory)}</div>` : ''}
        ${h.allergyHistory && h.allergyHistory.length > 0 ? `<div style="font-size:11px; margin-bottom:4px;"><b>Allergies:</b> ${h.allergyHistory.map((a: any) => `${a.allergen} (${a.reaction || '-'})`).join(', ')}</div>` : ''}
        ${h.vitals ? `<div style="font-size:11px; margin-bottom:4px;"><b>Vitals:</b> BP: ${h.vitals.bp || '-'} | HR: ${h.vitals.hr || '-'} | Temp: ${h.vitals.temp || '-'}°C | SpO2: ${h.vitals.spo2 || '-'}%${h.vitals.weight ? ` | Wt: ${h.vitals.weight}kg` : ''}${h.vitals.height ? ` | Ht: ${h.vitals.height}cm` : ''}</div>` : ''}
        ${h.generalAppearance ? `<div style="font-size:11px; margin-bottom:4px;"><b>General Appearance:</b> ${escapeHtml(h.generalAppearance)}</div>` : ''}
        ${h.cardiovascular ? `<div style="font-size:11px; margin-bottom:4px;"><b>Cardiovascular:</b> ${escapeHtml(h.cardiovascular)}</div>` : ''}
        ${h.respiratory ? `<div style="font-size:11px; margin-bottom:4px;"><b>Respiratory:</b> ${escapeHtml(h.respiratory)}</div>` : ''}
        ${h.abdominal ? `<div style="font-size:11px; margin-bottom:4px;"><b>Abdominal:</b> ${escapeHtml(h.abdominal)}</div>` : ''}
        ${h.neurological ? `<div style="font-size:11px; margin-bottom:4px;"><b>Neurological:</b> ${escapeHtml(h.neurological)}</div>` : ''}
        ${h.provisionalDiagnosis ? `<div style="font-size:11px; margin-bottom:4px;"><b>Provisional Diagnosis:</b> ${escapeHtml(h.provisionalDiagnosis)}</div>` : ''}
        ${h.finalDiagnosis ? `<div style="font-size:11px; margin-bottom:4px;"><b>Final Diagnosis:</b> ${escapeHtml(h.finalDiagnosis)}</div>` : ''}
        ${h.treatmentPlan ? `<div style="font-size:11px;"><b>Treatment Plan:</b> ${nl2br(escapeHtml(h.treatmentPlan))}</div>` : ''}
      </div>
    `).join('')
    historySection = `
      <div style="background:#eff6ff; padding:6px 10px; font-weight:700; font-size:12px; margin-bottom:8px;">${sectionNum++}. History & Examination</div>
      ${hRows}
    `
  }

  // 2. Vitals Section
  let vitalsSection = ''
  if (vitals.length > 0) {
    const vRows = vitals.map((v: any) => `
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
    `).join('')
    vitalsSection = `
      <div style="background:#eff6ff; padding:6px 10px; font-weight:700; font-size:12px; margin-bottom:8px; margin-top:12px;">${sectionNum++}. Daily Vitals Monitoring</div>
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

  // 3. Clinical Notes Section
  let notesSection = ''
  if (clinicalNotes.length > 0) {
    const nRows = clinicalNotes.map((n: any) => `
      <div style="border:1px solid #e5e7eb; border-radius:6px; padding:8px; margin-bottom:6px; background:#fff;">
        <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; margin-bottom:4px;">
          <span>${fmtDateTime(n.recordedAt)} | ${escapeHtml(n.type || 'Note')}</span>
          <span>${n.consultantName ? `<b>Dr:</b> ${escapeHtml(n.consultantName)}` : n.recordedBy ? `<b>By:</b> ${escapeHtml(n.recordedBy)}` : ''}</span>
        </div>
        ${n.title ? `<div style="font-size:11px; font-weight:600; margin-bottom:4px;">${escapeHtml(n.title)}</div>` : ''}
        ${n.content ? `<div style="font-size:11px; margin-bottom:4px;">${nl2br(escapeHtml(n.content))}</div>` : ''}
        ${n.findings ? `<div style="font-size:11px; margin-bottom:4px;"><b>Findings:</b> ${nl2br(escapeHtml(n.findings))}</div>` : ''}
        ${n.diagnosis ? `<div style="font-size:11px; margin-bottom:4px;"><b>Diagnosis:</b> ${escapeHtml(n.diagnosis)}</div>` : ''}
        ${n.recommendations ? `<div style="font-size:11px;"><b>Recommendations:</b> ${nl2br(escapeHtml(n.recommendations))}</div>` : ''}
      </div>
    `).join('')
    notesSection = `
      <div style="background:#eff6ff; padding:6px 10px; font-weight:700; font-size:12px; margin-bottom:8px; margin-top:12px;">${sectionNum++}. Clinical Notes</div>
      ${nRows}
    `
  }

  // 4. Consultations / Daily Progress Section
  let consultSection = ''
  if (consultations.length > 0) {
    const dailyProgress = consultations.filter(c => c.type === 'daily-progress')
    const consults = consultations.filter(c => c.type === 'consultation')
    
    let consultHtml = ''
    
    if (dailyProgress.length > 0) {
      const dpRows = dailyProgress.map((c: any) => `
        <div style="border:1px solid #e5e7eb; border-radius:6px; padding:8px; margin-bottom:6px; background:#fff;">
          <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; margin-bottom:4px;">
            <span>${fmtDate(c.noteDate)}</span>
            <span><b>Dr:</b> ${escapeHtml(c.doctorName || '-')}</span>
          </div>
          ${c.subjective ? `<div style="font-size:11px; margin-bottom:4px;"><b>S:</b> ${nl2br(escapeHtml(c.subjective))}</div>` : ''}
          ${c.objective ? `<div style="font-size:11px; margin-bottom:4px;"><b>O:</b> ${nl2br(escapeHtml(c.objective))}</div>` : ''}
          ${c.assessment ? `<div style="font-size:11px; margin-bottom:4px;"><b>A:</b> ${nl2br(escapeHtml(c.assessment))}</div>` : ''}
          ${c.plan ? `<div style="font-size:11px;"><b>P:</b> ${nl2br(escapeHtml(c.plan))}</div>` : ''}
        </div>
      `).join('')
      consultHtml += `<div style="font-weight:600; font-size:11px; margin:8px 0 4px; color:#1e40af;">Daily Progress Notes</div>${dpRows}`
    }
    
    if (consults.length > 0) {
      const cRows = consults.map((c: any) => `
        <div style="border:1px solid #e5e7eb; border-radius:6px; padding:8px; margin-bottom:6px; background:#fff;">
          <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; margin-bottom:4px;">
            <span>${fmtDateTime(c.requestedAt)} | <b>Urgency:</b> ${escapeHtml(c.urgency || 'routine')}</span>
            <span><b>Consultant:</b> ${escapeHtml(c.consultantDoctorName || '-')}</span>
          </div>
          ${c.reasonForConsult ? `<div style="font-size:11px; margin-bottom:4px;"><b>Reason:</b> ${nl2br(escapeHtml(c.reasonForConsult))}</div>` : ''}
          ${c.clinicalSummary ? `<div style="font-size:11px; margin-bottom:4px;"><b>Clinical Summary:</b> ${nl2br(escapeHtml(c.clinicalSummary))}</div>` : ''}
          ${c.findings ? `<div style="font-size:11px; margin-bottom:4px;"><b>Findings:</b> ${nl2br(escapeHtml(c.findings))}</div>` : ''}
          ${c.diagnosis ? `<div style="font-size:11px; margin-bottom:4px;"><b>Diagnosis:</b> ${escapeHtml(c.diagnosis)}</div>` : ''}
          ${c.recommendations ? `<div style="font-size:11px;"><b>Recommendations:</b> ${nl2br(escapeHtml(c.recommendations))}</div>` : ''}
        </div>
      `).join('')
      consultHtml += `<div style="font-weight:600; font-size:11px; margin:8px 0 4px; color:#1e40af;">Consultations</div>${cRows}`
    }
    
    consultSection = `
      <div style="background:#eff6ff; padding:6px 10px; font-weight:700; font-size:12px; margin-bottom:8px; margin-top:12px;">${sectionNum++}. Consultations & Progress Notes</div>
      ${consultHtml}
    `
  }

  // 5. Medication Orders Section
  let medsSection = ''
  if (medications.length > 0) {
    const mRows = medications.map((m: any) => `
      <tr>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(m.drugName || '-')}${m.prn ? ' <span style="color:#dc2626;">(PRN)</span>' : ''}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(m.dose || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(m.route || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(m.frequency || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(m.duration || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${m.startAt ? fmtDate(m.startAt) : '-'}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(m.status || 'active')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(m.prescribedBy || '-')}</td>
      </tr>
    `).join('')
    medsSection = `
      <div style="background:#eff6ff; padding:6px 10px; font-weight:700; font-size:12px; margin-bottom:8px; margin-top:12px;">${sectionNum++}. Medication Orders</div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:left;">Medicine</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:left;">Dose</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:left;">Route</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:left;">Frequency</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:left;">Duration</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:left;">Start</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:left;">Status</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:left;">Prescribed By</th>
          </tr>
        </thead>
        <tbody>${mRows}</tbody>
      </table>
    `
  }

  // 6. Surgery Records Section
  let surgerySection = ''
  if (surgeryRecords.length > 0) {
    const sRows = surgeryRecords.map((s: any) => `
      <div style="border:1px solid #e5e7eb; border-radius:6px; padding:10px; margin-bottom:10px; background:#fff;">
        <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; margin-bottom:8px;">
          <span><b>Date:</b> ${fmtDate(s.surgeryDate)} | <b>Type:</b> ${escapeHtml(s.surgeryType || '-')}</span>
          <span><b>Status:</b> ${escapeHtml(s.status || '-')}</span>
        </div>
        ${s.diagnosis ? `<div style="font-size:11px; margin-bottom:4px;"><b>Diagnosis:</b> ${escapeHtml(s.diagnosis)}</div>` : ''}
        ${s.procedures && s.procedures.length > 0 ? `<div style="font-size:11px; margin-bottom:4px;"><b>Procedures:</b> ${s.procedures.map((p: any) => escapeHtml(p.name || '-')).join(', ')}</div>` : ''}
        <div style="font-size:11px; margin-bottom:4px;">
          <b>Team:</b> Surgeon: ${escapeHtml(s.surgeonName || '-')} | Asst: ${escapeHtml(s.assistantSurgeon || '-')} | Anesth: ${escapeHtml(s.anesthesiologistName || '-')}
        </div>
        ${s.preOpDiagnosis ? `<div style="font-size:11px; margin-bottom:4px;"><b>Pre-Op Diagnosis:</b> ${escapeHtml(s.preOpDiagnosis)}</div>` : ''}
        ${s.intraOpFindings ? `<div style="font-size:11px; margin-bottom:4px;"><b>Intra-Op Findings:</b> ${nl2br(escapeHtml(s.intraOpFindings))}</div>` : ''}
        ${s.intraOpComplications ? `<div style="font-size:11px; margin-bottom:4px; color:#dc2626;"><b>Complications:</b> ${escapeHtml(s.intraOpComplications)}</div>` : ''}
        ${s.bloodLoss ? `<div style="font-size:11px; margin-bottom:4px;"><b>Blood Loss:</b> ${escapeHtml(s.bloodLoss)}</div>` : ''}
        ${s.postOpDiagnosis ? `<div style="font-size:11px; margin-bottom:4px;"><b>Post-Op Diagnosis:</b> ${escapeHtml(s.postOpDiagnosis)}</div>` : ''}
        ${s.postOpInstructions ? `<div style="font-size:11px;"><b>Post-Op Instructions:</b> ${nl2br(escapeHtml(s.postOpInstructions))}</div>` : ''}
      </div>
    `).join('')
    surgerySection = `
      <div style="background:#eff6ff; padding:6px 10px; font-weight:700; font-size:12px; margin-bottom:8px; margin-top:12px;">${sectionNum++}. Surgery Records</div>
      ${sRows}
    `
  }

  // 7. Anesthesia Records Section
  let anesthesiaSection = ''
  const hasAnesData = anesPreAssessments.length > 0 || anesthesiaRecords.length > 0 || anesPostOps.length > 0
  if (hasAnesData) {
    let anesHtml = ''
    // Pre-Assessments
    if (anesPreAssessments.length > 0) {
      anesHtml += `<div style="font-size:11px; font-weight:600; margin:6px 0 4px;">Pre-Assessment</div>`
      anesHtml += anesPreAssessments.map((p: any) => `
        <div style="border:1px solid #e5e7eb; border-radius:6px; padding:10px; margin-bottom:10px; background:#fff;">
          <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; margin-bottom:8px;">
            <span><b>ASA:</b> ${p.physicalExam?.asaClass || '-'} | <b>Mallampati:</b> ${p.physicalExam?.mallampatiScore || '-'}</span>
            <span>${fmtDateTime(p.createdAt)}</span>
          </div>
          <div style="font-size:11px; margin-bottom:4px;"><b>Anesthesiologist:</b> ${escapeHtml(p.anesthesiologistName || '-')}</div>
          ${p.existingProblems ? `<div style="font-size:11px; margin-bottom:4px;"><b>Problems:</b> ${[p.existingProblems.cvs, p.existingProblems.renal, p.existingProblems.respiration, p.existingProblems.hepatic, p.existingProblems.diabetic].filter(Boolean).join(', ') || '-'}</div>` : ''}
          ${p.physicalExam ? `<div style="font-size:11px; margin-bottom:4px;"><b>Exam:</b> BP ${p.physicalExam.bp || '-'} / Pulse ${p.physicalExam.pulse || '-'} / Temp ${p.physicalExam.temp || '-'}</div>` : ''}
          ${p.plan ? `<div style="font-size:11px; margin-bottom:4px;"><b>Plan:</b> ${[p.plan.general && 'General', p.plan.spinal && 'Spinal', p.plan.local && 'Local'].filter(Boolean).join(', ') || '-'} | NPO: ${p.plan.npo || '-'}</div>` : ''}
          ${p.preInduction ? `<div style="font-size:11px;"><b>Pre-Induction:</b> BP ${p.preInduction.bp || '-'} / Pulse ${p.preInduction.pulse || '-'} / SpO2 ${p.preInduction.spo2 || '-'}</div>` : ''}
        </div>
      `).join('')
    }
    // Intra-Op Records
    if (anesthesiaRecords.length > 0) {
      anesHtml += `<div style="font-size:11px; font-weight:600; margin:6px 0 4px;">Intra-Operative</div>`
      anesHtml += anesthesiaRecords.map((a: any) => `
        <div style="border:1px solid #e5e7eb; border-radius:6px; padding:10px; margin-bottom:10px; background:#fff;">
          <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; margin-bottom:8px;">
            <span><b>Type:</b> ${escapeHtml(a.anesthesiaType || '-')} | <b>Technique:</b> ${escapeHtml(a.anesthesiaTechnique || '-')}</span>
            <span>${a.inductionTime ? fmtDateTime(a.inductionTime) : '-'}</span>
          </div>
          <div style="font-size:11px; margin-bottom:4px;"><b>Anesthesiologist:</b> ${escapeHtml(a.anesthesiologistName || '-')}</div>
          ${a.airwayManagement ? `<div style="font-size:11px; margin-bottom:4px;"><b>Airway:</b> ${escapeHtml(a.airwayManagement.type || '-')} (${a.airwayManagement.size || '-'})</div>` : ''}
          ${a.totalBloodLoss ? `<div style="font-size:11px; margin-bottom:4px;"><b>Blood Loss:</b> ${escapeHtml(a.totalBloodLoss)}</div>` : ''}
          ${a.totalUrineOutput ? `<div style="font-size:11px; margin-bottom:4px;"><b>Urine Output:</b> ${escapeHtml(a.totalUrineOutput)}</div>` : ''}
          ${(a.vitalPeriods && a.vitalPeriods.length > 0) ? `<div style="font-size:10px; margin-bottom:4px;"><b>Vitals:</b> ${a.vitalPeriods.length} readings recorded</div>` : ''}
        </div>
      `).join('')
    }
    // Post-Op Records
    if (anesPostOps.length > 0) {
      anesHtml += `<div style="font-size:11px; font-weight:600; margin:6px 0 4px;">Post-Operative</div>`
      anesHtml += anesPostOps.map((p: any) => `
        <div style="border:1px solid #e5e7eb; border-radius:6px; padding:10px; margin-bottom:10px; background:#fff;">
          <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; margin-bottom:8px;">
            <span><b>Status:</b> ${p.status || '-'}</span>
            <span>${fmtDateTime(p.createdAt)}</span>
          </div>
          <div style="font-size:11px; margin-bottom:4px;"><b>Anesthesiologist:</b> ${escapeHtml(p.anesthesiologistName || '-')}</div>
          ${p.recovery ? `<div style="font-size:11px; margin-bottom:4px;"><b>Recovery:</b> LOC ${p.recovery.loc || '-'} / BP ${p.recovery.bp || '-'} / SpO2 ${p.recovery.spo2 || '-'}</div>` : ''}
          ${p.postRecovery ? `<div style="font-size:11px; margin-bottom:4px;"><b>Post-Recovery:</b> BP ${p.postRecovery.bp || '-'} / Aldrete ${p.postRecovery.aldreteScore || '-'}</div>` : ''}
          ${p.complications && p.complications.length > 0 ? `<div style="font-size:11px; margin-bottom:4px; color:#dc2626;"><b>Complications:</b> ${p.complications.join(', ')}</div>` : ''}
          ${p.postRecovery?.postOpAnalgesia ? `<div style="font-size:11px;"><b>Post-Op Analgesia:</b> ${escapeHtml(p.postRecovery.postOpAnalgesia)}</div>` : ''}
        </div>
      `).join('')
    }
    anesthesiaSection = `
      <div style="background:#eff6ff; padding:6px 10px; font-weight:700; font-size:12px; margin-bottom:8px; margin-top:12px;">${sectionNum++}. Anesthesia Records</div>
      ${anesHtml}
    `
  }

  // 8. Blood Transfusion Section
  let transfusionSection = ''
  if (bloodTransfusions.length > 0) {
    const bRows = bloodTransfusions.map((b: any) => `
      <div style="border:1px solid #e5e7eb; border-radius:6px; padding:10px; margin-bottom:10px; background:#fff;">
        <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; margin-bottom:8px;">
          <span><b>Date:</b> ${fmtDate(b.transfusionDate)}</span>
          <span><b>Status:</b> ${escapeHtml(b.status || '-')}</span>
        </div>
        <div style="font-size:11px; margin-bottom:4px;">
          <b>Product:</b> ${escapeHtml(b.bloodProduct?.type || '-')} | Blood Group: ${escapeHtml(b.bloodProduct?.bloodGroup || '-')} | Units: ${b.bloodProduct?.units || 1}
        </div>
        ${b.indication ? `<div style="font-size:11px; margin-bottom:4px;"><b>Indication:</b> ${escapeHtml(b.indication)}</div>` : ''}
        ${b.bloodProduct?.bagNumber ? `<div style="font-size:11px; margin-bottom:4px;"><b>Bag #:</b> ${escapeHtml(b.bloodProduct.bagNumber)}</div>` : ''}
        ${b.startTime ? `<div style="font-size:11px; margin-bottom:4px;"><b>Time:</b> ${escapeHtml(b.startTime)} - ${escapeHtml(b.endTime || '-')}</div>` : ''}
        ${b.reactionOccurred ? `<div style="font-size:11px; margin-bottom:4px; color:#dc2626;"><b>Reaction:</b> ${escapeHtml(b.reactionType || '-')} (${b.reactionSeverity || '-'})</div>` : ''}
        <div style="font-size:11px;"><b>Ordered By:</b> ${escapeHtml(b.orderedByDoctorName || '-')} | <b>Administered By:</b> ${escapeHtml(b.administeredBy || '-')}</div>
      </div>
    `).join('')
    transfusionSection = `
      <div style="background:#eff6ff; padding:6px 10px; font-weight:700; font-size:12px; margin-bottom:8px; margin-top:12px;">${sectionNum++}. Blood Transfusions</div>
      ${bRows}
    `
  }

  // 9. Fluid Balance Section
  let fluidSection = ''
  if (fluidBalance.length > 0) {
    const fRows = fluidBalance.map((f: any) => `
      <tr>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${fmtDate(f.date)}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(f.shift || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${f.intake?.total || 0}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${f.output?.total || 0}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${f.netBalance || 0}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${f.cumulativeBalance || 0}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(f.recordedBy || '-')}</td>
      </tr>
    `).join('')
    fluidSection = `
      <div style="background:#eff6ff; padding:6px 10px; font-weight:700; font-size:12px; margin-bottom:8px; margin-top:12px;">${sectionNum++}. Fluid Balance</div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Date</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Shift</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Intake (ml)</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Output (ml)</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Net</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Cumulative</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Recorded By</th>
          </tr>
        </thead>
        <tbody>${fRows}</tbody>
      </table>
    `
  }

  // 10. ICU Monitoring Section
  let icuSection = ''
  if (icuMonitoring.length > 0) {
    const iRows = icuMonitoring.map((i: any) => `
      <tr>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${fmtDateTime(i.recordedAt).slice(0, 16)}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(i.shift || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(i.vitals?.bp || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${i.vitals?.hr || '-'}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${i.vitals?.spo2 || '-'}%</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${i.neurological?.gcs?.total || '-'}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(i.ventilator?.mode || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${i.fluidBalance?.netBalance || 0}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(i.recordedBy || '-')}</td>
      </tr>
    `).join('')
    icuSection = `
      <div style="background:#eff6ff; padding:6px 10px; font-weight:700; font-size:12px; margin-bottom:8px; margin-top:12px;">${sectionNum++}. ICU Monitoring</div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Date/Time</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Shift</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">BP</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">HR</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">SpO2</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">GCS</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Vent Mode</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Fluid Net</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Recorded By</th>
          </tr>
        </thead>
        <tbody>${iRows}</tbody>
      </table>
    `
  }

  // 11. Consent Forms Section
  let consentSection = ''
  if (consentForms.length > 0 || operationConsents.length > 0) {
    const allConsents = [...consentForms, ...operationConsents]
    const cRows = allConsents.map((c: any) => `
      <div style="border:1px solid #e5e7eb; border-radius:6px; padding:8px; margin-bottom:6px; background:#fff;">
        <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; margin-bottom:4px;">
          <span><b>Type:</b> ${escapeHtml(c.formType || c.type || '-')}</span>
          <span><b>Status:</b> ${escapeHtml(c.status || '-')}</span>
        </div>
        ${c.formTitle || c.title ? `<div style="font-size:11px; margin-bottom:4px;"><b>Title:</b> ${escapeHtml(c.formTitle || c.title)}</div>` : ''}
        ${c.procedureName ? `<div style="font-size:11px; margin-bottom:4px;"><b>Procedure:</b> ${escapeHtml(c.procedureName)}</div>` : ''}
        <div style="font-size:11px;"><b>Patient Signed:</b> ${c.patientSignedAt ? fmtDateTime(c.patientSignedAt) : 'No'} | <b>Doctor:</b> ${escapeHtml(c.doctorName || '-')}</div>
      </div>
    `).join('')
    consentSection = `
      <div style="background:#eff6ff; padding:6px 10px; font-weight:700; font-size:12px; margin-bottom:8px; margin-top:12px;">${sectionNum++}. Consent Forms</div>
      ${cRows}
    `
  }

  // 12. Lab Links Section
  let labSection = ''
  if (labLinks.length > 0) {
    const lRows = labLinks.map((l: any) => `
      <tr>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${fmtDateTime(l.createdAt)}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(l.testName || l.labId || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(l.status || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(l.orderedBy || '-')}</td>
      </tr>
    `).join('')
    labSection = `
      <div style="background:#eff6ff; padding:6px 10px; font-weight:700; font-size:12px; margin-bottom:8px; margin-top:12px;">${sectionNum++}. Lab Tests</div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Date</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Test</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Status</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Ordered By</th>
          </tr>
        </thead>
        <tbody>${lRows}</tbody>
      </table>
    `
  }

  // 13. Documents Section
  let docsSection = ''
  if (documents.length > 0) {
    const dRows = documents.map((d: any) => `
      <tr>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${fmtDateTime(d.createdAt)}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(d.title || d.type || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(d.uploadedBy || '-')}</td>
      </tr>
    `).join('')
    docsSection = `
      <div style="background:#eff6ff; padding:6px 10px; font-weight:700; font-size:12px; margin-bottom:8px; margin-top:12px;">${sectionNum++}. Documents</div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Date</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Title</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Uploaded By</th>
          </tr>
        </thead>
        <tbody>${dRows}</tbody>
      </table>
    `
  }

  // 14. Billing Items Section
  let billingSection = ''
  if (billingItems.length > 0) {
    const bRows = billingItems.map((b: any) => `
      <tr>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${fmtDate(b.date)}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(b.type || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(b.description || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:right;">${b.qty || 1}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:right;">${b.unitPrice || 0}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:right;">${b.amount || 0}</td>
      </tr>
    `).join('')
    const subtotal = billingItems.reduce((s, i) => s + Number(i.amount || 0), 0)
    billingSection = `
      <div style="background:#eff6ff; padding:6px 10px; font-weight:700; font-size:12px; margin-bottom:8px; margin-top:12px;">${sectionNum++}. Billing Items</div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Date</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Type</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Description</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px; text-align:right;">Qty</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px; text-align:right;">Unit Price</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>${bRows}</tbody>
        <tfoot>
          <tr style="background:#f1f5f9; font-weight:700;">
            <td colspan="5" style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:right;">Subtotal:</td>
            <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:right;">Rs. ${subtotal}</td>
          </tr>
        </tfoot>
      </table>
    `
  }

  // 15. Payments Section
  let paymentsSection = ''
  if (payments.length > 0) {
    const pRows = payments.map((p: any) => `
      <tr>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${fmtDateTime(p.receivedAt)}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(p.type || 'payment')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:right;">Rs. ${p.amount}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(p.method || '-')}</td>
        <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${escapeHtml(p.receivedBy || '-')}</td>
      </tr>
    `).join('')
    const totalPaid = payments.filter(p => p.type !== 'refund').reduce((s, p) => s + Number(p.amount || 0), 0)
    const totalRefund = payments.filter(p => p.type === 'refund').reduce((s, p) => s + Number(p.amount || 0), 0)
    paymentsSection = `
      <div style="background:#eff6ff; padding:6px 10px; font-weight:700; font-size:12px; margin-bottom:8px; margin-top:12px;">${sectionNum++}. Payments</div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Date</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Type</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px; text-align:right;">Amount</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Method</th>
            <th style="padding:4px; border:1px solid #e5e7eb; font-size:9px;">Received By</th>
          </tr>
        </thead>
        <tbody>${pRows}</tbody>
        <tfoot>
          <tr style="background:#f1f5f9; font-weight:700;">
            <td colspan="2" style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">Total Paid:</td>
            <td style="padding:4px; border:1px solid #e5e7eb; font-size:10px; text-align:right;">Rs. ${totalPaid - totalRefund}</td>
            <td colspan="2" style="padding:4px; border:1px solid #e5e7eb; font-size:10px;">${enc.deposit ? `Deposit: Rs. ${enc.deposit}` : ''}</td>
          </tr>
        </tfoot>
      </table>
    `
  }

  // 16. Discharge Summary Section
  let dischargeSection = ''
  if (dischargeSummary) {
    dischargeSection = `
      <div style="background:#eff6ff; padding:6px 10px; font-weight:700; font-size:12px; margin-bottom:8px; margin-top:12px;">${sectionNum++}. Discharge Summary</div>
      <div style="border:1px solid #e5e7eb; border-radius:6px; padding:10px; margin-bottom:10px; background:#fff;">
        ${dischargeSummary.diagnosis ? `<div style="font-size:11px; margin-bottom:6px;"><b>Diagnosis:</b> ${nl2br(escapeHtml(dischargeSummary.diagnosis))}</div>` : ''}
        ${dischargeSummary.courseInHospital ? `<div style="font-size:11px; margin-bottom:6px;"><b>Course in Hospital:</b> ${nl2br(escapeHtml(dischargeSummary.courseInHospital))}</div>` : ''}
        ${dischargeSummary.procedures && dischargeSummary.procedures.length > 0 ? `<div style="font-size:11px; margin-bottom:6px;"><b>Procedures:</b> ${dischargeSummary.procedures.join(', ')}</div>` : ''}
        ${dischargeSummary.conditionAtDischarge ? `<div style="font-size:11px; margin-bottom:6px;"><b>Condition at Discharge:</b> ${escapeHtml(dischargeSummary.conditionAtDischarge)}</div>` : ''}
        ${dischargeSummary.medications && dischargeSummary.medications.length > 0 ? `<div style="font-size:11px; margin-bottom:6px;"><b>Discharge Medications:</b> ${dischargeSummary.medications.join(', ')}</div>` : ''}
        ${dischargeSummary.advice ? `<div style="font-size:11px; margin-bottom:6px;"><b>Advice:</b> ${nl2br(escapeHtml(dischargeSummary.advice))}</div>` : ''}
        ${dischargeSummary.followUpDate ? `<div style="font-size:11px;"><b>Follow-up:</b> ${fmtDate(dischargeSummary.followUpDate)}</div>` : ''}
      </div>
    `
  }

  // Footer
  const footer = `
    <div style="margin-top:16px; padding-top:8px; border-top:1px solid #e5e7eb; font-size:10px; color:#64748b; display:flex; justify-content:space-between;">
      <span>Generated: ${new Date().toLocaleString()}</span>
      <span>IPD Medical Record - Admission #${escapeHtml(enc.admissionNo || enc._id)}</span>
    </div>
  `

  return wrap(`${header}${pInfo}${historySection}${vitalsSection}${notesSection}${consultSection}${medsSection}${surgerySection}${anesthesiaSection}${transfusionSection}${fluidSection}${icuSection}${consentSection}${labSection}${docsSection}${billingSection}${paymentsSection}${dischargeSection}${footer}`)
}

function wrap(inner: string) {
  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>IPD Medical Record</title>
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
