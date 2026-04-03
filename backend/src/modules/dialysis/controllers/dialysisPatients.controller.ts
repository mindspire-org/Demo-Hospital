import { Request, Response } from 'express'
import { DialysisPatient } from '../models/DialysisPatient'
import { LabCounter } from '../../lab/models/Counter'
import { LabPatient } from '../../lab/models/Patient'

async function nextDialysisPatientId(): Promise<{ seq: number; id: string }> {
  const key = 'dialysis_patient_global'
  const c: any = await LabCounter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  const seq = Number(c?.seq || 1)
  const id = `D-${String(seq).padStart(6, '0')}`
  return { seq, id }
}

export async function ensureForLabPatient(labPatientId: string): Promise<any> {
  const existing = await DialysisPatient.findOne({ labPatientId }).lean()
  if (existing) return existing

  const labPat = await LabPatient.findById(labPatientId).lean()
  const { seq, id } = await nextDialysisPatientId()
  const created = await DialysisPatient.create({
    dialysisPatientSeq: seq,
    dialysisPatientId: id,
    labPatientId,
    mrn: (labPat as any)?.mrn,
    active: true,
  })
  return created.toObject ? created.toObject() : created
}

export async function list(req: Request, res: Response) {
  const { q, mrn, page = '1', limit = '20' } = req.query as any
  const filter: any = {}
  if (mrn) filter.mrn = new RegExp(String(mrn), 'i')

  const lmt = Math.min(100, Math.max(1, parseInt(String(limit))))
  const skip = (Math.max(1, parseInt(String(page))) - 1) * lmt

  const [itemsRaw, total] = await Promise.all([
    DialysisPatient.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lmt).lean(),
    DialysisPatient.countDocuments(filter),
  ])

  const items = (itemsRaw || []) as any[]
  let labIds = items.map((x: any) => String(x?.labPatientId || ''))
  labIds = [...new Set(labIds)]

  const labPatients = await LabPatient.find({ _id: { $in: labIds } }).lean()
  const labMap = new Map(labPatients.map((p: any) => [String(p._id), p]))

  const merged = items.map((p: any) => {
    const lp: any = labMap.get(String(p.labPatientId))
    return {
      ...p,
      labPatient: lp ? {
        _id: String(lp._id),
        mrn: lp.mrn,
        fullName: lp.fullName,
        fatherName: lp.fatherName,
        phone: lp.phoneNormalized,
        cnic: lp.cnicNormalized,
        gender: lp.gender,
        age: lp.age,
        address: lp.address,
      } : null,
    }
  }).filter((x: any) => {
    if (!q) return true
    const qq = String(q).trim().toLowerCase()
    const lp = x.labPatient || {}
    const bag = [x.dialysisPatientId, x.mrn, lp.fullName, lp.phone, lp.cnic].filter(Boolean).join(' ').toLowerCase()
    return bag.includes(qq)
  })

  res.json({ items: merged, total, page: parseInt(String(page)), limit: lmt })
}

export async function getById(req: Request, res: Response) {
  const { id } = req.params
  const pat = await DialysisPatient.findById(id).lean() as any
  if (!pat) return res.status(404).json({ error: 'Dialysis patient not found' })
  const lp = await LabPatient.findById(pat.labPatientId).lean()
  res.json({
    patient: {
      ...pat,
      labPatient: lp || null,
    },
  })
}

export async function getByLabPatientId(req: Request, res: Response) {
  const labPatientId = String((req.query as any).labPatientId || '').trim()
  if (!labPatientId) return res.status(400).json({ message: 'labPatientId is required' })
  const pat = await DialysisPatient.findOne({ labPatientId }).lean() as any
  if (!pat) return res.status(404).json({ error: 'Dialysis patient not found' })
  res.json({ patient: pat })
}
