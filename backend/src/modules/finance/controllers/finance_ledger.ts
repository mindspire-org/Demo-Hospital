import { Types } from 'mongoose'
import { FinanceJournal, JournalLine } from '../models/FinanceJournal'
import { addJournalToShiftCollections, subtractJournalFromShiftCollections, addExpenseToShift } from './shiftLedgerHook'

function todayIso(){
  const now = new Date()
  // Use Pakistan timezone (UTC+5) for dateIso
  const PAKISTAN_OFFSET_MS = 5 * 60 * 60 * 1000
  const pakTime = new Date(now.getTime() + PAKISTAN_OFFSET_MS)
  return pakTime.toISOString().slice(0,10)
}

function todayIsoDateTime(){
  const now = new Date()
  // Use Pakistan timezone (UTC+5) for full ISO string
  const PAKISTAN_OFFSET_MS = 5 * 60 * 60 * 1000
  const pakTime = new Date(now.getTime() + PAKISTAN_OFFSET_MS)
  return pakTime.toISOString()
}

function toOid(id?: string){
  try { return id ? new Types.ObjectId(id) : undefined } catch { return undefined }
}

function round2(n: number){
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export async function computeDoctorBalance(doctorId: string){
  const M = Types
  const rows: any[] = await FinanceJournal.aggregate([
    // Exclude reversed journals
    { $match: { status: { $ne: 'reversed' } } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': 'DOCTOR_PAYABLE', 'lines.tags.doctorId': new M.ObjectId(doctorId) } },
    { $group: { _id: null, credits: { $sum: { $ifNull: ['$lines.credit', 0] } }, debits: { $sum: { $ifNull: ['$lines.debit', 0] } } } },
  ])
  const credits = Number(rows?.[0]?.credits || 0)
  const debits = Number(rows?.[0]?.debits || 0)
  return round2(credits - debits)
}

export async function createDoctorPayout(
  doctorId: string,
  amount: number,
  method: 'Cash'|'Bank' = 'Cash',
  memo?: string,
  sessionId?: string,
  sourceAccount?: string,       // COA account name/code (e.g. 'CASH IN HAND' or '2000-101')
  destinationAccount?: string   // defaults to 'DOCTOR_PAYABLE'
){
  const dateIso = todayIso()
  const tags: any = { doctorId: toOid(doctorId) }
  if (sessionId) tags.sessionId = String(sessionId)
  if (sourceAccount) tags.sourceAccount = String(sourceAccount)
  if (destinationAccount) tags.destinationAccount = String(destinationAccount)

  const creditAccount = sourceAccount || (method === 'Bank' ? 'BANK' : 'CASH')
  const debitAccount = destinationAccount || 'DOCTOR_PAYABLE'

  const lines: JournalLine[] = [
    { account: debitAccount, debit: amount, tags },
    { account: creditAccount, credit: amount, tags },
  ]
  const journal = await FinanceJournal.create({ dateIso, module: 'general', refType: 'doctor_payout', refId: doctorId, memo: memo || 'Doctor payout', lines })

  // Update active shift expenses
  await addExpenseToShift({
    refType: 'doctor_payout',
    amount: Number(amount || 0)
  })

  return journal
}

export async function manualDoctorEarning(data: { doctorId: string; departmentId?: string; departmentName?: string; phone?: string; amount: number; revenueAccount?: 'OPD_REVENUE'|'PROCEDURE_REVENUE'|'IPD_REVENUE'; paidMethod?: 'Cash'|'Bank'|'AR'; memo?: string; sharePercent?: number; patientName?: string; mrn?: string }){
  const dateIso = todayIso()
  // Interpret amount as the final doctor earning to accrue
  const doctorAmount = round2(Math.max(data.amount || 0, 0))
  const tagsBase: any = { }
  if (data.doctorId) tagsBase.doctorId = toOid(data.doctorId)
  if (data.departmentId) tagsBase.departmentId = toOid(data.departmentId)
  if (data.departmentName) tagsBase.departmentName = String(data.departmentName)
  if (data.phone) tagsBase.phone = String(data.phone)
  if (data.revenueAccount) tagsBase.revenueAccount = String(data.revenueAccount)
  if (data.patientName) tagsBase.patientName = data.patientName
  if (data.mrn) tagsBase.mrn = data.mrn

  if ((data as any).createdByUsername) tagsBase.createdByUsername = String((data as any).createdByUsername)

  const lines: JournalLine[] = [
    { account: 'DOCTOR_SHARE_EXPENSE', debit: doctorAmount, tags: { ...tagsBase } },
    { account: 'DOCTOR_PAYABLE', credit: doctorAmount, tags: { ...tagsBase } },
  ]
  return await FinanceJournal.create({ dateIso, module: 'general', refType: 'manual_doctor_earning', refId: data.doctorId, memo: data.memo, lines })
}

export async function postOpdTokenJournal(args: { tokenId: string; dateIso: string; fee: number; doctorId?: string; departmentId?: string; patientId?: string; patientName?: string; mrn?: string; tokenNo?: string; paidMethod?: 'Cash'|'Bank'|'AR'; sessionId?: string; createdByUsername?: string; memo?: string; visitCategory?: string; serviceNames?: string }){

  // Single document per token - update if exists, create if not

  const existing: any = await FinanceJournal.findOne({ refType: 'opd_token', refId: args.tokenId }).sort({ createdAt: -1 })

  

  const debitAccount = args.paidMethod === 'Bank' ? 'BANK' : (args.paidMethod === 'Cash' ? 'CASH' : 'AR')

  const tagsBase: any = { }

  if (args.doctorId) tagsBase.doctorId = toOid(args.doctorId)

  if (args.departmentId) tagsBase.departmentId = toOid(args.departmentId)

  if (args.tokenId) tagsBase.tokenId = toOid(args.tokenId)

  if (args.patientId) tagsBase.patientId = toOid(args.patientId)

  if (args.patientName) tagsBase.patientName = args.patientName

  if (args.mrn) tagsBase.mrn = args.mrn

  if (args.tokenNo) tagsBase.tokenNo = args.tokenNo

  if (args.sessionId) tagsBase.sessionId = String(args.sessionId)

  if (args.createdByUsername) tagsBase.createdByUsername = args.createdByUsername

  if (args.visitCategory) tagsBase.visitCategory = args.visitCategory

  if (args.serviceNames) tagsBase.serviceNames = args.serviceNames

  const lines: JournalLine[] = [
    { account: debitAccount, debit: args.fee, tags: { ...tagsBase } },
    { account: 'OPD_REVENUE', credit: args.fee, tags: { ...tagsBase } },
  ]

  // Accrue doctor earning to payable so Doctors Finance can report it.
  if (args.doctorId && Number(args.fee || 0) > 0){
    let percent = 100
    try {
      const { HospitalDoctor } = await import('../../hospital/models/Doctor')
      const doc: any = await HospitalDoctor.findById(args.doctorId).lean()
      percent = (doc as any)?.shares ?? 100
    } catch {}
    const doctorAmount = round2(Math.max(Number(args.fee || 0), 0) * (Math.max(Number(percent)||0,0) / 100))
    if (doctorAmount > 0) {
      lines.push({ account: 'DOCTOR_SHARE_EXPENSE', debit: doctorAmount, tags: { ...tagsBase } })
      lines.push({ account: 'DOCTOR_PAYABLE', credit: doctorAmount, tags: { ...tagsBase } })
    }
  }
  const memo = args.memo || ''
  
  if (existing && existing.status !== 'reversed') {
    // Update existing journal to active state with original amounts
    return await FinanceJournal.findByIdAndUpdate(existing._id, {
      $set: {
        dateIso: args.dateIso || todayIso(),
        memo,
        lines,
        module: 'opd',
        status: 'active',
        reversedAt: undefined
      }
    }, { new: true })
  }
  
  // Create new journal
  const journal = await FinanceJournal.create({ 
    dateIso: args.dateIso || todayIso(), 
    module: 'opd',
    refType: 'opd_token', 
    refId: args.tokenId, 
    memo, 
    lines,
    status: 'active'
  })

  // Update active shift collections
  await addJournalToShiftCollections({
    module: 'opd',
    refType: 'opd_token',
    amount: Number(args.fee || 0)
  })

  return journal
}

// Reverse a token journal by setting status to 'reversed' and negating amounts
export async function reverseOpdTokenJournal(tokenId: string, reason?: string){
  const existing: any = await FinanceJournal.findOne({ refType: 'opd_token', refId: tokenId }).sort({ createdAt: -1 })
  if (!existing) return null
  if (existing.status === 'reversed') return existing // Already reversed, idempotent
  
  // Negate all line amounts
  const revLines: JournalLine[] = (existing.lines || []).map((l: any) => ({
    account: l.account,
    debit: l.credit || 0,  // Swap debit/credit
    credit: l.debit || 0,
    tags: l.tags
  }))
  
  const result = await FinanceJournal.findByIdAndUpdate(existing._id, {
    $set: {
      lines: revLines,
      status: 'reversed',
      reversedAt: new Date().toISOString(),
      memo: `${existing.memo || ''} - ${reason || 'Reversed'}`
    }
  }, { new: true })

  // Subtract from active shift collections
  const fee = existing.lines?.reduce((sum: number, l: any) => l.account === 'OPD_REVENUE' ? sum + (l.credit || 0) : sum, 0) || 0
  if (fee > 0) {
    await subtractJournalFromShiftCollections({
      module: existing.module || 'opd',
      refType: 'opd_token',
      amount: fee
    })
  }

  return result
}

export async function reverseJournalByRef(refType: string, refId: string, memo?: string){
  const base: any = { refType, refId, status: { $ne: 'reversed' } }
  const latestBase: any = await FinanceJournal.findOne(base).sort({ createdAt: -1 })
  if (!latestBase) return null

  // Idempotency: if a reversal already exists and it's newer than the latest base journal,
  // do not create another reversal.
  try {
    const lastRev: any = await FinanceJournal.findOne({ refType: `${refType}_reversal`, refId }).sort({ createdAt: -1 }).lean()
    if (lastRev && new Date(lastRev.createdAt) >= new Date(latestBase.createdAt)) return lastRev as any
  } catch {}

  // Mark original as reversed
  latestBase.status = 'reversed'
  latestBase.reversedAt = new Date().toISOString()
  await latestBase.save()

  const revLines: JournalLine[] = []
  for (const l of (latestBase.lines || [])){
    revLines.push({ account: l.account, debit: l.credit || 0, credit: l.debit || 0, tags: l.tags })
  }
  const r = await FinanceJournal.create({ dateIso: todayIso(), module: 'general', refType: `${refType}_reversal`, refId, memo: memo || `Reversal for ${refType}:${refId}` , lines: revLines })

  // Subtract from active shift collections
  const amount = latestBase.lines?.reduce((sum: number, l: any) => {
    const revAccounts = ['OPD_REVENUE','LAB_REVENUE','PHARMACY_REVENUE','DIAGNOSTIC_REVENUE','DIALYSIS_REVENUE','AESTHETIC_REVENUE','PROCEDURE_REVENUE']
    return revAccounts.includes(l.account) ? sum + (l.credit || 0) : sum
  }, 0) || 0
  if (amount > 0) {
    await subtractJournalFromShiftCollections({
      module: latestBase.module || 'general',
      refType,
      amount
    })
  }

  return r
}

export async function reverseJournalById(journalId: string, memo?: string){
  const j: any = await FinanceJournal.findById(journalId)
  if (!j) return null
  if (j.status === 'reversed') return j // Already reversed, idempotent
  
  const revLines: JournalLine[] = []
  for (const l of (j.lines || [])){
    revLines.push({ account: l.account, debit: l.credit || 0, credit: l.debit || 0, tags: l.tags })
  }
  
  // Mark original as reversed
  j.status = 'reversed'
  j.reversedAt = new Date().toISOString()
  j.memo = `${j.memo || ''} - ${memo || 'Reversed'}`
  await j.save()
  
  // Create reversal journal entry
  const r = await FinanceJournal.create({ dateIso: todayIso(), module: j.module || 'general', refType: `${j.refType || 'journal'}_reversal`, refId: String(j._id), memo: memo || `Reversal for journal ${j._id}` , lines: revLines })

  // Subtract from active shift collections
  const amount = j.lines?.reduce((sum: number, l: any) => {
    const revAccounts = ['OPD_REVENUE','LAB_REVENUE','PHARMACY_REVENUE','DIAGNOSTIC_REVENUE','DIALYSIS_REVENUE','AESTHETIC_REVENUE','PROCEDURE_REVENUE']
    return revAccounts.includes(l.account) ? sum + (l.credit || 0) : sum
  }, 0) || 0
  if (amount > 0) {
    await subtractJournalFromShiftCollections({
      module: j.module || 'general',
      refType: j.refType,
      amount
    })
  }

  return r
}

// Post revenue journal for user transactions (Chart of Accounts integration)
// FIXED: Now uses proper CASH/BANK/AR debit instead of broken userAccountName debit
export async function postUserRevenueJournal(args: {
  userAccountName: string    // Kept for backward compat — now stored in tags only
  revenueAccount: string     // "OPD_REVENUE" | "LAB_REVENUE" | etc.
  amount: number
  refType: string            // "opd_token" | "lab_order" | etc.
  refId: string
  description: string
  dateIso: string
  paidMethod?: 'Cash' | 'Bank' | 'AR'   // NEW: determines debit account
  module?: string            // NEW: module tag for the journal
}) {
  const debitAccount = args.paidMethod === 'Bank' ? 'BANK' : (args.paidMethod === 'Cash' ? 'CASH' : 'AR')
  const tags: any = { userAccount: args.userAccountName, module: args.module || 'general' }
  const lines: JournalLine[] = [
    { account: debitAccount, debit: args.amount, tags },
    { account: args.revenueAccount, credit: args.amount, tags }
  ]
  const journal = await FinanceJournal.create({
    dateIso: args.dateIso,
    module: args.module || 'general',
    refType: args.refType,
    refId: args.refId,
    memo: args.description,
    lines,
    status: 'active'
  })

  // Update active shift collections
  await addJournalToShiftCollections({
    module: args.module || 'general',
    refType: args.refType,
    amount: Number(args.amount || 0)
  })

  return journal
}

// ─── Module-specific journal posting functions ───

// Post Lab order revenue journal
export async function postLabOrderJournal(args: {
  orderId: string
  dateIso: string
  amount: number
  paidMethod?: 'Cash' | 'Bank' | 'AR'
  patientName?: string
  mrn?: string
  tokenNo?: string
  createdByUsername?: string
}) {
  const existing: any = await FinanceJournal.findOne({ refType: 'lab_order', refId: args.orderId }).lean()
  if (existing) return existing

  const debitAccount = args.paidMethod === 'Bank' ? 'BANK' : (args.paidMethod === 'Cash' ? 'CASH' : 'AR')
  const tags: any = { module: 'lab' }
  if (args.patientName) tags.patientName = args.patientName
  if (args.mrn) tags.mrn = args.mrn
  if (args.tokenNo) tags.tokenNo = args.tokenNo
  if (args.createdByUsername) tags.createdByUsername = args.createdByUsername

  const lines: JournalLine[] = [
    { account: debitAccount, debit: args.amount, tags },
    { account: 'LAB_REVENUE', credit: args.amount, tags },
  ]
  const memo = `Lab Order${args.tokenNo ? ` #${args.tokenNo}` : ''}`
  const journal = await FinanceJournal.create({
    dateIso: args.dateIso || todayIso(),
    module: 'lab',
    refType: 'lab_order',
    refId: args.orderId,
    memo,
    lines,
    status: 'active',
    createdAt: todayIsoDateTime(), // Use Pakistan time for createdAt to fix display discrepancy
  })

  // Update active shift collections
  await addJournalToShiftCollections({
    module: 'lab',
    refType: 'lab_order',
    amount: Number(args.amount || 0)
  })

  return journal
}

// Post Diagnostic order revenue journal
export async function postDiagnosticOrderJournal(args: {
  orderId: string
  dateIso: string
  amount: number
  paidMethod?: 'Cash' | 'Bank' | 'AR'
  patientName?: string
  mrn?: string
  tokenNo?: string
  createdByUsername?: string
}) {
  const existing: any = await FinanceJournal.findOne({ refType: 'diagnostic_order', refId: args.orderId }).lean()
  if (existing) return existing

  const debitAccount = args.paidMethod === 'Bank' ? 'BANK' : (args.paidMethod === 'Cash' ? 'CASH' : 'AR')
  const tags: any = { module: 'diagnostic' }
  if (args.patientName) tags.patientName = args.patientName
  if (args.mrn) tags.mrn = args.mrn
  if (args.tokenNo) tags.tokenNo = args.tokenNo
  if (args.createdByUsername) tags.createdByUsername = args.createdByUsername

  const lines: JournalLine[] = [
    { account: debitAccount, debit: args.amount, tags },
    { account: 'DIAGNOSTIC_REVENUE', credit: args.amount, tags },
  ]
  const memo = `Diagnostic Order${args.tokenNo ? ` #${args.tokenNo}` : ''}`
  const journal = await FinanceJournal.create({
    dateIso: args.dateIso || todayIso(),
    module: 'diagnostic',
    refType: 'diagnostic_order',
    refId: args.orderId,
    memo,
    lines,
    status: 'active',
    createdAt: todayIsoDateTime(), // Use Pakistan time for createdAt to fix display discrepancy
  })

  // Update active shift collections
  await addJournalToShiftCollections({
    module: 'diagnostic',
    refType: 'diagnostic_order',
    amount: Number(args.amount || 0)
  })

  return journal
}

// Post Pharmacy sale revenue journal (with COGS)
export async function postPharmacySaleJournal(args: {
  billNo: string
  dateIso: string
  revenueAmount: number
  cogsAmount: number
  paidMethod?: 'Cash' | 'Bank' | 'AR'
  customer?: string
  createdByUsername?: string
}) {
  const existing: any = await FinanceJournal.findOne({ refType: 'pharmacy_sale', refId: args.billNo }).lean()
  if (existing) return existing

  const debitAccount = args.paidMethod === 'Bank' ? 'BANK' : (args.paidMethod === 'Cash' ? 'CASH' : 'AR')
  const tags: any = { module: 'pharmacy' }
  if (args.customer) tags.customer = args.customer
  if (args.createdByUsername) tags.createdByUsername = args.createdByUsername

  const lines: JournalLine[] = [
    { account: debitAccount, debit: args.revenueAmount, tags },
    { account: 'PHARMACY_REVENUE', credit: args.revenueAmount, tags },
  ]

  // COGS entry: Debit PHARMACY_COGS, Credit PHARMACY_INVENTORY
  if (args.cogsAmount > 0) {
    lines.push({ account: 'PHARMACY_COGS', debit: args.cogsAmount, tags: { ...tags } })
    lines.push({ account: 'PHARMACY_INVENTORY', credit: args.cogsAmount, tags: { ...tags } })
  }

  const memo = `Pharmacy Sale ${args.billNo}`
  const journal = await FinanceJournal.create({
    dateIso: args.dateIso || todayIso(),
    module: 'pharmacy',
    refType: 'pharmacy_sale',
    refId: args.billNo,
    memo,
    lines,
    status: 'active'
  })

  // Update active shift collections
  await addJournalToShiftCollections({
    module: 'pharmacy',
    refType: 'pharmacy_sale',
    amount: Number(args.revenueAmount || 0)
  })

  return journal
}

// Post Dialysis session revenue journal
export async function postDialysisSessionJournal(args: {
  sessionId: string
  dateIso: string
  amount: number
  paidMethod?: 'Cash' | 'Bank' | 'AR'
  patientName?: string
  mrn?: string
  doctorId?: string
  createdByUsername?: string
}) {
  const existing: any = await FinanceJournal.findOne({ refType: 'dialysis_session', refId: args.sessionId }).lean()
  if (existing) return existing

  const debitAccount = args.paidMethod === 'Bank' ? 'BANK' : (args.paidMethod === 'Cash' ? 'CASH' : 'AR')
  const tags: any = { module: 'dialysis' }
  if (args.patientName) tags.patientName = args.patientName
  if (args.mrn) tags.mrn = args.mrn
  if (args.doctorId) tags.doctorId = toOid(args.doctorId)
  if (args.createdByUsername) tags.createdByUsername = args.createdByUsername

  const lines: JournalLine[] = [
    { account: debitAccount, debit: args.amount, tags },
    { account: 'DIALYSIS_REVENUE', credit: args.amount, tags },
  ]
  const memo = `Dialysis Session`
  const journal = await FinanceJournal.create({
    dateIso: args.dateIso || todayIso(),
    module: 'dialysis',
    refType: 'dialysis_session',
    refId: args.sessionId,
    memo,
    lines,
    status: 'active'
  })

  // Update active shift collections
  await addJournalToShiftCollections({
    module: 'dialysis',
    refType: 'dialysis_session',
    amount: Number(args.amount || 0)
  })

  return journal
}

// Post Aesthetic procedure revenue journal (merged into main FinanceJournal)
export async function postAestheticProcedureJournal(args: {
  tokenId: string
  sessionId: string
  dateIso: string
  amount: number
  doctorId?: string
  sharePercent?: number
  paidMethod?: 'Cash' | 'Bank' | 'AR'
  patientName?: string
  mrn?: string
  procedureName?: string
}) {
  const lastPay: any = await FinanceJournal.findOne({ refType: 'aesthetic_procedure_payment', refId: args.tokenId }).sort({ createdAt: -1 }).lean()
  const lastRev: any = await FinanceJournal.findOne({ refType: 'aesthetic_procedure_payment_reversal', refId: args.tokenId }).sort({ createdAt: -1 }).lean()
  if (lastPay && (!lastRev || new Date(lastPay.createdAt) > new Date(lastRev.createdAt))) return lastPay

  const amt = round2(Math.max(0, Number(args.amount || 0)))
  if (!amt) return null

  const share = round2(amt * (Math.max(Number(args.sharePercent || 100), 0) / 100))
  const debitAccount = args.paidMethod === 'Bank' ? 'BANK' : (args.paidMethod === 'Cash' ? 'CASH' : 'AR')
  const tags: any = { module: 'aesthetic' }
  if (args.doctorId) tags.doctorId = String(args.doctorId)
  if (args.tokenId) tags.tokenId = String(args.tokenId)
  if (args.sessionId) tags.sessionId = String(args.sessionId)
  if (args.patientName) tags.patientName = args.patientName
  if (args.mrn) tags.mrn = args.mrn
  if (args.procedureName) tags.procedureName = args.procedureName

  const lines: JournalLine[] = [
    { account: debitAccount, debit: amt, tags: { ...tags } },
    { account: 'AESTHETIC_REVENUE', credit: amt, tags: { ...tags } },
  ]
  if (share > 0) {
    lines.push({ account: 'DOCTOR_SHARE_EXPENSE', debit: share, tags: { ...tags } })
    lines.push({ account: 'DOCTOR_PAYABLE', credit: share, tags: { ...tags } })
  }

  const memo = `Aesthetic Procedure${args.procedureName ? `: ${args.procedureName}` : ''}`
  const journal = await FinanceJournal.create({
    dateIso: args.dateIso || todayIso(),
    module: 'aesthetic',
    refType: 'aesthetic_procedure_payment',
    refId: args.tokenId,
    memo,
    lines,
    status: 'active'
  })

  // Update active shift collections
  await addJournalToShiftCollections({
    module: 'aesthetic',
    refType: 'aesthetic_procedure_payment',
    amount: Number(args.amount || 0)
  })

  return journal
}

// Post vendor purchase journal (unified for all modules)
export async function postVendorPurchaseJournal(args: {
  invoiceNo: string
  dateIso: string
  amount: number
  vendorName: string
  vendorId?: string
  module: string     // 'pharmacy' | 'lab' | 'general'
  inventoryAccount: string   // 'PHARMACY_INVENTORY' | 'LAB_CONSUMABLES' | expense account code
  description?: string
}) {
  const existing: any = await FinanceJournal.findOne({ refType: 'vendor_purchase', refId: args.invoiceNo }).lean()
  if (existing) return existing

  const tags: any = { module: args.module, vendorId: args.vendorId, vendorName: args.vendorName }
  const lines: JournalLine[] = [
    { account: args.inventoryAccount, debit: args.amount, tags },
    { account: 'ACCOUNTS_PAYABLE', credit: args.amount, tags },
  ]
  const memo = args.description || `Purchase from ${args.vendorName} (${args.invoiceNo})`
  return await FinanceJournal.create({
    dateIso: args.dateIso || todayIso(),
    module: args.module,
    refType: 'vendor_purchase',
    refId: args.invoiceNo,
    memo,
    lines,
    status: 'active'
  })
}

// Post vendor payment journal (paying a vendor)
export async function postVendorPaymentJournal(args: {
  paymentRef: string
  dateIso: string
  amount: number
  vendorName: string
  vendorId?: string
  method: 'Cash' | 'Bank'
  module?: string
}) {
  const tags: any = { vendorId: args.vendorId, vendorName: args.vendorName, module: args.module || 'general' }
  const creditAccount = args.method === 'Bank' ? 'BANK' : 'CASH'
  const lines: JournalLine[] = [
    { account: 'ACCOUNTS_PAYABLE', debit: args.amount, tags },
    { account: creditAccount, credit: args.amount, tags },
  ]
  const memo = `Payment to ${args.vendorName}`
  return await FinanceJournal.create({
    dateIso: args.dateIso || todayIso(),
    module: args.module || 'general',
    refType: 'vendor_payment',
    refId: args.paymentRef,
    memo,
    lines,
    status: 'active'
  })
}
