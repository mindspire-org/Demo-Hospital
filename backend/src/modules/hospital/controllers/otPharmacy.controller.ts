import { Request, Response } from 'express'
import { HospitalOtPharmacyRequest } from '../models/OtPharmacyRequest'
import { HospitalEncounter } from '../models/Encounter'
import { HospitalIpdBillingItem } from '../models/IpdBillingItem'
import { InventoryItem } from '../../indoorpharmacy/models/indoorInventoryItem'
import mongoose from 'mongoose'

function handleError(res: Response, e: any) {
  if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' })
  if (e?.code === 11000) return res.status(409).json({ error: 'Duplicate entry' })
  if (e?.status) return res.status(e.status).json({ error: e.error || 'Error' })
  return res.status(500).json({ error: 'Internal Server Error' })
}

function generateRequestId() {
  const now = new Date()
  const key = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `OT-${key}-${rand}`
}

// ── Request OT Medications ──

export async function requestOTMedications(req: Request, res: Response) {
  try {
    const body = req.body as any
    const otScheduleId = body.otScheduleId
    if (!otScheduleId) return res.status(400).json({ error: 'otScheduleId required' })

    const encounterId = body.encounterId
    if (!encounterId || !mongoose.isValidObjectId(encounterId)) {
      return res.status(400).json({ error: 'Invalid encounterId' })
    }

    const encounter = await HospitalEncounter.findById(String(encounterId)).lean() as any
    if (!encounter) return res.status(404).json({ error: 'Encounter not found' })

    const items = (body.items || []).map((it: any) => ({
      medicineId: it.medicineId ? String(it.medicineId) : undefined,
      name: String(it.name || ''),
      qty: Number(it.qty || 1),
      unit: String(it.unit || ''),
      route: String(it.route || ''),
      purpose: String(it.purpose || ''),
      unitPrice: Number(it.unitPrice || 0),
    }))

    const request = await HospitalOtPharmacyRequest.create({
      requestId: generateRequestId(),
      otScheduleId: String(otScheduleId),
      surgeryId: body.surgeryId ? String(body.surgeryId) : undefined,
      procedureId: body.procedureId ? String(body.procedureId) : undefined,
      encounterId: String(encounterId),
      patientId: String(encounter.patientId),
      patientName: body.patientName || '',
      items,
      sourceType: body.sourceType || 'indoor_pharmacy',
      status: 'requested',
      billingMode: body.billingMode || 'patient_bill',
      requestedBy: body.requestedBy ? String(body.requestedBy) : undefined,
      anesthetistId: body.anesthetistId ? String(body.anesthetistId) : undefined,
      surgeonId: body.surgeonId ? String(body.surgeonId) : undefined,
      notes: String(body.notes || ''),
    })

    res.status(201).json({ request })
  } catch (e) { return handleError(res, e) }
}

export async function getOTPharmacyRequests(req: Request, res: Response) {
  try {
    const q = req.query as any
    const { scheduleId } = req.params as any

    const crit: any = {}
    if (scheduleId) crit.otScheduleId = String(scheduleId)
    if (q.status) crit.status = String(q.status)
    if (q.sourceType) crit.sourceType = String(q.sourceType)

    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))

    const total = await HospitalOtPharmacyRequest.countDocuments(crit)
    const rows = await HospitalOtPharmacyRequest.find(crit)
      .sort({ requestedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
    res.json({ requests: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function approveOTRequest(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const { approvedBy } = req.body as any
    const request = await HospitalOtPharmacyRequest.findByIdAndUpdate(
      String(id),
      { $set: { status: 'approved', approvedBy: approvedBy ? String(approvedBy) : undefined, approvedAt: new Date() } },
      { new: true }
    ).lean()
    if (!request) return res.status(404).json({ error: 'Request not found' })
    res.json({ request })
  } catch (e) { return handleError(res, e) }
}

export async function dispenseToOT(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const body = req.body as any
    const dispensedItems = body.items || []

    const reqDoc = await HospitalOtPharmacyRequest.findById(String(id)).lean() as any
    if (!reqDoc) return res.status(404).json({ error: 'Request not found' })

    // Update dispensed quantities per item
    for (const di of dispensedItems) {
      if (di.itemId && di.dispensedQty != null) {
        await HospitalOtPharmacyRequest.updateOne(
          { _id: String(id), 'items._id': di.itemId },
          { $set: { 'items.$.dispensedQty': Number(di.dispensedQty) } }
        )
      }
    }

    const request = await HospitalOtPharmacyRequest.findByIdAndUpdate(
      String(id),
      { $set: { status: 'dispensed', dispensedAt: new Date() } },
      { new: true }
    ).lean() as any

    // If billing mode is patient_bill, add to encounter billing
    if (request.billingMode === 'patient_bill' && request.encounterId) {
      for (const item of request.items) {
        const qty = item.dispensedQty || item.qty
        const price = item.unitPrice || 0
        await HospitalIpdBillingItem.create({
          patientId: String(request.patientId),
          encounterId: String(request.encounterId),
          type: 'medication',
          description: `OT: ${item.name} x${qty}`,
          qty,
          unitPrice: price,
          amount: price * qty,
          paidAmount: 0,
          date: new Date(),
          refId: request.requestId,
          medicineName: item.name,
          patientPayable: price * qty,
        })
      }
    }

    res.json({ request })
  } catch (e) { return handleError(res, e) }
}

export async function consumeOTMedication(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const body = req.body as any
    const consumedItems = body.items || []

    for (const ci of consumedItems) {
      if (ci.itemId && ci.consumedQty != null) {
        await HospitalOtPharmacyRequest.updateOne(
          { _id: String(id), 'items._id': ci.itemId },
          { $set: { 'items.$.consumedQty': Number(ci.consumedQty) } }
        )
      }
    }

    const request = await HospitalOtPharmacyRequest.findByIdAndUpdate(
      String(id),
      { $set: { status: 'consumed' } },
      { new: true }
    ).lean()
    if (!request) return res.status(404).json({ error: 'Request not found' })
    res.json({ request })
  } catch (e) { return handleError(res, e) }
}

export async function returnOTMedications(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const body = req.body as any
    const returnedItems = body.items || []

    let totalCredit = 0
    for (const ri of returnedItems) {
      if (ri.itemId && ri.returnedQty != null) {
        const qty = Number(ri.returnedQty)
        const item = (await HospitalOtPharmacyRequest.findOne(
          { _id: String(id), 'items._id': ri.itemId },
          { 'items.$': 1 }
        ).lean()) as any
        const unitPrice = item?.items?.[0]?.unitPrice || 0
        totalCredit += unitPrice * qty

        await HospitalOtPharmacyRequest.updateOne(
          { _id: String(id), 'items._id': ri.itemId },
          { $set: { 'items.$.returnedQty': qty } }
        )
      }
    }

    const request = await HospitalOtPharmacyRequest.findByIdAndUpdate(
      String(id),
      { $set: { status: 'returned', completedAt: new Date() } },
      { new: true }
    ).lean() as any
    if (!request) return res.status(404).json({ error: 'Request not found' })

    // Adjust billing for returned items
    if (request.encounterId) {
      const existingBilling = await HospitalIpdBillingItem.findOne({
        encounterId: String(request.encounterId),
        refId: request.requestId,
      }).lean() as any
      if (existingBilling) {
        await HospitalIpdBillingItem.findByIdAndUpdate(String(existingBilling._id), {
          $inc: { amount: -totalCredit, patientPayable: -totalCredit },
        })
      }
    }

    res.json({ request, creditAmount: totalCredit })
  } catch (e) { return handleError(res, e) }
}
