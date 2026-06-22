import { Request, Response } from 'express'
import { AuditLog } from '../models/AuditLog'

export async function list(req: Request, res: Response) {
  const page = Math.max(1, Number((req.query as any).page || 1))
  const limit = Math.max(1, Math.min(500, Number((req.query as any).limit || 50))
  )
  const total = await AuditLog.countDocuments()
  const skip = (page - 1) * limit
  const items = await AuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
  const totalPages = Math.max(1, Math.ceil(total / limit))
  res.json({ items, total, page, totalPages })
}
