import { Request, Response } from 'express'
import { createPrescriptionSchema, updatePrescriptionSchema } from '../validators/prescription'
import { HospitalPrescription } from '../models/Prescription'
import { HospitalEncounter } from '../models/Encounter'
import { HospitalIpdDischargeSummary } from '../models/IpdDischargeSummary'
import { LabPatient } from '../../lab/models/Patient'

export async function create(req: Request, res: Response){
  const data = createPrescriptionSchema.parse(req.body)
  const enc = await HospitalEncounter.findById(data.encounterId)
  if (!enc) return res.status(404).json({ error: 'Encounter not found' })
  if (enc.type !== 'OPD') return res.status(400).json({ error: 'Only OPD encounters can have prescriptions' })

  const att: any = (data as any).manualAttachment
  if (att && att.dataUrl && !att.uploadedAt) att.uploadedAt = new Date()

  const pres = await HospitalPrescription.create({
    patientId: enc.patientId,
    encounterId: data.encounterId,
    tokenNo: (data as any).tokenNo,
    prescriptionMode: (data as any).prescriptionMode || 'electronic',
    manualAttachment: att,
    items: (data as any).items || [],
    labTests: data.labTests,
    labNotes: data.labNotes,
    diagnosticTests: (data as any).diagnosticTests,
    diagnosticNotes: (data as any).diagnosticNotes,
    primaryComplaint: (data as any).primaryComplaint,
    primaryComplaintHistory: (data as any).primaryComplaintHistory,
    familyHistory: (data as any).familyHistory,
    treatmentHistory: (data as any).treatmentHistory,
    allergyHistory: (data as any).allergyHistory,
    history: data.history,
    examFindings: data.examFindings,
    diagnosis: data.diagnosis,
    advice: data.advice,
    vitals: (data as any).vitals,
    preAnesthesia: (data as any).preAnesthesia,
    createdBy: data.createdBy,
  })

  res.status(201).json({ prescription: pres })
}

export async function list(req: Request, res: Response){
  const q = req.query as any
  const doctorId = q.doctorId ? String(q.doctorId) : ''
  const patientMrn = q.patientMrn ? String(q.patientMrn) : ''
  const from = q.from ? new Date(String(q.from)) : null
  const to = q.to ? new Date(String(q.to)) : null
  if (to) to.setHours(23,59,59,999)
  const page = q.page ? Math.max(1, parseInt(String(q.page))) : 1
  const limit = q.limit ? Math.max(1, Math.min(200, parseInt(String(q.limit)))) : 50

  let encCrit: any = { type: 'OPD' }
  if (doctorId) encCrit.doctorId = doctorId
  if (patientMrn) {
    const pDoc = await LabPatient.findOne({ mrn: patientMrn }).select('_id').lean()
    if (!pDoc) return res.json({ prescriptions: [], total: 0, page, limit })
    encCrit.patientId = (pDoc as any)._id
  }
  const encs = await HospitalEncounter.find(encCrit).select('_id').lean()
  const encIds = encs.map(e => e._id)

  const presCrit: any = {}
  if (encIds.length) presCrit.encounterId = { $in: encIds }
  if (from || to) {
    presCrit.createdAt = {}
    if (from) presCrit.createdAt.$gte = from
    if (to) presCrit.createdAt.$lte = to
  }

  const total = await HospitalPrescription.countDocuments(presCrit)
  const rows = await HospitalPrescription.find(presCrit)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({ path: 'encounterId', select: 'doctorId patientId startAt', populate: [{ path: 'doctorId', select: 'name' }, { path: 'patientId', select: 'fullName mrn' }] })
    .lean()

  // Also fetch IPD discharge summary prescriptions for patient history
  let ipdPrescriptions: any[] = []
  if (patientMrn) {
    const pDoc = await LabPatient.findOne({ mrn: patientMrn }).select('_id').lean()
    if (pDoc) {
      const ipdEncs = await HospitalEncounter.find({
        patientId: (pDoc as any)._id,
        type: 'IPD'
      }).select('_id').lean()
      const ipdEncIds = ipdEncs.map(e => e._id)

      if (ipdEncIds.length > 0) {
        const dischargeCrit: any = { encounterId: { $in: ipdEncIds }, medications: { $exists: true, $not: { $size: 0 } } }
        if (from || to) {
          dischargeCrit.createdAt = {}
          if (from) dischargeCrit.createdAt.$gte = from
          if (to) dischargeCrit.createdAt.$lte = to
        }

        const dischargeSummaries = await HospitalIpdDischargeSummary.find(dischargeCrit)
          .populate('encounterId', 'doctorId patientId startAt admissionNo')
          .populate('doctorId', 'name')
          .sort({ createdAt: -1 })
          .lean()

        ipdPrescriptions = dischargeSummaries.map((ds: any) => ({
          _id: String(ds._id) + '_ipd',
          patientId: ds.encounterId?.patientId,
          encounterId: ds.encounterId,
          doctorId: ds.doctorId || ds.encounterId?.doctorId,
          prescriptionMode: 'electronic',
          items: (ds.medications || []).map((med: string) => ({
            medicine: med,
            dosage: '',
            frequency: '',
            duration: '',
            notes: '',
            route: '',
            instruction: ''
          })),
          labTests: [],
          labNotes: '',
          diagnosticTests: [],
          diagnosticNotes: '',
          primaryComplaint: '',
          primaryComplaintHistory: '',
          familyHistory: '',
          treatmentHistory: '',
          allergyHistory: '',
          history: '',
          examFindings: '',
          diagnosis: ds.finalDiagnosis || ds.provisionalDiagnosis || '',
          advice: ds.dischargeAdvice || '',
          vitals: {},
          tokenNo: ds.encounterId?.admissionNo || '',
          createdBy: ds.createdBy || '',
          createdAt: ds.createdAt,
          updatedAt: ds.updatedAt,
          source: 'ipd_discharge'
        }))
      }
    }
  }

  // Combine OPD prescriptions and IPD discharge prescriptions
  const combinedPrescriptions = [...rows, ...ipdPrescriptions].sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const combinedTotal = total + ipdPrescriptions.length
  const paginated = combinedPrescriptions.slice((page - 1) * limit, page * limit)

  res.json({ prescriptions: paginated, total: combinedTotal, page, limit })
}

export async function getById(req: Request, res: Response){
  const { id } = req.params as any

  // Handle IPD discharge summary prescriptions
  if (String(id).endsWith('_ipd')) {
    const dsId = String(id).replace('_ipd', '')
    const ds: any = await HospitalIpdDischargeSummary.findById(dsId)
      .populate('encounterId', 'doctorId patientId startAt admissionNo')
      .populate('doctorId', 'name')
      .lean()
    if (!ds) return res.status(404).json({ error: 'Prescription not found' })

    const prescription = {
      _id: String(ds._id) + '_ipd',
      patientId: ds.encounterId?.patientId,
      encounterId: ds.encounterId,
      doctorId: ds.doctorId || ds.encounterId?.doctorId,
      prescriptionMode: 'electronic',
      items: (ds.medications || []).map((med: string) => ({
        medicine: med,
        dosage: '',
        frequency: '',
        duration: '',
        notes: '',
        route: '',
        instruction: ''
      })),
      labTests: [],
      labNotes: '',
      diagnosticTests: [],
      diagnosticNotes: '',
      primaryComplaint: '',
      primaryComplaintHistory: '',
      familyHistory: '',
      treatmentHistory: '',
      allergyHistory: '',
      history: '',
      examFindings: '',
      diagnosis: ds.finalDiagnosis || ds.provisionalDiagnosis || '',
      advice: ds.dischargeAdvice || '',
      vitals: {},
      tokenNo: ds.encounterId?.admissionNo || '',
      createdBy: ds.createdBy || '',
      createdAt: ds.createdAt,
      updatedAt: ds.updatedAt,
      source: 'ipd_discharge'
    }
    return res.json({ prescription })
  }

  const row: any = await HospitalPrescription.findById(String(id))
    .populate({ path: 'encounterId', select: 'doctorId patientId startAt', populate: [{ path: 'doctorId', select: 'name' }, { path: 'patientId', select: 'fullName mrn' }] })
    .lean()
  if (!row) return res.status(404).json({ error: 'Prescription not found' })
  
  // Fallback: fetch tokenNo from Token collection if not on prescription
  if (!row.tokenNo && row.encounterId) {
    try {
      const { HospitalToken } = await import('../models/Token')
      const tok: any = await HospitalToken.findOne({ encounterId: String(row.encounterId?._id || row.encounterId) }).select('tokenNo').lean()
      if (tok?.tokenNo) row.tokenNo = tok.tokenNo
    } catch {}
  }

  // Fallback: fetch vitals from Token collection if not on prescription
  if (!row.vitals && row.encounterId) {
    try {
      const { HospitalToken } = await import('../models/Token')
      const tok: any = await HospitalToken.findOne({ encounterId: String(row.encounterId?._id || row.encounterId) }).select('vitals').lean()
      if (tok?.vitals) row.vitals = tok.vitals
    } catch {}
  }

  res.json({ prescription: row })
}

export async function update(req: Request, res: Response){
  const { id } = req.params as any
  const data = updatePrescriptionSchema.parse(req.body)
  const set: any = {}
  if ((data as any).tokenNo !== undefined) set.tokenNo = (data as any).tokenNo
  if ((data as any).prescriptionMode !== undefined) set.prescriptionMode = (data as any).prescriptionMode
  if ((data as any).manualAttachment !== undefined) {
    const att: any = (data as any).manualAttachment
    if (att && att.dataUrl && !att.uploadedAt) att.uploadedAt = new Date()
    set.manualAttachment = att
  }
  if (data.items) set.items = data.items
  if (data.labTests !== undefined) set.labTests = data.labTests
  if (data.labNotes !== undefined) set.labNotes = data.labNotes
  if ((data as any).diagnosticTests !== undefined) set.diagnosticTests = (data as any).diagnosticTests
  if ((data as any).diagnosticNotes !== undefined) set.diagnosticNotes = (data as any).diagnosticNotes
  if ((data as any).primaryComplaint !== undefined) set.primaryComplaint = (data as any).primaryComplaint
  if ((data as any).primaryComplaintHistory !== undefined) set.primaryComplaintHistory = (data as any).primaryComplaintHistory
  if ((data as any).familyHistory !== undefined) set.familyHistory = (data as any).familyHistory
  if ((data as any).treatmentHistory !== undefined) set.treatmentHistory = (data as any).treatmentHistory
  if ((data as any).alergyHistory !== undefined) set.allergyHistory = (data as any).alergyHistory
  if ((data as any).allergyHistory !== undefined) set.allergyHistory = (data as any).allergyHistory
  if (data.history !== undefined) set.history = data.history
  if (data.examFindings !== undefined) set.examFindings = data.examFindings
  if (data.diagnosis !== undefined) set.diagnosis = data.diagnosis
  if (data.advice !== undefined) set.advice = data.advice
  if ((data as any).vitals !== undefined) set.vitals = (data as any).vitals
  if ((data as any).preAnesthesia !== undefined) set.preAnesthesia = (data as any).preAnesthesia
  const row = await HospitalPrescription.findByIdAndUpdate(String(id), { $set: set }, { new: true })
    .populate({ path: 'encounterId', select: 'doctorId patientId startAt', populate: [{ path: 'doctorId', select: 'name' }, { path: 'patientId', select: 'fullName mrn' }] })
    .lean()
  if (!row) return res.status(404).json({ error: 'Prescription not found' })
  res.json({ prescription: row })
}

export async function getByEncounterId(req: Request, res: Response){
  const { encounterId } = req.params as any
  const row: any = await HospitalPrescription.findOne({ encounterId: String(encounterId) })
    .populate({ path: 'encounterId', select: 'doctorId patientId startAt', populate: [{ path: 'doctorId', select: 'name' }, { path: 'patientId', select: 'fullName mrn' }] })
    .lean()
  
  // Fallback: check if IPD discharge summary exists for this encounter
  if (!row) {
    const ds: any = await HospitalIpdDischargeSummary.findOne({ encounterId: String(encounterId), medications: { $exists: true, $not: { $size: 0 } } })
      .populate('encounterId', 'doctorId patientId startAt admissionNo')
      .populate('doctorId', 'name')
      .lean()
    if (ds) {
      return res.json({
        prescription: {
          _id: String(ds._id) + '_ipd',
          patientId: ds.encounterId?.patientId,
          encounterId: ds.encounterId,
          doctorId: ds.doctorId || ds.encounterId?.doctorId,
          prescriptionMode: 'electronic',
          items: (ds.medications || []).map((med: string) => ({
            medicine: med,
            dosage: '',
            frequency: '',
            duration: '',
            notes: '',
            route: '',
            instruction: ''
          })),
          labTests: [],
          labNotes: '',
          diagnosticTests: [],
          diagnosticNotes: '',
          primaryComplaint: '',
          primaryComplaintHistory: '',
          familyHistory: '',
          treatmentHistory: '',
          allergyHistory: '',
          history: '',
          examFindings: '',
          diagnosis: ds.finalDiagnosis || ds.provisionalDiagnosis || '',
          advice: ds.dischargeAdvice || '',
          vitals: {},
          tokenNo: ds.encounterId?.admissionNo || '',
          createdBy: ds.createdBy || '',
          createdAt: ds.createdAt,
          updatedAt: ds.updatedAt,
          source: 'ipd_discharge'
        }
      })
    }
    return res.json({ prescription: null })
  }

  // Fallback: fetch tokenNo from Token collection if not on prescription
  if (!row.tokenNo && encounterId) {
    try {
      const { HospitalToken } = await import('../models/Token')
      const tok: any = await HospitalToken.findOne({ encounterId: String(encounterId) }).select('tokenNo').lean()
      if (tok?.tokenNo) row.tokenNo = tok.tokenNo
    } catch {}
  }

  // Fallback: fetch vitals from Token collection if not on prescription
  if (!row.vitals && encounterId) {
    try {
      const { HospitalToken } = await import('../models/Token')
      const tok: any = await HospitalToken.findOne({ encounterId: String(encounterId) }).select('vitals').lean()
      if (tok?.vitals) row.vitals = tok.vitals
    } catch {}
  }

  res.json({ prescription: row })
}

export async function upsertVitals(req: Request, res: Response){
  const { encounterId } = req.params as any
  const vitals = (req as any).body?.vitals
  if (!vitals) return res.status(400).json({ error: 'vitals required' })

  const enc = await HospitalEncounter.findById(encounterId)
  if (!enc) return res.status(404).json({ error: 'Encounter not found' })

  // Store vitals in the token collection instead of prescription
  const { HospitalToken } = await import('../models/Token')
  const token = await HospitalToken.findOne({ encounterId: String(encounterId) })
  if (token) {
    await HospitalToken.findByIdAndUpdate(token._id, { $set: { vitals } }, { new: true })
  } else {
    // If no token exists, create a minimal prescription with just vitals as fallback
    let pres = await HospitalPrescription.findOne({ encounterId: String(encounterId) })
    if (!pres) {
      pres = await HospitalPrescription.create({
        patientId: enc.patientId,
        encounterId: String(encounterId),
        tokenNo: (req as any).body?.tokenNo,
        prescriptionMode: 'electronic',
        items: [],
        vitals,
      })
    } else {
      pres = await HospitalPrescription.findByIdAndUpdate(pres._id, { $set: { vitals } }, { new: true })
    }
    const row = await HospitalPrescription.findById(pres._id)
      .populate({ path: 'encounterId', select: 'doctorId patientId startAt', populate: [{ path: 'doctorId', select: 'name' }, { path: 'patientId', select: 'fullName mrn' }] })
      .lean()
    return res.json({ prescription: row })
  }

  // Return the updated token with vitals
  const updatedToken = await HospitalToken.findOne({ encounterId: String(encounterId) })
    .populate('doctorId', 'name')
    .populate('departmentId', 'name')
    .populate('patientId', 'mrn fullName fatherName gender age guardianRel phoneNormalized cnicNormalized address')
    .lean()
  res.json({ token: updatedToken })
}

export async function remove(req: Request, res: Response){
  const { id } = req.params as any
  const row = await HospitalPrescription.findByIdAndDelete(String(id))
  if (!row) return res.status(404).json({ error: 'Prescription not found' })
  res.json({ ok: true })
}
