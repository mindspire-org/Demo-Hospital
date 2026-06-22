import { Request, Response } from 'express'
import { z } from 'zod'
import { HospitalEncounter } from '../models/Encounter'
import { HospitalDepartmentProgress } from '../models/DepartmentProgress'
import { LabPatient } from '../../lab/models/Patient'

// ── Department patient queue ────────────────────────────────────────────────
// Lists encounters for a department (optionally a doctor), newest first, with
// patient + doctor populated — the backbone of the department patient list.
export async function queue(req: Request, res: Response) {
  const q = req.query as any
  const departmentId = q.departmentId ? String(q.departmentId) : ''
  const doctorId = q.doctorId ? String(q.doctorId) : ''
  const status = q.status ? String(q.status) : ''
  const type = q.type ? String(q.type) : ''
  const from = q.from ? new Date(String(q.from)) : null
  const to = q.to ? new Date(String(q.to)) : null
  if (to) to.setHours(23, 59, 59, 999)
  const page = q.page ? Math.max(1, parseInt(String(q.page))) : 1
  const limit = q.limit ? Math.max(1, Math.min(200, parseInt(String(q.limit)))) : 50

  const crit: any = {}
  if (departmentId) crit.departmentId = departmentId
  if (doctorId) crit.doctorId = doctorId
  if (status) crit.status = status
  if (type) crit.type = type
  if (from || to) {
    crit.startAt = {}
    if (from) crit.startAt.$gte = from
    if (to) crit.startAt.$lte = to
  }

  const total = await HospitalEncounter.countDocuments(crit)
  const rows = await HospitalEncounter.find(crit)
    .sort({ startAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({ path: 'patientId', select: 'fullName mrn gender age phoneNormalized' })
    .populate({ path: 'doctorId', select: 'name specialization' })
    .lean()

  res.json({ encounters: rows, total, page, limit })
}

// ── Department progress timeline ────────────────────────────────────────────
const progressSchema = z.object({
  patientId: z.string().optional(),
  patientMrn: z.string().optional(),
  departmentId: z.string().optional().nullable(),
  departmentKey: z.string().optional().nullable(),
  doctorId: z.string().optional().nullable(),
  encounterId: z.string().optional().nullable(),
  title: z.string().min(1),
  stage: z.string().optional().nullable(),
  status: z.enum(['active', 'completed', 'on-hold']).optional(),
  notes: z.string().optional().nullable(),
  date: z.coerce.date().optional(),
  nextDate: z.coerce.date().optional().nullable(),
  createdBy: z.string().optional(),
})

async function resolvePatientId(body: any): Promise<string | null> {
  if (body.patientId) return String(body.patientId)
  if (body.patientMrn) {
    const p = await LabPatient.findOne({ mrn: String(body.patientMrn) }).select('_id').lean()
    if (p) return String((p as any)._id)
  }
  return null
}

export async function listProgress(req: Request, res: Response) {
  const q = req.query as any
  const crit: any = {}
  if (q.patientId) crit.patientId = String(q.patientId)
  if (q.patientMrn) {
    const p = await LabPatient.findOne({ mrn: String(q.patientMrn) }).select('_id').lean()
    if (!p) return res.json({ progress: [] })
    crit.patientId = (p as any)._id
  }
  if (q.departmentKey) crit.departmentKey = String(q.departmentKey)
  if (q.departmentId) crit.departmentId = String(q.departmentId)
  if (q.status) crit.status = String(q.status)

  const rows = await HospitalDepartmentProgress.find(crit)
    .sort({ date: -1, createdAt: -1 })
    .populate({ path: 'doctorId', select: 'name' })
    .lean()
  res.json({ progress: rows })
}

export async function createProgress(req: Request, res: Response) {
  const data = progressSchema.parse(req.body)
  const patientId = await resolvePatientId(data)
  if (!patientId) return res.status(400).json({ error: 'patientId or patientMrn required' })
  const row = await HospitalDepartmentProgress.create({ ...data, patientId })
  res.status(201).json({ progress: row })
}

export async function updateProgress(req: Request, res: Response) {
  const { id } = req.params as any
  const data = progressSchema.partial().parse(req.body)
  const set: any = { ...data }
  delete set.patientMrn
  const row = await HospitalDepartmentProgress.findByIdAndUpdate(String(id), { $set: set }, { new: true }).lean()
  if (!row) return res.status(404).json({ error: 'Progress entry not found' })
  res.json({ progress: row })
}

export async function removeProgress(req: Request, res: Response) {
  const { id } = req.params as any
  const row = await HospitalDepartmentProgress.findByIdAndDelete(String(id))
  if (!row) return res.status(404).json({ error: 'Progress entry not found' })
  res.json({ ok: true })
}
