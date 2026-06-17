import { Request, Response } from 'express'
import { z } from 'zod'
import { HospitalEncounter } from '../models/Encounter'
import { HospitalIpdDischargeSummary } from '../models/IpdDischargeSummary'
import { HospitalIpdDeathCertificate } from '../models/IpdDeathCertificate'
import { HospitalSettings } from '../models/Settings'
import { HospitalIpdBillingItem } from '../models/IpdBillingItem'
import { HospitalIpdPayment } from '../models/IpdPayment'
import { LabPatient } from '../../lab/models/Patient'
import { HospitalDoctor } from '../models/Doctor'
import { HospitalIpdShortStay } from '../models/IpdShortStay'
import { HospitalIpdReceivedDeath } from '../models/IpdReceivedDeath'
import { HospitalIpdBirthCertificate } from '../models/IpdBirthCertificate'
import { HospitalCounter } from '../models/Counter'

async function getEncounterOr404(id: string, res: Response){
  const enc: any = await HospitalEncounter.findById(id).lean()
  if (!enc){ res.status(404).json({ error: 'Encounter not found' }); return null }
  if (enc.type !== 'IPD' && enc.type !== 'ER'){ res.status(400).json({ error: 'Not an IPD or Emergency encounter' }); return null }
  return enc
}

function mapEncounterType(encType: string): 'IPD' | 'EMERGENCY' {
  return encType === 'ER' ? 'EMERGENCY' : 'IPD'
}

export async function listBirthCertificates(req: Request, res: Response){
  const { q = '', from, to, page = '1', limit = '20' } = req.query as any
  const p = Math.max(1, Number(page)||1)
  const l = Math.max(1, Math.min(200, Number(limit)||20))
  const match: any = {}
  if (from || to){
    match.createdAt = {}
    if (from) match.createdAt.$gte = new Date(String(from))
    if (to) match.createdAt.$lte = new Date(String(to))
  }
  const rx = String(q||'').trim() ? new RegExp(String(q||'').trim(), 'i') : null
  const pipeline: any[] = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $lookup: { from: 'lab_patients', localField: 'patientId', foreignField: '_id', as: 'patient' } },
    { $unwind: { path: '$patient', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'hospital_encounters', localField: 'encounterId', foreignField: '_id', as: 'enc' } },
    { $unwind: { path: '$enc', preserveNullAndEmptyArrays: true } },
  ]
  if (rx){
    pipeline.push({ $match: { $or: [
      { motherName: rx },
      { mrNumber: rx },
      { phone: rx },
      { 'patient.fullName': rx },
      { 'patient.mrn': rx },
      { 'patient.phoneNormalized': rx },
    ] } })
  }
  pipeline.push({ $facet: {
    results: [
      { $skip: (p-1)*l }, { $limit: l },
      { $project: {
        _id: 1, encounterId: 1, createdAt: 1, srNo: 1,
        motherName: 1, mrNumber: 1, phone: 1, dateOfBirth: 1, timeOfBirth: 1,
      } },
    ],
    total: [ { $count: 'count' } ],
  } })
  pipeline.push({ $project: { results: 1, total: { $ifNull: [ { $arrayElemAt: [ '$total.count', 0 ] }, 0 ] } } })
  const agg = await HospitalIpdBirthCertificate.aggregate(pipeline as any)
  const row = agg[0] || { results: [], total: 0 }
  res.json({ page: p, limit: l, total: row.total, results: row.results })
}


// Standalone Birth Certificate (no encounter) ---------------------------------
export async function createBirthCertificateStandalone(req: Request, res: Response){
  const data = birthSchema.parse(req.body)
  // Compute monthly serial like YYYYMM_count
  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 1)
  const cnt = await HospitalIpdBirthCertificate.countDocuments({ createdAt: { $gte: monthStart, $lt: monthEnd } })
  const srNo = `${ym}_${cnt+1}`
  const patch: any = { ...data, srNo }
  if (data.dateOfBirth) patch.dateOfBirth = new Date(data.dateOfBirth)
  if (!patch.bcSerialNo) patch.bcSerialNo = srNo
  const doc = await HospitalIpdBirthCertificate.create(patch)
  res.json({ birthCertificate: doc })
}

export async function updateBirthCertificateStandalone(req: Request, res: Response){
  const { id } = req.params as any
  const data = birthSchema.parse(req.body)
  const patch: any = { ...data }
  if (data.dateOfBirth) patch.dateOfBirth = new Date(data.dateOfBirth)
  const doc = await HospitalIpdBirthCertificate.findByIdAndUpdate(id, patch, { new: true })
  res.json({ birthCertificate: doc })
}

export async function getBirthCertificateById(req: Request, res: Response){
  const { id } = req.params as any
  const doc = await HospitalIpdBirthCertificate.findById(id).lean()
  res.json({ birthCertificate: doc || null })
}

export async function deleteBirthCertificateById(req: Request, res: Response){
  const { id } = req.params as any
  await HospitalIpdBirthCertificate.findByIdAndDelete(id)
  res.json({ ok: true })
}

export async function printBirthCertificateById(req: Request, res: Response){
  const { id } = req.params as any
  const cert: any = await HospitalIpdBirthCertificate.findById(id).lean()
  if (!cert) return res.status(404).send('No birth certificate found')
  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = cert.patientId ? await LabPatient.findById(cert.patientId).lean() : null
  const doctor: any = cert.doctorId ? await HospitalDoctor.findById(cert.doctorId).lean() : null
  const html = renderBirthHTML(settings, null, patient, doctor, cert)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
}

export async function printBirthCertificateByIdPdf(req: Request, res: Response){
  const { id } = req.params as any
  const doc: any = await HospitalIpdBirthCertificate.findById(id).lean()
  if (!doc) return res.status(404).send('No birth certificate found')
  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = doc.patientId ? await LabPatient.findById(doc.patientId).lean() : null
  const doctor: any = doc.doctorId ? await HospitalDoctor.findById(doc.doctorId).lean() : null
  const html = renderBirthHTML(settings, null, patient, doctor, doc)
  let puppeteer: any
  try { puppeteer = require('puppeteer') } catch { return res.status(500).send('PDF generator not available') }
  let browser: any = null
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] as any, headless: true })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="birth-certificate-${Date.now()}.pdf"`)
    res.send(pdf)
  } catch {
    res.status(500).send('Failed to render PDF')
  } finally { try { await browser?.close() } catch {} }
}

function renderBirthHTML(settings: any, enc: any, patient: any, doctor: any, b: any){
  const head = `${hdr(settings)}<h2 style="margin:12px 0; text-align:center;">Birth Certificate</h2>`
  const sr = `<div style="margin:4px 0;"><b>Birth Serial No.</b> ${escapeHtml(b?.srNo||b?.bcSerialNo||'')}</div>`
  const row = (label: string, value: any) => `<div style="display:flex;gap:8px;margin:4px 0;"><div style="min-width:180px;"><b>${label}</b></div><div style="flex:1;border-bottom:1px solid #000;">${escapeHtml(String(value||''))}</div></div>`
  const dob = b?.dateOfBirth ? new Date(b.dateOfBirth) : null
  const dobGrid = `
    <table style="width:100%;border-collapse:collapse;margin:8px 0;">
      <tr>
        <td style="border:1px solid #000;padding:4px;text-align:center;min-width:80px;">DATE</td>
        <td style="border:1px solid #000;padding:4px;text-align:center;">Day<br><b>${dob? String(dob.getDate()).padStart(2,'0'):''}</b></td>
        <td style="border:1px solid #000;padding:4px;text-align:center;">Month<br><b>${dob? String(dob.getMonth()+1).padStart(2,'0'):''}</b></td>
        <td style="border:1px solid #000;padding:4px;text-align:center;">Year<br><b>${dob? dob.getFullYear():''}</b></td>
        <td style="border:1px solid #000;padding:4px;text-align:center;min-width:120px;">Time of Birth<br><b>${escapeHtml(b?.timeOfBirth||'')}</b></td>
      </tr>
      <tr>
        <td style="border:1px solid #000;padding:4px;">MODE OF BIRTH</td>
        <td colspan="2" style="border:1px solid #000;padding:4px;">SVD / Instrumental / C/Section</td>
        <td colspan="2" style="border:1px solid #000;padding:4px;">${escapeHtml([b?.deliveryType,b?.deliveryMode].filter(Boolean).join(' / ')) || '&nbsp;'}</td>
      </tr>
    </table>
  `
  const body = [
    sr,
    row('Doctor', doctor?.fullName || doctor?.name || ''),
    row('Mother Name', b?.motherName),
    row('Father Name', b?.fatherName),
    row('Sex of Baby', b?.sexOfBaby),
    row('Name of Baby', b?.babyName),
    row('Address', b?.address),
    dobGrid,
    row('Condition at Birth', b?.conditionAtBirth),
    row('Weight at Birth', b?.weightAtBirth),
    row('Blood Group', b?.bloodGroup),
    row('Birth Mark (If Any)', b?.birthMark),
    row('Congenital Abnormality / Birth Injury (If Any)', b?.congenitalAbnormality),
    row('Baby Handed over to', b?.babyHandedOverTo),
    (b?.notes ? box('Notes', nl2br(escapeHtml(b?.notes))) : ''),
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px;">
        <div style="border-top:1px solid #000;text-align:center;padding-top:6px;">Signature of Parent/Relation${b?.parentSignature?`: ${escapeHtml(b.parentSignature)}`:''}</div>
        <div style="border-top:1px solid #000;text-align:center;padding-top:6px;">Sign. & Stamp of Doctor${b?.doctorSignature?`: ${escapeHtml(b.doctorSignature)}`:''}</div>
     </div>`
  ].join('')
  return wrap(head + body)
}

// Birth Certificate -----------------------------------------------------------
const birthSchema = z.object({
  bcSerialNo: z.string().optional(),
  motherName: z.string().optional(),
  fatherName: z.string().optional(),
  mrNumber: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  babyName: z.string().optional(),
  sexOfBaby: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  timeOfBirth: z.string().optional(),
  deliveryType: z.string().optional(),
  deliveryMode: z.string().optional(),
  conditionAtBirth: z.string().optional(),
  weightAtBirth: z.string().optional(),
  bloodGroup: z.string().optional(),
  birthMark: z.string().optional(),
  congenitalAbnormality: z.string().optional(),
  babyHandedOverTo: z.string().optional(),
  notes: z.string().optional(),
  parentSignature: z.string().optional(),
  doctorSignature: z.string().optional(),
  createdBy: z.string().optional(),
})


const dischargeSchema = z.object({
  diagnosis: z.string().optional(),
  courseInHospital: z.string().optional(),
  procedures: z.array(z.string()).optional(),
  conditionAtDischarge: z.string().optional(),
  medications: z.array(z.string()).optional(),
  advice: z.string().optional(),
  followUpDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  createdBy: z.string().optional(),
})

// Short Stay form: flexible payload with optional structured times
const shortStaySchema = z.object({
  admittedAt: z.string().datetime().optional(),
  dischargedAt: z.string().datetime().optional(),
  data: z.any().optional(),
  notes: z.string().optional(),
  createdBy: z.string().optional(),
})

// Short Stay: upsert and get
export async function upsertShortStay(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const data = shortStaySchema.parse(req.body)
  const patch: any = { ...data }
  if (data.admittedAt) patch.admittedAt = new Date(data.admittedAt)
  if (data.dischargedAt) patch.dischargedAt = new Date(data.dischargedAt)
  patch.encounterId = enc._id
  patch.encounterType = mapEncounterType(enc.type)
  patch.patientId = enc.patientId
  patch.doctorId = enc.doctorId
  patch.departmentId = enc.departmentId
  const existing = await HospitalIpdShortStay.findOne({ encounterId: enc._id })
  let doc: any
  if (existing){
    doc = await HospitalIpdShortStay.findOneAndUpdate({ encounterId: enc._id }, patch, { new: true })
  } else {
    doc = await HospitalIpdShortStay.create(patch)
  }
  res.json({ shortStay: doc })
}

export async function getShortStay(req: Request, res: Response){
  const { id } = req.params as any
  // Try to find encounter, but also support orphaned forms
  let enc: any = await HospitalEncounter.findById(id).lean()
  let doc: any = null
  if (enc) {
    doc = await HospitalIpdShortStay.findOne({ encounterId: enc._id }).lean()
  } else {
    // Try to find the short stay document directly by its _id
    doc = await HospitalIpdShortStay.findById(id).lean()
  }
  res.json({ shortStay: doc || null })
}

export async function upsertDischargeSummary(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const data = dischargeSchema.parse(req.body)
  const patch: any = { ...data }
  if (data.followUpDate) patch.followUpDate = new Date(data.followUpDate)
  patch.patientId = enc.patientId
  patch.doctorId = enc.doctorId
  patch.departmentId = enc.departmentId
  patch.encounterType = mapEncounterType(enc.type)
  if (!enc.endAt) { try { patch.dischargeDate = new Date() } catch {} }
  const existing = await HospitalIpdDischargeSummary.findOne({ encounterId: enc._id })
  let doc: any
  if (existing){
    doc = await HospitalIpdDischargeSummary.findOneAndUpdate({ encounterId: enc._id }, patch, { new: true })
  } else {
    doc = await HospitalIpdDischargeSummary.create({ encounterId: enc._id, ...patch })
  }
  res.json({ summary: doc })
}

export async function getDischargeSummary(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const doc = await HospitalIpdDischargeSummary.findOne({ encounterId: enc._id }).lean()
  res.json({ summary: doc || null })
}

export async function printDischargeSummary(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const isPost = String(req.method || '').toUpperCase() === 'POST'
  const previewPayload = isPost ? (req.body || null) : null
  let summary: any = null
  if (previewPayload && typeof previewPayload === 'object'){
    summary = previewPayload
  } else {
    summary = await HospitalIpdDischargeSummary.findOne({ encounterId: enc._id }).lean()
    if (!summary) return res.status(404).send('No discharge summary found')
  }
  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = await LabPatient.findById(enc.patientId).lean()
  const doctor: any = enc.doctorId ? await HospitalDoctor.findById(enc.doctorId).lean() : null
  const html = renderDischargeHTML(settings, enc, patient, doctor, summary)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
}
// Received Death (clean structured form)
const receivedDeathSchema = z.object({
  rdNo: z.string().optional(),
  srNo: z.string().optional(),
  patientCnic: z.string().optional(),
  relative: z.string().optional(),
  ageSex: z.string().optional(),
  emergencyReportedDate: z.string().datetime().optional(),
  emergencyReportedTime: z.string().optional(),
  receiving: z.object({
    pulse: z.string().optional(),
    bloodPressure: z.string().optional(),
    respiratoryRate: z.string().optional(),
    pupils: z.string().optional(),
    cornealReflex: z.string().optional(),
    ecg: z.string().optional(),
  }).partial().optional(),
  diagnosis: z.string().optional(),
  attendantName: z.string().optional(),
  attendantRelative: z.string().optional(),
  attendantRelation: z.string().optional(),
  attendantAddress: z.string().optional(),
  attendantCnic: z.string().optional(),
  deathDeclaredBy: z.string().optional(),
  chargeNurseName: z.string().optional(),
  doctorName: z.string().optional(),
  createdBy: z.string().optional(),
})

export async function upsertReceivedDeath(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const data = receivedDeathSchema.parse(req.body)
  const patch: any = { ...data }
  if (data.emergencyReportedDate) patch.emergencyReportedDate = new Date(data.emergencyReportedDate)
  patch.patientId = enc.patientId
  patch.doctorId = enc.doctorId
  patch.departmentId = enc.departmentId
  patch.encounterType = mapEncounterType(enc.type)
  const existing = await HospitalIpdReceivedDeath.findOne({ encounterId: enc._id })
  let doc: any
  if (existing){
    doc = await HospitalIpdReceivedDeath.findOneAndUpdate({ encounterId: enc._id }, patch, { new: true })
  } else {
    // Auto-generate rdNo for new received death records
    if (!patch.rdNo) patch.rdNo = await nextRdNo()
    doc = await HospitalIpdReceivedDeath.create({ encounterId: enc._id, ...patch })
  }
  res.json({ receivedDeath: doc })
}

export async function getReceivedDeath(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const doc = await HospitalIpdReceivedDeath.findOne({ encounterId: enc._id }).lean()
  res.json({ receivedDeath: doc || null })
}

export async function printReceivedDeath(req: Request, res: Response){
  const { id } = req.params as any
  // Try to find encounter, but also support orphaned forms
  let enc: any = await HospitalEncounter.findById(id).lean()
  const cert: any = enc
    ? await HospitalIpdReceivedDeath.findOne({ encounterId: enc._id }).lean()
    : await HospitalIpdReceivedDeath.findById(id).lean()
  if (!cert) return res.status(404).send('No received death document found')
  // If no encounter, use form's patientId directly
  if (!enc) enc = { _id: cert.encounterId, patientId: cert.patientId, doctorId: cert.doctorId, type: cert.encounterType || 'IPD' }
  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = await LabPatient.findById(cert.patientId || enc.patientId).lean()
  const doctor: any = (enc.doctorId || cert.doctorId) ? await HospitalDoctor.findById(enc.doctorId || cert.doctorId).lean() : null
  const html = renderReceivedDeathHTML(settings, enc, patient, doctor, cert)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
}

export async function printReceivedDeathPdf(req: Request, res: Response){
  const { id } = req.params as any
  // Try to find encounter, but also support orphaned forms
  let enc: any = await HospitalEncounter.findById(id).lean()
  const doc: any = enc
    ? await HospitalIpdReceivedDeath.findOne({ encounterId: enc._id }).lean()
    : await HospitalIpdReceivedDeath.findById(id).lean()
  if (!doc) return res.status(404).send('No received death document found')
  // If no encounter, use form's patientId directly
  if (!enc) enc = { _id: doc.encounterId, patientId: doc.patientId, doctorId: doc.doctorId, type: doc.encounterType || 'IPD' }
  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = await LabPatient.findById(doc.patientId || enc.patientId).lean()
  const doctor: any = (enc.doctorId || doc.doctorId) ? await HospitalDoctor.findById(enc.doctorId || doc.doctorId).lean() : null
  const html = renderReceivedDeathHTML(settings, enc, patient, doctor, doc)
  let puppeteer: any
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    puppeteer = require('puppeteer')
  } catch {
    return res.status(500).send('PDF generator not available')
  }
  let browser: any = null
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] as any, headless: true })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="received-death-${Date.now()}.pdf"`)
    res.send(pdf)
  } catch {
    res.status(500).send('Failed to render PDF')
  } finally {
    try { await browser?.close() } catch {}
  }
}

export async function printDischargeSummaryPdf(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const summary: any = await HospitalIpdDischargeSummary.findOne({ encounterId: enc._id }).lean()
  if (!summary) return res.status(404).send('No discharge summary found')
  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = await LabPatient.findById(enc.patientId).lean()
  const doctor: any = enc.doctorId ? await HospitalDoctor.findById(enc.doctorId).lean() : null
  const html = renderDischargeHTML(settings, enc, patient, doctor, summary)
  let puppeteer: any
  try {
    // Lazy require so server can start even if puppeteer isn't installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    puppeteer = require('puppeteer')
  } catch {
    return res.status(500).send('PDF generator not available')
  }
  let browser: any = null
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] as any, headless: true })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="discharge-summary-${Date.now()}.pdf"`)
    res.send(pdf)
  } catch (e) {
    res.status(500).send('Failed to render PDF')
  } finally {
    try { await browser?.close() } catch {}
  }
}

const deathSchema = z.object({
  // Existing simple fields
  dateOfDeath: z.string().datetime().optional(),
  timeOfDeath: z.string().optional(),
  causeOfDeath: z.string().optional(),
  placeOfDeath: z.string().optional(),
  notes: z.string().optional(),
  createdBy: z.string().optional(),
  // New structured fields from redesigned form
  dcNo: z.string().optional(),
  mrNumber: z.string().optional(),
  relative: z.string().optional(),
  ageSex: z.string().optional(),
  address: z.string().optional(),
  presentingComplaints: z.string().optional(),
  diagnosis: z.string().optional(),
  primaryCause: z.string().optional(),
  secondaryCause: z.string().optional(),
  receiverName: z.string().optional(),
  receiverRelation: z.string().optional(),
  receiverIdCard: z.string().optional(),
  receiverDate: z.string().datetime().optional(),
  receiverTime: z.string().optional(),
  staffName: z.string().optional(),
  staffSignDate: z.string().datetime().optional(),
  staffSignTime: z.string().optional(),
  doctorName: z.string().optional(),
  doctorSignDate: z.string().datetime().optional(),
  doctorSignTime: z.string().optional(),
})

async function nextDcNo(){
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth()+1).padStart(2,'0')
  const yyyymm = `${yyyy}${mm}`
  const key = `dc_${yyyymm}`
  const c = await HospitalCounter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true })
  const seq = String((c as any)?.seq || 1).padStart(3,'0')
  return `DC-${yyyymm}-${seq}`
}

async function previewNextDcNo(){
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth()+1).padStart(2,'0')
  const yyyymm = `${yyyy}${mm}`
  // Count actual death certificates for this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const count = await HospitalIpdDeathCertificate.countDocuments({ createdAt: { $gte: monthStart, $lt: monthEnd } })
  const seq = String(count + 1).padStart(3,'0')
  return `DC-${yyyymm}-${seq}`
}

async function nextRdNo(){
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth()+1).padStart(2,'0')
  const yyyymm = `${yyyy}${mm}`
  const key = `rd_${yyyymm}`
  const c = await HospitalCounter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true })
  const seq = String((c as any)?.seq || 1).padStart(3,'0')
  return `RD-${yyyymm}-${seq}`
}

async function previewNextRdNo(){
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth()+1).padStart(2,'0')
  const yyyymm = `${yyyy}${mm}`
  // Count actual received death records for this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const count = await HospitalIpdReceivedDeath.countDocuments({ createdAt: { $gte: monthStart, $lt: monthEnd } })
  const seq = String(count + 1).padStart(3,'0')
  return `RD-${yyyymm}-${seq}`
}

export async function getNextDcNo(req: Request, res: Response){
  const dcNo = await previewNextDcNo()
  res.json({ dcNo })
}

export async function getNextRdNo(req: Request, res: Response){
  const rdNo = await previewNextRdNo()
  res.json({ rdNo })
}

export async function upsertDeathCertificate(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const data = deathSchema.parse(req.body)
  const patch: any = { ...data }
  if (data.dateOfDeath) patch.dateOfDeath = new Date(data.dateOfDeath)
  if (data.receiverDate) patch.receiverDate = new Date(data.receiverDate)
  if (data.staffSignDate) patch.staffSignDate = new Date(data.staffSignDate)
  if (data.doctorSignDate) patch.doctorSignDate = new Date(data.doctorSignDate)
  patch.patientId = enc.patientId
  patch.doctorId = enc.doctorId
  patch.departmentId = enc.departmentId
  patch.encounterType = mapEncounterType(enc.type)
  const existing = await HospitalIpdDeathCertificate.findOne({ encounterId: enc._id })
  let doc: any
  if (existing){
    doc = await HospitalIpdDeathCertificate.findOneAndUpdate({ encounterId: enc._id }, patch, { new: true })
  } else {
    // Auto-generate dcNo for new death certificates
    if (!patch.dcNo) patch.dcNo = await nextDcNo()
    doc = await HospitalIpdDeathCertificate.create({ encounterId: enc._id, ...patch })
  }
  res.json({ certificate: doc })
}

export async function getDeathCertificate(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const doc = await HospitalIpdDeathCertificate.findOne({ encounterId: enc._id }).lean()
  res.json({ certificate: doc || null })
}

export async function printDeathCertificate(req: Request, res: Response){
  const { id } = req.params as any
  // Try to find encounter, but also support orphaned forms
  let enc: any = await HospitalEncounter.findById(id).lean()
  const cert: any = enc
    ? await HospitalIpdDeathCertificate.findOne({ encounterId: enc._id }).lean()
    : await HospitalIpdDeathCertificate.findById(id).lean()
  if (!cert) return res.status(404).send('No death certificate found')
  // If no encounter, use form's patientId directly
  if (!enc) enc = { _id: cert.encounterId, patientId: cert.patientId, doctorId: cert.doctorId, type: cert.encounterType || 'IPD' }
  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = await LabPatient.findById(cert.patientId || enc.patientId).lean()
  const doctor: any = (enc.doctorId || cert.doctorId) ? await HospitalDoctor.findById(enc.doctorId || cert.doctorId).lean() : null
  const html = renderDeathHTML(settings, enc, patient, doctor, cert)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
}

export async function printDeathCertificatePdf(req: Request, res: Response){
  const { id } = req.params as any
  // Try to find encounter, but also support orphaned forms
  let enc: any = await HospitalEncounter.findById(id).lean()
  const doc: any = enc
    ? await HospitalIpdDeathCertificate.findOne({ encounterId: enc._id }).lean()
    : await HospitalIpdDeathCertificate.findById(id).lean()
  if (!doc) return res.status(404).send('No death certificate found')
  // If no encounter, use form's patientId directly
  if (!enc) enc = { _id: doc.encounterId, patientId: doc.patientId, doctorId: doc.doctorId, type: doc.encounterType || 'IPD' }
  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = await LabPatient.findById(doc.patientId || enc.patientId).lean()
  const doctor: any = (enc.doctorId || doc.doctorId) ? await HospitalDoctor.findById(enc.doctorId || doc.doctorId).lean() : null
  const html = renderDeathHTML(settings, enc, patient, doctor, doc)
  let puppeteer: any
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    puppeteer = require('puppeteer')
  } catch {
    return res.status(500).send('PDF generator not available')
  }
  let browser: any = null
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] as any, headless: true })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="death-certificate-${Date.now()}.pdf"`)
    res.send(pdf)
  } catch {
    res.status(500).send('Failed to render PDF')
  } finally {
    try { await browser?.close() } catch {}
  }
}

export async function getFinalInvoice(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const isER = enc.type === 'ER'
  let items: any[] = []
  let payments: any[] = []
  if (isER){
    // ER uses ErCharge and ErPayment
    const { HospitalErCharge } = await import('../models/ErCharge')
    const { HospitalErPayment } = await import('../models/ErPayment')
    items = await HospitalErCharge.find({ encounterId: enc._id }).sort({ date: 1 }).lean()
    payments = await HospitalErPayment.find({ encounterId: enc._id }).sort({ receivedAt: 1 }).lean()
  } else {
    // IPD uses IpdBillingItem and IpdPayment
    items = await HospitalIpdBillingItem.find({ encounterId: enc._id }).sort({ date: 1 }).lean()
    payments = await HospitalIpdPayment.find({ encounterId: enc._id }).sort({ receivedAt: 1 }).lean()
  }
  const subtotal = items.reduce((s,i)=> s + Number(i.amount||0), 0)
  const paid = payments.reduce((s,p)=> s + Number(p.amount||0), 0)
  const deposit = Number(enc.deposit||0)
  const totalPaid = paid + deposit
  const balance = Math.max(0, subtotal - totalPaid)
  res.json({
    encounterId: String(enc._id),
    encounterType: isER ? 'EMERGENCY' : 'IPD',
    admissionNo: enc.admissionNo,
    startAt: enc.startAt,
    endAt: enc.endAt,
    subtotal,
    deposit,
    paid,
    totalPaid,
    balance,
    items,
    payments,
  })
}

export async function printFinalInvoice(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const isER = enc.type === 'ER'
  let items: any[] = []
  let payments: any[] = []
  if (isER){
    const { HospitalErCharge } = await import('../models/ErCharge')
    const { HospitalErPayment } = await import('../models/ErPayment')
    items = await HospitalErCharge.find({ encounterId: enc._id }).sort({ date: 1 }).lean()
    payments = await HospitalErPayment.find({ encounterId: enc._id }).sort({ receivedAt: 1 }).lean()
  } else {
    items = await HospitalIpdBillingItem.find({ encounterId: enc._id }).sort({ date: 1 }).lean()
    payments = await HospitalIpdPayment.find({ encounterId: enc._id }).sort({ receivedAt: 1 }).lean()
  }
  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = await LabPatient.findById(enc.patientId).lean()
  const doctor: any = enc.doctorId ? await HospitalDoctor.findById(enc.doctorId).lean() : null
  
  // Load invoice to get discharge date/time
  const { HospitalInvoice } = await import('../models/Invoice')
  const invoice: any = await HospitalInvoice.findOne({ encounterId: enc._id }).lean()
  
  const html = renderInvoiceHTML(settings, enc, patient, doctor, items, payments, isER, invoice)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
}

// Lists for standalone pages --------------------------------------------------
export async function listReceivedDeaths(req: Request, res: Response){
  const { q = '', from, to, page = '1', limit = '20', encounterType } = req.query as any
  const p = Math.max(1, Number(page)||1)
  const l = Math.max(1, Math.min(200, Number(limit)||20))
  const match: any = {}
  if (encounterType && ['IPD', 'EMERGENCY'].includes(encounterType)) match.encounterType = encounterType
  if (from || to){
    match.createdAt = {}
    if (from) match.createdAt.$gte = new Date(String(from))
    if (to) match.createdAt.$lte = new Date(String(to))
  }
  const rx = String(q||'').trim() ? new RegExp(String(q||'').trim(), 'i') : null
  const pipeline: any[] = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $lookup: { from: 'lab_patients', localField: 'patientId', foreignField: '_id', as: 'patient' } },
    { $unwind: { path: '$patient', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'hospital_encounters', localField: 'encounterId', foreignField: '_id', as: 'enc' } },
    { $unwind: { path: '$enc', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'hospital_departments', localField: 'enc.departmentId', foreignField: '_id', as: 'dept' } },
    { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
  ]
  if (rx){
    pipeline.push({ $match: { $or: [
      { srNo: rx },
      { 'patient.fullName': rx },
      { 'patient.mrn': rx },
      { 'patient.cnicNormalized': rx },
      { 'patient.phoneNormalized': rx },
      { 'dept.name': rx },
    ] } })
  }
  pipeline.push({ $facet: {
    results: [
      { $skip: (p-1)*l }, { $limit: l },
      { $project: {
        _id: 1, encounterId: 1, encounterType: 1, createdAt: 1, srNo: 1,
        patientName: '$patient.fullName', mrn: '$patient.mrn', cnic: '$patient.cnicNormalized', phone: '$patient.phoneNormalized', department: '$dept.name',
      } },
    ],
    total: [ { $count: 'count' } ],
  } })
  pipeline.push({ $project: { results: 1, total: { $ifNull: [ { $arrayElemAt: [ '$total.count', 0 ] }, 0 ] } } })
  const agg = await HospitalIpdReceivedDeath.aggregate(pipeline as any)
  const row = agg[0] || { results: [], total: 0 }
  res.json({ page: p, limit: l, total: row.total, results: row.results })
}

export async function listDeathCertificates(req: Request, res: Response){
  const { q = '', from, to, page = '1', limit = '20', encounterType } = req.query as any
  const p = Math.max(1, Number(page)||1)
  const l = Math.max(1, Math.min(200, Number(limit)||20))
  const match: any = {}
  if (encounterType && ['IPD', 'EMERGENCY'].includes(encounterType)) match.encounterType = encounterType
  if (from || to){
    match.createdAt = {}
    if (from) match.createdAt.$gte = new Date(String(from))
    if (to) match.createdAt.$lte = new Date(String(to))
  }
  const rx = String(q||'').trim() ? new RegExp(String(q||'').trim(), 'i') : null
  const pipeline: any[] = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $lookup: { from: 'lab_patients', localField: 'patientId', foreignField: '_id', as: 'patient' } },
    { $unwind: { path: '$patient', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'hospital_encounters', localField: 'encounterId', foreignField: '_id', as: 'enc' } },
    { $unwind: { path: '$enc', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'hospital_departments', localField: 'enc.departmentId', foreignField: '_id', as: 'dept' } },
    { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
  ]
  if (rx){
    pipeline.push({ $match: { $or: [
      { 'patient.fullName': rx },
      { 'patient.mrn': rx },
      { 'patient.cnicNormalized': rx },
      { 'patient.phoneNormalized': rx },
      { 'dept.name': rx },
    ] } })
  }
  pipeline.push({ $facet: {
    results: [
      { $skip: (p-1)*l }, { $limit: l },
      { $project: {
        _id: 1, encounterId: 1, encounterType: 1, createdAt: 1,
        patientName: '$patient.fullName', mrn: '$patient.mrn', cnic: '$patient.cnicNormalized', phone: '$patient.phoneNormalized', department: '$dept.name',
      } },
    ],
    total: [ { $count: 'count' } ],
  } })
  pipeline.push({ $project: { results: 1, total: { $ifNull: [ { $arrayElemAt: [ '$total.count', 0 ] }, 0 ] } } })
  const agg = await HospitalIpdDeathCertificate.aggregate(pipeline as any)
  const row = agg[0] || { results: [], total: 0 }
  res.json({ page: p, limit: l, total: row.total, results: row.results })
}

export async function listShortStays(req: Request, res: Response){
  const { q = '', from, to, page = '1', limit = '20', encounterType } = req.query as any
  const p = Math.max(1, Number(page)||1)
  const l = Math.max(1, Math.min(200, Number(limit)||20))
  const match: any = {}
  if (encounterType && ['IPD', 'EMERGENCY'].includes(encounterType)) match.encounterType = encounterType
  if (from || to){
    match.createdAt = {}
    if (from) match.createdAt.$gte = new Date(String(from))
    if (to) match.createdAt.$lte = new Date(String(to))
  }
  const rx = String(q||'').trim() ? new RegExp(String(q||'').trim(), 'i') : null
  const pipeline: any[] = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $lookup: { from: 'lab_patients', localField: 'patientId', foreignField: '_id', as: 'patient' } },
    { $unwind: { path: '$patient', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'hospital_encounters', localField: 'encounterId', foreignField: '_id', as: 'enc' } },
    { $unwind: { path: '$enc', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'hospital_departments', localField: 'enc.departmentId', foreignField: '_id', as: 'dept' } },
    { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
  ]
  if (rx){
    pipeline.push({ $match: { $or: [
      { 'patient.fullName': rx },
      { 'patient.mrn': rx },
      { 'patient.cnicNormalized': rx },
      { 'patient.phoneNormalized': rx },
      { 'dept.name': rx },
    ] } })
  }
  pipeline.push({ $facet: {
    results: [
      { $skip: (p-1)*l }, { $limit: l },
      { $project: {
        _id: 1, encounterId: 1, encounterType: 1, createdAt: 1,
        patientName: '$patient.fullName', mrn: '$patient.mrn', cnic: '$patient.cnicNormalized', phone: '$patient.phoneNormalized', department: '$dept.name',
      } },
    ],
    total: [ { $count: 'count' } ],
  } })
  pipeline.push({ $project: { results: 1, total: { $ifNull: [ { $arrayElemAt: [ '$total.count', 0 ] }, 0 ] } } })
  const agg = await HospitalIpdShortStay.aggregate(pipeline as any)
  const row = agg[0] || { results: [], total: 0 }
  res.json({ page: p, limit: l, total: row.total, results: row.results })
}

export async function listDischargeSummaries(req: Request, res: Response){
  const { q = '', from, to, page = '1', limit = '20', encounterType } = req.query as any
  const p = Math.max(1, Number(page)||1)
  const l = Math.max(1, Math.min(200, Number(limit)||20))
  const match: any = {}
  if (encounterType && ['IPD', 'EMERGENCY'].includes(encounterType)) match.encounterType = encounterType
  if (from || to){
    match.createdAt = {}
    if (from) match.createdAt.$gte = new Date(String(from))
    if (to) match.createdAt.$lte = new Date(String(to))
  }
  const rx = String(q||'').trim() ? new RegExp(String(q||'').trim(), 'i') : null
  const pipeline: any[] = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $lookup: { from: 'lab_patients', localField: 'patientId', foreignField: '_id', as: 'patient' } },
    { $unwind: { path: '$patient', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'hospital_encounters', localField: 'encounterId', foreignField: '_id', as: 'enc' } },
    { $unwind: { path: '$enc', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'hospital_departments', localField: 'enc.departmentId', foreignField: '_id', as: 'dept' } },
    { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
  ]
  if (rx){
    pipeline.push({ $match: { $or: [
      { 'patient.fullName': rx },
      { 'patient.mrn': rx },
      { 'patient.cnicNormalized': rx },
      { 'patient.phoneNormalized': rx },
      { 'dept.name': rx },
    ] } })
  }
  pipeline.push({ $facet: {
    results: [
      { $skip: (p-1)*l }, { $limit: l },
      { $project: {
        _id: 1, encounterId: 1, encounterType: 1, createdAt: 1,
        patientName: '$patient.fullName', mrn: '$patient.mrn', cnic: '$patient.cnicNormalized', phone: '$patient.phoneNormalized', department: '$dept.name',
      } },
    ],
    total: [ { $count: 'count' } ],
  } })
  pipeline.push({ $project: { results: 1, total: { $ifNull: [ { $arrayElemAt: [ '$total.count', 0 ] }, 0 ] } } })
  const agg = await HospitalIpdDischargeSummary.aggregate(pipeline as any)
  const row = agg[0] || { results: [], total: 0 }
  res.json({ page: p, limit: l, total: row.total, results: row.results })
}

// Deletes (by encounter)
export async function deleteReceivedDeath(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  await HospitalIpdReceivedDeath.deleteOne({ encounterId: enc._id })
  res.json({ ok: true })
}

export async function deleteDeathCertificate(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  await HospitalIpdDeathCertificate.deleteOne({ encounterId: enc._id })
  res.json({ ok: true })
}

export async function deleteShortStay(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  await HospitalIpdShortStay.deleteOne({ encounterId: enc._id })
  res.json({ ok: true })
}

export async function deleteDischargeSummary(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  await HospitalIpdDischargeSummary.deleteOne({ encounterId: enc._id })
  res.json({ ok: true })
}

function hdr(settings: any){
  const name = settings?.name || 'HospitalCare'
  const addr = settings?.address || ''
  const phone = settings?.phone || ''
  const logo = settings?.logoDataUrl ? `<img src="${settings.logoDataUrl}" style="height:40px;" />` : ''
  return `<div style="display:grid; grid-template-columns:1fr auto 1fr; align-items:center;">
    <div style="justify-self:start;">${logo}</div>
    <div style="justify-self:center; text-align:center;">
      <div style="font-size:18px; font-weight:700;">${escapeHtml(name)}</div>
      <div style="font-size:11px; color:#555;">${escapeHtml(addr)} ${phone?(' | '+escapeHtml(phone)) : ''}</div>
    </div>
    <div></div>
  </div>`
}

function box(title: string, body: string){
  return `<div style="border:1px solid #e5e7eb; border-radius:6px; padding:10px; margin-top:8px;">
    <div style="font-weight:600; margin-bottom:4px;">${escapeHtml(title)}</div>
    <div>${body}</div>
  </div>`
}

function renderDischargeHTML(settings: any, enc: any, patient: any, doctor: any, s: any){
  const pInfo = `
    <table style="width:100%; border-collapse:separate; border-spacing:6px 2px; font-size:11.5px; line-height:1.25;">
      <tbody>
        <tr>
          <td style="font-weight:700; color:#334155; width:120px;">Patient</td>
          <td style="border-bottom:1px solid #e5e7eb; padding:2px 6px;">${escapeHtml(patient?.fullName||'')}</td>
          <td style="font-weight:700; color:#334155; width:120px;">MRN</td>
          <td style="border-bottom:1px solid #e5e7eb; padding:2px 6px;">${escapeHtml(patient?.mrn||'')}</td>
        </tr>
        <tr>
          <td style="font-weight:700; color:#334155;">Doctor</td>
          <td style="border-bottom:1px solid #e5e7eb; padding:2px 6px;">${escapeHtml(doctor?.fullName||doctor?.name||'')}</td>
          <td style="font-weight:700; color:#334155;">Admission No</td>
          <td style="border-bottom:1px solid #e5e7eb; padding:2px 6px;">${escapeHtml(enc?.admissionNo||'')}</td>
        </tr>
        <tr>
          <td style="font-weight:700; color:#334155;">Admitted</td>
          <td style="border-bottom:1px solid #e5e7eb; padding:2px 6px;">${fmt(enc?.startAt)}</td>
          <td style="font-weight:700; color:#334155;">Discharged</td>
          <td style="border-bottom:1px solid #e5e7eb; padding:2px 6px;">${fmt(enc?.endAt)}</td>
        </tr>
      </tbody>
    </table>
  `

  // Parse enhanced fields (when front-end sends composed text)
  const course = String(s.courseInHospital||'')
  const lines = course.split(/\n+/).map((t:string)=>t.trim()).filter(Boolean)
  const findPref = (p:string)=> lines.find(l=> l.toLowerCase().startsWith(p.toLowerCase()))?.split(':').slice(1).join(':').trim() || ''
  const presentingComplaints = findPref('Presenting Complaints')
  const reasonOfAdmission = findPref('Reason of Admission')
  const treatment = findPref('Treatment')
  const flags = [
    lines.find(l=> /Discharge advised by Doctor/i.test(l)) ? 'Discharge advised by Doctor: Yes' : '',
    lines.find(l=> /^LAMA$/i.test(l)) ? 'LAMA' : '',
    lines.find(l=> /DDR Consent/i.test(l)) ? 'DDR Consent: Yes' : '',
  ].filter(Boolean).join('<br/>')

  const notes = String(s.notes||'')
  const nlines = notes.split(/\n+/).map((t:string)=>t.trim()).filter(Boolean)
  const responseOfTreatment = (nlines.find(l=> l.toLowerCase().startsWith('response of treatment'))||'').split(':').slice(1).join(':').trim()
  const investigationsLine = (nlines.find(l=> l.toLowerCase().startsWith('investigations'))||'')
  const investigations = investigationsLine ? investigationsLine.replace(/^investigations:?\s*/i,'') : ''
  const doctorName = (nlines.find(l=> l.toLowerCase().startsWith('doctor:'))||'').split(':').slice(1).join(':').trim()
  const doctorSign = (nlines.find(l=> l.toLowerCase().startsWith('doctor sign'))||'').split(':').slice(1).join(':').trim()
  const amount = (nlines.find(l=> l.toLowerCase().startsWith('amount'))||'').split(':').slice(1).join(':').trim()
  const discount = (nlines.find(l=> l.toLowerCase().startsWith('discount'))||'').split(':').slice(1).join(':').trim()

  const invMap: any = {}
  String(investigations||'').split(',').map((t:string)=>t.trim()).filter(Boolean).forEach((kv:string)=>{
    const [k, ...rest] = kv.split(':')
    const key = String(k||'').toUpperCase().replace(/\s+/g,'')
    const val = rest.join(':').trim()
    if (key) invMap[key] = val
  })
  const invOrder = ['HB','UREA','HCV','NA','PLATELETS','CREATININE','HBSAG','K','TLC','ALT','HIV','CA']
  const invBlocks = invOrder.map(lbl => (
    `<div><div style="font-size:11px;color:#334155;font-weight:600;margin-bottom:2px;">${escapeHtml(lbl)}</div><div style="border:1px solid #e5e7eb;border-radius:6px;padding:6px;min-height:20px;">${escapeHtml(invMap[lbl]||'')}</div></div>`
  )).join('')
  const investGrid = `<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;">${invBlocks}</div>`

  const medsRows = (Array.isArray(s.medications) ? s.medications : String(s.medications||'').split('\n'))
    .map((m:string)=>{
      const parts = m.split('|').map(x=>x.trim())
      return { name: parts[0]||'', dose: parts[1]||'', route: parts[2]||'', freq: parts[3]||'', timing: parts[4]||'', duration: parts[5]||'' }
    })
    .filter((row:any)=> Object.values(row).some(v=> String(v||'').trim()))
  const medsTable = `
    <table style="width:100%; border-collapse:collapse; font-size:11.5px;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="text-align:left; padding:4px; border:1px solid #e5e7eb;">Sr</th>
          <th style="text-align:left; padding:4px; border:1px solid #e5e7eb;">Medicine</th>
          <th style="text-align:left; padding:4px; border:1px solid #e5e7eb;">Strength/Dose</th>
          <th style="text-align:left; padding:4px; border:1px solid #e5e7eb;">Route</th>
          <th style="text-align:left; padding:4px; border:1px solid #e5e7eb;">Frequency</th>
          <th style="text-align:left; padding:4px; border:1px solid #e5e7eb;">Timing</th>
          <th style="text-align:left; padding:4px; border:1px solid #e5e7eb;">Duration</th>
        </tr>
      </thead>
      <tbody>
        ${medsRows.map((r:any, i:number)=>`<tr>
          <td style=\"padding:4px; border:1px solid #e5e7eb;\">${i+1}</td>
          <td style=\"padding:4px; border:1px solid #e5e7eb;\">${escapeHtml(r.name)}</td>
          <td style=\"padding:4px; border:1px solid #e5e7eb;\">${escapeHtml(r.dose)}</td>
          <td style=\"padding:4px; border:1px solid #e5e7eb;\">${escapeHtml(r.route)}</td>
          <td style=\"padding:4px; border:1px solid #e5e7eb;\">${escapeHtml(r.freq)}</td>
          <td style=\"padding:4px; border:1px solid #e5e7eb;\">${escapeHtml(r.timing)}</td>
          <td style=\"padding:4px; border:1px solid #e5e7eb;\">${escapeHtml(r.duration)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  `

  const procBody = Array.isArray(s.procedures) ? `<ul>${s.procedures.map((x:string)=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>` : nl2br(escapeHtml(String(s.procedures||'')))
  const paired1 = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">${box('Presenting Complaints', nl2br(escapeHtml(presentingComplaints||'')))}${box('Reason of Admission / Brief History / Examination', nl2br(escapeHtml(reasonOfAdmission||'')))}</div>`
  const paired2 = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">${box('Final Diagnosis', nl2br(escapeHtml(s.diagnosis||'')))}${box('Any Procedure During Stay & Outcome', procBody)}</div>`
  const statusGrid = `<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;\">${box('Condition at Discharge', nl2br(escapeHtml(s.conditionAtDischarge||'')))}${box('Response of Treatment', escapeHtml(responseOfTreatment||''))}</div>`
  const docGrid = `<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;\">${box('Doctor Name', escapeHtml(doctorName||doctor?.name||''))}${box('Sign Date', fmt(s.followUpDate))}${box('Doctor Sign (text)', escapeHtml(doctorSign||''))}</div>`
  const sections = [
    box('Patient Info', pInfo),
    paired1,
    paired2,
    box('Treatment in Hospital', nl2br(escapeHtml(treatment||''))),
    box('Investigations Significant Results', investGrid),
    box('Medicines given on Discharge', medsTable),
    statusGrid,
    box('Follow-up Instructions', nl2br(escapeHtml(s.advice||''))),
    docGrid,
  ].join('')
  return wrap(`${hdr(settings)}<h2 style="margin:12px 0 8px; font-size:22px; font-weight:800;">Discharge Summary</h2>${sections}`)
}

function renderDeathHTML(settings: any, enc: any, patient: any, doctor: any, c: any){
  const head = `${hdr(settings)}<h2 style="margin:12px 0; text-align:center; font-size:20px; font-weight:800; border-bottom:2px solid #000; padding-bottom:8px;">DEATH CERTIFICATE</h2>`
  
  const row2 = (label: string, value: any) => `<div style="display:flex; gap:8px; margin:4px 0;"><div style="min-width:140px; font-weight:700;">${label}</div><div style="flex:1; border-bottom:1px solid #000; padding-left:4px;">${escapeHtml(String(value||''))}</div></div>`
  const row2date = (label: string, date: any, time?: any) => `<div style="display:flex; gap:8px; margin:4px 0;"><div style="min-width:140px; font-weight:700;">${label}</div><div style="flex:1; border-bottom:1px solid #000; padding-left:4px;">${fmt(date)}${time ? ' ' + escapeHtml(time) : ''}</div></div>`
  
  const section = (title: string, content: string) => `<div style="margin-top:12px; border:1px solid #000; padding:8px;"><div style="font-weight:800; font-size:14px; margin-bottom:6px; background:#f0f0f0; padding:4px;">${title}</div>${content}</div>`
  
  const patientInfo = section('PATIENT INFORMATION', `
    ${row2('Patient Name', patient?.fullName)}
    ${row2('MR Number', patient?.mrn)}
    ${row2('Age / Sex', c?.ageSex)}
    ${row2('Address', c?.address)}
    ${row2('Guardian Name', c?.relative || patient?.fatherName)}
    ${row2('Admission No', enc?.admissionNo)}
    ${row2('Doctor', doctor?.name || c?.doctorName)}
  `)
  
  const deathDetails = section('DEATH DETAILS', `
    ${row2('DC No', c?.dcNo)}
    ${row2date('Date of Death', c?.dateOfDeath, c?.timeOfDeath)}
  `)
  
  const medicalInfo = section('MEDICAL INFORMATION', `
    ${row2('Presenting Complaints', c?.presentingComplaints)}
    ${row2('Diagnosis', c?.diagnosis)}
    ${row2('Primary Cause of Death', c?.primaryCause || c?.causeOfDeath)}
    ${row2('Secondary Cause of Death', c?.secondaryCause)}
  `)
  
  const handover = section('BODY HANDOVER DETAILS', `
    ${row2('Received By Name', c?.receiverName)}
    ${row2('Relation', c?.receiverRelation)}
    ${row2('ID Card No', c?.receiverIdCard)}
    ${row2date('Date & Time', c?.receiverDate, c?.receiverTime)}
  `)
  
  const signatures = `
    <div style="margin-top:20px; display:grid; grid-template-columns:1fr 1fr; gap:40px;">
      <div style="text-align:center;">
        <div style="border-top:1px solid #000; margin-top:40px; padding-top:4px; font-weight:700;">Staff Signature</div>
        <div style="font-size:12px; margin-top:4px;">${escapeHtml(c?.staffName||'')}</div>
        <div style="font-size:11px; color:#555;">${fmt(c?.staffSignDate)} ${escapeHtml(c?.staffSignTime||'')}</div>
      </div>
      <div style="text-align:center;">
        <div style="border-top:1px solid #000; margin-top:40px; padding-top:4px; font-weight:700;">Doctor Signature</div>
        <div style="font-size:12px; margin-top:4px;">${escapeHtml(c?.doctorName||'')}</div>
        <div style="font-size:11px; color:#555;">${fmt(c?.doctorSignDate)} ${escapeHtml(c?.doctorSignTime||'')}</div>
      </div>
    </div>
  `
  
  const notes = c?.notes ? section('NOTES', `<div style="white-space:pre-wrap;">${nl2br(escapeHtml(c.notes))}</div>`) : ''
  
  return wrap(head + patientInfo + deathDetails + medicalInfo + handover + signatures + notes)
}

function renderReceivedDeathHTML(settings: any, enc: any, patient: any, doctor: any, d: any){
  const head = `${hdr(settings)}<h2 style="margin:12px 0; text-align:center; font-size:20px; font-weight:800; border-bottom:2px solid #000; padding-bottom:8px;">RECEIVED DEAD</h2>`

  const row2 = (label: string, value: any) => `<div style="display:flex; gap:8px; margin:4px 0;"><div style="min-width:140px; font-weight:700;">${label}</div><div style="flex:1; border-bottom:1px solid #000; padding-left:4px;">${escapeHtml(String(value||''))}</div></div>`
  const row2date = (label: string, date: any, time?: any) => `<div style="display:flex; gap:8px; margin:4px 0;"><div style="min-width:140px; font-weight:700;">${label}</div><div style="flex:1; border-bottom:1px solid #000; padding-left:4px;">${fmt(date)}${time ? ' ' + escapeHtml(time) : ''}</div></div>`
  const row3 = (l1: string, v1: any, l2: string, v2: any, l3: string, v3: any) => `<div style="display:flex; gap:8px; margin:4px 0;"><div style="min-width:100px; font-weight:700;">${l1}</div><div style="flex:1; border-bottom:1px solid #000; padding-left:4px;">${escapeHtml(String(v1||''))}</div><div style="min-width:100px; font-weight:700;">${l2}</div><div style="flex:1; border-bottom:1px solid #000; padding-left:4px;">${escapeHtml(String(v2||''))}</div><div style="min-width:100px; font-weight:700;">${l3}</div><div style="flex:1; border-bottom:1px solid #000; padding-left:4px;">${escapeHtml(String(v3||''))}</div></div>`

  const section = (title: string, content: string) => `<div style="margin-top:12px; border:1px solid #000; padding:8px;"><div style="font-weight:800; font-size:14px; margin-bottom:6px; background:#f0f0f0; padding:4px;">${title}</div>${content}</div>`

  const patientInfo = section('PATIENT INFORMATION', `
    ${row2('Patient Name', patient?.fullName)}
    ${row2('MR Number', patient?.mrn)}
    ${row2('Age / Sex', d?.ageSex)}
    ${row2('Address', patient?.address)}
    ${row2('Guardian Name', patient?.fatherName)}
    ${row2('Patient CNIC', d?.patientCnic)}
    ${row2('Admission No', enc?.admissionNo)}
    ${row2('Doctor', doctor?.name)}
  `)

  const receivedDetails = section('RECEIVED DETAILS', `
    ${row2('RD No', d?.rdNo)}
    ${row2date('Reported Date (Emergency)', d?.emergencyReportedDate, d?.emergencyReportedTime)}
  `)

  const receivingParams = section('RECEIVING PARAMETERS', `
    ${row2('Pulse', d?.receiving?.pulse)}
    ${row2('Blood Pressure', d?.receiving?.bloodPressure)}
    ${row2('Respiratory Rate', d?.receiving?.respiratoryRate)}
    ${row2('Pupils', d?.receiving?.pupils)}
    ${row2('Corneal Reflex', d?.receiving?.cornealReflex)}
    ${row2('ECG', d?.receiving?.ecg)}
  `)

  const diagnosisSection = section('DIAGNOSIS', `
    ${row2('Diagnosis', d?.diagnosis)}
  `)

  const attendantSection = section('ATTENDANT INFORMATION', `
    ${row3('Attendant Name', d?.attendantName, 'Relation', d?.attendantRelation, 'Attendant CNIC', d?.attendantCnic)}
    ${row3('Death Declared By', d?.deathDeclaredBy, 'Charge Nurse', d?.chargeNurseName, 'Doctor Name', d?.doctorName || doctor?.name)}
  `)

  const signatures = `
    <div style="margin-top:20px; display:grid; grid-template-columns:1fr 1fr; gap:40px;">
      <div style="text-align:center;">
        <div style="border-top:1px solid #000; margin-top:40px; padding-top:4px; font-weight:700;">Charge Nurse Signature</div>
        <div style="font-size:12px; margin-top:4px;">${escapeHtml(d?.chargeNurseName||'')}</div>
      </div>
      <div style="text-align:center;">
        <div style="border-top:1px solid #000; margin-top:40px; padding-top:4px; font-weight:700;">Doctor Signature</div>
        <div style="font-size:12px; margin-top:4px;">${escapeHtml(d?.doctorName||'')}</div>
      </div>
    </div>
  `

  return wrap(head + patientInfo + receivedDetails + receivingParams + diagnosisSection + attendantSection + signatures)
}

function renderInvoiceHTML(settings: any, enc: any, patient: any, doctor: any, items: any[], payments: any[], isER: boolean = false, invoice?: any){
  // Calculate totals like frontend
  const totalBill = items.reduce((s,i)=> s + Number(i.amount||0), 0)
  
  // Separate regular payments from refunds
  const regularPayments = payments.filter((p: any) => String(p.method || '').toLowerCase() !== 'advance return' && String(p.type || '').toLowerCase() !== 'refund')
  const refunds = payments.filter((p: any) => String(p.method || '').toLowerCase() === 'advance return' || String(p.type || '').toLowerCase() === 'refund')
  
  // Calculate totals: payments minus refunds
  const paymentTotal = regularPayments.reduce((s,p)=> s + Number(p.amount||0), 0)
  const refundTotal = refunds.reduce((s,p)=> s + Number(p.amount||0), 0)
  const totalPaid = Math.max(0, paymentTotal - refundTotal)
  const balance = Math.max(0, totalBill - totalPaid)
  
  // Format helpers
  const fmtNum = (n: number) => n.toLocaleString()
  const fmtDateTime = (d: any) => { 
    if (!d || d === 'Invalid Date') return '-'
    try { const x = new Date(d); if (isNaN(x.getTime())) return '-'; return x.toLocaleString() } catch { return '-' } 
  }
  
  // Build header with hospital branding
  const logo = settings?.logoDataUrl ? `<img src="${settings.logoDataUrl}" style="width:56px;height:56px;object-fit:contain;border:1px solid #bae6fd;border-radius:8px;background:#fff;margin-right:8px;" />` : ''
  const header = `
    <div style="display:flex;gap:10px;align-items:center;justify-content:center;text-align:center;padding-bottom:8px;margin-bottom:10px;border-bottom:1px solid #bae6fd;">
      ${logo}
      <div>
        <div style="font-weight:900;text-transform:uppercase;letter-spacing:.3px;font-size:24px;line-height:1.1;color:#1d4ed8;">${escapeHtml(settings?.name||'Hospital')}</div>
        <div style="color:#475569;font-size:12px;margin-top:2px;">${escapeHtml(settings?.address||'')}</div>
        <div style="color:#475569;font-size:12px;">Tel: ${escapeHtml(settings?.phone||'')}</div>
      </div>
    </div>
  `
  
  // Use invoice discharge date/time if available, fallback to encounter endAt
  const dischargeDate = invoice?.dateOfDischarge || enc?.endAt
  const dischargeTime = invoice?.dischargeTime 
  
  // Patient info grid - match frontend format
  const pInfo = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
      <div><span style="font-weight:700;">MR #</span> <span>${escapeHtml(patient?.mrn||'')}</span></div>
      <div><span style="font-weight:700;">Pt. Name</span> <span>${escapeHtml(patient?.fullName||'')}</span></div>
      <div><span style="font-weight:700;">Date Of Admission</span> <span>${fmtDateTime(enc?.startAt)}</span></div>
      <div><span style="font-weight:700;">Time Of Admission</span> <span>${fmtDateTime(enc?.startAt)}</span></div>
      <div><span style="font-weight:700;">Phone</span> <span>${escapeHtml(patient?.phoneNormalized||patient?.phone||'')}</span></div>
      <div><span style="font-weight:700;">Address</span> <span>${escapeHtml(patient?.address||'')}</span></div>
      <div><span style="font-weight:700;">Date Of Discharge</span> <span>${fmtDateTime(dischargeDate)}</span></div>
      <div><span style="font-weight:700;">Time Of Discharge</span> <span>${fmtDateTime(dischargeDate)}</span></div>
    </div>
  `
  
  // Charges table with status
  const chargesRows = items.map((r,i)=>{
    const isPaid = Number(r.paidAmount||0) >= Number(r.amount||0)
    const isPartial = !isPaid && Number(r.paidAmount||0) > 0
    const status = isPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid'
    return `<tr>
      <td style="padding:6px;border:1px solid #111;border-right:1px solid #111;text-align:center;">${i+1}</td>
      <td style="padding:6px;border:1px solid #111;border-right:1px solid #111;">${escapeHtml(r.description||'')}</td>
      <td style="padding:6px;border:1px solid #111;border-right:1px solid #111;text-align:right;">Rs ${fmtNum(Number(r.amount||0))}</td>
      <td style="padding:6px;border:1px solid #111;text-align:center;">${status}</td>
    </tr>`
  }).join('')
  
  const chargesTable = `
    <div style="margin:10px 0;border:1px solid #111;border-radius:4px;overflow:hidden;">
      <div style="background:#f8fafc;padding:8px 12px;font-weight:700;font-size:13px;border-bottom:1px solid #111;">Charges</div>
      <table style="width:100%;border-collapse:collapse;">
        <thead style="background:#f8fafc;">
          <tr>
            <th style="padding:6px;border:1px solid #111;border-right:1px solid #111;text-align:center;width:40px;">#</th>
            <th style="padding:6px;border:1px solid #111;border-right:1px solid #111;text-align:left;">Description</th>
            <th style="padding:6px;border:1px solid #111;border-right:1px solid #111;text-align:right;width:100px;">Amount</th>
            <th style="padding:6px;border:1px solid #111;text-align:center;width:80px;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${chargesRows || '<tr><td colspan="4" style="text-align:center;padding:12px;color:#94a3b8;">No charges</td></tr>'}
        </tbody>
        <tfoot style="background:#f8fafc;font-weight:700;">
          <tr>
            <td colspan="2" style="padding:6px;border:1px solid #111;border-right:1px solid #111;text-align:right;">Total</td>
            <td style="padding:6px;border:1px solid #111;border-right:1px solid #111;text-align:right;">Rs ${fmtNum(totalBill)}</td>
            <td style="padding:6px;border:1px solid #111;"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `
  
  // Payments table - show ALL payments like frontend (including refunds)
  const paymentRows = payments.map((p)=>`<tr>
    <td style="padding:6px;border:1px solid #111;border-right:1px solid #111;">${fmtDateTime(p.receivedAt)}</td>
    <td style="padding:6px;border:1px solid #111;border-right:1px solid #111;">${escapeHtml(p.method || '-')}</td>
    <td style="padding:6px;border:1px solid #111;border-right:1px solid #111;">${escapeHtml(p.refNo || p.notes || '-')}</td>
    <td style="padding:6px;border:1px solid #111;text-align:right;">Rs ${fmtNum(Number(p.amount||0))}</td>
  </tr>`).join('')
  
  const paymentsTable = `
    <div style="margin:10px 0;border:1px solid #111;border-radius:4px;overflow:hidden;">
      <div style="background:#f8fafc;padding:8px 12px;font-weight:700;font-size:13px;border-bottom:1px solid #111;">Payments</div>
      <table style="width:100%;border-collapse:collapse;">
        <thead style="background:#f8fafc;">
          <tr>
            <th style="padding:6px;border:1px solid #111;border-right:1px solid #111;text-align:left;">Date/Time</th>
            <th style="padding:6px;border:1px solid #111;border-right:1px solid #111;text-align:left;">Method</th>
            <th style="padding:6px;border:1px solid #111;border-right:1px solid #111;text-align:left;">Ref</th>
            <th style="padding:6px;border:1px solid #111;text-align:right;width:100px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${paymentRows || '<tr><td colspan="4" style="text-align:center;padding:12px;color:#94a3b8;">No payments</td></tr>'}
        </tbody>
        <tfoot style="background:#f8fafc;font-weight:700;">
          <tr>
            <td colspan="3" style="padding:6px;border:1px solid #111;border-right:1px solid #111;text-align:right;">Total Paid</td>
            <td style="padding:6px;border:1px solid #111;text-align:right;">Rs ${fmtNum(totalPaid)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `
  
  // Summary box
  const summary = `
    <div style="margin:10px 0;border:1px solid #111;border-radius:4px;overflow:hidden;">
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;">
        <tbody style="font-weight:700;">
          <tr style="border-bottom:1px solid #111;">
            <td style="padding:8px 12px;width:50%;">Total Bill</td>
            <td style="text-align:right;padding:8px 12px;">Rs ${fmtNum(totalBill)}</td>
          </tr>
          <tr style="border-bottom:1px solid #111;">
            <td style="padding:8px 12px;">Total Paid</td>
            <td style="text-align:right;padding:8px 12px;color:#059669;">Rs ${fmtNum(totalPaid)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;">Balance</td>
            <td style="text-align:right;padding:8px 12px;color:${balance > 0 ? '#dc2626' : '#059669'};">Rs ${fmtNum(balance)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div style="text-align:center;font-size:12px;color:#64748b;margin-top:8px;">System Generated Receipt</div>
  `
  
  const title = isER ? 'ER Final Invoice' : 'Final Invoice'
  const body = `
    ${header}
    <h2 style="margin:12px 0;font-size:18px;font-weight:700;">${escapeHtml(title)}</h2>
    <div style="border:1px solid #111;border-radius:4px;padding:12px;margin-bottom:10px;">
      ${pInfo}
    </div>
    ${chargesTable}
    ${paymentsTable}
    ${summary}
  `
  
  return wrap(body)
}

function wrap(inner: string){
  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Print</title>
  <style>
    body{font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#0f172a; padding:12px; background:#ffffff; font-size:12px; line-height:1.35;}
    .page{max-width:780px; margin:0 auto;}
    @media print { body { padding: 0; } .page{margin:0 auto;} }
  </style>
  </head><body>
  <div class="page">${inner}</div>
  </body></html>`
}

function fmt(d: any){ try { const x = new Date(d); if (!x || isNaN(x.getTime())) return ''; return x.toLocaleString() } catch { return '' } }
function nl2br(s: string){ return String(s||'').replace(/\n/g, '<br/>') }
function escapeHtml(s: any){ return String(s??'').replace(/[&<>"']/g, (c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'} as any)[c]) }
