import { Request, Response } from 'express'
import { StorePurchaseDraft } from '../models/StorePurchaseDraft'
import { StorePurchaseModel } from '../models/StorePurchase'
import { StoreItemModel } from '../models/StoreItem'
import { HospitalAuditLog } from '../models/AuditLog'
import { HospitalCounter } from '../models/Counter'
import { StoreSupplierModel } from '../models/StoreSupplier'
import { StoreSupplierPaymentModel } from '../models/StoreSupplierPayment'
import mongoose from 'mongoose'

// Generate next invoice number (PUR_1, PUR_2, etc.)
async function nextInvoiceNumber(): Promise<string> {
  const key = 'store_purchase_invoice'
  let c: any = await HospitalCounter.findById(key)
  if (!c) {
    // Counter doesn't exist, check existing invoices to determine starting number
    const docs: any[] = await StorePurchaseDraft.find({ invoiceNo: { $regex: /^PUR_\d+$/i } }).select('invoiceNo').lean()
    let maxSeq = 0
    for (const d of docs) {
      const m = (d.invoiceNo || '').match(/^PUR_(\d+)$/i)
      if (m) {
        const n = parseInt(m[1], 10)
        if (n > maxSeq) maxSeq = n
      }
    }
    return `PUR_${maxSeq + 1}`
  }
  return `PUR_${(c.seq || 0) + 1}`
}

// Peek at next invoice number without incrementing
async function peekNextInvoiceNumber(): Promise<string> {
  const key = 'store_purchase_invoice'
  let c: any = await HospitalCounter.findById(key)
  if (!c) {
    const docs: any[] = await StorePurchaseDraft.find({ invoiceNo: { $regex: /^PUR_\d+$/i } }).select('invoiceNo').lean()
    let maxSeq = 0
    for (const d of docs) {
      const m = (d.invoiceNo || '').match(/^PUR_(\d+)$/i)
      if (m) {
        const n = parseInt(m[1], 10)
        if (n > maxSeq) maxSeq = n
      }
    }
    return `PUR_${maxSeq + 1}`
  }
  return `PUR_${(c.seq || 0) + 1}`
}

export async function list(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page || 1))
  const limit = Math.max(1, Number(req.query.limit || 10))
  const search = (req.query.search as string) || ''
  const from = (req.query.from as string) || undefined
  const to = (req.query.to as string) || undefined

  const filter: any = {}
  if (from || to) {
    filter.date = {}
    if (from) filter.date.$gte = from
    if (to) filter.date.$lte = to
  }
  if (search) {
    const rx = new RegExp(search, 'i')
    filter.$or = [{ invoiceNo: rx }, { supplierName: rx }, { 'lines.itemName': rx }]
  }

  const skip = (page - 1) * limit
  const items = await StorePurchaseDraft.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()

  const total = await StorePurchaseDraft.countDocuments(filter)
  const totalPages = Math.ceil(total / limit)

  res.json({ items, total, page, totalPages })
}

// Get next auto-increment invoice number (peek without incrementing)
export async function getNextInvoiceNumber(req: Request, res: Response) {
  const invoiceNo = await peekNextInvoiceNumber()
  res.json({ invoiceNo })
}

// Server-side pagination for flattened draft lines used by Pending Review table
export async function listLines(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page || 1))
  const limit = Math.max(1, Number(req.query.limit || 10))
  const from = (req.query.from as string) || undefined
  const to = (req.query.to as string) || undefined
  const search = (req.query.search as string) || ''

  const match: any = {}
  if (from || to) {
    match.date = {}
    if (from) match.date.$gte = from
    if (to) match.date.$lte = to
  }
  if (search) {
    const rx = new RegExp(search, 'i')
    match.$or = [{ invoiceNo: rx }, { supplierName: rx }, { 'lines.itemName': rx }]
  }
  const skip = (page - 1) * limit
  const pipeline: any[] = [
    { $match: match },
    { $unwind: '$lines' },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          { $project: {
            draftId: '$_id',
            invoiceNo: 1,
            supplierName: 1,
            date: 1,
            itemName: '$lines.itemName',
            category: '$lines.category',
            batchNo: '$lines.batchNo',
            quantity: '$lines.quantity',
            unit: '$lines.unit',
            purchaseCost: '$lines.purchaseCost',
            expiry: '$lines.expiry',
            minStock: '$lines.minStock',
          } },
        ],
        count: [{ $count: 'total' }]
      }
    }
  ]
  const agg: any[] = await StorePurchaseDraft.aggregate(pipeline)
  const data = agg?.[0]?.data || []
  const total = Number(agg?.[0]?.count?.[0]?.total || 0)
  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)))
  res.json({ items: data, total, page, totalPages })
}

export async function create(req: Request, res: Response) {
  const data = req.body
  
  // If invoice number matches auto-generated pattern (PUR_x), increment the counter
  const invoiceMatch = (data.invoiceNo || '').match(/^PUR_(\d+)$/i)
  if (invoiceMatch) {
    const invoiceNum = parseInt(invoiceMatch[1], 10)
    const key = 'store_purchase_invoice'
    // Update counter to at least this number
    await HospitalCounter.findOneAndUpdate(
      { _id: key },
      { $max: { seq: invoiceNum } },
      { upsert: true, new: true }
    )
  }

  // Create separate StorePurchaseDraft per line item so each can be approved/rejected independently
  const createdDocs = []
  for (const line of data.lines || []) {
    const totalAmount = (line.quantity || 0) * (line.purchaseCost || 0)
    const doc = await StorePurchaseDraft.create({
      date: data.date,
      invoiceNo: data.invoiceNo,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      paymentMode: data.paymentMode,
      storeLocation: data.storeLocation,
      notes: data.notes,
      totalAmount,
      lines: [line],
    })
    createdDocs.push(doc)
  }
  res.status(201).json({ created: createdDocs.length, docs: createdDocs })
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params
  await StorePurchaseDraft.findByIdAndDelete(id)
  res.json({ ok: true })
}

export async function getOne(req: Request, res: Response) {
  const { id } = req.params
  const doc = await StorePurchaseDraft.findById(id).lean()
  if (!doc) return res.status(404).json({ error: 'Draft not found' })
  res.json(doc)
}

export async function update(req: Request, res: Response) {
  const { id } = req.params
  const exists = await StorePurchaseDraft.findById(id).lean()
  if (!exists) return res.status(404).json({ error: 'Draft not found' })
  const data = req.body
  
  const updated = await StorePurchaseDraft.findByIdAndUpdate(
    id,
    {
      $set: {
        date: data.date,
        invoiceNo: data.invoiceNo,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        paymentMode: data.paymentMode,
        storeLocation: data.storeLocation,
        notes: data.notes,
        totalAmount: data.totalAmount,
        lines: data.lines,
      }
    },
    { new: true }
  ).lean()
  res.json(updated)
}

export async function approve(req: Request, res: Response) {
  const { id } = req.params
  const draft: any = await StorePurchaseDraft.findById(id).lean()
  if (!draft) return res.status(404).json({ error: 'Draft not found' })

  // 1) Upsert store items
  for (const l of (draft.lines || [])) {
    const itemName = String(l.itemName || '').trim()
    if (!itemName) continue
    
    const key = itemName.toLowerCase()
    const addQty = l.quantity || 0
    const purchaseCost = l.purchaseCost || 0
    const expiry = l.expiry
    const batchNo = l.batchNo
    const category = l.category
    const minStock = l.minStock || 0
    const unit = l.unit || 'pcs'

    const prev: any = await StoreItemModel.findOne({ key }).lean()
    const prevStock = Number(prev?.currentStock || 0)
    const prevAvgCost = Number(prev?.avgCost || 0)
    const newQty = Math.max(0, prevStock + addQty)
    const newAvgCost = newQty > 0 ? (((prevAvgCost * prevStock) + (purchaseCost * addQty)) / newQty) : prevAvgCost

    const update: any = {
      $setOnInsert: { key, name: itemName, active: true },
      $inc: { currentStock: addQty },
      $set: {
        unit,
        lastPurchase: draft.date,
        lastSupplier: draft.supplierName || '-',
        lastSupplierId: draft.supplierId || undefined,
        avgCost: Number(newAvgCost.toFixed(6)),
        category: category || '',
        minStock: minStock,
        location: draft.storeLocation || (prev?.location || ''),
      }
    }
    
    // Update earliest expiry
    if (expiry) {
      update.$min = { ...(update.$min || {}), earliestExpiry: expiry }
    }

    await StoreItemModel.findOneAndUpdate({ key }, update, { upsert: true, new: true })
  }

  // 2) Create a StorePurchase record
  const purchase = await StorePurchaseModel.create({
    date: draft.date,
    invoiceNo: draft.invoiceNo,
    supplierId: draft.supplierId,
    supplierName: draft.supplierName,
    paymentMode: draft.paymentMode,
    storeLocation: draft.storeLocation,
    notes: draft.notes,
    totalAmount: draft.totalAmount,
    items: (draft.lines || []).map((l: any) => ({
      itemName: l.itemName,
      category: l.category,
      batchNo: l.batchNo,
      quantity: l.quantity,
      unit: l.unit,
      purchaseCost: l.purchaseCost,
      expiry: l.expiry,
    })),
  })

  // 3) Create audit log
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'Add Store Inventory',
      label: 'ADD_STORE_INVENTORY',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Invoice ${purchase.invoiceNo} — ${purchase.supplierName || ''} — Rs ${Number(purchase.totalAmount || 0).toFixed(2)}`,
    })
  } catch {}

  // 4) Delete draft
  await StorePurchaseDraft.deleteOne({ _id: id })
  // Recompute supplier totals from purchases + payments
  try {
    const supplierId = String(draft.supplierId || '')
    if (supplierId) {
      const idObj = new mongoose.Types.ObjectId(supplierId)
      const [pAgg] = await StorePurchaseModel.aggregate([
        { $match: { supplierId: idObj } },
        { $group: { _id: null, totalPurchases: { $sum: '$totalAmount' }, lastOrder: { $max: '$date' } } },
      ])
      const [payAgg] = await StoreSupplierPaymentModel.aggregate([
        { $match: { supplierId: idObj } },
        { $group: { _id: null, paid: { $sum: '$amount' } } },
      ])
      const totalPurchases = Number(pAgg?.totalPurchases || 0)
      const paid = Number(payAgg?.paid || 0)
      const outstanding = Math.max(0, totalPurchases - paid)
      const lastOrder = pAgg?.lastOrder || undefined
      await StoreSupplierModel.findByIdAndUpdate(idObj, { $set: { totalPurchases, paid, outstanding, lastOrder } }, { new: true })
    }
  } catch {}
  res.json({ ok: true, purchaseId: purchase?._id })
}
