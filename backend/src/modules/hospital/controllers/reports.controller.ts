import { Request, Response } from 'express'
import { Types } from 'mongoose'
import { HospitalUser } from '../models/User'
import { HospitalShift } from '../models/Shift'
import { HospitalToken } from '../models/Token'
import { HospitalErPayment } from '../models/ErPayment'
import { HospitalIpdPayment } from '../models/IpdPayment'
import { HospitalExpense } from '../models/Expense'
import { HospitalIpdBillingItem } from '../models/IpdBillingItem'
import { FinanceJournal } from '../../finance/models/FinanceJournal'
import { HospitalDoctor } from '../models/Doctor'
import { HospitalEncounter } from '../models/Encounter'
import { HospitalDepartment } from '../models/Department'
import { HospitalErCharge } from '../models/ErCharge'
import { LabPatient } from '../../lab/models/Patient'

function toMin(hhmm: string){
  const [h,m] = String(hhmm || '').split(':').map(x => parseInt(x, 10) || 0)
  return h * 60 + m
}

function shiftWindowForDate(shift: any, baseDateIso: string){
  const startMin = toMin(String(shift?.start || '00:00'))
  const endMin = toMin(String(shift?.end || '00:00'))

  // baseDateIso is Pakistan local date; convert midnight Pakistan -> UTC
  const baseMidnight = new Date(`${baseDateIso}T00:00:00.000`)
  const pakMidnight = new Date(baseMidnight.getTime() - (5 * 60 * 60 * 1000))

  const start = new Date(pakMidnight.getTime())
  start.setMinutes(start.getMinutes() + startMin)

  let end = new Date(pakMidnight.getTime())
  end.setMinutes(end.getMinutes() + endMin)

  // Overnight shift
  if (endMin <= startMin){
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000)
  }

  return { start, end }
}

function jsonError(res: Response, status: number, message: string){
  return res.status(status).json({ error: message })
}

// Format UTC date to Pakistan local time string (UTC+5)
function fmtPakistanTime(d: Date): string {
  // Add 5 hours to convert UTC to Pakistan time
  const pakTime = new Date(d.getTime() + (5 * 60 * 60 * 1000))
  const dd = String(pakTime.getUTCDate()).padStart(2, '0')
  const mm = String(pakTime.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = pakTime.getUTCFullYear()
  let hh = pakTime.getUTCHours()
  const min = String(pakTime.getUTCMinutes()).padStart(2, '0')
  const ampm = hh >= 12 ? 'PM' : 'AM'
  hh = hh % 12 || 12
  return `${dd}/${mm}/${yyyy}, ${String(hh).padStart(2, '0')}:${min} ${ampm}`
}

export async function dashboardStats(req: Request, res: Response) {
  try {
    const { from, to } = req.query as any
    const fromDate = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30))
    const toDate = to ? new Date(to) : new Date()

    // 1. Active Patients (IPD and ER)
    // ER encounters use status 'in-progress' (not 'active')
    const [activeIpd, activeEr] = await Promise.all([
      HospitalEncounter.countDocuments({ type: 'IPD', status: 'admitted' }),
      HospitalEncounter.countDocuments({ type: 'ER', status: 'in-progress' })
    ])

    // 2. Advance Available and Pending Payments using per-encounter calculation logic
    // This matches the Emergency Queue and IPD Patient List widgets which use computeTotals/computeIpdTotals
    const [erEncounters, ipdEncounters] = await Promise.all([
      HospitalEncounter.find({ type: 'ER', status: 'in-progress' }).select('_id').lean(),
      HospitalEncounter.find({ type: 'IPD', status: 'admitted' }).select('_id').lean()
    ])

    // Import compute functions dynamically to avoid circular dependency
    const { computeTotals: computeErTotals } = await import('./er_billing.controller')
    const { computeIpdTotals } = await import('./ipd_records.controller')

    // Calculate totals for each ER encounter
    const erTotals = await Promise.all(
      erEncounters.map((enc: any) => computeErTotals(String(enc._id)).catch(() => ({ unallocatedAdvance: 0, netOutstanding: 0 })))
    )
    const erAdv = erTotals.reduce((s: number, t: any) => s + (t.unallocatedAdvance || 0), 0)
    const erPending = erTotals.reduce((s: number, t: any) => s + (t.netOutstanding || 0), 0)

    // Calculate totals for each IPD encounter
    const ipdTotals = await Promise.all(
      ipdEncounters.map((enc: any) => computeIpdTotals(String(enc._id)).catch(() => ({ unallocatedAdvance: 0, netOutstanding: 0 })))
    )
    const ipdAdv = ipdTotals.reduce((s: number, t: any) => s + (t.unallocatedAdvance || 0), 0)
    const ipdPending = ipdTotals.reduce((s: number, t: any) => s + (t.netOutstanding || 0), 0)

    // 3. Department-wise Revenue
    // Using encounters that started in range
    const deptRevenue = await HospitalEncounter.aggregate([
      { $match: { startAt: { $gte: fromDate, $lte: toDate } } },
      { $lookup: { from: 'hospital_departments', localField: 'departmentId', foreignField: '_id', as: 'dept' } },
      { $unwind: '$dept' },
      {
        $facet: {
          ipd: [
            { $match: { type: 'IPD' } },
            { $lookup: { from: 'hospital_ipdbillingitems', localField: '_id', foreignField: 'encounterId', as: 'items' } },
            { $unwind: '$items' },
            { $group: { _id: '$dept.name', revenue: { $sum: '$items.amount' } } }
          ],
          er: [
            { $match: { type: 'ER' } },
            { $lookup: { from: 'hospital_ercharges', localField: '_id', foreignField: 'encounterId', as: 'items' } },
            { $unwind: '$items' },
            { $group: { _id: '$dept.name', revenue: { $sum: '$items.amount' } } }
          ],
          opd: [
            { $match: { type: 'OPD' } },
            { $lookup: { from: 'hospital_tokens', localField: '_id', foreignField: 'encounterId', as: 'token' } },
            { $unwind: '$token' },
            { $group: { _id: '$dept.name', revenue: { $sum: '$token.fee' } } }
          ]
        }
      }
    ])

    // Merge results
    const combined: Record<string, number> = {}
    const { ipd, er, opd } = deptRevenue[0]
    ;[...ipd, ...er, ...opd].forEach(r => {
      combined[r._id] = (combined[r._id] || 0) + r.revenue
    })

    const deptStats = Object.keys(combined).map(name => ({
      name,
      revenue: combined[name]
    })).sort((a,b) => b.revenue - a.revenue)

    res.json({
      activePatients: { ipd: activeIpd, er: activeEr },
      advances: { ipd: ipdAdv, er: erAdv },
      pending: { ipd: ipdPending, er: erPending },
      deptRevenue: deptStats
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}

export async function myActivity(req: Request, res: Response){
  const mode = String((req.query as any)?.mode || 'today') as 'today'|'shift'

  const username = String((req as any).user?.username || '').trim().toLowerCase()
  const userId = String((req as any).user?._id || (req as any).user?.id || '').trim()
  if (!username && !userId) return jsonError(res, 401, 'Unauthorized')

  // Get Pakistan local date (UTC+5)
  const now = new Date()
  const pakDate = new Date(now.getTime() + (5 * 60 * 60 * 1000))
  const todayIso = pakDate.toISOString().slice(0,10)

  // Convert Pakistan local day to UTC for MongoDB query
  // Pakistan midnight (00:00) = UTC 19:00 (previous day)
  const pakStart = new Date(todayIso + 'T00:00:00')
  const pakEnd = new Date(todayIso + 'T23:59:59.999')
  let rangeStart = new Date(pakStart.getTime() - (5 * 60 * 60 * 1000))
  let rangeEnd = new Date(pakEnd.getTime() - (5 * 60 * 60 * 1000))
  let shiftMeta: any = undefined

  if (mode === 'shift'){
    const u: any = userId
      ? await HospitalUser.findById(userId).select('shiftId username').lean()
      : await HospitalUser.findOne({ username }).select('shiftId username').lean()

    if (!u) return jsonError(res, 404, 'User not found')
    if (!u.shiftId) return jsonError(res, 400, 'Shift not assigned')

    const shift: any = await HospitalShift.findById(String(u.shiftId)).lean()
    if (!shift) return jsonError(res, 404, 'Shift not found')

    const w = shiftWindowForDate(shift, todayIso)
    rangeStart = w.start
    rangeEnd = w.end
    shiftMeta = { id: String(shift._id), name: shift.name, start: shift.start, end: shift.end }
  }

  const rangeStartIso = rangeStart.toISOString()
  const rangeEndIso = rangeEnd.toISOString()

  const performedBy = username || undefined
  if (!performedBy) return jsonError(res, 400, 'Username missing in token')

  const [tokens, expenses, payoutJournals, erJournals, ipdJournals] = await Promise.all([
    HospitalToken.find({
      createdByUsername: performedBy,
      createdAt: { $gte: rangeStart, $lte: rangeEnd },
      portal: { $ne: 'reception' },
    })
      .select('dateIso tokenNo fee discount status corporateId createdAt patientName mrn createdByUsername portal serviceIds')
      .populate('serviceIds', 'name')
      .sort({ createdAt: -1 })
      .lean(),

    HospitalExpense.find({
      createdBy: { $regex: new RegExp(`^${performedBy}$`, 'i') },
      createdAt: { $gte: rangeStart, $lte: rangeEnd },
      portal: { $ne: 'reception' },
    })
      .select('dateIso amount method ref note category createdAt createdBy createdByUsername portal')
      .sort({ createdAt: -1 })
      .lean(),

    FinanceJournal.find({
      refType: 'doctor_payout',
      createdAt: { $gte: rangeStart, $lte: rangeEnd },
      'lines.tags.createdByUsername': performedBy,
      'lines.tags.portal': { $ne: 'reception' },
    }).select('dateIso memo lines createdAt').sort({ createdAt: -1 }).lean(),

    FinanceJournal.find({
      refType: 'er_billing',
      createdAt: { $gte: rangeStart, $lte: rangeEnd },
      'lines.tags.createdByUsername': performedBy,
      'lines.tags.portal': { $ne: 'reception' },
    }).select('refId dateIso memo lines createdAt').sort({ createdAt: -1 }).lean(),

    FinanceJournal.find({
      refType: 'ipd_payment',
      createdAt: { $gte: rangeStart, $lte: rangeEnd },
      'lines.tags.createdByUsername': performedBy,
      'lines.tags.portal': { $ne: 'reception' },
    }).select('refId dateIso memo lines createdAt').sort({ createdAt: -1 }).lean(),
  ])

  const erPaymentIds = Array.from(new Set((erJournals || []).map((j: any) => String(j.refId || '')).filter(Boolean)))
  const ipdPaymentIds = Array.from(new Set((ipdJournals || []).map((j: any) => String(j.refId || '')).filter(Boolean)))

  // Convert string IDs to ObjectIds for MongoDB queries
  const toObjectIds = (ids: string[]) => ids.map(id => {
    try { return new Types.ObjectId(id) } catch { return null }
  }).filter(Boolean) as Types.ObjectId[]

  const [erPaymentsRaw, ipdPaymentsRaw] = await Promise.all([
    erPaymentIds.length
      ? HospitalErPayment.find({ _id: { $in: toObjectIds(erPaymentIds) } })
          .select('amount method refNo receivedAt createdAt receivedBy notes portal encounterId patientId createdByUsername')
          .sort({ receivedAt: -1 })
          .lean()
      : Promise.resolve([] as any[]),
    ipdPaymentIds.length
      ? HospitalIpdPayment.find({ _id: { $in: toObjectIds(ipdPaymentIds) } })
          .select('amount method refNo receivedAt createdAt receivedBy notes encounterId patientId portal')
          .sort({ receivedAt: -1 })
          .lean()
      : Promise.resolve([] as any[]),
  ])

  // Get unique encounter IDs for both ER and IPD
  const erEncounterIds = Array.from(new Set((erPaymentsRaw || []).map((p: any) => String(p.encounterId || '')).filter(Boolean)))
  const ipdEncounterIds = Array.from(new Set((ipdPaymentsRaw || []).map((p: any) => String(p.encounterId || '')).filter(Boolean)))
  const allEncounterIds = Array.from(new Set([...erEncounterIds, ...ipdEncounterIds]))

  // Get tokens for ER encounters
  const erTokens = erEncounterIds.length
    ? await HospitalToken.find({ encounterId: { $in: toObjectIds(erEncounterIds) } }).select('encounterId tokenNo').lean()
    : []
  const erTokenMap = new Map(erTokens.map((t: any) => [String(t.encounterId), t.tokenNo]))

  // Fetch all patients for both ER and IPD
  const erPatientIds = (erPaymentsRaw || []).map((p: any) => String(p.patientId)).filter(Boolean)
  const ipdPatientIds = (ipdPaymentsRaw || []).map((p: any) => String(p.patientId)).filter(Boolean)
  const allPatientIds = Array.from(new Set([...erPatientIds, ...ipdPatientIds]))

  const patients = allPatientIds.length
    ? await LabPatient.find({ _id: { $in: toObjectIds(allPatientIds) } }).select('_id fullName mrn').lean()
    : []
  const patientMap = new Map(patients.map((p: any) => [String(p._id), p]))

  // Enrich ER Payments
  const erPayments = (erPaymentsRaw || []).map((p: any) => {
    const patient = patientMap.get(String(p.patientId))
    return {
      ...p,
      tokenNo: erTokenMap.get(String(p.encounterId)) || '-',
      mrn: patient?.mrn || '-',
      patientName: patient?.fullName || '-',
      performedBy: p.createdByUsername || p.receivedBy || performedBy,
    }
  })

  // Calculate pending amounts for IPD payments
  const ipdBillingItems = ipdEncounterIds.length
    ? await HospitalIpdBillingItem.find({ encounterId: { $in: toObjectIds(ipdEncounterIds) } }).select('encounterId amount').lean()
    : []
  const ipdAllPayments = ipdEncounterIds.length
    ? await HospitalIpdPayment.find({ encounterId: { $in: toObjectIds(ipdEncounterIds) } }).select('encounterId amount').lean()
    : []

  // Calculate totals per encounter
  const chargesByEncounter: Record<string, number> = {}
  const paidByEncounter: Record<string, number> = {}
  for (const item of ipdBillingItems) {
    const id = String(item.encounterId || '')
    if (id) chargesByEncounter[id] = (chargesByEncounter[id] || 0) + Number(item.amount || 0)
  }
  for (const pay of ipdAllPayments) {
    const id = String(pay.encounterId || '')
    if (id) paidByEncounter[id] = (paidByEncounter[id] || 0) + Number(pay.amount || 0)
  }

  // Fetch encounters for IPD payments to get admission info
  const encounters = ipdEncounterIds.length
    ? await HospitalEncounter.find({ _id: { $in: toObjectIds(ipdEncounterIds) } }).select('_id admissionNo patientId').lean()
    : []
  const encounterMap = new Map(encounters.map((e: any) => [String(e._id), e]))

  const ipdPayments = (ipdPaymentsRaw || []).map((p: any) => {
    const encId = String(p.encounterId || '')
    const totalCharges = chargesByEncounter[encId] || 0
    const totalPaid = paidByEncounter[encId] || 0
    const pending = Math.max(0, totalCharges - totalPaid)
    const encounter = encounterMap.get(encId)
    const patient = patientMap.get(String(p.patientId))
    return {
      ...p,
      pendingAmount: pending,
      performedBy: performedBy,
      admissionNo: encounter?.admissionNo || '-',
      mrn: patient?.mrn || '-',
      patientName: patient?.fullName || '-',
    }
  })

  const tokenCashRows = tokens.filter((t: any) => !t.corporateId && String(t.status || '') !== 'returned')
  const tokenRevenue = tokenCashRows.reduce((s: number, t: any) => s + Number(t.fee || 0), 0)
  const tokenDiscount = tokenCashRows.reduce((s: number, t: any) => s + Number(t.discount || 0), 0)

  const erTotal = (erPayments || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
  const ipdTotal = (ipdPayments || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0)

  const expenseTotal = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0)

  // Get unique doctor IDs from payout journals
  const doctorIds = Array.from(new Set((payoutJournals || []).map((j: any) => {
    const tags = (j.lines || []).find((l: any) => l?.tags)?.tags || {}
    return String(tags.doctorId || j.refId || '')
  }).filter(Boolean)))

  // Fetch doctor names
  const doctors = doctorIds.length
    ? await HospitalDoctor.find({ _id: { $in: doctorIds } }).select('_id name').lean()
    : []
  const doctorMap = new Map(doctors.map((d: any) => [String(d._id), d.name]))

  const payouts = payoutJournals.map((j: any) => {
    const cash = (j.lines || [])
      .filter((l: any) => l.account === 'CASH' || l.account === 'BANK')
      .reduce((s: number, l: any) => s + Number(l.credit || 0), 0)
    const amount = cash || (j.lines || [])
      .filter((l: any) => l.account === 'DOCTOR_PAYABLE')
      .reduce((s: number, l: any) => s + Number(l.debit || 0), 0)
    const tags = (j.lines || []).find((l: any) => l?.tags)?.tags || {}
    const docId = String(tags.doctorId || j.refId || '')
    return {
      id: String(j._id),
      dateIso: j.dateIso,
      amount,
      memo: j.memo,
      createdAt: j.createdAt,
      createdByUsername: (j.lines || []).find((l: any) => l?.tags?.createdByUsername)?.tags?.createdByUsername,
      doctorId: docId,
      doctorName: tags.doctorName || doctorMap.get(docId) || '-',
      method: tags.method || ((j.lines || []).find((l: any) => l.account === 'CASH') ? 'Cash' : ((j.lines || []).find((l: any) => l.account === 'BANK') ? 'Bank' : '-')),
      refNo: j.refNo || j.memo,
    }
  })

  const payoutTotal = payouts.reduce((s: number, p: any) => s + Number(p.amount || 0), 0)

  const inflowTotal = tokenRevenue + erTotal + ipdTotal
  const outflowTotal = expenseTotal + payoutTotal
  const net = inflowTotal - outflowTotal

  res.json({
    mode,
    user: { username: performedBy },
    shift: shiftMeta,
    range: {
      start: rangeStartIso,
      end: rangeEndIso,
      label: `${fmtPakistanTime(rangeStart)} → ${fmtPakistanTime(rangeEnd)}`
    },
    summary: {
      tokens: { count: tokens.length, revenue: tokenRevenue, discount: tokenDiscount },
      erPayments: { count: erPayments.length, total: erTotal },
      ipdPayments: { count: ipdPayments.length, total: ipdTotal },
      expenses: { count: expenses.length, total: expenseTotal },
      doctorPayouts: { count: payouts.length, total: payoutTotal },
      inflowTotal,
      outflowTotal,
      net,
    },
    items: {
      tokens,
      erPayments: erPayments || [],
      ipdPayments: ipdPayments || [],
      expenses,
      doctorPayouts: payouts,
    }
  })
}
