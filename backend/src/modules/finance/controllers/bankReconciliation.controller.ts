import { Request, Response } from 'express'
import { BankReconciliation } from '../models/BankReconciliation'
import { Voucher } from '../models/Voucher'
import { FinanceJournal } from '../models/FinanceJournal'

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// List bank reconciliations
export async function list(req: Request, res: Response) {
  const bankAccountCode = String((req.query as any).bankAccountCode || '')
  const status = String((req.query as any).status || '')
  const filter: any = {}
  if (bankAccountCode) filter.bankAccountCode = bankAccountCode
  if (status) filter.status = status

  const records = await BankReconciliation.find(filter).sort({ statementDate: -1 }).lean()
  res.json(records)
}

// Create a bank reconciliation
export async function create(req: Request, res: Response) {
  const { bankAccountCode, bankAccountName, statementDate, statementBalance, items } = req.body

  if (!bankAccountCode || !statementDate || statementBalance === undefined) {
    return res.status(400).json({ error: 'bankAccountCode, statementDate, and statementBalance are required' })
  }

  // Compute system balance from FinanceJournal
  const agg: any[] = await FinanceJournal.aggregate([
    { $match: { status: 'active' } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': bankAccountCode } },
    { $group: {
      _id: null,
      totalDebit: { $sum: { $ifNull: ['$lines.debit', 0] } },
      totalCredit: { $sum: { $ifNull: ['$lines.credit', 0] } },
    }},
  ])

  const systemBalance = agg.length > 0 ? round2(agg[0].totalDebit - agg[0].totalCredit) : 0
  const difference = round2(Number(statementBalance) - systemBalance)

  const record = await BankReconciliation.create({
    bankAccountCode,
    bankAccountName: bankAccountName || '',
    statementDate,
    statementBalance: round2(Number(statementBalance)),
    systemBalance,
    difference,
    status: 'draft',
    items: items || [],
  })

  res.status(201).json(record)
}

// Update a bank reconciliation
export async function update(req: Request, res: Response) {
  const id = String(req.params.id)
  const record = await BankReconciliation.findById(id)
  if (!record) return res.status(404).json({ error: 'Reconciliation not found' })
  if (record.status === 'reconciled') {
    return res.status(400).json({ error: 'Reconciled records cannot be updated' })
  }

  const { statementDate, statementBalance, items } = req.body

  if (statementDate !== undefined) record.statementDate = statementDate
  if (statementBalance !== undefined) {
    record.statementBalance = round2(Number(statementBalance))
    record.difference = round2(record.statementBalance - (record.systemBalance || 0))
  }
  if (items !== undefined) record.items = items

  await record.save()
  res.json(record)
}

// Auto-match bank statement items with vouchers
export async function autoMatch(req: Request, res: Response) {
  const id = String(req.params.id)
  const record = await BankReconciliation.findById(id)
  if (!record) return res.status(404).json({ error: 'Reconciliation not found' })

  // Find posted vouchers involving this bank account
  const bankCode = record.bankAccountCode
  const vouchers = await Voucher.find({
    status: 'posted',
    dateIso: { $gte: record.statementDate.slice(0, 7) + '-01', $lte: record.statementDate },
  }).lean()

  const matchedItems = (record.items || []).map((item: any) => {
    if (item.matched) return item

    // Try to find a matching voucher by amount and date
    const match = vouchers.find((v: any) => {
      const dateMatch = v.dateIso === item.date || v.dateIso.slice(0, 7) === item.date.slice(0, 7)
      const amountMatch = (item.type === 'deposit')
        ? (v.lines || []).some((l: any) => l.accountCode === bankCode && round2(l.debit || 0) === round2(item.amount))
        : (v.lines || []).some((l: any) => l.accountCode === bankCode && round2(l.credit || 0) === round2(item.amount))
      return dateMatch && amountMatch
    })

    if (match) {
      return { ...item, matched: true, voucherId: match._id }
    }
    return item
  })

  record.items = matchedItems
  await record.save()

  const matchedCount = matchedItems.filter((i: any) => i.matched).length
  const totalCount = matchedItems.length

  res.json({ matchedCount, totalCount, record })
}

// Reconcile (finalize) a bank reconciliation
export async function reconcile(req: Request, res: Response) {
  const id = String(req.params.id)
  const record = await BankReconciliation.findById(id)
  if (!record) return res.status(404).json({ error: 'Reconciliation not found' })
  if (record.status === 'reconciled') {
    return res.status(400).json({ error: 'Already reconciled' })
  }

  const reconciledBy = String((req as any).user?.username || (req as any).user?.name || '')
  record.status = 'reconciled'
  record.reconciledBy = reconciledBy
  record.reconciledAt = new Date().toISOString()
  await record.save()

  res.json(record)
}
