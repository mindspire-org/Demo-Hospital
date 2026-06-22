import { Request, Response } from 'express'
import { z } from 'zod'
import { FinanceJournal } from '../models/FinanceJournal'
import { ChartOfAccount } from '../models/ChartOfAccount'
import { createDoctorPayout, manualDoctorEarning, computeDoctorBalance, reverseJournalById } from './finance_ledger'

const manualDoctorEarningSchema = z.object({
  doctorId: z.string().min(1),
  departmentId: z.string().optional(),
  departmentName: z.string().optional(),
  phone: z.string().optional(),
  amount: z.number().positive(),
  revenueAccount: z.enum(['OPD_REVENUE','PROCEDURE_REVENUE','IPD_REVENUE']).optional(),
  paidMethod: z.enum(['Cash','Bank','AR']).optional(),
  memo: z.string().optional(),
  sharePercent: z.number().min(0).max(100).optional(),
  patientName: z.string().optional(),
  mrn: z.string().optional(),
  createdByUsername: z.string().optional(),
})

const doctorPayoutSchema = z.object({
  doctorId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(['Cash','Bank']).default('Cash'),
  memo: z.string().optional(),
  sourceAccount: z.string().optional(),
  destinationAccount: z.string().optional(),
})

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export async function listCashBankAccounts(req: Request, res: Response) {
  const includeBalance = String((req.query as any)?.includeBalance || '') === 'true'
  const activeFilter = (req.query as any)?.active
  const filter: any = { type: 'ASSETS', subType: { $in: ['CASH & BANK', 'Cash & Bank', 'CASH', 'BANK', 'Cash', 'Bank'] } }
  if (activeFilter !== undefined) {
    const wantsActive = typeof activeFilter === 'string' ? activeFilter !== 'false' : !!activeFilter
    if (wantsActive) filter.active = { $ne: false }
    else filter.active = false
  }

  const accounts = await ChartOfAccount.find(filter).sort({ code: 1, name: 1 }).lean()

  const mapped = []
  for (const acc of accounts as any[]) {
    let balance = acc.balance || 0
    if (includeBalance) {
      balance = await computeAccountBalanceForDoc(acc)
    }
    mapped.push({
      id: String(acc._id),
      code: acc.code || acc.name,
      name: acc.name,
      systemNames: acc.systemNames || [],
      active: acc.active,
      balance,
    })
  }

  res.json({ accounts: mapped })
}

export async function getCashBankAccountBalance(req: Request, res: Response) {
  const id = String(req.params.id)
  const account: any = await ChartOfAccount.findById(id).lean()
  if (!account) return res.status(404).json({ error: 'Account not found' })

  const balance = await computeAccountBalanceForDoc(account)
  res.json({ balance, account: { id, name: account.name, code: account.code } })
}

async function computeAccountBalanceForDoc(account: any) {
  if (!account) return 0
  const searchTerms = [account.code, account.name, ...(account.systemNames || [])]
    .filter(Boolean)
    .map((s: string) => s.trim().toUpperCase())
  if (!searchTerms.length) return 0

  const journalLines = await FinanceJournal.aggregate([
    { $unwind: '$lines' },
    {
      $match: {
        'lines.account': {
          $in: searchTerms.map((s: string) => new RegExp(`^${s}$`, 'i')),
        },
      },
    },
    {
      $group: {
        _id: null,
        debit: { $sum: { $ifNull: ['$lines.debit', 0] } },
        credit: { $sum: { $ifNull: ['$lines.credit', 0] } },
      },
    },
  ])

  const debit = journalLines?.[0]?.debit || 0
  const credit = journalLines?.[0]?.credit || 0
  const isAssetOrExpense = ['ASSETS', 'EXPENSE'].includes(account.type)
  return round2(isAssetOrExpense ? debit - credit : credit - debit)
}

export async function postManualDoctorEarning(req: Request, res: Response){
  const data = manualDoctorEarningSchema.parse(req.body)
  const createdByUsername = String((req as any).user?.username || (req as any).user?.name || '')
  const finalCreatedBy = createdByUsername || String((data as any)?.createdByUsername || '')
  const j = await manualDoctorEarning({ ...(data as any), createdByUsername: finalCreatedBy || undefined } as any)
  res.status(201).json({ journal: j })
}

export async function reverseJournal(req: Request, res: Response){
  const id = String(req.params.id)
  const memo = String((req.body as any)?.memo || '')
  const r = await reverseJournalById(id, memo)
  if (!r) return res.status(404).json({ error: 'Journal not found' })
  res.json({ reversed: r })
}

export async function deleteManualEarning(req: Request, res: Response){
  const id = String(req.params.id)
  const j: any = await FinanceJournal.findById(id)
  if (!j) return res.status(404).json({ error: 'Journal not found' })
  // Only allow deletion of manual_doctor_earning entries
  if (j.refType !== 'manual_doctor_earning') {
    return res.status(400).json({ error: 'Only manual entries can be deleted' })
  }
  await FinanceJournal.deleteOne({ _id: id })
  res.json({ deleted: true, id })
}

export async function listDoctorEarnings(req: Request, res: Response){
  const doctorId = (req.query as any)?.doctorId ? String((req.query as any).doctorId) : undefined
  const from = String((req.query as any)?.from || '')
  const to = String((req.query as any)?.to || '')
  const M = require('mongoose')
  const matchDateIso = (from && to) ? { dateIso: { $gte: from, $lte: to } } : {}

  // Also match by createdAt using Pakistan-local day boundaries (UTC+5)
  // This prevents after-midnight tokens (Pakistan time) from being counted in the previous UTC date.
  const PAKISTAN_OFFSET_MS = 5 * 60 * 60 * 1000
  const parseIsoYmd = (s: string) => {
    const m = /^\d{4}-\d{2}-\d{2}$/.exec(String(s || ''))
    if (!m) return null
    const [y, mo, d] = s.split('-').map(n => Number(n))
    if (!y || !mo || !d) return null
    return { y, mo, d }
  }
  const fromYmd = parseIsoYmd(from)
  const toYmd = parseIsoYmd(to)
  const matchCreatedAt = (fromYmd && toYmd) ? (() => {
    const fromStartUtcMs = Date.UTC(fromYmd.y, fromYmd.mo - 1, fromYmd.d, 0, 0, 0, 0) - PAKISTAN_OFFSET_MS
    const toEndUtcMs = (Date.UTC(toYmd.y, toYmd.mo - 1, toYmd.d, 0, 0, 0, 0) - PAKISTAN_OFFSET_MS) + (24 * 60 * 60 * 1000) - 1
    return { createdAt: { $gte: new Date(fromStartUtcMs), $lte: new Date(toEndUtcMs) } }
  })() : {}

  const matchDate = (from && to) ? { $or: [matchDateIso, matchCreatedAt] } : {}
  const matchDoctor = doctorId ? { 'lines.tags.doctorId': new M.Types.ObjectId(doctorId) } : {}
  const rows = await FinanceJournal.aggregate([
    // Only include active journals (not reversed)
    { $match: { ...matchDate, refType: { $in: ['opd_token','manual_doctor_earning'] }, status: { $ne: 'reversed' } } },
    { $addFields: { allLines: '$lines' } },
    { $unwind: '$lines' },
    { $match: { 
        'lines.account': { $in: ['DOCTOR_PAYABLE','OPD_REVENUE','IPD_REVENUE','PROCEDURE_REVENUE','CASH','BANK','AR'] }, 
        'lines.tags.doctorId': { $exists: true, $ne: null },
        ...(doctorId? matchDoctor : {}) 
      } 
    },
    { $lookup: {
        from: 'hospital_finance_journals',
        let: { origId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$refId', { $toString: '$$origId' }] } } },
        ],
        as: 'reversals'
      }
    },
    { $addFields: { _revCount: { $size: '$reversals' } } },
    { $match: { _revCount: { $eq: 0 } } },
    { $addFields: { _tidStr: { $toString: '$lines.tags.tokenId' } } },
    { $lookup: {
        from: 'hospital_finance_journals',
        let: { tidStr: '$_tidStr' },
        pipeline: [
          { $match: { $expr: { $and: [ { $eq: ['$refType','opd_token_reversal'] }, { $eq: ['$refId','$$tidStr'] } ] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
        ],
        as: 'revForToken'
      }
    },
    { $addFields: { _lastRev: { $arrayElemAt: ['$revForToken', 0] } } },
    { $addFields: { _keep: { $or: [ { $eq: ['$_lastRev', null] }, { $gt: ['$updatedAt', '$_lastRev.createdAt'] } ] } } },
    { $match: { _keep: { $eq: true } } },
    { $lookup: {
        from: 'hospital_tokens',
        let: { tidStr: '$_tidStr' },
        pipeline: [
          { $match: { $expr: { $eq: [ { $toString: '$_id' }, '$$tidStr' ] } } },
          { $project: { patientName: 1, mrn: 1, tokenNo: 1, fee: 1, discount: 1, visitCategory: 1, departmentId: 1 } }
        ],
        as: 'tok'
      }
    },
    { $addFields: { token: { $arrayElemAt: ['$tok', 0] } } },
    { $lookup: {
        from: 'hospital_departments',
        let: { deptId: { $ifNull: ['$token.departmentId', '$lines.tags.departmentId'] } },
        pipeline: [
          { $match: { $expr: { $eq: [ { $toString: '$_id' }, { $toString: '$$deptId' } ] } } },
          { $project: { name: 1 } }
        ],
        as: 'dept'
      }
    },
    { $addFields: { deptName: { $arrayElemAt: ['$dept.name', 0] } } },
    { $addFields: {
        revenueLine: {
          $arrayElemAt: [
            { $filter: { input: '$allLines', as: 'l', cond: { $in: ['$$l.account', ['OPD_REVENUE','IPD_REVENUE','PROCEDURE_REVENUE']] } } },
            0
          ]
        }
      }
    },
    { $project: { 
        _id: 1, dateIso: 1, refType: 1, refId: 1, memo: 1, line: '$lines', allLines: 1, revenueAccount: '$revenueLine.account', revenueAccountFromTags: '$lines.tags.revenueAccount',
        createdAt: 1,
        patientName: { $ifNull: ['$token.patientName', '$lines.tags.patientName'] },
        mrn: { $ifNull: ['$token.mrn', '$lines.tags.mrn'] },
        tokenNo: '$token.tokenNo',
        fee: '$token.fee',
        discount: '$token.discount',
        visitCategory: '$lines.tags.visitCategory',
        departmentId: '$lines.tags.departmentId',
        departmentName: { $ifNull: ['$lines.tags.departmentName', '$deptName'] },
        phone: '$lines.tags.phone'
      } 
    },
    { $sort: { dateIso: -1, _id: -1 } },
    { $limit: 500 },
  ])
  // Deduplicate: a single journal may have both DOCTOR_PAYABLE and OPD_REVENUE lines
  const seen = new Set<string>()
  const deduped = rows.filter((r: any) => {
    const key = String(r._id)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Look up doctor shares from Doctor collection
  // Collect doctor IDs from both the matched line and all lines (for journals without DOCTOR_PAYABLE)
  const doctorIds = Array.from(new Set(deduped.flatMap((r: any) => {
    const ids: string[] = []
    // From the matched line
    if (r.line?.tags?.doctorId) ids.push(String(r.line.tags.doctorId))
    // From all lines (for OPD_REVENUE lines that have doctorId)
    if (r.allLines) {
      for (const l of r.allLines) {
        if (l?.tags?.doctorId) ids.push(String(l.tags.doctorId))
      }
    }
    return ids
  }).filter(Boolean)))
  const doctorShares = new Map<string, number>()
  const doctorNames = new Map<string, string>()
  try {
    if (doctorIds.length) {
      const { HospitalDoctor } = await import('../../hospital/models/Doctor')
      const docs: any[] = await HospitalDoctor.find({ _id: { $in: doctorIds } }).select('shares name').lean()
      for (const d of docs) {
        doctorShares.set(String(d._id), Number((d as any).shares ?? 100))
        doctorNames.set(String(d._id), String((d as any).name || 'Doctor'))
      }
    }
  } catch {}

  const items = deduped.map((r: any) => {
    // Find the DOCTOR_PAYABLE line within allLines to get the actual doctor amount
    const payableLine = (r.allLines || []).find((l: any) => l.account === 'DOCTOR_PAYABLE')
    const doctorAmount = Number(payableLine?.credit || 0)
    const isOpd = r.refType === 'opd_token'
    const fee = Number(r?.fee ?? 0)
    const discount = Number(r?.discount ?? 0)
    const gross = (Number.isFinite(fee) ? fee : 0) + (Number.isFinite(discount) ? discount : 0)
    // Extract doctor ID from matched line or any line in allLines
    let docId: string | undefined
    if (r.line?.tags?.doctorId) {
      docId = String(r.line.tags.doctorId)
    } else if (r.allLines) {
      for (const l of r.allLines) {
        if (l?.tags?.doctorId) { docId = String(l.tags.doctorId); break }
      }
    }
    const sharePercent = docId ? (doctorShares.get(docId) ?? 100) : (isOpd && fee > 0 ? ((doctorAmount / fee) * 100) : null)
    const revenueAccount = String(r.revenueAccount || r.revenueAccountFromTags || '')
    return ({
      id: String(r._id),
      dateIso: r.dateIso,
      createdAt: r.createdAt,
      doctorId: docId,
      doctorName: docId ? (doctorNames.get(docId) || 'Doctor') : 'Doctor',
      departmentId: r.line?.tags?.departmentId ? String(r.line.tags.departmentId) : undefined,
      tokenId: r.line?.tags?.tokenId ? String(r.line.tags.tokenId) : undefined,
      type: r.refType === 'opd_token' ? 'OPD' : (revenueAccount === 'PROCEDURE_REVENUE' ? 'Procedure' : (revenueAccount === 'IPD_REVENUE' ? 'IPD' : (revenueAccount === 'OPD_REVENUE' ? 'OPD' : 'Other'))),
      amount: doctorAmount,
      memo: r.memo,
      patientName: r.patientName,
      mrn: r.mrn,
      tokenNo: r.tokenNo,
      departmentName: r.departmentName,
      visitCategory: r.visitCategory,
      phone: r.phone,
      fee: Number.isFinite(fee) ? fee : undefined,
      discount: Number.isFinite(discount) ? discount : undefined,
      gross: Number.isFinite(gross) ? gross : undefined,
      sharePercent: sharePercent != null ? sharePercent : null,
    })
  })
  res.json({ earnings: items })
}

export async function postDoctorPayout(req: Request, res: Response){
  const data = doctorPayoutSchema.parse(req.body)
  let sessionId: string | undefined = undefined
  // Note: CashSession is in hospital module - will need cross-module import or pass as param
  // For now, remove session lookup to avoid circular dependency
  const j: any = await createDoctorPayout(data.doctorId, data.amount, data.method, data.memo, sessionId, data.sourceAccount, data.destinationAccount)
  // Best-effort tagging of createdBy for reporting
  try {
    const createdByUserId = String((req as any).user?._id || (req as any).user?.id || '')
    const createdByUsername = String((req as any).user?.username || '')
    if (j?._id && (createdByUserId || createdByUsername)){
      const tagsPatch: any = {}
      if (createdByUserId) tagsPatch['lines.$[].tags.createdByUserId'] = createdByUserId
      if (createdByUsername) tagsPatch['lines.$[].tags.createdByUsername'] = createdByUsername
      // Use updateOne with $set on array elements (Mongo supports $[])
      await FinanceJournal.updateOne({ _id: j._id }, { $set: tagsPatch })
    }
  } catch {}
  res.status(201).json({ journal: j })
}

export async function getDoctorBalance(req: Request, res: Response){
  const id = String(req.params.id)
  const balance = await computeDoctorBalance(id)
  res.json({ doctorId: id, payable: balance })
}

export async function listDoctorPayouts(req: Request, res: Response){
  const id = String(req.params.id)
  const limit = Math.min(parseInt(String((req.query as any)?.limit || '20')) || 20, 100)
  const rows = await FinanceJournal.find({ refType: 'doctor_payout', refId: id }).sort({ createdAt: -1 }).limit(limit).lean()
  const items = rows.map((j: any) => {
    const createdByUsername = (j.lines || []).find((l: any) => l?.tags?.createdByUsername)?.tags?.createdByUsername
    const createdByUserId = (j.lines || []).find((l: any) => l?.tags?.createdByUserId)?.tags?.createdByUserId
    const cash = (j.lines || [])
      .filter((l: any) => l.account === 'CASH' || l.account === 'BANK')
      .reduce((s: number, l: any) => s + (l.credit || 0), 0)
    const amount = cash || (j.lines || [])
      .filter((l: any) => l.account === 'DOCTOR_PAYABLE')
      .reduce((s: number, l: any) => s + (l.debit || 0), 0)
    return { id: String(j._id), refId: j.refId, dateIso: j.dateIso, memo: j.memo, amount, createdByUsername, createdByUserId }
  })
  res.json({ payouts: items })
}

export async function listAllTransactions(req: Request, res: Response){
  try {
  const from = String((req.query as any)?.from || '')
  const to = String((req.query as any)?.to || '')
  const type = String((req.query as any)?.type || 'All')
  const method = String((req.query as any)?.method || '')
  const q = String((req.query as any)?.q || '')
  const page = Math.max(1, parseInt(String((req.query as any)?.page || '1')))
  const limit = Math.min(200, Math.max(1, parseInt(String((req.query as any)?.limit || '50'))))
  const skip = (page - 1) * limit

  const doctorId = String((req.query as any)?.doctorId || '')
  const departmentId = String((req.query as any)?.departmentId || '')
  const serviceName = String((req.query as any)?.serviceName || '')
  const username = String((req.query as any)?.username || '')

  const M = require('mongoose')
  const matchStage: any = {}
  
  if (from && to) {
    // If 'to' is a date like '2026-05-03', we want to include everything up to the end of that day
    const toDate = to.length === 10 ? `${to}T23:59:59.999Z` : to
    matchStage.dateIso = { $gte: from, $lte: toDate }
  } else if (from) {
    matchStage.dateIso = { $gte: from }
  } else if (to) {
    const toDate = to.length === 10 ? `${to}T23:59:59.999Z` : to
    matchStage.dateIso = { $lte: toDate }
  }

  // Performed by filter
  if (username) {
    matchStage['lines.tags.createdByUsername'] = username
  }
  // Doctor filter
  if (doctorId) {
    matchStage['lines.tags.doctorId'] = new M.Types.ObjectId(doctorId)
  }
  // Department filter
  if (departmentId) {
    matchStage['lines.tags.departmentId'] = new M.Types.ObjectId(departmentId)
  }
  // Service filter
  if (serviceName) {
    matchStage['lines.tags.serviceNames'] = { $regex: serviceName, $options: 'i' }
  }

  // Type filter
  if (type !== 'All') {
    const refTypeMap: any = {
      'General': 'opd_token',
      'Private': 'opd_token',
      'Subsidized': 'opd_token',
      'ER': 'er_billing',
      'IPD': 'ipd_payment',
      'Lab': 'lab_order',
      'Diagnostic': 'diagnostic_order',
      'Pharmacy': 'pharmacy_sale',
    }
    const visitCategoryMap: any = {
      'General': 'general',
      'Private': 'private',
      'Subsidized': 'subsidized',
    }
    if (refTypeMap[type]) {
      matchStage.refType = refTypeMap[type]
      // For token visit category types, also filter by visitCategory in tags
      if (visitCategoryMap[type]) {
        matchStage['lines.tags.visitCategory'] = visitCategoryMap[type]
      }
    } else if (type === 'Doctor Payout') {
      matchStage.refType = 'doctor_payout'
    }
  } else {
    // Show all system-generated transactions in 'All' view
    matchStage.refType = { $in: ['opd_token', 'er_billing', 'ipd_payment', 'lab_order', 'diagnostic_order', 'pharmacy_sale', 'doctor_payout'] }
  }

  // Method filter - look in lines.tags.method or derive from accounts
  const pipeline: any[] = [{ $match: matchStage }]

  // Add computed fields for easier filtering/sorting
  pipeline.push({
    $addFields: {
      // Compute total amount (revenue side) - look for credit in CASH/BANK lines as that's the received amount
      totalAmount: {
        $sum: {
          $map: {
            input: '$lines',
            as: 'line',
            in: {
              $cond: [
                { $in: ['$$line.account', ['CASH', 'BANK']] },
                { $max: ['$$line.credit', '$$line.debit'] },
                0
              ]
            }
          }
        }
      },
      // Extract fee from revenue lines. For normal sales journals, revenue is recorded as CREDIT.
      // For reversal journals, the revenue line will be a DEBIT.
      feeFromRevenueCredit: {
        $arrayElemAt: [
          { $filter: { input: '$lines', as: 'l', cond: { $in: ['$$l.account', ['OPD_REVENUE', 'IPD_REVENUE', 'ER_REVENUE', 'PROCEDURE_REVENUE', 'LAB_REVENUE', 'DIAGNOSTIC_REVENUE', 'PHARMACY_REVENUE']] } } },
          0
        ]
      },
      feeFromRevenueDebit: {
        $arrayElemAt: [
          { $filter: { input: '$lines', as: 'l', cond: { $in: ['$$l.account', ['OPD_REVENUE', 'IPD_REVENUE', 'ER_REVENUE', 'PROCEDURE_REVENUE', 'LAB_REVENUE', 'DIAGNOSTIC_REVENUE', 'PHARMACY_REVENUE']] } } },
          0
        ]
      },
      // Extract discount from DISCOUNT line
      doctorPayableLine: {
        $arrayElemAt: [
          { $filter: { input: '$lines', as: 'l', cond: { $eq: ['$$l.account', 'DOCTOR_PAYABLE'] } } },
          0
        ]
      },
      discountLine: {
        $arrayElemAt: [
          { $filter: { input: '$lines', as: 'l', cond: { $eq: ['$$l.account', 'DISCOUNT'] } } },
          0
        ]
      },
      // Determine if cash or bank from lines
      // For revenue journals: CASH/BANK has debit (money received)
      // For reversals: CASH/BANK has credit (money returned)
      // For payouts: CASH/BANK has credit (money paid out)
      paymentMethod: {
        $let: {
          vars: {
            cashLine: { $arrayElemAt: [{ $filter: { input: '$lines', as: 'l', cond: { $eq: ['$$l.account', 'CASH'] } } }, 0] },
            bankLine: { $arrayElemAt: [{ $filter: { input: '$lines', as: 'l', cond: { $eq: ['$$l.account', 'BANK'] } } }, 0] },
          },
          in: {
            $cond: [
              { $gt: [{ $max: ['$$cashLine.debit', '$$cashLine.credit'] }, 0] },
              'cash',
              { $cond: [{ $gt: [{ $max: ['$$bankLine.debit', '$$bankLine.credit'] }, 0] }, 'bank', 'other'] }
            ]
          }
        }
      },
      // Extract patient info from tags - try multiple locations
      patientName: { 
        $ifNull: [
          { $arrayElemAt: [{ $map: { input: { $filter: { input: '$lines', as: 'l', cond: { $ne: ['$$l.tags.patientName', null] } } }, as: 'x', in: '$$x.tags.patientName' } }, 0] },
          { $arrayElemAt: [{ $map: { input: { $filter: { input: '$lines', as: 'l', cond: { $ne: ['$$l.tags.patientName', null] } } }, as: 'x', in: '$$x.tags.patientName' } }, 0] }
        ]
      },
      mrn: { $arrayElemAt: [{ $map: { input: { $filter: { input: '$lines', as: 'l', cond: { $ne: ['$$l.tags.mrn', null] } } }, as: 'x', in: '$$x.tags.mrn' } }, 0] },
      departmentNameFromTags: { $arrayElemAt: [{ $map: { input: { $filter: { input: '$lines', as: 'l', cond: { $ne: ['$$l.tags.departmentName', null] } } }, as: 'x', in: '$$x.tags.departmentName' } }, 0] },
      doctorId: { $arrayElemAt: [{ $map: { input: { $filter: { input: '$lines', as: 'l', cond: { $ne: ['$$l.tags.doctorId', null] } } }, as: 'x', in: '$$x.tags.doctorId' } }, 0] },
      departmentId: { $arrayElemAt: [{ $map: { input: { $filter: { input: '$lines', as: 'l', cond: { $ne: ['$$l.tags.departmentId', null] } } }, as: 'x', in: '$$x.tags.departmentId' } }, 0] },
      tokenId: { $arrayElemAt: [{ $map: { input: { $filter: { input: '$lines', as: 'l', cond: { $ne: ['$$l.tags.tokenId', null] } } }, as: 'x', in: '$$x.tags.tokenId' } }, 0] },
      encounterId: { $arrayElemAt: [{ $map: { input: { $filter: { input: '$lines', as: 'l', cond: { $ne: ['$$l.tags.encounterId', null] } } }, as: 'x', in: '$$x.tags.encounterId' } }, 0] },
      tokenNoFromTags: { $arrayElemAt: [{ $map: { input: { $filter: { input: '$lines', as: 'l', cond: { $ne: ['$$l.tags.tokenNo', null] } } }, as: 'x', in: '$$x.tags.tokenNo' } }, 0] },
      serviceNames: { $arrayElemAt: [{ $map: { input: { $filter: { input: '$lines', as: 'l', cond: { $ne: ['$$l.tags.serviceNames', null] } } }, as: 'x', in: '$$x.tags.serviceNames' } }, 0] },
      createdByUsername: { $arrayElemAt: [{ $map: { input: { $filter: { input: '$lines', as: 'l', cond: { $ne: ['$$l.tags.createdByUsername', null] } } }, as: 'x', in: '$$x.tags.createdByUsername' } }, 0] },
      visitCategory: { $arrayElemAt: [{ $map: { input: { $filter: { input: '$lines', as: 'l', cond: { $ne: ['$$l.tags.visitCategory', null] } } }, as: 'x', in: '$$x.tags.visitCategory' } }, 0] },
    }
  })

  // Method filter in pipeline
  if (method && method !== 'all') {
    pipeline.push({
      $match: {
        $or: [
          { paymentMethod: method },
          { 'lines.tags.method': method }
        ]
      }
    })
  }

  // Text search filter
  if (q) {
    const qLower = q.toLowerCase()
    pipeline.push({
      $match: {
        $or: [
          { memo: { $regex: q, $options: 'i' } },
          { patientName: { $regex: q, $options: 'i' } },
          { mrn: { $regex: q, $options: 'i' } },
          { serviceNames: { $regex: q, $options: 'i' } },
          { refId: { $regex: q, $options: 'i' } }
        ]
      }
    })
  }

  // Lookup for doctor name
  if (type === 'All' || type === 'General' || type === 'Private' || type === 'Subsidized') {
    pipeline.push({
      $lookup: {
        from: 'hospital_doctors',
        let: { docId: '$doctorId' },
        pipeline: [{ $match: { $expr: { $and: [
          { $ne: ['$$docId', null] },
          { $ne: ['$$docId', ''] },
          { $eq: ['$_id', { $convert: { input: '$$docId', to: 'objectId', onError: null } }] }
        ] } } }, { $project: { name: 1 } }],
        as: 'doctor'
      }
    })
  } else {
    pipeline.push({ $addFields: { doctor: [] } })
  }

  // Lookup for department name
  if (type === 'All' || type === 'General' || type === 'Private' || type === 'Subsidized') {
    pipeline.push({
      $lookup: {
        from: 'hospital_departments',
        let: { depId: '$departmentId' },
        pipeline: [{ $match: { $expr: { $and: [
          { $ne: ['$$depId', null] },
          { $ne: ['$$depId', ''] },
          { $eq: ['$_id', { $convert: { input: '$$depId', to: 'objectId', onError: null } }] }
        ] } } }, { $project: { name: 1 } }],
        as: 'department'
      }
    })
  } else {
    pipeline.push({ $addFields: { department: [] } })
  }

  // Lookup for token to get fee/discount info
  if (type === 'All' || type === 'General' || type === 'Private' || type === 'Subsidized') {
    pipeline.push({
      $lookup: {
        from: 'hospital_tokens',
        let: { tid: '$tokenId' },
        pipeline: [
          { $match: { $expr: { $eq: [{ $toString: '$_id' }, '$$tid'] } } },
          { $project: { fee: 1, discount: 1, status: 1, tokenNo: 1, serviceNames: 1 } }
        ],
        as: 'token'
      }
    })
  } else {
    pipeline.push({ $addFields: { token: [] } })
  }

  // Lookup for token by encounterId (ER/IPD payments may not have tokenId tagged)
  pipeline.push({
    $lookup: {
      from: 'hospital_tokens',
      let: { encId: '$encounterId' },
      pipeline: [
        { $match: { $expr: { $eq: [ { $toString: '$encounterId' }, { $toString: '$$encId' } ] } } },
        { $project: { tokenNo: 1 } },
        { $limit: 1 },
      ],
      as: 'tokenByEncounter'
    }
  })

  // Count total
  const countPipeline = [...pipeline, { $count: 'total' }]
  const countResult = await FinanceJournal.aggregate(countPipeline)
  const total = countResult[0]?.total || 0

  // Add pagination and final projection
  pipeline.push(
    { $sort: { dateIso: -1, createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        id: { $toString: '$_id' },
        dateIso: 1,
        createdAt: 1,
        refType: 1,
        refId: 1,
        memo: 1,
        totalAmount: 1,
        paymentMethod: 1,
        patientName: 1,
        mrn: 1,
        doctorId: 1,
        doctorName: { $arrayElemAt: ['$doctor.name', 0] },
        departmentId: 1,
        departmentName: { $ifNull: [ { $arrayElemAt: ['$department.name', 0] }, '$departmentNameFromTags' ] },
        tokenId: 1,
        encounterId: 1,
        token: { $arrayElemAt: ['$token', 0] },
        tokenByEncounter: { $arrayElemAt: ['$tokenByEncounter', 0] },
        tokenNoFromTags: 1,
        serviceNames: { $ifNull: ['$serviceNames', { $arrayElemAt: ['$token.serviceNames', 0] }] },
        createdByUsername: 1,
        doctorPayableLine: 1,
        // Extract fee from revenue line (credit for normal, debit for reversals)
        fee: {
          $ifNull: [
            '$feeFromRevenueCredit.credit',
            { $ifNull: ['$feeFromRevenueDebit.debit', '$totalAmount'] }
          ]
        },
        // Extract discount
        discount: { $ifNull: ['$discountLine.debit', 0] },
        type: {
          $switch: {
            branches: [
              { case: { $and: [{ $eq: ['$refType', 'opd_token'] }, { $eq: ['$visitCategory', 'private'] }] }, then: 'Private' },
              { case: { $and: [{ $eq: ['$refType', 'opd_token'] }, { $eq: ['$visitCategory', 'subsidized'] }] }, then: 'Subsidized' },
              { case: { $eq: ['$refType', 'opd_token'] }, then: 'General' },
              { case: { $eq: ['$refType', 'lab_order'] }, then: 'Lab' },
              { case: { $eq: ['$refType', 'diagnostic_order'] }, then: 'Diagnostic' },
              { case: { $eq: ['$refType', 'pharmacy_sale'] }, then: 'Pharmacy' },
              { case: { $eq: ['$refType', 'ipd_payment'] }, then: 'IPD' },
              { case: { $eq: ['$refType', 'er_billing'] }, then: 'ER' },
            ],
            default: 'Other'
          }
        },
        journalStatus: '$status', // Include journal status
        status: { $ifNull: ['$token.status', { $cond: [{ $eq: ['$refType', 'expense'] }, 'completed', 'completed'] }] },
        isReturned: { $eq: ['$status', 'reversed'] },
      }
    }
  )

  const rows = await FinanceJournal.aggregate(pipeline)
  
  // Post-process to calculate final fields
  const items = rows.map((r: any) => {
    const doctorPayableCredit = Number((r as any)?.doctorPayableLine?.credit || 0)
    const baseFee = r.token?.fee || r.fee || 0
    const fee = (r.refType === 'manual_doctor_earning' && baseFee === 0) ? doctorPayableCredit : baseFee
    const tokenDiscount = r.token?.discount || r.discount || 0
    const netAmount = r.refType === 'manual_doctor_earning'
      ? fee
      : (fee - tokenDiscount)
    return {
      ...r,
      // Use token fee if available (from token lookup), otherwise use fee from revenue line
      fee,
      tokenDiscount,
      // Use tokenNo from token lookup, or from tags, or extract from memo
      tokenNo: r.token?.tokenNo || r.tokenNoFromTags || r.tokenByEncounter?.tokenNo || (r.memo?.match(/#(\d+)/)?.[1]),
      // Determine if token was returned (check journal status)
      isReturned: r.journalStatus === 'reversed' || r.refType === 'opd_token_reversal' || r.token?.status === 'returned',
      // Calculate net (after discount if applicable)
      netAmount,
      // Status from journal or token
      status: r.journalStatus === 'reversed' ? 'returned' : (r.token?.status || 'completed'),
      // Pass through createdByUsername
      createdByUsername: r.createdByUsername,
    }
  })

  res.json({
    transactions: items,
    total: items.length,
    page,
    totalPages: Math.ceil(items.length / limit),
    summary: {
      totalRevenue: items.reduce((s: number, x: any) => s + (x.fee || 0), 0),
      totalDiscount: items.reduce((s: number, x: any) => s + (x.tokenDiscount || 0), 0),
      netIncome: 0, // calculated below
    }
  })
  } catch (e: any) {
    console.error('listAllTransactions error:', e)
    return res.status(500).json({ error: e?.message || 'Failed to fetch transactions' })
  }
}

export async function doctorAccruals(req: Request, res: Response){
  const id = String(req.params.id)
  const from = String((req.query as any)?.from || '')
  const to = String((req.query as any)?.to || '')
  if (!from || !to) return res.status(400).json({ error: 'from and to (YYYY-MM-DD) required' })
  const rows = await FinanceJournal.aggregate([
    { $match: { dateIso: { $gte: from, $lte: to } } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': 'DOCTOR_PAYABLE', 'lines.tags.doctorId': { $exists: true } } },
    { $group: {
      _id: '$lines.tags.doctorId',
      accruals: { $sum: { $ifNull: ['$lines.credit', 0] } },
      debits: { $sum: { $ifNull: ['$lines.debit', 0] } },
    }},
    { $project: { _id: 0, accruals: 1, debits: 1 } }
  ])
  const accruals = Number(rows?.[0]?.accruals || 0)
  const debits = Number(rows?.[0]?.debits || 0)
  const suggested = Math.max(accruals - debits, 0)
  res.json({ doctorId: id, from, to, accruals, debits, suggested })
}

// Get company-wise Accounts Receivable breakdown
export async function getCorporateARBreakdown(req: Request, res: Response){
  try {
    const from = String((req.query as any)?.from || '')
    const to = String((req.query as any)?.to || '')
    
    // Aggregate AR from CorporateTransaction model
    // AR = netToCorporate - paidAmount for non-reversed/non-rejected transactions
    const { CorporateTransaction } = await import('../../corporate/models/Transaction')
    
    const matchStage: any = {
      status: { $nin: ['reversed', 'rejected'] }
    }
    
    // Add date filter if provided
    if (from && to) {
      matchStage.dateIso = { $gte: from, $lte: to }
    }
    
    const pipeline: any[] = [
      { $match: matchStage },
      { $group: {
        _id: '$companyId',
        totalNetToCorporate: { $sum: { $ifNull: ['$netToCorporate', 0] } },
        totalPaidAmount: { $sum: { $ifNull: ['$paidAmount', 0] } },
      }},
      { $project: { 
        _id: 0, 
        companyId: '$_id', 
        balance: { $subtract: ['$totalNetToCorporate', '$totalPaidAmount'] }
      }},
      { $match: { balance: { $gt: 0 } } },
      { $sort: { balance: -1 } }
    ]
    
    const rows = await CorporateTransaction.aggregate(pipeline)
    
    // Get company names
    const M = require('mongoose')
    const companyIds = rows.map((r: any) => r.companyId).filter(Boolean)
    let companies: any[] = []
    if (companyIds.length > 0) {
      try {
        const { CorporateCompany } = await import('../../corporate/models/Company')
        companies = await CorporateCompany.find({ 
          _id: { $in: companyIds.map((id: string) => new M.Types.ObjectId(id)) } 
        }).select('_id name').lean()
      } catch {}
    }
    
    const companyMap: Record<string, string> = {}
    for (const c of companies) companyMap[String(c._id)] = c.name
    
    const items = rows.map((r: any) => ({
      companyId: String(r.companyId),
      companyName: companyMap[String(r.companyId)] || 'Unknown Company',
      balance: Math.max(0, r.balance)
    })).filter((r: any) => r.balance > 0)
    
    const totalAR = items.reduce((s: number, r: any) => s + r.balance, 0)
    
    res.json({ items, totalAR, count: items.length })
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch AR breakdown' })
  }
}
