import { Request, Response } from 'express'
import { ChartOfAccount, ChartOfAccountDoc } from '../models/ChartOfAccount'
import { FinanceJournal } from '../models/FinanceJournal'
import { Types } from 'mongoose'

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// List all accounts with filters
export async function list(req: Request, res: Response) {
  const portal = String((req.query as any).portal || '')
  const type = String((req.query as any).type || '')
  const active = (req.query as any).active

  const filter: any = {}
  if (portal) filter.portal = portal
  if (type) filter.type = type
  if (active !== undefined && active !== '') filter.active = active === 'true'

  const accounts = await ChartOfAccount.find(filter).sort({ code: 1, name: 1 })
  res.json(accounts)
}

// Get single account by ID
export async function get(req: Request, res: Response) {
  const id = String(req.params.id)
  const account = await ChartOfAccount.findById(id)
  if (!account) return res.status(404).json({ error: 'Account not found' })
  res.json(account)
}

// Create new account
export async function create(req: Request, res: Response) {
  const { code, name, type, subType, portal, linkedUserId, linkedUsername, balance, active } = req.body

  if (!name || !type) {
    return res.status(400).json({ error: 'name and type are required' })
  }

  const existing = await ChartOfAccount.findOne({ name })
  if (existing) {
    return res.status(400).json({ error: 'Account with this name already exists' })
  }

  if (code) {
    const existingCode = await ChartOfAccount.findOne({ code })
    if (existingCode) {
      return res.status(400).json({ error: 'Account with this code already exists' })
    }
  }

  const account = await ChartOfAccount.create({
    code,
    name,
    type,
    subType,
    portal,
    linkedUserId,
    linkedUsername,
    balance: balance || 0,
    active: active !== undefined ? active : true,
  })

  res.status(201).json(account)
}

// Update account details
export async function update(req: Request, res: Response) {
  const id = String(req.params.id)
  const { code, name, type, subType, portal, linkedUserId, linkedUsername, active } = req.body

  const account = await ChartOfAccount.findById(id)
  if (!account) return res.status(404).json({ error: 'Account not found' })

  // Check for duplicate name
  if (name && name !== account.name) {
    const existing = await ChartOfAccount.findOne({ name })
    if (existing) return res.status(400).json({ error: 'Account with this name already exists' })
  }

  // Check for duplicate code
  if (code && code !== account.code) {
    const existingCode = await ChartOfAccount.findOne({ code })
    if (existingCode) return res.status(400).json({ error: 'Account with this code already exists' })
  }

  if (code !== undefined) account.code = code
  if (name !== undefined) account.name = name
  if (type !== undefined) account.type = type
  if (subType !== undefined) account.subType = subType
  if (portal !== undefined) account.portal = portal
  if (linkedUserId !== undefined) account.linkedUserId = linkedUserId
  if (linkedUsername !== undefined) account.linkedUsername = linkedUsername
  if (active !== undefined) account.active = active

  await account.save()
  res.json(account)
}

// Delete account (only if balance=0)
export async function remove(req: Request, res: Response) {
  const id = String(req.params.id)
  const account = await ChartOfAccount.findById(id)
  if (!account) return res.status(404).json({ error: 'Account not found' })

  // Check balance from journals
  const balance = await computeAccountBalance(account.name)
  if (balance !== 0) {
    return res.status(400).json({ error: 'Cannot delete account with non-zero balance' })
  }

  await ChartOfAccount.deleteOne({ _id: id })
  res.json({ deleted: true, id })
}

// Calculate current balance from journals
async function computeAccountBalance(accountName: string): Promise<number> {
  const rows: any[] = await FinanceJournal.aggregate([
    { $match: { status: { $ne: 'reversed' } } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': accountName } },
    {
      $group: {
        _id: null,
        debits: { $sum: { $ifNull: ['$lines.debit', 0] } },
        credits: { $sum: { $ifNull: ['$lines.credit', 0] } },
      },
    },
  ])
  const debits = Number(rows?.[0]?.debits || 0)
  const credits = Number(rows?.[0]?.credits || 0)
  return round2(debits - credits)
}

// Get account balance
export async function getBalance(req: Request, res: Response) {
  const id = String(req.params.id)
  const account = await ChartOfAccount.findById(id)
  if (!account) return res.status(404).json({ error: 'Account not found' })

  const balance = await computeAccountBalance(account.name)
  res.json({ balance, account: account.name })
}

// Get account transaction history (ledger)
export async function getLedger(req: Request, res: Response) {
  const id = String(req.params.id)
  const from = String((req.query as any).from || '')
  const to = String((req.query as any).to || '')

  const account = await ChartOfAccount.findById(id)
  if (!account) return res.status(404).json({ error: 'Account not found' })

  const matchDate: any = {}
  if (from) matchDate.dateIso = { ...matchDate.dateIso, $gte: from }
  if (to) matchDate.dateIso = { ...matchDate.dateIso, $lte: to }

  const rows = await FinanceJournal.aggregate([
    { $match: { status: { $ne: 'reversed' }, ...matchDate } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': account.name } },
    { $sort: { dateIso: 1, createdAt: 1 } },
    {
      $project: {
        _id: 1,
        dateIso: 1,
        refType: 1,
        refId: 1,
        memo: 1,
        debit: '$lines.debit',
        credit: '$lines.credit',
        tags: '$lines.tags',
      },
    },
  ])

  // Calculate running balance
  let runningBalance = 0
  const ledger = rows.map((r: any) => {
    const debit = Number(r.debit || 0)
    const credit = Number(r.credit || 0)
    runningBalance += (debit - credit)
    return {
      ...r,
      balance: round2(runningBalance),
    }
  })

  res.json(ledger)
}

// Create account for user (called from other modules)
export async function createUserAccount(req: Request, res: Response) {
  const { portal, userId, username } = req.body

  if (!portal || !userId || !username) {
    return res.status(400).json({ error: 'portal, userId, and username are required' })
  }

  // Generate account name: username/portal
  const accountName = `${username}/${portal}`

  // Check if account already exists
  const existing = await ChartOfAccount.findOne({ name: accountName })
  if (existing) {
    return res.status(400).json({ error: 'Account already exists for this user' })
  }

  // Generate code based on portal
  const prefixMap: Record<string, string> = {
    reception: 'REC',
    hospital: 'HOS',
    lab: 'LAB',
    pharmacy: 'PHA',
    diagnostic: 'DIA',
    finance: 'FIN',
    aesthetic: 'AES',
    dialysis: 'DIA',
  }
  const prefix = prefixMap[portal] || 'USR'

  // Find next code number
  const lastAccount = await ChartOfAccount.findOne({
    code: { $regex: `^${prefix}-` },
  }).sort({ code: -1 })

  let nextNum = 1
  if (lastAccount?.code) {
    const match = lastAccount.code.match(/-(\d+)$/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }

  const code = `${prefix}-${String(nextNum).padStart(3, '0')}`

  const account = await ChartOfAccount.create({
    code,
    name: accountName,
    type: 'Asset',
    subType: 'USER_ACCOUNT',
    portal,
    linkedUserId: String(userId),
    linkedUsername: username,
    balance: 0,
    active: true,
  })

  res.status(201).json(account)
}

// Seed default system accounts
export async function seedDefaultAccounts(req: Request, res: Response) {
  const defaultAccounts = [
    { code: 'SYS-001', name: 'CASH', type: 'Asset' as const, subType: 'CASH' as const },
    { code: 'SYS-002', name: 'BANK', type: 'Asset' as const, subType: 'BANK' as const },
    { code: 'SYS-003', name: 'AR', type: 'Asset' as const, subType: 'RECEIVABLE' as const },
    { code: 'SYS-004', name: 'OPD_REVENUE', type: 'Income' as const, subType: 'REVENUE' as const },
    { code: 'SYS-005', name: 'IPD_REVENUE', type: 'Income' as const, subType: 'REVENUE' as const },
    { code: 'SYS-006', name: 'LAB_REVENUE', type: 'Income' as const, subType: 'REVENUE' as const },
    { code: 'SYS-007', name: 'PHARMACY_REVENUE', type: 'Income' as const, subType: 'REVENUE' as const },
    { code: 'SYS-008', name: 'DIAGNOSTIC_REVENUE', type: 'Income' as const, subType: 'REVENUE' as const },
    { code: 'SYS-009', name: 'DIALYSIS_REVENUE', type: 'Income' as const, subType: 'REVENUE' as const },
    { code: 'SYS-010', name: 'AESTHETIC_REVENUE', type: 'Income' as const, subType: 'REVENUE' as const },
    { code: 'SYS-011', name: 'DOCTOR_PAYABLE', type: 'Liability' as const, subType: 'PAYABLE' as const },
    { code: 'SYS-012', name: 'DOCTOR_SHARE_EXPENSE', type: 'Expense' as const },
  ]

  const created: any[] = []
  for (const acc of defaultAccounts) {
    const existing = await ChartOfAccount.findOne({ code: acc.code })
    if (!existing) {
      const createdAcc = await ChartOfAccount.create(acc)
      created.push(createdAcc)
    }
  }

  res.json({ seeded: created.length, accounts: created })
}
