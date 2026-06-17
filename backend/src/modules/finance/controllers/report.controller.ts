import { Request, Response } from 'express'
import { ChartOfAccount } from '../models/ChartOfAccount'
import { FinanceJournal } from '../models/FinanceJournal'

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// Build account lookup map: code → account, name → account, systemName → account
async function buildAccountMap(): Promise<Map<string, any>> {
  const accounts = await ChartOfAccount.find({ active: true }).lean()
  const map = new Map<string, any>()
  for (const acc of accounts) {
    if (acc.code) map.set(String(acc.code).trim().toUpperCase(), acc)
    if (acc.name) map.set(String(acc.name).trim().toUpperCase(), acc)
    for (const sys of (acc.systemNames || [])) {
      if (sys) map.set(String(sys).trim().toUpperCase(), acc)
    }
  }
  return map
}

// Aggregate all journal lines by account for a date range
async function aggregateJournalLines(from?: string, to?: string): Promise<Map<string, { debit: number; credit: number }>> {
  const matchStage: any = {}
  if (from || to) {
    matchStage.dateIso = {}
    if (from) matchStage.dateIso.$gte = from
    if (to) matchStage.dateIso.$lte = to
  }

  const rows = await FinanceJournal.aggregate([
    { $match: matchStage },
    { $unwind: '$lines' },
    { $group: {
      _id: '$lines.account',
      totalDebit: { $sum: { $ifNull: ['$lines.debit', 0] } },
      totalCredit: { $sum: { $ifNull: ['$lines.credit', 0] } },
    }},
  ])

  const result = new Map<string, { debit: number; credit: number }>()
  for (const r of rows) {
    result.set(String(r._id).trim(), { debit: round2(r.totalDebit), credit: round2(r.totalCredit) })
  }
  return result
}

// Resolve raw account keys to ChartOfAccount records, merging duplicates
function resolveToAccounts(
  rawMap: Map<string, { debit: number; credit: number }>,
  accountMap: Map<string, any>
): Map<string, { account: any; debit: number; credit: number }> {
  const merged = new Map<string, { account: any; debit: number; credit: number }>()

  for (const [rawKey, totals] of rawMap) {
    const acc = accountMap.get(String(rawKey).trim().toUpperCase())
    if (!acc) {
      // Account not found in chart — create a stub entry using the raw key
      const stubId = `__unknown_${rawKey}`
      if (!merged.has(stubId)) {
        merged.set(stubId, { account: { _id: stubId, code: 'N/A', name: rawKey, type: 'UNKNOWN', subType: 'UNKNOWN' }, debit: 0, credit: 0 })
      }
      const existing = merged.get(stubId)!
      existing.debit = round2(existing.debit + totals.debit)
      existing.credit = round2(existing.credit + totals.credit)
      continue
    }

    // Use the account's internal ID as the merge key
    const mergeKey = String(acc._id)
    if (!merged.has(mergeKey)) {
      merged.set(mergeKey, { account: acc, debit: 0, credit: 0 })
    }
    const existing = merged.get(mergeKey)!
    existing.debit = round2(existing.debit + totals.debit)
    existing.credit = round2(existing.credit + totals.credit)
  }

  return merged
}

// Trial Balance
export async function trialBalance(req: Request, res: Response) {
  const from = String((req.query as any).from || '')
  const to = String((req.query as any).to || '')

  const [accountMap, rawMap] = await Promise.all([
    buildAccountMap(),
    aggregateJournalLines(from || undefined, to || undefined),
  ])

  const resolved = resolveToAccounts(rawMap, accountMap)

  // Build trial balance rows
  const rows: any[] = []
  let totalDebit = 0
  let totalCredit = 0

  for (const [, data] of resolved) {
    const { account, debit, credit } = data
    
    // Determine debit/credit balance based on account type
    const isDebitBalance = ['ASSETS', 'EXPENSE'].includes(String(account.type).toUpperCase())
    
    // Correct balance calculation: 
    // Assets/Expenses: Debit - Credit
    // Liabilities/Income/Equity: Credit - Debit
    const netBalance = isDebitBalance ? round2(debit - credit) : round2(credit - debit)

    if (debit !== 0 || credit !== 0) {
      rows.push({
        code: account.code || '',
        name: account.name || '',
        type: account.type || '',
        subType: account.subType || '',
        module: account.module || null,
        debit: round2(debit),
        credit: round2(credit),
        balance: netBalance,
        debitBalance: isDebitBalance ? Math.max(netBalance, 0) : 0,
        creditBalance: isDebitBalance ? 0 : Math.max(netBalance, 0),
      })
      totalDebit = round2(totalDebit + debit)
      totalCredit = round2(totalCredit + credit)
    }
  }

  // Sort by code
  rows.sort((a, b) => String(a.code).localeCompare(String(b.code)))

  res.json({
    rows,
    totalDebit,
    totalCredit,
    balanced: round2(totalDebit - totalCredit) === 0,
    from: from || 'All',
    to: to || 'All',
  })
}

// Profit & Loss
export async function profitLoss(req: Request, res: Response) {
  const from = String((req.query as any).from || '')
  const to = String((req.query as any).to || '')

  const [accountMap, rawMap] = await Promise.all([
    buildAccountMap(),
    aggregateJournalLines(from || undefined, to || undefined),
  ])

  const resolved = resolveToAccounts(rawMap, accountMap)

  const incomeRows: any[] = []
  const expenseRows: any[] = []
  let totalIncome = 0
  let totalExpense = 0

  for (const [, data] of resolved) {
    const { account, debit, credit } = data
    const typeUpper = String(account.type).toUpperCase()

    if (typeUpper === 'INCOME') {
      const balance = round2(credit - debit)  // Income: credit balance
      if (debit !== 0 || credit !== 0) {
        incomeRows.push({
          code: account.code || '',
          name: account.name || '',
          subType: account.subType || '',
          module: account.module || null,
          debit,
          credit,
          balance,
        })
        totalIncome = round2(totalIncome + balance)
      }
    } else if (typeUpper === 'EXPENSE') {
      const balance = round2(debit - credit)  // Expense: debit balance
      if (debit !== 0 || credit !== 0) {
        expenseRows.push({
          code: account.code || '',
          name: account.name || '',
          subType: account.subType || '',
          module: account.module || null,
          debit,
          credit,
          balance,
        })
        totalExpense = round2(totalExpense + balance)
      }
    }
  }

  incomeRows.sort((a, b) => String(a.code).localeCompare(String(b.code)))
  expenseRows.sort((a, b) => String(a.code).localeCompare(String(b.code)))

  const netProfit = round2(totalIncome - totalExpense)

  // Module-wise revenue breakdown
  const moduleRevenue: Record<string, number> = {}
  for (const row of incomeRows) {
    const mod = row.module || 'general'
    moduleRevenue[mod] = round2((moduleRevenue[mod] || 0) + row.balance)
  }

  res.json({
    income: incomeRows,
    expenses: expenseRows,
    totalIncome,
    totalExpense,
    netProfit,
    moduleRevenue,
    from: from || 'All',
    to: to || 'All',
  })
}

// Balance Sheet
export async function balanceSheet(req: Request, res: Response) {
  const asOf = String((req.query as any).asOf || '')

  const [accountMap, rawMap] = await Promise.all([
    buildAccountMap(),
    aggregateJournalLines(undefined, asOf || undefined),  // From inception to asOf date
  ])

  const resolved = resolveToAccounts(rawMap, accountMap)

  const assetRows: any[] = []
  const liabilityRows: any[] = []
  const equityRows: any[] = []
  let totalAssets = 0
  let totalLiabilities = 0
  let totalEquity = 0

  // Calculate retained earnings from P&L (Income - Expense up to asOf)
  let retainedEarnings = 0
  for (const [, data] of resolved) {
    const { account, debit, credit } = data
    const typeUpper = String(account.type).toUpperCase()

    if (typeUpper === 'INCOME') {
      retainedEarnings = round2(retainedEarnings + (credit - debit))
    } else if (typeUpper === 'EXPENSE') {
      retainedEarnings = round2(retainedEarnings - (debit - credit))
    }
  }

  for (const [, data] of resolved) {
    const { account, debit, credit } = data
    const typeUpper = String(account.type).toUpperCase()
    const balance = round2(debit - credit)

    if (typeUpper === 'ASSETS') {
      const assetBalance = round2(debit - credit)  // Assets: debit balance
      if (debit !== 0 || credit !== 0) {
        assetRows.push({
          code: account.code || '',
          name: account.name || '',
          subType: account.subType || '',
          module: account.module || null,
          balance: assetBalance,
        })
        totalAssets = round2(totalAssets + assetBalance)
      }
    } else if (typeUpper === 'LIABILITIES') {
      const liabBalance = round2(credit - debit)  // Liabilities: credit balance
      if (debit !== 0 || credit !== 0) {
        liabilityRows.push({
          code: account.code || '',
          name: account.name || '',
          subType: account.subType || '',
          module: account.module || null,
          balance: liabBalance,
        })
        totalLiabilities = round2(totalLiabilities + liabBalance)
      }
    } else if (typeUpper === 'EQUITY') {
      const eqBalance = round2(credit - debit)  // Equity: credit balance
      if (debit !== 0 || credit !== 0) {
        equityRows.push({
          code: account.code || '',
          name: account.name || '',
          subType: account.subType || '',
          module: account.module || null,
          balance: eqBalance,
        })
        totalEquity = round2(totalEquity + eqBalance)
      }
    }
  }

  // Add retained earnings as a computed equity line
  equityRows.push({
    code: 'RETAINED',
    name: 'Retained Earnings (P&L)',
    subType: 'RETAINED_EARNINGS',
    balance: retainedEarnings,
  })
  totalEquity = round2(totalEquity + retainedEarnings)

  assetRows.sort((a, b) => String(a.code).localeCompare(String(b.code)))
  liabilityRows.sort((a, b) => String(a.code).localeCompare(String(b.code)))
  equityRows.sort((a, b) => String(a.code).localeCompare(String(b.code)))

  const totalLiabilitiesAndEquity = round2(totalLiabilities + totalEquity)

  res.json({
    assets: assetRows,
    liabilities: liabilityRows,
    equity: equityRows,
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalLiabilitiesAndEquity,
    retainedEarnings,
    balanced: round2(totalAssets - totalLiabilitiesAndEquity) === 0,
    asOf: asOf || 'All',
  })
}

// Cash Flow
export async function cashFlow(req: Request, res: Response) {
  const from = String((req.query as any).from || '')
  const to = String((req.query as any).to || '')

  const accountMap = await buildAccountMap()

  // Get cash/bank account codes
  const cashBankCodes: string[] = []
  const cashBankSystemNames: string[] = []
  for (const [, acc] of accountMap) {
    const subTypeUpper = String(acc.subType || '').toUpperCase()
    if (subTypeUpper === 'CASH & BANK' || subTypeUpper === 'CASH' || subTypeUpper === 'BANK') {
      if (acc.code) cashBankCodes.push(String(acc.code).toUpperCase())
      for (const sys of (acc.systemNames || [])) {
        if (sys) cashBankSystemNames.push(String(sys).toUpperCase())
      }
    }
  }

  // Aggregate all journal lines
  const rawMap = await aggregateJournalLines(from || undefined, to || undefined)

  // Calculate cash/bank movements
  let cashInflow = 0
  let cashOutflow = 0
  const cashBankRows: any[] = []

  for (const [rawKey, totals] of rawMap) {
    const acc = accountMap.get(String(rawKey).trim().toUpperCase())
    const isCashBank = cashBankCodes.includes(String(acc?.code).toUpperCase()) || 
                       cashBankSystemNames.includes(String(rawKey).trim().toUpperCase()) ||
                       cashBankCodes.includes(String(rawKey).trim().toUpperCase())

    if (isCashBank) {
      const netChange = round2(totals.debit - totals.credit)
      cashBankRows.push({
        code: acc?.code || rawKey,
        name: acc?.name || rawKey,
        debit: totals.debit,
        credit: totals.credit,
        netChange,
      })
      cashInflow = round2(cashInflow + totals.debit)
      cashOutflow = round2(cashOutflow + totals.credit)
    }
  }

  // Categorize by operating/investing/financing using refType
  const matchStage: any = {}
  if (from || to) {
    matchStage.dateIso = {}
    if (from) matchStage.dateIso.$gte = from
    if (to) matchStage.dateIso.$lte = to
  }

  const refTypeBreakdown = await FinanceJournal.aggregate([
    { $match: matchStage },
    { $unwind: '$lines' },
    { $group: {
      _id: { account: '$lines.account', refType: '$refType' },
      totalDebit: { $sum: { $ifNull: ['$lines.debit', 0] } },
      totalCredit: { $sum: { $ifNull: ['$lines.credit', 0] } },
    }},
  ])

  // Categorize into operating/investing/financing
  const operating: any[] = []
  const investing: any[] = []
  const financing: any[] = []
  let operatingNet = 0
  let investingNet = 0
  let financingNet = 0

  for (const r of refTypeBreakdown) {
    const refType = String(r._id.refType || '')
    const account = String(r._id.account || '')
    const acc = accountMap.get(account)
    const isCashBank = cashBankCodes.includes(account) || cashBankSystemNames.includes(account) ||
      (acc && cashBankCodes.includes(acc.code))

    if (!isCashBank) continue

    const net = round2(r.totalDebit - r.totalCredit)
    const entry = {
      refType,
      account: acc?.name || account,
      debit: round2(r.totalDebit),
      credit: round2(r.totalCredit),
      net,
    }

    // Default: everything is operating for a hospital
    if (refType.includes('invest') || refType.includes('asset_purchase')) {
      investing.push(entry)
      investingNet = round2(investingNet + net)
    } else if (refType.includes('financ') || refType.includes('loan') || refType.includes('equity')) {
      financing.push(entry)
      financingNet = round2(financingNet + net)
    } else {
      operating.push(entry)
      operatingNet = round2(operatingNet + net)
    }
  }

  // Calculate opening/closing balances
  // Opening = balance before 'from' date
  // Closing = balance up to 'to' date
  let openingBalance = 0
  if (from) {
    const beforeMap = await aggregateJournalLines(undefined, from)
    for (const [rawKey, totals] of beforeMap) {
      const acc = accountMap.get(rawKey)
      const isCashBank = cashBankCodes.includes(rawKey) || cashBankSystemNames.includes(rawKey) ||
        (acc && cashBankCodes.includes(acc.code))
      if (isCashBank) {
        openingBalance = round2(openingBalance + totals.debit - totals.credit)
      }
    }
  }

  const netChange = round2(cashInflow - cashOutflow)
  const closingBalance = round2(openingBalance + netChange)

  res.json({
    operating,
    investing,
    financing,
    operatingNet,
    investingNet,
    financingNet,
    netChange,
    openingBalance,
    closingBalance,
    cashBankRows,
    from: from || 'All',
    to: to || 'All',
  })
}
