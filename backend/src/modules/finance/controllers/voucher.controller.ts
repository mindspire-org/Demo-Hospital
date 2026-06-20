import { Request, Response } from 'express'
import { Voucher } from '../models/Voucher'
import { ChartOfAccount } from '../models/ChartOfAccount'
import { FinanceJournal, JournalLine } from '../models/FinanceJournal'
import { FiscalPeriod } from '../models/FiscalPeriod'
import { logActivity } from '../services/activityLog.service'

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

// Get next voucher number for a given type
export async function nextVoucherNo(req: Request, res: Response) {
  const type = String((req.query as any).type || 'JV')
  const validTypes = ['BPV', 'BRV', 'CPV', 'CRV', 'JV', 'CONTRA']
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid voucher type' })
  }

  const last: any = await Voucher.findOne({ voucherType: type }).lean().sort({ voucherNo: -1 })
  let nextNum = 1
  if (last?.voucherNo) {
    const match = last.voucherNo.match(/-(\d+)$/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }

  const voucherNo = `${type}-${String(nextNum).padStart(4, '0')}`
  res.json({ voucherNo, voucherType: type })
}

// Create a new voucher (draft)
export async function create(req: Request, res: Response) {
  const { voucherType, dateIso, payee, chequeNo, chequeDate, narration, module, lines, createdBy } = req.body

  if (!voucherType || !dateIso) {
    return res.status(400).json({ error: 'voucherType and dateIso are required' })
  }

  const validTypes = ['BPV', 'BRV', 'CPV', 'CRV', 'JV', 'CONTRA']
  if (!validTypes.includes(voucherType)) {
    return res.status(400).json({ error: 'Invalid voucher type. Must be BPV, BRV, CPV, CRV, JV, or CONTRA' })
  }

  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'At least one line is required' })
  }

  // Validate double-entry: total debits === total credits
  const totalDebits = round2(lines.reduce((s: number, l: any) => s + (l.debit || 0), 0))
  const totalCredits = round2(lines.reduce((s: number, l: any) => s + (l.credit || 0), 0))
  if (totalDebits !== totalCredits) {
    return res.status(400).json({ error: `Debits (${totalDebits}) must equal Credits (${totalCredits})` })
  }

  // Validate voucher-type specific rules
  const err = validateVoucherTypeRules(voucherType, lines)
  if (err) return res.status(400).json({ error: err })

  // Auto-generate voucher number
  const last: any = await Voucher.findOne({ voucherType }).lean().sort({ voucherNo: -1 })
  let nextNum = 1
  if (last?.voucherNo) {
    const match = last.voucherNo.match(/-(\d+)$/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }
  const voucherNo = `${voucherType}-${String(nextNum).padStart(4, '0')}`

  // Resolve account names from codes
  const resolvedLines = await resolveLineNames(lines)

  const { isExpense, expenseAccountCode, costCenter, taxAmount, taxType, recurringId } = req.body

  // Resolve expense account name from COA
  let expenseAccountName = ''
  if (expenseAccountCode) {
    try {
      const acc: any = await ChartOfAccount.findOne({ code: expenseAccountCode }).lean()
      if (acc) expenseAccountName = acc.name
    } catch {}
  }

  const voucher = await Voucher.create({
    voucherNo,
    voucherType,
    dateIso,
    payee: payee || '',
    chequeNo,
    chequeDate,
    narration: narration || '',
    module,
    lines: resolvedLines,
    isExpense: isExpense || false,
    expenseAccountCode: expenseAccountCode || undefined,
    expenseAccountName: expenseAccountName || undefined,
    costCenter: costCenter || undefined,
    taxAmount: taxAmount || 0,
    taxType: taxType || 'none',
    recurringId: recurringId || undefined,
    status: 'draft',
    createdBy: createdBy || (req as any).user?.username || '',
  })

  res.status(201).json(voucher)
}

// List vouchers with filters
export async function list(req: Request, res: Response) {
  const voucherType = String((req.query as any).type || '')
  const status = String((req.query as any).status || '')
  const from = String((req.query as any).from || '')
  const to = String((req.query as any).to || '')
  const q = String((req.query as any).q || '')
  const page = Math.max(1, parseInt(String((req.query as any).page || '1')))
  const limit = parseInt(String((req.query as any).limit || '20'))
  const skip = (page - 1) * limit

  const isExpense = String((req.query as any).isExpense || '')
  const costCenter = String((req.query as any).costCenter || '')
  const expenseAccountCode = String((req.query as any).expenseAccountCode || '')

  const filter: any = {}
  if (voucherType) filter.voucherType = voucherType
  if (status) filter.status = status
  if (from || to) {
    filter.dateIso = {}
    if (from) filter.dateIso.$gte = from
    if (to) filter.dateIso.$lte = to
  }
  if (isExpense === 'true') filter.isExpense = true
  if (isExpense === 'false') filter.isExpense = false
  if (costCenter) filter.costCenter = costCenter
  if (expenseAccountCode) filter.expenseAccountCode = expenseAccountCode
  if (q) {
    filter.$or = [
      { voucherNo: { $regex: q, $options: 'i' } },
      { payee: { $regex: q, $options: 'i' } },
      { narration: { $regex: q, $options: 'i' } },
    ]
  }

  const total = await Voucher.countDocuments(filter)
  const vouchers = limit > 0
    ? await Voucher.find(filter).sort({ dateIso: -1, createdAt: -1 }).skip(skip).limit(limit).lean()
    : await Voucher.find(filter).sort({ dateIso: -1, createdAt: -1 }).lean()

  // Add computed totals
  const items = vouchers.map((v: any) => ({
    ...v,
    totalDebit: round2((v.lines || []).reduce((s: number, l: any) => s + (l.debit || 0), 0)),
    totalCredit: round2((v.lines || []).reduce((s: number, l: any) => s + (l.credit || 0), 0)),
  }))

  res.json({ vouchers: items, total, page, totalPages: limit > 0 ? Math.ceil(total / limit) : 1 })
}

// Get single voucher
export async function get(req: Request, res: Response) {
  const id = String(req.params.id)
  const voucher = await Voucher.findById(id).lean()
  if (!voucher) return res.status(404).json({ error: 'Voucher not found' })
  res.json(voucher)
}

// Update a draft voucher
export async function update(req: Request, res: Response) {
  const id = String(req.params.id)
  const voucher = await Voucher.findById(id)
  if (!voucher) return res.status(404).json({ error: 'Voucher not found' })
  if (voucher.status !== 'draft') {
    return res.status(400).json({ error: 'Only draft vouchers can be updated' })
  }

  const { dateIso, payee, chequeNo, chequeDate, narration, module, lines } = req.body

  if (lines && Array.isArray(lines)) {
    const totalDebits = round2(lines.reduce((s: number, l: any) => s + (l.debit || 0), 0))
    const totalCredits = round2(lines.reduce((s: number, l: any) => s + (l.credit || 0), 0))
    if (totalDebits !== totalCredits) {
      return res.status(400).json({ error: `Debits (${totalDebits}) must equal Credits (${totalCredits})` })
    }
    const err = validateVoucherTypeRules(voucher.voucherType, lines)
    if (err) return res.status(400).json({ error: err })

    const resolvedLines = await resolveLineNames(lines)
    voucher.lines = resolvedLines
  }

  const { isExpense, expenseAccountCode, costCenter, taxAmount, taxType } = req.body

  if (dateIso !== undefined) voucher.dateIso = dateIso
  if (payee !== undefined) voucher.payee = payee
  if (chequeNo !== undefined) voucher.chequeNo = chequeNo
  if (chequeDate !== undefined) voucher.chequeDate = chequeDate
  if (narration !== undefined) voucher.narration = narration
  if (module !== undefined) voucher.module = module || undefined
  if (isExpense !== undefined) voucher.isExpense = isExpense
  if (expenseAccountCode !== undefined) {
    voucher.expenseAccountCode = expenseAccountCode || undefined
    // Resolve name from COA
    if (expenseAccountCode) {
      try {
        const acc: any = await ChartOfAccount.findOne({ code: expenseAccountCode }).lean()
        if (acc) voucher.expenseAccountName = acc.name
      } catch {}
    } else {
      voucher.expenseAccountName = ''
    }
  }
  if (costCenter !== undefined) voucher.costCenter = costCenter || undefined
  if (taxAmount !== undefined) voucher.taxAmount = taxAmount
  if (taxType !== undefined) voucher.taxType = taxType

  await voucher.save()
  res.json(voucher)
}

// Delete a draft voucher
export async function remove(req: Request, res: Response) {
  const id = String(req.params.id)
  const voucher = await Voucher.findById(id)
  if (!voucher) return res.status(404).json({ error: 'Voucher not found' })
  if (voucher.status !== 'draft') {
    return res.status(400).json({ error: 'Only draft vouchers can be deleted' })
  }
  await Voucher.deleteOne({ _id: id })
  res.json({ deleted: true, id })
}

// Post a draft voucher → creates FinanceJournal entry
export async function post(req: Request, res: Response) {
  const id = String(req.params.id)
  const voucher = await Voucher.findById(id)
  if (!voucher) return res.status(404).json({ error: 'Voucher not found' })
  if (voucher.status !== 'draft' && voucher.status !== 'approved') {
    return res.status(400).json({ error: 'Only draft or approved vouchers can be posted' })
  }

  // Check fiscal period is open
  const period = await FiscalPeriod.findOne({
    startDate: { $lte: voucher.dateIso },
    endDate: { $gte: voucher.dateIso },
  })
  if (period && period.status !== 'open') {
    return res.status(400).json({ error: `Fiscal period "${period.name}" is ${period.status}. Cannot post vouchers.` })
  }

  const postedBy = String((req as any).user?.username || (req as any).user?.name || '')

  // Create FinanceJournal entry from voucher lines
  const journalLines: JournalLine[] = (voucher.lines || []).map((l: any) => ({
    account: l.accountCode,
    debit: l.debit || 0,
    credit: l.credit || 0,
    tags: {
      voucherNo: voucher.voucherNo,
      voucherType: voucher.voucherType,
      payee: voucher.payee,
      chequeNo: voucher.chequeNo,
      isExpense: voucher.isExpense || false,
      expenseAccountCode: voucher.expenseAccountCode || '',
      expenseAccountName: voucher.expenseAccountName || '',
      costCenter: voucher.costCenter || '',
      taxType: voucher.taxType || 'none',
      postedBy,
      module: voucher.module || voucher.costCenter || 'general',
    },
  }))

  // If this is an expense voucher, ensure the journal has proper double-entry:
  // Expense (Debit) and Cash/Bank (Credit only).
  // Users sometimes put both debit & credit on the same cash/bank line,
  // so we reconstruct the lines to separate them correctly.
  if (voucher.isExpense && voucher.expenseAccountCode) {
    const hasExpenseDebit = journalLines.some(l => l.account === voucher.expenseAccountCode && (l.debit || 0) > 0)
    if (!hasExpenseDebit) {
      // Expense account is missing from debit side — reconstruct the journal.
      // Calculate the expense amount from the credit side of cash/bank lines.
      const cashBankCodes = ['2000-101', '2000-102', '2000-103']
      const expenseAmount = round2(
        journalLines
          .filter(l => cashBankCodes.includes(l.account))
          .reduce((s, l) => s + (l.credit || 0), 0)
      )

      if (expenseAmount > 0) {
        // Fix existing cash/bank lines: remove debit from them (they should only have credit)
        for (const line of journalLines) {
          if (cashBankCodes.includes(line.account)) {
            line.debit = 0
          }
        }

        // Add the expense debit line
        journalLines.push({
          account: voucher.expenseAccountCode,
          debit: expenseAmount,
          credit: 0,
          tags: {
            voucherNo: voucher.voucherNo,
            isExpense: true,
            expenseAccountCode: voucher.expenseAccountCode || '',
            expenseAccountName: voucher.expenseAccountName || '',
            costCenter: voucher.costCenter || '',
            postedBy,
            module: voucher.module || voucher.costCenter || 'general',
          }
        })
      }
    }
  }

  // Add tax journal lines if applicable
  if (voucher.taxAmount && voucher.taxAmount > 0 && voucher.taxType !== 'none') {
    const taxAccountCode = '3000-205' // Tax Payable
    let taxAccountName = 'TAX PAYABLE'
    try {
      const taxAcc: any = await ChartOfAccount.findOne({ code: taxAccountCode }).lean()
      if (taxAcc) taxAccountName = taxAcc.name
    } catch {}

    if (voucher.taxType === 'withholding') {
      // Withholding on expense: debit expense (already in lines), debit tax payable, credit cash/bank (gross)
      journalLines.push({
        account: taxAccountCode,
        debit: voucher.taxAmount,
        credit: 0,
        tags: { voucherNo: voucher.voucherNo, taxType: 'withholding', postedBy, module: voucher.module || 'general' },
      })
    } else if (voucher.taxType === 'sales_tax') {
      // Sales tax on income: debit cash/bank (gross), credit income (net), credit tax payable
      journalLines.push({
        account: taxAccountCode,
        debit: 0,
        credit: voucher.taxAmount,
        tags: { voucherNo: voucher.voucherNo, taxType: 'sales_tax', postedBy, module: voucher.module || 'general' },
      })
    }
  }

  const journal = await FinanceJournal.create({
    dateIso: voucher.dateIso,
    module: voucher.module || voucher.costCenter || 'general',
    refType: `voucher_${voucher.voucherType.toLowerCase()}`,
    refId: String(voucher._id),
    memo: voucher.narration || `${voucher.voucherType} - ${voucher.voucherNo}`,
    lines: journalLines,
    status: 'active',
  })

  // Link journal back to voucher
  voucher.status = 'posted'
  voucher.journalId = journal._id
  voucher.postedAt = new Date().toISOString()
  voucher.postedBy = postedBy
  await voucher.save()

  // Activity log
  try {
    const totalAmount = (voucher.lines || []).reduce((s: number, l: any) => s + (l.debit || l.credit || 0), 0)
    logActivity({
      userId: String((req as any).user?._id || (req as any).user?.id || 'system'),
      userName: postedBy,
      portal: 'finance',
      action: 'Voucher Posted',
      module: voucher.module || voucher.costCenter || 'general',
      entityId: String(voucher._id),
      entityLabel: `${voucher.voucherType} — ${voucher.voucherNo}`,
      amount: Number(totalAmount || 0),
      method: String(voucher.payee || ''),
      meta: { voucherNo: voucher.voucherNo, voucherType: voucher.voucherType, narration: voucher.narration || '' }
    })
  } catch {}

  res.json({ voucher, journalId: String(journal._id) })
}

// Cancel a posted voucher → reverses the linked FinanceJournal entry
export async function cancel(req: Request, res: Response) {
  const id = String(req.params.id)
  const { memo } = req.body || {}
  const voucher = await Voucher.findById(id)
  if (!voucher) return res.status(404).json({ error: 'Voucher not found' })
  if (voucher.status !== 'posted') {
    return res.status(400).json({ error: 'Only posted vouchers can be cancelled' })
  }

  // Reverse the linked journal
  if (voucher.journalId) {
    const journal: any = await FinanceJournal.findById(voucher.journalId)
    if (journal && journal.status !== 'reversed') {
      const revLines: JournalLine[] = (journal.lines || []).map((l: any) => ({
        account: l.account,
        debit: l.credit || 0,
        credit: l.debit || 0,
        tags: l.tags,
      }))

      // Mark original as reversed
      journal.status = 'reversed'
      journal.reversedAt = new Date().toISOString()
      journal.memo = `${journal.memo || ''} - Cancelled: ${memo || 'Voucher cancelled'}`
      await journal.save()

      // Create reversal journal
      await FinanceJournal.create({
        dateIso: todayIso(),
        refType: `${journal.refType}_reversal`,
        refId: String(journal._id),
        memo: memo || `Reversal for voucher ${voucher.voucherNo}`,
        lines: revLines,
        status: 'active',
      })
    }
  }

  voucher.status = 'cancelled'
  await voucher.save()

  res.json({ voucher, cancelled: true })
}

// --- Helper functions ---

function validateVoucherTypeRules(voucherType: string, lines: any[]): string | null {
  const cashCodes = ['2000-101']
  const bankCodes = ['2000-102', '2000-103']

  switch (voucherType) {
    case 'BPV': {
      // Credit side must have a BANK account
      const hasBankCredit = lines.some((l: any) => bankCodes.includes(l.accountCode) && (l.credit || 0) > 0)
      if (!hasBankCredit) return 'BPV must have a BANK account on the credit side'
      break
    }
    case 'BRV': {
      // Debit side must have a BANK account
      const hasBankDebit = lines.some((l: any) => bankCodes.includes(l.accountCode) && (l.debit || 0) > 0)
      if (!hasBankDebit) return 'BRV must have a BANK account on the debit side'
      break
    }
    case 'CPV': {
      // Credit side must have a CASH account
      const hasCashCredit = lines.some((l: any) => cashCodes.includes(l.accountCode) && (l.credit || 0) > 0)
      if (!hasCashCredit) return 'CPV must have a CASH account on the credit side'
      break
    }
    case 'CRV': {
      // Debit side must have a CASH account
      const hasCashDebit = lines.some((l: any) => cashCodes.includes(l.accountCode) && (l.debit || 0) > 0)
      if (!hasCashDebit) return 'CRV must have a CASH account on the debit side'
      break
    }
    case 'CONTRA': {
      // Must involve both a Cash/Bank account on debit and credit side
      const cashBankCodes = [...cashCodes, ...bankCodes]
      const hasCashBankDebit = lines.some((l: any) => cashBankCodes.includes(l.accountCode) && (l.debit || 0) > 0)
      const hasCashBankCredit = lines.some((l: any) => cashBankCodes.includes(l.accountCode) && (l.credit || 0) > 0)
      if (!hasCashBankDebit || !hasCashBankCredit) return 'CONTRA must have a Cash/Bank account on both debit and credit sides'
      break
    }
    case 'JV': {
      // No restriction
      break
    }
  }
  return null
}

async function resolveLineNames(lines: any[]): Promise<any[]> {
  const resolved = []
  for (const line of lines) {
    let accountName = line.accountName || ''
    if (line.accountCode && !accountName) {
      const acc: any = await ChartOfAccount.findOne({ code: line.accountCode }).lean()
      if (acc) accountName = acc.name
    }
    resolved.push({
      accountCode: line.accountCode || '',
      accountName,
      debit: round2(line.debit || 0),
      credit: round2(line.credit || 0),
    })
  }
  return resolved
}

// Create expense voucher (shortcut endpoint — auto-creates CPV/BPV from expense data)
export async function createExpense(req: Request, res: Response) {
  const { dateIso, expenseAccountCode, costCenter, amount, method, note, payee, module, taxAmount, taxType } = req.body

  if (!dateIso || !amount || !method) {
    return res.status(400).json({ error: 'dateIso, amount, and method (cash/bank) are required' })
  }

  const amt = round2(Number(amount))
  if (amt <= 0) return res.status(400).json({ error: 'Amount must be positive' })

  // Determine voucher type from payment method
  const voucherType = (method === 'bank' || method === 'card') ? 'BPV' : 'CPV'

  // Resolve expense account from COA
  let expAccCode = expenseAccountCode || '6000-116' // default: MISC EXP
  let expAccName = 'MISC EXP'
  try {
    const acc: any = await ChartOfAccount.findOne({ code: expAccCode }).lean()
    if (acc) expAccName = acc.name
  } catch {}

  // Cash/Bank account
  const cashBankCode = voucherType === 'BPV' ? '2000-102' : '2000-101'
  let cashBankName = voucherType === 'BPV' ? 'ALBARAKA BANK' : 'CASH IN HAND'
  try {
    const acc: any = await ChartOfAccount.findOne({ code: cashBankCode }).lean()
    if (acc) cashBankName = acc.name
  } catch {}

  const lines = [
    { accountCode: expAccCode, accountName: expAccName, debit: amt, credit: 0 },
    { accountCode: cashBankCode, accountName: cashBankName, debit: 0, credit: amt },
  ]

  // Auto-generate voucher number
  const last: any = await Voucher.findOne({ voucherType }).lean().sort({ voucherNo: -1 })
  let nextNum = 1
  if (last?.voucherNo) {
    const match = last.voucherNo.match(/-(\d+)$/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }
  const voucherNo = `${voucherType}-${String(nextNum).padStart(4, '0')}`

  const createdBy = String((req as any).user?.username || (req as any).user?.name || 'system')

  const voucher = await Voucher.create({
    voucherNo,
    voucherType,
    dateIso,
    payee: payee || '',
    narration: note || `Expense - ${expAccName}`,
    module: module || 'general',
    lines,
    isExpense: true,
    expenseAccountCode: expAccCode,
    expenseAccountName: expAccName,
    costCenter: costCenter || module || undefined,
    taxAmount: taxAmount || 0,
    taxType: taxType || 'none',
    status: 'draft',
    createdBy,
  })

  // Activity log
  try {
    logActivity({
      userId: String((req as any).user?._id || (req as any).user?.id || 'system'),
      userName: createdBy,
      portal: 'finance',
      action: 'Expense Voucher Created',
      module: module || 'general',
      entityId: String(voucher._id),
      entityLabel: `${voucherType} — ${voucherNo}`,
      amount: Number(amt || 0),
      method: String(payee || method || ''),
      meta: { payee, costCenter, note, expenseAccountCode: expAccCode }
    })
  } catch {}

  res.status(201).json(voucher)
}

// Approve a pending_approval voucher
export async function approve(req: Request, res: Response) {
  const id = String(req.params.id)
  const voucher = await Voucher.findById(id)
  if (!voucher) return res.status(404).json({ error: 'Voucher not found' })
  if (voucher.status !== 'pending_approval') {
    return res.status(400).json({ error: 'Only pending_approval vouchers can be approved' })
  }

  const approvedBy = String((req as any).user?.username || (req as any).user?.name || '')
  voucher.status = 'approved'
  voucher.approvedBy = approvedBy
  voucher.approvedAt = new Date().toISOString()
  await voucher.save()

  // Activity log
  try {
    logActivity({
      userId: String((req as any).user?._id || (req as any).user?.id || 'system'),
      userName: approvedBy,
      portal: 'finance',
      action: 'Expense Approved',
      module: voucher.module || voucher.costCenter || 'general',
      entityId: String(voucher._id),
      entityLabel: `${voucher.voucherType} — ${voucher.voucherNo}`,
      amount: Number((voucher.lines || []).reduce((s: number, l: any) => s + (l.debit || l.credit || 0), 0)),
      method: '',
      meta: { voucherNo: voucher.voucherNo, voucherType: voucher.voucherType, approvedBy }
    })
  } catch {}

  res.json(voucher)
}

// List expense vouchers (shortcut filter)
export async function listExpenses(req: Request, res: Response) {
  const from = String((req.query as any).from || '')
  const to = String((req.query as any).to || '')
  const costCenter = String((req.query as any).costCenter || '')
  const expenseAccountCode = String((req.query as any).expenseAccountCode || '')
  const page = Math.max(1, parseInt(String((req.query as any).page || '1')))
  const limit = parseInt(String((req.query as any).limit || '20'))
  const skip = (page - 1) * limit

  const filter: any = { isExpense: true }
  if (from || to) {
    filter.dateIso = {}
    if (from) filter.dateIso.$gte = from
    if (to) filter.dateIso.$lte = to
  }
  if (costCenter) filter.costCenter = costCenter
  if (expenseAccountCode) filter.expenseAccountCode = expenseAccountCode

  const total = await Voucher.countDocuments(filter)
  const vouchers = await Voucher.find(filter).sort({ dateIso: -1, createdAt: -1 }).skip(skip).limit(limit).lean()

  const items = vouchers.map((v: any) => ({
    ...v,
    totalDebit: round2((v.lines || []).reduce((s: number, l: any) => s + (l.debit || 0), 0)),
    totalCredit: round2((v.lines || []).reduce((s: number, l: any) => s + (l.credit || 0), 0)),
  }))

  res.json({ vouchers: items, total, page, totalPages: Math.ceil(total / limit) })
}
