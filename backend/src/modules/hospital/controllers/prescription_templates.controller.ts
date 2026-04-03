import { Request, Response } from 'express'
import { createPrescriptionTemplateSchema, updatePrescriptionTemplateSchema } from '../validators/prescription_template'
import { HospitalPrescriptionTemplate } from '../models/PrescriptionTemplate'
import { HospitalDoctor } from '../models/Doctor'
import { Types } from 'mongoose'

export async function create(req: Request, res: Response) {
  const data = createPrescriptionTemplateSchema.parse(req.body)

  const doctor = await HospitalDoctor.findById(data.doctorId)
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' })

  const existing = await HospitalPrescriptionTemplate.findOne({
    doctorId: data.doctorId,
    name: data.name
  })
  if (existing) return res.status(409).json({ error: 'Template with this name already exists for this doctor' })

  const template = await HospitalPrescriptionTemplate.create({
    doctorId: data.doctorId,
    name: data.name,
    items: data.items || [],
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
  })

  res.status(201).json({ template })
}

export async function list(req: Request, res: Response) {
  const q = req.query as any
  const doctorId = q.doctorId ? String(q.doctorId) : ''
  const page = q.page ? Math.max(1, parseInt(String(q.page))) : 1
  const limit = q.limit ? Math.max(1, Math.min(200, parseInt(String(q.limit)))) : 50

  const filter: any = {}
  if (doctorId) filter.doctorId = doctorId

  const total = await HospitalPrescriptionTemplate.countDocuments(filter)
  const rows = await HospitalPrescriptionTemplate.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({ path: 'doctorId', select: 'name' })
    .lean()

  res.json({ templates: rows, total, page, limit })
}

export async function getById(req: Request, res: Response) {
  const { id } = req.params as any
  const row = await HospitalPrescriptionTemplate.findById(String(id))
    .populate({ path: 'doctorId', select: 'name' })
    .lean()
  if (!row) return res.status(404).json({ error: 'Template not found' })
  res.json({ template: row })
}

export async function getByDoctor(req: Request, res: Response) {
  const { doctorId } = req.params as any
  if (!Types.ObjectId.isValid(doctorId)) {
    return res.status(400).json({ error: 'Invalid doctor ID' })
  }

  const rows = await HospitalPrescriptionTemplate.find({ doctorId })
    .sort({ name: 1 })
    .lean()

  res.json({ templates: rows })
}

export async function update(req: Request, res: Response) {
  const { id } = req.params as any
  const data = updatePrescriptionTemplateSchema.parse(req.body)

  const set: any = {}
  if (data.name !== undefined) set.name = data.name
  if (data.items !== undefined) set.items = data.items
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

  if (data.name) {
    const existing = await HospitalPrescriptionTemplate.findOne({
      _id: { $ne: id },
      doctorId: { $eq: (await HospitalPrescriptionTemplate.findById(id))?.doctorId },
      name: data.name
    })
    if (existing) return res.status(409).json({ error: 'Template with this name already exists for this doctor' })
  }

  const row = await HospitalPrescriptionTemplate.findByIdAndUpdate(String(id), { $set: set }, { new: true })
    .populate({ path: 'doctorId', select: 'name' })
    .lean()

  if (!row) return res.status(404).json({ error: 'Template not found' })
  res.json({ template: row })
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params as any
  const row = await HospitalPrescriptionTemplate.findByIdAndDelete(String(id))
  if (!row) return res.status(404).json({ error: 'Template not found' })
  res.json({ ok: true })
}
