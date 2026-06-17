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
  const module = String((req.query as any).module || '')
  const active = (req.query as any).active
  const page = Math.max(1, parseInt(String((req.query as any).page || '1')))
  const limit = parseInt(String((req.query as any).limit || '0'))
  const skip = (page - 1) * limit

  const filter: any = {}
  if (portal) filter.portal = portal
  if (type) filter.type = type
  if (module) filter.module = module
  if (active !== undefined && active !== '') filter.active = active === 'true'

  const total = await ChartOfAccount.countDocuments(filter)

  const accounts = limit > 0
    ? await ChartOfAccount.find(filter).sort({ code: 1, name: 1 }).skip(skip).limit(limit).lean()
    : await ChartOfAccount.find(filter).sort({ code: 1, name: 1 }).lean()

  // --- Start: Optimized Balance Calculation ---
  // 1. Build lookup map for ALL active accounts
  const allActiveAccounts = await ChartOfAccount.find({ active: true }).lean()
  const accountLookup = new Map<string, any>()
  for (const acc of allActiveAccounts as any[]) {
    if (acc.code) accountLookup.set(String(acc.code).trim().toUpperCase(), acc)
    if (acc.name) accountLookup.set(String(acc.name).trim().toUpperCase(), acc)
    for (const sys of (acc.systemNames || [])) {
      if (sys) accountLookup.set(String(sys).trim().toUpperCase(), acc)
    }
  }

  // 2. Aggregate ALL FinanceJournal lines (including reversed originals + their reversals)
  const journalLines = await FinanceJournal.aggregate([
    { $unwind: '$lines' },
    {
      $group: {
        _id: '$lines.account',
        debit: { $sum: { $ifNull: ['$lines.debit', 0] } },
        credit: { $sum: { $ifNull: ['$lines.credit', 0] } },
      }
    },
  ])

  // 3. Build a map of internal AccountId -> balance from FinanceJournal only
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

  // 5. Attach balances to the accounts being returned
  const accountsWithBalances = accounts.map((acc: any) => ({
    ...acc,
    portal: acc.portal || acc.module || '-', // Populate the portal field with the module name if portal is empty
    balance: balanceMap.get(String(acc._id)) || 0,
  }))
  // --- End: Optimized Balance Calculation ---

  res.json({ accounts: accountsWithBalances, total, page, totalPages: limit > 0 ? Math.ceil(total / limit) : 1 })
}

// Get single account by ID
export async function get(req: Request, res: Response) {
  const id = String(req.params.id)
  const account: any = await ChartOfAccount.findById(id).lean()
  if (!account) return res.status(404).json({ error: 'Account not found' })

  const balance = await computeAccountBalance(account._id)
  res.json({ ...account, balance })
}

// Create new account
export async function create(req: Request, res: Response) {
  const { code, name, type, subType, module, parentId, isGroup, portal, linkedUserId, linkedUsername, balance, active, currency, tax } = req.body

  if (!name || !type) {
    return res.status(400).json({ error: 'name and type are required' })
  }

  const validTypes = ['ASSETS', 'LIABILITIES', 'EQUITY', 'INCOME', 'EXPENSE']
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` })
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
    module: module || undefined,
    parentId: parentId || undefined,
    isGroup: isGroup || false,
    portal,
    linkedUserId,
    linkedUsername,
    balance: balance || 0,
    active: active !== undefined ? active : true,
    currency,
    tax,
  })

  res.status(201).json(account)
}

// Update account details
export async function update(req: Request, res: Response) {
  const id = String(req.params.id)
  const { code, name, type, subType, module, parentId, isGroup, portal, linkedUserId, linkedUsername, active, currency, tax } = req.body

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
  if (module !== undefined) account.module = module || undefined
  if (parentId !== undefined) account.parentId = parentId || undefined
  if (isGroup !== undefined) account.isGroup = isGroup
  if (portal !== undefined) account.portal = portal
  if (linkedUserId !== undefined) account.linkedUserId = linkedUserId
  if (linkedUsername !== undefined) account.linkedUsername = linkedUsername
  if (active !== undefined) account.active = active
  if (currency !== undefined) account.currency = currency
  if (tax !== undefined) account.tax = tax

  await account.save()
  res.json(account)
}

// Delete account (only if balance=0)
export async function remove(req: Request, res: Response) {
  const id = String(req.params.id)
  const account = await ChartOfAccount.findById(id)
  if (!account) return res.status(404).json({ error: 'Account not found' })

  // Check balance from account transactions
  const balance = await computeAccountBalance(account._id)
  if (balance !== 0) {
    return res.status(400).json({ error: 'Cannot delete account with non-zero balance' })
  }

  await ChartOfAccount.deleteOne({ _id: id })
  res.json({ deleted: true, id })
}

// Calculate current balance from FinanceJournal only
async function computeAccountBalance(accountId: any): Promise<number> {
  const account: any = await ChartOfAccount.findById(accountId).lean()
  if (!account) return 0

  const searchTerms = [
    account.code,
    account.name,
    ...(account.systemNames || []),
  ].filter(Boolean).map((s: string) => s.trim().toUpperCase())

  const journalLines = await FinanceJournal.aggregate([
    { $unwind: '$lines' },
    { $match: { 'lines.account': { $in: searchTerms.map(s => new RegExp(`^${s}$`, 'i')) } } },
    {
      $group: {
        _id: null,
        debit: { $sum: { $ifNull: ['$lines.debit', 0] } },
        credit: { $sum: { $ifNull: ['$lines.credit', 0] } },
      }
    },
  ])

  const journalDebit = journalLines.length > 0 ? journalLines[0].debit : 0
  const journalCredit = journalLines.length > 0 ? journalLines[0].credit : 0

  const isAssetOrExpense = ['ASSETS', 'EXPENSE'].includes(account.type)
  if (isAssetOrExpense) {
    return round2(journalDebit - journalCredit)
  } else {
    return round2(journalCredit - journalDebit)
  }
}

// Get account balance
export async function getBalance(req: Request, res: Response) {
  const id = String(req.params.id)
  const account = await ChartOfAccount.findById(id)
  if (!account) return res.status(404).json({ error: 'Account not found' })

  const balance = await computeAccountBalance(account._id)
  res.json({ balance, account: account.name })
}

// Get account transaction history (ledger)
export async function getLedger(req: Request, res: Response) {
  const id = String(req.params.id)
  const from = String((req.query as any).from || '')
  const to = String((req.query as any).to || '')
  const page = Math.max(1, parseInt(String((req.query as any).page || '1')))
  const limit = parseInt(String((req.query as any).limit || '20'))
  const skip = (page - 1) * limit

  const account = await ChartOfAccount.findById(id)
  if (!account) return res.status(404).json({ error: 'Account not found' })

  const searchTerms = [
    account.code,
    account.name,
    ...(account.systemNames || []),
  ].filter(Boolean).map((s: string) => s.trim().toUpperCase())

  // --- Date filters ---
  const matchDate: any = {}
  if (from) matchDate.dateIso = { ...matchDate.dateIso, $gte: from }
  if (to) matchDate.dateIso = { ...matchDate.dateIso, $lte: to }

  const preDateFilter: any = {}
  if (from) preDateFilter.dateIso = { $lt: from }

  // --- 1. Calculate opening balance (before 'from' date) ---
  let openingBalance = 0
  const isAssetOrExpense = ['ASSETS', 'EXPENSE'].includes(account.type)

  if (from) {
    // System journals before from
    const preJournals = await FinanceJournal.find({ dateIso: { $lt: from } }).lean()
    for (const j of preJournals) {
      for (const line of (j.lines || [])) {
        if (searchTerms.includes(String(line.account).trim().toUpperCase())) {
          const d = line.debit || 0
          const c = line.credit || 0
          openingBalance += isAssetOrExpense ? (d - c) : (c - d)
        }
      }
    }
    openingBalance = round2(openingBalance)
  }

  // --- 2. Fetch system journal lines in range ---
  const journals = await FinanceJournal.find(matchDate).sort({ dateIso: 1, createdAt: 1 }).lean()

  const journalRows: any[] = []
  for (const j of journals) {
    for (let i = 0; i < (j.lines || []).length; i++) {
      const line = j.lines[i]
      if (searchTerms.includes(String(line.account).trim().toUpperCase())) {
        journalRows.push({
          _id: `${j._id}_line_${i}`,
          dateIso: j.dateIso,
          refType: j.refType,
          refId: j.refId,
          memo: j.memo || '-',
          debit: line.debit || 0,
          credit: line.credit || 0,
          createdAt: j.createdAt,
        })
      }
    }
  }

  // --- 3. Sort ---
  const allRows = [...journalRows].sort((a: any, b: any) => {
    if (a.dateIso !== b.dateIso) return a.dateIso.localeCompare(b.dateIso)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  // --- 4. Calculate running balance ---
  let runningBalance = openingBalance
  const ledger = allRows.map((r: any) => {
    const d = Number(r.debit || 0)
    const c = Number(r.credit || 0)
    runningBalance += isAssetOrExpense ? (d - c) : (c - d)
    return {
      ...r,
      balance: round2(runningBalance),
    }
  })

  // --- 5. Paginate ---
  const total = ledger.length
  const pagedLedger = limit > 0 ? ledger.slice(skip, skip + limit) : ledger

  res.json({
    ledger: pagedLedger,
    total,
    page,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 1,
    openingBalance,
  })
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
    type: 'ASSETS',
    subType: 'USER_ACCOUNT',
    portal,
    linkedUserId: String(userId),
    linkedUsername: username,
    balance: 0,
    active: true,
  })

  res.status(201).json(account)
}

// Bulk import accounts from CSV
export async function importAccounts(req: Request, res: Response) {
  const { accounts } = req.body
  if (!Array.isArray(accounts) || accounts.length === 0) {
    return res.status(400).json({ error: 'accounts array is required and must not be empty' })
  }

  const created: any[] = []
  const skipped: any[] = []
  const errors: any[] = []

  for (let i = 0; i < accounts.length; i++) {
    const row = accounts[i]
    const code = (row.code || '').trim()
    const name = (row.name || '').trim()
    const type = (row.type || '').trim()
    const subType = (row.subType || '').trim()
    const module = (row.module || '').trim()
    const parentId = (row.parentId || '').trim()
    const isGroup = row.isGroup !== undefined ? String(row.isGroup).toLowerCase() === 'true' : false
    const currency = (row.currency || 'PKR').trim()
    const active = row.active !== undefined ? String(row.active).toLowerCase() === 'true' : true
    const tax = row.tax !== undefined ? Number(row.tax) : 0

    if (!name || !type) {
      errors.push({ row: i + 1, name, error: 'Name and Account Type are required' })
      continue
    }

    // Skip if name already exists
    const existingName = await ChartOfAccount.findOne({ name })
    if (existingName) {
      skipped.push({ row: i + 1, name, reason: 'Account with this name already exists' })
      continue
    }

    // Skip if code already exists
    if (code) {
      const existingCode = await ChartOfAccount.findOne({ code })
      if (existingCode) {
        skipped.push({ row: i + 1, code, reason: 'Account with this code already exists' })
        continue
      }
    }

    try {
      const account = await ChartOfAccount.create({
        code: code || undefined,
        name,
        type,
        subType: subType || undefined,
        module: module || undefined,
        parentId: parentId || undefined,
        isGroup,
        currency,
        active,
        tax,
        balance: 0,
      })
      created.push(account)
    } catch (e: any) {
      errors.push({ row: i + 1, name, error: e.message || 'Failed to create' })
    }
  }

  res.status(201).json({
    imported: created.length,
    skipped: skipped.length,
    errors: errors.length,
    created,
    skippedRows: skipped,
    errorRows: errors,
  })
}

// Seed default system accounts with client's chart of account codes + systemNames mapping
export async function seedDefaultAccounts(req: Request, res: Response) {
  const defaultAccounts = [
    // ── ASSETS: Cash & Bank (shared) ──
    { code: '2000-101', name: 'CASH IN HAND', type: 'ASSETS', subType: 'CASH & BANK', systemNames: ['CASH'] },
    { code: '2000-102', name: 'ALBARAKA BANK A/C # 2736750000134', type: 'ASSETS', subType: 'CASH & BANK', systemNames: ['BANK'] },
    { code: '2000-103', name: 'ALBARKA BANK A/C # 2736750000135', type: 'ASSETS', subType: 'CASH & BANK' },
    // ── ASSETS: Receivables (shared) ──
    { code: '2000-600', name: 'OTHER RECEIVABLE', type: 'ASSETS', subType: 'OTHER RECEIVABLE', systemNames: ['AR'] },
    // ── ASSETS: Module-specific inventory ──
    { code: '2000-700', name: 'PHARMACY INVENTORY', type: 'ASSETS', subType: 'INVENTORY', module: 'pharmacy', systemNames: ['PHARMACY_INVENTORY'] },
    { code: '2000-701', name: 'LAB CONSUMABLES', type: 'ASSETS', subType: 'INVENTORY', module: 'lab', systemNames: ['LAB_CONSUMABLES'] },
    // ── LIABILITIES: Payables (shared) ──
    { code: '3000-200', name: 'ACCOUNTS PAYABLE', type: 'LIABILITIES', subType: 'CREDITORS', systemNames: ['DOCTOR_PAYABLE', 'ACCOUNTS_PAYABLE'] },
    { code: '3000-206', name: 'SALARY PAYABLE', type: 'LIABILITIES', subType: 'PAYABLE', systemNames: ['SALARY_PAYABLE'] },
    // ── INCOME: Module-specific revenue ──
    { code: '4000-101', name: 'OPD REVENUE', type: 'INCOME', subType: 'SERVICE_REVENUE', module: 'opd', systemNames: ['OPD_REVENUE'] },
    { code: '4000-102', name: 'IPD REVENUE', type: 'INCOME', subType: 'SERVICE_REVENUE', module: 'ipd', systemNames: ['IPD_REVENUE'] },
    { code: '4000-103', name: 'LAB REVENUE', type: 'INCOME', subType: 'SERVICE_REVENUE', module: 'lab', systemNames: ['LAB_REVENUE'] },
    { code: '4000-105', name: 'DIAGNOSTIC REVENUE', type: 'INCOME', subType: 'SERVICE_REVENUE', module: 'diagnostic', systemNames: ['DIAGNOSTIC_REVENUE'] },
    { code: '4000-117', name: 'ER REVENUE', type: 'INCOME', subType: 'SERVICE_REVENUE', module: 'er', systemNames: ['ER_REVENUE'] },
    { code: '4000-124', name: 'AESTHETIC REVENUE', type: 'INCOME', subType: 'SERVICE_REVENUE', module: 'aesthetic', systemNames: ['AESTHETIC_REVENUE', 'PROCEDURE_REVENUE'] },
    { code: '4000-128', name: 'PHARMACY REVENUE', type: 'INCOME', subType: 'SERVICE_REVENUE', module: 'pharmacy', systemNames: ['PHARMACY_REVENUE'] },
    { code: '4000-129', name: 'DIALYSIS REVENUE', type: 'INCOME', subType: 'SERVICE_REVENUE', module: 'dialysis', systemNames: ['DIALYSIS_REVENUE'] },
    // ── EXPENSE: Module-specific COGS ──
    { code: '6000-148', name: 'PHARMACY COGS', type: 'EXPENSE', subType: 'COGS', module: 'pharmacy', systemNames: ['PHARMACY_COGS'] },
    { code: '6000-149', name: 'LAB COGS', type: 'EXPENSE', subType: 'COGS', module: 'lab', systemNames: ['LAB_COGS'] },
    // ── EXPENSE: Shared ──
    { code: '7000-100', name: 'DOCTORS SHARES', type: 'EXPENSE', subType: 'DOCTORS SHARES', systemNames: ['DOCTOR_SHARE_EXPENSE'] },
    { code: '6000-147', name: 'DISCOUNT ALLOWED', type: 'EXPENSE', subType: 'EXPENDITURES', systemNames: ['DISCOUNT'] },
  ]

  const created: any[] = []
  const updated: any[] = []
  for (const acc of defaultAccounts) {
    const existing = await ChartOfAccount.findOne({ code: acc.code })
    if (!existing) {
      const createdAcc = await ChartOfAccount.create(acc)
      created.push(createdAcc)
    } else {
      // Update systemNames, module, and name on existing accounts for migration
      let changed = false
      if (acc.systemNames && acc.systemNames.length > 0) {
        const merged = [...new Set([...(existing.systemNames || []), ...acc.systemNames])]
        if (merged.length !== (existing.systemNames || []).length) {
          existing.systemNames = merged
          changed = true
        }
      }
      if (acc.module && existing.module !== acc.module) {
        existing.module = acc.module
        changed = true
      }
      if (acc.name && existing.name !== acc.name) {
        existing.name = acc.name
        changed = true
      }
      if (acc.subType && existing.subType !== acc.subType) {
        existing.subType = acc.subType
        changed = true
      }
      if (changed) {
        await existing.save()
        updated.push(existing)
      }
    }
  }

  res.json({ seeded: created.length, updated: updated.length, accounts: [...created, ...updated] })
}
