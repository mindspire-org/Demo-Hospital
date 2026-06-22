import { Request, Response } from 'express'
import { DailyShift } from '../models/DailyShift'
import { Sale } from '../models/Sale'
import { AuditLog } from '../models/AuditLog'

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function openShift(req: Request, res: Response) {
  const { openingCash, notes } = (req.body || {}) as any
  const date = todayIso()

  const existing = await DailyShift.findOne({ date, status: 'open' })
  if (existing) return res.status(400).json({ error: 'A shift is already open for today' })

  const openedBy = String((req as any).user?.name || (req as any).user?.email || (req.body || {}).openedBy || 'system')
  const doc = await DailyShift.create({
    date,
    openedAt: new Date().toISOString(),
    status: 'open',
    openingCash: Number(openingCash || 0),
    openedBy,
    notes: String(notes || ''),
  })

  try {
    await AuditLog.create({ actor: openedBy, action: 'Shift Opened', label: 'SHIFT', method: 'POST', path: req.originalUrl, at: new Date().toISOString(), detail: `Opening cash: Rs ${Number(openingCash || 0)}` })
  } catch {}

  res.status(201).json(doc)
}

export async function closeShift(req: Request, res: Response) {
  const { closingCash, notes } = (req.body || {}) as any
  const date = todayIso()

  const shift = await DailyShift.findOne({ date, status: 'open' })
  if (!shift) return res.status(404).json({ error: 'No open shift found for today' })

  const dayStart = new Date(date + 'T00:00:00')
  const dayEnd = new Date(date + 'T23:59:59.999')

  const sales = await Sale.find({ datetime: { $gte: dayStart.toISOString(), $lte: dayEnd.toISOString() } }).lean()

  const paymentBreakdown = { Cash: 0, Card: 0, Bank: 0 }
  const orderTypeBreakdown = { Dining: 0, 'Take Away': 0, Delivery: 0 }
  let totalRevenue = 0
  let totalProfit = 0

  for (const s of sales) {
    const method = (s.paymentMethod || 'Cash') as 'Cash' | 'Card' | 'Bank'
    if (paymentBreakdown[method] !== undefined) paymentBreakdown[method] += Number(s.total || 0)
    const ot = (s.orderType || 'Dining') as 'Dining' | 'Take Away' | 'Delivery'
    if (orderTypeBreakdown[ot] !== undefined) orderTypeBreakdown[ot] += 1
    totalRevenue += Number(s.total || 0)
    totalProfit += Number(s.profit || 0)
  }

  const expectedCash = Number(shift.openingCash) + paymentBreakdown.Cash
  const cashDifference = Number(closingCash || 0) - expectedCash
  const closedBy = String((req as any).user?.name || (req as any).user?.email || (req.body || {}).closedBy || 'system')

  shift.closedAt = new Date().toISOString()
  shift.status = 'closed'
  shift.closingCash = Number(closingCash || 0)
  shift.expectedCash = expectedCash
  shift.cashDifference = Number(cashDifference.toFixed(2))
  shift.totalSales = sales.length
  shift.totalRevenue = Number(totalRevenue.toFixed(2))
  shift.totalProfit = Number(totalProfit.toFixed(2))
  shift.salesCount = sales.length
  shift.paymentBreakdown = paymentBreakdown
  shift.orderTypeBreakdown = orderTypeBreakdown
  shift.closedBy = closedBy
  if (notes) shift.notes = String(notes)
  await shift.save()

  // Link sales to this shift
  await Sale.updateMany(
    { datetime: { $gte: dayStart.toISOString(), $lte: dayEnd.toISOString() }, shiftId: null },
    { $set: { shiftId: shift._id } },
  )

  try {
    await AuditLog.create({ actor: closedBy, action: 'Shift Closed', label: 'SHIFT', method: 'PUT', path: req.originalUrl, at: new Date().toISOString(), detail: `Closing cash: Rs ${Number(closingCash || 0)}, Diff: Rs ${cashDifference.toFixed(2)}` })
  } catch {}

  res.json(shift)
}

export async function getTodayShift(req: Request, res: Response) {
  const date = todayIso()
  const shift = await DailyShift.findOne({ date }).lean() as any
  if (!shift) return res.json(null)

  // If open, compute live sales totals
  if (shift.status === 'open') {
    const dayStart = new Date(date + 'T00:00:00')
    const dayEnd = new Date(date + 'T23:59:59.999')
    const sales = await Sale.find({ datetime: { $gte: dayStart.toISOString(), $lte: dayEnd.toISOString() } }).lean()
    const paymentBreakdown = { Cash: 0, Card: 0, Bank: 0 }
    const orderTypeBreakdown = { Dining: 0, 'Take Away': 0, Delivery: 0 }
    let totalRevenue = 0
    let totalProfit = 0
    for (const s of sales) {
      const method = (s.paymentMethod || 'Cash') as 'Cash' | 'Card' | 'Bank'
      if (paymentBreakdown[method] !== undefined) paymentBreakdown[method] += Number(s.total || 0)
      const ot = (s.orderType || 'Dining') as 'Dining' | 'Take Away' | 'Delivery'
      if (orderTypeBreakdown[ot] !== undefined) orderTypeBreakdown[ot] += 1
      totalRevenue += Number(s.total || 0)
      totalProfit += Number(s.profit || 0)
    }
    const expectedCash = Number(shift.openingCash) + paymentBreakdown.Cash
    return res.json({
      ...shift,
      totalSales: sales.length,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
      salesCount: sales.length,
      paymentBreakdown,
      orderTypeBreakdown,
      expectedCash,
    })
  }

  res.json(shift)
}

export async function list(req: Request, res: Response) {
  const from = String((req.query as any).from || '')
  const to = String((req.query as any).to || '')
  const limit = Math.max(1, Math.min(100, Number((req.query as any).limit || 30)))
  const filter: any = {}
  if (from || to) {
    filter.date = {}
    if (from) filter.date.$gte = from
    if (to) filter.date.$lte = to
  }
  const items = await DailyShift.find(filter).sort({ date: -1 }).limit(limit).lean()
  res.json({ items })
}

export async function getOne(req: Request, res: Response) {
  const doc = await DailyShift.findById(req.params.id).lean()
  if (!doc) return res.status(404).json({ error: 'Shift not found' })
  res.json(doc)
}
