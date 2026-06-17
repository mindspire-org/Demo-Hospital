import { Request, Response } from 'express'
import { HospitalEncounter } from '../models/Encounter'
import { HospitalErCharge } from '../models/ErCharge'
import { HospitalErPayment } from '../models/ErPayment'
import { createErPaymentSchema } from '../validators/er_payments'
import { HospitalToken } from '../models/Token'
import { LabPatient } from '../../lab/models/Patient'
import { postFbrInvoiceViaSDC } from '../services/fbr'
import { FinanceJournal, JournalLine } from '../../finance/models/FinanceJournal'
import { Types } from 'mongoose'
import { HospitalBed } from '../models/Bed'
import { HospitalFloor } from '../models/Floor'
import { HospitalRoom } from '../models/Room'
import { HospitalWard } from '../models/Ward'

function clampMoney(n: number){
  return Math.round(Number(n || 0) * 100) / 100
}

async function getEREncounter(encounterId: string){
  const enc = await HospitalEncounter.findById(encounterId)
  if (!enc) throw { status: 404, error: 'Encounter not found' }
  if (String((enc as any).type) !== 'ER') throw { status: 400, error: 'Encounter is not ER' }
  return enc
}

function handleError(res: Response, e: any){
  if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' })
  if (e?.status) return res.status(e.status).json({ error: e.error || 'Error' })
  return res.status(500).json({ error: 'Internal Server Error' })
}

function toOid(id?: any){
  try {
    if (!id) return undefined
    const s = String(id)
    return Types.ObjectId.isValid(s) ? new Types.ObjectId(s) : undefined
  } catch { return undefined }
}

async function postErPaymentJournal(args: { encounter: any; payment: any; patient?: any }){
  const paymentId = String(args.payment?._id || '')
  if (!paymentId) return

  // Idempotency: don't post twice for same payment
  const existing: any = await FinanceJournal.findOne({ refType: 'er_billing', refId: paymentId }).lean()
  if (existing) return

  const dateIso = String((args.payment?.receivedAt || new Date()).toISOString()).slice(0,10)
  const methodRaw = String(args.payment?.paymentMode || args.payment?.method || '').toLowerCase()
  const isCash = methodRaw === 'cash'
  const debitAccount = isCash ? 'CASH' : 'BANK'
  const amount = Math.max(0, Number(args.payment?.amount || 0))
  if (!Number.isFinite(amount) || amount <= 0) return

  // Check if this is a refund
  const isRefund = String((args.payment as any)?.type || '').toLowerCase() === 'refund'

  const enc: any = args.encounter || {}
  const pat: any = args.patient || {}
  const tags: any = {}
  const departmentId = toOid(enc?.departmentId?._id || enc?.departmentId)
  const doctorId = toOid(enc?.doctorId?._id || enc?.doctorId)
  const patientId = toOid(enc?.patientId?._id || enc?.patientId || pat?._id)

  if (departmentId) tags.departmentId = departmentId
  if (doctorId) tags.doctorId = doctorId
  if (patientId) tags.patientId = patientId
  tags.encounterId = toOid(enc?._id) || String(enc?._id || '')
  if (pat?.mrn) tags.mrn = String(pat.mrn)
  if (pat?.fullName) tags.patientName = String(pat.fullName)
  // Try to attach ER tokenNo so Finance Transactions can display it.
  // ER encounters originate from an OPD token (encounterId on token).
  try{
    const tok: any = await HospitalToken.findOne({ encounterId: toOid(enc?._id) || String(enc?._id || '') })
      .select('tokenNo')
      .lean()
    if (tok?.tokenNo) tags.tokenNo = String(tok.tokenNo)
  }catch{}
  if ((args.payment as any)?.createdByUserId) tags.createdByUserId = toOid((args.payment as any).createdByUserId) || String((args.payment as any).createdByUserId)
  if ((args.payment as any)?.createdByUsername) tags.createdByUsername = String((args.payment as any).createdByUsername)
  if ((args.payment as any)?.portal) tags.portal = String((args.payment as any).portal)
  else if ((args.payment as any)?.source) tags.portal = String((args.payment as any).source)

  let lines: JournalLine[]
  let memo: string
  
  if (isRefund) {
    // Refund: credit cash/bank, debit ER_REVENUE (reverse the payment)
    lines = [
      { account: 'ER_REVENUE', debit: amount, tags: { ...tags } },
      { account: debitAccount, credit: amount, tags: { ...tags, method: methodRaw || undefined } },
    ]
    memo = `ER Refund ${methodRaw ? '('+methodRaw+')' : ''}`.trim()
  } else {
    // Normal payment: debit cash/bank, credit ER_REVENUE
    lines = [
      { account: debitAccount, debit: amount, tags: { ...tags, method: methodRaw || undefined } },
      { account: 'ER_REVENUE', credit: amount, tags: { ...tags } },
    ]
    memo = `ER Payment ${methodRaw ? '('+methodRaw+')' : ''}`.trim()
  }
  await FinanceJournal.create({ dateIso, module: 'er', refType: 'er_billing', refId: paymentId, memo, lines })
}

async function computeTotals(encounterId: string){
  const [charges, payments] = await Promise.all([
    HospitalErCharge.find({ encounterId }).select('amount paidAmount').lean(),
    HospitalErPayment.find({ encounterId }).select('amount allocations method type').lean()
  ])
  
  // Total charges (what patient consumed)
  const grandTotal = charges.reduce((s: number, c: any) => s + Number(c.amount || 0), 0)
  
  // Total money received from patient (all payments including advances)
  const allPayments = payments.map((p: any) => ({
    ...p,
    isAdvance: String(p.method || '').toLowerCase() === 'advance',
    isSettlement: String(p.method || '').toLowerCase() === 'advance settlement',
    isRefund: String(p.type || '').toLowerCase() === 'refund'
  }))

  // Total advances received (minus refunds)
  const totalAdvanceReceived = allPayments
    .filter(p => p.isAdvance && !p.isRefund)
    .reduce((s, p) => s + Number(p.amount || 0), 0)
    - allPayments
      .filter(p => p.isRefund && String(p.method || '').toLowerCase().includes('advance'))
      .reduce((s, p) => s + Number(p.amount || 0), 0)

  const totalSettlements = allPayments
    .filter(p => p.isSettlement)
    .reduce((s, p) => s + Number(p.amount || 0), 0)

  // Direct payments (excluding advances, settlements, and refunds)
  const totalDirectPaid = allPayments
    .filter(p => !p.isAdvance && !p.isSettlement && !p.isRefund)
    .reduce((s, p) => s + Number(p.amount || 0), 0)

  // Total refunds (for display purposes) - ALL refunds regardless of method
  const totalRefunds = allPayments
    .filter(p => p.isRefund)
    .reduce((s, p) => s + Number(p.amount || 0), 0)

  // Net received from patient (excluding refunds given back)
  const totalReceived = totalDirectPaid + totalAdvanceReceived
  
  // Money already allocated to specific charges (C)
  const totalPaidToCharges = charges.reduce((s: number, c: any) => s + Number(c.paidAmount || 0), 0)
  
  // ADVANCE AVAILABLE = Total Advance Received - Amount of Advance used for charges
  // How much of the totalPaidToCharges came from advances?
  // We can calculate this by: Total Paid to Charges - Total Direct Paid (assuming direct paid is always used first)
  const advanceUsed = Math.max(0, totalPaidToCharges - totalDirectPaid)
  const unallocatedAdvance = Math.max(0, totalAdvanceReceived - advanceUsed)
  
  // NET DUE = Total Bill - Total Paid to Charges
  const netOutstanding = Math.max(0, grandTotal - totalPaidToCharges)
  
  // Legacy pending calculation (for backward compatibility)
  const pending = netOutstanding
  
  return { 
    grandTotal,           // Total charges (A)
    totalReceived,        // All money actually received from patient (Direct + Advance) (B)
    totalPaidToCharges,   // Sum of paidAmount on all charges (Cleared Amount) (C)
    unallocatedAdvance,   // Current Advance Balance (D)
    netOutstanding,       // What patient actually owes (Remaining) (E)
    pending,
    totalDirectPaid,
    totalAdvanceReceived,
    totalRefunds,
    advanceUsed,
    chargeCount: charges.length,
    paymentCount: payments.length
  }
}

async function recalcErPaidAmounts(encounterId: any){
  // Same logic as IPD: preserve existing paidAmount as baseline, apply new allocations
  const items: any[] = await HospitalErCharge.find({ encounterId })
    .select('_id amount paidAmount date createdAt')
    .sort({ createdAt: 1 }) // Use absolute creation order
    .lean()
  if (!items.length) return

  const baselinePaid = new Map<string, number>()
  for (const it of items){
    baselinePaid.set(String(it._id), 0) // Reset baseline to 0 to recompute everything from payments
  }

  const pays: any[] = await HospitalErPayment.find({ encounterId })
    .select('_id amount allocations receivedAt createdAt method type')
    .sort({ createdAt: 1 }) // Use absolute creation order for payments too
    .lean()

  const calculatedPaid = new Map<string, number>()
  for (const [id, amt] of baselinePaid.entries()){
    calculatedPaid.set(id, 0)
  }

  // Calculate total refunds issued (to subtract from available funds)
  const totalRefunds = pays
    .filter(p => String(p.type || '').toLowerCase() === 'refund')
    .reduce((s, p) => s + Number(p.amount || 0), 0)

  // First, process all payments that are NOT settlements or refunds (Direct payments and Advances)
  // We re-allocate them FIFO to ensure correctness
  const sourcePayments = pays.filter(p => {
    const method = String(p.method || '').toLowerCase()
    const pType = String(p.type || '').toLowerCase()
    return method !== 'advance settlement' && pType !== 'refund'
  })

  // Track total available funds from source payments
  const totalSourceFunds = sourcePayments.reduce((s, p) => s + Number(p.amount || 0), 0)
  // Net funds available after subtracting refunds
  const netAvailable = Math.max(0, totalSourceFunds - totalRefunds)
  
  // Track how much we've allocated from net available
  let allocatedFromNet = 0
  
  for (const p of sourcePayments){
    const pid = String(p._id)
    const paymentAmount = clampMoney(p.amount)
    
    // Calculate how much of this payment is actually available (accounting for refunds)
    // We distribute the refund proportionally or as a deduction from available pool
    let availableFromThisPayment = paymentAmount
    if (totalRefunds > 0 && totalSourceFunds > 0) {
      // If refunds exist, reduce available amount proportionally
      const deductionRatio = Math.min(1, totalRefunds / totalSourceFunds)
      availableFromThisPayment = clampMoney(paymentAmount * (1 - deductionRatio))
    }
    
    // Cap by remaining net available
    const remainingNet = Math.max(0, netAvailable - allocatedFromNet)
    let left = Math.min(availableFromThisPayment, remainingNet)
    allocatedFromNet += left
    
    const out: Array<{ billingItemId: string; amount: number }> = []
    
    for (const it of items){
      if (left <= 0) break
      const id = String(it._id)
      const itemAmount = clampMoney(it.amount)
      const currentlyPaid = calculatedPaid.get(id) || 0
      const remainingCapacity = Math.max(0, itemAmount - currentlyPaid)
      
      if (remainingCapacity <= 0) continue
      const take = Math.min(remainingCapacity, left)
      if (take > 0){
        out.push({ billingItemId: id, amount: clampMoney(take) })
        calculatedPaid.set(id, clampMoney((calculatedPaid.get(id) || 0) + take))
        left = clampMoney(left - take)
      }
    }
    
    // Update allocations for this source payment (Advances/Direct)
    try { await HospitalErPayment.findByIdAndUpdate(pid, { $set: { allocations: out } }) } catch {}
  }

  // After re-allocating source payments, we update the paidAmount on charges
  const ops: any[] = []
  for (const it of items){
    const id = String(it._id)
    const calculated = calculatedPaid.get(id) || 0
    ops.push({ updateOne: { filter: { _id: id, encounterId }, update: { $set: { paidAmount: calculated } } } })
  }
  if (ops.length) await HospitalErCharge.bulkWrite(ops)
}

export async function listCharges(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const total = await HospitalErCharge.countDocuments({ encounterId: enc._id })
    const rows = await HospitalErCharge.find({ encounterId: enc._id }).sort({ date: -1, createdAt: -1 }).skip((page-1)*limit).limit(limit).lean()
    // Add remaining field to each charge
    const items = rows.map((r: any) => ({
      ...r,
      remaining: Math.max(0, Number(r.amount || 0) - Number(r.paidAmount || 0))
    }))
    res.json({ items, total, page, limit })
  }catch(e){ return handleError(res, e) }
}

export async function listPayments(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const totalCount = await HospitalErPayment.countDocuments({ encounterId: enc._id })
    const rows = await HospitalErPayment.find({ encounterId: enc._id }).sort({ receivedAt: -1 }).skip((page-1)*limit).limit(limit).lean()
    const totals = await computeTotals(String(enc._id))
    res.json({ payments: rows, total: totalCount, page, limit, totals })
  }catch(e){ return handleError(res, e) }
}

export async function createPayment(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const data = createErPaymentSchema.parse(req.body)
    const row = await HospitalErPayment.create({
      ...data,
      encounterId: enc._id,
      patientId: (enc as any).patientId,
      createdByUserId: (req as any).user?._id || (req as any).user?.id || undefined,
      createdByUsername: (req as any).user?.username || undefined,
      portal: req.body.portal || 'hospital',
      source: req.body.portal || 'hospital',
    })

    // Post to finance ledger so it appears in Transactions & Dashboard revenue
    try {
      const pat: any = await LabPatient.findById((enc as any).patientId).lean()
      await postErPaymentJournal({ encounter: enc, payment: row, patient: pat })
    } catch {}

    // FBR fiscalization (ER payment receipt) - best effort
    try {
      const pat: any = await LabPatient.findById((enc as any).patientId).lean()
      const payload: any = {
        refType: 'er_payment',
        encounterId: String(enc._id),
        paymentId: String((row as any)._id),
        receivedAt: (row as any)?.receivedAt || new Date().toISOString(),
        method: (row as any)?.method || data.method,
        refNo: (row as any)?.refNo || data.refNo,
        patient: {
          id: String(pat?._id || ''),
          mrn: String(pat?.mrn || ''),
          name: String(pat?.fullName || ''),
          phone: String(pat?.phoneNormalized || ''),
        },
        net: Number((row as any).amount || data.amount || 0),
      }
      const r: any = await postFbrInvoiceViaSDC({ module: 'ER_PAYMENT_CREATE', invoiceType: 'IPD', refId: String((row as any)._id), amount: Number((row as any).amount || data.amount || 0), payload })
      if (r) {
        ;(row as any).fbrInvoiceNo = r.fbrInvoiceNo
        ;(row as any).fbrQrCode = r.qrCode
        ;(row as any).fbrStatus = r.status
        ;(row as any).fbrMode = r.mode
        ;(row as any).fbrError = r.error
        try { await (row as any).save() } catch {}
      }
    } catch {}

    // Recalculate paid amounts on charges based on allocations
    await recalcErPaidAmounts(enc._id)

    const totals = await computeTotals(String(enc._id))
    res.status(201).json({ payment: row, totals })
  }catch(e){ return handleError(res, e) }
}

// Export for use in other controllers (e.g., er.controller.ts)
export { recalcErPaidAmounts, computeTotals }

export async function listRecentPayments(req: Request, res: Response){
  try{
    const q = req.query as any
    
    // Parse dates properly - extend 'to' to end of day to include today's payments
    let from: Date, to: Date
    if (q.from) {
      from = new Date(String(q.from) + 'T00:00:00.000Z')
    } else {
      from = new Date(Date.now() - 7*24*60*60*1000)
    }
    if (q.to) {
      // Extend to end of day to include payments from that day
      to = new Date(String(q.to) + 'T23:59:59.999Z')
    } else {
      to = new Date()
    }
    
    console.log('listRecentPayments: from=', from.toISOString(), 'to=', to.toISOString())
    
    // Find all ER payments by receivedAt date range (ErPayment is already ER-specific)
    const payments = await HospitalErPayment.find({
      receivedAt: { $gte: from, $lte: to }
    })
      .sort({ receivedAt: -1 })
      .populate({ path: 'patientId', select: 'fullName mrn' })
      .lean()
    
    console.log('listRecentPayments: found', payments.length, 'payments')
    
    if (payments.length === 0) {
      return res.json({ payments: [], total: 0, from: from.toISOString(), to: to.toISOString() })
    }
    
    // Get unique encounter IDs from payments
    const encounterIds = [...new Set(payments.map(p => String(p.encounterId)))]
    
    // Get token info and encounter info for these encounters
    const [tokens, encounters] = await Promise.all([
      HospitalToken.find({ encounterId: { $in: encounterIds } })
        .select('encounterId tokenNo')
        .lean(),
      HospitalEncounter.find({ _id: { $in: encounterIds } })
        .populate({
          path: 'bedId',
          model: 'Hospital_Bed',
          select: 'label floorId locationType locationId'
        })
        .lean()
    ])
    
    const tokenMap = new Map<string, string>()
    for (const t of tokens) {
      tokenMap.set(String(t.encounterId), String(t.tokenNo))
    }
    
    const encounterMap = new Map<string, any>()
    for (const e of encounters) {
      encounterMap.set(String(e._id), e)
    }
    
    // Collect bed location IDs for lookup
    const floorIds = new Set<string>()
    const roomIds = new Set<string>()
    const wardIds = new Set<string>()
    
    for (const e of encounters) {
      const bed = (e as any).bedId
      if (bed && typeof bed === 'object') {
        if (bed.floorId) floorIds.add(String(bed.floorId))
        if (bed.locationType === 'room' && bed.locationId) roomIds.add(String(bed.locationId))
        if (bed.locationType === 'ward' && bed.locationId) wardIds.add(String(bed.locationId))
      }
    }
    
    const [floors, rooms, wards] = await Promise.all([
      HospitalFloor.find({ _id: { $in: Array.from(floorIds) } }).select('_id name').lean(),
      HospitalRoom.find({ _id: { $in: Array.from(roomIds) } }).select('_id name').lean(),
      HospitalWard.find({ _id: { $in: Array.from(wardIds) } }).select('_id name').lean(),
    ])
    
    const floorMap = new Map(floors.map(f => [String(f._id), f.name]))
    const roomMap = new Map(rooms.map(r => [String(r._id), r.name]))
    const wardMap = new Map(wards.map(w => [String(w._id), w.name]))
    
    // Enrich payment data
    const enriched = payments.map((p: any) => {
      const enc = encounterMap.get(String(p.encounterId))
      const bed = enc?.bedId
      let bedLocation = undefined
      
      if (bed && typeof bed === 'object') {
        const floorName = floorMap.get(String(bed.floorId)) || ''
        const locationName = bed.locationType === 'room' 
          ? (roomMap.get(String(bed.locationId)) || '')
          : (wardMap.get(String(bed.locationId)) || '')
        
        bedLocation = {
          floor: floorName,
          type: bed.locationType,
          location: locationName,
          bed: bed.label
        }
      }
      
      return {
        _id: String(p._id),
        encounterId: String(p.encounterId),
        tokenNo: tokenMap.get(String(p.encounterId)) || '-',
        patientName: p.patientId?.fullName || '-',
        mrn: p.patientId?.mrn || '-',
        amount: Number(p.amount || 0),
        method: p.method || '-',
        refNo: p.refNo || '',
        receivedAt: p.receivedAt || p.createdAt,
        performedBy: p.createdByUsername || '-',
        bedLocation,
      }
    })
    
    res.json({ payments: enriched, total: enriched.length, from: from.toISOString(), to: to.toISOString() })
  }catch(e){ 
    console.error('Error in listRecentPayments:', e)
    return handleError(res, e) 
  }
}

export async function getSummary(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc: any = await HospitalEncounter.findById(String(encounterId))
      .populate({ path: 'patientId', select: 'fullName mrn phoneNormalized address age gender' })
      .populate({ path: 'doctorId', select: 'name' })
      .populate({ path: 'departmentId', select: 'name' })
      .lean()
    if (!enc) throw { status: 404, error: 'Encounter not found' }
    const totals = await computeTotals(String(enc._id))
    res.json({ encounter: enc, encounterId: String(enc._id), totals })
  }catch(e){ return handleError(res, e) }
}
