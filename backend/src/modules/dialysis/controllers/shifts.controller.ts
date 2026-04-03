import { Request, Response } from 'express'
import { DialysisShift } from '../models/Shift'
import { shiftCreateSchema, shiftUpdateSchema } from '../validators/shift'

export async function list(_req: Request, res: Response) {
  const items = await DialysisShift.find().sort({ createdAt: 1 }).lean()
  res.json({ items })
}

export async function create(req: Request, res: Response) {
  const data = shiftCreateSchema.parse(req.body)
  const s = await DialysisShift.create(data)
  res.status(201).json(s)
}

export async function update(req: Request, res: Response) {
  const id = String(req.params.id)
  const data = shiftUpdateSchema.parse(req.body)
  const s = await DialysisShift.findByIdAndUpdate(id, data, { new: true })
  if (!s) return res.status(404).json({ message: 'Shift not found' })
  res.json(s)
}

export async function remove(req: Request, res: Response) {
  const id = String(req.params.id)
  await DialysisShift.findByIdAndDelete(id)
  res.json({ ok: true })
}
