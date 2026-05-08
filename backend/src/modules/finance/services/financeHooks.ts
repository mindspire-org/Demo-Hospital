/**
 * financeHooks — the SINGLE entry point every hospital module uses to record
 * finance events. Every helper:
 *   1. Builds balanced double-entry journal lines.
 *   2. Upserts on (refType, refId) so callers can invoke it safely on retries
 *      (idempotent); non-idempotent helpers create a new journal each call.
 *   3. Tags every line with { module, portal, patientId, doctorId, ... } for
 *      downstream drill-downs.
 *
 * All writes go to the unified Hospital_Finance_Journal collection. Reports
 * (Trial Balance, P&L, Balance Sheet, Dashboard, AR/AP) derive from that
 * single source of truth.
 */

import { Types } from 'mongoose'
import { FinanceJournal, JournalLine } from '../models/FinanceJournal'

// ---------------------------------------------------------------------------
// internal helpers
// ---------------------------------------------------------------------------

function todayIso(d?: Date | string){
  const date = d ? new Date(d) : new Date()
  if (isNaN(date.getTime())) return new Date().toISOString().slice(0,10)
  return date.toISOString().slice(0,10)
}

function toOid(id?: string | Types.ObjectId | null){
  if (!id) return undefined
  try { return typeof id === 'string' ? new Types.ObjectId(id) : id } catch { return undefined }
}

function round2(n: number){
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

function sum(lines: JournalLine[], key: 'debit' | 'credit'){
  return round2(lines.reduce((s, l) => s + Number(l[key] || 0), 0))
}

/**
 * Build a tags object. Filters out undefined, stringifies where needed,
 * converts ids to ObjectId when possible (falls back to string).
 */
function buildTags(raw: Record<string, any> = {}){
  const tags: Record<string, any> = {}
  for (const [k, v] of Object.entries(raw)){
    if (v === undefined || v === null || v === '') continue
    if (/Id$/.test(k)) {
      const oid = toOid(String(v))
      tags[k] = oid || String(v)
    } else {
      tags[k] = v
    }
  }
  return tags
}

/**
 * Upsert a journal keyed by (refType, refId). Used by all idempotent posters.
 * If an active journal exists it is updated in-place; if it was reversed it is
 * re-activated with the new lines; otherwise a new one is created.
 */
async function upsertJournal(args: {
  dateIso?: string
  refType: string
  refId: string
  memo?: string
  lines: JournalLine[]
}){
  const dateIso = args.dateIso || todayIso()
  const debits = sum(args.lines, 'debit')
  const credits = sum(args.lines, 'credit')
  if (Math.abs(debits - credits) > 0.01) {
    // Balanced double-entry is an invariant. If this ever fails, log & abort
    // the posting — we never want a malformed journal in the ledger.
    // eslint-disable-next-line no-console
    console.warn(`[financeHooks] unbalanced journal skipped: ${args.refType}:${args.refId} debits=${debits} credits=${credits}`)
    return null
  }
  const existing: any = await FinanceJournal.findOne({ refType: args.refType, refId: args.refId })
  if (existing) {
    return FinanceJournal.findByIdAndUpdate(existing._id, {
      $set: {
        dateIso,
        memo: args.memo || existing.memo,
        lines: args.lines,
        status: 'active',
        reversedAt: undefined,
      },
    }, { new: true })
  }
  return FinanceJournal.create({
    dateIso,
    refType: args.refType,
    refId: args.refId,
    memo: args.memo || '',
    lines: args.lines,
    status: 'active',
  })
}

/** Create a journal without upsert (use for events that can legitimately
 *  happen many times for the same refId, e.g. manual journal vouchers). */
async function appendJournal(args: {
  dateIso?: string
  refType: string
  refId?: string
  memo?: string
  lines: JournalLine[]
}){
  const dateIso = args.dateIso || todayIso()
  const debits = sum(args.lines, 'debit')
  const credits = sum(args.lines, 'credit')
  if (Math.abs(debits - credits) > 0.01) {
    // eslint-disable-next-line no-console
    console.warn(`[financeHooks] unbalanced journal skipped: ${args.refType}:${args.refId || ''} debits=${debits} credits=${credits}`)
    return null
  }
  return FinanceJournal.create({
    dateIso,
    refType: args.refType,
    refId: args.refId,
    memo: args.memo || '',
    lines: args.lines,
    status: 'active',
  })
}

/** Resolve which Asset account debit based on the payment method. */
function cashAccount(method?: string): 'CASH' | 'BANK' | 'AR' {
  const m = String(method || '').toLowerCase()
  if (m === 'bank' || m === 'card' || m === 'online' || m === 'transfer') return 'BANK'
  if (m === 'ar' || m === 'credit' || m === 'corporate' || m === 'account') return 'AR'
  return 'CASH'
}

// ---------------------------------------------------------------------------
// typed event contracts
// ---------------------------------------------------------------------------

export type BaseTags = {
  module?: string
  portal?: string
  patientId?: string
  patientName?: string
  mrn?: string
  doctorId?: string
  departmentId?: string
  departmentName?: string
  sessionId?: string
  createdByUserId?: string
  createdByUsername?: string
}

// ---------------------------------------------------------------------------
// posters — revenue events
// ---------------------------------------------------------------------------

export const financeHooks = {
  /** Manual journal voucher — balanced lines provided by caller. */
  async postManualJournal(args: { dateIso?: string; memo?: string; lines: JournalLine[]; createdByUsername?: string }){
    const lines = (args.lines || []).map(l => ({
      ...l,
      tags: { ...(l.tags || {}), createdByUsername: args.createdByUsername },
    }))
    return appendJournal({ dateIso: args.dateIso, refType: 'manual_journal', memo: args.memo, lines })
  },

  /** OPD token payment (idempotent per tokenId). */
  async postOpdToken(args: {
    tokenId: string
    dateIso?: string
    fee: number
    discount?: number
    doctorShare?: number
    paidMethod?: string
    tokenNo?: string
  } & BaseTags){
    const fee = round2(args.fee)
    if (fee <= 0) return null
    const debit = cashAccount(args.paidMethod)
    const tags = buildTags({ ...args, module: 'opd', portal: 'hospital' })
    const lines: JournalLine[] = [
      { account: debit, debit: fee, tags },
      { account: 'OPD_REVENUE', credit: fee, tags },
    ]
    if (args.discount && args.discount > 0){
      // Record discount as expense against revenue; gross = fee + discount
      lines.push({ account: 'DISCOUNT', debit: round2(args.discount), tags })
      lines.push({ account: 'OPD_REVENUE', credit: round2(args.discount), tags })
    }
    if (args.doctorShare && args.doctorShare > 0 && args.doctorId){
      const share = round2(args.doctorShare)
      lines.push({ account: 'DOCTOR_SHARE_EXPENSE', debit: share, tags })
      lines.push({ account: 'DOCTOR_PAYABLE', credit: share, tags })
    }
    return upsertJournal({
      dateIso: args.dateIso,
      refType: 'opd_token',
      refId: args.tokenId,
      memo: `OPD Token ${args.tokenNo ? '#' + args.tokenNo : ''}`.trim(),
      lines,
    })
  },

  /** IPD payment. Idempotent per paymentId. */
  async postIpdPayment(args: {
    paymentId: string
    encounterId?: string
    amount: number
    method?: string
    dateIso?: string
  } & BaseTags){
    const amt = round2(args.amount)
    if (amt <= 0) return null
    const tags = buildTags({ ...args, module: 'ipd', portal: 'hospital' })
    const lines: JournalLine[] = [
      { account: cashAccount(args.method), debit: amt, tags },
      { account: 'IPD_REVENUE', credit: amt, tags },
    ]
    return upsertJournal({
      dateIso: args.dateIso,
      refType: 'ipd_payment',
      refId: args.paymentId,
      memo: `IPD Payment`,
      lines,
    })
  },

  /** ER payment. Idempotent per paymentId. */
  async postErPayment(args: {
    paymentId: string
    encounterId?: string
    amount: number
    method?: string
    dateIso?: string
  } & BaseTags){
    const amt = round2(args.amount)
    if (amt <= 0) return null
    const tags = buildTags({ ...args, module: 'er', portal: 'hospital' })
    const lines: JournalLine[] = [
      { account: cashAccount(args.method), debit: amt, tags },
      { account: 'ER_REVENUE', credit: amt, tags },
    ]
    return upsertJournal({
      dateIso: args.dateIso,
      refType: 'er_billing',
      refId: args.paymentId,
      memo: `ER Payment`,
      lines,
    })
  },

  /** Lab order payment. Idempotent per orderId. */
  async postLabOrderPayment(args: {
    orderId: string
    amount: number
    method?: string
    dateIso?: string
    collectionCenterId?: string
  } & BaseTags){
    const amt = round2(args.amount)
    if (amt <= 0) return null
    const tags = buildTags({ ...args, module: 'lab', portal: 'lab' })
    const lines: JournalLine[] = [
      { account: cashAccount(args.method), debit: amt, tags },
      { account: 'LAB_REVENUE', credit: amt, tags },
    ]
    return upsertJournal({
      dateIso: args.dateIso,
      refType: 'lab_order',
      refId: args.orderId,
      memo: `Lab Order`,
      lines,
    })
  },

  /** Pharmacy (outdoor) POS sale. Idempotent per saleId. */
  async postPharmacySale(args: {
    saleId: string
    subtotal: number
    discount?: number
    tax?: number
    amount: number // final amount received
    method?: string
    dateIso?: string
  } & BaseTags){
    const net = round2(args.amount)
    if (net <= 0) return null
    const tags = buildTags({ ...args, module: 'pharmacy', portal: 'pharmacy' })
    const tax = round2(args.tax || 0)
    const lines: JournalLine[] = [
      { account: cashAccount(args.method), debit: net, tags },
      { account: 'PHARMACY_REVENUE', credit: round2(net - tax), tags },
    ]
    if (tax > 0) lines.push({ account: 'TAX_PAYABLE', credit: tax, tags })
    return upsertJournal({
      dateIso: args.dateIso,
      refType: 'pharmacy_sale',
      refId: args.saleId,
      memo: `Pharmacy Sale`,
      lines,
    })
  },

  /** Indoor pharmacy dispense (charged to IPD encounter). Idempotent per dispenseId. */
  async postIndoorPharmacyDispense(args: {
    dispenseId: string
    amount: number
    method?: string
    dateIso?: string
  } & BaseTags){
    const amt = round2(args.amount)
    if (amt <= 0) return null
    const tags = buildTags({ ...args, module: 'indoorpharmacy', portal: 'indoorpharmacy' })
    const lines: JournalLine[] = [
      { account: cashAccount(args.method), debit: amt, tags },
      { account: 'INDOOR_PHARMACY_REVENUE', credit: amt, tags },
    ]
    return upsertJournal({
      dateIso: args.dateIso,
      refType: 'indoorpharmacy_dispense',
      refId: args.dispenseId,
      memo: `Indoor Pharmacy Dispense`,
      lines,
    })
  },

  /** Diagnostic / radiology order payment. Idempotent per orderId. */
  async postDiagnosticOrderPayment(args: {
    orderId: string
    amount: number
    method?: string
    dateIso?: string
  } & BaseTags){
    const amt = round2(args.amount)
    if (amt <= 0) return null
    const tags = buildTags({ ...args, module: 'diagnostic', portal: 'diagnostic' })
    const lines: JournalLine[] = [
      { account: cashAccount(args.method), debit: amt, tags },
      { account: 'DIAGNOSTIC_REVENUE', credit: amt, tags },
    ]
    return upsertJournal({
      dateIso: args.dateIso,
      refType: 'diagnostic_order',
      refId: args.orderId,
      memo: `Diagnostic Order`,
      lines,
    })
  },

  /** Aesthetic token payment. Idempotent per tokenId. */
  async postAestheticTokenPayment(args: {
    tokenId: string
    amount: number
    method?: string
    dateIso?: string
  } & BaseTags){
    const amt = round2(args.amount)
    if (amt <= 0) return null
    const tags = buildTags({ ...args, module: 'aesthetic', portal: 'aesthetic' })
    const lines: JournalLine[] = [
      { account: cashAccount(args.method), debit: amt, tags },
      { account: 'AESTHETIC_REVENUE', credit: amt, tags },
    ]
    return upsertJournal({
      dateIso: args.dateIso,
      refType: 'aesthetic_token',
      refId: args.tokenId,
      memo: `Aesthetic Token Payment`,
      lines,
    })
  },

  /** Dialysis session payment. Idempotent per sessionId. */
  async postDialysisPayment(args: {
    paymentId: string
    amount: number
    method?: string
    dateIso?: string
  } & BaseTags){
    const amt = round2(args.amount)
    if (amt <= 0) return null
    const tags = buildTags({ ...args, module: 'dialysis', portal: 'dialysis' })
    const lines: JournalLine[] = [
      { account: cashAccount(args.method), debit: amt, tags },
      { account: 'DIALYSIS_REVENUE', credit: amt, tags },
    ]
    return upsertJournal({
      dateIso: args.dateIso,
      refType: 'dialysis_payment',
      refId: args.paymentId,
      memo: `Dialysis Payment`,
      lines,
    })
  },

  // ---------------------------------------------------------------------------
  // expense / payable events
  // ---------------------------------------------------------------------------

  /** Expense paid (utilities, rent, maintenance, medical supplies, etc.). */
  async postExpensePaid(args: {
    expenseId: string
    category?: string
    amount: number
    method?: string
    dateIso?: string
  } & BaseTags){
    const amt = round2(args.amount)
    if (amt <= 0) return null
    const tags = buildTags({ ...args, module: 'expense', category: args.category })
    // Pick expense account by category keyword
    const cat = String(args.category || '').toLowerCase()
    const expenseAccount =
      cat.includes('salary') || cat.includes('payroll') ? 'SALARY_EXPENSE' :
      cat.includes('utility') || cat.includes('utilities') || cat.includes('electric') || cat.includes('gas') ? 'UTILITIES_EXPENSE' :
      cat.includes('rent') ? 'RENT_EXPENSE' :
      cat.includes('maintenance') || cat.includes('repair') ? 'MAINT_EXPENSE' :
      cat.includes('medical') || cat.includes('supply') || cat.includes('supplies') ? 'COGS_PHARMACY' :
      'OTHER_EXPENSE'
    const lines: JournalLine[] = [
      { account: expenseAccount, debit: amt, tags },
      { account: cashAccount(args.method), credit: amt, tags },
    ]
    return upsertJournal({
      dateIso: args.dateIso,
      refType: 'expense',
      refId: args.expenseId,
      memo: `Expense ${args.category || ''}`.trim(),
      lines,
    })
  },

  /** Vendor bill booked (Accounts Payable accrues). */
  async postVendorBill(args: {
    billId: string
    vendorId: string
    vendorName?: string
    amount: number
    dateIso?: string
  } & BaseTags){
    const amt = round2(args.amount)
    if (amt <= 0) return null
    const tags = buildTags({ ...args, module: 'ap', vendorId: args.vendorId })
    const lines: JournalLine[] = [
      { account: 'INVENTORY_STORE', debit: amt, tags },
      { account: 'VENDOR_PAYABLE', credit: amt, tags },
    ]
    return upsertJournal({
      dateIso: args.dateIso,
      refType: 'vendor_bill',
      refId: args.billId,
      memo: `Vendor Bill ${args.vendorName || ''}`.trim(),
      lines,
    })
  },

  /** Vendor payment (reduces AP). Idempotent per paymentId. */
  async postVendorPayment(args: {
    paymentId: string
    vendorId: string
    vendorName?: string
    amount: number
    method?: string
    dateIso?: string
  } & BaseTags){
    const amt = round2(args.amount)
    if (amt <= 0) return null
    const tags = buildTags({ ...args, module: 'ap', vendorId: args.vendorId })
    const lines: JournalLine[] = [
      { account: 'VENDOR_PAYABLE', debit: amt, tags },
      { account: cashAccount(args.method), credit: amt, tags },
    ]
    return upsertJournal({
      dateIso: args.dateIso,
      refType: 'vendor_payment',
      refId: args.paymentId,
      memo: `Vendor Payment ${args.vendorName || ''}`.trim(),
      lines,
    })
  },

  /** Store / equipment purchase (treats as asset). */
  async postStorePurchase(args: {
    purchaseId: string
    vendorId?: string
    amount: number
    dateIso?: string
    assetAccount?: 'INVENTORY_STORE' | 'EQUIPMENT_ASSET'
  } & BaseTags){
    const amt = round2(args.amount)
    if (amt <= 0) return null
    const tags = buildTags({ ...args, module: 'store' })
    const lines: JournalLine[] = [
      { account: args.assetAccount || 'INVENTORY_STORE', debit: amt, tags },
      { account: 'VENDOR_PAYABLE', credit: amt, tags },
    ]
    return upsertJournal({
      dateIso: args.dateIso,
      refType: 'store_purchase',
      refId: args.purchaseId,
      memo: `Store Purchase`,
      lines,
    })
  },

  // ---------------------------------------------------------------------------
  // payroll events
  // ---------------------------------------------------------------------------

  /** Staff salary accrual (records liability). Idempotent per payrollId. */
  async postStaffSalaryAccrual(args: {
    payrollId: string
    staffId: string
    period: string // e.g. "2026-04"
    gross: number
    deductions?: number
    net?: number
    dateIso?: string
  } & BaseTags){
    const gross = round2(args.gross)
    const deductions = round2(args.deductions || 0)
    const net = round2(args.net != null ? args.net : gross - deductions)
    if (gross <= 0) return null
    const tags = buildTags({ ...args, module: 'payroll' })
    const lines: JournalLine[] = [
      { account: 'SALARY_EXPENSE', debit: gross, tags },
      { account: 'STAFF_PAYABLE', credit: net, tags },
    ]
    if (deductions > 0) {
      lines.push({ account: 'TAX_PAYABLE', credit: deductions, tags })
    }
    return upsertJournal({
      dateIso: args.dateIso,
      refType: 'staff_salary_accrual',
      refId: args.payrollId,
      memo: `Staff Salary ${args.period}`,
      lines,
    })
  },

  /** Staff payout (reduces liability). Idempotent per payoutId. */
  async postStaffPayout(args: {
    payoutId: string
    staffId: string
    amount: number
    method?: string
    dateIso?: string
  } & BaseTags){
    const amt = round2(args.amount)
    if (amt <= 0) return null
    const tags = buildTags({ ...args, module: 'payroll' })
    const lines: JournalLine[] = [
      { account: 'STAFF_PAYABLE', debit: amt, tags },
      { account: cashAccount(args.method), credit: amt, tags },
    ]
    return upsertJournal({
      dateIso: args.dateIso,
      refType: 'staff_payout',
      refId: args.payoutId,
      memo: `Staff Payout`,
      lines,
    })
  },

  /** Doctor share accrual (on OPD/procedure completion). Non-idempotent —
   *  use `postOpdToken` when posting alongside a token instead. */
  async postDoctorShareAccrual(args: {
    refId: string
    doctorId: string
    amount: number
    dateIso?: string
  } & BaseTags){
    const amt = round2(args.amount)
    if (amt <= 0) return null
    const tags = buildTags({ ...args, module: 'doctor' })
    const lines: JournalLine[] = [
      { account: 'DOCTOR_SHARE_EXPENSE', debit: amt, tags },
      { account: 'DOCTOR_PAYABLE', credit: amt, tags },
    ]
    return upsertJournal({
      dateIso: args.dateIso,
      refType: 'doctor_share_accrual',
      refId: args.refId,
      memo: `Doctor Share Accrual`,
      lines,
    })
  },

  /** Doctor payout. Non-idempotent — each payout is its own journal. */
  async postDoctorPayout(args: {
    doctorId: string
    amount: number
    method?: string
    memo?: string
    dateIso?: string
  } & BaseTags){
    const amt = round2(args.amount)
    if (amt <= 0) return null
    const tags = buildTags({ ...args, module: 'doctor' })
    const lines: JournalLine[] = [
      { account: 'DOCTOR_PAYABLE', debit: amt, tags },
      { account: cashAccount(args.method), credit: amt, tags },
    ]
    return appendJournal({
      dateIso: args.dateIso,
      refType: 'doctor_payout',
      refId: args.doctorId,
      memo: args.memo || `Doctor Payout`,
      lines,
    })
  },

  /** Inventory adjustment (write-off or revaluation). */
  async postInventoryAdjustment(args: {
    adjustmentId: string
    itemId?: string
    valueDelta: number // +ve = write-up, -ve = write-down
    reason?: string
    dateIso?: string
    account?: 'INVENTORY_STORE' | 'INVENTORY_PHARMACY'
  } & BaseTags){
    const delta = round2(args.valueDelta)
    if (delta === 0) return null
    const tags = buildTags({ ...args, module: 'inventory' })
    const asset = args.account || 'INVENTORY_STORE'
    const lines: JournalLine[] =
      delta > 0
        ? [ { account: asset, debit: delta, tags }, { account: 'OTHER_EXPENSE', credit: delta, tags } ]
        : [ { account: 'OTHER_EXPENSE', debit: -delta, tags }, { account: asset, credit: -delta, tags } ]
    return upsertJournal({
      dateIso: args.dateIso,
      refType: 'inventory_adjustment',
      refId: args.adjustmentId,
      memo: `Inventory Adjustment: ${args.reason || ''}`.trim(),
      lines,
    })
  },

  // ---------------------------------------------------------------------------
  // reversals
  // ---------------------------------------------------------------------------

  /** Reverse a journal in-place (marks original reversed + swaps debit/credit). */
  async reverseJournalById(journalId: string, memo?: string){
    const { reverseJournalById } = await import('../controllers/finance_ledger')
    return reverseJournalById(journalId, memo)
  },

  /** Reverse the journal tied to (refType, refId). */
  async reverseJournalByRef(refType: string, refId: string, memo?: string){
    const { reverseJournalByRef } = await import('../controllers/finance_ledger')
    return reverseJournalByRef(refType, refId, memo)
  },
}

export default financeHooks
