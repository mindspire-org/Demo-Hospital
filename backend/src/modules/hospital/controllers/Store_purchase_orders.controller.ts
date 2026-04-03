import { Request, Response } from 'express'
import { StorePurchaseOrder } from '../models/StorePurchaseOrder'
import { StorePurchaseDraft } from '../models/StorePurchaseDraft'
import { StoreItemModel } from '../models/StoreItem'
import { 
  purchaseOrderCreateSchema, 
  purchaseOrderUpdateSchema, 
  purchaseOrderStatusSchema 
} from '../validators/Store_purchase_order'
import { ApiError } from '../../../common/errors/ApiError'
import { HospitalAuditLog } from '../models/AuditLog'

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

  const total = await StorePurchaseOrder.countDocuments(filter)
  const skip = (page - 1) * limit
  const items = await StorePurchaseOrder.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()

  const totalPages = Math.ceil(total / limit)
  res.json({ items, total, page, totalPages })
}

export async function getOne(req: Request, res: Response) {
  const { id } = req.params
  const doc = await StorePurchaseOrder.findById(id).lean()
  if (!doc) throw new ApiError(404, 'Purchase Order not found')
  res.json(doc)
}

export async function create(req: Request, res: Response) {
  const data = purchaseOrderCreateSchema.parse(req.body)
  
  // Generate PO Number: PO-YYYYMMDD-XXXX
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await StorePurchaseOrder.countDocuments({
    createdAt: { 
      $gte: new Date(new Date().setHours(0,0,0,0)),
      $lte: new Date(new Date().setHours(23,59,59,999))
    }
  })
  const poNumber = `PO-${dateStr}-${(count + 1).toString().padStart(4, '0')}`

  const doc = await StorePurchaseOrder.create({
    ...data,
    poNumber,
    status: 'Pending'
  })

  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
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
  const data = purchaseOrderUpdateSchema.parse(req.body)
  
  const doc = await StorePurchaseOrder.findByIdAndUpdate(id, data, { new: true })
  if (!doc) throw new ApiError(404, 'Purchase Order not found')

  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
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
  const { status } = purchaseOrderStatusSchema.parse(req.body)
  
  const doc = await StorePurchaseOrder.findById(id)
  if (!doc) throw new ApiError(404, 'Purchase Order not found')

  // If marking as Complete, create separate PurchaseDraft per item for pending review
  if (status === 'Complete' && doc.status !== 'Complete') {
    const items = doc.items || []
    for (const item of items) {
      if (!item.name) continue
      const nameStr = String(item.name || '').trim()
      
      // Try to find existing inventory item
      let inv: any = null
      if (nameStr) {
        const key = nameStr.toLowerCase()
        // 1. Exact key match
        inv = await StoreItemModel.findOne({ key }).lean()
        if (!inv) {
          // 2. Case-insensitive exact match on name field
          const rx = new RegExp(`^${nameStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
          inv = await StoreItemModel.findOne({ name: rx }).lean()
        }
        if (!inv) {
          // 3. Partial match
          const firstWord = nameStr.split(/\s+/)[0]
          if (firstWord && firstWord.length >= 3) {
            const partialRx = new RegExp(`^${firstWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
            inv = await StoreItemModel.findOne({ name: partialRx }).lean()
          }
        }
      }

      const qty = Number(item.qty || 0)

      await StorePurchaseDraft.create({
        date: new Date().toISOString().slice(0, 10),
        invoiceNo: doc.poNumber,
        supplierId: doc.supplierId,
        supplierName: doc.supplierName,
        totalAmount: 0,
        lines: [{
          itemName: item.name,
          category: item.category || inv?.category,
          quantity: qty,
          unit: item.unit || inv?.unit || 'pcs',
          purchaseCost: 0,
          minStock: inv?.minStock,
        }],
      })
    }
  }

  doc.status = status
  await doc.save()

  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
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
  const doc = await StorePurchaseOrder.findByIdAndDelete(id)
  if (!doc) throw new ApiError(404, 'Purchase Order not found')

  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
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
