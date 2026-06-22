import { Request, Response } from 'express'
import { Settings } from '../models/Settings'

export async function get(_req: Request, res: Response) {
  let doc: any = await Settings.findOne().lean()
  if (!doc) {
    const created = await Settings.create({})
    doc = created.toObject()
  }
  res.json(doc)
}

export async function update(req: Request, res: Response) {
  const { cafeteriaName, taxRate, currency, lowStockAlerts } = (req.body || {}) as any
  const patch: any = {}
  if (cafeteriaName !== undefined) patch.cafeteriaName = cafeteriaName
  if (taxRate !== undefined) patch.taxRate = Number(taxRate)
  if (currency !== undefined) patch.currency = currency
  if (lowStockAlerts !== undefined) patch.lowStockAlerts = lowStockAlerts
  const doc = await Settings.findOneAndUpdate({}, patch, { upsert: true, new: true })
  res.json(doc)
}
