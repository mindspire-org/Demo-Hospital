import { Request, Response } from 'express'
import { ChartOfAccount } from '../models/ChartOfAccount'
import { FinanceJournal } from '../models/FinanceJournal'

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// List all accounts with computed balances (FinanceJournal only)
export async function listAllAccountsLedger(req: Request, res: Response) {
  const type = String((req.query as any).type || '').trim()
  const subType = String((req.query as any).subType || '').trim()
  const search = String((req.query as any).search || '').trim()
  const active = (req.query as any).active
  const page = Math.max(1, parseInt(String((req.query as any).page || '1')))
  const limit = parseInt(String((req.query as any).limit || '0'))
  const skip = (page - 1) * limit

  const filter: any = {}
  // Case-insensitive type filter (database stores uppercase like ASSETS, EXPENSE)
  if (type) filter.type = new RegExp(`^${type}$`, 'i')
  if (subType) filter.subType = new RegExp(`^${subType}$`, 'i')
  if (active !== undefined && active !== '') filter.active = active === 'true'

  // Search across code, name, type, subType
  if (search) {
    const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [
      { code: searchRegex },
      { name: searchRegex },
      { type: searchRegex },
      { subType: searchRegex },
    ]
  }

  const total = await ChartOfAccount.countDocuments(filter)

  const accounts = limit > 0
    ? await ChartOfAccount.find(filter).sort({ code: 1, name: 1 }).skip(skip).limit(limit).lean()
    : await ChartOfAccount.find(filter).sort({ code: 1, name: 1 }).lean()

  // --- Balance Calculation from FinanceJournal only ---
  const accountLookup = new Map<string, any>()
  for (const acc of accounts as any[]) {
    if (acc.code) accountLookup.set(String(acc.code).trim().toUpperCase(), acc)
    if (acc.name) accountLookup.set(String(acc.name).trim().toUpperCase(), acc)
    for (const sys of (acc.systemNames || [])) {
      if (sys) accountLookup.set(String(sys).trim().toUpperCase(), acc)
    }
  }

  const journalLines = await FinanceJournal.aggregate([
    { $unwind: '$lines' },
    { $group: {
      _id: '$lines.account',
      debit: { $sum: { $ifNull: ['$lines.debit', 0] } },
      credit: { $sum: { $ifNull: ['$lines.credit', 0] } },
    }},
  ])

  const balanceMap = new Map<string, number>()
  for (const row of journalLines) {
    const acc = accountLookup.get(String(row._id).trim().toUpperCase())
    if (acc) {
      const id = String(acc._id)
      const current = balanceMap.get(id) || 0
      const isAssetOrExpense = ['ASSETS', 'EXPENSE'].includes(acc.type)
      const change = isAssetOrExpense ? (row.debit - row.credit) : (row.credit - row.debit)
      balanceMap.set(id, round2(current + change))
    }
  }

  const accountsWithBalances = accounts.map((acc: any) => ({
    ...acc,
    portal: acc.portal || acc.module || '-',
    balance: balanceMap.get(String(acc._id)) || 0,
  }))

  res.json({ accounts: accountsWithBalances, total, page, totalPages: limit > 0 ? Math.ceil(total / limit) : 1 })
}
