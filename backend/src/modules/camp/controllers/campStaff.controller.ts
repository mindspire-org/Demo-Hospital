import { Request, Response } from 'express'
import { CampStaffAssignment } from '../models/CampStaffAssignment'
import { campStaffCreateSchema, campStaffUpdateSchema } from '../validators'

export async function list(req: Request, res: Response) {
  const { campId, role, active } = req.query as any
  const filter: any = {}
  if (campId) filter.campId = campId
  if (role) filter.role = role
  if (active !== undefined) filter.active = active === 'true' || active === true
  const items = await CampStaffAssignment.find(filter).sort({ createdAt: -1 }).lean()
  res.json({ items })
}

export async function get(req: Request, res: Response) {
  const { id } = req.params
  const item = await CampStaffAssignment.findById(id).lean()
  if (!item) return res.status(404).json({ message: 'Assignment not found' })
  res.json(item)
}

export async function create(req: Request, res: Response) {
  const parsed = campStaffCreateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Validation failed', issues: parsed.error.issues })
  const data = parsed.data
  const exists = await CampStaffAssignment.findOne({ campId: data.campId, userId: data.userId }).lean()
  if (exists) return res.status(400).json({ message: 'Staff already assigned to this camp' })
  const item = await CampStaffAssignment.create(data)
  res.status(201).json(item)
}

export async function update(req: Request, res: Response) {
  const { id } = req.params
  const parsed = campStaffUpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Validation failed', issues: parsed.error.issues })
  const item = await CampStaffAssignment.findByIdAndUpdate(id, { $set: parsed.data }, { new: true })
  if (!item) return res.status(404).json({ message: 'Assignment not found' })
  res.json(item)
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params
  await CampStaffAssignment.findByIdAndDelete(id)
  res.json({ ok: true })
}
