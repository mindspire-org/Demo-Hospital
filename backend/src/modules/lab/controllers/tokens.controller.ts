import { Request, Response } from 'express'
import { LabToken } from '../models/Token'
import { LabOrder } from '../models/Order'
import { LabResult } from '../models/Result'
import { LabCounter } from '../models/Counter'
import { LabAuditLog } from '../models/AuditLog'
import { z } from 'zod'

function resolveActor(req: Request) {
  return (req as any).user?.username || (req as any).user?.name || (req as any).user?.email || 'system'
}

// Generate next lab number (continuously growing)
async function nextLabNumber(): Promise<number> {
  const key = 'lab_number_global'
  const c: any = await LabCounter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true })
  return c?.seq || 1
}
async function nextTokenNo(date?: Date): Promise<string> {
  const d = date || new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const key = 'lab_token_global'
  const c: any = await LabCounter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true })
  const seq = String(c?.seq || 1).padStart(3, '0')
  return `D${day}${m}${y}-${seq}`
}

// Generate barcode
function generateBarcode(tokenNo: string, date?: Date): string {
  const d = date || new Date()
  const y = d.getFullYear()
  const part = String(tokenNo || '').replace(/\s+/g, '').replace(/[^a-z0-9_-]/gi, '')
  return `BC-${y}-${part}`
}

// Validation schemas
const tokenCreateSchema = z.object({
  patientId: z.string(),
  patient: z.object({
    mrn: z.string().optional(),
    fullName: z.string(),
    phone: z.string().optional(),
    age: z.string().optional(),
    gender: z.string().optional(),
    address: z.string().optional(),
    guardianRelation: z.string().optional(),
    guardianName: z.string().optional(),
    cnic: z.string().optional(),
  }),
  tests: z.array(z.string()).default([]),
  referringConsultant: z.string().optional(),
  corporateId: z.string().optional(),
  portal: z.enum(['lab', 'reception']).optional(),
  // Financial fields at token creation
  subtotal: z.number().default(0),
  discount: z.number().default(0),
  net: z.number().default(0),
  receivedAmount: z.number().default(0),
  paymentMethod: z.string().optional(),
  paymentNote: z.string().optional(),
})

const tokenQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(['token_generated', 'converted_to_sample', 'sample_received', 'result_entered', 'approved', 'cancelled']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
})

const tokenUpdateSchema = z.object({
  patient: z.object({
    mrn: z.string().optional(),
    fullName: z.string().optional(),
    phone: z.string().optional(),
    age: z.string().optional(),
    gender: z.string().optional(),
    address: z.string().optional(),
    guardianRelation: z.string().optional(),
    guardianName: z.string().optional(),
    cnic: z.string().optional(),
  }).optional(),
  tests: z.array(z.string()).optional(),
  referringConsultant: z.string().optional(),
})

const convertToSampleSchema = z.object({
  tests: z.array(z.string()).min(1),
  subtotal: z.number().default(0),
  discount: z.number().default(0),
  net: z.number().default(0),
  receivedAmount: z.number().default(0),
  paymentMethod: z.string().optional(),
  paymentNote: z.string().optional(),
  referringConsultant: z.string().optional(),
  corporateId: z.string().optional(),
  corporatePreAuthNo: z.string().optional(),
  corporateCoPayPercent: z.number().optional(),
  corporateCoverageCap: z.number().optional(),
})

// Create a new token (token generation step)
export async function create(req: Request, res: Response) {
  const data = tokenCreateSchema.parse(req.body)
  const actor = resolveActor(req)
  const portal = data.portal || 'lab'

  const tokenNo = await nextTokenNo(new Date())
  const labNumber = await nextLabNumber()
  const now = new Date().toISOString()

  const doc = await LabToken.create({
    tokenNo,
    labNumber,
    patientId: data.patientId,
    patient: data.patient,
    tests: data.tests,
    status: 'token_generated',
    generatedAt: now,
    generatedBy: actor,
    referringConsultant: data.referringConsultant,
    corporateId: data.corporateId,
    portal,
    // Financial fields
    subtotal: data.subtotal,
    discount: data.discount,
    net: data.net,
    receivedAmount: data.receivedAmount,
    receivableAmount: Math.max(0, data.net - data.receivedAmount),
  })

  try {
    await LabAuditLog.create({
      actor,
      action: 'Token Generated',
      label: 'LAB_TOKEN_GENERATED',
      method: 'POST',
      path: req.originalUrl,
      at: now,
      detail: `Token ${tokenNo} — ${data.patient.fullName}`,
    })
  } catch {}

  res.status(201).json(doc)
}

// List tokens with filters
export async function list(req: Request, res: Response) {
  const parsed = tokenQuerySchema.safeParse(req.query)
  const { q, status, from, to, page, limit } = parsed.success ? parsed.data as any : {}
  
  const filter: any = {}
  if (q) {
    const rx = new RegExp(String(q), 'i')
    filter.$or = [
      { 'patient.fullName': rx },
      { 'patient.phone': rx },
      { tokenNo: rx },
      { 'patient.mrn': rx },
    ]
  }
  if (status) filter.status = status
  if (from || to) {
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(from)
    if (to) {
      const end = new Date(to)
      end.setHours(23, 59, 59, 999)
      filter.createdAt.$lte = end
    }
  }

  const lim = Math.min(500, Number(limit || 20))
  const pg = Math.max(1, Number(page || 1))
  const skip = (pg - 1) * lim

  const [items, total] = await Promise.all([
    LabToken.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    LabToken.countDocuments(filter),
  ])

  const totalPages = Math.max(1, Math.ceil((total || 0) / lim))
  res.json({ items, total, page: pg, totalPages })
}

// Get single token by ID or tokenNo
export async function get(req: Request, res: Response) {
  const { id } = req.params
  let doc = await LabToken.findById(id).lean()
  if (!doc) {
    doc = await LabToken.findOne({ tokenNo: id }).lean()
  }
  if (!doc) return res.status(404).json({ error: 'Token not found' })
  res.json(doc)
}

// Get tracking timeline for a token
export async function getTimeline(req: Request, res: Response) {
  const { id } = req.params
  
  // Check if id looks like a valid ObjectId (24 hex chars)
  const isObjectId = /^[a-f\d]{24}$/i.test(id)
  
  let token: any = null
  if (isObjectId) {
    token = await LabToken.findById(id).lean()
  }
  if (!token) {
    token = await LabToken.findOne({ tokenNo: id }).lean()
  }
  if (!token) return res.status(404).json({ error: 'Token not found' })

  // Build timeline events
  const events: Array<{
    event: string
    at: string
    by: string
    details?: string
  }> = []

  // Token generated
  events.push({
    event: 'Token Generated',
    at: token.generatedAt,
    by: token.generatedBy,
    details: `Token No: ${token.tokenNo}`,
  })

  // Converted to sample
  if (token.convertedAt && token.convertedBy) {
    events.push({
      event: 'Converted to Sample',
      at: token.convertedAt,
      by: token.convertedBy,
      details: token.barcode ? `Barcode: ${token.barcode}` : undefined,
    })
  }

  // Sample received
  if (token.sampleReceivedAt && token.sampleReceivedBy) {
    events.push({
      event: 'Sample Received',
      at: token.sampleReceivedAt,
      by: token.sampleReceivedBy,
    })
  }

  // Result entered
  if (token.resultEnteredAt && token.resultEnteredBy) {
    events.push({
      event: 'Result Entered',
      at: token.resultEnteredAt,
      by: token.resultEnteredBy,
    })
  }

  // Approved
  if (token.approvedAt && token.approvedBy) {
    events.push({
      event: 'Report Approved',
      at: token.approvedAt,
      by: token.approvedBy,
    })
  }

  // Get related order info - aggregate financial data from ALL orders for this token
  let order: any = null
  if (token.tokenNo) {
    const allOrders = await LabOrder.find({ tokenNo: token.tokenNo }).lean()
    if (allOrders.length > 0) {
      // Aggregate financial data from all orders
      order = {
        subtotal: allOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0),
        discount: allOrders.reduce((sum, o) => sum + (o.discount || 0), 0),
        net: allOrders.reduce((sum, o) => sum + (o.net || 0), 0),
        receivedAmount: allOrders.reduce((sum, o) => sum + (o.receivedAmount || 0), 0),
        receivableAmount: allOrders.reduce((sum, o) => sum + (o.receivableAmount || 0), 0),
        payments: allOrders.flatMap((o: any) => o.payments || []),
        labNumber: allOrders[0]?.labNumber,
        barcode: allOrders[0]?.barcode,
      }
    }
  }

  // Get related result info
  let result: any = null
  if (token.resultId) {
    result = await LabResult.findById(token.resultId).lean()
  }

  res.json({
    token,
    events,
    order,
    result,
  })
}

// Convert token to sample (create order)
export async function convertToSample(req: Request, res: Response) {
  const { id } = req.params
  const data = convertToSampleSchema.parse(req.body)
  const actor = resolveActor(req)

  let token: any = await LabToken.findById(id)
  if (!token) {
    token = await LabToken.findOne({ tokenNo: id })
  }
  if (!token) return res.status(404).json({ error: 'Token not found' })
  if (token.status === 'cancelled') {
    return res.status(400).json({ error: 'Cancelled token cannot be converted' })
  }
  if (token.status !== 'token_generated') {
    return res.status(400).json({ error: 'Token already converted or in different state' })
  }

  // Use stored financial data from token if incoming data is zeros (backward compatibility)
  // If token has stored financial data (non-zero subtotal or net), use it; otherwise use incoming data
  const tokenHasFinancialData = (token.subtotal > 0 || token.net > 0)
  const subtotal = tokenHasFinancialData ? (token.subtotal || 0) : (data.subtotal || 0)
  const discount = tokenHasFinancialData ? (token.discount || 0) : (data.discount || 0)
  const net = tokenHasFinancialData ? (token.net || 0) : (data.net || 0)
  const receivedAmount = tokenHasFinancialData ? (token.receivedAmount || 0) : (data.receivedAmount || 0)
  const receivableAmount = Math.max(0, net - receivedAmount)

  const now = new Date().toISOString()
  const barcode = generateBarcode(token.tokenNo, new Date())

  // Create single order with all tests
  const orderData: any = {
    patientId: token.patientId,
    patient: token.patient,
    tests: data.tests,
    tokenNo: token.tokenNo,
    labNumber: token.labNumber,
    status: 'received',
    barcode,
    referringConsultant: data.referringConsultant || token.referringConsultant,
    portal: token.portal,
    // Financial data on the single order
    subtotal,
    discount,
    net,
    receivedAmount,
    receivableAmount,
  }

  if (data.paymentMethod || (receivedAmount > 0 && !data.paymentMethod)) {
    orderData.payments = [{
      amount: receivedAmount,
      at: now,
      note: data.paymentNote,
      method: data.paymentMethod || 'cash',
      receivedBy: actor,
    }]
  }

  if (data.corporateId || token.corporateId) {
    orderData.corporateId = data.corporateId || token.corporateId
    if (data.corporatePreAuthNo) orderData.corporatePreAuthNo = data.corporatePreAuthNo
    if (data.corporateCoPayPercent) orderData.corporateCoPayPercent = data.corporateCoPayPercent
    if (data.corporateCoverageCap) orderData.corporateCoverageCap = data.corporateCoverageCap
  }

  const order = await LabOrder.create(orderData)
  const orderId = String(order._id)

  // Update token with financial data
  token.status = 'converted_to_sample'
  token.convertedAt = now
  token.convertedBy = actor
  token.orderId = orderId
  token.barcode = barcode
  token.tests = data.tests
  token.subtotal = subtotal
  token.discount = discount
  token.net = net
  token.receivedAmount = receivedAmount
  token.receivableAmount = receivableAmount
  await token.save()

  try {
    await LabAuditLog.create({
      actor,
      action: 'Token Converted to Sample',
      label: 'LAB_TOKEN_CONVERTED',
      method: 'POST',
      path: req.originalUrl,
      at: now,
      detail: `Token ${token.tokenNo} — Barcode: ${barcode}`,
    })
  } catch {}

  res.json({ token, order })
}

// Update token status (for sample received, result entered, approved)
export async function updateStatus(req: Request, res: Response) {
  const { id } = req.params
  const { status, orderId, resultId } = req.body
  const actor = resolveActor(req)
  const now = new Date().toISOString()

  let token: any = await LabToken.findById(id)
  if (!token) {
    token = await LabToken.findOne({ tokenNo: id })
  }
  if (!token) return res.status(404).json({ error: 'Token not found' })

  const updates: any = { status }

  switch (status) {
    case 'sample_received':
      updates.sampleReceivedAt = now
      updates.sampleReceivedBy = actor
      break
    case 'result_entered':
      updates.resultEnteredAt = now
      updates.resultEnteredBy = actor
      if (resultId) updates.resultId = resultId
      break
    case 'approved':
      updates.approvedAt = now
      updates.approvedBy = actor
      break
    case 'cancelled':
      // Only allow cancelling before conversion
      if (token.status !== 'token_generated') {
        return res.status(400).json({ error: 'Cannot cancel token that has been converted to sample' })
      }
      updates.cancelledAt = now
      updates.cancelledBy = actor
      break
    default:
      break
  }

  const updated = await LabToken.findByIdAndUpdate(token._id, { $set: updates }, { new: true })

  try {
    await LabAuditLog.create({
      actor,
      action: `Token Status: ${status}`,
      label: 'LAB_TOKEN_STATUS_UPDATE',
      method: 'PUT',
      path: req.originalUrl,
      at: now,
      detail: `Token ${token.tokenNo}`,
    })
  } catch {}

  res.json(updated)
}

// Update token details (only while token_generated)
export async function update(req: Request, res: Response) {
  const { id } = req.params
  const patch = tokenUpdateSchema.parse(req.body)
  const actor = resolveActor(req)
  const now = new Date().toISOString()

  let token: any = await LabToken.findById(id)
  if (!token) {
    token = await LabToken.findOne({ tokenNo: id })
  }
  if (!token) return res.status(404).json({ error: 'Token not found' })

  if (token.status !== 'token_generated') {
    return res.status(400).json({ error: 'Only unconverted tokens can be edited' })
  }

  const set: any = {}
  if (patch.patient) set.patient = { ...(token.patient || {}), ...(patch.patient || {}) }
  if (patch.tests) set.tests = patch.tests
  if (patch.referringConsultant != null) set.referringConsultant = patch.referringConsultant

  const updated = await LabToken.findByIdAndUpdate(token._id, { $set: set }, { new: true })

  try {
    await LabAuditLog.create({
      actor,
      action: 'Token Updated',
      label: 'LAB_TOKEN_UPDATED',
      method: 'PUT',
      path: req.originalUrl,
      at: now,
      detail: `Token ${token.tokenNo}`,
    })
  } catch {}

  res.json(updated)
}

// Delete token (only if not converted)
export async function remove(req: Request, res: Response) {
  const { id } = req.params
  const actor = resolveActor(req)

  let token: any = await LabToken.findById(id)
  if (!token) {
    token = await LabToken.findOne({ tokenNo: id })
  }
  if (!token) return res.status(404).json({ error: 'Token not found' })

  if (token.status !== 'token_generated') {
    return res.status(400).json({ error: 'Cannot delete token that has been converted to sample' })
  }

  await LabToken.findByIdAndDelete(token._id)

  try {
    await LabAuditLog.create({
      actor,
      action: 'Token Deleted',
      label: 'LAB_TOKEN_DELETED',
      method: 'DELETE',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Token ${token.tokenNo}`,
    })
  } catch {}

  res.json({ success: true })
}
