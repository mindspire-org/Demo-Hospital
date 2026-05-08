import { Request, Response } from 'express'
import { LabCriticalEvent } from '../models/CriticalEvent'
import { LabCriticalParameter } from '../models/CriticalParameter'
import { LabNotification } from '../models/Notification'
import { logAudit, actorOf } from '../utils/audit'
import { scopeFilter } from '../middleware/scope'

// ===== Critical Events =====

export async function listEvents(req: Request, res: Response) {
  const { status, from, to, resultId, orderId, page = '1', limit = '50' } = req.query as any
  const filter: any = { ...scopeFilter(req, 'collectionCenterId') }
  if (status) filter.status = status
  if (resultId) filter.resultId = String(resultId)
  if (orderId) filter.orderId = String(orderId)
  if (from || to) {
    filter.detectedAt = {}
    if (from) filter.detectedAt.$gte = String(from)
    if (to) filter.detectedAt.$lte = String(to) + 'T23:59:59.999Z'
  }
  const lim = Math.min(500, Number(limit) || 50)
  const pg = Math.max(1, Number(page) || 1)
  const skip = (pg - 1) * lim
  const [items, total] = await Promise.all([
    LabCriticalEvent.find(filter).sort({ detectedAt: -1 }).skip(skip).limit(lim).lean(),
    LabCriticalEvent.countDocuments(filter),
  ])
  const totalPages = Math.max(1, Math.ceil((total || 0) / lim))
  res.json({ items, total, page: pg, totalPages })
}

export async function getEvent(req: Request, res: Response) {
  const doc = await LabCriticalEvent.findById(req.params.id).lean()
  if (!doc) return res.status(404).json({ message: 'Not found' })
  res.json(doc)
}

export async function createEvent(req: Request, res: Response) {
  const { actor } = actorOf(req)
  const detectedAt = new Date().toISOString()
  const doc = await LabCriticalEvent.create({
    ...req.body,
    detectedAt,
    detectedBy: actor,
    status: 'open',
    log: [{ at: detectedAt, by: actor, action: 'detected', note: req.body?.note }],
  })
  // Notify main lab + center
  try {
    await LabNotification.create({
      scope: 'main',
      kind: 'critical',
      title: `Critical: ${doc.parameter} = ${doc.value}`,
      body: `Patient ${doc.patientName || ''} (${doc.testName || ''})`,
      meta: { eventId: doc._id, orderId: doc.orderId },
    })
    if (doc.collectionCenterId) {
      await LabNotification.create({
        scope: 'center',
        centerId: doc.collectionCenterId,
        kind: 'critical',
        title: `Critical: ${doc.parameter} = ${doc.value}`,
        body: `Patient ${doc.patientName || ''} (${doc.testName || ''})`,
        meta: { eventId: doc._id, orderId: doc.orderId },
      })
    }
  } catch {}
  await logAudit(req, { action: 'critical.create', entity: 'critical', entityId: String(doc._id), label: doc.parameter, after: doc.toObject() })
  res.status(201).json(doc)
}

export async function resolveEvent(req: Request, res: Response) {
  const { actor } = actorOf(req)
  const { doctor, comment, infoMode, date } = req.body || {}
  const doc: any = await LabCriticalEvent.findById(req.params.id)
  if (!doc) return res.status(404).json({ message: 'Not found' })
  doc.status = 'resolved'
  doc.resolvedAt = date || new Date().toISOString()
  doc.resolvedBy = actor
  doc.doctor = doctor
  doc.comment = comment
  doc.infoMode = infoMode
  doc.log.push({ at: doc.resolvedAt, by: actor, action: 'resolved', note: comment })
  await doc.save()
  await logAudit(req, { action: 'critical.resolve', entity: 'critical', entityId: req.params.id, label: doc.parameter, after: doc.toObject() })
  res.json(doc)
}

// ===== Critical Parameters (admin list) =====

export async function listParameters(_req: Request, res: Response) {
  const items = await LabCriticalParameter.find({}).sort({ parameter: 1 }).lean()
  res.json({ items })
}

export async function createParameter(req: Request, res: Response) {
  const doc = await LabCriticalParameter.create(req.body)
  await logAudit(req, { action: 'critical_param.create', entity: 'critical_param', entityId: String(doc._id), label: doc.parameter, after: doc.toObject() })
  res.status(201).json(doc)
}

export async function updateParameter(req: Request, res: Response) {
  const before = await LabCriticalParameter.findById(req.params.id).lean()
  const doc = await LabCriticalParameter.findByIdAndUpdate(req.params.id, req.body, { new: true })
  if (!doc) return res.status(404).json({ message: 'Not found' })
  await logAudit(req, { action: 'critical_param.update', entity: 'critical_param', entityId: req.params.id, label: doc.parameter, before, after: doc.toObject() })
  res.json(doc)
}

export async function deleteParameter(req: Request, res: Response) {
  await LabCriticalParameter.findByIdAndDelete(req.params.id)
  await logAudit(req, { action: 'critical_param.delete', entity: 'critical_param', entityId: req.params.id })
  res.json({ ok: true })
}
