import { Request, Response } from 'express'
import { HospitalEncounter } from '../models/Encounter'
import { HospitalIpdSurgeryRecord } from '../models/IpdSurgeryRecord'
import { HospitalIpdAnesthesiaRecord } from '../models/IpdAnesthesiaRecord'
import { HospitalIpdAnesthesiaPreAssessment } from '../models/IpdAnesthesiaPreAssessment'
import { HospitalIpdAnesthesiaPostOp } from '../models/IpdAnesthesiaPostOp'
import { HospitalIpdConsentForm } from '../models/IpdConsentForm'
import { HospitalIpdHistoryExam } from '../models/IpdHistoryExam'
import { HospitalIpdBloodTransfusion } from '../models/IpdBloodTransfusion'
import { HospitalIpdIcuMonitoring } from '../models/IpdIcuMonitoring'
import { HospitalIpdSurgicalSafety } from '../models/IpdSurgicalSafety'
import { HospitalIpdFluidBalance } from '../models/IpdFluidBalance'
import { HospitalIpdConsultation } from '../models/IpdConsultation'
import { HospitalIpdDocument } from '../models/IpdDocument'
import { HospitalIpdClinicalNote } from '../models/IpdClinicalNote'
import { HospitalIpdOperationConsent } from '../models/IpdOperationConsent'
import { HospitalIpdInfectionControl } from '../models/IpdInfectionControl'

async function getIPDEncounter(encounterId: string) {
  const enc = await HospitalEncounter.findById(encounterId)
  if (!enc) throw { status: 404, error: 'Encounter not found' }
  if (enc.type !== 'IPD') throw { status: 400, error: 'Encounter is not IPD' }
  return enc
}

function handleError(res: Response, e: any) {
  console.error('[IPD EMR Error]', e)
  if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' })
  if (e?.name === 'ValidationError') return res.status(400).json({ error: e.message || 'Validation error' })
  if (e?.code === 11000) return res.status(409).json({ error: 'Duplicate entry' })
  if (e?.status) return res.status(e.status).json({ error: e.error || 'Error' })
  return res.status(500).json({ error: e?.message || 'Internal Server Error' })
}

// ==================== Surgery Records ====================

export async function createSurgeryRecord(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const row = await HospitalIpdSurgeryRecord.create({ ...req.body, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ surgeryRecord: row })
  } catch (e) { return handleError(res, e) }
}

export async function listSurgeryRecords(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    if (q.status) crit.status = q.status
    const total = await HospitalIpdSurgeryRecord.countDocuments(crit)
    const rows = await HospitalIpdSurgeryRecord.find(crit)
      .populate('surgeonId', 'name')
      .populate('anesthesiologistId', 'name')
      .sort({ surgeryDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    res.json({ surgeryRecords: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function getSurgeryRecord(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdSurgeryRecord.findById(id)
      .populate('surgeonId', 'name')
      .populate('anesthesiologistId', 'name')
    if (!row) return res.status(404).json({ error: 'Surgery record not found' })
    res.json({ surgeryRecord: row })
  } catch (e) { return handleError(res, e) }
}

export async function updateSurgeryRecord(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdSurgeryRecord.findByIdAndUpdate(id, { $set: req.body }, { new: true })
    if (!row) return res.status(404).json({ error: 'Surgery record not found' })
    res.json({ surgeryRecord: row })
  } catch (e) { return handleError(res, e) }
}

export async function removeSurgeryRecord(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdSurgeryRecord.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'Surgery record not found' })
    res.json({ ok: true })
  } catch (e) { return handleError(res, e) }
}

// ==================== Anesthesia Pre-Assessment ====================

export async function createAnesPreAssessment(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const row = await HospitalIpdAnesthesiaPreAssessment.create({ ...req.body, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ preAssessment: row })
  } catch (e) { return handleError(res, e) }
}

export async function listAnesPreAssessments(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    if (q.status) crit.status = q.status
    const total = await HospitalIpdAnesthesiaPreAssessment.countDocuments(crit)
    const rows = await HospitalIpdAnesthesiaPreAssessment.find(crit)
      .populate('anesthesiologistId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    res.json({ preAssessments: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function getAnesPreAssessment(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdAnesthesiaPreAssessment.findById(id).populate('anesthesiologistId', 'name')
    if (!row) return res.status(404).json({ error: 'Pre-assessment not found' })
    res.json({ preAssessment: row })
  } catch (e) { return handleError(res, e) }
}

export async function updateAnesPreAssessment(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdAnesthesiaPreAssessment.findByIdAndUpdate(id, { $set: req.body }, { new: true })
    if (!row) return res.status(404).json({ error: 'Pre-assessment not found' })
    res.json({ preAssessment: row })
  } catch (e) { return handleError(res, e) }
}

export async function removeAnesPreAssessment(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdAnesthesiaPreAssessment.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'Pre-assessment not found' })
    res.json({ ok: true })
  } catch (e) { return handleError(res, e) }
}

// ==================== Anesthesia Intra-Op Records ====================

export async function createAnesthesiaRecord(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const row = await HospitalIpdAnesthesiaRecord.create({ ...req.body, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ anesthesiaRecord: row })
  } catch (e) { return handleError(res, e) }
}

export async function listAnesthesiaRecords(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    if (q.status) crit.status = q.status
    const total = await HospitalIpdAnesthesiaRecord.countDocuments(crit)
    const rows = await HospitalIpdAnesthesiaRecord.find(crit)
      .populate('anesthesiologistId', 'name')
      .sort({ inductionTime: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    res.json({ anesthesiaRecords: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function getAnesthesiaRecord(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdAnesthesiaRecord.findById(id).populate('anesthesiologistId', 'name')
    if (!row) return res.status(404).json({ error: 'Anesthesia record not found' })
    res.json({ anesthesiaRecord: row })
  } catch (e) { return handleError(res, e) }
}

export async function updateAnesthesiaRecord(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdAnesthesiaRecord.findByIdAndUpdate(id, { $set: req.body }, { new: true })
    if (!row) return res.status(404).json({ error: 'Anesthesia record not found' })
    res.json({ anesthesiaRecord: row })
  } catch (e) { return handleError(res, e) }
}

export async function removeAnesthesiaRecord(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdAnesthesiaRecord.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'Anesthesia record not found' })
    res.json({ ok: true })
  } catch (e) { return handleError(res, e) }
}

// ==================== Anesthesia Post-Op ====================

export async function createAnesPostOp(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const row = await HospitalIpdAnesthesiaPostOp.create({ ...req.body, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ anesPostOp: row })
  } catch (e) { return handleError(res, e) }
}

export async function listAnesPostOps(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    if (q.status) crit.status = q.status
    const total = await HospitalIpdAnesthesiaPostOp.countDocuments(crit)
    const rows = await HospitalIpdAnesthesiaPostOp.find(crit)
      .populate('anesthesiologistId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    res.json({ anesPostOps: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function getAnesPostOp(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdAnesthesiaPostOp.findById(id).populate('anesthesiologistId', 'name')
    if (!row) return res.status(404).json({ error: 'Anesthesia post-op record not found' })
    res.json({ anesPostOp: row })
  } catch (e) { return handleError(res, e) }
}

export async function updateAnesPostOp(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdAnesthesiaPostOp.findByIdAndUpdate(id, { $set: req.body }, { new: true })
    if (!row) return res.status(404).json({ error: 'Anesthesia post-op record not found' })
    res.json({ anesPostOp: row })
  } catch (e) { return handleError(res, e) }
}

export async function removeAnesPostOp(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdAnesthesiaPostOp.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'Anesthesia post-op record not found' })
    res.json({ ok: true })
  } catch (e) { return handleError(res, e) }
}

// ==================== Consent Forms ====================

export async function createConsentForm(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const row = await HospitalIpdConsentForm.create({ ...req.body, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ consentForm: row })
  } catch (e) { return handleError(res, e) }
}

export async function listConsentForms(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    if (q.formType) crit.formType = q.formType
    if (q.status) crit.status = q.status
    const total = await HospitalIpdConsentForm.countDocuments(crit)
    const rows = await HospitalIpdConsentForm.find(crit)
      .populate('doctorId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    res.json({ consentForms: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function getConsentForm(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdConsentForm.findById(id).populate('doctorId', 'name')
    if (!row) return res.status(404).json({ error: 'Consent form not found' })
    res.json({ consentForm: row })
  } catch (e) { return handleError(res, e) }
}

export async function updateConsentForm(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdConsentForm.findByIdAndUpdate(id, { $set: req.body }, { new: true })
    if (!row) return res.status(404).json({ error: 'Consent form not found' })
    res.json({ consentForm: row })
  } catch (e) { return handleError(res, e) }
}

export async function removeConsentForm(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdConsentForm.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'Consent form not found' })
    res.json({ ok: true })
  } catch (e) { return handleError(res, e) }
}

// ==================== History & Examination ====================

export async function createHistoryExam(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const row = await HospitalIpdHistoryExam.create({ ...req.body, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ historyExam: row })
  } catch (e) { return handleError(res, e) }
}

export async function listHistoryExams(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    if (q.examType) crit.examType = q.examType
    const total = await HospitalIpdHistoryExam.countDocuments(crit)
    const rows = await HospitalIpdHistoryExam.find(crit)
      .populate('doctorId', 'name')
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    res.json({ historyExams: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function getHistoryExam(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdHistoryExam.findById(id)
      .populate('doctorId', 'name')
      .populate('departmentId', 'name')
    if (!row) return res.status(404).json({ error: 'History & exam not found' })
    res.json({ historyExam: row })
  } catch (e) { return handleError(res, e) }
}

export async function updateHistoryExam(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdHistoryExam.findByIdAndUpdate(id, { $set: req.body }, { new: true })
    if (!row) return res.status(404).json({ error: 'History & exam not found' })
    res.json({ historyExam: row })
  } catch (e) { return handleError(res, e) }
}

export async function removeHistoryExam(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdHistoryExam.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'History & exam not found' })
    res.json({ ok: true })
  } catch (e) { return handleError(res, e) }
}

// ==================== Blood Transfusion ====================

export async function createBloodTransfusion(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const row = await HospitalIpdBloodTransfusion.create({ ...req.body, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ bloodTransfusion: row })
  } catch (e) { return handleError(res, e) }
}

export async function listBloodTransfusions(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    if (q.status) crit.status = q.status
    const total = await HospitalIpdBloodTransfusion.countDocuments(crit)
    const rows = await HospitalIpdBloodTransfusion.find(crit)
      .populate('orderedByDoctorId', 'name')
      .sort({ transfusionDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    res.json({ bloodTransfusions: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function getBloodTransfusion(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdBloodTransfusion.findById(id).populate('orderedByDoctorId', 'name')
    if (!row) return res.status(404).json({ error: 'Blood transfusion not found' })
    res.json({ bloodTransfusion: row })
  } catch (e) { return handleError(res, e) }
}

export async function updateBloodTransfusion(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdBloodTransfusion.findByIdAndUpdate(id, { $set: req.body }, { new: true })
    if (!row) return res.status(404).json({ error: 'Blood transfusion not found' })
    res.json({ bloodTransfusion: row })
  } catch (e) { return handleError(res, e) }
}

export async function removeBloodTransfusion(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdBloodTransfusion.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'Blood transfusion not found' })
    res.json({ ok: true })
  } catch (e) { return handleError(res, e) }
}

// ==================== ICU Monitoring ====================

export async function createIcuMonitoring(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const row = await HospitalIpdIcuMonitoring.create({ ...req.body, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ icuMonitoring: row })
  } catch (e) { return handleError(res, e) }
}

export async function listIcuMonitoring(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    if (q.shift) crit.shift = q.shift
    const total = await HospitalIpdIcuMonitoring.countDocuments(crit)
    const rows = await HospitalIpdIcuMonitoring.find(crit)
      .sort({ recordedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    res.json({ icuMonitoringRecords: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function getIcuMonitoring(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdIcuMonitoring.findById(id)
    if (!row) return res.status(404).json({ error: 'ICU monitoring record not found' })
    res.json({ icuMonitoring: row })
  } catch (e) { return handleError(res, e) }
}

export async function updateIcuMonitoring(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdIcuMonitoring.findByIdAndUpdate(id, { $set: req.body }, { new: true })
    if (!row) return res.status(404).json({ error: 'ICU monitoring record not found' })
    res.json({ icuMonitoring: row })
  } catch (e) { return handleError(res, e) }
}

export async function removeIcuMonitoring(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdIcuMonitoring.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'ICU monitoring record not found' })
    res.json({ ok: true })
  } catch (e) { return handleError(res, e) }
}

// ==================== Surgical Safety ====================

export async function createSurgicalSafety(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const row = await HospitalIpdSurgicalSafety.create({ ...req.body, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ surgicalSafety: row })
  } catch (e) { return handleError(res, e) }
}

export async function listSurgicalSafety(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    if (q.status) crit.status = q.status
    const total = await HospitalIpdSurgicalSafety.countDocuments(crit)
    const rows = await HospitalIpdSurgicalSafety.find(crit)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    res.json({ surgicalSafetyRecords: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function getSurgicalSafety(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdSurgicalSafety.findById(id)
    if (!row) return res.status(404).json({ error: 'Surgical safety record not found' })
    res.json({ surgicalSafety: row })
  } catch (e) { return handleError(res, e) }
}

export async function updateSurgicalSafety(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdSurgicalSafety.findByIdAndUpdate(id, { $set: req.body }, { new: true })
    if (!row) return res.status(404).json({ error: 'Surgical safety record not found' })
    res.json({ surgicalSafety: row })
  } catch (e) { return handleError(res, e) }
}

export async function removeSurgicalSafety(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdSurgicalSafety.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'Surgical safety record not found' })
    res.json({ ok: true })
  } catch (e) { return handleError(res, e) }
}

// ==================== Fluid Balance ====================

export async function createFluidBalance(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const row = await HospitalIpdFluidBalance.create({ ...req.body, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ fluidBalance: row })
  } catch (e) { return handleError(res, e) }
}

export async function listFluidBalance(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    if (q.date) crit.date = q.date
    if (q.shift) crit.shift = q.shift
    const total = await HospitalIpdFluidBalance.countDocuments(crit)
    const rows = await HospitalIpdFluidBalance.find(crit)
      .sort({ date: -1, shift: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    res.json({ fluidBalanceRecords: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function getFluidBalance(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdFluidBalance.findById(id)
    if (!row) return res.status(404).json({ error: 'Fluid balance record not found' })
    res.json({ fluidBalance: row })
  } catch (e) { return handleError(res, e) }
}

export async function updateFluidBalance(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdFluidBalance.findByIdAndUpdate(id, { $set: req.body }, { new: true })
    if (!row) return res.status(404).json({ error: 'Fluid balance record not found' })
    res.json({ fluidBalance: row })
  } catch (e) { return handleError(res, e) }
}

export async function removeFluidBalance(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdFluidBalance.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'Fluid balance record not found' })
    res.json({ ok: true })
  } catch (e) { return handleError(res, e) }
}

// ==================== Consultations ====================

export async function createConsultation(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const row = await HospitalIpdConsultation.create({ ...req.body, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ consultation: row })
  } catch (e) { return handleError(res, e) }
}

export async function listConsultations(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    if (q.type) crit.type = q.type
    if (q.status) crit.status = q.status
    if (q.consultantSpecialty) crit.consultantSpecialty = q.consultantSpecialty
    const total = await HospitalIpdConsultation.countDocuments(crit)
    const rows = await HospitalIpdConsultation.find(crit)
      .populate('requestedByDoctorId', 'name')
      .populate('consultantDoctorId', 'name')
      .populate('doctorId', 'name')
      .sort({ noteDate: -1, requestedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    res.json({ consultations: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function getConsultation(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdConsultation.findById(id)
      .populate('requestedByDoctorId', 'name')
      .populate('consultantDoctorId', 'name')
    if (!row) return res.status(404).json({ error: 'Consultation not found' })
    res.json({ consultation: row })
  } catch (e) { return handleError(res, e) }
}

export async function updateConsultation(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdConsultation.findByIdAndUpdate(id, { $set: req.body }, { new: true })
    if (!row) return res.status(404).json({ error: 'Consultation not found' })
    res.json({ consultation: row })
  } catch (e) { return handleError(res, e) }
}

export async function removeConsultation(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdConsultation.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'Consultation not found' })
    res.json({ ok: true })
  } catch (e) { return handleError(res, e) }
}

// ==================== Documents ====================

export async function createDocument(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const row = await HospitalIpdDocument.create({ ...req.body, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ document: row })
  } catch (e) { return handleError(res, e) }
}

export async function listDocuments(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    if (q.documentType) crit.documentType = q.documentType
    if (q.category) crit.category = q.category
    const total = await HospitalIpdDocument.countDocuments(crit)
    const rows = await HospitalIpdDocument.find(crit)
      .sort({ documentDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    res.json({ documents: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function getDocument(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdDocument.findById(id)
    if (!row) return res.status(404).json({ error: 'Document not found' })
    res.json({ document: row })
  } catch (e) { return handleError(res, e) }
}

export async function updateDocument(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdDocument.findByIdAndUpdate(id, { $set: req.body }, { new: true })
    if (!row) return res.status(404).json({ error: 'Document not found' })
    res.json({ document: row })
  } catch (e) { return handleError(res, e) }
}

export async function removeDocument(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdDocument.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'Document not found' })
    res.json({ ok: true })
  } catch (e) { return handleError(res, e) }
}

// ==================== Clinical Notes (Updated) ====================

export async function createClinicalNoteNew(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const row = await HospitalIpdClinicalNote.create({ ...req.body, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ clinicalNote: row })
  } catch (e) { return handleError(res, e) }
}

export async function listClinicalNotesNew(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    if (q.noteType) crit.type = q.noteType
    if (q.type) crit.type = q.type
    if (q.status) crit.status = q.status
    const total = await HospitalIpdClinicalNote.countDocuments(crit)
    const rows = await HospitalIpdClinicalNote.find(crit)
      .sort({ noteDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    res.json({ clinicalNotes: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function getClinicalNote(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdClinicalNote.findById(id)
    if (!row) return res.status(404).json({ error: 'Clinical note not found' })
    res.json({ clinicalNote: row })
  } catch (e) { return handleError(res, e) }
}

export async function updateClinicalNoteNew(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdClinicalNote.findByIdAndUpdate(id, { $set: req.body }, { new: true })
    if (!row) return res.status(404).json({ error: 'Clinical note not found' })
    res.json({ clinicalNote: row })
  } catch (e) { return handleError(res, e) }
}

export async function removeClinicalNoteNew(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdClinicalNote.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'Clinical note not found' })
    res.json({ ok: true })
  } catch (e) { return handleError(res, e) }
}

// ==================== Operation Consent (3-in-1) ====================

export async function createOperationConsent(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const row = await HospitalIpdOperationConsent.create({ ...req.body, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ operationConsent: row })
  } catch (e) { return handleError(res, e) }
}

export async function listOperationConsents(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    if (q.status) crit.status = q.status
    const total = await HospitalIpdOperationConsent.countDocuments(crit)
    const rows = await HospitalIpdOperationConsent.find(crit)
      .populate('doctorId', 'name')
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    res.json({ operationConsents: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function getOperationConsent(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdOperationConsent.findById(id).populate('doctorId', 'name')
    if (!row) return res.status(404).json({ error: 'Operation consent not found' })
    res.json({ operationConsent: row })
  } catch (e) { return handleError(res, e) }
}

export async function updateOperationConsent(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdOperationConsent.findByIdAndUpdate(id, { $set: req.body }, { new: true })
    if (!row) return res.status(404).json({ error: 'Operation consent not found' })
    res.json({ operationConsent: row })
  } catch (e) { return handleError(res, e) }
}

export async function removeOperationConsent(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdOperationConsent.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'Operation consent not found' })
    res.json({ ok: true })
  } catch (e) { return handleError(res, e) }
}

// ==================== Infection Control ====================

export async function createInfectionControl(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const row = await HospitalIpdInfectionControl.create({ ...req.body, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ infectionControl: row })
  } catch (e) { return handleError(res, e) }
}

export async function listInfectionControls(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    if (q.status) crit.status = q.status
    const total = await HospitalIpdInfectionControl.countDocuments(crit)
    const rows = await HospitalIpdInfectionControl.find(crit)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    res.json({ infectionControls: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function getInfectionControl(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdInfectionControl.findById(id)
    if (!row) return res.status(404).json({ error: 'Infection control record not found' })
    res.json({ infectionControl: row })
  } catch (e) { return handleError(res, e) }
}

export async function updateInfectionControl(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdInfectionControl.findByIdAndUpdate(id, { $set: req.body }, { new: true })
    if (!row) return res.status(404).json({ error: 'Infection control record not found' })
    res.json({ infectionControl: row })
  } catch (e) { return handleError(res, e) }
}

export async function removeInfectionControl(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdInfectionControl.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'Infection control record not found' })
    res.json({ ok: true })
  } catch (e) { return handleError(res, e) }
}
