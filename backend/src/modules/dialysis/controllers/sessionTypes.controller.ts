import { Request, Response } from 'express'
import { DialysisSessionType } from '../models/SessionType'
import { sessionTypeCreateSchema, sessionTypeUpdateSchema } from '../validators/sessionType'

export async function list(_req: Request, res: Response) {
  const items = await DialysisSessionType.find().sort({ createdAt: 1 }).lean()
  res.json({ items })
}

export async function create(req: Request, res: Response) {
  const data = sessionTypeCreateSchema.parse(req.body)
  const s = await DialysisSessionType.create(data)
  res.status(201).json(s)
}

export async function update(req: Request, res: Response) {
  const id = String(req.params.id)
  const data = sessionTypeUpdateSchema.parse(req.body)
  const s = await DialysisSessionType.findByIdAndUpdate(id, data, { new: true })
  if (!s) return res.status(404).json({ message: 'Session type not found' })
  res.json(s)
}

export async function remove(req: Request, res: Response) {
  const id = String(req.params.id)
  await DialysisSessionType.findByIdAndDelete(id)
  res.json({ ok: true })
}
