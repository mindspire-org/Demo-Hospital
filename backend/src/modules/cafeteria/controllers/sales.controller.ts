import { Request, Response } from 'express'
import { Sale } from '../models/Sale'
import { MenuItem } from '../models/MenuItem'
import { AuditLog } from '../models/AuditLog'
import mongoose from 'mongoose'

function todayKey() {
  const d = new Date()
  const y = String(d.getFullYear()).slice(2)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function create(req: Request, res: Response) {
  const { items, discountPct, paymentMethod, customerName, customerPhone, createdBy, orderType, tableNumber, deliveryAddress, deliveryPhone, deliveryFee } = (req.body || {}) as any
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item required' })
  }

  const datetime = new Date().toISOString()
  const key = todayKey()
  const countToday = await Sale.countDocuments({ billNo: new RegExp(`^C-${key}-`) })
  const billNo = `C-${key}-${String(countToday + 1).padStart(3, '0')}`

  const linesWithCost: any[] = []
  let subtotal = 0
  let profit = 0

  for (const line of items) {
    let item: any = null
    const id = String(line.menuItemId || '').trim()
    const name = String(line.name || '').trim()
    if (id && mongoose.isValidObjectId(id)) item = await MenuItem.findById(id).lean()
    if (!item && name) item = await MenuItem.findOne({ name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }).lean()
    const costPerUnit = Number(item?.costPrice || 0)
    const unitPrice = Number(line.price || item?.price || 0)
    const qty = Number(line.qty || 1)
    linesWithCost.push({
      menuItemId: item?._id || undefined,
      name: item?.name || name || 'Unknown',
      price: unitPrice,
      qty,
      costPrice: costPerUnit,
    })
    subtotal += unitPrice * qty
    profit += (unitPrice - costPerUnit) * qty
  }

  const discPct = Number(discountPct || 0)
  const discountAmount = Number(((subtotal * discPct) / 100).toFixed(2))
  const delFee = Number(deliveryFee || 0)
  const total = Number((subtotal - discountAmount + delFee).toFixed(2))
  profit -= discountAmount

  // Find today's open shift to link the sale
  let shiftId: any = null
  try {
    const { DailyShift } = await import('../models/DailyShift')
    const openShift: any = await DailyShift.findOne({ date: todayIso(), status: 'open' }).lean()
    if (openShift) shiftId = openShift._id
  } catch {}

  const doc = await Sale.create({
    billNo,
    datetime,
    items: linesWithCost,
    subtotal: Number(subtotal.toFixed(2)),
    discountPct: discPct,
    discountAmount,
    deliveryFee: delFee,
    total,
    paymentMethod: paymentMethod || 'Cash',
    orderType: orderType || 'Dining',
    tableNumber: String(tableNumber || ''),
    deliveryAddress: String(deliveryAddress || ''),
    deliveryPhone: String(deliveryPhone || ''),
    customerName: customerName || 'Walk-in',
    customerPhone: String(customerPhone || ''),
    createdBy: String(createdBy || '').trim() || undefined,
    profit: Number(profit.toFixed(2)),
    shiftId,
  })

  // Decrement stock
  for (const line of linesWithCost) {
    try {
      if (line.menuItemId) {
        await MenuItem.findByIdAndUpdate(line.menuItemId, { $inc: { stockQty: -Number(line.qty) } })
      }
    } catch {}
  }

  // Audit log
  try {
    const actor = String(createdBy || (req as any).user?.name || (req as any).user?.email || 'system')
    await AuditLog.create({
      actor, action: 'Sale', label: 'SALE', method: 'POST',
      path: req.originalUrl, at: new Date().toISOString(),
      detail: `Bill ${doc.billNo} — ${doc.customerName} — Rs ${Number(doc.total || 0).toFixed(2)}`,
    })
  } catch {}

  // Post finance journal entry
  try {
    const { postCafeteriaSaleJournal } = await import('../../finance/controllers/finance_ledger')
    const cogsTotal = linesWithCost.reduce((s: number, l: any) => s + Number(l.costPrice || 0) * Number(l.qty || 0), 0)
    const actor = String(createdBy || (req as any).user?.name || (req as any).user?.email || 'system')
    await postCafeteriaSaleJournal({
      billNo: doc.billNo,
      dateIso: todayIso(),
      revenueAmount: total,
      cogsAmount: cogsTotal,
      paidMethod: doc.paymentMethod === 'Card' ? 'Bank' : (doc.paymentMethod === 'Bank' ? 'Bank' : 'Cash'),
      customer: doc.customerName,
      createdByUsername: actor,
    })
  } catch (e) {
    console.error('Failed to post Cafeteria revenue journal:', e)
  }

  // Activity log
  try {
    const { logActivity } = await import('../../finance/services/activityLog.service')
    logActivity({
      userId: String((req as any).user?._id || (req as any).user?.id || (req as any).user?.email || 'system'),
      userName: String(createdBy || (req as any).user?.name || (req as any).user?.email || 'system'),
      portal: 'cafeteria',
      action: 'Cafeteria Sale',
      module: 'Cafeteria',
      entityId: String(doc._id),
      entityLabel: `Bill ${doc.billNo} — ${doc.customerName}`,
      amount: Number(doc.total || 0),
      method: String(doc.paymentMethod || 'Cash'),
      meta: { billNo: doc.billNo, customer: doc.customerName, items: doc.items?.length || 0 },
    })
  } catch {}

  res.status(201).json(doc)
}

export async function list(req: Request, res: Response) {
  const from = String((req.query as any).from || '')
  const to = String((req.query as any).to || '')
  const page = Math.max(1, Number((req.query as any).page || 1))
  const limit = Math.max(1, Math.min(500, Number((req.query as any).limit || 50)))
  const filter: any = {}
  if (from || to) {
    filter.datetime = {}
    if (from) filter.datetime.$gte = new Date(from).toISOString()
    if (to) {
      const tEnd = new Date(to)
      tEnd.setHours(23, 59, 59, 999)
      filter.datetime.$lte = tEnd.toISOString()
    }
  }
  const total = await Sale.countDocuments(filter)
  const skip = (page - 1) * limit
  const items = await Sale.find(filter).sort({ datetime: -1 }).skip(skip).limit(limit).lean()
  const totalPages = Math.max(1, Math.ceil(total / limit))
  res.json({ items, total, page, totalPages })
}

export async function getOne(req: Request, res: Response) {
  const { id } = req.params
  const doc = await Sale.findById(id).lean()
  if (!doc) return res.status(404).json({ error: 'Sale not found' })
  res.json(doc)
}

export async function summary(req: Request, res: Response) {
  const from = String((req.query as any).from || '')
  const to = String((req.query as any).to || '')
  const filter: any = {}
  if (from || to) {
    filter.datetime = {}
    if (from) filter.datetime.$gte = new Date(from).toISOString()
    if (to) {
      const tEnd = new Date(to)
      tEnd.setHours(23, 59, 59, 999)
      filter.datetime.$lte = tEnd.toISOString()
    }
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayFilter = { datetime: { $gte: todayStart.toISOString() } }

  const [todaySales, todayAgg, periodAgg, itemCount] = await Promise.all([
    Sale.countDocuments(todayFilter),
    Sale.aggregate([
      { $match: todayFilter },
      { $group: { _id: null, revenue: { $sum: '$total' }, profit: { $sum: '$profit' }, count: { $sum: 1 } } },
    ]),
    Sale.aggregate([
      { $match: filter },
      { $group: { _id: null, revenue: { $sum: '$total' }, profit: { $sum: '$profit' }, count: { $sum: 1 } } },
    ]),
    MenuItem.countDocuments({ active: true }),
  ])

  const today = todayAgg[0] || { revenue: 0, profit: 0, count: 0 }
  const period = periodAgg[0] || { revenue: 0, profit: 0, count: 0 }

  // Top selling items
  const topItems = await Sale.aggregate([
    { $match: filter },
    { $unwind: '$items' },
    { $group: { _id: '$items.name', qty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } },
    { $sort: { qty: -1 } },
    { $limit: 10 },
  ])

  res.json({
    todaySales,
    todayRevenue: Number(today.revenue || 0),
    todayProfit: Number(today.profit || 0),
    periodRevenue: Number(period.revenue || 0),
    periodProfit: Number(period.profit || 0),
    periodCount: Number(period.count || 0),
    totalMenuItems: itemCount,
    topItems: topItems.map((t: any) => ({ name: t._id, qty: t.qty, revenue: Number(t.revenue || 0) })),
  })
}
