import { Request, Response } from 'express'
import { DialysisToken } from '../models/Token'
import { LabPatient } from '../../lab/models/Patient'
import { ensureForLabPatient } from './dialysisPatients.controller'
import { DialysisSession } from '../models/DialysisSession'

async function genTokenNo(): Promise<string> {
  const date = new Date()
  const d = date.toISOString().slice(0, 10).replace(/-/g, '')
  const dateIso = date.toISOString().slice(0, 10)
  
  // Count tokens for today and increment
  const count = await DialysisToken.countDocuments({ dateIso })
  const seq = (count + 1).toString().padStart(4, '0')
  return `D${d}${seq}`
}

export async function list(req: Request, res: Response) {
  const { date, status, patientName, mrn, page = '1', limit = '20' } = req.query as any
  const filter: any = {}
  if (date) filter.dateIso = date
  if (status) filter.status = status
  if (mrn) filter.mrn = new RegExp(mrn, 'i')
  if (patientName) filter.patientName = new RegExp(patientName, 'i')

  const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)
  const lmt = Math.min(100, Math.max(1, parseInt(limit)))

  const [items, total] = await Promise.all([
    DialysisToken.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lmt).lean(),
    DialysisToken.countDocuments(filter),
  ])

  res.json({ items, total, page: parseInt(page), limit: lmt })
}

export async function create(req: Request, res: Response) {
  const data = req.body as any

  // Get or create patient
  let patient: any = null
  if (data.patientId) {
    patient = await LabPatient.findById(data.patientId).lean()
  } else if (data.mrn) {
    patient = await LabPatient.findOne({ mrn: data.mrn }).lean()
  }

  if (!patient?._id) {
    return res.status(400).json({ error: 'Patient is required (patientId or valid mrn)' })
  }

  const tokenNo = data.tokenNo || await genTokenNo()
  const dateIso = new Date().toISOString().slice(0, 10)

  const token = await DialysisToken.create({
    dateIso,
    tokenNo,
    patientId: patient?._id,
    mrn: patient?.mrn || data.mrn,
    patientName: patient?.fullName || data.patientName,
    phone: patient?.phoneNormalized || data.phone,
    age: patient?.age || data.age,
    gender: patient?.gender || data.gender,
    createdByUserId: (req as any).user?._id,
    createdByUsername: (req as any).user?.username,
    sessionTypeId: data.sessionTypeId || undefined,
    sessionTypeName: data.sessionTypeName,
    shiftId: data.shiftId || undefined,
    shiftName: data.shiftName,
    machineId: data.machineId || undefined,
    machineName: data.machineName,
    dialyzerTypeId: data.dialyzerTypeId || undefined,
    dialyzerTypeName: data.dialyzerTypeName,
    duration: data.duration || 4,
    notes: data.notes,
    fee: data.fee || 0,
    discount: data.discount || 0,
    netAmount: (data.fee || 0) - (data.discount || 0),
    receivedAmount: data.receivedAmount || 0,
    receivableAmount: ((data.fee || 0) - (data.discount || 0)) - (data.receivedAmount || 0),
    paidMethod: data.paidMethod || 'Cash',
    status: 'scheduled',
  })

  // Ensure Dialysis Patient exists and create a session stub for this token
  try {
    const dp: any = await ensureForLabPatient(String(patient._id))
    await DialysisSession.create({
      dialysisPatientId: dp?._id,
      labPatientId: patient._id,
      tokenId: token._id,
      tokenNo: token.tokenNo,
      dateIso,
      dialyzerTypeId: data.dialyzerTypeId || undefined,
      dialyzerTypeName: data.dialyzerTypeName,
    })
  } catch {
    // ignore
  }

  res.status(201).json({ token })
}

export async function get(req: Request, res: Response) {
  const { id } = req.params
  const token = await DialysisToken.findById(id).lean()
  if (!token) return res.status(404).json({ error: 'Token not found' })
  res.json({ token })
}

export async function getByTokenNo(req: Request, res: Response) {
  const { tokenNo } = req.params
  const token = await DialysisToken.findOne({ tokenNo }).lean()
  if (!token) return res.status(404).json({ error: 'Token not found' })
  res.json({ token })
}

export async function update(req: Request, res: Response) {
  const { id } = req.params
  const data = req.body as any
  const patch: any = {}

  if (data.sessionTypeId !== undefined) patch.sessionTypeId = data.sessionTypeId
  if (data.sessionTypeName !== undefined) patch.sessionTypeName = data.sessionTypeName
  if (data.shiftId !== undefined) patch.shiftId = data.shiftId
  if (data.shiftName !== undefined) patch.shiftName = data.shiftName
  if (data.machineId !== undefined) patch.machineId = data.machineId
  if (data.machineName !== undefined) patch.machineName = data.machineName
  if (data.dialyzerTypeId !== undefined) patch.dialyzerTypeId = data.dialyzerTypeId
  if (data.dialyzerTypeName !== undefined) patch.dialyzerTypeName = data.dialyzerTypeName
  if (data.duration !== undefined) patch.duration = data.duration
  if (data.notes !== undefined) patch.notes = data.notes
  if (data.fee !== undefined) patch.fee = data.fee
  if (data.discount !== undefined) patch.discount = data.discount
  if (data.receivedAmount !== undefined) patch.receivedAmount = data.receivedAmount
  if (data.fee !== undefined || data.discount !== undefined || data.receivedAmount !== undefined) {
    const existing = await DialysisToken.findById(id).lean() as any
    const fee = data.fee ?? existing?.fee ?? 0
    const discount = data.discount ?? existing?.discount ?? 0
    const net = fee - discount
    const received = data.receivedAmount ?? existing?.receivedAmount ?? 0
    patch.netAmount = net
    patch.receivableAmount = Math.max(0, net - received)
  }
  if (data.status !== undefined) patch.status = data.status

  const token = await DialysisToken.findByIdAndUpdate(id, { $set: patch }, { new: true })
  if (!token) return res.status(404).json({ error: 'Token not found' })
  res.json({ token })
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params
  const token = await DialysisToken.findByIdAndDelete(id)
  if (!token) return res.status(404).json({ error: 'Token not found' })
  res.json({ success: true })
}
