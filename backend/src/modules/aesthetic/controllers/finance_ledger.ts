import { FinanceJournal, type JournalLine } from '../../finance/models/FinanceJournal'
import { AestheticDoctor } from '../models/Doctor'
import { addJournalToShiftCollections, subtractJournalFromShiftCollections, addExpenseToShift } from '../../finance/controllers/shiftLedgerHook'

function todayIso(){
  return new Date().toISOString().slice(0,10)
}

function round2(n: number){
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export async function postOpdTokenJournal(args: { tokenId: string; dateIso: string; fee: number; doctorId?: string; patientName?: string; mrn?: string; tokenNo?: string; paidMethod?: 'Cash'|'Bank'|'AR' }){
  // Idempotent: if an OPD journal exists after latest reversal, reuse
  const lastOpd: any = await FinanceJournal.findOne({ refType: 'aesthetic_opd_token', refId: args.tokenId }).sort({ createdAt: -1 })
  const lastRev: any = await FinanceJournal.findOne({ refType: 'aesthetic_opd_token_reversal', refId: args.tokenId }).sort({ createdAt: -1 }).lean()
  if (lastOpd && (!lastRev || new Date(lastOpd.createdAt) > new Date(lastRev.createdAt))) {
    if (lastOpd.status !== 'reversed') {
      // update
      const doc: any = args.doctorId ? await AestheticDoctor.findById(args.doctorId).lean() : null
      const percent = (doc as any)?.shares ?? 100
      const share = round2((args.fee || 0) * (Math.max(Number(percent)||0,0) / 100))
      const debitAccount = args.paidMethod === 'Bank' ? 'BANK' : (args.paidMethod === 'Cash' ? 'CASH' : 'AR')
      const tagsBase: any = { module: 'aesthetic' }
      if (args.doctorId) tagsBase.doctorId = String(args.doctorId)
      if (args.tokenId) tagsBase.tokenId = String(args.tokenId)
      if (args.patientName) tagsBase.patientName = args.patientName
      if (args.mrn) tagsBase.mrn = args.mrn

      const lines: JournalLine[] = [
        { account: debitAccount, debit: args.fee, tags: { ...tagsBase } },
        { account: 'AESTHETIC_REVENUE', credit: args.fee, tags: { ...tagsBase } },
        { account: 'DOCTOR_SHARE_EXPENSE', debit: share, tags: { ...tagsBase } },
        { account: 'DOCTOR_PAYABLE', credit: share, tags: { ...tagsBase } },
      ]
      lastOpd.lines = lines
      return await lastOpd.save()
    }
  }
  const doc: any = args.doctorId ? await AestheticDoctor.findById(args.doctorId).lean() : null
  const percent = (doc as any)?.shares ?? 100
  const share = round2((args.fee || 0) * (Math.max(Number(percent)||0,0) / 100))
  const debitAccount = args.paidMethod === 'Bank' ? 'BANK' : (args.paidMethod === 'Cash' ? 'CASH' : 'AR')
  const tagsBase: any = { module: 'aesthetic' }
  if (args.doctorId) tagsBase.doctorId = String(args.doctorId)
  if (args.tokenId) tagsBase.tokenId = String(args.tokenId)
  if (args.patientName) tagsBase.patientName = args.patientName
  if (args.mrn) tagsBase.mrn = args.mrn

  const lines: JournalLine[] = [
    { account: debitAccount, debit: args.fee, tags: { ...tagsBase } },
    { account: 'AESTHETIC_REVENUE', credit: args.fee, tags: { ...tagsBase } },
    { account: 'DOCTOR_SHARE_EXPENSE', debit: share, tags: { ...tagsBase } },
    { account: 'DOCTOR_PAYABLE', credit: share, tags: { ...tagsBase } },
  ]
  const memo = `Aesthetic OPD Token ${args.tokenNo ? ('#'+args.tokenNo) : ''}`.trim()
  const journal = await FinanceJournal.create({ dateIso: args.dateIso || todayIso(), module: 'aesthetic', refType: 'aesthetic_opd_token', refId: args.tokenId, memo, lines })

  // Update active shift collections
  await addJournalToShiftCollections({
    module: 'aesthetic',
    refType: 'aesthetic_opd_token',
    amount: Number(args.fee || 0)
  })

  return journal
}

export async function computeDoctorBalance(doctorId: string){
  const rows: any[] = await FinanceJournal.aggregate([
    { $match: { status: { $ne: 'reversed' }, module: 'aesthetic' } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': 'DOCTOR_PAYABLE', 'lines.tags.doctorId': String(doctorId) } },
    { $group: { _id: null, credits: { $sum: { $ifNull: ['$lines.credit', 0] } }, debits: { $sum: { $ifNull: ['$lines.debit', 0] } } } },
  ])
  const credits = Number(rows?.[0]?.credits || 0)
  const debits = Number(rows?.[0]?.debits || 0)
  return round2(credits - debits)
}

export async function createDoctorPayout(doctorId: string, amount: number, method: 'Cash'|'Bank' = 'Cash', memo?: string){
  const dateIso = todayIso()
  const tags = { doctorId: String(doctorId), module: 'aesthetic' }
  const lines: JournalLine[] = [
    { account: 'DOCTOR_PAYABLE', debit: amount, tags },
    { account: method === 'Bank' ? 'BANK' : 'CASH', credit: amount, tags },
  ]
  const journal = await FinanceJournal.create({ dateIso, module: 'aesthetic', refType: 'aesthetic_doctor_payout', refId: doctorId, memo: memo || 'Aesthetic doctor payout', lines })

  // Update active shift expenses
  await addExpenseToShift({
    refType: 'aesthetic_doctor_payout',
    amount: Number(amount || 0)
  })

  return journal
}

export async function manualDoctorEarning(data: { doctorId: string; amount: number; revenueAccount?: 'AESTHETIC_REVENUE'|'PROCEDURE_REVENUE'; paidMethod?: 'Cash'|'Bank'|'AR'; memo?: string; patientName?: string; mrn?: string }){
  const dateIso = todayIso()
  const doctorAmount = round2(Math.max(data.amount || 0, 0))
  const tagsBase: any = { doctorId: String(data.doctorId), module: 'aesthetic' }
  if (data.patientName) tagsBase.patientName = data.patientName
  if (data.mrn) tagsBase.mrn = data.mrn

  const lines: JournalLine[] = [
    { account: 'DOCTOR_SHARE_EXPENSE', debit: doctorAmount, tags: { ...tagsBase } },
    { account: 'DOCTOR_PAYABLE', credit: doctorAmount, tags: { ...tagsBase } },
  ]
  return await FinanceJournal.create({ dateIso, module: 'aesthetic', refType: 'aesthetic_manual_doctor_earning', refId: data.doctorId, memo: data.memo, lines })
}

export async function reverseJournalById(journalId: string, memo?: string){
  const j: any = await FinanceJournal.findById(journalId)
  if (!j) return null
  if (j.status === 'reversed') return j

  const revLines: JournalLine[] = []
  for (const l of (j.lines || [])){
    revLines.push({ account: l.account, debit: l.credit || 0, credit: l.debit || 0, tags: l.tags })
  }

  // Mark original as reversed
  j.status = 'reversed'
  j.reversedAt = new Date().toISOString()
  j.memo = `${j.memo || ''} - ${memo || 'Reversed'}`
  await j.save()

  const r = await FinanceJournal.create({ dateIso: todayIso(), module: 'aesthetic', refType: `${j.refType || 'journal'}_reversal`, refId: String(j._id), memo: memo || `Reversal for journal ${j._id}` , lines: revLines })

  // Subtract from active shift collections
  const amount = j.lines?.reduce((sum: number, l: any) => {
    const revAccounts = ['AESTHETIC_REVENUE','PROCEDURE_REVENUE']
    return revAccounts.includes(l.account) ? sum + (l.credit || 0) : sum
  }, 0) || 0
  if (amount > 0) {
    await subtractJournalFromShiftCollections({
      module: j.module || 'aesthetic',
      refType: j.refType,
      amount
    })
  }

  return r
}

export async function reverseJournalByRef(refType: string, refId: string, memo?: string){
  const list = await FinanceJournal.find({ refType, refId, status: { $ne: 'reversed' } })
  if (!list.length) return null
  const revLines: JournalLine[] = []
  for (const j of list){
    for (const l of (j.lines || [])){
      revLines.push({ account: l.account, debit: l.credit || 0, credit: l.debit || 0, tags: l.tags })
    }
    j.status = 'reversed'
    j.reversedAt = new Date().toISOString()
    await j.save()
  }
  const r = await FinanceJournal.create({ dateIso: todayIso(), module: 'aesthetic', refType: `${refType}_reversal`, refId, memo: memo || `Reversal for ${refType}:${refId}`, lines: revLines })

  // Subtract from active shift collections
  let amount = 0
  for (const j of list){
    amount += (j.lines || []).reduce((sum: number, l: any) => {
      const revAccounts = ['AESTHETIC_REVENUE','PROCEDURE_REVENUE']
      return revAccounts.includes(l.account) ? sum + (l.credit || 0) : sum
    }, 0)
  }
  if (amount > 0) {
    await subtractJournalFromShiftCollections({
      module: list[0]?.module || 'aesthetic',
      refType,
      amount
    })
  }

  return r
}

export async function postProcedureSessionAccrual(args: { sessionId: string; dateIso: string; doctorId?: string; patientName?: string; mrn?: string; procedureName?: string; price?: number; discount?: number; sharePercent?: number; memo?: string }){
  // Idempotent: avoid duplicate for same session unless reversed
  const existing = await FinanceJournal.findOne({ refType: 'aesthetic_procedure_session', refId: args.sessionId }).lean()
  if (existing) return existing as any
  const doc: any = args.doctorId ? await AestheticDoctor.findById(args.doctorId).lean() : null
  const percent = (args.sharePercent != null) ? args.sharePercent : ((doc as any)?.shares ?? 100)
  const net = Math.max(0, Number(args.price||0) - Number(args.discount||0))
  const share = round2(net * (Math.max(Number(percent)||0,0) / 100))
  const tags: any = { module: 'aesthetic' }
  if (args.doctorId) tags.doctorId = String(args.doctorId)
  if (args.patientName) tags.patientName = args.patientName
  if (args.mrn) tags.mrn = args.mrn
  if (args.sessionId) tags.sessionId = String(args.sessionId)
  if (args.procedureName) tags.procedureName = args.procedureName
  const lines: JournalLine[] = [
    { account: 'DOCTOR_SHARE_EXPENSE', debit: share, tags: { ...tags } },
    { account: 'DOCTOR_PAYABLE', credit: share, tags: { ...tags } },
  ]
  const memo = args.memo || `Procedure session${args.procedureName? `: ${args.procedureName}`: ''}`
  return await FinanceJournal.create({ dateIso: args.dateIso || todayIso(), module: 'aesthetic', refType: 'aesthetic_procedure_session', refId: args.sessionId, memo, lines })
}

export async function postProcedurePaymentJournal(args: { tokenId: string; dateIso: string; amount: number; procedureSessionId: string; doctorId?: string; patientName?: string; mrn?: string; procedureName?: string; paidMethod?: 'Cash'|'Bank'|'AR' }){
  // Idempotent per token (each token should post procedure payment at most once unless reversed)
  const lastPay: any = await FinanceJournal.findOne({ refType: 'aesthetic_procedure_payment', refId: args.tokenId }).sort({ createdAt: -1 }).lean()
  const lastRev: any = await FinanceJournal.findOne({ refType: 'aesthetic_procedure_payment_reversal', refId: args.tokenId }).sort({ createdAt: -1 }).lean()
  if (lastPay && (!lastRev || new Date(lastPay.createdAt) > new Date(lastRev.createdAt))) return lastPay as any

  const amt = round2(Math.max(0, Number(args.amount || 0)))
  if (!amt) return null
  const doc: any = args.doctorId ? await AestheticDoctor.findById(args.doctorId).lean() : null
  const percent = (doc as any)?.shares ?? 100
  const share = round2(amt * (Math.max(Number(percent)||0,0) / 100))
  const debitAccount = args.paidMethod === 'Bank' ? 'BANK' : (args.paidMethod === 'Cash' ? 'CASH' : 'AR')
  const tags: any = { module: 'aesthetic' }
  if (args.doctorId) tags.doctorId = String(args.doctorId)
  if (args.tokenId) tags.tokenId = String(args.tokenId)
  if (args.procedureSessionId) tags.sessionId = String(args.procedureSessionId)
  if (args.patientName) tags.patientName = args.patientName
  if (args.mrn) tags.mrn = args.mrn
  if (args.procedureName) tags.procedureName = args.procedureName

  const lines: JournalLine[] = [
    { account: debitAccount, debit: amt, tags: { ...tags } },
    { account: 'AESTHETIC_REVENUE', credit: amt, tags: { ...tags } },
    { account: 'DOCTOR_SHARE_EXPENSE', debit: share, tags: { ...tags } },
    { account: 'DOCTOR_PAYABLE', credit: share, tags: { ...tags } },
  ]
  const memo = `Procedure payment${args.procedureName ? `: ${args.procedureName}` : ''}`
  const journal = await FinanceJournal.create({ dateIso: args.dateIso || todayIso(), module: 'aesthetic', refType: 'aesthetic_procedure_payment', refId: args.tokenId, memo, lines })

  // Update active shift collections
  await addJournalToShiftCollections({
    module: 'aesthetic',
    refType: 'aesthetic_procedure_payment',
    amount: Number(args.amount || 0)
  })

  return journal
}
