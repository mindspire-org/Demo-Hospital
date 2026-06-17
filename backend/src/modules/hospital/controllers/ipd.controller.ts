import { Request, Response } from 'express'
import { createIPDAdmissionSchema, dischargeIPDSchema, transferBedSchema } from '../validators/ipd'
import { HospitalDepartment } from '../models/Department'
import { HospitalDoctor } from '../models/Doctor'
import { HospitalEncounter } from '../models/Encounter'
import { LabPatient } from '../../lab/models/Patient'
import { HospitalBed } from '../models/Bed'
import { HospitalToken } from '../models/Token'
import { HospitalFloor } from '../models/Floor'
import { HospitalRoom } from '../models/Room'
import { HospitalWard } from '../models/Ward'
import { z } from 'zod'
import { HospitalCounter } from '../models/Counter'
import { HospitalAuditLog } from '../models/AuditLog'
import { CorporateCompany } from '../../corporate/models/Company'
import { HospitalIpdBillingItem } from '../models/IpdBillingItem'
import { HospitalIpdPayment } from '../models/IpdPayment'
import { HospitalErCharge } from '../models/ErCharge'
import { HospitalErPayment } from '../models/ErPayment'

async function nextAdmissionNo(){
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth()+1).padStart(2,'0')
  const yyyymm = `${yyyy}${mm}`
  const key = `ipd_adm_${yyyymm}`
  const c = await HospitalCounter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true })
  const seq = String((c as any)?.seq || 1).padStart(3,'0')
  return `ADM-${yyyymm}-${seq}`
}

// Compute IPD billing totals
async function computeIpdBillingTotals(encounterId: string){
  const [charges, payments] = await Promise.all([
    HospitalIpdBillingItem.find({ encounterId }).select('amount paidAmount').lean(),
    HospitalIpdPayment.find({ encounterId }).select('amount allocations method type').lean()
  ])
  const grandTotal = charges.reduce((s: number, c: any) => s + Number(c.amount || 0), 0)
  const allPayments = payments.map((p: any) => ({
    ...p,
    isAdvance: String(p.method || '').toLowerCase() === 'advance',
    isSettlement: String(p.method || '').toLowerCase() === 'advance settlement',
    isRefund: String(p.type || '').toLowerCase() === 'refund'
  }))
  const totalAdvanceReceived = allPayments
    .filter(p => p.isAdvance && !p.isRefund)
    .reduce((s, p) => s + Number(p.amount || 0), 0)
    - allPayments
      .filter(p => p.isRefund && String(p.method || '').toLowerCase().includes('advance'))
      .reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalDirectPaid = allPayments
    .filter(p => !p.isAdvance && !p.isSettlement && !p.isRefund && String(p.method || '').toLowerCase() !== 'discount')
    .reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalDiscounts = allPayments
    .filter(p => String(p.method || '').toLowerCase() === 'discount' && !p.isRefund)
    .reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalRefunds = allPayments.filter(p => p.isRefund).reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalReceived = totalDirectPaid + totalAdvanceReceived
  const totalPaidToCharges = charges.reduce((s: number, c: any) => s + Number(c.paidAmount || 0), 0)
  const advanceUsed = Math.max(0, totalPaidToCharges - totalDirectPaid - totalDiscounts)
  const unallocatedAdvance = Math.max(0, totalAdvanceReceived - advanceUsed)
  const netOutstanding = Math.max(0, grandTotal - totalPaidToCharges)
  return { grandTotal, totalReceived, totalPaidToCharges, unallocatedAdvance, netOutstanding, totalDirectPaid, totalAdvanceReceived, totalDiscounts, totalRefunds, advanceUsed }
}

// Compute ER billing totals
async function computeErBillingTotals(encounterId: string){
  const [charges, payments] = await Promise.all([
    HospitalErCharge.find({ encounterId }).select('amount paidAmount').lean(),
    HospitalErPayment.find({ encounterId }).select('amount allocations method type').lean()
  ])
  const grandTotal = charges.reduce((s: number, c: any) => s + Number(c.amount || 0), 0)
  const allPayments = payments.map((p: any) => ({
    ...p,
    isAdvance: String(p.method || '').toLowerCase() === 'advance',
    isSettlement: String(p.method || '').toLowerCase() === 'advance settlement',
    isRefund: String(p.type || '').toLowerCase() === 'refund'
  }))
  const totalAdvanceReceived = allPayments
    .filter(p => p.isAdvance && !p.isRefund)
    .reduce((s, p) => s + Number(p.amount || 0), 0)
    - allPayments
      .filter(p => p.isRefund && String(p.method || '').toLowerCase().includes('advance'))
      .reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalSettlements = allPayments.filter(p => p.isSettlement).reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalDirectPaid = allPayments
    .filter(p => !p.isAdvance && !p.isSettlement && !p.isRefund)
    .reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalRefunds = allPayments.filter(p => p.isRefund).reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalReceived = totalDirectPaid + totalAdvanceReceived
  const totalPaidToCharges = charges.reduce((s: number, c: any) => s + Number(c.paidAmount || 0), 0)
  const advanceUsed = Math.max(0, totalPaidToCharges - totalDirectPaid)
  const unallocatedAdvance = Math.max(0, totalAdvanceReceived - advanceUsed)
  const netOutstanding = Math.max(0, grandTotal - totalPaidToCharges)
  return { grandTotal, totalReceived, totalPaidToCharges, unallocatedAdvance, netOutstanding, totalDirectPaid, totalAdvanceReceived, totalRefunds, advanceUsed }
}

export async function admit(req: Request, res: Response){
  const data = createIPDAdmissionSchema.parse(req.body)

  if ((data as any).corporateId){
    const comp = await CorporateCompany.findById(String((data as any).corporateId)).lean()
    if (!comp) return res.status(400).json({ error: 'Invalid corporateId' })
    if ((comp as any).active === false) return res.status(400).json({ error: 'Corporate company inactive' })
  }

  const patient = await LabPatient.findById(data.patientId).lean()
  if (!patient) return res.status(404).json({ error: 'Patient not found' })

  const department = await HospitalDepartment.findById(data.departmentId).lean()
  if (!department) return res.status(400).json({ error: 'Invalid departmentId' })

  if (data.doctorId){
    const doctor = await HospitalDoctor.findById(data.doctorId).lean()
    if (!doctor) return res.status(400).json({ error: 'Invalid doctorId' })
  }

  // If a bed is specified, ensure it's available before creating encounter
  let bed: any = null
  if (data.bedId){
    bed = await HospitalBed.findById(data.bedId).populate({
      path: 'occupiedByEncounterId',
      select: 'status type',
    })
    if (!bed) return res.status(400).json({ error: 'Invalid bedId' })
    // Check if bed is truly occupied by an active IPD admission (match listBeds normalization logic)
    const enc = bed.occupiedByEncounterId as any
    const isTrulyOccupied = bed.status === 'occupied' && enc && enc.status === 'admitted' && enc.type === 'IPD'
    if (isTrulyOccupied) return res.status(400).json({ error: 'Bed is already occupied' })
    // If stale occupied status (discharged/non-IPD), reset it
    if (bed.status === 'occupied' && !isTrulyOccupied) {
      bed.status = 'available'
      bed.occupiedByEncounterId = undefined as any
    }
  }

  const enc = await HospitalEncounter.create({
    patientId: data.patientId,
    type: 'IPD',
    status: 'admitted',
    departmentId: data.departmentId,
    doctorId: data.doctorId,
    corporateId: (data as any).corporateId || undefined,
    corporatePreAuthNo: (data as any).corporatePreAuthNo,
    corporateCoPayPercent: (data as any).corporateCoPayPercent,
    corporateCoverageCap: (data as any).corporateCoverageCap,
    startAt: new Date(),
    wardId: data.wardId,
    bedId: data.bedId,
    deposit: data.deposit,
    admissionNo: await nextAdmissionNo(),
  })

  // Occupy bed if provided
  if (bed){
    bed.status = 'occupied'
    bed.occupiedByEncounterId = enc._id as any
    await bed.save()
  }

  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'ipd_admit',
      label: 'IPD_ADMIT',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Admission ${enc.admissionNo || enc._id}`,
    })
  } catch {}

  res.status(201).json({ encounter: enc })
}

export async function discharge(req: Request, res: Response){
  const data = dischargeIPDSchema.parse(req.body)
  const id = req.params.id
  const enc = await HospitalEncounter.findById(id)
  if (!enc) return res.status(404).json({ error: 'Encounter not found' })
  // Allow discharge for both IPD and ER encounters
  if (enc.type !== 'IPD' && enc.type !== 'ER') return res.status(400).json({ error: 'Not an IPD or ER encounter' })
  if (enc.status === 'discharged'){
    // If already discharged, allow updating discharge timestamp when provided
    if (data.endAt){
      try { enc.endAt = new Date(data.endAt) } catch {}
      await enc.save()
      return res.json({ encounter: enc })
    }
    return res.status(400).json({ error: 'Already discharged' })
  }

  // Check billing status before discharge - block if pending amount or unallocated advance
  try {
    let totals: { unallocatedAdvance: number; netOutstanding: number; grandTotal: number }
    if (enc.type === 'IPD') {
      totals = await computeIpdBillingTotals(String(enc._id))
    } else {
      totals = await computeErBillingTotals(String(enc._id))
    }
    // Block discharge if there's pending amount or unallocated advance
    if (totals.netOutstanding > 0) {
      return res.status(400).json({ 
        error: `Cannot discharge: pending amount of Rs ${totals.netOutstanding.toLocaleString()} must be cleared first`,
        code: 'PENDING_AMOUNT',
        netOutstanding: totals.netOutstanding,
        unallocatedAdvance: totals.unallocatedAdvance,
        grandTotal: totals.grandTotal
      })
    }
    if (totals.unallocatedAdvance > 0) {
      return res.status(400).json({ 
        error: `Cannot discharge: unallocated advance of Rs ${totals.unallocatedAdvance.toLocaleString()} must be settled or refunded first`,
        code: 'UNALLOCATED_ADVANCE',
        netOutstanding: totals.netOutstanding,
        unallocatedAdvance: totals.unallocatedAdvance,
        grandTotal: totals.grandTotal
      })
    }
  } catch (e) {
    console.warn('Failed to check billing status for discharge', e)
    // Continue with discharge if billing check fails (fallback)
  }

  enc.status = 'discharged'
  enc.endAt = data.endAt ? new Date(data.endAt) : new Date()
  // Update disposition for ER encounters
  if (enc.type === 'ER' && data.disposition) {
    (enc as any).disposition = data.disposition
  }
  await enc.save()
  // Mark associated token as completed (for ER encounters)
  if (enc.tokenId) {
    try {
      await HospitalToken.findByIdAndUpdate(enc.tokenId, { $set: { status: 'completed' } })
    } catch {}
  } else if (enc._id) {
    // Fallback: find token by encounterId if tokenId not set on encounter
    try {
      await HospitalToken.findOneAndUpdate(
        { encounterId: enc._id },
        { $set: { status: 'completed' } }
      )
    } catch {}
  }
  // Free bed if occupied by this encounter (only for IPD)
  if (enc.bedId){
    const bed = await HospitalBed.findById(enc.bedId)
    if (bed && String(bed.occupiedByEncounterId || '') === String(enc._id)){
      bed.status = 'available'
      bed.occupiedByEncounterId = undefined as any
      await bed.save()
    }
  }
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'ipd_discharge',
      label: 'IPD_DISCHARGE',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Admission ${enc.admissionNo || enc._id} discharged`,
    })
  } catch {}
  res.json({ encounter: enc })
}

export async function list(req: Request, res: Response){
  const q = req.query as any
  const criteria: any = { type: 'IPD' }
  const status = String(q.status || '')
  const doctorId = String(q.doctorId || '')
  const departmentId = String(q.departmentId || '')
  const from = String(q.from || '')
  const to = String(q.to || '')
  const search = String(q.q || '').trim().toLowerCase()
  const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
  const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
  const patientId = String(q.patientId || '')
  if (status) criteria.status = status
  if (doctorId) criteria.doctorId = doctorId
  if (departmentId) criteria.departmentId = departmentId
  if (patientId) criteria.patientId = patientId
  if (from || to){
    criteria.startAt = {}
    if (from) {
      // from is a Pakistan-local date string (YYYY-MM-DD); convert to UTC start
      const f = new Date(from + 'T00:00:00.000')
      criteria.startAt.$gte = new Date(f.getTime() - (5 * 60 * 60 * 1000))
    }
    if (to) {
      // to is a Pakistan-local date string; convert to UTC end of day
      const t = new Date(to + 'T23:59:59.999')
      criteria.startAt.$lte = new Date(t.getTime() - (5 * 60 * 60 * 1000))
    }
  }
  let rows = await HospitalEncounter.find(criteria)
    .sort({ startAt: -1 })
    .populate('patientId', 'mrn fullName fatherName phoneNormalized cnicNormalized')
    .populate('doctorId', 'name')
    .populate('departmentId', 'name')
    .populate('tokenId', 'tokenNo')
    .lean()
  if (search){
    rows = rows.filter((r: any)=>{
      const p = r.patientId as any
      const mrn = (p?.mrn || '').toLowerCase()
      const name = (p?.fullName || '').toLowerCase()
      return mrn.includes(search) || name.includes(search)
    })
  }
  const bedIds = Array.from(new Set((rows as any[]).map(r => r.bedId).filter(Boolean))) as string[]
  if (bedIds.length){
    const [floors, rooms, wards, beds] = await Promise.all([
      HospitalFloor.find().select('name').lean(),
      HospitalRoom.find().select('name').lean(),
      HospitalWard.find().select('name').lean(),
      HospitalBed.find({ _id: { $in: bedIds } }).lean(),
    ])
    const floorMap = new Map<string, string>((floors || []).map((f: any) => [String(f._id), String(f.name || '')]))
    const roomMap = new Map<string, string>((rooms || []).map((r: any) => [String(r._id), String(r.name || '')]))
    const wardMap = new Map<string, string>((wards || []).map((w: any) => [String(w._id), String(w.name || '')]))
    const bedMap = Object.fromEntries(beds.map(b => [String((b as any)._id), b])) as Record<string, any>
    rows = rows.map((r: any) => {
      const bed = r.bedId ? bedMap[String(r.bedId)] : null
      if (!bed) return r
      const floorName = floorMap.get(String(bed.floorId)) || ''
      const locationName = bed.locationType === 'room'
        ? (roomMap.get(String(bed.locationId)) || '')
        : (wardMap.get(String(bed.locationId)) || '')
      return {
        ...r,
        bedLabel: bed.label,
        bedLocation: {
          floor: floorName,
          type: bed.locationType,
          location: locationName,
          bed: bed.label,
        }
      }
    })
  }
  const total = rows.length
  const start = (page - 1) * limit
  const paged = rows.slice(start, start + limit)
  res.json({ admissions: paged, total, page, limit })
}

export async function getById(req: Request, res: Response){
  const { id } = req.params as any
  let enc: any = await HospitalEncounter.findById(String(id))
    .populate('patientId', 'mrn fullName fatherName phoneNormalized cnicNormalized address gender age')
    .populate('doctorId', 'name')
    .populate('departmentId', 'name')
    .lean()
  if (!enc) return res.status(404).json({ error: 'Encounter not found' })
  if (enc.type !== 'IPD') return res.status(400).json({ error: 'Not an IPD encounter' })
  if (enc.bedId){
    const bed: any = await HospitalBed.findById(enc.bedId).lean()
    if (bed) {
      let locationName = ''
      if (bed.locationType === 'ward') {
        const ward: any = await HospitalWard.findById(bed.locationId).lean()
        locationName = ward?.name || ''
      } else {
        const room: any = await HospitalRoom.findById(bed.locationId).lean()
        locationName = room?.name || ''
      }
      const floor: any = await HospitalFloor.findById(bed.floorId).lean()
      const floorName = floor?.name || ''
      enc = { 
        ...enc, 
        bedLabel: (bed as any).label,
        bedFullInfo: `${floorName} / ${locationName} / ${bed.label}`
      }
    }
  }
  return res.json({ encounter: enc })
}

export async function transferBed(req: Request, res: Response){
  const id = req.params.id
  const data = transferBedSchema.parse(req.body)
  const enc = await HospitalEncounter.findById(id)
  if (!enc) return res.status(404).json({ error: 'Encounter not found' })
  if (enc.type !== 'IPD') return res.status(400).json({ error: 'Not an IPD encounter' })
  if (enc.status === 'discharged') return res.status(400).json({ error: 'Encounter already discharged' })
  const newBed = await HospitalBed.findById(data.newBedId).populate({
    path: 'occupiedByEncounterId',
    select: 'status type',
  })
  if (!newBed) return res.status(400).json({ error: 'Invalid newBedId' })
  // Check if bed is truly occupied by an active IPD admission (match listBeds normalization logic)
  const newBedEnc = newBed.occupiedByEncounterId as any
  const isNewBedTrulyOccupied = newBed.status === 'occupied' && newBedEnc && newBedEnc.status === 'admitted' && newBedEnc.type === 'IPD'
  if (isNewBedTrulyOccupied) return res.status(400).json({ error: 'New bed is already occupied' })
  // If stale occupied status (discharged/non-IPD), reset it
  if (newBed.status === 'occupied' && !isNewBedTrulyOccupied) {
    newBed.status = 'available'
    newBed.occupiedByEncounterId = undefined as any
  }
  // Free old bed if it was occupied by this encounter
  if (enc.bedId){
    const oldBed = await HospitalBed.findById(enc.bedId)
    if (oldBed && String(oldBed.occupiedByEncounterId || '') === String(enc._id)){
      oldBed.status = 'available'
      oldBed.occupiedByEncounterId = undefined as any
      await oldBed.save()
    }
  }
  // Occupy new bed and update encounter
  enc.bedId = String(newBed._id)
  await enc.save()
  newBed.status = 'occupied'
  newBed.occupiedByEncounterId = enc._id as any
  await newBed.save()
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'ipd_transfer_bed',
      label: 'IPD_TRANSFER_BED',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Admission ${enc.admissionNo || enc._id} -> new bed ${newBed.label || data.newBedId}`,
    })
  } catch {}
  res.json({ encounter: enc })
}

export async function admitFromToken(req: Request, res: Response){
  const schema = z.object({
    tokenId: z.string().min(1),
    bedId: z.string().optional(),
    deposit: z.number().optional(),
    departmentId: z.string().optional(),
    doctorId: z.string().optional(),
    markTokenCompleted: z.boolean().optional(),
    packageAmount: z.number().optional(),
    advancedAmount: z.number().optional(),
    bedFeeIncludedInPackage: z.boolean().optional(),
  })
  const data = schema.parse(req.body)
  const tok = await HospitalToken.findById(data.tokenId)
  if (!tok) return res.status(404).json({ error: 'Token not found' })
  // Validate token-associated corporate company if present
  try {
    const corpId = (tok as any)?.corporateId ? String((tok as any).corporateId) : ''
    if (corpId){
      const comp = await CorporateCompany.findById(corpId).lean()
      if (!comp) return res.status(400).json({ error: 'Invalid corporateId on token' })
      if ((comp as any).active === false) return res.status(400).json({ error: 'Corporate company inactive' })
    }
  } catch {}
  const patientId = (tok as any).patientId as any
  if (!patientId) return res.status(400).json({ error: 'Token has no patientId' })
  const patient = await LabPatient.findById(patientId).lean()
  if (!patient) return res.status(404).json({ error: 'Patient not found' })
  // Department/doctor derive from token unless overridden
  const departmentId = data.departmentId || String((tok as any).departmentId || '')
  const doctorId = data.doctorId || (tok as any).doctorId || undefined
  if (!departmentId) return res.status(400).json({ error: 'departmentId is required (token missing and not provided)' })
  const department = await HospitalDepartment.findById(departmentId).lean()
  if (!department) return res.status(400).json({ error: 'Invalid departmentId' })
  if (doctorId){
    const doc = await HospitalDoctor.findById(doctorId).lean()
    if (!doc) return res.status(400).json({ error: 'Invalid doctorId' })
  }
  // Validate bed if provided
  let bed: any = null
  if (data.bedId){
    bed = await HospitalBed.findById(data.bedId).populate({
      path: 'occupiedByEncounterId',
      select: 'status type',
    })
    if (!bed) return res.status(400).json({ error: 'Invalid bedId' })
    // Check if bed is truly occupied by an active IPD admission (match listBeds normalization logic)
    const enc = bed.occupiedByEncounterId as any
    const isTrulyOccupied = bed.status === 'occupied' && enc && enc.status === 'admitted' && enc.type === 'IPD'
    if (isTrulyOccupied) return res.status(400).json({ error: 'Bed is already occupied' })
    // If stale occupied status (discharged/non-IPD), reset it
    if (bed.status === 'occupied' && !isTrulyOccupied) {
      bed.status = 'available'
      bed.occupiedByEncounterId = undefined as any
    }
  }
  // Create IPD encounter
  const pkg = Number(data.packageAmount || 0)
  const adv = Number(data.advancedAmount || 0)
  const dep = Number(data.deposit || 0)
  const bedInPkg = data.bedFeeIncludedInPackage === true
  const totalPkg = bedInPkg ? pkg : pkg + dep
  const enc = await HospitalEncounter.create({
    patientId,
    type: 'IPD',
    status: 'admitted',
    departmentId,
    doctorId,
    corporateId: ((tok as any)?.corporateId) || undefined,
    startAt: new Date(),
    bedId: data.bedId,
    deposit: data.deposit,
    packageAmount: pkg,
    advancedAmount: adv,
    pendingAmount: Math.max(0, totalPkg - adv),
    bedFeeIncludedInPackage: bedInPkg,
    admissionNo: await nextAdmissionNo(),
    tokenId: data.tokenId,
  })
  if (bed){
    bed.status = 'occupied'
    bed.occupiedByEncounterId = enc._id as any
    await bed.save()
  }
  // Optionally mark OPD token completed
  const mark = data.markTokenCompleted !== false
  if (mark){
    ;(tok as any).status = 'completed'
    await tok.save()
  }
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'ipd_admit_from_token',
      label: 'IPD_ADMIT_FROM_TOKEN',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Token ${String((tok as any)?._id || data.tokenId)} -> Admission ${enc.admissionNo || enc._id}`,
    })
  } catch {}
  res.status(201).json({ encounter: enc, token: tok })
}

export async function getBillingSummary(req: Request, res: Response){
  const { id } = req.params
  const enc = await HospitalEncounter.findById(id).lean()
  if (!enc) return res.status(404).json({ error: 'Admission not found' })
  const totals = await computeIpdBillingTotals(id)
  res.json({
    encounterId: id,
    admissionNo: (enc as any).admissionNo,
    packageAmount: (enc as any).packageAmount || 0,
    advancedAmount: (enc as any).advancedAmount || 0,
    pendingAmount: (enc as any).pendingAmount || 0,
    bedFeeIncludedInPackage: (enc as any).bedFeeIncludedInPackage ?? false,
    ...totals,
  })
}
