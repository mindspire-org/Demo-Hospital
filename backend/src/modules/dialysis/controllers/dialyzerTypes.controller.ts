import { Request, Response } from 'express'
import { DialysisDialyzerType } from '../models/DialyzerType'
import { dialyzerTypeCreateSchema, dialyzerTypeUpdateSchema } from '../validators/dialyzerType'

export async function list(_req: Request, res: Response) {
  const items = await DialysisDialyzerType.find().sort({ createdAt: 1 }).lean()
  res.json({ items })
}

export async function create(req: Request, res: Response) {
  const data = dialyzerTypeCreateSchema.parse(req.body)
  const s = await DialysisDialyzerType.create(data)
  res.status(201).json(s)
}

export async function update(req: Request, res: Response) {
  const id = String(req.params.id)
  const data = dialyzerTypeUpdateSchema.parse(req.body)
  const s = await DialysisDialyzerType.findByIdAndUpdate(id, data, { new: true })
  if (!s) return res.status(404).json({ message: 'Dialyzer type not found' })
  res.json(s)
}

export async function remove(req: Request, res: Response) {
  const id = String(req.params.id)
  await DialysisDialyzerType.findByIdAndDelete(id)
  res.json({ ok: true })
}
