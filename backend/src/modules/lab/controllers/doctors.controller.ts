import { Request, Response } from 'express'
import { LabDoctor } from '../models/Doctor'
import { LabOrder } from '../models/Order'
import { LabOrderTest } from '../models/OrderTest'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  specialization: z.string().optional(),
  address: z.string().optional(),
  commissionPercent: z.coerce.number().min(0).max(100).default(0),
  active: z.boolean().optional().default(true),
  notes: z.string().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  specialization: z.string().optional(),
  address: z.string().optional(),
  commissionPercent: z.coerce.number().min(0).max(100).optional(),
  active: z.boolean().optional(),
  notes: z.string().optional(),
})

export async function list(_req: Request, res: Response) {
  const docs = await LabDoctor.find().sort({ name: 1 }).lean()
  res.json({ items: docs })
}

export async function get(req: Request, res: Response) {
  const doc = await LabDoctor.findById(req.params.id).lean()
  if (!doc) return res.status(404).json({ message: 'Doctor not found' })
  res.json(doc)
}

export async function create(req: Request, res: Response) {
  const data = createSchema.parse(req.body)
  const doc = await LabDoctor.create(data)
  res.json(doc)
}

export async function update(req: Request, res: Response) {
  const data = updateSchema.parse(req.body)
  const doc = await LabDoctor.findByIdAndUpdate(req.params.id, { $set: data }, { new: true })
  if (!doc) return res.status(404).json({ message: 'Doctor not found' })
  res.json(doc)
}

export async function remove(req: Request, res: Response) {
  const doc = await LabDoctor.findByIdAndDelete(req.params.id)
  if (!doc) return res.status(404).json({ message: 'Doctor not found' })
  res.json({ ok: true })
}

export async function stats(req: Request, res: Response) {
  const { from, to, doctorId } = req.query as any
  const match: any = { referringDoctorId: { $exists: true, $ne: '' } }
  if (doctorId) match.referringDoctorId = doctorId
  if (from || to) {
    match.createdAt = {}
    if (from) {
      const pakFrom = new Date(from + 'T00:00:00')
      const utcFrom = new Date(pakFrom.getTime() - (5 * 60 * 60 * 1000))
      match.createdAt.$gte = utcFrom
    }
    if (to) {
      const pakTo = new Date(to + 'T23:59:59.999')
      const utcTo = new Date(pakTo.getTime() - (5 * 60 * 60 * 1000))
      match.createdAt.$lte = utcTo
    }
  }

  const orders = await LabOrder.find(match).lean()
  const orderIds = orders.map(o => String(o._id))

  // Aggregate per doctor
  const byDoctor: Record<string, {
    doctorId: string
    doctorName: string
    totalOrders: number
    totalTests: number
    totalRevenue: number
    commissionDue: number
  }> = {}

  for (const o of orders) {
    const did = String(o.referringDoctorId || '')
    const dname = String(o.referringDoctorName || o.referringConsultant || 'Unknown')
    if (!did) continue
    if (!byDoctor[did]) {
      byDoctor[did] = {
        doctorId: did,
        doctorName: dname,
        totalOrders: 0,
        totalTests: 0,
        totalRevenue: 0,
        commissionDue: 0,
      }
    }
    const activeTests = Array.isArray(o.tests)
      ? o.tests.filter((t: any) => !t.isReturned)
      : []
    const orderRevenue = activeTests.reduce((s: number, t: any) => s + Number(t.price || 0), 0)
    byDoctor[did].totalOrders += 1
    byDoctor[did].totalTests += activeTests.length
    byDoctor[did].totalRevenue += orderRevenue
  }

  // Get commission percentages from LabDoctor
  const doctorIds = Object.keys(byDoctor)
  if (doctorIds.length > 0) {
    const docs = await LabDoctor.find({ _id: { $in: doctorIds } }).select('_id commissionPercent').lean()
    const pctMap = new Map<string, number>()
    for (const d of docs) {
      pctMap.set(String(d._id), Number(d.commissionPercent || 0))
    }
    for (const did of doctorIds) {
      const pct = pctMap.get(did) || 0
      byDoctor[did].commissionDue = Math.round((byDoctor[did].totalRevenue * pct) / 100)
    }
  }

  const items = Object.values(byDoctor).sort((a, b) => b.totalRevenue - a.totalRevenue)
  res.json({ items, totalOrders: orders.length })
}

export async function detailStats(req: Request, res: Response) {
  const { id } = req.params
  const { from, to } = req.query as any
  const match: any = { referringDoctorId: id }
  if (from || to) {
    match.createdAt = {}
    if (from) {
      const pakFrom = new Date(from + 'T00:00:00')
      const utcFrom = new Date(pakFrom.getTime() - (5 * 60 * 60 * 1000))
      match.createdAt.$gte = utcFrom
    }
    if (to) {
      const pakTo = new Date(to + 'T23:59:59.999')
      const utcTo = new Date(pakTo.getTime() - (5 * 60 * 60 * 1000))
      match.createdAt.$lte = utcTo
    }
  }

  const orders = await LabOrder.find(match).sort({ createdAt: -1 }).lean()
  const orderIds = orders.map(o => String(o._id))
  const tests = orderIds.length
    ? await LabOrderTest.find({ orderId: { $in: orderIds } }).lean()
    : []

  const testByOrder = new Map<string, any[]>()
  for (const t of tests) {
    const oid = String(t.orderId)
    if (!testByOrder.has(oid)) testByOrder.set(oid, [])
    testByOrder.get(oid)!.push(t)
  }

  const detail = orders.map(o => {
    const otests = testByOrder.get(String(o._id)) || []
    const activeTests = otests.filter((t: any) => !t.isReturned)
    const revenue = activeTests.reduce((s: number, t: any) => s + Number(t.price || 0), 0)
    return {
      orderId: o._id,
      tokenNo: o.tokenNo,
      createdAt: o.createdAt,
      patient: o.patient,
      tests: activeTests.map((t: any) => ({ testId: t.testId, testName: t.testName, price: t.price })),
      revenue,
      status: o.status,
    }
  })

  const doctor: any = await LabDoctor.findById(id).select('name commissionPercent').lean()
  const totalRevenue = detail.reduce((s, d) => s + d.revenue, 0)
  const commissionPercent = Number(doctor?.commissionPercent || 0)
  const commissionDue = Math.round((totalRevenue * commissionPercent) / 100)

  res.json({
    doctor: doctor || { name: 'Unknown', commissionPercent: 0 },
    detail,
    totalRevenue,
    commissionPercent,
    commissionDue,
    totalOrders: orders.length,
  })
}
