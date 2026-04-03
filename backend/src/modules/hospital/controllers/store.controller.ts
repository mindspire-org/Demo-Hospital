import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { StoreSupplierModel } from '../models/StoreSupplier'
import { StoreItemModel } from '../models/StoreItem'
import { StorePurchaseModel } from '../models/StorePurchase'
import { StorePurchaseDraft } from '../models/StorePurchaseDraft'
import { StoreIssueModel } from '../models/StoreIssue'
import { StoreSupplierPaymentModel } from '../models/StoreSupplierPayment'
import { HospitalDepartment } from '../models/Department'

// Pagination helper
const getPagination = (query: any) => {
  const page = Math.max(1, parseInt(query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

// Recompute supplier aggregates from purchases + payments
async function recomputeSupplierTotals(supplierId: string) {
  if (!supplierId) return
  const id = new mongoose.Types.ObjectId(String(supplierId))
  const [pAgg] = await StorePurchaseModel.aggregate([
    { $match: { supplierId: id } },
    { $group: { _id: null, totalPurchases: { $sum: '$totalAmount' }, lastOrder: { $max: '$date' } } },
  ])
  const [payAgg] = await StoreSupplierPaymentModel.aggregate([
    { $match: { supplierId: id } },
    { $group: { _id: null, paid: { $sum: '$amount' } } },
  ])
  const totalPurchases = Number(pAgg?.totalPurchases || 0)
  const paid = Number(payAgg?.paid || 0)
  const outstanding = Math.max(0, totalPurchases - paid)
  const lastOrder = pAgg?.lastOrder || undefined
  await StoreSupplierModel.findByIdAndUpdate(id, { $set: { totalPurchases, paid, outstanding, lastOrder } }, { new: true })
}

export const recomputeAllSuppliers = async (_req: Request, res: Response) => {
  try {
    const ids = await StoreSupplierModel.find().select('_id').lean()
    for (const s of ids) {
      await recomputeSupplierTotals(String((s as any)._id))
    }
    res.json({ ok: true, count: ids.length })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
// ==================== DASHBOARD ====================
export const storeDashboard = async (req: Request, res: Response) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    // Calculate date ranges
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    
    // 30 days from now for expiry check
    const thirtyDaysFromNow = new Date(today)
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const [
      totalItems,
      lowStock,
      outOfStock,
      expiringSoon,
      expired,
      recentPurchases,
      pendingPayments,
      totalSuppliers,
      activeSuppliers,
      todayPurchases,
      todayIssues,
      weekPurchases,
      weekIssues,
      monthPurchases,
      monthIssues,
      totalStockValue,
      pendingApprovals,
      heldPurchases,
    ] = await Promise.all([
      // Basic counts
      StoreItemModel.countDocuments({ active: true }),
      StoreItemModel.countDocuments({ active: true, $expr: { $and: [{ $gt: ['$currentStock', 0] }, { $lt: ['$currentStock', '$minStock'] }] } }),
      StoreItemModel.countDocuments({ active: true, currentStock: 0 }),
      
      // Expiry alerts
      StoreItemModel.countDocuments({ 
        active: true, 
        earliestExpiry: { $gte: today, $lte: thirtyDaysFromNow } 
      }),
      StoreItemModel.countDocuments({ 
        active: true, 
        earliestExpiry: { $lt: today } 
      }),
      
      // Recent purchases
      StorePurchaseModel.find().sort({ createdAt: -1 }).limit(5).lean(),
      
      // Pending payments (outstanding from suppliers)
      StoreSupplierModel.aggregate([{ $group: { _id: null, total: { $sum: '$outstanding' } } }]),
      
      // Supplier counts
      StoreSupplierModel.countDocuments({}),
      StoreSupplierModel.countDocuments({ status: 'Active' }),
      
      // Today's transactions
      StorePurchaseModel.aggregate([
        { $match: { date: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      StoreIssueModel.aggregate([
        { $match: { date: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      
      // Week transactions
      StorePurchaseModel.aggregate([
        { $match: { date: { $gte: weekAgo } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      StoreIssueModel.aggregate([
        { $match: { date: { $gte: weekAgo } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      
      // Month transactions
      StorePurchaseModel.aggregate([
        { $match: { date: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      StoreIssueModel.aggregate([
        { $match: { date: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      
      // Total stock value (sum of currentStock * avgCost)
      StoreItemModel.aggregate([
        { $match: { active: true } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$currentStock', '$avgCost'] } } } }
      ]),
      
      // Pending approvals (purchase drafts)
      StorePurchaseDraft.countDocuments({}),
      
      // Held purchases - check if model exists
      (mongoose.models.StoreHeldPurchase ? mongoose.models.StoreHeldPurchase.countDocuments({}) : Promise.resolve(0)),
    ])

    res.json({
      stats: {
        totalItems,
        totalStockValue: totalStockValue[0]?.total || 0,
        totalSuppliers,
        activeSuppliers,
        pendingPayments: pendingPayments[0]?.total || 0,
        todayPurchases: todayPurchases[0]?.total || 0,
        todayIssues: todayIssues[0]?.total || 0,
        weekPurchases: weekPurchases[0]?.total || 0,
        weekIssues: weekIssues[0]?.total || 0,
        monthPurchases: monthPurchases[0]?.total || 0,
        monthIssues: monthIssues[0]?.total || 0,
        pendingApprovals,
        heldPurchases,
      },
      alerts: {
        lowStock,
        outOfStock,
        expiringSoon,
        expired,
      },
      recentPurchases,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== SUPPLIERS ====================
export const listSuppliers = async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query
    const { page, limit, skip } = getPagination(req.query)

    const filter: any = {}
    if (status) filter.status = status
    if (search) {
      const s = new RegExp(search as string, 'i')
      filter.$or = [{ name: s }, { company: s }, { phone: s }]
    }

    const [suppliers, total] = await Promise.all([
      StoreSupplierModel.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      StoreSupplierModel.countDocuments(filter),
    ])

    res.json({ suppliers, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const createSupplier = async (req: Request, res: Response) => {
  try {
    const { name, company, phone, address, taxId, status } = req.body
    const sup = await StoreSupplierModel.create({ name, company, phone, address, taxId, status: status || 'Active' })
    res.status(201).json({ supplier: sup })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, company, phone, address, taxId, status } = req.body
    const sup = await StoreSupplierModel.findByIdAndUpdate(id, { name, company, phone, address, taxId, status }, { new: true })
    if (!sup) return res.status(404).json({ error: 'Supplier not found' })
    res.json({ supplier: sup })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export const deleteSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const sup = await StoreSupplierModel.findByIdAndDelete(id)
    if (!sup) return res.status(404).json({ error: 'Supplier not found' })
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const getSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const sup = await StoreSupplierModel.findById(id).lean()
    if (!sup) return res.status(404).json({ error: 'Supplier not found' })
    res.json({ supplier: sup })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const listSupplierPurchases = async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params
    const purchases = await StorePurchaseModel.find({
      supplierId,
      paymentStatus: { $in: ['unpaid', 'partial'] },
    }).sort({ date: -1 }).lean()
    const items = purchases.map(p => ({
      _id: p._id,
      id: String(p._id),
      invoiceNo: p.invoiceNo,
      date: p.date instanceof Date ? p.date.toISOString().slice(0, 10) : String(p.date),
      totalAmount: p.totalAmount,
      paidAmount: p.paidAmount || 0,
      remaining: Math.max(0, (p.totalAmount || 0) - (p.paidAmount || 0)),
    }))
    res.json({ items })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const getSupplierLedger = async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params
    const { from, to } = req.query

    const supplier = await StoreSupplierModel.findById(supplierId).lean()
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' })

    const dateFilter: any = {}
    if (from) dateFilter.$gte = new Date(from as string)
    if (to) dateFilter.$lte = new Date(to as string)

    const purchases = await StorePurchaseModel.find({ supplierId, ...(Object.keys(dateFilter).length && { date: dateFilter }) }).lean()
    const payments = await StoreSupplierPaymentModel.find({ supplierId, ...(Object.keys(dateFilter).length && { date: dateFilter }) }).lean()

    const merged: any[] = []
    for (const p of purchases) {
      const d = (p as any).date instanceof Date ? (p as any).date : new Date((p as any).date)
      merged.push({
        id: String((p as any)._id),
        date: d.toISOString().slice(0, 10),
        at: d.getTime(),
        order: 0,
        type: 'purchase',
        reference: (p as any).invoiceNo,
        debit: (p as any).totalAmount || 0,
        credit: 0,
      })
    }
    for (const pay of payments) {
      const d = (pay as any).date instanceof Date ? (pay as any).date : new Date((pay as any).date)
      merged.push({
        id: String((pay as any)._id),
        date: d.toISOString().slice(0, 10),
        at: d.getTime(),
        order: 1,
        type: 'payment',
        reference: (pay as any).reference,
        description: (pay as any).notes,
        debit: 0,
        credit: (pay as any).amount || 0,
      })
    }

    merged.sort((a, b) => (a.at - b.at) || (a.order - b.order))

    let balance = 0
    const entries = merged.map(e => {
      balance += (e.debit || 0) - (e.credit || 0)
      const { at, order, ...rest } = e
      return { ...rest, balance }
    })

    res.json({ supplier, entries })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const createSupplierPayment = async (req: Request, res: Response) => {
  try {
    const { supplierId, amount, method, reference, date, notes, purchaseId } = req.body
    const sup = await StoreSupplierModel.findById(supplierId)
    if (!sup) return res.status(404).json({ error: 'Supplier not found' })

    const payment = await StoreSupplierPaymentModel.create({
      supplierId,
      supplierName: sup.name,
      amount,
      method,
      reference,
      date: date ? new Date(date) : new Date(),
      notes,
      purchaseId: purchaseId || undefined,
      createdBy: (req as any).user?.id,
    })

    // If payment is against a specific purchase, update its paidAmount
    if (purchaseId) {
      const purchase = await StorePurchaseModel.findById(purchaseId)
      if (purchase) {
        purchase.paidAmount = (purchase.paidAmount || 0) + amount
        if (purchase.paidAmount >= purchase.totalAmount) {
          purchase.paymentStatus = 'paid'
        } else if (purchase.paidAmount > 0) {
          purchase.paymentStatus = 'partial'
        }
        await purchase.save()
      }
    }

    await recomputeSupplierTotals(String(supplierId))

    res.status(201).json({ payment })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

// ==================== INVENTORY ====================
export const listInventory = async (req: Request, res: Response) => {
  try {
    const { category, status, search } = req.query
    const { page, limit, skip } = getPagination(req.query)

    const filter: any = { active: true }
    if (category) filter.category = category
    if (status === 'low') filter.$expr = { $lte: ['$currentStock', '$minStock'] }
    if (status === 'out') filter.currentStock = 0
    if (search) {
      filter.name = new RegExp(search as string, 'i')
    }

    const [items, total] = await Promise.all([
      StoreItemModel.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      StoreItemModel.countDocuments(filter),
    ])

    res.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const createItem = async (req: Request, res: Response) => {
  try {
    const { name, category, unit, minStock } = req.body
    const key = String(name || '').trim().toLowerCase()
    const item = await StoreItemModel.create({ 
      key,
      name, 
      category, 
      unit, 
      minStock: minStock || 0 
    })
    res.status(201).json({ item })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export const updateItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, category, unit, minStock, currentStock, avgCost, earliestExpiry, location } = req.body
    const patch: any = { name, category, unit, minStock }
    if (currentStock != null) patch.currentStock = Number(currentStock)
    if (avgCost != null) patch.avgCost = Number(avgCost)
    if (location != null) patch.location = String(location)
    if (earliestExpiry) {
      try { patch.earliestExpiry = new Date(earliestExpiry) } catch {}
    }
    const item = await StoreItemModel.findByIdAndUpdate(id, patch, { new: true })
    if (!item) return res.status(404).json({ error: 'Item not found' })
    res.json({ item })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export const deleteItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ error: 'Invalid item ID' })
    }
    
    // Hard delete - permanently remove from database
    const item = await StoreItemModel.findByIdAndDelete(id)
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' })
    }
    
    res.json({ success: true, message: 'Item deleted successfully' })
  } catch (err: any) {
    console.error('Delete item error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
}

// ==================== PURCHASES ====================
export const listPurchases = async (req: Request, res: Response) => {
  try {
    const { from, to, supplierId, search, status } = req.query
    const { page, limit, skip } = getPagination(req.query)

    const filter: any = {}
    if (from || to) {
      filter.date = {}
      if (from) filter.date.$gte = new Date(from as string)
      if (to) filter.date.$lte = new Date(to as string)
    }
    if (supplierId) filter.supplierId = supplierId
    if (status) filter.paymentStatus = status
    if (search) {
      filter.$or = [
        { invoiceNo: new RegExp(search as string, 'i') },
        { supplierName: new RegExp(search as string, 'i') },
      ]
    }

    const [purchases, total] = await Promise.all([
      StorePurchaseModel.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      StorePurchaseModel.countDocuments(filter),
    ])

    res.json({ purchases, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const createPurchase = async (req: Request, res: Response) => {
  try {
    const { date, invoiceNo, supplierId, supplierName, paymentMode, storeLocation, notes, items, totalAmount } = req.body

    // Create separate StorePurchaseDraft per line item so each can be approved/rejected independently
    const createdDocs = []
    for (const it of items) {
      const lineTotal = (it.quantity || 0) * (it.purchaseCost || 0)
      const doc = await StorePurchaseDraft.create({
        date: date ? new Date(date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        invoiceNo,
        supplierId,
        supplierName,
        paymentMode,
        storeLocation,
        notes,
        totalAmount: lineTotal,
        lines: [{
          itemName: it.itemName,
          category: it.category,
          batchNo: it.batchNo,
          quantity: it.quantity,
          unit: it.unit,
          purchaseCost: it.purchaseCost,
          mrp: it.mrp,
          expiry: it.expiry,
          minStock: it.minStock,
        }],
      })
      createdDocs.push(doc)
    }

    res.status(201).json({ 
      message: 'Purchase submitted for review', 
      draftsCreated: createdDocs.length,
      drafts: createdDocs 
    })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export const getPurchase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const purchase = await StorePurchaseModel.findById(id).lean()
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' })
    res.json({ purchase })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const updatePurchase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { date, invoiceNo, supplierId, supplierName, paymentMode, storeLocation, notes, items, totalAmount } = req.body
    
    const prev: any = await StorePurchaseModel.findById(id).lean()
    const purchase: any = await StorePurchaseModel.findByIdAndUpdate(
      id,
      {
        date: date ? new Date(date) : undefined,
        invoiceNo,
        supplierId,
        supplierName,
        paymentMode,
        storeLocation,
        notes,
        totalAmount,
        items: items?.map((it: any) => ({
          itemName: it.itemName,
          category: it.category,
          batchNo: it.batchNo,
          quantity: it.quantity,
          unit: it.unit,
          purchaseCost: it.purchaseCost,
          mrp: it.mrp,
          expiry: it.expiry ? new Date(it.expiry) : undefined,
        })),
      },
      { new: true }
    ).lean()
    
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' })
    if (prev?.supplierId) await recomputeSupplierTotals(String(prev.supplierId))
    if (purchase?.supplierId && String(purchase?.supplierId) !== String(prev?.supplierId)) await recomputeSupplierTotals(String(purchase.supplierId))
    res.json({ purchase })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const deletePurchase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const purchase: any = await StorePurchaseModel.findByIdAndDelete(id).lean()
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' })
    if (purchase?.supplierId) await recomputeSupplierTotals(String(purchase.supplierId))
    res.json({ ok: true, message: 'Purchase deleted successfully' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== ISSUES ====================
export const listIssues = async (req: Request, res: Response) => {
  try {
    const { from, to, departmentId, search } = req.query
    const { page, limit, skip } = getPagination(req.query)

    const filter: any = {}
    if (from || to) {
      filter.date = {}
      if (from) filter.date.$gte = new Date(from as string)
      if (to) filter.date.$lte = new Date(to as string)
    }
    if (departmentId) filter.departmentId = departmentId
    if (search) {
      filter.$or = [
        { departmentName: new RegExp(search as string, 'i') },
        { issuedTo: new RegExp(search as string, 'i') },
      ]
    }

    const [issues, total] = await Promise.all([
      StoreIssueModel.find(filter).sort({ date: -1 }).skip(skip).limit(limit).populate('createdBy', 'fullName email').lean(),
      StoreIssueModel.countDocuments(filter),
    ])

    res.json({ issues, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const createIssue = async (req: Request, res: Response) => {
  try {
    const { date, departmentId, departmentName, issuedTo, notes, items, totalAmount } = req.body

    const issue = await StoreIssueModel.create({
      date: new Date(date),
      departmentId,
      departmentName,
      issuedTo,
      notes,
      items: items.map((it: any) => ({
        itemId: it.itemId,
        itemName: it.itemName,
        batchId: it.batchId,
        batchNo: it.batchNo,
        quantity: it.quantity,
        unit: it.unit,
        costPerUnit: it.costPerUnit,
      })),
      totalAmount,
      createdBy: (req as any).user?.id,
    })

    // Reduce item stock
    for (const it of items) {
      await StoreItemModel.findByIdAndUpdate(it.itemId, { $inc: { currentStock: -it.quantity } })
    }

    res.status(201).json({ issue })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export const getIssue = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const issue = await StoreIssueModel.findById(id).lean()
    if (!issue) return res.status(404).json({ error: 'Issue not found' })
    res.json({ issue })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== REPORTS ====================
export const getReport = async (req: Request, res: Response) => {
  try {
    const { reportType } = req.params
    const { from, to, departmentId, supplierId } = req.query

    let data: any[] = []

    switch (reportType) {
      case 'stock': {
        const items = await StoreItemModel.find({ active: true }).lean()
        data = items.map((item) => ({
          name: item.name,
          category: item.category || '',
          stock: item.currentStock,
          minStock: item.minStock,
          status: item.currentStock === 0 ? 'out' : item.currentStock <= item.minStock ? 'low' : 'ok',
        }))
        break
      }
      case 'department-usage': {
        const match: any = {}
        if (from || to) {
          match.date = {}
          if (from) match.date.$gte = new Date(from as string)
          if (to) match.date.$lte = new Date(to as string)
        }
        if (departmentId) match.departmentId = departmentId

        const agg = await StoreIssueModel.aggregate([
          { $match: match },
          { $group: { _id: '$departmentId', departmentName: { $first: '$departmentName' }, items: { $sum: { $size: '$items' } }, value: { $sum: '$totalAmount' }, lastIssue: { $max: '$date' } } },
          { $sort: { value: -1 } },
        ])
        data = agg.map(a => ({
          department: a.departmentName,
          items: a.items,
          value: a.value,
          lastIssue: a.lastIssue?.toISOString()?.slice(0, 10) || '',
        }))
        break
      }
      case 'consumption': {
        const match: any = {}
        if (from || to) {
          match.date = {}
          if (from) match.date.$gte = new Date(from as string)
          if (to) match.date.$lte = new Date(to as string)
        }
        const agg = await StoreIssueModel.aggregate([
          { $match: match },
          { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, items: { $sum: { $size: '$items' } }, value: { $sum: '$totalAmount' } } },
          { $sort: { _id: 1 } },
        ])
        data = agg.map(a => ({ month: a._id, items: a.items, value: a.value, topItem: '' }))
        break
      }
      case 'supplier-purchases': {
        const match: any = {}
        if (supplierId) match.supplierId = supplierId
        if (from || to) {
          match.date = {}
          if (from) match.date.$gte = new Date(from as string)
          if (to) match.date.$lte = new Date(to as string)
        }
        const agg = await StorePurchaseModel.aggregate([
          { $match: match },
          { $group: { _id: '$supplierId', supplierName: { $first: '$supplierName' }, purchases: { $sum: 1 }, totalValue: { $sum: '$totalAmount' } } },
          { $sort: { totalValue: -1 } },
        ])
        const suppliers = await StoreSupplierModel.find().lean()
        data = agg.map(a => {
          const sup = suppliers.find(s => String(s._id) === String(a._id))
          return {
            supplier: a.supplierName,
            purchases: a.purchases,
            totalValue: a.totalValue,
            paid: sup?.paid || 0,
            outstanding: sup?.outstanding || 0,
          }
        })
        break
      }
      default:
        break
    }

    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

// ==================== DEPARTMENTS (for issue form) ====================
export const listDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await HospitalDepartment.find({ active: { $ne: false } }).sort({ name: 1 }).lean()
    res.json({ departments })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
