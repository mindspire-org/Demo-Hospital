import { Request, Response } from 'express'
import { Budget } from '../models/Budget'
import { Voucher } from '../models/Voucher'
import { FiscalPeriod } from '../models/FiscalPeriod'

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// List budgets
export async function list(req: Request, res: Response) {
  const year = String((req.query as any).year || '')
  const costCenter = String((req.query as any).costCenter || '')
  const expenseCategory = String((req.query as any).expenseCategory || '')
  const filter: any = {}
  if (year) filter.year = Number(year)
  if (costCenter) filter.costCenter = costCenter
  if (expenseCategory) filter.expenseCategory = expenseCategory

  const budgets = await Budget.find(filter).sort({ year: -1, month: 1, costCenter: 1 }).lean()
  res.json(budgets)
}

// Create a budget
export async function create(req: Request, res: Response) {
  const { name, fiscalPeriodId, costCenter, expenseCategory, budgetAmount, year, month } = req.body
  if (!name || !budgetAmount || !year) {
    return res.status(400).json({ error: 'name, budgetAmount, and year are required' })
  }

  const budget = await Budget.create({
    name,
    fiscalPeriodId: fiscalPeriodId || undefined,
    costCenter: costCenter || undefined,
    expenseCategory: expenseCategory || undefined,
    budgetAmount: round2(Number(budgetAmount)),
    year: Number(year),
    month: month ? Number(month) : undefined,
  })

  res.status(201).json(budget)
}

// Update a budget
export async function update(req: Request, res: Response) {
  const id = String(req.params.id)
  const budget = await Budget.findById(id)
  if (!budget) return res.status(404).json({ error: 'Budget not found' })

  const { name, costCenter, expenseCategory, budgetAmount, year, month } = req.body
  if (name !== undefined) budget.name = name
  if (costCenter !== undefined) budget.costCenter = costCenter
  if (expenseCategory !== undefined) budget.expenseCategory = expenseCategory
  if (budgetAmount !== undefined) budget.budgetAmount = round2(Number(budgetAmount))
  if (year !== undefined) budget.year = Number(year)
  if (month !== undefined) budget.month = Number(month)

  await budget.save()
  res.json(budget)
}

// Budget vs Actual comparison
export async function budgetVsActual(req: Request, res: Response) {
  const year = Number((req.query as any).year || new Date().getFullYear())
  const costCenter = String((req.query as any).costCenter || '')

  const budgetFilter: any = { year }
  if (costCenter) budgetFilter.costCenter = costCenter

  const budgets = await Budget.find(budgetFilter).lean()

  // Compute actual from posted expense vouchers
  const results = []
  for (const b of budgets) {
    const voucherFilter: any = {
      isExpense: true,
      status: 'posted',
    }

    // Date range for the year (or month)
    if (b.month) {
      const m = String(b.month).padStart(2, '0')
      voucherFilter.dateIso = { $gte: `${year}-01-01`, $lte: `${year}-12-31` }
      // Further filter by month prefix
    } else {
      voucherFilter.dateIso = { $gte: `${year}-01-01`, $lte: `${year}-12-31` }
    }
    if (b.costCenter) voucherFilter.costCenter = b.costCenter
    if (b.expenseCategory) voucherFilter.expenseCategory = b.expenseCategory

    const vouchers = await Voucher.find(voucherFilter).lean()
    const actualAmount = round2(vouchers.reduce((s, v) => {
      const debit = (v.lines || []).reduce((sum: number, l: any) => sum + (l.debit || 0), 0)
      return s + debit
    }, 0))

    results.push({
      budgetId: b._id,
      name: b.name,
      costCenter: b.costCenter,
      expenseCategory: b.expenseCategory,
      year: b.year,
      month: b.month,
      budgetAmount: b.budgetAmount,
      actualAmount,
      variance: round2(b.budgetAmount - actualAmount),
      utilizationPercent: b.budgetAmount > 0 ? round2((actualAmount / b.budgetAmount) * 100) : 0,
    })
  }

  res.json(results)
}

// Department-wise (Cost Center) Profit & Loss
export async function departmentWisePnL(req: Request, res: Response) {
  const year = Number((req.query as any).year || new Date().getFullYear())
  const from = String((req.query as any).from || `${year}-01-01`)
  const to = String((req.query as any).to || `${year}-12-31`)

  // Get all posted vouchers in range
  const vouchers = await Voucher.find({
    status: 'posted',
    dateIso: { $gte: from, $lte: to },
  }).lean()

  // Group by costCenter
  const costCenterMap = new Map<string, { income: number; expense: number }>()

  for (const v of vouchers) {
    const cc = v.costCenter || v.module || 'general'
    if (!costCenterMap.has(cc)) costCenterMap.set(cc, { income: 0, expense: 0 })

    const data = costCenterMap.get(cc)!
    const totalDebit = (v.lines || []).reduce((s: number, l: any) => s + (l.debit || 0), 0)
    const totalCredit = (v.lines || []).reduce((s: number, l: any) => s + (l.credit || 0), 0)

    if (v.isExpense) {
      data.expense += totalDebit
    } else {
      // For non-expense vouchers, classify based on voucher type
      if (['CRV', 'BRV'].includes(v.voucherType)) {
        data.income += totalCredit
      } else if (['CPV', 'BPV'].includes(v.voucherType)) {
        data.expense += totalDebit
      }
    }
  }

  const results = Array.from(costCenterMap.entries()).map(([costCenter, data]) => ({
    costCenter,
    income: round2(data.income),
    expense: round2(data.expense),
    netProfit: round2(data.income - data.expense),
  }))

  const totalIncome = round2(results.reduce((s, r) => s + r.income, 0))
  const totalExpense = round2(results.reduce((s, r) => s + r.expense, 0))

  res.json({
    costCenters: results,
    totalIncome,
    totalExpense,
    totalNetProfit: round2(totalIncome - totalExpense),
  })
}
