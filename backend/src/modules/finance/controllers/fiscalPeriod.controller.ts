import { Request, Response } from 'express'
import { FiscalPeriod } from '../models/FiscalPeriod'
import { Voucher } from '../models/Voucher'
import { FinanceJournal, JournalLine } from '../models/FinanceJournal'
import { ChartOfAccount } from '../models/ChartOfAccount'

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

// List fiscal periods
export async function list(req: Request, res: Response) {
  const type = String((req.query as any).type || '')
  const status = String((req.query as any).status || '')
  const filter: any = {}
  if (type) filter.type = type
  if (status) filter.status = status

  const periods = await FiscalPeriod.find(filter).sort({ startDate: -1 }).lean()
  res.json(periods)
}

// Create a fiscal period
export async function create(req: Request, res: Response) {
  const { name, type, startDate, endDate } = req.body
  if (!name || !type || !startDate || !endDate) {
    return res.status(400).json({ error: 'name, type, startDate, endDate are required' })
  }

  // Check for overlapping periods
  const overlap = await FiscalPeriod.findOne({
    type,
    $or: [
      { startDate: { $lte: endDate, $gte: startDate } },
      { endDate: { $gte: startDate, $lte: endDate } },
    ],
  })
  if (overlap) {
    return res.status(400).json({ error: `Overlapping period exists: "${overlap.name}"` })
  }

  const period = await FiscalPeriod.create({ name, type, startDate, endDate, status: 'open' })
  res.status(201).json(period)
}

// Close a fiscal period (lock postings)
export async function close(req: Request, res: Response) {
  const id = String(req.params.id)
  const period = await FiscalPeriod.findById(id)
  if (!period) return res.status(404).json({ error: 'Fiscal period not found' })
  if (period.status !== 'open') {
    return res.status(400).json({ error: 'Only open periods can be closed' })
  }

  // Check for draft vouchers in this period
  const draftCount = await Voucher.countDocuments({
    dateIso: { $gte: period.startDate, $lte: period.endDate },
    status: { $in: ['draft', 'pending_approval'] },
  })
  if (draftCount > 0) {
    return res.status(400).json({ error: `${draftCount} draft/pending vouchers exist in this period. Post or cancel them first.` })
  }

  const closedBy = String((req as any).user?.username || (req as any).user?.name || '')
  period.status = 'closed'
  period.closedBy = closedBy
  period.closedAt = new Date().toISOString()
  await period.save()

  res.json(period)
}

// Year-end close: zero Income/Expense accounts, transfer net to General Fund
export async function yearEndClose(req: Request, res: Response) {
  const id = String(req.params.id)
  const period = await FiscalPeriod.findById(id)
  if (!period) return res.status(404).json({ error: 'Fiscal period not found' })
  if (period.type !== 'yearly') {
    return res.status(400).json({ error: 'Year-end close only applies to yearly periods' })
  }
  if (period.status !== 'open') {
    return res.status(400).json({ error: 'Period must be open to perform year-end close' })
  }

  // Check for draft vouchers
  const draftCount = await Voucher.countDocuments({
    dateIso: { $gte: period.startDate, $lte: period.endDate },
    status: { $in: ['draft', 'pending_approval'] },
  })
  if (draftCount > 0) {
    return res.status(400).json({ error: `${draftCount} draft/pending vouchers exist. Post or cancel them first.` })
  }

  // Aggregate all Income and Expense account balances from FinanceJournal
  const accounts = await ChartOfAccount.find({
    type: { $in: ['INCOME', 'EXPENSE'] },
  }).lean()

  const journalFilter: any = {
    status: 'active',
    dateIso: { $gte: period.startDate, $lte: period.endDate },
  }

  // Aggregate debits and credits per account
  const agg = await FinanceJournal.aggregate([
    { $match: journalFilter },
    { $unwind: '$lines' },
    { $group: {
      _id: '$lines.account',
      totalDebit: { $sum: { $ifNull: ['$lines.debit', 0] } },
      totalCredit: { $sum: { $ifNull: ['$lines.credit', 0] } },
    }},
  ])

  const balanceMap = new Map<string, number>()
  for (const a of agg) {
    const bal = round2(a.totalDebit - a.totalCredit)
    if (Math.abs(bal) > 0.01) balanceMap.set(a._id, bal)
  }

  // Build closing JV lines
  const closingLines: any[] = []
  let netProfit = 0

  for (const acc of accounts) {
    const bal = balanceMap.get(acc.code)
    if (!bal || Math.abs(bal) < 0.01) continue

    if (acc.type === 'INCOME') {
      // Income has credit balance (negative in our calc) → debit to zero it
      const amount = Math.abs(bal)
      closingLines.push({ accountCode: acc.code, accountName: acc.name, debit: round2(amount), credit: 0 })
      netProfit += amount
    } else if (acc.type === 'EXPENSE') {
      // Expense has debit balance (positive in our calc) → credit to zero it
      const amount = Math.abs(bal)
      closingLines.push({ accountCode: acc.code, accountName: acc.name, debit: 0, credit: round2(amount) })
      netProfit -= amount
    }
  }

  // Add General Fund line for net profit/loss
  const generalFundCode = '3000-301'
  let generalFundName = 'GENERAL FUND'
  try {
    const gf: any = await ChartOfAccount.findOne({ code: generalFundCode }).lean()
    if (gf) generalFundName = gf.name
  } catch {}

  if (netProfit > 0) {
    // Profit: credit General Fund
    closingLines.push({ accountCode: generalFundCode, accountName: generalFundName, debit: 0, credit: round2(netProfit) })
  } else if (netProfit < 0) {
    // Loss: debit General Fund
    closingLines.push({ accountCode: generalFundCode, accountName: generalFundName, debit: round2(Math.abs(netProfit)), credit: 0 })
  }

  // Validate balance
  const totalDebit = round2(closingLines.reduce((s, l) => s + (l.debit || 0), 0))
  const totalCredit = round2(closingLines.reduce((s, l) => s + (l.credit || 0), 0))
  if (round2(totalDebit - totalCredit) !== 0) {
    return res.status(400).json({ error: `Closing entry imbalance: Debit ${totalDebit} vs Credit ${totalCredit}` })
  }

  if (closingLines.length === 0) {
    return res.status(400).json({ error: 'No Income/Expense balances to close' })
  }

  // Create the closing JV voucher
  const voucherType = 'JV'
  const last: any = await Voucher.findOne({ voucherType }).lean().sort({ voucherNo: -1 })
  let nextNum = 1
  if (last?.voucherNo) {
    const match = last.voucherNo.match(/-(\d+)$/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }
  const voucherNo = `JV-YE-${String(nextNum).padStart(4, '0')}`

  const closedBy = String((req as any).user?.username || (req as any).user?.name || '')

  const voucher = await Voucher.create({
    voucherNo,
    voucherType,
    dateIso: period.endDate,
    narration: `Year-end closing - ${period.name}`,
    module: 'general',
    lines: closingLines,
    status: 'posted',
    createdBy: closedBy,
    postedAt: new Date().toISOString(),
    postedBy: closedBy,
  })

  // Create the FinanceJournal entry
  const journalLines: JournalLine[] = closingLines.map(l => ({
    account: l.accountCode,
    debit: l.debit || 0,
    credit: l.credit || 0,
    tags: { voucherNo, yearEndClose: true, periodName: period.name },
  }))

  const journal = await FinanceJournal.create({
    dateIso: period.endDate,
    module: 'general',
    refType: 'year_end_close',
    refId: String(voucher._id),
    memo: `Year-end closing - ${period.name}`,
    lines: journalLines,
    status: 'active',
  })

  voucher.journalId = journal._id
  await voucher.save()

  // Close the period
  period.status = 'closed'
  period.closingVoucherId = voucher._id
  period.closedBy = closedBy
  period.closedAt = new Date().toISOString()
  await period.save()

  // Auto-create next fiscal year period
  const [endYear, endMonth] = period.endDate.split('-').map(Number)
  const nextStart = `${endYear + (endMonth === 6 ? 1 : 0)}-07-01`
  const nextEnd = `${endYear + (endMonth === 6 ? 1 : 0) + 1}-06-30`
  const nextName = `FY ${nextStart.slice(0, 4)}-${String(Number(nextEnd.slice(0, 4))).slice(2)}`

  const existing = await FiscalPeriod.findOne({ name: nextName })
  if (!existing) {
    await FiscalPeriod.create({ name: nextName, type: 'yearly', startDate: nextStart, endDate: nextEnd, status: 'open' })
  }

  res.json({
    period,
    closingVoucher: voucher,
    closingJournal: journal,
    netProfit: round2(netProfit),
    totalDebit,
    totalCredit,
    accountsClosed: closingLines.length - 1, // minus the General Fund line
  })
}

// Lock a closed period permanently
export async function lock(req: Request, res: Response) {
  const id = String(req.params.id)
  const period = await FiscalPeriod.findById(id)
  if (!period) return res.status(404).json({ error: 'Fiscal period not found' })
  if (period.status !== 'closed') {
    return res.status(400).json({ error: 'Only closed periods can be locked' })
  }

  period.status = 'locked'
  await period.save()
  res.json(period)
}

// Reopen a closed period (not allowed if locked)
export async function reopen(req: Request, res: Response) {
  const id = String(req.params.id)
  const period = await FiscalPeriod.findById(id)
  if (!period) return res.status(404).json({ error: 'Fiscal period not found' })
  if (period.status === 'locked') {
    return res.status(400).json({ error: 'Locked periods cannot be reopened' })
  }
  if (period.status !== 'closed') {
    return res.status(400).json({ error: 'Only closed periods can be reopened' })
  }

  // Reverse the closing voucher if it exists
  if (period.closingVoucherId) {
    const closingVoucher = await Voucher.findById(period.closingVoucherId)
    if (closingVoucher && closingVoucher.status === 'posted') {
      // Reverse the journal
      const journal: any = await FinanceJournal.findById(closingVoucher.journalId)
      if (journal && journal.status !== 'reversed') {
        const revLines: JournalLine[] = (journal.lines || []).map((l: any) => ({
          account: l.account,
          debit: l.credit || 0,
          credit: l.debit || 0,
          tags: l.tags,
        }))
        journal.status = 'reversed'
        journal.reversedAt = new Date().toISOString()
        journal.memo = `${journal.memo || ''} - Reopened period`
        await journal.save()
        await FinanceJournal.create({
          dateIso: todayIso(),
          refType: `${journal.refType}_reversal`,
          refId: String(journal._id),
          memo: `Reversal for year-end close of ${period.name}`,
          lines: revLines,
          status: 'active',
        })
      }
      closingVoucher.status = 'cancelled'
      await closingVoucher.save()
    }
  }

  period.status = 'open'
  period.closingVoucherId = undefined as any
  period.closedBy = undefined as any
  period.closedAt = undefined as any
  await period.save()

  res.json(period)
}
