import { Request, Response } from 'express'
import { createPrescriptionSchema, updatePrescriptionSchema } from '../validators/prescription'
import { HospitalPrescription } from '../models/Prescription'
import { HospitalEncounter } from '../models/Encounter'
import { LabPatient } from '../../lab/models/Patient'

export async function create(req: Request, res: Response){
  const data = createPrescriptionSchema.parse(req.body)
  const enc = await HospitalEncounter.findById(data.encounterId)
  if (!enc) return res.status(404).json({ error: 'Encounter not found' })
  if (enc.type !== 'OPD') return res.status(400).json({ error: 'Only OPD encounters can have prescriptions' })

  const att: any = (data as any).manualAttachment
  if (att && att.dataUrl && !att.uploadedAt) att.uploadedAt = new Date()

  const pres = await HospitalPrescription.create({
    patientId: enc.patientId,
    encounterId: data.encounterId,
    tokenNo: data.tokenNo,
    prescriptionMode: data.prescriptionMode || 'electronic',
    manualAttachment: att,
    items: (data as any).items || [],
    labTests: data.labTests,
    labNotes: data.labNotes,
    diagnosticTests: data.diagnosticTests,
    diagnosticNotes: data.diagnosticNotes,
    primaryComplaint: data.primaryComplaint,
    primaryComplaintHistory: data.primaryComplaintHistory,
    familyHistory: data.familyHistory,
    treatmentHistory: data.treatmentHistory,
    allergyHistory: data.allergyHistory,
    history: data.history,
    examFindings: data.examFindings,
    diagnosis: data.diagnosis,
    advice: data.advice,
    vitals: data.vitals,
    createdBy: data.createdBy,
  })

  res.status(201).json({ prescription: pres })
}

export async function list(req: Request, res: Response){
  const q = req.query as any
  const doctorId = q.doctorId ? String(q.doctorId) : ''
  const patientMrn = q.patientMrn ? String(q.patientMrn) : ''
  const from = q.from ? new Date(String(q.from)) : null
  const to = q.to ? new Date(String(q.to)) : null
  if (to) to.setHours(23,59,59,999)
  const page = q.page ? Math.max(1, parseInt(String(q.page))) : 1
  const limit = q.limit ? Math.max(1, Math.min(200, parseInt(String(q.limit)))) : 50

  let encCrit: any = { type: 'OPD' }
  if (doctorId) encCrit.doctorId = doctorId
  if (patientMrn) {
    const pDoc = await LabPatient.findOne({ mrn: patientMrn }).select('_id').lean()
    if (!pDoc) return res.json({ prescriptions: [], total: 0, page, limit })
    encCrit.patientId = (pDoc as any)._id
  }
  const encs = await HospitalEncounter.find(encCrit).select('_id').lean()
  const encIds = encs.map(e => e._id)

  const presCrit: any = {}
  if (encIds.length) presCrit.encounterId = { $in: encIds }
  if (from || to) {
    presCrit.createdAt = {}
    if (from) presCrit.createdAt.$gte = from
    if (to) presCrit.createdAt.$lte = to
  }

  const total = await HospitalPrescription.countDocuments(presCrit)
  const rows = await HospitalPrescription.find(presCrit)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({ path: 'encounterId', select: 'doctorId patientId startAt', populate: [{ path: 'doctorId', select: 'name' }, { path: 'patientId', select: 'fullName mrn' }] })
    .lean()
  res.json({ prescriptions: rows, total, page, limit })
}

export async function getById(req: Request, res: Response){
  const { id } = req.params as any
  const row: any = await HospitalPrescription.findById(String(id))
    .populate({ path: 'encounterId', select: 'doctorId patientId startAt', populate: [{ path: 'doctorId', select: 'name' }, { path: 'patientId', select: 'fullName mrn' }] })
    .lean()
  if (!row) return res.status(404).json({ error: 'Prescription not found' })
  
  // Fallback: fetch tokenNo from Token collection if not on prescription
  if (!row.tokenNo && row.encounterId) {
    try {
      const { HospitalToken } = await import('../models/Token')
      const tok: any = await HospitalToken.findOne({ encounterId: String(row.encounterId?._id || row.encounterId) }).select('tokenNo').lean()
      if (tok?.tokenNo) row.tokenNo = tok.tokenNo
    } catch {}
  }
  
  res.json({ prescription: row })
}

export async function update(req: Request, res: Response){
  const { id } = req.params as any
  const data = updatePrescriptionSchema.parse(req.body)
  const set: any = {}
  if ((data as any).tokenNo !== undefined) set.tokenNo = data.tokenNo
  if (data.prescriptionMode !== undefined) set.prescriptionMode = data.prescriptionMode
  if ((data as any).manualAttachment !== undefined) {
    const att: any = (data as any).manualAttachment
    if (att && att.dataUrl && !att.uploadedAt) att.uploadedAt = new Date()
    set.manualAttachment = att
  }
  if (data.items) set.items = data.items
  if (data.labTests !== undefined) set.labTests = data.labTests
  if (data.labNotes !== undefined) set.labNotes = data.labNotes
  if (data.diagnosticTests !== undefined) set.diagnosticTests = data.diagnosticTests
  if (data.diagnosticNotes !== undefined) set.diagnosticNotes = data.diagnosticNotes
  if (data.primaryComplaint !== undefined) set.primaryComplaint = data.primaryComplaint
  if (data.primaryComplaintHistory !== undefined) set.primaryComplaintHistory = data.primaryComplaintHistory
  if (data.familyHistory !== undefined) set.familyHistory = data.familyHistory
  if (data.treatmentHistory !== undefined) set.treatmentHistory = data.treatmentHistory
  if (data.allergyHistory !== undefined) set.allergyHistory = data.allergyHistory
  if (data.history !== undefined) set.history = data.history
  if (data.examFindings !== undefined) set.examFindings = data.examFindings
  if (data.diagnosis !== undefined) set.diagnosis = data.diagnosis
  if (data.advice !== undefined) set.advice = data.advice
  if (data.vitals !== undefined) set.vitals = data.vitals
  const row = await HospitalPrescription.findByIdAndUpdate(String(id), { $set: set }, { new: true })
    .populate({ path: 'encounterId', select: 'doctorId patientId startAt', populate: [{ path: 'doctorId', select: 'name' }, { path: 'patientId', select: 'fullName mrn' }] })
    .lean()
  if (!row) return res.status(404).json({ error: 'Prescription not found' })
  res.json({ prescription: row })
}

export async function getByEncounterId(req: Request, res: Response){
  const { encounterId } = req.params as any
  const row: any = await HospitalPrescription.findOne({ encounterId: String(encounterId) })
    .populate({ path: 'encounterId', select: 'doctorId patientId startAt', populate: [{ path: 'doctorId', select: 'name' }, { path: 'patientId', select: 'fullName mrn' }] })
    .lean()
  if (!row) return res.json({ prescription: null })

  // Fallback: fetch tokenNo from Token collection if not on prescription
  if (!row.tokenNo && encounterId) {
    try {
      const { HospitalToken } = await import('../models/Token')
      const tok: any = await HospitalToken.findOne({ encounterId: String(encounterId) }).select('tokenNo').lean()
      if (tok?.tokenNo) row.tokenNo = tok.tokenNo
    } catch {}
  }

  res.json({ prescription: row })
}

export async function upsertVitals(req: Request, res: Response){
  const { encounterId } = req.params as any
  const vitals = (req as any).body?.vitals
  if (!vitals) return res.status(400).json({ error: 'vitals required' })
  
  const enc = await HospitalEncounter.findById(encounterId)
  if (!enc) return res.status(404).json({ error: 'Encounter not found' })
  
  let pres = await HospitalPrescription.findOne({ encounterId: String(encounterId) })
  if (!pres) {
    // Create a minimal prescription with just vitals
    pres = await HospitalPrescription.create({
      patientId: enc.patientId,
      encounterId: String(encounterId),
      tokenNo: (req as any).body?.tokenNo,
      prescriptionMode: 'electronic',
      items: [],
      vitals,
    })
  } else {
    pres = await HospitalPrescription.findByIdAndUpdate(pres._id, { $set: { vitals } }, { new: true })
  }
  
  const row = await HospitalPrescription.findById(pres._id)
    .populate({ path: 'encounterId', select: 'doctorId patientId startAt', populate: [{ path: 'doctorId', select: 'name' }, { path: 'patientId', select: 'fullName mrn' }] })
    .lean()
  res.json({ prescription: row })
}

export async function remove(req: Request, res: Response){
  const { id } = req.params as any
  const row = await HospitalPrescription.findByIdAndDelete(String(id))
  if (!row) return res.status(404).json({ error: 'Prescription not found' })
  res.json({ ok: true })
}
