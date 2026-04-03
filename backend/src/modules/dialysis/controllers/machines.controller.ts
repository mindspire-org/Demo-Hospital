import { Request, Response } from 'express'
import { DialysisMachine } from '../models/Machine'
import { machineCreateSchema, machineUpdateSchema } from '../validators/machine'

export async function list(_req: Request, res: Response) {
  const items = await DialysisMachine.find().sort({ createdAt: 1 }).lean()
  res.json({ items })
}

export async function create(req: Request, res: Response) {
  const data = machineCreateSchema.parse(req.body)
  const m = await DialysisMachine.create(data)
  res.status(201).json(m)
}

export async function update(req: Request, res: Response) {
  const id = String(req.params.id)
  const data = machineUpdateSchema.parse(req.body)
  const m = await DialysisMachine.findByIdAndUpdate(id, data, { new: true })
  if (!m) return res.status(404).json({ message: 'Machine not found' })
  res.json(m)
}

export async function remove(req: Request, res: Response) {
  const id = String(req.params.id)
  await DialysisMachine.findByIdAndDelete(id)
  res.json({ ok: true })
}
