import { Request, Response } from 'express'
import { LabNotification } from '../models/Notification'
import { actorOf } from '../utils/audit'

export async function list(req: Request, res: Response) {
  const scope: any = (req as any).scope || { isMainLab: true, centerIds: null }
  const { unreadOnly, limit = '100' } = req.query as any
  const filter: any = {}
  if (scope.isMainLab) {
    // Main lab sees all main + center notifications
  } else if (scope.centerIds) {
    filter.$or = [{ scope: 'center', centerId: { $in: scope.centerIds } }, { scope: 'main' }]
  }
  if (unreadOnly === 'true') filter.read = false
  const items = await LabNotification.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(500, Number(limit) || 100))
    .lean()
  const unreadCount = await LabNotification.countDocuments({ ...filter, read: false })
  res.json({ items, unreadCount })
}

export async function create(req: Request, res: Response) {
  const doc = await LabNotification.create(req.body)
  res.status(201).json(doc)
}

export async function markRead(req: Request, res: Response) {
  const { actor } = actorOf(req)
  const doc = await LabNotification.findByIdAndUpdate(
    req.params.id,
    { $set: { read: true }, $addToSet: { readBy: actor } },
    { new: true },
  )
  if (!doc) return res.status(404).json({ message: 'Not found' })
  res.json(doc)
}

export async function markAllRead(req: Request, res: Response) {
  const { actor } = actorOf(req)
  await LabNotification.updateMany({ read: false }, { $set: { read: true }, $addToSet: { readBy: actor } })
  res.json({ ok: true })
}
