import { Request, Response } from 'express'
import { Deal } from '../models/Deal'
import { MenuItem } from '../models/MenuItem'
import { AuditLog } from '../models/AuditLog'

export async function create(req: Request, res: Response) {
  const { name, description, category, items, dealPrice, active, validFrom, validTo, image } = (req.body || {}) as any
  if (!name || !dealPrice) return res.status(400).json({ error: 'Name and deal price are required' })
  if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'At least one item required' })

  const linesWithPrice: any[] = []
  let originalTotal = 0

  for (const line of items) {
    let item: any = null
    const id = String(line.menuItemId || '').trim()
    const nm = String(line.name || '').trim()
    if (id) item = await MenuItem.findById(id).lean()
    if (!item && nm) item = await MenuItem.findOne({ name: { $regex: new RegExp(`^${nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }).lean()
    const price = Number(item?.price || line.originalPrice || 0)
    const qty = Number(line.qty || 1)
    linesWithPrice.push({
      menuItemId: item?._id || undefined,
      name: item?.name || nm || 'Unknown',
      qty,
      originalPrice: price,
    })
    originalTotal += price * qty
  }

  const savings = Number((originalTotal - Number(dealPrice)).toFixed(2))
  const doc = await Deal.create({
    name: String(name).trim(),
    description: String(description || ''),
    category: String(category || 'Combo'),
    items: linesWithPrice,
    dealPrice: Number(dealPrice),
    originalTotal: Number(originalTotal.toFixed(2)),
    savings,
    active: active !== false,
    validFrom: String(validFrom || ''),
    validTo: String(validTo || ''),
    image: String(image || ''),
  })

  try {
    const actor = String((req as any).user?.name || (req as any).user?.email || 'system')
    await AuditLog.create({ actor, action: 'Deal Created', label: 'DEAL', method: 'POST', path: req.originalUrl, at: new Date().toISOString(), detail: `Deal ${doc.name} — Rs ${doc.dealPrice}` })
  } catch {}

  res.status(201).json(doc)
}

export async function list(req: Request, res: Response) {
  const q = String((req.query as any).q || '')
  const activeOnly = (req.query as any).active === 'true'
  const filter: any = {}
  if (q) filter.name = { $regex: q, $options: 'i' }
  if (activeOnly) filter.active = true
  const items = await Deal.find(filter).sort({ createdAt: -1 }).lean()
  res.json({ items })
}

export async function getOne(req: Request, res: Response) {
  const doc = await Deal.findById(req.params.id).lean()
  if (!doc) return res.status(404).json({ error: 'Deal not found' })
  res.json(doc)
}

export async function update(req: Request, res: Response) {
  const { name, description, category, items, dealPrice, active, validFrom, validTo, image } = (req.body || {}) as any
  const update: any = {}
  if (name !== undefined) update.name = String(name).trim()
  if (description !== undefined) update.description = String(description)
  if (category !== undefined) update.category = String(category)
  if (active !== undefined) update.active = active
  if (validFrom !== undefined) update.validFrom = String(validFrom)
  if (validTo !== undefined) update.validTo = String(validTo)
  if (image !== undefined) update.image = String(image)
  if (dealPrice !== undefined) update.dealPrice = Number(dealPrice)

  if (items && Array.isArray(items)) {
    const linesWithPrice: any[] = []
    let originalTotal = 0
    for (const line of items) {
      let item: any = null
      const id = String(line.menuItemId || '').trim()
      const nm = String(line.name || '').trim()
      if (id) item = await MenuItem.findById(id).lean()
      if (!item && nm) item = await MenuItem.findOne({ name: { $regex: new RegExp(`^${nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }).lean()
      const price = Number(item?.price || line.originalPrice || 0)
      const qty = Number(line.qty || 1)
      linesWithPrice.push({ menuItemId: item?._id || undefined, name: item?.name || nm || 'Unknown', qty, originalPrice: price })
      originalTotal += price * qty
    }
    update.items = linesWithPrice
    update.originalTotal = Number(originalTotal.toFixed(2))
    if (dealPrice !== undefined) update.savings = Number((originalTotal - Number(dealPrice)).toFixed(2))
  }

  const doc = await Deal.findByIdAndUpdate(req.params.id, { $set: update }, { new: true })
  if (!doc) return res.status(404).json({ error: 'Deal not found' })
  res.json(doc)
}

export async function remove(req: Request, res: Response) {
  const doc = await Deal.findByIdAndDelete(req.params.id)
  if (!doc) return res.status(404).json({ error: 'Deal not found' })
  res.json({ ok: true })
}
