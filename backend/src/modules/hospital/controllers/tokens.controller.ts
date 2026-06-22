import { Request, Response } from 'express'

import { createOpdTokenSchema } from '../validators/token'

import { HospitalDepartment as HospitalDepartmentModel } from '../models/Department'

import { HospitalDoctor as HospitalDoctorModel } from '../models/Doctor'
import { HospitalEncounter as HospitalEncounterModel } from '../models/Encounter'
import { HospitalErService as HospitalErServiceModel } from '../models/ErService'
import { HospitalBed as HospitalBedModel } from '../models/Bed'
import { HospitalFloor as HospitalFloorModel } from '../models/Floor'
import { HospitalRoom as HospitalRoomModel } from '../models/Room'
import { HospitalWard as HospitalWardModel } from '../models/Ward'

import { HospitalToken as HospitalTokenModel } from '../models/Token'

import { HospitalCounter as HospitalCounterModel } from '../models/Counter'

import { HospitalDoctorSchedule as HospitalDoctorScheduleModel } from '../models/DoctorSchedule'

import { HospitalAppointment as HospitalAppointmentModel } from '../models/Appointment'

import { LabPatient as LabPatientModel } from '../../lab/models/Patient'

import { CorporateCompany as CorporateCompanyModel } from '../../corporate/models/Company'

const HospitalDepartment = HospitalDepartmentModel as any
const HospitalDoctor = HospitalDoctorModel as any
const HospitalEncounter = HospitalEncounterModel as any
const HospitalErService = HospitalErServiceModel as any
const HospitalBed = HospitalBedModel as any
const HospitalFloor = HospitalFloorModel as any
const HospitalRoom = HospitalRoomModel as any
const HospitalWard = HospitalWardModel as any
const HospitalToken = HospitalTokenModel as any
const HospitalCounter = HospitalCounterModel as any
const HospitalDoctorSchedule = HospitalDoctorScheduleModel as any
const HospitalAppointment = HospitalAppointmentModel as any
const LabPatient = LabPatientModel as any
const CorporateCompany = CorporateCompanyModel as any

import { nextGlobalMrn } from '../../../common/mrn'

import { HospitalAuditLog } from '../models/AuditLog'

import { postOpdTokenJournal, reverseOpdTokenJournal, reverseJournalById, reverseJournalByRef } from '../../finance/controllers/finance_ledger'

import { FinanceJournal, JournalLine } from '../../finance/models/FinanceJournal'

import { HospitalCashSession } from '../models/CashSession'
import { logActivity } from '../../finance/services/activityLog.service'

import { resolveOPDPrice } from '../../corporate/utils/price'

import { CorporateTransaction } from '../../corporate/models/Transaction'

import { postFbrInvoiceViaSDC } from '../services/fbr'



function resolveOPDFee({ department, doctor, visitType, visitCategory }: any){

  const isFollowup = visitType === 'followup'

  if (doctor && department && Array.isArray(department.doctorPrices)){

    const match = department.doctorPrices.find((p: any) => String(p.doctorId) === String(doctor._id))

    if (match && match.price != null) return { fee: match.price, source: 'department-mapping' }

  }

  if (doctor){

    if (!isFollowup && visitCategory === 'general' && (doctor as any).opdPublicFee != null) return { fee: (doctor as any).opdPublicFee, source: 'doctor-general' }

    if (!isFollowup && visitCategory === 'private' && (doctor as any).opdPrivateFee != null) return { fee: (doctor as any).opdPrivateFee, source: 'doctor-private' }

    if (!isFollowup && visitCategory === 'subsidized' && (doctor as any).opdSubsidizedFee != null) return { fee: (doctor as any).opdSubsidizedFee, source: 'doctor-subsidized' }

    if (isFollowup && doctor.opdFollowupFee != null) return { fee: doctor.opdFollowupFee, source: 'followup-doctor' }

    if (doctor.opdBaseFee != null) return { fee: doctor.opdBaseFee, source: 'doctor' }

  }

  if (department) {

    if (isFollowup && department.opdFollowupFee != null) return { fee: department.opdFollowupFee, source: 'followup-department' }

    return { fee: department.opdBaseFee || 0, source: 'department' }

  }

  return { fee: 0, source: 'none' }

}



function getPakistanDate(): string {

  // Use local getters instead of toISOString for Pakistan timezone (UTC+5)

  const PAKISTAN_OFFSET_MS = 5 * 60 * 60 * 1000

  const now = new Date()

  const pakTime = new Date(now.getTime() + PAKISTAN_OFFSET_MS)

  const year = pakTime.getUTCFullYear()

  const month = String(pakTime.getUTCMonth() + 1).padStart(2, '0')

  const day = String(pakTime.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`

}



async function nextTokenNo(doctorId?: string, visitCategory?: string, serviceIds?: string[]){

  const dateIso = getPakistanDate()

  // Use per-doctor, per-category counter if both provided; otherwise per-doctor or global

  let key: string

  if (serviceIds && serviceIds.length > 0) {

    // Use the first serviceId for the counter key if multiple selected

    key = `opd_token_svc_${serviceIds[0]}_${dateIso}`

  } else if (doctorId && visitCategory) {

    key = `opd_token_doc_${doctorId}_${visitCategory}_${dateIso}`

  } else if (doctorId) {

    key = `opd_token_doc_${doctorId}_${dateIso}`

  } else {

    key = `opd_token_${dateIso}`

  }

  const c = await HospitalCounter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true })

  const seq = String(c.seq || 1).padStart(3,'0')

  return { tokenNo: seq, dateIso }

}



function toMin(hhmm: string){ const [h,m] = (hhmm||'').split(':').map(x=>parseInt(x,10)||0); return h*60+m }

function fromMin(min: number){ const h = Math.floor(min/60).toString().padStart(2,'0'); const m = (min%60).toString().padStart(2,'0'); return `${h}:${m}` }

function computeSlotIndex(startTime: string, endTime: string, slotMinutes: number, apptStart: string){

  const start = toMin(startTime), end = toMin(endTime), ap = toMin(apptStart)

  if (ap < start || ap >= end) return null

  const delta = ap - start

  if (delta % (slotMinutes||15) !== 0) return null

  return Math.floor(delta / (slotMinutes||15)) + 1

}

function computeSlotStartEnd(startTime: string, slotMinutes: number, slotNo: number){

  const start = toMin(startTime) + (slotNo-1)*(slotMinutes||15)

  return { start: fromMin(start), end: fromMin(start + (slotMinutes||15)) }

}



async function findMatchingScheduleForNow({ doctorId, dateIso, departmentId }: { doctorId?: string; dateIso: string; departmentId?: string }){

  if (!doctorId) return null

  const now = new Date()

  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

  const cur = toMin(hhmm)

  

  // Try with department first (strict match)

  let filter: any = { doctorId, dateIso }

  if (departmentId) filter.departmentId = departmentId

  let schedules: any[] = await HospitalDoctorSchedule.find(filter).sort({ startTime: 1 }).lean()

  

  // If no match and department was specified, try without department

  if (schedules.length === 0 && departmentId) {

    filter = { doctorId, dateIso }

    schedules = await HospitalDoctorSchedule.find(filter).sort({ startTime: 1 }).lean()

  }

  

  // Debug: check what schedules exist for this date at all

  if (schedules.length === 0) {

    const anySchedules = await HospitalDoctorSchedule.find({ dateIso }).limit(5).lean()

  }

  

  for (const s of schedules){

    const st = toMin(String(s.startTime || '00:00'))

    const en = toMin(String(s.endTime || '00:00'))

    if (cur >= st && cur < en) return s

  }

  return null

}



export async function createOpd(req: Request, res: Response, next: import('express').NextFunction){

  try {

  const data = createOpdTokenSchema.parse(req.body)

  if ((data as any).corporateId){

    const comp = await CorporateCompany.findById(String((data as any).corporateId)).lean()

    if (!comp) return res.status(400).json({ error: 'Invalid corporateId' })

    if ((comp as any).active === false) return res.status(400).json({ error: 'Corporate company inactive' })

  }



  // Resolve patient

  let patient = null as any

  const normDigits = (s?: string) => (s||'').replace(/\D+/g,'')

  if (data.patientId){

    patient = await LabPatient.findById(data.patientId)

    if (!patient) return res.status(404).json({ error: 'Patient not found' })

    // Patch demographics if provided

    const patch: any = {}

    if (data.patientName) patch.fullName = data.patientName

    if (data.guardianName) patch.fatherName = data.guardianName

    if (data.guardianRel) patch.guardianRel = data.guardianRel

    if (data.gender) patch.gender = data.gender

    if (data.address) patch.address = data.address

    if (data.age) patch.age = data.age

    if ((data as any).phone) patch.phoneNormalized = normDigits((data as any).phone)

    if ((data as any).cnic) patch.cnicNormalized = normDigits((data as any).cnic)

    if (Object.keys(patch).length){ patient = await LabPatient.findByIdAndUpdate(data.patientId, { $set: patch }, { new: true }) }

  } else if (data.mrn){

    patient = await LabPatient.findOne({ mrn: data.mrn })

    if (!patient) return res.status(404).json({ error: 'Patient not found' })

    // Patch demographics if provided

    const patch: any = {}

    if (data.patientName) patch.fullName = data.patientName

    if (data.guardianName) patch.fatherName = data.guardianName

    if (data.guardianRel) patch.guardianRel = data.guardianRel

    if (data.gender) patch.gender = data.gender

    if (data.address) patch.address = data.address

    if (data.age) patch.age = data.age

    if ((data as any).phone) patch.phoneNormalized = normDigits((data as any).phone)

    if ((data as any).cnic) patch.cnicNormalized = normDigits((data as any).cnic)

    if (Object.keys(patch).length){ patient = await LabPatient.findByIdAndUpdate(patient._id, { $set: patch }, { new: true }) }

  } else {

    if (!data.patientName) return res.status(400).json({ error: 'patientName or patientId/mrn required' })

    const mrn = await nextGlobalMrn()

    patient = await LabPatient.create({

      mrn,

      fullName: data.patientName,

      fatherName: data.guardianName,

      guardianRel: (data as any).guardianRel,

      phoneNormalized: normDigits((data as any).phone) || undefined,

      cnicNormalized: normDigits((data as any).cnic) || undefined,

      gender: (data as any).gender,

      age: (data as any).age,

      address: (data as any).address,

      createdAtIso: (() => {

        const PAKISTAN_OFFSET_MS = 5 * 60 * 60 * 1000

        const now = new Date()

        const pakTime = new Date(now.getTime() + PAKISTAN_OFFSET_MS)

        const year = pakTime.getUTCFullYear()

        const month = String(pakTime.getUTCMonth() + 1).padStart(2, '0')

        const day = String(pakTime.getUTCDate()).padStart(2, '0')

        const hours = String(pakTime.getUTCHours()).padStart(2, '0')

        const minutes = String(pakTime.getUTCMinutes()).padStart(2, '0')

        const seconds = String(pakTime.getUTCSeconds()).padStart(2, '0')

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`

      })(),

      portal: req.body.portal || 'hospital',

    })

  }



  // Department & doctor

  const department = (data.departmentId && data.departmentId.length === 24) ? await HospitalDepartment.findById(data.departmentId).lean() : null

  const departmentName = String((department as any)?.name || '').trim().toLowerCase()

  const encounterType = departmentName === 'emergency' ? 'ER' : (departmentName === 'ipd' ? 'IPD' : 'OPD')

  let doctor: any = null

  if (data.doctorId && data.doctorId.length === 24){

    doctor = await HospitalDoctor.findById(data.doctorId).lean()

    if (!doctor) return res.status(400).json({ error: 'Invalid doctorId' })

  }



  // Price resolution with optional override (may be overridden by schedule later)
  let baseFeeInfo = resolveOPDFee({ department, doctor, visitType: data.visitType, visitCategory: (data as any).visitCategory })
  
  // If serviceIds are provided, they override doctor/department fee
  if (data.serviceIds && data.serviceIds.length > 0) {
    const validServiceIds = data.serviceIds.filter(id => id && id.length === 24)
    if (validServiceIds.length > 0) {
      const services = await HospitalErService.find({ _id: { $in: validServiceIds } }).lean()
      if (services.length > 0) {
        const totalServicePrice = services.reduce((sum: any, s: any) => sum + Number(s.price || 0), 0)
        baseFeeInfo = { fee: totalServicePrice, source: 'services' }
      }
    }
  }

  const hasOverride = (data as any).overrideFee != null

  const overrideFee = hasOverride ? Number((data as any).overrideFee) : undefined

  let feeSource = baseFeeInfo.source

  let resolvedFee = baseFeeInfo.fee



  // Create Encounter

  const encData: any = {

    patientId: patient._id,

    type: encounterType,

    status: 'in-progress',

    departmentId: data.departmentId || undefined,

    doctorId: data.doctorId || undefined,

    corporateId: (data as any).corporateId || undefined,

    corporatePreAuthNo: (data as any).corporatePreAuthNo,

    corporateCoPayPercent: (data as any).corporateCoPayPercent,

    corporateCoverageCap: (data as any).corporateCoverageCap,

    startAt: new Date(),

    visitType: data.visitType,

    consultationFeeResolved: 0, // placeholder, set below once fee finalized

    feeSource: '',

    paymentRef: data.paymentRef,

  }

  // Validate and resolve bed for ER if bedId provided
  let erBed: any = null
  if (encounterType === 'ER' && (data as any).bedId) {
    erBed = await HospitalBed.findById((data as any).bedId).populate({
      path: 'occupiedByEncounterId',
      select: 'status type',
    })
    if (!erBed) return res.status(400).json({ error: 'Invalid bedId' })
    // Check if bed is truly occupied by an active admission
    const bedEnc = erBed.occupiedByEncounterId as any
    const isTrulyOccupied = erBed.status === 'occupied' && bedEnc && 
      (bedEnc.status === 'admitted' || bedEnc.status === 'in-progress') && 
      (bedEnc.type === 'IPD' || bedEnc.type === 'ER')
    if (isTrulyOccupied) return res.status(400).json({ error: 'Bed is already occupied' })
    // If stale occupied status, reset it
    if (erBed.status === 'occupied' && !isTrulyOccupied) {
      erBed.status = 'available'
      erBed.occupiedByEncounterId = undefined as any
    }
  }

  // Add ER-specific fields if creating ER encounter
  if (encounterType === 'ER') {
    if ((data as any).triage) encData.triage = (data as any).triage
    if ((data as any).arrivalMode) encData.arrivalMode = (data as any).arrivalMode
    if ((data as any).chiefComplaint) encData.chiefComplaint = (data as any).chiefComplaint
    if ((data as any).bedId) encData.bedId = (data as any).bedId
  }

  const enc = await HospitalEncounter.create(encData)

  // Occupy bed for ER if provided
  if (encounterType === 'ER' && erBed) {
    erBed.status = 'occupied'
    erBed.occupiedByEncounterId = enc._id as any
    await erBed.save()
    // Prevent this patient from occupying multiple beds: clear any other beds
    // occupied by this patient's other active encounters
    const otherActiveEncounters = await HospitalEncounter.find({
      patientId: data.patientId,
      _id: { $ne: enc._id },
      $or: [
        { type: 'IPD', status: 'admitted' },
        { type: 'ER', status: { $in: ['in-progress', 'admitted'] } },
      ],
    }).select('_id').lean()
    const otherIds = otherActiveEncounters.map((e: any) => String(e._id))
    if (otherIds.length) {
      await HospitalBed.updateMany(
        { occupiedByEncounterId: { $in: otherIds } },
        { $set: { status: 'available', occupiedByEncounterId: undefined } }
      )
    }
  }



  // Determine scheduling and token numbering

  let dateIso = getPakistanDate()

  let tokenNo = ''

  let scheduleId: any = null

  let slotNo: number | undefined

  let slotStart: string | undefined

  let slotEnd: string | undefined



  if ((data as any).scheduleId){

    const sched: any = await HospitalDoctorSchedule.findById((data as any).scheduleId).lean()

    if (!sched) return res.status(400).json({ error: 'Invalid scheduleId' })

    if (data.doctorId && String(sched.doctorId) !== String(data.doctorId)) return res.status(400).json({ error: 'Schedule does not belong to selected doctor' })

    scheduleId = sched._id

    dateIso = String(sched.dateIso)

    const slotMinutes = Number(sched.slotMinutes || 15)

    const apptStart = (data as any).apptStart as string | undefined

    if (apptStart){

      const idx = computeSlotIndex(sched.startTime, sched.endTime, slotMinutes, apptStart)

      if (!idx) return res.status(400).json({ error: 'apptStart outside schedule or not aligned to slot' })

      // ensure slot free

      const clash = await HospitalToken.findOne({ scheduleId: sched._id, slotNo: idx, status: { $nin: ['returned','cancelled'] } }).lean()

      if (clash) return res.status(409).json({ error: 'Selected slot already booked' })

      const clashAppt = await HospitalAppointment.findOne({ scheduleId: sched._id, slotNo: idx, status: { $in: ['booked','confirmed','checked-in'] } }).lean()

      if (clashAppt) return res.status(409).json({ error: 'Selected slot already booked (appointment)' })

      slotNo = idx

      const se = computeSlotStartEnd(sched.startTime, slotMinutes, idx)

      slotStart = se.start

      slotEnd = se.end

    } else {

      // auto assign next free slot

      const totalSlots = Math.floor((toMin(sched.endTime) - toMin(sched.startTime)) / slotMinutes)

      const taken = await HospitalToken.find({ scheduleId: sched._id, status: { $nin: ['returned','cancelled'] } }).select('slotNo').lean()

      const appts = await HospitalAppointment.find({ scheduleId: sched._id, status: { $in: ['booked','confirmed','checked-in'] } }).select('slotNo').lean()

      const used = new Set<number>([...((taken||[]).map((t:any)=> Number(t.slotNo||0))), ...((appts||[]).map((a:any)=> Number(a.slotNo||0)))])

      let idx = 0

      for (let i=1;i<=totalSlots;i++){ if (!used.has(i)){ idx = i; break } }

      if (!idx) return res.status(409).json({ error: 'No free slot available in this schedule' })

      slotNo = idx

      const se = computeSlotStartEnd(sched.startTime, slotMinutes, idx)

      slotStart = se.start

      slotEnd = se.end

    }

    // fee from schedule if provided

    if (!hasOverride){

      if (data.visitType === 'followup' && (sched as any).followupFee != null){ resolvedFee = Number((sched as any).followupFee); feeSource = 'schedule-followup' }

      else if ((sched as any).fee != null){ resolvedFee = Number((sched as any).fee); feeSource = 'schedule' }

    }

    tokenNo = String(slotNo)

  } else {

    // No schedule provided: try to auto-match current time within a doctor's schedule for today.

    const todayIso = getPakistanDate()

    const autoSched: any = await findMatchingScheduleForNow({ doctorId: data.doctorId, dateIso: todayIso, departmentId: data.departmentId })

    if (autoSched){

      scheduleId = autoSched._id

      dateIso = String(autoSched.dateIso)

      const slotMinutes = Number(autoSched.slotMinutes || 15)

      const totalSlots = Math.floor((toMin(autoSched.endTime) - toMin(autoSched.startTime)) / slotMinutes)

      const taken = await HospitalToken.find({ scheduleId: autoSched._id, status: { $nin: ['returned','cancelled'] } }).select('slotNo').lean()

      const appts = await HospitalAppointment.find({ scheduleId: autoSched._id, status: { $in: ['booked','confirmed','checked-in'] } }).select('slotNo').lean()

      const used = new Set<number>([...((taken||[]).map((t:any)=> Number(t.slotNo||0))), ...((appts||[]).map((a:any)=> Number(a.slotNo||0)))] )

      let idx = 0

      for (let i=1;i<=totalSlots;i++){ if (!used.has(i)){ idx = i; break } }

      if (!idx) return res.status(409).json({ error: 'No free slot available in this schedule' })

      slotNo = idx

      const se = computeSlotStartEnd(autoSched.startTime, slotMinutes, idx)

      slotStart = se.start

      slotEnd = se.end

      if (!hasOverride){

        if (data.visitType === 'followup' && (autoSched as any).followupFee != null){ resolvedFee = Number((autoSched as any).followupFee); feeSource = 'schedule-followup' }

        else if ((autoSched as any).fee != null){ resolvedFee = Number((autoSched as any).fee); feeSource = 'schedule' }

      }

      tokenNo = String(slotNo)

    } else {

      // No matching schedule: fallback to per-doctor (or global if no doctor) sequential token and default fee.

      const visitCat = (data as any).visitCategory || 'general'

      const next = await nextTokenNo(data.doctorId || undefined, visitCat, data.serviceIds)

      tokenNo = next.tokenNo

      dateIso = next.dateIso

    }

  }



  const finalFee = hasOverride ? Math.max(0, Number(overrideFee)) : Math.max(0, resolvedFee - (data.discount || 0))



  // Corporate pricing (does not change patient fee in this phase; only records ledger)

  let corporatePricing: { price: number; appliedRuleId?: string } | null = null

  const corporateId = (data as any).corporateId ? String((data as any).corporateId) : ''

  if (corporateId){

    try {

      const corp = await resolveOPDPrice({ companyId: corporateId, departmentId: String(data.departmentId), doctorId: data.doctorId || undefined, visitType: data.visitType as any, defaultPrice: finalFee })

      corporatePricing = { price: Number(corp.price||0), appliedRuleId: String(corp.appliedRuleId||'') }

    } catch {}

  }

  let serviceNames = ''

  if (data.serviceIds && data.serviceIds.length > 0) {

    const svcs = await HospitalErService.find({ _id: { $in: data.serviceIds } }).select('name').lean()

    serviceNames = svcs.map((s: any) => s.name).join(', ')

  }



    const tok = await HospitalToken.create({

    dateIso,

    tokenNo,

    patientId: patient._id,

    mrn: patient.mrn,

    patientName: patient.fullName,

    createdByUserId: (req as any).user?._id || (req as any).user?.id || undefined,
    createdByUsername: (req as any).user?.username || undefined,
    departmentId: data.departmentId || undefined,
    doctorId: data.doctorId || undefined,
    serviceIds: data.serviceIds && data.serviceIds.length > 0 ? data.serviceIds : undefined,
    serviceNames: serviceNames || undefined,
    encounterId: enc._id,

    corporateId: corporateId || undefined,

    paidMethod: (data as any).paidMethod || ((data as any).corporateId ? 'AR' : 'Cash'),

    visitCategory: (data as any).visitCategory || undefined,

    fee: finalFee,

    discount: Number(data.discount || 0),

    status: 'queued',

    scheduleId,

    slotNo,

    slotStart,

    slotEnd,

    portal: req.body.portal || 'hospital',

    vitals: (data as any).vitals || undefined,

  })



  // FBR fiscalization (OPD token is paid at creation)

  try {

    const payload: any = {

      refType: 'opd_token',

      tokenId: String((tok as any)._id),

      tokenNo: String(tokenNo),

      dateIso,

      departmentId: String(data.departmentId || ''),

      doctorId: data.doctorId ? String(data.doctorId) : undefined,

      patient: {

        id: String((patient as any)?._id || ''),

        mrn: String((patient as any)?.mrn || ''),

        name: String((patient as any)?.fullName || ''),

        phone: String((patient as any)?.phoneNormalized || ''),

      },

      subtotal: Number(finalFee || 0),

      discount: Number(data.discount || 0),

      net: Number(finalFee || 0),

    }

    const r: any = await postFbrInvoiceViaSDC({ module: 'OPD_TOKEN_CREATE', invoiceType: 'OPD', refId: String((tok as any)._id), amount: Number(finalFee || 0), payload })

    if (r) {

      ;(tok as any).fbrInvoiceNo = r.fbrInvoiceNo

      ;(tok as any).fbrQrCode = r.qrCode

      ;(tok as any).fbrStatus = r.status

      ;(tok as any).fbrMode = r.mode

      ;(tok as any).fbrError = r.error

      try { await (tok as any).save() } catch {}

    }

  } catch {}



  // Update encounter fee resolution and tokenId now that finalFee is known

  try { await HospitalEncounter.findByIdAndUpdate(enc._id, { $set: { consultationFeeResolved: finalFee, feeSource, tokenId: tok._id } }) } catch {}



  // Finance: post OPD revenue and doctor share accrual

  try {

    // Determine paid method: corporate defaults to AR; non-corporate uses request-selected method

    const paidMethod = (data as any).corporateId ? 'AR' : ((data as any).paidMethod || 'Cash')

    // Attach sessionId if a cash drawer session is open for this user and method is Cash

    let sessionId: string | undefined = undefined

    if (paidMethod === 'Cash'){

      try{

        const userId = String((req as any).user?._id || (req as any).user?.id || (req as any).user?.email || '')

        if (userId){

          const sess: any = await HospitalCashSession.findOne({ status: 'open', userId }).sort({ createdAt: -1 }).lean()

          if (sess) sessionId = String(sess._id)

        }

      } catch {}

    }

    const tokenDescription = (data as any).description || undefined

    await postOpdTokenJournal({

      tokenId: String((tok as any)._id),

      dateIso,

      fee: finalFee,

      doctorId: data.doctorId,

      departmentId: data.departmentId,

      patientId: String((patient as any)?._id || ''),

      patientName: String((patient as any)?.fullName || ''),

      mrn: String((patient as any)?.mrn || ''),

      tokenNo,

      paidMethod: paidMethod as any,

      sessionId,

      createdByUsername: (req as any).user?.username || (req as any).user?.name || undefined,

      visitCategory: (data as any).visitCategory || undefined,

      memo: tokenDescription,

      serviceNames

    })

    // Activity log
    try {
      const paidMethod = (data as any).corporateId ? 'AR' : ((data as any).paidMethod || 'Cash')
      logActivity({
        userId: String((req as any).user?._id || (req as any).user?.id || 'system'),
        userName: String((req as any).user?.username || (req as any).user?.name || ''),
        portal: 'hospital',
        action: 'OPD Payment Collected',
        module: 'OPD',
        entityId: String((tok as any)._id),
        entityLabel: `Token ${tokenNo} — ${String((patient as any)?.fullName || '')}`,
        amount: Number(finalFee || 0),
        method: paidMethod,
        meta: { patientId: String((patient as any)?._id || ''), mrn: String((patient as any)?.mrn || ''), doctorId: data.doctorId, departmentId: data.departmentId }
      })
    } catch {}

  } catch (e) {

    // do not fail token creation if finance posting has an error

    console.warn('Finance posting failed for OPD token', e)

  }



  // Audit: token_generate

  try {

    const actor = (req as any).user?.name || (req as any).user?.email || 'system'

    await HospitalAuditLog.create({

      actor,

      action: 'token_generate',

      label: 'TOKEN_GENERATE',

      method: req.method,

      path: req.originalUrl,

      at: getPakistanDate() + 'T' + String(new Date(new Date().getTime() + 5*60*60*1000).getUTCHours()).padStart(2,'0') + ':' + String(new Date(new Date().getTime() + 5*60*60*1000).getUTCMinutes()).padStart(2,'0') + ':' + String(new Date(new Date().getTime() + 5*60*60*1000).getUTCSeconds()).padStart(2,'0') + 'Z',

      detail: `Token #${tokenNo} — MRN ${patient.mrn} — Dept ${(department as any)?.name || data.departmentId || 'N/A'} — Doctor ${doctor?.name || 'N/A'} — Services ${data.serviceIds?.length || 0} — Fee ${finalFee}`,

    })

  } catch {}



  // Corporate: create transaction ledger line (OPD)

  if (corporateId && corporatePricing){

    try {

      const baseCorp = Number(corporatePricing.price||0)

      const encDoc: any = enc

      const coPayPct = Math.max(0, Math.min(100, Number(encDoc?.corporateCoPayPercent || (data as any)?.corporateCoPayPercent || 0)))

      const coPayAmt = Math.max(0, baseCorp * (coPayPct/100))

      let net = Math.max(0, baseCorp - coPayAmt)

      const cap = Number(encDoc?.corporateCoverageCap || (data as any)?.corporateCoverageCap || 0) || 0

      if (cap > 0){

        try {

          const existing = await CorporateTransaction.find({ encounterId: enc._id }).select('netToCorporate').lean()

          const used = (existing || []).reduce((s: number, t: any)=> s + Number(t?.netToCorporate||0), 0)

          const remaining = Math.max(0, cap - used)

          net = Math.max(0, Math.min(net, remaining))

        } catch {}

      }

      await CorporateTransaction.create({

        companyId: corporateId,

        patientMrn: String((patient as any)?.mrn || ''),

        patientName: String((patient as any)?.fullName || ''),

        serviceType: 'OPD',

        refType: 'opd_token',

        refId: String((tok as any)?._id || ''),

        encounterId: enc._id as any,

        dateIso,

        departmentId: data.departmentId ? String(data.departmentId) : undefined,

        doctorId: data.doctorId ? String(data.doctorId) : undefined,

        description: 'OPD Consultation',

        qty: 1,

        unitPrice: Number(finalFee||0),

        corpUnitPrice: baseCorp,

        coPay: coPayAmt,

        netToCorporate: net,

        corpRuleId: corporatePricing.appliedRuleId || '',

        status: 'accrued',

      })

    } catch (e) {

      console.warn('Failed to create corporate transaction for OPD token', e)

    }

  }



  res.status(201).json({ token: tok, encounter: enc, pricing: { feeResolved: hasOverride ? finalFee : resolvedFee, discount: data.discount || 0, finalFee, feeSource: hasOverride ? 'override' : feeSource }, corporate: corporatePricing || undefined })

  } catch (err) {

    next(err)

  }

}



export async function list(req: Request, res: Response){

  const q = req.query as any

  const date = q.date ? String(q.date) : ''

  const from = q.from ? String(q.from) : ''

  const to = q.to ? String(q.to) : ''

  const fromTime = q.fromTime ? String(q.fromTime) : ''

  const toTime = q.toTime ? String(q.toTime) : ''

  const status = q.status ? String(q.status) : ''

  const doctorId = q.doctorId ? String(q.doctorId) : ''

  const scheduleId = q.scheduleId ? String(q.scheduleId) : ''

  const departmentId = q.departmentId ? String(q.departmentId) : ''

  const serviceId = q.serviceId ? String(q.serviceId) : ''

  const crit: any = {}

  if (date) {

    crit.dateIso = date

  } else if (from || to) {

    crit.dateIso = {}

    if (from) crit.dateIso.$gte = from

    if (to) crit.dateIso.$lte = to

  }

  // Time-of-day filter (Pakistan time). Applied server-side via $expr so it is
  // consistent across pagination AND the aggregate stats below. fromTime/toTime
  // are 24h "HH:mm" strings from the time picker.
  const toMinutes = (hhmm: string): number | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
    if (!m) return null
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
  }
  const fromMinVal = fromTime ? toMinutes(fromTime) : null
  const toMinVal = toTime ? toMinutes(toTime) : null
  if (fromMinVal != null || toMinVal != null) {
    const minutesOfDay = {
      $add: [
        { $multiply: [{ $hour: { date: '$createdAt', timezone: 'Asia/Karachi' } }, 60] },
        { $minute: { date: '$createdAt', timezone: 'Asia/Karachi' } },
      ],
    }
    const conds: any[] = []
    if (fromMinVal != null) conds.push({ $gte: [minutesOfDay, fromMinVal] })
    if (toMinVal != null) conds.push({ $lte: [minutesOfDay, toMinVal] })
    crit.$expr = conds.length > 1 ? { $and: conds } : conds[0]
  }

  if (status) crit.status = status

  else crit.status = { $ne: 'cancelled' }

  if (doctorId) crit.doctorId = doctorId

  if (departmentId) crit.departmentId = departmentId

  if (scheduleId) crit.scheduleId = scheduleId

  if (serviceId) crit.serviceIds = serviceId



  // Pagination

  const page = Math.max(1, parseInt(String(q.page || '1')))

  const limit = Math.max(1, parseInt(String(q.limit || '10')))

  const skip = (page - 1) * limit



  const [rows, total, allMatchingRows] = await Promise.all([

    HospitalToken.find(crit)

      .sort({ createdAt: -1 })

      .skip(skip)

      .limit(limit)

      .populate('doctorId', 'name')

      .populate('departmentId', 'name')

      .populate('serviceIds', 'name price')

      .populate('patientId', 'mrn fullName fatherName gender age guardianRel phoneNormalized cnicNormalized address')

      .populate({
        path: 'encounterId',
        select: 'triage arrivalMode chiefComplaint bedId',
        populate: {
          path: 'bedId',
          model: 'Hospital_Bed',
          select: 'label floorId locationType locationId'
        }
      })
      .lean(),

    HospitalToken.countDocuments(crit),

    HospitalToken.find(crit).select('fee discount paidMethod status corporateId vitals').lean()

  ])



  // Calculate stats from ALL matching records (not just paginated)

  let cashRevenue = 0

  let cardRevenue = 0

  let corporateTokens = 0

  let totalDiscount = 0

  let discountedTokens = 0

  let returnedPatients = 0



  for (const t of allMatchingRows) {

    if (t.status === 'returned') {

      returnedPatients++

      continue

    }

    if (t.corporateId) {

      corporateTokens++

      continue

    }

    const fee = Number(t.fee || 0)

    const discount = Number(t.discount || 0)

    if (fee > 0) {

      const method = String(t.paidMethod || 'Cash').toLowerCase()

      if (method === 'cash') cashRevenue += fee

      else if (method === 'bank' || method === 'card') cardRevenue += fee

      else cardRevenue += fee

    }

    if (discount > 0) {

      totalDiscount += discount

      discountedTokens++

    }

  }

  // Transform tokens to add bedLocation info
  const bedIds = new Set<string>()
  const floorIds = new Set<string>()
  const roomIds = new Set<string>()
  const wardIds = new Set<string>()
  
  for (const t of rows) {
    const enc = (t as any).encounterId
    const bed = enc?.bedId
    if (bed && typeof bed === 'object') {
      bedIds.add(String(bed._id))
      if (bed.floorId) floorIds.add(String(bed.floorId))
      if (bed.locationType === 'room' && bed.locationId) roomIds.add(String(bed.locationId))
      if (bed.locationType === 'ward' && bed.locationId) wardIds.add(String(bed.locationId))
    }
  }
  
  // Lookup names
  const [floors, rooms, wards] = await Promise.all([
    HospitalFloor.find({ _id: { $in: Array.from(floorIds) } }).select('_id name').lean(),
    HospitalRoom.find({ _id: { $in: Array.from(roomIds) } }).select('_id name').lean(),
    HospitalWard.find({ _id: { $in: Array.from(wardIds) } }).select('_id name').lean(),
  ])
  
  const floorMap = new Map(floors.map((f: any) => [String(f._id), f.name]))
  const roomMap = new Map(rooms.map((r: any) => [String(r._id), r.name]))
  const wardMap = new Map(wards.map((w: any) => [String(w._id), w.name]))
  
  // Transform rows to include bedLocation
  const transformedRows = rows.map((t: any) => {
    const row = t as any
    const enc = row.encounterId
    const bed = enc?.bedId
    
    if (bed && typeof bed === 'object' && enc) {
      const floorName = floorMap.get(String(bed.floorId)) || ''
      const locationName = bed.locationType === 'room' 
        ? (roomMap.get(String(bed.locationId)) || '')
        : (wardMap.get(String(bed.locationId)) || '')
      
      enc.bedLocation = {
        floor: floorName,
        type: bed.locationType,
        location: locationName,
        bed: bed.label
      }
      enc.bedLabel = bed.label
      
      // Keep bedId as string for reference
      enc.bedId = String(bed._id)
    }
    
    return row
  })

  res.json({ 

    tokens: transformedRows, 

    total, 

    page, 

    limit, 

    pages: Math.ceil(total / limit),

    stats: {

      cashRevenue,

      cardRevenue,

      totalRevenue: cashRevenue + cardRevenue,

      corporateTokens,

      totalDiscount,

      discountedTokens,

      returnedPatients

    }

  })

}



export async function getById(req: Request, res: Response){

  const id = String(req.params.id || '')

  if (!id) return res.status(400).json({ error: 'id required' })

  const tok = await HospitalToken.findById(id)

    .populate('doctorId', 'name opdBaseFee opdFollowupFee')

    .populate('departmentId', 'name opdBaseFee opdFollowupFee doctorPrices')

    .populate('serviceIds', 'name price')

    .populate('patientId', 'mrn fullName fatherName gender age guardianRel phoneNormalized cnicNormalized address')

    .populate('encounterId', 'triage arrivalMode chiefComplaint bedId')

    .lean()

  if (!tok) return res.status(404).json({ error: 'Token not found' })

  res.json({ token: tok })

}



export async function updateStatus(req: Request, res: Response){

  const id = req.params.id

  const status = String((req.body as any).status || '')

  if (!['queued','in-progress','completed','returned','cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status' })

  const prev: any = await HospitalToken.findById(id).lean()

  if (!prev) return res.status(404).json({ error: 'Token not found' })



  // If un-returning (returned -> queued/in-progress/completed), ensure the original slot is still free.

  if (prev.status === 'returned' && status !== 'returned' && status !== 'cancelled'){

    const scheduleId = prev.scheduleId ? String(prev.scheduleId) : ''

    const slotNo = prev.slotNo != null ? Number(prev.slotNo) : undefined

    if (scheduleId && slotNo){

      const clash = await HospitalToken.findOne({ _id: { $ne: prev._id }, scheduleId, slotNo, status: { $nin: ['returned','cancelled'] } }).lean()

      if (clash) return res.status(409).json({ error: 'Cannot undo return: slot already booked' })

      const clashAppt = await HospitalAppointment.findOne({ scheduleId, slotNo, status: { $in: ['booked','confirmed','checked-in'] } }).lean()

      if (clashAppt) return res.status(409).json({ error: 'Cannot undo return: slot already booked (appointment)' })

    }

  }



  const tok = await HospitalToken.findByIdAndUpdate(id, { status }, { new: true })

  if (!tok) return res.status(404).json({ error: 'Token not found' })



  // Finance: state-based journals

  // - Active token: ensure latest `opd_token` exists after latest `opd_token_reversal`

  // - Returned/cancelled: ensure latest `opd_token_reversal` exists after latest `opd_token`

  if (status === 'returned' || status === 'cancelled'){

    const wasAlreadyClosed = prev.status === 'returned' || prev.status === 'cancelled'

    if (!wasAlreadyClosed){

      try {

        // Reverse the single journal document (idempotent)

        await reverseOpdTokenJournal(String(id), `Token ${status}`)

      } catch (e) { console.warn('Finance reversal failed', e) }

    }

    // Corporate: create reversal lines for OPD corporate transactions

    try {

      const existing: any[] = await CorporateTransaction.find({ refType: 'opd_token', refId: String(id), status: { $ne: 'reversed' } }).lean()

      for (const tx of existing){

        // Mark original as reversed

        try { await CorporateTransaction.findByIdAndUpdate(String(tx._id), { $set: { status: 'reversed' } }) } catch {}

        // Create negative reversal (accrued) for next claim cycle

        try {

          await CorporateTransaction.create({

            companyId: tx.companyId,

            patientMrn: tx.patientMrn,

            patientName: tx.patientName,

            serviceType: tx.serviceType,

            refType: tx.refType,

            refId: tx.refId,

            encounterId: (tok as any)?.encounterId || undefined,

            dateIso: (tok as any)?.dateIso || getPakistanDate(),

            departmentId: tx.departmentId,

            doctorId: tx.doctorId,

            description: `Reversal: ${tx.description || 'OPD Consultation'}`,

            qty: tx.qty,

            unitPrice: -Math.abs(Number(tx.unitPrice||0)),

            corpUnitPrice: -Math.abs(Number(tx.corpUnitPrice||0)),

            coPay: -Math.abs(Number(tx.coPay||0)),

            netToCorporate: -Math.abs(Number(tx.netToCorporate||0)),

            corpRuleId: tx.corpRuleId,

            status: 'accrued',

            reversalOf: String(tx._id),

          })

        } catch (e) { console.warn('Failed to create corporate reversal for OPD token', e) }

      }

    } catch (e) { console.warn('Corporate reversal lookup failed', e) }

  }



  if (prev.status === 'returned' && status !== 'returned' && status !== 'cancelled'){

    try {

      // Preserve original creator username before re-opening
      let originalCreatedBy: string | undefined
      try {
        const existingJournal: any = await FinanceJournal.findOne({ refType: 'opd_token', refId: String(id) }).lean()
        if (existingJournal?.lines) {
          const lineWithUser = existingJournal.lines.find((l: any) => l?.tags?.createdByUsername)
          if (lineWithUser?.tags?.createdByUsername) originalCreatedBy = String(lineWithUser.tags.createdByUsername)
        }
      } catch {}

      // Re-open token: re-post base journal (idempotent w.r.t latest reversal)

      await postOpdTokenJournal({

        tokenId: String(id),

        dateIso: String(prev?.dateIso || getPakistanDate()),

        fee: Number(prev?.fee || 0),

        doctorId: prev?.doctorId ? String(prev.doctorId) : undefined,

        departmentId: prev?.departmentId ? String(prev.departmentId) : undefined,

        patientId: prev?.patientId ? String(prev.patientId) : undefined,

        patientName: String(prev?.patientName || ''),

        mrn: String(prev?.mrn || ''),

        tokenNo: String(prev?.tokenNo || ''),

        paidMethod: prev?.corporateId ? 'AR' : 'Cash',

        createdByUsername: originalCreatedBy || (req as any).user?.username || (req as any).user?.name || undefined,

      } as any)

    } catch (e) {

      console.warn('Finance undo-return failed', e)

    }

  }

  // Audit: status change mapping

  try {

    const actor = (req as any).user?.name || (req as any).user?.email || 'system'

    const mapping: any = {

      returned: { action: 'token_return', label: 'TOKEN_RETURN' },

      cancelled: { action: 'token_delete', label: 'TOKEN_DELETE' },

    }

    const meta = mapping[status] || { action: 'token_status_update', label: 'TOKEN_STATUS' }

    await HospitalAuditLog.create({

      actor,

      action: meta.action,

      label: meta.label,

      method: req.method,

      path: req.originalUrl,

      at: getPakistanDate() + 'T' + String(new Date(new Date().getTime() + 5*60*60*1000).getUTCHours()).padStart(2,'0') + ':' + String(new Date(new Date().getTime() + 5*60*60*1000).getUTCMinutes()).padStart(2,'0') + ':' + String(new Date(new Date().getTime() + 5*60*60*1000).getUTCSeconds()).padStart(2,'0') + 'Z',

      detail: `Token #${(tok as any).tokenNo || id} — Status ${status}`,

    })

  } catch {}

  res.json({ token: tok })

}



export async function update(req: Request, res: Response){

  const id = String(req.params.id || '')

  if (!id) return res.status(400).json({ error: 'id required' })

  const body: any = req.body || {}

  const hasAny = [

    'discount',

    'doctorId',

    'departmentId',

    'patientId',

    'mrn',

    'patientName',

    'phone',

    'gender',

    'guardianRel',

    'guardianName',

    'cnic',

    'address',

    'age',
    'overrideFee',
    'serviceIds',
    'vitals',
  ].some(k => Object.prototype.hasOwnProperty.call(body, k))

  if (!hasAny) return res.status(400).json({ error: 'No fields to update' })



  const tok: any = await HospitalToken.findById(id)

  if (!tok) return res.status(404).json({ error: 'Token not found' })

  if (tok.status === 'cancelled') return res.status(400).json({ error: 'Cancelled token cannot be edited' })



  // Resolve/patch patient

  const normDigits = (s?: string) => (s||'').replace(/\D+/g,'')

  let patient: any = null

  if (body.patientId || body.mrn || body.patientName || body.phone || body.gender || body.guardianName || body.guardianRel || body.cnic || body.address || body.age) {

    if (body.patientId) {

      patient = await LabPatient.findById(String(body.patientId))

      if (!patient) return res.status(404).json({ error: 'Patient not found' })

    } else if (body.mrn) {

      patient = await LabPatient.findOne({ mrn: String(body.mrn) })

      if (!patient) return res.status(404).json({ error: 'Patient not found' })

    } else {

      // fallback to existing token patient

      patient = tok.patientId ? await LabPatient.findById(String(tok.patientId)) : null

    }

    if (patient) {

      const patch: any = {}

      if (body.patientName != null) patch.fullName = String(body.patientName || '')

      if (body.guardianName != null) patch.fatherName = String(body.guardianName || '')

      if (body.guardianRel != null) patch.guardianRel = String(body.guardianRel || '')

      if (body.gender != null) patch.gender = String(body.gender || '')

      if (body.address != null) patch.address = String(body.address || '')

      if (body.age != null) patch.age = String(body.age || '')

      if (body.phone != null) patch.phoneNormalized = normDigits(String(body.phone || ''))

      if (body.cnic != null) patch.cnicNormalized = normDigits(String(body.cnic || ''))

      if (Object.keys(patch).length) {

        patient = await LabPatient.findByIdAndUpdate(String(patient._id), { $set: patch }, { new: true })

      }

    }

  }



  // Doctor & department resolution (if changed)

  const newDepartmentId = body.departmentId != null ? String(body.departmentId || '') : (tok.departmentId ? String(tok.departmentId) : '')

  const newDoctorId = body.doctorId != null ? String(body.doctorId || '') : (tok.doctorId ? String(tok.doctorId) : '')

  const newServiceIds = body.serviceIds != null ? (Array.isArray(body.serviceIds) ? body.serviceIds : []) : (tok.serviceIds || [])

  if (!newDepartmentId && (!newServiceIds || newServiceIds.length === 0)) return res.status(400).json({ error: 'departmentId or serviceIds required' })

  const department = newDepartmentId ? await HospitalDepartment.findById(newDepartmentId).lean() : null

  if (newDepartmentId && !department) return res.status(400).json({ error: 'Invalid departmentId' })

  let doctor: any = null

  if (newDoctorId) {

    doctor = await HospitalDoctor.findById(newDoctorId).lean()

    if (!doctor) return res.status(400).json({ error: 'Invalid doctorId' })

  }



  // Fee compute

  const currentFee = Number(tok.fee || 0)

  const currentDiscount = Number(tok.discount || 0)

  const currentGross = Math.max(0, currentFee + currentDiscount)

  const newDiscount = Object.prototype.hasOwnProperty.call(body, 'discount') ? Math.max(0, Number(body.discount || 0)) : currentDiscount



  // Base fee used when overrideFee not provided:

  // - if you didn't change fee/discount, keep current fee

  // - if doctor/department/services changed, recompute base gross

  const overrideFeeProvided = Object.prototype.hasOwnProperty.call(body, 'overrideFee')

  const overrideFee = overrideFeeProvided ? Math.max(0, Number(body.overrideFee || 0)) : null



  let baseGross = currentGross

  if (overrideFeeProvided) {

    baseGross = overrideFee as number

  } else {

    const doctorChanged = Object.prototype.hasOwnProperty.call(body, 'doctorId')

    const depChanged = Object.prototype.hasOwnProperty.call(body, 'departmentId')

    const servicesChanged = Object.prototype.hasOwnProperty.call(body, 'serviceIds')

    if (doctorChanged || depChanged || servicesChanged) {

      if (newServiceIds && newServiceIds.length > 0) {

        const svcs = await HospitalErService.find({ _id: { $in: newServiceIds } }).lean()

        baseGross = svcs.reduce((sum: any, s: any) => sum + Number(s.price || 0), 0)

      } else {

        const resolved = resolveOPDFee({ department, doctor, visitType: (tok as any).visitType })

        baseGross = Math.max(0, Number(resolved.fee || 0))

      }

    }

  }



  let serviceNames = tok.serviceNames

  if (Object.prototype.hasOwnProperty.call(body, 'serviceIds')) {

    if (newServiceIds && newServiceIds.length > 0) {

      const svcs = await HospitalErService.find({ _id: { $in: newServiceIds } }).select('name').lean()

      serviceNames = svcs.map((s: any) => s.name).join(', ')

    } else {

      serviceNames = ''

    }

  }



  if (newDiscount > baseGross) return res.status(400).json({ error: 'Discount exceeds fee' })

  const newFee = Math.max(0, baseGross - newDiscount)



  const tokenPatch: any = {

    discount: newDiscount,

    fee: newFee,

    departmentId: newDepartmentId || undefined,

    doctorId: newDoctorId || undefined,

    serviceIds: newServiceIds && newServiceIds.length > 0 ? newServiceIds : undefined,

    serviceNames: serviceNames || undefined,

  }

  if (patient) {

    tokenPatch.patientId = patient._id

    tokenPatch.mrn = patient.mrn

    tokenPatch.patientName = patient.fullName

  } else {

    if (Object.prototype.hasOwnProperty.call(body, 'patientName')) tokenPatch.patientName = String(body.patientName || '')

    if (Object.prototype.hasOwnProperty.call(body, 'mrn')) tokenPatch.mrn = String(body.mrn || '')

  }

  if (Object.prototype.hasOwnProperty.call(body, 'vitals')) tokenPatch.vitals = body.vitals



  const updated = await HospitalToken.findByIdAndUpdate(id, { $set: tokenPatch }, { new: true })

  if (!updated) return res.status(404).json({ error: 'Token not found' })



  // Patch encounter fee

  try { if ((tok as any)?.encounterId) await HospitalEncounter.findByIdAndUpdate((tok as any).encounterId, { $set: { consultationFeeResolved: newFee, departmentId: newDepartmentId, doctorId: newDoctorId || undefined } }) } catch {}



  // Finance: reverse and repost when fee/doctor/department changes

  try {

    const feeChanged = Number(currentFee) !== Number(newFee) || Number(currentDiscount) !== Number(newDiscount)

    const docChanged = String(tok.doctorId || '') !== String(newDoctorId || '')

    const depChanged = String(tok.departmentId || '') !== String(newDepartmentId || '')

    const patientChanged = patient ? String(tok.patientId || '') !== String(patient._id || '') : false

    if (feeChanged || docChanged || depChanged || patientChanged) {

      // Preserve original creator username before reversing
      let originalCreatedBy: string | undefined
      try {
        const existingJournal: any = await FinanceJournal.findOne({ refType: 'opd_token', refId: String(id) }).lean()
        if (existingJournal?.lines) {
          const lineWithUser = existingJournal.lines.find((l: any) => l?.tags?.createdByUsername)
          if (lineWithUser?.tags?.createdByUsername) originalCreatedBy = String(lineWithUser.tags.createdByUsername)
        }
      } catch {}

      await reverseJournalByRef('opd_token', String(id), 'Repost for token edit')

      await postOpdTokenJournal({

        tokenId: String(id),

        dateIso: String((tok as any)?.dateIso || getPakistanDate()),

        fee: Math.max(0, newFee),

        doctorId: newDoctorId || undefined,

        departmentId: newDepartmentId || undefined,

        patientId: patient ? String(patient._id) : (String((tok as any)?.patientId || '') || undefined),

        patientName: patient ? String(patient.fullName || '') : (String((tok as any)?.patientName || '') || undefined),

        mrn: patient ? String(patient.mrn || '') : (String((tok as any)?.mrn || '') || undefined),

        tokenNo: String((tok as any)?.tokenNo || '' ) || undefined,

        paidMethod: (tok as any).corporateId ? 'AR' : ((tok as any).paidMethod || 'Cash'),

        createdByUsername: originalCreatedBy || (req as any).user?.username || (req as any).user?.name || undefined,

      })

    }

  } catch (e) { console.warn('Finance repost failed for token edit', e) }



  // Audit

  try {

    const actor = (req as any).user?.name || (req as any).user?.email || 'system'

    await HospitalAuditLog.create({

      actor,

      action: 'token_edit',

      label: 'TOKEN_EDIT',

      method: req.method,

      path: req.originalUrl,

      at: getPakistanDate() + 'T' + String(new Date(new Date().getTime() + 5*60*60*1000).getUTCHours()).padStart(2,'0') + ':' + String(new Date(new Date().getTime() + 5*60*60*1000).getUTCMinutes()).padStart(2,'0') + ':' + String(new Date(new Date().getTime() + 5*60*60*1000).getUTCSeconds()).padStart(2,'0') + 'Z',

      detail: `Token #${(tok as any)?.tokenNo || id} — Discount ${currentDiscount} -> ${newDiscount}, Fee ${currentFee} -> ${newFee}`,

    })

  } catch {}



  res.json({ token: updated })

}



export async function remove(req: Request, res: Response){

  const id = String(req.params.id || '')

  if (!id) return res.status(400).json({ error: 'id required' })

  const tok: any = await HospitalToken.findById(id)

  if (!tok) return res.status(404).json({ error: 'Token not found' })

  // Reverse finance journal if token was active

  if (tok.status !== 'returned' && tok.status !== 'cancelled') {

    try {

      await reverseOpdTokenJournal(String(id), 'Token deleted')

    } catch (e) { console.warn('Finance reversal failed for token delete', e) }

    // Reverse corporate transactions

    try {

      const existing: any[] = await CorporateTransaction.find({ refType: 'opd_token', refId: String(id), status: { $ne: 'reversed' } }).lean()

      for (const tx of existing){

        try { await CorporateTransaction.findByIdAndUpdate(String(tx._id), { $set: { status: 'reversed' } }) } catch {}

        try {

          await CorporateTransaction.create({

            companyId: tx.companyId,

            patientMrn: tx.patientMrn,

            patientName: tx.patientName,

            serviceType: tx.serviceType,

            refType: tx.refType,

            refId: tx.refId,

            encounterId: tok?.encounterId || undefined,

            dateIso: tok?.dateIso || getPakistanDate(),

            departmentId: tx.departmentId,

            doctorId: tx.doctorId,

            description: `Reversal (delete): ${tx.description || 'OPD Consultation'}`,

            qty: tx.qty,

            unitPrice: -Math.abs(Number(tx.unitPrice||0)),

            corpUnitPrice: -Math.abs(Number(tx.corpUnitPrice||0)),

            coPay: -Math.abs(Number(tx.coPay||0)),

            netToCorporate: -Math.abs(Number(tx.netToCorporate||0)),

            corpRuleId: tx.corpRuleId,

            status: 'accrued',

            reversalOf: String(tx._id),

          })

        } catch (e) { console.warn('Failed to create corporate reversal for token delete', e) }

      }

    } catch (e) { console.warn('Corporate reversal lookup failed for token delete', e) }

  }

  await HospitalToken.deleteOne({ _id: id })

  // Audit

  try {

    const actor = (req as any).user?.name || (req as any).user?.email || 'system'

    await HospitalAuditLog.create({

      actor,

      action: 'token_delete',

      label: 'TOKEN_DELETE',

      method: req.method,

      path: req.originalUrl,

      at: getPakistanDate() + 'T' + String(new Date(new Date().getTime() + 5*60*60*1000).getUTCHours()).padStart(2,'0') + ':' + String(new Date(new Date().getTime() + 5*60*60*1000).getUTCMinutes()).padStart(2,'0') + ':' + String(new Date(new Date().getTime() + 5*60*60*1000).getUTCSeconds()).padStart(2,'0') + 'Z',

      detail: `Token #${tok?.tokenNo || id} deleted`,

    })

  } catch {}

  res.json({ ok: true })

}

