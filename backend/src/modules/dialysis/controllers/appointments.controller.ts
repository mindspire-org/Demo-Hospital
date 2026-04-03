import { Request, Response } from 'express'
import { DialysisAppointment } from '../models/DialysisAppointment'
import { LabPatient } from '../../lab/models/Patient'
import { DialysisToken } from '../models/Token'
import { DialysisSession } from '../models/DialysisSession'
import { ensureForLabPatient } from './dialysisPatients.controller'
import { nextGlobalMrn } from '../../../common/mrn'

export async function list(req: Request, res: Response) {
  const { date, status, patientName, phone, from, to, page = '1', limit = '20' } = req.query as any
  const filter: any = {}
  if (date) filter.appointmentDate = date
  if (status) filter.status = status
  if (from || to) {
    filter.appointmentDate = filter.appointmentDate || {}
    if (from) filter.appointmentDate.$gte = from
    if (to) filter.appointmentDate.$lte = to
  }

  const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)
  const lmt = Math.min(100, Math.max(1, parseInt(limit)))

  const [items, total] = await Promise.all([
    DialysisAppointment.find(filter).sort({ appointmentDate: 1, appointmentTime: 1 }).skip(skip).limit(lmt).lean(),
    DialysisAppointment.countDocuments(filter),
  ])

  // Enrich with lab patient data where available
  const labIds = items.filter((x: any) => x.labPatientId).map((x: any) => String(x.labPatientId))
  const labPatients = labIds.length > 0 ? await LabPatient.find({ _id: { $in: labIds } }).lean() : []
  const labMap = new Map(labPatients.map((p: any) => [String(p._id), p]))

  const enriched = items.map((a: any) => {
    const lp = a.labPatientId ? labMap.get(String(a.labPatientId)) : null
    return {
      ...a,
      patientName: lp?.fullName || a.newPatientName || '-',
      patientPhone: lp?.phoneNormalized || a.newPatientPhone || '',
      patientGender: lp?.gender || a.newPatientGender || '',
      patientAge: lp?.age || a.newPatientAge || '',
      isNewPatient: !a.labPatientId,
    }
  })

  // Apply patientName/phone filter after enrichment
  let filtered = enriched
  if (patientName) {
    const q = String(patientName).toLowerCase()
    filtered = filtered.filter((a: any) => (a.patientName || '').toLowerCase().includes(q))
  }
  if (phone) {
    const q = String(phone).replace(/\D+/g, '')
    filtered = filtered.filter((a: any) => String(a.patientPhone || '').replace(/\D+/g, '').includes(q))
  }

  res.json({ items: filtered, total: filtered.length, page: parseInt(page), limit: lmt })
}

export async function get(req: Request, res: Response) {
  const { id } = req.params
  const appt: any = await DialysisAppointment.findById(id).lean()
  if (!appt) return res.status(404).json({ error: 'Appointment not found' })

  let labPatient = null
  if (appt.labPatientId) {
    labPatient = await LabPatient.findById(appt.labPatientId).lean()
  }

  res.json({
    appointment: {
      ...appt,
      labPatient,
      isNewPatient: !appt.labPatientId,
    },
  })
}

export async function create(req: Request, res: Response) {
  const data = req.body as any

  // Check if patient exists by phone or MRN
  let labPatient: any = null
  const phoneDigits = String(data.phone || '').replace(/\D+/g, '')
  
  if (data.labPatientId) {
    labPatient = await LabPatient.findById(data.labPatientId).lean()
  } else if (data.mrn) {
    labPatient = await LabPatient.findOne({ mrn: data.mrn }).lean()
  } else if (phoneDigits.length >= 10) {
    // Try to find by phone
    labPatient = await LabPatient.findOne({ phoneNormalized: phoneDigits }).lean()
  }

  const apptData: any = {
    appointmentDate: data.appointmentDate,
    appointmentTime: data.appointmentTime,
    sessionTypeId: data.sessionTypeId,
    sessionTypeName: data.sessionTypeName,
    shiftId: data.shiftId,
    shiftName: data.shiftName,
    machineId: data.machineId,
    machineName: data.machineName,
    dialyzerTypeId: data.dialyzerTypeId,
    dialyzerTypeName: data.dialyzerTypeName,
    duration: data.duration || 4,
    notes: data.notes,
    status: 'scheduled',
    createdByUserId: (req as any).user?._id,
    createdByUsername: (req as any).user?.username,
  }

  if (labPatient?._id) {
    // Existing patient - link and use existing MRN
    apptData.labPatientId = labPatient._id
    apptData.mrn = labPatient.mrn
  } else {
    // New patient - store details WITHOUT MRN (MRN assigned on conversion)
    apptData.newPatientName = data.patientName
    apptData.newPatientPhone = data.phone
    apptData.newPatientCnic = data.cnic
    apptData.newPatientGender = data.gender
    apptData.newPatientAge = data.age
    apptData.newPatientGuardianName = data.guardianName
    apptData.newPatientGuardianRel = data.guardianRel
    apptData.newPatientAddress = data.address
  }

  const appt = await DialysisAppointment.create(apptData)
  res.status(201).json({ appointment: appt })
}

export async function update(req: Request, res: Response) {
  const { id } = req.params
  const data = req.body as any

  const appt = await DialysisAppointment.findById(id)
  if (!appt) return res.status(404).json({ error: 'Appointment not found' })

  // Only allow updating if not already converted
  if (appt.status === 'converted') {
    return res.status(400).json({ error: 'Cannot update a converted appointment' })
  }

  const patch: any = {}
  const fields = [
    'appointmentDate', 'appointmentTime', 'sessionTypeId', 'sessionTypeName',
    'shiftId', 'shiftName', 'machineId', 'machineName',
    'dialyzerTypeId', 'dialyzerTypeName', 'duration', 'notes', 'status',
  ]
  for (const f of fields) {
    if (data[f] !== undefined) patch[f] = data[f]
  }

  // Update patient info fields if new patient
  if (!appt.labPatientId) {
    const newPatientFields = ['newPatientName', 'newPatientPhone', 'newPatientCnic', 'newPatientGender', 'newPatientAge', 'newPatientGuardianName', 'newPatientGuardianRel', 'newPatientAddress']
    for (const f of newPatientFields) {
      if (data[f] !== undefined) patch[f] = data[f]
    }
  }

  const updated = await DialysisAppointment.findByIdAndUpdate(id, { $set: patch }, { new: true })
  res.json({ appointment: updated })
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params
  const appt = await DialysisAppointment.findByIdAndDelete(id)
  if (!appt) return res.status(404).json({ error: 'Appointment not found' })
  res.json({ ok: true })
}

export async function convertToToken(req: Request, res: Response) {
  const { id } = req.params
  const data = req.body as any // Additional token data (fee, discount, etc.)

  const appt = await DialysisAppointment.findById(id)
  if (!appt) return res.status(404).json({ error: 'Appointment not found' })
  if (appt.status === 'converted') {
    return res.status(400).json({ error: 'Appointment already converted' })
  }
  if (appt.status === 'cancelled') {
    return res.status(400).json({ error: 'Cannot convert a cancelled appointment' })
  }

  let labPatient: any = null

  if (appt.labPatientId) {
    // Existing patient
    labPatient = await LabPatient.findById(appt.labPatientId).lean()
  } else {
    // New patient - create LabPatient NOW with new MRN
    const newMrn = await nextGlobalMrn()
    const phoneDigits = String(appt.newPatientPhone || '').replace(/\D+/g, '')
    
    labPatient = await LabPatient.create({
      mrn: newMrn,
      fullName: appt.newPatientName,
      phone: appt.newPatientPhone,
      phoneNormalized: phoneDigits,
      cnic: appt.newPatientCnic,
      cnicNormalized: appt.newPatientCnic ? appt.newPatientCnic.replace(/\D+/g, '') : undefined,
      gender: appt.newPatientGender,
      age: appt.newPatientAge,
      fatherName: appt.newPatientGuardianName,
      guardianRel: appt.newPatientGuardianRel,
      address: appt.newPatientAddress,
    })
  }

  if (!labPatient?._id) {
    return res.status(400).json({ error: 'Failed to resolve patient' })
  }

  // Generate token number
  const dateIso = appt.appointmentDate
  const d = dateIso.replace(/-/g, '')
  const count = await DialysisToken.countDocuments({ dateIso })
  const tokenNo = `D${d}${(count + 1).toString().padStart(4, '0')}`

  // Create token
  const token = await DialysisToken.create({
    dateIso,
    tokenNo,
    patientId: labPatient._id,
    mrn: labPatient.mrn,
    patientName: labPatient.fullName,
    phone: labPatient.phoneNormalized,
    age: labPatient.age,
    gender: labPatient.gender,
    sessionTypeId: appt.sessionTypeId,
    sessionTypeName: appt.sessionTypeName,
    shiftId: appt.shiftId,
    shiftName: appt.shiftName,
    machineId: appt.machineId,
    machineName: appt.machineName,
    dialyzerTypeId: appt.dialyzerTypeId,
    dialyzerTypeName: appt.dialyzerTypeName,
    duration: appt.duration || 4,
    notes: appt.notes,
    fee: data.fee || 0,
    discount: data.discount || 0,
    netAmount: (data.fee || 0) - (data.discount || 0),
    receivedAmount: data.receivedAmount || 0,
    receivableAmount: ((data.fee || 0) - (data.discount || 0)) - (data.receivedAmount || 0),
    paidMethod: data.paidMethod || 'Cash',
    status: 'scheduled',
    createdByUserId: (req as any).user?._id,
    createdByUsername: (req as any).user?.username,
  })

  // Ensure Dialysis Patient and create session
  try {
    const dp: any = await ensureForLabPatient(String(labPatient._id))
    await DialysisSession.create({
      dialysisPatientId: dp?._id,
      labPatientId: labPatient._id,
      tokenId: token._id,
      tokenNo: token.tokenNo,
      dateIso,
      dialyzerTypeId: appt.dialyzerTypeId,
      dialyzerTypeName: appt.dialyzerTypeName,
    })
  } catch {
    // ignore
  }

  // Mark appointment as converted
  appt.status = 'converted'
  appt.convertedToTokenId = token._id
  appt.convertedAt = new Date()
  appt.mrn = labPatient.mrn
  appt.labPatientId = labPatient._id
  await appt.save()

  res.status(201).json({ token, appointment: appt, patient: labPatient })
}
