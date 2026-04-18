import { Request, Response } from 'express'
import { CashHandover, CashHandoverDoc } from '../models/CashHandover'
import { ChartOfAccount } from '../models/ChartOfAccount'
import { FinanceJournal, JournalLine } from '../models/FinanceJournal'

function todayIso() {
  const now = new Date()
  return now.toISOString().slice(0, 10)
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// Create handover request (status: pending)
export async function create(req: Request, res: Response) {
  const { fromAccountId, toAccountId, amount, shiftId, shiftName, notes } = req.body

  if (!fromAccountId || !toAccountId || !amount) {
    return res.status(400).json({ error: 'fromAccountId, toAccountId, and amount are required' })
  }

  if (fromAccountId === toAccountId) {
    return res.status(400).json({ error: 'From and to accounts must be different' })
  }

  // Verify accounts exist
  const fromAccount = await ChartOfAccount.findById(fromAccountId)
  const toAccount = await ChartOfAccount.findById(toAccountId)

  if (!fromAccount) {
    return res.status(400).json({ error: 'From account not found' })
  }
  if (!toAccount) {
    return res.status(400).json({ error: 'To account not found' })
  }

  const handoverBy = String((req as any).user?.username || (req as any).user?.name || 'system')

  const handover = await CashHandover.create({
    fromAccountId,
    toAccountId,
    amount: round2(amount),
    shiftId,
    shiftName,
    handoverBy,
    status: 'pending',
    notes,
  })

  res.status(201).json(handover)
}

// List handovers with filters
export async function list(req: Request, res: Response) {
  const status = String((req.query as any).status || '')
  const from = String((req.query as any).from || '')
  const to = String((req.query as any).to || '')

  const filter: any = {}
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    filter.status = status
  }

  const dateFilter: any = {}
  if (from) dateFilter.createdAt = { ...dateFilter.createdAt, $gte: new Date(from) }
  if (to) dateFilter.createdAt = { ...dateFilter.createdAt, $lte: new Date(to + 'T23:59:59') }
  if (Object.keys(dateFilter).length > 0) filter.createdAt = dateFilter.createdAt

  const handovers = await CashHandover.find(filter)
    .populate('fromAccountId', 'name code portal')
    .populate('toAccountId', 'name code portal')
    .sort({ createdAt: -1 })

  res.json(handovers)
}

// List pending handovers for finance manager
export async function getPending(req: Request, res: Response) {
  const handovers = await CashHandover.find({ status: 'pending' })
    .populate('fromAccountId', 'name code portal linkedUsername')
    .populate('toAccountId', 'name code portal')
    .sort({ createdAt: 1 })

  res.json(handovers)
}

// Approve handover (creates journal entry, updates balances)
export async function approve(req: Request, res: Response) {
  const id = String(req.params.id)

  const handover = await CashHandover.findById(id)
    .populate('fromAccountId')
    .populate('toAccountId')

  if (!handover) {
    return res.status(404).json({ error: 'Handover not found' })
  }

  if (handover.status !== 'pending') {
    return res.status(400).json({ error: 'Handover is not in pending status' })
  }

  const approvedBy = String((req as any).user?.username || (req as any).user?.name || 'system')

  // Get account names
  const fromAccount = handover.fromAccountId as any
  const toAccount = handover.toAccountId as any

  // Create journal entry
  const dateIso = todayIso()
  const lines: JournalLine[] = [
    { account: toAccount.name, debit: handover.amount },
    { account: fromAccount.name, credit: handover.amount },
  ]

  const journal = await FinanceJournal.create({
    dateIso,
    refType: 'cash_handover',
    refId: String(handover._id),
    memo: `Cash handover from ${fromAccount.name} to ${toAccount.name}${handover.shiftName ? ` (${handover.shiftName})` : ''}`,
    lines,
    status: 'active',
  })

  // Update handover status
  handover.status = 'approved'
  handover.approvedAt = new Date()
  handover.approvedBy = approvedBy
  handover.journalId = journal._id
  handover.receivedBy = approvedBy
  await handover.save()

  res.json({ handover, journal })
}

// Reject handover request
export async function reject(req: Request, res: Response) {
  const id = String(req.params.id)
  const reason = String((req.body as any)?.reason || '')

  const handover = await CashHandover.findById(id)
  if (!handover) {
    return res.status(404).json({ error: 'Handover not found' })
  }

  if (handover.status !== 'pending') {
    return res.status(400).json({ error: 'Handover is not in pending status' })
  }

  const rejectedBy = String((req as any).user?.username || (req as any).user?.name || 'system')

  handover.status = 'rejected'
  handover.notes = handover.notes
    ? `${handover.notes}\nRejected by ${rejectedBy}: ${reason}`
    : `Rejected by ${rejectedBy}: ${reason}`
  await handover.save()

  res.json(handover)
}
