import { Request, Response } from 'express'
import { CampPatient } from '../models/CampPatient'
import { campPatientCreateSchema, campPatientUpdateSchema } from '../validators'

export async function list(req: Request, res: Response) {
  const { campId, q } = req.query as any
  const filter: any = {}
  if (campId) filter.campId = campId
  if (q) {
    filter.$or = [
      { fullName: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
      { tokenNo: { $regex: q, $options: 'i' } },
    ]
  }
  const items = await CampPatient.find(filter).sort({ createdAt: -1 }).lean()
  res.json({ items })
}

export async function get(req: Request, res: Response) {
  const { id } = req.params
  const item = await CampPatient.findById(id).lean()
  if (!item) return res.status(404).json({ message: 'Patient not found' })
  res.json(item)
}

export async function getByToken(req: Request, res: Response) {
  const { campId, tokenNo } = req.params
  const item = await CampPatient.findOne({ campId, tokenNo }).lean()
  if (!item) return res.status(404).json({ message: 'Patient not found' })
  res.json(item)
}

export async function create(req: Request, res: Response) {
  const parsed = campPatientCreateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Validation failed', issues: parsed.error.issues })
  const data = parsed.data
  const exists = await CampPatient.findOne({ campId: data.campId, tokenNo: data.tokenNo }).lean()
  if (exists) return res.status(400).json({ message: 'Token already exists for this camp' })
  const item = await CampPatient.create(data)
  res.status(201).json(item)
}

export async function update(req: Request, res: Response) {
  const { id } = req.params
  const parsed = campPatientUpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Validation failed', issues: parsed.error.issues })
  const item = await CampPatient.findByIdAndUpdate(id, { $set: parsed.data }, { new: true })
  if (!item) return res.status(404).json({ message: 'Patient not found' })
  res.json(item)
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params
  await CampPatient.findByIdAndDelete(id)
  res.json({ ok: true })
}
