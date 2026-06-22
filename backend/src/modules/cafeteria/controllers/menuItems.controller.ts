import { Request, Response } from 'express'
import { MenuItem } from '../models/MenuItem'
import { AuditLog } from '../models/AuditLog'

export async function list(req: Request, res: Response) {
  const q = String(req.query.q || '').trim()
  const category = String(req.query.category || '').trim()
  const page = Math.max(1, Number((req.query as any).page || 1))
  const limit = Math.max(1, Math.min(500, Number((req.query as any).limit || 500)))
  const filter: any = {}
  if (q) filter.name = { $regex: q, $options: 'i' }
  if (category && category !== 'all') filter.category = category
  const total = await MenuItem.countDocuments(filter)
  const skip = (page - 1) * limit
  const items = await MenuItem.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
  const totalPages = Math.max(1, Math.ceil(total / limit))
  res.json({ items, total, page, totalPages })
}

export async function create(req: Request, res: Response) {
  const { name, category, price, costPrice, stockQty, lowStockThreshold, image } = (req.body || {}) as any
  if (!name || price == null) return res.status(400).json({ error: 'Name and price required' })
  try {
    const item = await MenuItem.create({
      name, category: category || 'General', price: Number(price),
      costPrice: Number(costPrice || 0), stockQty: Number(stockQty || 0),
      lowStockThreshold: Number(lowStockThreshold || 5), image: image || undefined,
    })
    try {
      const actor = (req as any).user?.name || (req as any).user?.email || 'system'
      await AuditLog.create({
        actor, action: 'Add Menu Item', label: 'ADD_MENU_ITEM', method: 'POST',
        path: req.originalUrl, at: new Date().toISOString(), detail: `${item.name} — Rs ${item.price}`,
      })
    } catch {}
    res.status(201).json(item)
  } catch (e: any) {
    if (e?.code === 11000) return res.status(400).json({ error: 'Item name already exists' })
    res.status(500).json({ error: e?.message || 'Failed to create item' })
  }
}

export async function update(req: Request, res: Response) {
  const { id } = req.params
  const patch: any = {}
  const { name, category, price, costPrice, stockQty, lowStockThreshold, active, image } = (req.body || {}) as any
  if (name !== undefined) patch.name = name
  if (category !== undefined) patch.category = category
  if (price !== undefined) patch.price = Number(price)
  if (costPrice !== undefined) patch.costPrice = Number(costPrice)
  if (stockQty !== undefined) patch.stockQty = Number(stockQty)
  if (lowStockThreshold !== undefined) patch.lowStockThreshold = Number(lowStockThreshold)
  if (active !== undefined) patch.active = active
  if (image !== undefined) patch.image = image
  const item = await MenuItem.findByIdAndUpdate(id, patch, { new: true })
  if (!item) return res.status(404).json({ error: 'Item not found' })
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await AuditLog.create({
      actor, action: 'Edit Menu Item', label: 'EDIT_MENU_ITEM', method: 'PUT',
      path: req.originalUrl, at: new Date().toISOString(), detail: `${item.name}`,
    })
  } catch {}
  res.json(item)
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params
  const before: any = await MenuItem.findById(id).lean()
  await MenuItem.findByIdAndDelete(id)
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await AuditLog.create({
      actor, action: 'Delete Menu Item', label: 'DELETE_MENU_ITEM', method: 'DELETE',
      path: req.originalUrl, at: new Date().toISOString(), detail: `${before?.name || ''}`,
    })
  } catch {}
  res.json({ ok: true })
}

export async function adjustStock(req: Request, res: Response) {
  const { id } = req.params
  const { adjustment, reason } = (req.body || {}) as { adjustment?: number; reason?: string }
  if (adjustment == null) return res.status(400).json({ error: 'Adjustment amount required' })
  const item: any = await MenuItem.findById(id)
  if (!item) return res.status(404).json({ error: 'Item not found' })
  item.stockQty = Math.max(0, Number(item.stockQty || 0) + Number(adjustment))
  await item.save()
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await AuditLog.create({
      actor, action: 'Stock Adjustment', label: 'STOCK_ADJUST', method: 'POST',
      path: req.originalUrl, at: new Date().toISOString(),
      detail: `${item.name} — ${adjustment > 0 ? '+' : ''}${adjustment} (${reason || 'no reason'})`,
    })
  } catch {}
  res.json(item)
}

export async function lowStock(_req: Request, res: Response) {
  const items = await MenuItem.find({ active: true, $expr: { $lte: ['$stockQty', '$lowStockThreshold'] } }).lean()
  res.json({ items })
}
