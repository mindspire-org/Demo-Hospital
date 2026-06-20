import { Request, Response } from 'express'
import { CampAuditLog } from '../models/CampAuditLog'

export async function list(req: Request, res: Response) {
  const { action, actor, from, to } = req.query as any
  const filter: any = {}
  if (action) filter.action = { $regex: action, $options: 'i' }
  if (actor) filter.actor = { $regex: actor, $options: 'i' }
  if (from || to) {
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(from as string)
    if (to) filter.createdAt.$lte = new Date(to as string)
  }
  const items = await CampAuditLog.find(filter).sort({ createdAt: -1 }).limit(500).lean()
  res.json({ items })
}

export async function create(req: Request, res: Response) {
  const item = await CampAuditLog.create(req.body)
  res.status(201).json(item)
}
