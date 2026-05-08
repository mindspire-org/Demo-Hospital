/**
 * Finance reports controller — all derivations of the unified
 * Hospital_Finance_Journal. Because every module posts balanced double-entry
 * journals, Trial Balance / P&L / Balance Sheet / Dashboard / Module revenue
 * / AR / AP can all be expressed as pure aggregations over this one
 * collection. No separate report tables.
 */

import { Request, Response } from 'express'
import { FinanceJournal } from '../models/FinanceJournal'
import { FinanceAuditLog } from '../models/FinanceAuditLog'

function actorOf(req: Request) { return (req as any).user?.name || (req as any).user?.username || (req as any).user?.email || 'system' }
async function audit(req: Request, action: string, label: string, detail?: string) {
  try { await FinanceAuditLog.create({ actor: actorOf(req), action, label, method: req.method, path: req.originalUrl, at: new Date().toISOString(), detail }) } catch {}
}
import { ChartOfAccount } from '../models/ChartOfAccount'

function round2(n: number){ return Math.round((Number(n) + Number.EPSILON) * 100) / 100 }

function dateRange(req: Request): { from?: string; to?: string } {
  const from = String((req.query as any).from || '').slice(0, 10)
  const to   = String((req.query as any).to   || '').slice(0, 10)
  const out: { from?: string; to?: string } = {}
  if (from) out.from = from
  if (to) out.to = to
  return out
}

/** Core aggregate: returns a map of { accountName: { debits, credits } } over
 *  active (non-reversed) journals, optionally filtered by date range. */
async function accountTotals(filter: { from?: string; to?: string; asOf?: string } = {}){
  const match: any = { status: { $ne: 'reversed' } }
  if (filter.from) match.dateIso = { ...(match.dateIso || {}), $gte: filter.from }
  if (filter.to)   match.dateIso = { ...(match.dateIso || {}), $lte: filter.to }
  if (filter.asOf) match.dateIso = { ...(match.dateIso || {}), $lte: filter.asOf }

  const rows: any[] = await FinanceJournal.aggregate([
    { $match: match },
    { $unwind: '$lines' },
    { $group: {
      _id: '$lines.account',
      debits: { $sum: { $ifNull: ['$lines.debit', 0] } },
      credits: { $sum: { $ifNull: ['$lines.credit', 0] } },
    }},
  ])
  const map: Record<string, { debits: number; credits: number }> = {}
  for (const r of rows){
    map[r._id] = { debits: round2(r.debits || 0), credits: round2(r.credits || 0) }
  }
  return map
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/** GET /finance/dashboard?from&to — KPIs + module revenue + AR/AP + recent expenses. */
export async function dashboard(req: Request, res: Response){
  const range = dateRange(req)
  const totals = await accountTotals(range)

  // Fetch COA once to classify
  const accounts = await ChartOfAccount.find({}).lean()
  const byName = Object.fromEntries(accounts.map(a => [a.name, a])) as Record<string, any>

  let totalRevenue = 0, totalExpenses = 0, totalCash = 0, totalBank = 0, totalAR = 0, totalAP = 0
  const moduleRevenue: Record<string, number> = {}

  for (const [name, t] of Object.entries(totals)){
    const acc = byName[name]
    const net = (t.credits - t.debits) // credit-normal for income/liab/equity
    if (acc?.type === 'Income'){
      totalRevenue += t.credits - t.debits
      moduleRevenue[name] = round2(t.credits - t.debits)
    } else if (acc?.type === 'Expense'){
      totalExpenses += t.debits - t.credits
    } else if (name === 'CASH')   totalCash = t.debits - t.credits
      else if (name === 'BANK')   totalBank = t.debits - t.credits
      else if (name === 'AR' || name === 'AR_CORPORATE') totalAR += (t.debits - t.credits)
      else if (name === 'VENDOR_PAYABLE' || name === 'DOCTOR_PAYABLE' || name === 'STAFF_PAYABLE') totalAP += (t.credits - t.debits)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void net
  }

  const netProfit = round2(totalRevenue - totalExpenses)

  // Today cash collections (regardless of range filter)
  const todayIso = new Date().toISOString().slice(0, 10)
  const todayCashAgg = await FinanceJournal.aggregate([
    { $match: { status: { $ne: 'reversed' }, dateIso: todayIso } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': { $in: ['CASH', 'BANK'] } } },
    { $group: { _id: null, received: { $sum: { $ifNull: ['$lines.debit', 0] } }, paid: { $sum: { $ifNull: ['$lines.credit', 0] } } } },
  ])
  const dailyCollections = round2((todayCashAgg?.[0]?.received || 0) - (todayCashAgg?.[0]?.paid || 0))

  // Recent expense journals (last 5)
  const recentExpensesRaw = await FinanceJournal.find({ refType: 'expense', status: { $ne: 'reversed' } })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean()
  const recentExpenses = recentExpensesRaw.map((j: any) => {
    const line = (j.lines || []).find((l: any) => l?.tags?.category) || (j.lines || [])[0]
    const expLine = (j.lines || []).find((l: any) => Number(l?.debit || 0) > 0)
    return {
      id: String(j._id),
      dateIso: j.dateIso,
      memo: j.memo,
      category: line?.tags?.category || 'Expense',
      amount: round2(Number(expLine?.debit || 0)),
    }
  })

  // ------------------------------------------------------------------
  // Daily trend (revenue / expenses / net profit) for in-range dates
  // ------------------------------------------------------------------
  // Build a per-day aggregation by joining journal lines with COA types.
  const incomeAccounts  = accounts.filter(a => a?.type === 'Income').map(a => a.name)
  const expenseAccounts = accounts.filter(a => a?.type === 'Expense').map(a => a.name)

  const trendMatch: any = { status: { $ne: 'reversed' } }
  if (range.from) trendMatch.dateIso = { ...(trendMatch.dateIso || {}), $gte: range.from }
  if (range.to)   trendMatch.dateIso = { ...(trendMatch.dateIso || {}), $lte: range.to }

  const trendRows: any[] = await FinanceJournal.aggregate([
    { $match: trendMatch },
    { $unwind: '$lines' },
    { $match: { $or: [
      { 'lines.account': { $in: incomeAccounts } },
      { 'lines.account': { $in: expenseAccounts } },
    ] } },
    { $group: {
      _id: { date: '$dateIso', account: '$lines.account' },
      debits:  { $sum: { $ifNull: ['$lines.debit', 0] } },
      credits: { $sum: { $ifNull: ['$lines.credit', 0] } },
    }},
  ])

  const trendMap = new Map<string, { revenue: number; expenses: number }>()
  const incomeSet  = new Set(incomeAccounts)
  const expenseSet = new Set(expenseAccounts)
  for (const r of trendRows){
    const d = r._id.date as string
    if (!trendMap.has(d)) trendMap.set(d, { revenue: 0, expenses: 0 })
    const bucket = trendMap.get(d)!
    if (incomeSet.has(r._id.account))  bucket.revenue  += (r.credits - r.debits)
    if (expenseSet.has(r._id.account)) bucket.expenses += (r.debits  - r.credits)
  }

  // Ensure every day in range is represented (zero-fill gaps)
  const dailyTrend: Array<{ date: string; revenue: number; expenses: number; netProfit: number }> = []
  if (range.from && range.to){
    const start = new Date(range.from + 'T00:00:00')
    const end   = new Date(range.to   + 'T00:00:00')
    for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400000)){
      const key = d.toISOString().slice(0, 10)
      const v = trendMap.get(key) || { revenue: 0, expenses: 0 }
      dailyTrend.push({ date: key, revenue: round2(v.revenue), expenses: round2(v.expenses), netProfit: round2(v.revenue - v.expenses) })
    }
  } else {
    // Without a range, return the bucketed days sorted
    Array.from(trendMap.entries()).sort((a, b) => a[0] < b[0] ? -1 : 1).forEach(([date, v]) => {
      dailyTrend.push({ date, revenue: round2(v.revenue), expenses: round2(v.expenses), netProfit: round2(v.revenue - v.expenses) })
    })
  }

  res.json({
    kpi: {
      totalRevenue: round2(totalRevenue),
      totalExpenses: round2(totalExpenses),
      netProfit,
      dailyCollections,
    },
    moduleRevenue,
    receivables: {
      total: round2(totalAR),
      patient: round2(totals['AR']?.debits - totals['AR']?.credits || 0),
      corporate: round2(totals['AR_CORPORATE']?.debits - totals['AR_CORPORATE']?.credits || 0),
    },
    payables: {
      total: round2(totalAP),
      vendors: round2(totals['VENDOR_PAYABLE']?.credits - totals['VENDOR_PAYABLE']?.debits || 0),
      doctors: round2(totals['DOCTOR_PAYABLE']?.credits - totals['DOCTOR_PAYABLE']?.debits || 0),
      staff:   round2(totals['STAFF_PAYABLE']?.credits  - totals['STAFF_PAYABLE']?.debits  || 0),
    },
    cash: { cash: round2(totalCash), bank: round2(totalBank) },
    dailyTrend,
    recentExpenses,
  })
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

/** GET /finance/reports/trial-balance?from&to — all accounts with D/C totals. */
export async function trialBalance(req: Request, res: Response){
  const range = dateRange(req)
  const totals = await accountTotals(range)
  const accounts = await ChartOfAccount.find({}).sort({ code: 1, name: 1 }).lean()

  const rows = accounts.map((a: any) => {
    const t = totals[a.name] || { debits: 0, credits: 0 }
    const balance = t.debits - t.credits
    return {
      code: a.code,
      name: a.name,
      type: a.type,
      subType: a.subType,
      debits: t.debits,
      credits: t.credits,
      balance: round2(balance),
    }
  })

  const sumDebit  = round2(rows.reduce((s, r) => s + r.debits, 0))
  const sumCredit = round2(rows.reduce((s, r) => s + r.credits, 0))
  res.json({ rows, totals: { debits: sumDebit, credits: sumCredit, diff: round2(sumDebit - sumCredit) } })
}

/** GET /finance/reports/profit-loss?from&to */
export async function profitLoss(req: Request, res: Response){
  const range = dateRange(req)
  const totals = await accountTotals(range)
  const accounts = await ChartOfAccount.find({ type: { $in: ['Income', 'Expense'] } }).sort({ code: 1 }).lean()

  const income: any[] = []
  const expense: any[] = []
  for (const a of accounts as any[]){
    const t = totals[a.name] || { debits: 0, credits: 0 }
    const amount = a.type === 'Income' ? round2(t.credits - t.debits) : round2(t.debits - t.credits)
    if (amount === 0) continue
    const row = { code: a.code, name: a.name, amount }
    if (a.type === 'Income') income.push(row); else expense.push(row)
  }
  const totalIncome  = round2(income.reduce((s, r) => s + r.amount, 0))
  const totalExpense = round2(expense.reduce((s, r) => s + r.amount, 0))
  res.json({
    income, expense,
    totals: { income: totalIncome, expense: totalExpense, net: round2(totalIncome - totalExpense) },
    range,
  })
}

/** GET /finance/reports/balance-sheet?asOf */
export async function balanceSheet(req: Request, res: Response){
  const asOf = String((req.query as any).asOf || '').slice(0, 10) || undefined
  const totals = await accountTotals({ asOf })
  const accounts = await ChartOfAccount.find({}).sort({ code: 1 }).lean()

  const assets: any[] = [], liabilities: any[] = [], equity: any[] = []
  let revenueNet = 0, expenseNet = 0
  for (const a of accounts as any[]){
    const t = totals[a.name] || { debits: 0, credits: 0 }
    const row = { code: a.code, name: a.name, amount: 0 }
    if (a.type === 'Asset'){ row.amount = round2(t.debits - t.credits); if (row.amount !== 0) assets.push(row) }
    else if (a.type === 'Liability'){ row.amount = round2(t.credits - t.debits); if (row.amount !== 0) liabilities.push(row) }
    else if (a.type === 'Equity'){ row.amount = round2(t.credits - t.debits); if (row.amount !== 0) equity.push(row) }
    else if (a.type === 'Income') revenueNet += (t.credits - t.debits)
    else if (a.type === 'Expense') expenseNet += (t.debits - t.credits)
  }
  const ytdNet = round2(revenueNet - expenseNet)
  if (ytdNet !== 0) equity.push({ code: 'COMPUTED', name: 'Net Income (period)', amount: ytdNet })

  const totalAssets      = round2(assets.reduce((s, r) => s + r.amount, 0))
  const totalLiabilities = round2(liabilities.reduce((s, r) => s + r.amount, 0))
  const totalEquity      = round2(equity.reduce((s, r) => s + r.amount, 0))

  res.json({
    assets, liabilities, equity,
    totals: {
      assets: totalAssets,
      liabilities: totalLiabilities,
      equity: totalEquity,
      diff: round2(totalAssets - (totalLiabilities + totalEquity)),
    },
    asOf: asOf || 'current',
  })
}

// ---------------------------------------------------------------------------
// Journal Vouchers
// ---------------------------------------------------------------------------

/** GET /finance/journal-vouchers — list journals with optional filters. */
export async function listJournalVouchers(req: Request, res: Response){
  const { from, to } = dateRange(req)
  const refType = String((req.query as any).refType || '')
  const account = String((req.query as any).account || '')
  const status  = String((req.query as any).status  || '')
  const page  = Math.max(1, parseInt(String((req.query as any).page || '1')) || 1)
  const limit = Math.min(200, Math.max(1, parseInt(String((req.query as any).limit || '50')) || 50))

  const match: any = {}
  if (from) match.dateIso = { ...(match.dateIso || {}), $gte: from }
  if (to)   match.dateIso = { ...(match.dateIso || {}), $lte: to }
  if (refType) match.refType = refType
  if (status)  match.status  = status
  if (account) match['lines.account'] = account

  const total = await FinanceJournal.countDocuments(match)
  const rows = await FinanceJournal.find(match)
    .sort({ dateIso: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()
  res.json({ rows, total, page, totalPages: Math.ceil(total / limit) })
}

/** POST /finance/journal-vouchers — create a balanced manual JV. */
export async function createJournalVoucher(req: Request, res: Response){
  const { dateIso, memo, lines } = req.body || {}
  if (!Array.isArray(lines) || lines.length < 2){
    return res.status(400).json({ error: 'At least two lines are required' })
  }
  const d = Number(lines.reduce((s: number, l: any) => s + (Number(l.debit) || 0), 0))
  const c = Number(lines.reduce((s: number, l: any) => s + (Number(l.credit) || 0), 0))
  if (Math.abs(round2(d) - round2(c)) > 0.01){
    return res.status(400).json({ error: `Journal must balance (debits=${round2(d)}, credits=${round2(c)})` })
  }
  const createdByUsername = String((req as any).user?.username || (req.body as any)?.createdByUsername || '')
  const tagged = lines.map((l: any) => ({
    account: String(l.account || ''),
    debit: Number(l.debit) || 0,
    credit: Number(l.credit) || 0,
    tags: { ...(l.tags || {}), createdByUsername: createdByUsername || undefined },
  }))
  const j = await FinanceJournal.create({
    dateIso: dateIso || new Date().toISOString().slice(0, 10),
    refType: 'manual_journal',
    memo: memo || 'Manual Journal Voucher',
    lines: tagged,
    status: 'active',
  })
  await audit(req, 'Create Journal Voucher', 'JOURNAL_VOUCHER', `lines=${lines.length} memo=${memo||''}`)
  res.status(201).json(j)
}

// ---------------------------------------------------------------------------
// Ledger explorer
// ---------------------------------------------------------------------------

/** GET /finance/ledger-explorer?account&from&to — generic ledger for any account by NAME. */
export async function ledgerExplorer(req: Request, res: Response){
  const account = String((req.query as any).account || '')
  if (!account) return res.status(400).json({ error: 'account is required' })
  const { from, to } = dateRange(req)

  const match: any = { status: { $ne: 'reversed' } }
  if (from) match.dateIso = { ...(match.dateIso || {}), $gte: from }
  if (to)   match.dateIso = { ...(match.dateIso || {}), $lte: to }

  const rows = await FinanceJournal.aggregate([
    { $match: match },
    { $unwind: '$lines' },
    { $match: { 'lines.account': account } },
    { $sort: { dateIso: 1, createdAt: 1 } },
    { $project: {
      _id: 1, dateIso: 1, refType: 1, refId: 1, memo: 1,
      debit: '$lines.debit', credit: '$lines.credit', tags: '$lines.tags',
    } },
  ])

  let running = 0
  const ledger = rows.map((r: any) => {
    running += (Number(r.debit || 0) - Number(r.credit || 0))
    return { ...r, balance: round2(running) }
  })
  res.json({ account, ledger, closing: round2(running) })
}

// ---------------------------------------------------------------------------
// Receivables & Payables
// ---------------------------------------------------------------------------

function bucket(days: number){
  if (days <= 30) return '0-30'
  if (days <= 60) return '31-60'
  if (days <= 90) return '61-90'
  return '90+'
}

/** GET /finance/receivables/aging — AR journals grouped by age buckets. */
export async function receivablesAging(_req: Request, res: Response){
  const rows = await FinanceJournal.aggregate([
    { $match: { status: { $ne: 'reversed' } } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': { $in: ['AR', 'AR_CORPORATE'] } } },
    { $group: {
      _id: { refType: '$refType', refId: '$refId', account: '$lines.account' },
      dateIso: { $first: '$dateIso' },
      debit: { $sum: { $ifNull: ['$lines.debit', 0] } },
      credit: { $sum: { $ifNull: ['$lines.credit', 0] } },
      tags: { $first: '$lines.tags' },
    } },
    { $addFields: { balance: { $subtract: ['$debit', '$credit'] } } },
    { $match: { balance: { $gt: 0 } } },
  ])
  const today = new Date()
  const buckets: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
  const items = rows.map((r: any) => {
    const d = new Date(r.dateIso)
    const days = Math.max(0, Math.floor((today.getTime() - d.getTime()) / 86400000))
    const b = bucket(days)
    buckets[b] += Number(r.balance || 0)
    return {
      refType: r._id.refType,
      refId: r._id.refId,
      account: r._id.account,
      dateIso: r.dateIso,
      balance: round2(r.balance),
      days,
      bucket: b,
      patientName: r.tags?.patientName,
      mrn: r.tags?.mrn,
      companyId: r.tags?.companyId,
    }
  })
  const total = round2(items.reduce((s, r) => s + r.balance, 0))
  res.json({ items, buckets: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, round2(v)])), total })
}

/** GET /finance/payables/aging — vendor/staff/doctor payables grouped by age. */
export async function payablesAging(_req: Request, res: Response){
  const rows = await FinanceJournal.aggregate([
    { $match: { status: { $ne: 'reversed' } } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': { $in: ['VENDOR_PAYABLE', 'STAFF_PAYABLE', 'DOCTOR_PAYABLE'] } } },
    { $group: {
      _id: { refType: '$refType', refId: '$refId', account: '$lines.account' },
      dateIso: { $first: '$dateIso' },
      debit: { $sum: { $ifNull: ['$lines.debit', 0] } },
      credit: { $sum: { $ifNull: ['$lines.credit', 0] } },
      tags: { $first: '$lines.tags' },
    } },
    { $addFields: { balance: { $subtract: ['$credit', '$debit'] } } },
    { $match: { balance: { $gt: 0 } } },
  ])
  const today = new Date()
  const buckets: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
  const items = rows.map((r: any) => {
    const d = new Date(r.dateIso)
    const days = Math.max(0, Math.floor((today.getTime() - d.getTime()) / 86400000))
    const b = bucket(days)
    buckets[b] += Number(r.balance || 0)
    return {
      refType: r._id.refType,
      refId: r._id.refId,
      account: r._id.account,
      dateIso: r.dateIso,
      balance: round2(r.balance),
      days,
      bucket: b,
      vendorId: r.tags?.vendorId,
      vendorName: r.tags?.vendorName,
      doctorId: r.tags?.doctorId,
      staffId: r.tags?.staffId,
    }
  })
  const total = round2(items.reduce((s, r) => s + r.balance, 0))
  res.json({ items, buckets: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, round2(v)])), total })
}

// ---------------------------------------------------------------------------
// Module drill-down
// ---------------------------------------------------------------------------

const MODULE_REVENUE_ACCOUNT: Record<string, string[]> = {
  opd:       ['OPD_REVENUE'],
  hospital:  ['OPD_REVENUE', 'IPD_REVENUE', 'ER_REVENUE', 'PROCEDURE_REVENUE'], // Hospital aggregate
  ipd:       ['IPD_REVENUE'],
  er:        ['ER_REVENUE'],
  lab:       ['LAB_REVENUE'],
  pharmacy:  ['PHARMACY_REVENUE'],
  'indoor-pharmacy': ['INDOOR_PHARMACY_REVENUE'],
  indoorpharmacy: ['INDOOR_PHARMACY_REVENUE'],
  diagnostic:['DIAGNOSTIC_REVENUE', 'RADIOLOGY_REVENUE'],
  aesthetic: ['OPD_REVENUE', 'PROCEDURE_REVENUE'], // Aesthetic uses OPD_REVENUE and PROCEDURE_REVENUE in separate journal
  dialysis:  ['DIALYSIS_REVENUE'],
  corporate: ['AR_CORPORATE'], // Corporate AR tracking
  inventory: ['INVENTORY_STORE', 'VENDOR_PAYABLE'], // Inventory/Store purchases
}

// Modules that use separate journal collections
const SEPARATE_JOURNAL_MODULES = ['aesthetic', 'corporate']

/** GET /finance/module-integrations/:module - revenue trend + recent txns. */
export async function moduleIntegration(req: Request, res: Response){
  const mod = String(req.params.module || '').toLowerCase()
  const accounts = MODULE_REVENUE_ACCOUNT[mod]
  if (!accounts) return res.status(400).json({ error: `Unknown module: ${mod}` })

  const { from, to } = dateRange(req)
  const match: any = { status: { $ne: 'reversed' } }
  if (from) match.dateIso = { ...(match.dateIso || {}), $gte: from }
  if (to)   match.dateIso = { ...(match.dateIso || {}), $lte: to }

  // Handle aesthetic module with separate journal
  if (mod === 'aesthetic') {
    try {
      const { AestheticFinanceJournal } = await import('../../aesthetic/models/FinanceJournal')
      
      // Daily trend
      const trend = await AestheticFinanceJournal.aggregate([
        { $match: match },
        { $unwind: '$lines' },
        { $match: { 'lines.account': { $in: accounts } } },
        { $group: { _id: '$dateIso', revenue: { $sum: { $subtract: [{ $ifNull: ['$lines.credit', 0] }, { $ifNull: ['$lines.debit', 0] }] } } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, dateIso: '$_id', revenue: { $round: ['$revenue', 2] } } },
      ])

      // Recent transactions
      const recent = await AestheticFinanceJournal.find({ ...match, 'lines.account': { $in: accounts } })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()

      // Totals
      const totals = await AestheticFinanceJournal.aggregate([
        { $match: match },
        { $unwind: '$lines' },
        { $match: { 'lines.account': { $in: accounts } } },
        { $group: { _id: null, credits: { $sum: { $ifNull: ['$lines.credit', 0] } }, debits: { $sum: { $ifNull: ['$lines.debit', 0] } } } },
      ])
      const total = round2(Number((totals?.[0] as any)?.credits || 0) - Number((totals?.[0] as any)?.debits || 0))

      return res.json({ module: mod, accounts, total, trend, recent })
    } catch (e) {
      console.error('Failed to query AestheticFinanceJournal:', e)
      return res.json({ module: mod, accounts, total: 0, trend: [], recent: [] })
    }
  }

  // Handle corporate module with CorporateTransaction model
  if (mod === 'corporate') {
    try {
      const { CorporateTransaction } = await import('../../corporate/models/Transaction')
      
      const corpMatch: any = { status: { $nin: ['reversed', 'rejected'] } }
      if (from) corpMatch.dateIso = { ...(corpMatch.dateIso || {}), $gte: from }
      if (to)   corpMatch.dateIso = { ...(corpMatch.dateIso || {}), $lte: to }

      // Daily trend - sum of netToCorporate per day
      const trend = await CorporateTransaction.aggregate([
        { $match: corpMatch },
        { $group: { _id: '$dateIso', revenue: { $sum: { $ifNull: ['$netToCorporate', 0] } } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, dateIso: '$_id', revenue: { $round: ['$revenue', 2] } } },
      ])

      // Recent transactions
      const recent = await CorporateTransaction.find(corpMatch)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()

      // Total
      const totals = await CorporateTransaction.aggregate([
        { $match: corpMatch },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$netToCorporate', 0] } }, paid: { $sum: { $ifNull: ['$paidAmount', 0] } } } },
      ])
      const total = round2(Number((totals?.[0] as any)?.total || 0))

      return res.json({ module: mod, accounts: ['CORPORATE_REVENUE'], total, trend, recent })
    } catch (e) {
      console.error('Failed to query CorporateTransaction:', e)
      return res.json({ module: mod, accounts: ['CORPORATE_REVENUE'], total: 0, trend: [], recent: [] })
    }
  }

  // --- Lab module: query LabOrder + LabToken directly (matches lab reports.summary) ---
  if (mod === 'lab') {
    try {
      const { LabOrder } = await import('../../lab/models/Order')
      const { LabToken } = await import('../../lab/models/Token')

      const dateMatch: any = {}
      if (from) dateMatch.$gte = new Date(from)
      if (to)   dateMatch.$lte = new Date(to + 'T23:59:59.999Z')

      // Match non-corporate OR corporate with co-pay (net > 0)
      const orderOrToken = {
        $or: [
          { corporateId: { $exists: false } },
          { corporateId: { $exists: true }, net: { $gt: 0 } },
        ],
      }
      const orderMatch: any = { ...orderOrToken, ...(Object.keys(dateMatch).length ? { createdAt: dateMatch } : {}) }
      const tokenMatch: any = { status: 'token_generated', ...orderOrToken, ...(Object.keys(dateMatch).length ? { createdAt: dateMatch } : {}) }

      // Daily trend from both LabOrder and LabToken (grouped by createdAt date)
      const [orderTrend, tokenTrend] = await Promise.all([
        LabOrder.aggregate([
          { $match: orderMatch },
          { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: { $ifNull: ['$net', 0] } },
          } },
        ]),
        LabToken.aggregate([
          { $match: tokenMatch },
          { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: { $ifNull: ['$net', 0] } },
          } },
        ]),
      ])
      const trendMap = new Map<string, number>()
      for (const r of [...orderTrend, ...tokenTrend]) {
        const key = String(r._id || '')
        trendMap.set(key, (trendMap.get(key) || 0) + Number(r.revenue || 0))
      }
      const trend = Array.from(trendMap.entries())
        .map(([dateIso, revenue]) => ({ dateIso, revenue: round2(revenue) }))
        .sort((a, b) => a.dateIso.localeCompare(b.dateIso))

      // Recent transactions from both collections
      const [recentOrders, recentTokens] = await Promise.all([
        LabOrder.find(orderMatch).sort({ createdAt: -1 }).limit(50).lean(),
        LabToken.find(tokenMatch).sort({ createdAt: -1 }).limit(50).lean(),
      ])

      const recent = [
        ...recentOrders.map((o: any) => ({
          _id: o._id,
          dateIso: (o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : ''),
          refType: 'lab_order',
          refId: String(o._id),
          memo: `Lab Order ${o.tokenNo || ''}`,
          createdAt: o.createdAt,
          lines: [{ account: 'LAB_REVENUE', credit: Number(o.net || 0), debit: 0 }],
        })),
        ...recentTokens.map((t: any) => ({
          _id: t._id,
          dateIso: (t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 10) : ''),
          refType: 'lab_token',
          refId: String(t._id),
          memo: `Lab Token ${t.tokenNo || ''}`,
          createdAt: t.createdAt,
          lines: [{ account: 'LAB_REVENUE', credit: Number(t.net || 0), debit: 0 }],
        })),
      ].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 50)

      // Total = sum of both collections' net
      const [orderTotal, tokenTotal] = await Promise.all([
        LabOrder.aggregate([
          { $match: orderMatch },
          { $group: { _id: null, total: { $sum: { $ifNull: ['$net', 0] } } } },
        ]),
        LabToken.aggregate([
          { $match: tokenMatch },
          { $group: { _id: null, total: { $sum: { $ifNull: ['$net', 0] } } } },
        ]),
      ])
      const total = round2(
        Number((orderTotal?.[0] as any)?.total || 0) +
        Number((tokenTotal?.[0] as any)?.total || 0)
      )

      return res.json({ module: mod, accounts, total, trend, recent })
    } catch (e) {
      console.error('Failed to query Lab models directly:', e)
      // Fall through to standard FinanceJournal query
    }
  }

  // --- ER module: query HospitalErPayment directly when no FinanceJournal data ---
  if (mod === 'er') {
    try {
      const { HospitalErPayment } = await import('../../hospital/models/ErPayment')
      const erMatch: any = {}
      if (from) erMatch.receivedAt = { ...(erMatch.receivedAt || {}), $gte: new Date(from) }
      if (to)   erMatch.receivedAt = { ...(erMatch.receivedAt || {}), $lte: new Date(to + 'T23:59:59') }

      // Daily trend
      const trend = await HospitalErPayment.aggregate([
        { $match: erMatch },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$receivedAt' } }, revenue: { $sum: { $ifNull: ['$amount', 0] } } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, dateIso: '$_id', revenue: { $round: ['$revenue', 2] } } },
      ])

      // Recent transactions
      const recentPayments = await HospitalErPayment.find(erMatch)
        .sort({ receivedAt: -1 }).limit(50).lean()

      const recent = recentPayments.map((p: any) => ({
        _id: p._id, dateIso: (p.receivedAt || new Date()).toISOString().slice(0, 10),
        refType: 'er_billing', refId: String(p._id),
        memo: `ER Payment${p.refNo ? ' #' + p.refNo : ''}${p.method ? ' (' + p.method + ')' : ''}`,
        lines: [
          { account: 'ER_REVENUE', credit: Number(p.amount || 0), debit: 0 },
        ],
      }))

      // Total
      const totals = await HospitalErPayment.aggregate([
        { $match: erMatch },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } },
      ])
      const total = round2(Number((totals?.[0] as any)?.total || 0))

      return res.json({ module: mod, accounts, total, trend, recent })
    } catch (e) {
      console.error('Failed to query HospitalErPayment:', e)
      // Fall through to standard FinanceJournal query
    }
  }

  // Daily trend - standard FinanceJournal
  const trend = await FinanceJournal.aggregate([
    { $match: match },
    { $unwind: '$lines' },
    { $match: { 'lines.account': { $in: accounts } } },
    { $group: { _id: '$dateIso', revenue: { $sum: { $subtract: [{ $ifNull: ['$lines.credit', 0] }, { $ifNull: ['$lines.debit', 0] }] } } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, dateIso: '$_id', revenue: { $round: ['$revenue', 2] } } },
  ])

  // Recent transactions
  const recent = await FinanceJournal.find({ ...match, 'lines.account': { $in: accounts } })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()

  // Totals
  const totals = await FinanceJournal.aggregate([
    { $match: match },
    { $unwind: '$lines' },
    { $match: { 'lines.account': { $in: accounts } } },
    { $group: { _id: null, credits: { $sum: { $ifNull: ['$lines.credit', 0] } }, debits: { $sum: { $ifNull: ['$lines.debit', 0] } } } },
  ])
  const total = round2(Number((totals?.[0] as any)?.credits || 0) - Number((totals?.[0] as any)?.debits || 0))

  res.json({ module: mod, accounts, total, trend, recent })
}

// ---------------------------------------------------------------------------
// Reconciliation (cash)
// ---------------------------------------------------------------------------

/** GET /finance/reconciliation — cash account balance vs physical cash counts. */
export async function reconciliation(_req: Request, res: Response){
  const totals = await accountTotals({})
  const cashBalance = round2((totals['CASH']?.debits || 0) - (totals['CASH']?.credits || 0))
  const bankBalance = round2((totals['BANK']?.debits || 0) - (totals['BANK']?.credits || 0))

  // Sum up recent cash counts (optional, pulled from hospital module if present)
  let countsTotal = 0
  try {
    // Use dynamic import so we don't hard-couple to the hospital module
    const { HospitalCashSession } = await import('../../hospital/models/CashSession')
    const todayIso = new Date().toISOString().slice(0, 10)
    const rows = await HospitalCashSession.find({ status: 'closed', closedAt: { $exists: true } })
      .sort({ closedAt: -1 })
      .limit(50)
      .lean()
    countsTotal = rows.reduce((s: number, r: any) => s + Number(r.countedCash || 0), 0)
    void todayIso
  } catch {}

  res.json({
    cashBalance,
    bankBalance,
    countsTotal: round2(countsTotal),
    diff: round2(cashBalance - countsTotal),
  })
}
