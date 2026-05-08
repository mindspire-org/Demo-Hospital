import { Request, Response } from 'express'
import { LabPatientCard, PatientCardKind } from '../models/PatientCard'
import { LabPatient } from '../models/Patient'
import { logAudit, actorOf } from '../utils/audit'

const KIND_DEFAULTS: Record<PatientCardKind, { months: number; visits: number }> = {
  gynae9m: { months: 9, visits: 9 },
  hep3m: { months: 3, visits: 6 },
  tb2y: { months: 24, visits: 24 },
  mdrtb2y: { months: 24, visits: 36 },
  admitted: { months: 1, visits: 0 },
  general: { months: 12, visits: 0 },
}

function nextCardNumber() {
  return 'PC-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0')
}

export async function list(req: Request, res: Response) {
  const { patientId, status, kind, page = '1', limit = '50' } = req.query as any
  const filter: any = {}
  if (patientId) filter.patientId = patientId
  if (status) filter.status = status
  if (kind) filter.cardKind = kind
  const lim = Math.min(500, Number(limit) || 50)
  const pg = Math.max(1, Number(page) || 1)
  const [items, total] = await Promise.all([
    LabPatientCard.find(filter).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim).lean(),
    LabPatientCard.countDocuments(filter),
  ])
  res.json({ items, total, page: pg, totalPages: Math.max(1, Math.ceil(total / lim)) })
}

export async function get(req: Request, res: Response) {
  const doc = await LabPatientCard.findById(req.params.id).lean()
  if (!doc) return res.status(404).json({ message: 'Not found' })
  res.json(doc)
}

export async function create(req: Request, res: Response) {
  const { patientId, cardKind = 'general', validVisits, scheme, notes, expiresAt, qrCode } = req.body || {}
  if (!patientId) return res.status(400).json({ message: 'patientId is required' })
  const issuedAt = new Date().toISOString()
  const def = KIND_DEFAULTS[cardKind as PatientCardKind] || KIND_DEFAULTS.general
  const exp = expiresAt || new Date(Date.now() + def.months * 30 * 24 * 60 * 60 * 1000).toISOString()
  const doc = await LabPatientCard.create({
    patientId,
    cardKind,
    cardNo: nextCardNumber(),
    issuedAt,
    expiresAt: exp,
    validVisits: validVisits ?? def.visits,
    visitsUsed: 0,
    scheme,
    notes,
    qrCode,
    status: 'active',
  })
  // Mark this card as the active card on patient
  try { await LabPatient.findByIdAndUpdate(patientId, { activeCardId: doc._id }) } catch {}
  await logAudit(req, { action: 'patient_card.create', entity: 'patient_card', entityId: String(doc._id), after: doc.toObject() })
  res.status(201).json(doc)
}

export async function markPrinted(req: Request, res: Response) {
  const { actor } = actorOf(req)
  const doc = await LabPatientCard.findByIdAndUpdate(
    req.params.id,
    { printedAt: new Date().toISOString(), printedBy: actor },
    { new: true },
  )
  if (!doc) return res.status(404).json({ message: 'Not found' })
  res.json(doc)
}

export async function remove(req: Request, res: Response) {
  await LabPatientCard.findByIdAndDelete(req.params.id)
  await logAudit(req, { action: 'patient_card.delete', entity: 'patient_card', entityId: req.params.id })
  res.json({ ok: true })
}
