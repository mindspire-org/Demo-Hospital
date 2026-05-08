import { Request, Response } from 'express'
import { LabTestPackage } from '../models/TestPackage'
import { logAudit } from '../utils/audit'

export async function list(req: Request, res: Response) {
  const { q } = req.query as any
  const filter: any = {}
  if (q) filter.name = new RegExp(String(q), 'i')
  const items = await LabTestPackage.find(filter).sort({ name: 1 }).lean()
  res.json({ items })
}

export async function get(req: Request, res: Response) {
  const doc = await LabTestPackage.findById(req.params.id).lean()
  if (!doc) return res.status(404).json({ message: 'Not found' })
  res.json(doc)
}

export async function create(req: Request, res: Response) {
  const doc = await LabTestPackage.create(req.body)
  await logAudit(req, { action: 'package.create', entity: 'package', entityId: String(doc._id), label: doc.name, after: doc.toObject() })
  res.status(201).json(doc)
}

export async function update(req: Request, res: Response) {
  const before = await LabTestPackage.findById(req.params.id).lean()
  const doc = await LabTestPackage.findByIdAndUpdate(req.params.id, req.body, { new: true })
  if (!doc) return res.status(404).json({ message: 'Not found' })
  await logAudit(req, { action: 'package.update', entity: 'package', entityId: req.params.id, label: doc.name, before, after: doc.toObject() })
  res.json(doc)
}

export async function remove(req: Request, res: Response) {
  await LabTestPackage.findByIdAndDelete(req.params.id)
  await logAudit(req, { action: 'package.delete', entity: 'package', entityId: req.params.id })
  res.json({ ok: true })
}
