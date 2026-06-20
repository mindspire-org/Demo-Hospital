import { Request, Response } from 'express'
import { Camp } from '../models/Camp'
import { campCreateSchema, campUpdateSchema } from '../validators'

export async function list(req: Request, res: Response) {
  const { status, q } = req.query as any
  const filter: any = {}
  if (status) filter.status = status
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { location: { $regex: q, $options: 'i' } },
    ]
  }
  const items = await Camp.find(filter).sort({ startDate: -1 }).lean()
  res.json({ items })
}

export async function get(req: Request, res: Response) {
  const { id } = req.params
  const item = await Camp.findById(id).lean()
  if (!item) return res.status(404).json({ message: 'Camp not found' })
  res.json(item)
}

export async function create(req: Request, res: Response) {
  const parsed = campCreateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Validation failed', issues: parsed.error.issues })
  const data = parsed.data
  const item = await Camp.create(data)
  res.status(201).json(item)
}

export async function update(req: Request, res: Response) {
  const { id } = req.params
  const parsed = campUpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Validation failed', issues: parsed.error.issues })
  const item = await Camp.findByIdAndUpdate(id, { $set: parsed.data }, { new: true })
  if (!item) return res.status(404).json({ message: 'Camp not found' })
  res.json(item)
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params
  await Camp.findByIdAndDelete(id)
  res.json({ ok: true })
}

export async function stats(req: Request, res: Response) {
  const { id } = req.params
  const { CampPatient } = await import('../models/CampPatient')
  const { CampStaffAssignment } = await import('../models/CampStaffAssignment')
  const [totalPatients, consulted, prescriptions, referred, staffCount] = await Promise.all([
    CampPatient.countDocuments({ campId: id }),
    CampPatient.countDocuments({ campId: id, consultedBy: { $ne: '' } }),
    CampPatient.countDocuments({ campId: id, prescription: { $ne: '' } }),
    CampPatient.countDocuments({ campId: id, referredToHospital: true }),
    CampStaffAssignment.countDocuments({ campId: id, active: true }),
  ])
  res.json({ totalPatients, consulted, prescriptions, referred, staffCount })
}
