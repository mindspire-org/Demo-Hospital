import { Request, Response } from 'express'
import { LabTestPackage } from '../models/TestPackage'
import { LabTest } from '../models/Test'
import { logAudit } from '../utils/audit'

export async function list(req: Request, res: Response) {
  const { q } = req.query as any
  const filter: any = {}
  if (q) filter.name = new RegExp(String(q), 'i')
  const items = await LabTestPackage.find(filter).sort({ name: 1 }).lean()

  // Ensure package test prices reflect current LabTest catalog prices for accuracy
  const testIds = new Set<string>()
  for (const pkg of items) {
    for (const t of (pkg.tests || [])) {
      if (t.testId) testIds.add(String(t.testId))
    }
  }
  const currentTests = testIds.size > 0
    ? await LabTest.find({ _id: { $in: Array.from(testIds) } }).select('_id price name').lean()
    : []
  const currentPriceMap = new Map<string, number>()
  const currentNameMap = new Map<string, string>()
  for (const t of currentTests) {
    currentPriceMap.set(String(t._id), Number(t.price || 0))
    currentNameMap.set(String(t._id), String(t.name || ''))
  }

  const updatedItems = items.map((pkg: any) => {
    const updatedTests = (pkg.tests || []).map((t: any) => {
      const currentPrice = currentPriceMap.get(String(t.testId))
      if (currentPrice != null) {
        return { ...t, price: currentPrice, testName: currentNameMap.get(String(t.testId)) || t.testName || '' }
      }
      return t
    })
    // Recalculate package price if stored price is 0 or doesn't match test sum (with discount applied)
    const testSum = updatedTests.reduce((s: number, t: any) => s + Number(t.price || 0), 0)
    const discountPct = Number(pkg.discountPct || 0)
    const computedPrice = discountPct > 0 ? Math.max(0, testSum - (testSum * discountPct / 100)) : testSum
    const finalPrice = Number(pkg.price || 0) > 0 ? Number(pkg.price || 0) : computedPrice
    return { ...pkg, tests: updatedTests, price: finalPrice, computedPrice, testSum }
  })

  res.json({ items: updatedItems })
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
