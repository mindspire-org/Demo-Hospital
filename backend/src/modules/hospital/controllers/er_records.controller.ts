import { Request, Response } from 'express'
import { HospitalEncounter } from '../models/Encounter'
import { HospitalErVital } from '../models/ErVital'
import { HospitalErMedicationOrder } from '../models/ErMedicationOrder'
import { HospitalErClinicalNote } from '../models/ErClinicalNote'
import { HospitalErInitialAssessment } from '../models/ErInitialAssessment'

async function getEREncounter(encounterId: string){
  const enc = await HospitalEncounter.findById(encounterId)
  if (!enc) throw { status: 404, error: 'Encounter not found' }
  if (enc.type !== 'ER') throw { status: 400, error: 'Encounter is not ER' }
  return enc
}

function handleError(res: Response, e: any){
  console.error('ER Records Error:', e)
  if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' })
  if (e?.status) return res.status(e.status).json({ error: e.error || 'Error' })
  // Return actual error message in development for debugging
  const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : (e?.message || 'Internal Server Error')
  return res.status(500).json({ error: message })
}

// Vitals
export async function createVital(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const data = req.body
    const row = await HospitalErVital.create({ ...data, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ vital: row })
  }catch(e){ return handleError(res, e) }
}

export async function listVitals(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const total = await HospitalErVital.countDocuments({ encounterId: enc._id })
    const rows = await HospitalErVital.find({ encounterId: enc._id }).sort({ recordedAt: -1, createdAt: -1 }).skip((page-1)*limit).limit(limit)
    res.json({ vitals: rows, total, page, limit })
  }catch(e){ return handleError(res, e) }
}

export async function updateVital(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const data = req.body
    const row = await HospitalErVital.findByIdAndUpdate(String(id), { $set: data }, { new: true })
    if (!row) return res.status(404).json({ error: 'Vital not found' })
    res.json({ vital: row })
  }catch(e){ return handleError(res, e) }
}

export async function removeVital(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const row = await HospitalErVital.findByIdAndDelete(String(id))
    if (!row) return res.status(404).json({ error: 'Vital not found' })
    res.json({ ok: true })
  }catch(e){ return handleError(res, e) }
}

// Medication Orders
export async function createMedicationOrder(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const data = req.body
    const row = await HospitalErMedicationOrder.create({ ...data, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ order: row })
  }catch(e){ return handleError(res, e) }
}

export async function listMedicationOrders(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const total = await HospitalErMedicationOrder.countDocuments({ encounterId: enc._id })
    const rows = await HospitalErMedicationOrder.find({ encounterId: enc._id }).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit)
    res.json({ orders: rows, total, page, limit })
  }catch(e){ return handleError(res, e) }
}

export async function updateMedicationOrder(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const data = req.body
    const row = await HospitalErMedicationOrder.findByIdAndUpdate(String(id), { $set: data }, { new: true })
    if (!row) return res.status(404).json({ error: 'Medication order not found' })
    res.json({ order: row })
  }catch(e){ return handleError(res, e) }
}

export async function removeMedicationOrder(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const row = await HospitalErMedicationOrder.findByIdAndDelete(String(id))
    if (!row) return res.status(404).json({ error: 'Medication order not found' })
    res.json({ ok: true })
  }catch(e){ return handleError(res, e) }
}

export async function executeMedicationOrder(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const { quantity, remarks, executedAt } = req.body as any
    const staffName = (req as any).user?.username || (req as any).user?.fullName || 'Staff'
    const executedBy = (req as any).user?._id
    
    const row = await HospitalErMedicationOrder.findByIdAndUpdate(String(id), {
      $push: {
        executions: {
          quantity: Number(quantity) || 1,
          remarks: String(remarks || ''),
          executedAt: executedAt ? new Date(executedAt) : new Date(),
          executedBy,
          staffName
        }
      }
    }, { new: true })
    
    if (!row) return res.status(404).json({ error: 'Medication order not found' })
    res.json({ order: row })
  }catch(e){ return handleError(res, e) }
}

export async function stopMedicationOrder(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const row = await HospitalErMedicationOrder.findByIdAndUpdate(String(id), {
      $set: { status: 'stopped' }
    }, { new: true })
    if (!row) return res.status(404).json({ error: 'Medication order not found' })
    res.json({ order: row })
  }catch(e){ return handleError(res, e) }
}

// Clinical Notes
export async function createClinicalNote(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const data = req.body
    const row = await HospitalErClinicalNote.create({ ...data, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ note: row })
  }catch(e){ return handleError(res, e) }
}

export async function listClinicalNotes(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    if (q.type) crit.type = String(q.type)
    const total = await HospitalErClinicalNote.countDocuments(crit)
    const rows = await HospitalErClinicalNote.find(crit).sort({ recordedAt: -1, createdAt: -1 }).skip((page-1)*limit).limit(limit)
    res.json({ notes: rows, total, page, limit })
  }catch(e){ return handleError(res, e) }
}

export async function updateClinicalNote(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const data = req.body
    const row = await HospitalErClinicalNote.findByIdAndUpdate(String(id), { $set: data }, { new: true })
    if (!row) return res.status(404).json({ error: 'Clinical note not found' })
    res.json({ note: row })
  }catch(e){ return handleError(res, e) }
}

export async function removeClinicalNote(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const row = await HospitalErClinicalNote.findByIdAndDelete(String(id))
    if (!row) return res.status(404).json({ error: 'Clinical note not found' })
    res.json({ ok: true })
  }catch(e){ return handleError(res, e) }
}

// Initial Assessment
export async function createInitialAssessment(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const data = req.body
    const row = await HospitalErInitialAssessment.create({ ...data, encounterId: enc._id, patientId: enc.patientId })

    // Update Encounter with initial assessment info (not triage - different enums)
    const updateData: any = {
      erFirstAssessmentTime: data.assessmentTime || new Date(),
      chiefComplaint: data.chiefComplaint,
    }
    await HospitalEncounter.findByIdAndUpdate(enc._id, { $set: updateData })

    res.status(201).json({ assessment: row })
  }catch(e){ return handleError(res, e) }
}

export async function listInitialAssessments(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const total = await HospitalErInitialAssessment.countDocuments({ encounterId: enc._id })
    const rows = await HospitalErInitialAssessment.find({ encounterId: enc._id }).sort({ assessmentTime: -1, createdAt: -1 }).skip((page-1)*limit).limit(limit)
    res.json({ assessments: rows, total, page, limit })
  }catch(e){ return handleError(res, e) }
}

// Pharmacy Orders
import { ErPharmacyOrder } from '../models/ErPharmacyOrder'
import { HospitalReferral } from '../models/Referral'

export async function createPharmacyOrder(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const data = req.body
    
    // Create the structured ER Pharmacy Order
    const order = await ErPharmacyOrder.create({
      ...data,
      encounterId: enc._id,
      patientId: enc.patientId,
      status: 'pending'
    })

    // Create the workflow Hospital Referral
    const notes = 'Manual ER Referral\nMedicines:\n' + (data.items || []).map((it: any) => `${it.qty}x ${it.name}`).join('\n')
    const ref = await HospitalReferral.create({
      type: 'pharmacy',
      source: 'ER',
      status: 'pending',
      patientId: enc.patientId,
      encounterId: enc._id,
      doctorId: data.doctorId,
      notes,
      linkedOrderId: order._id
    })

    // Link back to the order
    order.linkedReferralId = ref._id
    await order.save()

    res.status(201).json({ order })
  }catch(e){ return handleError(res, e) }
}

export async function listPharmacyOrders(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const total = await ErPharmacyOrder.countDocuments({ encounterId: enc._id })
    const rows = await ErPharmacyOrder.find({ encounterId: enc._id })
      .populate('linkedReferralId')
      .sort({ createdAt: -1 })
      .skip((page-1)*limit)
      .limit(limit)
    res.json({ orders: rows, total, page, limit })
  }catch(e){ return handleError(res, e) }
}

export async function updatePharmacyOrder(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const data = req.body
    const order = await ErPharmacyOrder.findByIdAndUpdate(String(id), { $set: data }, { new: true })
    if (!order) return res.status(404).json({ error: 'Order not found' })
    
    // Also update the linked referral
    if (order.linkedReferralId && data.items) {
      const notes = 'Manual ER Referral\nMedicines:\n' + data.items.map((it: any) => `${it.qty}x ${it.name}`).join('\n')
      await HospitalReferral.findByIdAndUpdate(order.linkedReferralId, { $set: { notes } })
    }

    res.json({ order })
  }catch(e){ return handleError(res, e) }
}

export async function removePharmacyOrder(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const order = await ErPharmacyOrder.findById(String(id))
    if (!order) return res.status(404).json({ error: 'Order not found' })
    
    // Delete linked referral
    if (order.linkedReferralId) {
      await HospitalReferral.findByIdAndDelete(order.linkedReferralId)
    }
    
    await ErPharmacyOrder.findByIdAndDelete(String(id))
    
    res.json({ ok: true })
  }catch(e){ return handleError(res, e) }
}

// Stroke Assessment
import { HospitalErStrokeAssessment } from '../models/ErStrokeAssessment'

export async function createStrokeAssessment(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const data = req.body
    const row = await HospitalErStrokeAssessment.create({ ...data, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ assessment: row })
  }catch(e){ return handleError(res, e) }
}

export async function listStrokeAssessments(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const total = await HospitalErStrokeAssessment.countDocuments({ encounterId: enc._id })
    const rows = await HospitalErStrokeAssessment.find({ encounterId: enc._id }).sort({ assessmentTime: -1, createdAt: -1 }).skip((page-1)*limit).limit(limit)
    res.json({ assessments: rows, total, page, limit })
  }catch(e){ return handleError(res, e) }
}

export async function updateStrokeAssessment(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const data = req.body
    const row = await HospitalErStrokeAssessment.findByIdAndUpdate(String(id), { $set: data }, { new: true })
    if (!row) return res.status(404).json({ error: 'Stroke assessment not found' })
    res.json({ assessment: row })
  }catch(e){ return handleError(res, e) }
}

export async function removeStrokeAssessment(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const row = await HospitalErStrokeAssessment.findByIdAndDelete(String(id))
    if (!row) return res.status(404).json({ error: 'Stroke assessment not found' })
    res.json({ ok: true })
  }catch(e){ return handleError(res, e) }
}
