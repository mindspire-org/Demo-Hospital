import { Request, Response } from 'express'
import { HospitalExpense } from '../models/Expense'
import { HospitalCashSession } from '../models/CashSession'
import { createExpenseSchema, listExpenseSchema } from '../validators/expense'
import { logActivity } from '../../finance/services/activityLog.service'

export async function list(req: Request, res: Response){
  const q = listExpenseSchema.safeParse(req.query)
  const today = new Date().toISOString().slice(0,10)
  const from = q.success && q.data.from ? q.data.from : today
  const to = q.success && q.data.to ? q.data.to : today
  const rows = await HospitalExpense.find({ dateIso: { $gte: from, $lte: to } })
    .sort({ dateIso: -1, createdAt: -1 })
    .lean()
  const normalized = (rows as any[]).map(r => ({
    ...r,
    id: String(r._id),
    departmentName: r.departmentName || '',
    categoryName: r.categoryName || r.category || '',
    createdByUsername: r.createdByUsername || r.createdBy || '',
  }))
  const total = normalized.reduce((s, r) => s + (r.amount || 0), 0)
  res.json({ expenses: normalized, total })
}

export async function create(req: Request, res: Response){
  const data = createExpenseSchema.parse(req.body)
  // Determine createdByUsername: prefer req.user, fallback to body
  const createdByUsername = String(
    (req as any).user?.username ||
    (req as any).user?.name ||
    (req as any).user?.email ||
    (data as any).createdByUsername ||
    'system'
  )
  const row = await HospitalExpense.create({
    ...data,
    createdBy: createdByUsername,
    createdByUsername,
  })

  // Activity log
  try {
    logActivity({
      userId: String((req as any).user?.id || (req as any).user?._id || 'system'),
      userName: createdByUsername,
      portal: 'hospital',
      action: 'Expense Created',
      module: 'Expense',
      entityId: String(row._id),
      entityLabel: `${row.category || ''} — ${row.description || ''}`,
      amount: Number(row.amount || 0),
      method: '',
      meta: { category: row.category, departmentName: row.departmentName || '', dateIso: row.dateIso || '' }
    })
  } catch {}

  res.status(201).json({ expense: row })
}

export async function update(req: Request, res: Response){
  const id = req.params.id
  const data = createExpenseSchema.partial().parse(req.body)
  const row = await HospitalExpense.findByIdAndUpdate(id, data, { new: true })
  if (!row) return res.status(404).json({ error: 'Expense not found' })
  res.json({ expense: row })
}

export async function remove(req: Request, res: Response){
  const id = req.params.id
  const row = await HospitalExpense.findByIdAndDelete(id)
  if (!row) return res.status(404).json({ error: 'Expense not found' })
  res.json({ ok: true })
}
