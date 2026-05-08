import { Request, Response } from 'express'
import { LabOutsourceLab } from '../models/OutsourceLab'
import { LabOutsourceRateList, LabOutsourceDispatch } from '../models/OutsourceRateList'
import { logAudit, actorOf } from '../utils/audit'

// ===== Outsource Labs =====

export async function list(_req: Request, res: Response) {
  const items = await LabOutsourceLab.find({}).sort({ name: 1 }).lean()
  res.json({ items })
}

export async function create(req: Request, res: Response) {
  const doc = await LabOutsourceLab.create(req.body)
  await logAudit(req, { action: 'outsource_lab.create', entity: 'outsource_lab', entityId: String(doc._id), label: doc.name, after: doc.toObject() })
  res.status(201).json(doc)
}

export async function update(req: Request, res: Response) {
  const before = await LabOutsourceLab.findById(req.params.id).lean()
  const doc = await LabOutsourceLab.findByIdAndUpdate(req.params.id, req.body, { new: true })
  if (!doc) return res.status(404).json({ message: 'Not found' })
  await logAudit(req, { action: 'outsource_lab.update', entity: 'outsource_lab', entityId: req.params.id, label: doc.name, before, after: doc.toObject() })
  res.json(doc)
}

export async function remove(req: Request, res: Response) {
  await LabOutsourceLab.findByIdAndDelete(req.params.id)
  await logAudit(req, { action: 'outsource_lab.delete', entity: 'outsource_lab', entityId: req.params.id })
  res.json({ ok: true })
}

// ===== Rate List =====

export async function listRates(req: Request, res: Response) {
  const { outsourceLabId, q, status } = req.query as any
  const filter: any = {}
  if (outsourceLabId) filter.outsourceLabId = outsourceLabId
  if (q) filter.testName = new RegExp(String(q), 'i')
  if (status === 'agreed') filter.status = true
  if (status === 'non_agreed') filter.status = false
  const items = await LabOutsourceRateList.find(filter).sort({ testName: 1 }).limit(2000).lean()
  res.json({ items })
}

export async function upsertRate(req: Request, res: Response) {
  const { outsourceLabId, testId, ...rest } = req.body || {}
  if (!outsourceLabId || !testId) return res.status(400).json({ message: 'outsourceLabId and testId required' })
  const doc = await LabOutsourceRateList.findOneAndUpdate(
    { outsourceLabId, testId },
    { $set: { outsourceLabId, testId, ...rest } },
    { new: true, upsert: true },
  )
  res.json(doc)
}

export async function bulkSaveRates(req: Request, res: Response) {
  const { outsourceLabId, items = [] } = req.body || {}
  if (!outsourceLabId) return res.status(400).json({ message: 'outsourceLabId required' })
  const ops = items.map((it: any) => ({
    updateOne: {
      filter: { outsourceLabId, testId: it.testId },
      update: { $set: { outsourceLabId, ...it } },
      upsert: true,
    },
  }))
  if (ops.length) await LabOutsourceRateList.bulkWrite(ops)
  await logAudit(req, { action: 'outsource_rate.bulk_save', entity: 'outsource_rate', entityId: String(outsourceLabId), label: `${ops.length} rows` })
  res.json({ ok: true, count: ops.length })
}

export async function copyRateList(req: Request, res: Response) {
  const { fromId } = req.params
  const { toId } = req.body || {}
  if (!toId) return res.status(400).json({ message: 'toId required' })
  const src = await LabOutsourceRateList.find({ outsourceLabId: fromId }).lean()
  const ops = src.map((s: any) => ({
    updateOne: {
      filter: { outsourceLabId: toId, testId: s.testId },
      update: {
        $set: {
          outsourceLabId: toId,
          testId: s.testId,
          testName: s.testName,
          category: s.category,
          status: s.status,
          labRate: s.labRate,
          outsourceShareRs: s.outsourceShareRs,
          outsourceSharePct: s.outsourceSharePct,
        },
      },
      upsert: true,
    },
  }))
  if (ops.length) await LabOutsourceRateList.bulkWrite(ops)
  await logAudit(req, { action: 'outsource_rate.copy', entity: 'outsource_rate', label: `${fromId}->${toId}` })
  res.json({ ok: true, count: ops.length })
}

// ===== Dispatch =====

export async function listDispatches(req: Request, res: Response) {
  const { outsourceLabId, status, from, to } = req.query as any
  const filter: any = {}
  if (outsourceLabId) filter.outsourceLabId = outsourceLabId
  if (status) filter.status = status
  if (from || to) {
    filter.dispatchedAt = {}
    if (from) filter.dispatchedAt.$gte = String(from)
    if (to) filter.dispatchedAt.$lte = String(to) + 'T23:59:59.999Z'
  }
  const items = await LabOutsourceDispatch.find(filter).sort({ dispatchedAt: -1 }).limit(1000).lean()
  res.json({ items })
}

export async function createDispatch(req: Request, res: Response) {
  const { actor } = actorOf(req)
  const doc = await LabOutsourceDispatch.create({
    ...req.body,
    dispatchedAt: new Date().toISOString(),
    dispatchedBy: actor,
    status: 'dispatched',
  })
  await logAudit(req, { action: 'outsource_dispatch.create', entity: 'outsource_dispatch', entityId: String(doc._id), after: doc.toObject() })
  res.status(201).json(doc)
}

export async function updateDispatch(req: Request, res: Response) {
  const { actor } = actorOf(req)
  const patch: any = { ...req.body }
  if (patch.status === 'received' && !patch.receivedAt) {
    patch.receivedAt = new Date().toISOString()
    patch.receivedBy = actor
  }
  const doc = await LabOutsourceDispatch.findByIdAndUpdate(req.params.id, patch, { new: true })
  if (!doc) return res.status(404).json({ message: 'Not found' })
  await logAudit(req, { action: 'outsource_dispatch.update', entity: 'outsource_dispatch', entityId: req.params.id, after: doc.toObject() })
  res.json(doc)
}
