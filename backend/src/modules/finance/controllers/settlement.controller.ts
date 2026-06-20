import { Request, Response } from 'express'
import { Voucher } from '../models/Voucher'
import { FinanceJournal, JournalLine } from '../models/FinanceJournal'
import { logActivity } from '../services/activityLog.service'

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// Create inter-module settlement (internal JV between cost centers)
export async function createSettlement(req: Request, res: Response) {
  const { dateIso, fromCostCenter, toCostCenter, amount, description, module } = req.body

  if (!dateIso || !fromCostCenter || !toCostCenter || !amount) {
    return res.status(400).json({ error: 'dateIso, fromCostCenter, toCostCenter, and amount are required' })
  }

  const amt = round2(Number(amount))
  if (amt <= 0) return res.status(400).json({ error: 'Amount must be positive' })

  // Create a JV voucher for the settlement
  const voucherType = 'JV'
  const last: any = await Voucher.findOne({ voucherType }).lean().sort({ voucherNo: -1 })
  let nextNum = 1
  if (last?.voucherNo) {
    const match = last.voucherNo.match(/-(\d+)$/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }
  const voucherNo = `${voucherType}-${String(nextNum).padStart(4, '0')}`

  const lines = [
    { accountCode: fromCostCenter, accountName: `Cost Center: ${fromCostCenter}`, debit: amt, credit: 0 },
    { accountCode: toCostCenter, accountName: `Cost Center: ${toCostCenter}`, debit: 0, credit: amt },
  ]

  const createdBy = String((req as any).user?.username || (req as any).user?.name || 'system')

  const voucher = await Voucher.create({
    voucherNo,
    voucherType,
    dateIso,
    narration: description || `Settlement: ${fromCostCenter} → ${toCostCenter}`,
    module: module || 'general',
    lines,
    costCenter: 'settlement',
    status: 'draft',
    createdBy,
  })

  // Activity log
  try {
    logActivity({
      userId: String((req as any).user?._id || (req as any).user?.id || 'system'),
      userName: createdBy,
      portal: 'finance',
      action: 'Settlement Created',
      module: module || 'general',
      entityId: String(voucher._id),
      entityLabel: `JV — ${voucherNo} (${fromCostCenter} → ${toCostCenter})`,
      amount: Number(amt || 0),
      method: '',
      meta: { fromCostCenter, toCostCenter, description: description || '' }
    })
  } catch {}

  res.status(201).json(voucher)
}

// List settlements
export async function listSettlements(req: Request, res: Response) {
  const from = String((req.query as any).from || '')
  const to = String((req.query as any).to || '')
  const filter: any = { costCenter: 'settlement', voucherType: 'JV' }
  if (from || to) {
    filter.dateIso = {}
    if (from) filter.dateIso.$gte = from
    if (to) filter.dateIso.$lte = to
  }

  const settlements = await Voucher.find(filter).sort({ dateIso: -1 }).lean()
  res.json(settlements)
}
