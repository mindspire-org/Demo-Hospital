import { Request, Response } from 'express'
import { CampSession } from '../models/CampSession'
import { campSessionCreateSchema, campSessionUpdateSchema } from '../validators'

export async function list(req: Request, res: Response) {
  const { campId } = req.query as any
  const filter: any = {}
  if (campId) filter.campId = campId
  const items = await CampSession.find(filter).sort({ date: -1 }).lean()
  res.json({ items })
}

export async function get(req: Request, res: Response) {
  const { id } = req.params
  const item = await CampSession.findById(id).lean()
  if (!item) return res.status(404).json({ message: 'Session not found' })
  res.json(item)
}

export async function create(req: Request, res: Response) {
  const parsed = campSessionCreateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Validation failed', issues: parsed.error.issues })
  const data = parsed.data
  const exists = await CampSession.findOne({ campId: data.campId, date: data.date }).lean()
  if (exists) return res.status(400).json({ message: 'Session already exists for this date' })
  const item = await CampSession.create(data)
  res.status(201).json(item)
}

export async function update(req: Request, res: Response) {
  const { id } = req.params
  const parsed = campSessionUpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Validation failed', issues: parsed.error.issues })
  const item = await CampSession.findByIdAndUpdate(id, { $set: parsed.data }, { new: true })
  if (!item) return res.status(404).json({ message: 'Session not found' })
  res.json(item)
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params
  await CampSession.findByIdAndDelete(id)
  res.json({ ok: true })
}
