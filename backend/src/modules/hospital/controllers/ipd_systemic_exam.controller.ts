import { Request, Response } from 'express'
import { HospitalEncounter } from '../models/Encounter'
import {
  HospitalIpdSystemicExam,
  SYSTEM_TYPE_TO_FIELD,
  ALL_SYSTEM_FIELDS,
  SystemType,
} from '../models/IpdSystemicExam'
import { HospitalIpdPressureUlcerRisk } from '../models/IpdPressureUlcerRisk'
import { HospitalIpdDailyUlcerAssessment } from '../models/IpdDailyUlcerAssessment'
import { HospitalIpdNicuEvaluation } from '../models/IpdNicuEvaluation'
import { HospitalIpdNewBornBabyNotes } from '../models/IpdNewBornBabyNotes'

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getIPDEncounter(encounterId: string) {
  const enc = await HospitalEncounter.findById(encounterId)
  if (!enc) throw { status: 404, error: 'Encounter not found' }
  if (enc.type !== 'IPD') throw { status: 400, error: 'Encounter is not IPD' }
  return enc
}

function handleError(res: Response, e: any) {
  console.error('[IPD Systemic Exam Error]', e)
  if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' })
  if (e?.name === 'ValidationError') return res.status(400).json({ error: e.message || 'Validation error' })
  if (e?.code === 11000) return res.status(409).json({ error: 'Duplicate entry' })
  if (e?.status) return res.status(e.status).json({ error: e.error || 'Error' })
  return res.status(500).json({ error: e?.message || 'Internal Server Error' })
}

/**
 * Enforce that only the sub-schema matching the declared systemType is populated.
 * Strips all other sub-schema fields from the payload to prevent mismatched writes.
 */
function sanitizeSystemicExamPayload(systemType: SystemType, body: any) {
  const allowedField = SYSTEM_TYPE_TO_FIELD[systemType]
  if (!allowedField) {
    throw { status: 400, error: `Invalid systemType: ${systemType}` }
  }

  // Build a clean payload: null out every sub-schema field except the matching one
  const clean: any = { ...body, systemType }
  for (const field of ALL_SYSTEM_FIELDS) {
    if (field === allowedField) {
      // keep the data the client sent
      clean[field] = body[field] ?? {}
    } else {
      // explicitly null so Mongoose strips it (minimize:true default)
      clean[field] = undefined
    }
  }
  return clean
}

// ==================== Systemic Exam CRUD ====================

export async function createSystemicExam(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const systemType = req.body.systemType as SystemType
    if (!systemType) return res.status(400).json({ error: 'systemType is required' })

    const clean = sanitizeSystemicExamPayload(systemType, req.body)
    const row = await HospitalIpdSystemicExam.create({
      ...clean,
      encounterId: enc._id,
      patientId: enc.patientId,
    })
    res.status(201).json({ systemicExam: row })
  } catch (e) { return handleError(res, e) }
}

export async function listSystemicExams(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    if (q.systemType) crit.systemType = q.systemType
    const total = await HospitalIpdSystemicExam.countDocuments(crit)
    const rows = await HospitalIpdSystemicExam.find(crit)
      .sort({ recordedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    res.json({ systemicExams: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function getSystemicExam(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdSystemicExam.findById(id)
    if (!row) return res.status(404).json({ error: 'Systemic exam not found' })
    res.json({ systemicExam: row })
  } catch (e) { return handleError(res, e) }
}

export async function updateSystemicExam(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const existing = await HospitalIpdSystemicExam.findById(id)
    if (!existing) return res.status(404).json({ error: 'Systemic exam not found' })

    // If systemType is being changed, reject — or re-sanitize
    const systemType = (req.body.systemType ?? existing.systemType) as SystemType
    const clean = sanitizeSystemicExamPayload(systemType, req.body)

    const row = await HospitalIpdSystemicExam.findByIdAndUpdate(id, { $set: clean }, { new: true })
    res.json({ systemicExam: row })
  } catch (e) { return handleError(res, e) }
}

export async function deleteSystemicExam(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdSystemicExam.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'Systemic exam not found' })
    res.json({ deleted: true })
  } catch (e) { return handleError(res, e) }
}

// ==================== Pressure Ulcer Risk CRUD ====================

export async function createPressureUlcerRisk(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const row = await HospitalIpdPressureUlcerRisk.create({
      ...req.body,
      encounterId: enc._id,
      patientId: enc.patientId,
    })
    res.status(201).json({ pressureUlcerRisk: row })
  } catch (e) { return handleError(res, e) }
}

export async function listPressureUlcerRisks(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    if (q.riskLevel) crit.riskLevel = q.riskLevel
    const total = await HospitalIpdPressureUlcerRisk.countDocuments(crit)
    const rows = await HospitalIpdPressureUlcerRisk.find(crit)
      .sort({ recordedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    res.json({ pressureUlcerRisks: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function getPressureUlcerRisk(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdPressureUlcerRisk.findById(id)
    if (!row) return res.status(404).json({ error: 'Pressure ulcer risk not found' })
    res.json({ pressureUlcerRisk: row })
  } catch (e) { return handleError(res, e) }
}

export async function updatePressureUlcerRisk(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdPressureUlcerRisk.findByIdAndUpdate(id, { $set: req.body }, { new: true })
    if (!row) return res.status(404).json({ error: 'Pressure ulcer risk not found' })
    res.json({ pressureUlcerRisk: row })
  } catch (e) { return handleError(res, e) }
}

export async function deletePressureUlcerRisk(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdPressureUlcerRisk.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'Pressure ulcer risk not found' })
    res.json({ deleted: true })
  } catch (e) { return handleError(res, e) }
}

// ==================== Daily Ulcer Assessment CRUD ====================

export async function createDailyUlcerAssessment(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const row = await HospitalIpdDailyUlcerAssessment.create({
      ...req.body,
      encounterId: enc._id,
      patientId: enc.patientId,
    })
    res.status(201).json({ dailyUlcerAssessment: row })
  } catch (e) { return handleError(res, e) }
}

export async function listDailyUlcerAssessments(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    const total = await HospitalIpdDailyUlcerAssessment.countDocuments(crit)
    const rows = await HospitalIpdDailyUlcerAssessment.find(crit)
      .sort({ recordedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    res.json({ dailyUlcerAssessments: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function getDailyUlcerAssessment(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdDailyUlcerAssessment.findById(id)
    if (!row) return res.status(404).json({ error: 'Daily ulcer assessment not found' })
    res.json({ dailyUlcerAssessment: row })
  } catch (e) { return handleError(res, e) }
}

export async function updateDailyUlcerAssessment(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdDailyUlcerAssessment.findByIdAndUpdate(id, { $set: req.body }, { new: true })
    if (!row) return res.status(404).json({ error: 'Daily ulcer assessment not found' })
    res.json({ dailyUlcerAssessment: row })
  } catch (e) { return handleError(res, e) }
}

export async function deleteDailyUlcerAssessment(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdDailyUlcerAssessment.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'Daily ulcer assessment not found' })
    res.json({ deleted: true })
  } catch (e) { return handleError(res, e) }
}

// ==================== NICU Evaluation CRUD ====================

export async function createNicuEvaluation(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const row = await HospitalIpdNicuEvaluation.create({
      ...req.body,
      encounterId: enc._id,
      patientId: enc.patientId,
    })
    res.status(201).json({ nicuEvaluation: row })
  } catch (e) { return handleError(res, e) }
}

export async function listNicuEvaluations(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    const total = await HospitalIpdNicuEvaluation.countDocuments(crit)
    const rows = await HospitalIpdNicuEvaluation.find(crit)
      .sort({ recordedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    res.json({ nicuEvaluations: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function getNicuEvaluation(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdNicuEvaluation.findById(id)
    if (!row) return res.status(404).json({ error: 'NICU evaluation not found' })
    res.json({ nicuEvaluation: row })
  } catch (e) { return handleError(res, e) }
}

export async function updateNicuEvaluation(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdNicuEvaluation.findByIdAndUpdate(id, { $set: req.body }, { new: true })
    if (!row) return res.status(404).json({ error: 'NICU evaluation not found' })
    res.json({ nicuEvaluation: row })
  } catch (e) { return handleError(res, e) }
}

export async function deleteNicuEvaluation(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdNicuEvaluation.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'NICU evaluation not found' })
    res.json({ deleted: true })
  } catch (e) { return handleError(res, e) }
}

// ==================== New Born Baby Notes CRUD ====================

export async function createNewBornBabyNotes(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const row = await HospitalIpdNewBornBabyNotes.create({
      ...req.body,
      encounterId: enc._id,
      patientId: enc.patientId,
    })
    res.status(201).json({ newBornBabyNotes: row })
  } catch (e) { return handleError(res, e) }
}

export async function listNewBornBabyNotes(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    const enc = await getIPDEncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    const total = await HospitalIpdNewBornBabyNotes.countDocuments(crit)
    const rows = await HospitalIpdNewBornBabyNotes.find(crit)
      .sort({ recordedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    res.json({ newBornBabyNotes: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function getNewBornBabyNotes(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdNewBornBabyNotes.findById(id)
    if (!row) return res.status(404).json({ error: 'New born baby notes not found' })
    res.json({ newBornBabyNotes: row })
  } catch (e) { return handleError(res, e) }
}

export async function updateNewBornBabyNotes(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdNewBornBabyNotes.findByIdAndUpdate(id, { $set: req.body }, { new: true })
    if (!row) return res.status(404).json({ error: 'New born baby notes not found' })
    res.json({ newBornBabyNotes: row })
  } catch (e) { return handleError(res, e) }
}

export async function deleteNewBornBabyNotes(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const row = await HospitalIpdNewBornBabyNotes.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'New born baby notes not found' })
    res.json({ deleted: true })
  } catch (e) { return handleError(res, e) }
}
