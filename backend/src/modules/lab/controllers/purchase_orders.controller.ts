import { Request, Response } from 'express'
import { LabPurchaseOrder } from '../models/PurchaseOrder'
import { LabPurchaseDraft } from '../models/PurchaseDraft'
import { LabInventoryItem } from '../models/InventoryItem'
import { 
  labPurchaseOrderCreateSchema, 
  labPurchaseOrderUpdateSchema, 
  labPurchaseOrderStatusSchema 
} from '../validators/purchase_order'
import { ApiError } from '../../../common/errors/ApiError'
import { LabAuditLog } from '../models/AuditLog'

export async function list(req: Request, res: Response) {
  const q = String(req.query.q || '').trim()
  const page = Math.max(1, Number(req.query.page || 1))
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 50)))
  
  const filter: any = {}
  if (q) {
    const rx = new RegExp(q, 'i')
    filter.$or = [
      { poNumber: rx },
      { supplierName: rx },
      { 'items.name': rx }
    ]
  }

  const total = await LabPurchaseOrder.countDocuments(filter)
  const skip = (page - 1) * limit
  const items = await LabPurchaseOrder.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()

  const totalPages = Math.ceil(total / limit)
  res.json({ items, total, page, totalPages })
}

export async function getOne(req: Request, res: Response) {
  const { id } = req.params
  const doc = await LabPurchaseOrder.findById(id).lean()
  if (!doc) throw new ApiError(404, 'Purchase Order not found')
  res.json(doc)
}

export async function create(req: Request, res: Response) {
  const data = labPurchaseOrderCreateSchema.parse(req.body)
  
  // Generate PO Number: LP-YYYYMMDD-XXXX (LP = Lab Purchase)
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await LabPurchaseOrder.countDocuments({
    createdAt: { 
      $gte: new Date(new Date().setHours(0,0,0,0)),
      $lte: new Date(new Date().setHours(23,59,59,999))
    }
  })
  const poNumber = `LP-${dateStr}-${(count + 1).toString().padStart(4, '0')}`

  const doc = await LabPurchaseOrder.create({
    ...data,
    poNumber,
    status: 'Pending'
  })

  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await LabAuditLog.create({
      actor,
      action: 'Create Purchase Order',
      label: 'CREATE_PO',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `PO ${poNumber} for ${doc.supplierName}`,
    })
  } catch {}

  res.status(201).json(doc)
}

export async function update(req: Request, res: Response) {
  const { id } = req.params
  const data = labPurchaseOrderUpdateSchema.parse(req.body)
  
  const doc = await LabPurchaseOrder.findByIdAndUpdate(id, data, { new: true })
  if (!doc) throw new ApiError(404, 'Purchase Order not found')

  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await LabAuditLog.create({
      actor,
      action: 'Update Purchase Order',
      label: 'UPDATE_PO',
      method: 'PUT',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `PO ${doc.poNumber} updated`,
    })
  } catch {}

  res.json(doc)
}

export async function updateStatus(req: Request, res: Response) {
  const { id } = req.params
  const { status } = labPurchaseOrderStatusSchema.parse(req.body)
  
  const doc = await LabPurchaseOrder.findById(id)
  if (!doc) throw new ApiError(404, 'Purchase Order not found')

  // If marking as Complete, create separate PurchaseDraft per item for pending review
  if (status === 'Complete' && doc.status !== 'Complete') {
    const items = doc.items || []
    for (const item of items) {
      if (!item.name) continue
      const nameStr = String(item.name || '').trim()
      // Try multiple matching strategies to find existing inventory item
      let inv: any = null
      if (nameStr) {
        const key = nameStr.toLowerCase()
        // 1. Exact key match
        inv = await LabInventoryItem.findOne({ key }).lean()
        if (!inv) {
          // 2. Case-insensitive exact match on name field
          const rx = new RegExp(`^${nameStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
          inv = await LabInventoryItem.findOne({ name: rx }).lean()
        }
        if (!inv) {
          // 3. Partial match: item name starts with first word
          const firstWord = nameStr.split(/\s+/)[0]
          if (firstWord && firstWord.length >= 3) {
            const partialRx = new RegExp(`^${firstWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
            inv = await LabInventoryItem.findOne({ name: partialRx }).lean()
          }
        }
      }

      const unitsPerPack = inv?.unitsPerPack != null ? Number(inv.unitsPerPack) : 1
      const qty = Number(item.qty || 0)
      const isUnits = String(item.unit || '').toLowerCase() === 'units'
      const packs = isUnits ? 0 : qty
      const totalItems = isUnits ? qty : (qty * unitsPerPack)
      const salePerUnit = Number(inv?.lastSalePerUnit || 0) || 0
      const salePerPack = salePerUnit ? Number((salePerUnit * unitsPerPack).toFixed(6)) : 0

      await LabPurchaseDraft.create({
        date: new Date().toISOString().slice(0, 10),
        invoice: doc.poNumber,
        supplierId: doc.supplierId,
        supplierName: doc.supplierName,
        companyName: doc.companyName,
        totals: { gross: 0, discount: 0, taxable: 0, lineTaxes: 0, invoiceTaxes: 0, net: 0 },
        lines: [{
          itemId: item.itemId || inv?.lastItemId,
          name: item.name,
          genericName: inv?.genericName,
          category: item.category || inv?.category,
          unitsPerPack,
          packs,
          totalItems,
          buyPerPack: 0,
          buyPerUnit: 0,
          salePerPack,
          salePerUnit,
          minStock: inv?.minStock,
        }],
      })
    }
  }

  doc.status = status
  await doc.save()

  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await LabAuditLog.create({
      actor,
      action: 'Update Purchase Order Status',
      label: 'UPDATE_PO_STATUS',
      method: 'PATCH',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `PO ${doc.poNumber} status changed to ${status}`,
    })
  } catch {}

  res.json(doc)
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params
  const doc = await LabPurchaseOrder.findByIdAndDelete(id)
  if (!doc) throw new ApiError(404, 'Purchase Order not found')

  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await LabAuditLog.create({
      actor,
      action: 'Delete Purchase Order',
      label: 'DELETE_PO',
      method: 'DELETE',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `PO ${doc.poNumber} deleted`,
    })
  } catch {}

  res.json({ ok: true })
}
