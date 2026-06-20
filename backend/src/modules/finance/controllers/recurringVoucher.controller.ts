import { Request, Response } from 'express'
import { RecurringVoucher } from '../models/RecurringVoucher'
import { Voucher } from '../models/Voucher'
import { ChartOfAccount } from '../models/ChartOfAccount'
import { logActivity } from '../services/activityLog.service'

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function computeNextDue(frequency: string, dayOfMonth?: number, fromDate?: string): string {
  const base = fromDate ? new Date(fromDate) : new Date()
  const next = new Date(base)

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1)
      break
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'monthly': {
      const day = dayOfMonth || 1
      next.setMonth(next.getMonth() + 1)
      next.setDate(Math.min(day, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()))
      break
    }
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1)
      break
  }

  return next.toISOString().slice(0, 10)
}

// List recurring voucher templates
export async function list(req: Request, res: Response) {
  const active = String((req.query as any).active || '')
  const filter: any = {}
  if (active === 'true') filter.active = true
  if (active === 'false') filter.active = false

  const templates = await RecurringVoucher.find(filter).sort({ name: 1 }).lean()
  res.json(templates)
}

// Create a recurring voucher template
export async function create(req: Request, res: Response) {
  const { name, voucherType, frequency, dayOfMonth, lines, payee, narration, module, expenseCategory, expenseDepartment, costCenter } = req.body

  if (!name || !voucherType || !frequency) {
    return res.status(400).json({ error: 'name, voucherType, and frequency are required' })
  }

  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'At least one line is required' })
  }

  // Resolve account names
  const resolvedLines = []
  for (const line of lines) {
    let accountName = line.accountName || ''
    if (line.accountCode && !accountName) {
      const acc: any = await ChartOfAccount.findOne({ code: line.accountCode }).lean()
      if (acc) accountName = acc.name
    }
    resolvedLines.push({
      accountCode: line.accountCode || '',
      accountName,
      debit: round2(line.debit || 0),
      credit: round2(line.credit || 0),
    })
  }

  const nextDueDate = computeNextDue(frequency, dayOfMonth)

  const template = await RecurringVoucher.create({
    name,
    voucherType,
    frequency,
    dayOfMonth,
    lines: resolvedLines,
    payee: payee || '',
    narration: narration || '',
    module,
    expenseCategory,
    expenseDepartment,
    costCenter,
    active: true,
    nextDueDate,
  })

  res.status(201).json(template)
}

// Update a recurring voucher template
export async function update(req: Request, res: Response) {
  const id = String(req.params.id)
  const template = await RecurringVoucher.findById(id)
  if (!template) return res.status(404).json({ error: 'Template not found' })

  const { name, voucherType, frequency, dayOfMonth, lines, payee, narration, module, expenseCategory, expenseDepartment, costCenter, active } = req.body

  if (name !== undefined) template.name = name
  if (voucherType !== undefined) template.voucherType = voucherType
  if (frequency !== undefined) template.frequency = frequency
  if (dayOfMonth !== undefined) template.dayOfMonth = dayOfMonth
  if (payee !== undefined) template.payee = payee
  if (narration !== undefined) template.narration = narration
  if (module !== undefined) template.module = module
  if (expenseCategory !== undefined) template.expenseCategory = expenseCategory
  if (expenseDepartment !== undefined) template.expenseDepartment = expenseDepartment
  if (costCenter !== undefined) template.costCenter = costCenter
  if (active !== undefined) template.active = active

  if (lines && Array.isArray(lines)) {
    const resolvedLines = []
    for (const line of lines) {
      let accountName = line.accountName || ''
      if (line.accountCode && !accountName) {
        const acc: any = await ChartOfAccount.findOne({ code: line.accountCode }).lean()
        if (acc) accountName = acc.name
      }
      resolvedLines.push({
        accountCode: line.accountCode || '',
        accountName,
        debit: round2(line.debit || 0),
        credit: round2(line.credit || 0),
      })
    }
    template.lines = resolvedLines
  }

  // Recompute next due date if frequency or day changed
  if (frequency || dayOfMonth) {
    template.nextDueDate = computeNextDue(template.frequency, template.dayOfMonth, template.lastGeneratedDate)
  }

  await template.save()
  res.json(template)
}

// Delete a recurring voucher template
export async function remove(req: Request, res: Response) {
  const id = String(req.params.id)
  await RecurringVoucher.deleteOne({ _id: id })
  res.json({ deleted: true, id })
}

// Generate due vouchers from all active templates
export async function generateDue(req: Request, res: Response) {
  const today = todayIso()
  const dueTemplates = await RecurringVoucher.find({
    active: true,
    nextDueDate: { $lte: today },
  }).lean()

  const generated: any[] = []
  const errors: string[] = []

  for (const tmpl of dueTemplates) {
    try {
      // Auto-generate voucher number
      const last: any = await Voucher.findOne({ voucherType: tmpl.voucherType }).lean().sort({ voucherNo: -1 })
      let nextNum = 1
      if (last?.voucherNo) {
        const match = last.voucherNo.match(/-(\d+)$/)
        if (match) nextNum = parseInt(match[1], 10) + 1
      }
      const voucherNo = `${tmpl.voucherType}-${String(nextNum).padStart(4, '0')}`

      const voucher = await Voucher.create({
        voucherNo,
        voucherType: tmpl.voucherType,
        dateIso: tmpl.nextDueDate || today,
        payee: tmpl.payee,
        narration: tmpl.narration || `Recurring: ${tmpl.name}`,
        module: tmpl.module,
        lines: tmpl.lines,
        isExpense: true,
        expenseCategory: tmpl.expenseCategory,
        expenseDepartment: tmpl.expenseDepartment,
        costCenter: tmpl.costCenter,
        recurringId: String(tmpl._id),
        status: 'draft',
        createdBy: 'recurring_system',
      })

      // Activity log
      try {
        const totalAmount = (tmpl.lines || []).reduce((s: number, l: any) => s + (l.debit || l.credit || 0), 0)
        logActivity({
          userId: 'system',
          userName: 'Recurring System',
          portal: 'finance',
          action: 'Recurring Voucher Generated',
          module: tmpl.module || 'general',
          entityId: String(voucher._id),
          entityLabel: `${tmpl.voucherType} — ${voucherNo}`,
          amount: Number(totalAmount || 0),
          method: '',
          meta: { templateName: tmpl.name, recurringId: String(tmpl._id), voucherNo }
        })
      } catch {}

      generated.push(voucher)

      // Update template's next due date
      await RecurringVoucher.updateOne(
        { _id: tmpl._id },
        { lastGeneratedDate: today, nextDueDate: computeNextDue(tmpl.frequency, tmpl.dayOfMonth, today) }
      )
    } catch (e: any) {
      errors.push(`Template "${tmpl.name}": ${e?.message || 'Unknown error'}`)
    }
  }

  res.json({ generated: generated.length, vouchers: generated, errors })
}
