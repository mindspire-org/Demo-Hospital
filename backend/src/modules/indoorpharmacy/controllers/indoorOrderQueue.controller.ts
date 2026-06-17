import { Request, Response } from 'express'
import { IndoorOrderQueue } from '../models/indoorOrderQueue'
import { HospitalEncounter } from '../../hospital/models/Encounter'
import { LabPatient } from '../../lab/models/Patient'
import { HospitalIpdBillingItem } from '../../hospital/models/IpdBillingItem'
import mongoose from 'mongoose'

function handleError(res: Response, e: any) {
  if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' })
  if (e?.code === 11000) return res.status(409).json({ error: 'Duplicate entry' })
  if (e?.status) return res.status(e.status).json({ error: e.error || 'Error' })
  return res.status(500).json({ error: 'Internal Server Error' })
}

function generateOrderId() {
  const now = new Date()
  const key = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `IN-${key}-${rand}`
}

// ── Queue Management ──

export async function getPendingOrders(req: Request, res: Response) {
  try {
    const q = req.query as any
    const status = q.status || 'pending'
    const priority = q.priority
    const wardId = q.wardId
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))

    const crit: any = {}
    if (status) crit.status = String(status)
    if (priority) crit.priority = String(priority)
    if (wardId) crit.wardId = String(wardId)

    const total = await IndoorOrderQueue.countDocuments(crit)
    const rows = await IndoorOrderQueue.find(crit)
      .sort({ priority: -1, requestedAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
    res.json({ orders: rows, total, page, limit })
  } catch (e) { return handleError(res, e) }
}

export async function getOrdersByEncounter(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    if (!encounterId || !mongoose.isValidObjectId(encounterId)) {
      return res.status(400).json({ error: 'Invalid encounterId' })
    }
    const rows = await IndoorOrderQueue.find({ encounterId: String(encounterId) })
      .sort({ requestedAt: -1 })
      .lean()
    res.json({ orders: rows })
  } catch (e) { return handleError(res, e) }
}

export async function getOrdersByWard(req: Request, res: Response) {
  try {
    const { wardId } = req.params as any
    if (!wardId) return res.status(400).json({ error: 'wardId required' })
    const crit: any = { wardId: String(wardId) }
    const status = req.query.status
    if (status) crit.status = String(status)
    const rows = await IndoorOrderQueue.find(crit).sort({ priority: -1, requestedAt: 1 }).lean()
    res.json({ orders: rows })
  } catch (e) { return handleError(res, e) }
}

export async function getOrdersByBed(req: Request, res: Response) {
  try {
    const { bedNumber } = req.params as any
    if (!bedNumber) return res.status(400).json({ error: 'bedNumber required' })
    const rows = await IndoorOrderQueue.find({ bedNumber: String(bedNumber) }).sort({ requestedAt: -1 }).lean()
    res.json({ orders: rows })
  } catch (e) { return handleError(res, e) }
}

export async function createOrderFromEPrescription(req: Request, res: Response) {
  try {
    const body = req.body as any
    const encounterId = body.encounterId
    if (!encounterId || !mongoose.isValidObjectId(encounterId)) {
      return res.status(400).json({ error: 'Invalid encounterId' })
    }

    // Resolve patient info from encounter
    const encounter = await HospitalEncounter.findById(String(encounterId)).lean() as any
    if (!encounter) return res.status(404).json({ error: 'Encounter not found' })

    const patient = await LabPatient.findById(String(encounter.patientId)).lean() as any

    const orderId = generateOrderId()
    const items = (body.items || []).map((it: any) => ({
      medicineId: it.medicineId ? String(it.medicineId) : undefined,
      medicineName: String(it.medicineName || it.name || ''),
      requestedQty: Number(it.qty || it.requestedQty || 1),
      dose: String(it.dose || ''),
      frequency: String(it.frequency || ''),
      duration: String(it.duration || ''),
      route: String(it.route || ''),
      instructions: String(it.instructions || it.notes || ''),
      status: 'pending',
    }))

    const order = await IndoorOrderQueue.create({
      orderId,
      encounterId: String(encounterId),
      patientId: String(encounter.patientId),
      patientName: patient?.name || body.patientName || '',
      mrn: patient?.mrn || body.mrn || '',
      admissionNo: encounter.admissionNo || body.admissionNo || '',
      bedNumber: encounter.bedId || body.bedNumber || '',
      wardId: encounter.wardId || body.wardId || undefined,
      items,
      status: 'pending',
      priority: body.priority || 'normal',
      sourceType: body.sourceType || 'ipd',
      prescribedBy: body.prescribedBy ? String(body.prescribedBy) : undefined,
      ePrescriptionId: body.ePrescriptionId ? String(body.ePrescriptionId) : undefined,
      requestedAt: new Date(),
    })

    res.status(201).json({ order })
  } catch (e) { return handleError(res, e) }
}

export async function updateOrderStatus(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const { status, itemStatuses } = req.body as any
    if (!status) return res.status(400).json({ error: 'status required' })

    const set: any = { status: String(status) }
    if (status === 'dispensed') set.dispensedAt = new Date()
    if (status === 'delivered') set.deliveredAt = new Date()

    const order = await IndoorOrderQueue.findByIdAndUpdate(String(id), { $set: set }, { new: true }).lean()
    if (!order) return res.status(404).json({ error: 'Order not found' })

    // Update individual item statuses if provided
    if (Array.isArray(itemStatuses) && itemStatuses.length > 0) {
      for (const is of itemStatuses) {
        if (is.itemId && is.status) {
          await IndoorOrderQueue.updateOne(
            { _id: String(id), 'items._id': is.itemId },
            { $set: { 'items.$.status': String(is.status) } }
          )
        }
      }
    }

    res.json({ order })
  } catch (e) { return handleError(res, e) }
}

export async function assignOrderToPharmacist(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const { pharmacistId } = req.body as any
    if (!pharmacistId) return res.status(400).json({ error: 'pharmacistId required' })

    const order = await IndoorOrderQueue.findByIdAndUpdate(
      String(id),
      { $set: { assignedTo: String(pharmacistId), status: 'processing' } },
      { new: true }
    ).lean()
    if (!order) return res.status(404).json({ error: 'Order not found' })
    res.json({ order })
  } catch (e) { return handleError(res, e) }
}

export async function markOrderDelivered(req: Request, res: Response) {
  try {
    const { id } = req.params as any
    const { deliveredBy } = req.body as any
    const order = await IndoorOrderQueue.findByIdAndUpdate(
      String(id),
      { $set: { status: 'delivered', deliveredAt: new Date(), deliveredBy: deliveredBy ? String(deliveredBy) : undefined } },
      { new: true }
    ).lean()
    if (!order) return res.status(404).json({ error: 'Order not found' })
    res.json({ order })
  } catch (e) { return handleError(res, e) }
}

// ── Dashboard stats ──

export async function getQueueStats(req: Request, res: Response) {
  try {
    const [pending, processing, urgent, stat, todayDispensed, todayDelivered] = await Promise.all([
      IndoorOrderQueue.countDocuments({ status: 'pending' }),
      IndoorOrderQueue.countDocuments({ status: 'processing' }),
      IndoorOrderQueue.countDocuments({ status: 'pending', priority: 'urgent' }),
      IndoorOrderQueue.countDocuments({ status: 'pending', priority: 'stat' }),
      IndoorOrderQueue.countDocuments({ status: 'dispensed', dispensedAt: { $gte: new Date(Date.now() - 86400000) } }),
      IndoorOrderQueue.countDocuments({ status: 'delivered', deliveredAt: { $gte: new Date(Date.now() - 86400000) } }),
    ])

    const wardStats = await IndoorOrderQueue.aggregate([
      { $match: { status: { $in: ['pending', 'processing'] } } },
      { $group: { _id: '$wardId', count: { $sum: 1 } } },
    ])

    res.json({
      stats: { pending, processing, urgent, stat, todayDispensed, todayDelivered },
      wardBreakdown: wardStats,
    })
  } catch (e) { return handleError(res, e) }
}
