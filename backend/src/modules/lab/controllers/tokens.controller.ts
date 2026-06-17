import { Request, Response } from 'express'
import { LabToken } from '../models/Token'
import { LabOrder } from '../models/Order'
import { LabOrderTest } from '../models/OrderTest'
import { LabPayment } from '../models/Payment'
import { LabTest } from '../models/Test'
import { LabTestPackage } from '../models/TestPackage'
import { LabResult } from '../models/Result'
import { LabCounter } from '../models/Counter'
import { LabAuditLog } from '../models/AuditLog'
import { LabSettings } from '../models/Settings'
import { postLabOrderJournal } from '../../finance/controllers/finance_ledger'
import { HospitalReferral } from '../../hospital/models/Referral'
import { formatLabNumber } from '../../../common/utils/labNumberFormat'
import { z } from 'zod'

function resolveActor(req: Request) {
  return (req as any).user?.username || (req as any).user?.name || (req as any).user?.email || 'system'
}

function resolvePaidMethod(paymentMethod?: string): 'Cash' | 'Bank' | 'AR' {
  const method = String(paymentMethod || '').trim().toLowerCase()
  if (method === 'cash') return 'Cash'
  if (method === 'bank' || method === 'card') return 'Bank'
  return 'AR'
}

function mapPaymentMethodEnum(pm?: string): string {
  if (!pm) return 'cash'
  const lower = String(pm).trim().toLowerCase()
  if (lower === 'corporate') return 'corporate_credit'
  if (['cash', 'card', 'online', 'bank_transfer', 'corporate_credit'].includes(lower)) return lower
  return 'cash'
}

// New: mark sample as received in the lab (image 9 — two-box icon)
export async function markSampleReceived(req: Request, res: Response) {
  const actor = (req as any).user?.username || 'system'
  const token: any = await LabToken.findById(req.params.id)
  if (!token) return res.status(404).json({ message: 'Token not found' })
  token.sampleReceived = true
  token.sampleReceivedAt = new Date().toISOString()
  token.sampleReceivedBy = actor
  if (token.status === 'token_generated' || token.status === 'converted_to_sample') {
    token.status = 'sample_received'
  }
  await token.save()
  // Sync to corresponding order if any
  try {
    if (token.orderId) {
      await LabOrder.findByIdAndUpdate(token.orderId, {
        $set: { status: 'in_progress', sampleCollectedAt: new Date() },
      })
    }
  } catch {}
  try {
    await LabAuditLog.create({
      actor,
      action: 'sample.receive',
      entity: 'token',
      entityId: String(token._id),
      label: token.tokenNo,
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
    })
  } catch {}
  res.json(token)
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
  const key = `lab_token_${y}${m}${day}`

  for (let attempt = 0; attempt < 100; attempt++) {
    const c: any = await LabCounter.findByIdAndUpdate(
      key,
      { $inc: { seq: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    const candidate = String(c?.seq || 1)
    const existing = await LabToken.findOne({ tokenNo: candidate }).lean()
    if (!existing) return candidate
  }

  // Fallback: use a timestamp suffix to guarantee uniqueness
  return `${y}${m}${day}-${Date.now().toString(36).toUpperCase()}`
}

// Load lab number format from settings and format the number
async function getFormattedLabNumber(num?: number, date?: Date): Promise<string> {
  if (!num) return ''
  try {
    const s: any = await LabSettings.findOne().lean()
    return formatLabNumber(num, s?.labNumberFormat, date)
  } catch {
    return formatLabNumber(num, '{SERIAL}', date)
  }
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
  tests: z.array(z.union([
    z.string(),
    z.object({
      testId: z.string(),
      testName: z.string(),
      price: z.number()
    })
  ])).default([]),
  referringConsultant: z.string().optional(),
  referralId: z.string().optional(),
  corporateId: z.string().optional(),
  portal: z.enum(['lab', 'reception']).optional(),
  // Collection Center fields
  collectionCenterId: z.string().optional(),
  collectionCenterName: z.string().optional(),
  centerCommissionPercent: z.number().optional(),
  centerCommissionAmount: z.number().optional(),
  centerNetAmount: z.number().optional(),
  // Financial fields at token creation
  subtotal: z.number().default(0),
  discount: z.number().default(0),
  net: z.number().default(0),
  receivedAmount: z.number().default(0),
  paymentMethod: z.string().optional(),
  paymentNote: z.string().optional(),
  // Registration enhancements
  sampleType: z.enum(['normal', 'urgent', 'stat']).optional(),
  sampleReceived: z.boolean().optional(),
  sampleReceivedAtRegistration: z.boolean().optional(),
  hospitalRegistrationNumber: z.string().optional(),
  packageIds: z.array(z.string()).optional(),
  patientCardId: z.string().optional(),
  patientCardKind: z.string().optional(),
  departmentId: z.string().optional(),
  wardId: z.string().optional(),
  emergencyDayId: z.string().optional(),
  source: z.enum(['lab', 'reception', 'center', 'ward_import']).optional(),
  email: z.string().optional(),
  whatsapp: z.string().optional(),
  printAction: z.enum(['save', 'save_invoice', 'save_invoice_barcode', 'save_barcode']).optional(),
})

const tokenQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(['token_generated', 'converted_to_sample', 'sample_received', 'result_entered', 'approved', 'cancelled']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  collectionCenterId: z.string().optional(),
  // Extended
  sampleType: z.enum(['normal','urgent','stat']).optional(),
  hospitalRegistrationNumber: z.string().optional(),
  departmentId: z.string().optional(),
  wardId: z.string().optional(),
  source: z.enum(['lab','reception','center','ward_import']).optional(),
  sampleReceived: z.enum(['true','false']).optional(),
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
  sampleType: z.enum(['normal', 'urgent', 'stat']).optional(),
  packageIds: z.array(z.string()).optional(),
})

const convertToSampleSchema = z.object({
  tests: z.array(z.union([
    z.string(),
    z.object({
      testId: z.string(),
      testName: z.string(),
      price: z.number()
    })
  ])).optional(),
  packageIds: z.array(z.string()).optional(),
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

  // Process package-selected tests first, then explicit tests, to build a deduped snapshot.
  const packageTests: any[] = []
  if (Array.isArray(data.packageIds) && data.packageIds.length > 0) {
    const packages = await LabTestPackage.find({ _id: { $in: data.packageIds } }).lean()
    for (const pkg of packages) {
      const pkgTests = Array.isArray(pkg.tests) ? pkg.tests : []
      for (const pt of pkgTests) {
        if (!pt?.testId) continue
        packageTests.push({
          testId: String(pt.testId),
          testName: pt.testName,
          price: pt.price || 0,
        })
      }
    }
  }

  const testsMap = new Map<string, any>()
  for (const t of packageTests) {
    testsMap.set(t.testId, t)
  }

  const testIdsToFetch: string[] = []
  for (const t of data.tests) {
    if (typeof t === 'string') {
      testIdsToFetch.push(t)
    } else {
      testsMap.set(t.testId, t)
    }
  }

  if (testIdsToFetch.length > 0) {
    const fetchedTests = await LabTest.find({ _id: { $in: testIdsToFetch } }).lean()
    for (const ft of fetchedTests) {
      testsMap.set(String(ft._id), {
        testId: String(ft._id),
        testName: ft.name,
        price: ft.price || 0,
      })
    }
  }

  const tests: any[] = Array.from(testsMap.values())

  const token = await LabToken.create({
    labNumber,
    tokenNo,
    patientId: data.patientId,
    patient: data.patient,
    tests, // Snapshot for display only
    status: 'token_generated',
    generatedAt: now,
    generatedBy: actor,
    referringConsultant: data.referringConsultant,
    referralId: data.referralId,
    corporateId: data.corporateId,
    portal,
    // Collection Center fields
    collectionCenterId: data.collectionCenterId,
    collectionCenterName: data.collectionCenterName,
    centerCommissionPercent: data.centerCommissionPercent,
    centerCommissionAmount: data.centerCommissionAmount,
    centerNetAmount: data.centerNetAmount,
    // Financial fields
    subtotal: data.subtotal,
    discount: data.discount,
    net: data.net,
    receivedAmount: data.receivedAmount,
    receivableAmount: Math.max(0, data.net - data.receivedAmount),
    paymentMethod: (data as any).paymentMethod,
    // Registration extras
    sampleType: (data as any).sampleType || 'normal',
    sampleReceived: (data as any).sampleReceived ?? ((data as any).sampleReceivedAtRegistration ?? (portal === 'lab')),
    sampleReceivedAtRegistration: (data as any).sampleReceivedAtRegistration ?? (portal === 'lab'),
    hospitalRegistrationNumber: (data as any).hospitalRegistrationNumber,
    packageIds: (data as any).packageIds || [],
    patientCardId: (data as any).patientCardId,
    patientCardKind: (data as any).patientCardKind,
    departmentId: (data as any).departmentId,
    wardId: (data as any).wardId,
    emergencyDayId: (data as any).emergencyDayId,
    source: (data as any).source || (portal === 'reception' ? 'reception' : 'lab'),
    email: (data as any).email,
    whatsapp: (data as any).whatsapp,
    printAction: (data as any).printAction || 'save',
  })

  try {
    await LabAuditLog.create({
      actor,
      action: 'Token Generated',
      label: 'LAB_TOKEN_GENERATED',
      method: 'POST',
      path: req.originalUrl,
      at: now,
      detail: `Token ${tokenNo} for patient ${data.patient.fullName}`,
    })
  } catch {}

  // Record initial payment in ledger if any
  if (data.receivedAmount > 0) {
    await LabPayment.create({
      tokenId: token._id,
      patientId: data.patientId,
      type: 'payment',
      amount: data.receivedAmount,
      method: mapPaymentMethodEnum((data as any).paymentMethod),
      note: 'Advance payment during token generation',
      createdBy: actor
    })
  }

  const formattedLabNumber = await getFormattedLabNumber(token.labNumber)
  const tokenObj = token.toObject ? token.toObject() : token
  res.status(201).json({ ...tokenObj, formattedLabNumber })
}

// List tokens with filters
export async function list(req: Request, res: Response) {
  const parsed = tokenQuerySchema.safeParse(req.query)
  const { q, status, from, to, collectionCenterId, sampleType, hospitalRegistrationNumber, departmentId, wardId, source, sampleReceived, page, limit } = parsed.success ? parsed.data as any : {}
  
  const filter: any = {}
  if (q) {
    const rx = new RegExp(String(q), 'i')
    filter.$or = [
      { 'patient.fullName': rx },
      { 'patient.phone': rx },
      { tokenNo: rx },
      { 'patient.mrn': rx },
      { hospitalRegistrationNumber: rx },
    ]
  }
  if (status) filter.status = status
  if (sampleType) filter.sampleType = sampleType
  if (hospitalRegistrationNumber) filter.hospitalRegistrationNumber = hospitalRegistrationNumber
  if (departmentId) filter.departmentId = departmentId
  if (wardId) filter.wardId = wardId
  if (source) filter.source = source
  if (sampleReceived === 'true') filter.sampleReceived = true
  if (sampleReceived === 'false') filter.sampleReceived = false
  if (collectionCenterId) {
    if (collectionCenterId === 'internal') {
      // Main lab tokens - no collection center assigned
      filter.collectionCenterId = null
    } else if (collectionCenterId === 'any') {
      // Tokens with any collection center assigned (not null)
      filter.collectionCenterId = { $exists: true, $ne: null }
    } else {
      filter.collectionCenterId = collectionCenterId
    }
  }
  if (from || to) {
    // Use generatedAt string prefix comparison instead of Date objects to avoid timezone issues.
    // generatedAt is stored as full ISO string (e.g. 2026-06-11T09:30:00.000Z).
    // Comparing against the date prefix 'YYYY-MM-DD' and 'YYYY-MM-DDT23:59:59.999Z'
    // correctly filters by calendar date regardless of server timezone.
    filter.generatedAt = {}
    if (from) filter.generatedAt.$gte = from  // e.g. '2026-06-11'
    if (to) filter.generatedAt.$lte = `${to}T23:59:59.999Z`  // e.g. '2026-06-11T23:59:59.999Z'
  }

  console.log('[LAB TOKENS] Filter:', JSON.stringify(filter), '- from:', from, '- to:', to)

  const lim = Math.min(500, Number(limit || 20))
  const pg = Math.max(1, Number(page || 1))
  const skip = (pg - 1) * lim

  const [items, total] = await Promise.all([
    LabToken.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    LabToken.countDocuments(filter),
  ])

  console.log('[LAB TOKENS] Found', items.length, 'of', total, 'tokens')

  const fmt = await LabSettings.findOne().lean().then((s: any) => s?.labNumberFormat).catch(() => undefined)
  const itemsWithFmt = items.map((t: any) => ({
    ...t,
    formattedLabNumber: formatLabNumber(t.labNumber, fmt),
  }))

  const totalPages = Math.max(1, Math.ceil((total || 0) / lim))
  res.json({ items: itemsWithFmt, total, page: pg, totalPages })
}

// Get single token by ID or tokenNo
export async function get(req: Request, res: Response) {
  const { id } = req.params
  let doc = await LabToken.findById(id).lean()
  if (!doc) {
    doc = await LabToken.findOne({ tokenNo: id }).lean()
  }
  if (!doc) return res.status(404).json({ error: 'Token not found' })
  const fmt = await LabSettings.findOne().lean().then((s: any) => s?.labNumberFormat).catch(() => undefined)
  res.json({ ...doc, formattedLabNumber: formatLabNumber((doc as any).labNumber, fmt) })
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

  // Report Printed
  if (token.reportPrintedAt && token.reportPrintedBy) {
    events.push({
      event: 'Report Printed',
      at: token.reportPrintedAt,
      by: token.reportPrintedBy,
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

  // Get per-test status from LabOrderTest
  const orderTests = await LabOrderTest.find({ tokenNo: token.tokenNo }).lean()
  const testStatuses = orderTests.map(ot => ({
    testId: ot.testId,
    testName: ot.testName,
    status: ot.status,
    sampleTime: ot.sampleTime,
    resultId: ot.resultId,
    price: ot.price,
    isReturned: ot.isReturned
  }))

  // Add per-test timeline events
  const testEvents: typeof events = []
  
  for (const test of orderTests) {
    // Sample collected event for this test
    if (test.sampleTime) {
      testEvents.push({
        event: `Sample Collected: ${test.testName}`,
        at: test.sampleTime.includes('T') ? test.sampleTime : `${new Date().toISOString().split('T')[0]}T${test.sampleTime}`,
        by: test.performedBy || 'System',
        details: `Test: ${test.testName}`
      })
    }
    
    // Result events for this test
    if (test.resultId) {
      const result: any = await LabResult.findById(test.resultId).lean()
      if (result) {
        // Result entered
        testEvents.push({
          event: `Result Entered: ${test.testName}`,
          at: result?.createdAt || new Date().toISOString(),
          by: result?.submittedBy || 'System',
          details: `Test: ${test.testName}`
        })
        
        // Result rejected (if applicable)
        if (result?.rejectedAt) {
          testEvents.push({
            event: `Result Rejected: ${test.testName}`,
            at: result.rejectedAt,
            by: result.rejectedBy || 'System',
            details: result.rejectionReason ? `Reason: ${result.rejectionReason}` : `Test: ${test.testName}`
          })
        }
        
        // Result edited (if applicable)
        if (result?.editedAt) {
          testEvents.push({
            event: `Result Edited: ${test.testName}`,
            at: result.editedAt,
            by: result.editedBy || 'System',
            details: result.editCount ? `Edit #${result.editCount}` : `Test: ${test.testName}`
          })
        }
        
        // Result approved
        if (result?.reportStatus === 'approved' && result?.approvedAt) {
          testEvents.push({
            event: `Result Approved: ${test.testName}`,
            at: result.approvedAt,
            by: result.approvedBy || 'System',
            details: `Test: ${test.testName}`
          })
        }
      }
    }
  }
  
  // Sort all events by time
  const allEvents = [...events, ...testEvents].sort((a, b) => {
    return new Date(a.at).getTime() - new Date(b.at).getTime()
  })

  res.json({
    token,
    events: allEvents,
    order,
    result,
    testStatuses,
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

  // Process tests to ensure they are all in snapshot format { testId, testName, price }
  const testsById: Record<string, any> = {}
  const testIdsToFetch: string[] = []
  const packageIds = Array.isArray(data.packageIds) ? data.packageIds : (Array.isArray(token.packageIds) ? token.packageIds.map(String) : [])

  if (Array.isArray(data.tests)) {
    for (const t of data.tests) {
      if (typeof t === 'string') {
        testIdsToFetch.push(t)
      } else if (t?.testId) {
        testsById[String(t.testId)] = {
          testId: String(t.testId),
          testName: String(t.testName || ''),
          price: Number(t.price || 0)
        }
      }
    }
  } else if (Array.isArray(token.tests)) {
    const tokenTests = token.tests as any[]
    for (const t of tokenTests) {
      if (typeof t === 'string') {
        testIdsToFetch.push(t)
      } else if (t?.testId) {
        testsById[String(t.testId)] = {
          testId: String(t.testId),
          testName: String(t.testName || ''),
          price: Number(t.price || 0)
        }
      }
    }
  }

  if (testIdsToFetch.length > 0) {
    const fetchedTests = await LabTest.find({ _id: { $in: testIdsToFetch } }).lean()
    for (const ft of fetchedTests) {
      testsById[String(ft._id)] = {
        testId: String(ft._id),
        testName: ft.name,
        price: ft.price || 0
      }
    }
  }

  if (packageIds.length > 0) {
    const packages = await LabTestPackage.find({ _id: { $in: packageIds } }).lean()
    for (const pkg of packages) {
      const pkgTests = Array.isArray(pkg.tests) ? pkg.tests : []
      for (const t of pkgTests) {
        if (!t?.testId) continue
        testsById[String(t.testId)] = {
          testId: String(t.testId),
          testName: String(t.testName || ''),
          price: Number(t.price || 0)
        }
      }
    }
  }

  const tests = Object.values(testsById)
  if (tests.length === 0) {
    return res.status(400).json({ error: 'No tests found for sample conversion' })
  }

  // Create order with financial fields for reporting
  const orderData: any = {
    tokenId: token._id,
    tokenNo: token.tokenNo,
    patientId: token.patientId,
    patient: token.patient,
    labNumber: token.labNumber,
    status: 'received',
    barcode,
    tests,
    testStatuses: tests.map((t: any) => ({
      testId: t.testId,
      testName: t.testName,
      status: 'pending'
    })),
    referringConsultant: data.referringConsultant || token.referringConsultant,
    corporateId: data.corporateId || token.corporateId,
    portal: token.portal,
    createdByUsername: actor,
    // Financial fields for reporting
    subtotal,
    discount,
    net,
    receivedAmount,
    receivableAmount,
  }

  const order = await LabOrder.create(orderData)
  const orderId = String(order._id)

  // Create LabOrderTest documents for each test (CORE - per test control)
  // Set sampleTime to current time by default when converting to sample
  // Format as HH:mm in Pakistan timezone (UTC+5) for compatibility with frontend time input
  const sampleDate = new Date()
  // Pakistan is UTC+5
  const pakistanTime = new Date(sampleDate.getTime() + (5 * 60 * 60 * 1000))
  const hours = String(pakistanTime.getUTCHours()).padStart(2, '0')
  const minutes = String(pakistanTime.getUTCMinutes()).padStart(2, '0')
  const sampleTimeStr = `${hours}:${minutes}`
  
  const orderTestDocs = tests.map((t: any) => ({
    tokenId: token._id,
    orderId: order._id,
    tokenNo: token.tokenNo,
    patientId: token.patientId,
    testId: t.testId,
    testName: t.testName,
    price: t.price || 0,
    status: 'pending',
    sampleTime: sampleTimeStr, // Auto-set sample time to current time (HH:mm format)
  }))
  await LabOrderTest.insertMany(orderTestDocs)

  // Record payment in ledger if any
  if (receivedAmount > 0) {
    const paymentRecord = {
      tokenId: token._id,
      orderId: order._id,
      patientId: token.patientId,
      type: 'payment',
      amount: receivedAmount,
      method: mapPaymentMethodEnum(data.paymentMethod),
      note: data.paymentNote || 'Payment during conversion to sample',
      createdBy: actor,
    }
    await LabPayment.create(paymentRecord)

    // Also add to order's payments array for income ledger reporting
    await LabOrder.findByIdAndUpdate(order._id, {
      $push: {
        payments: {
          amount: receivedAmount,
          at: now,
          method: data.paymentMethod || 'cash',
          note: data.paymentNote || 'Payment during conversion to sample',
          receivedBy: actor
        }
      }
    })
  }

  // Update token with financial data
  token.status = 'converted_to_sample'
  token.convertedAt = now
  token.convertedBy = actor
  token.orderId = orderId
  token.barcode = barcode
  token.tests = tests
  token.subtotal = subtotal
  token.discount = discount
  token.net = net
  token.receivedAmount = receivedAmount
  token.receivableAmount = receivableAmount
  if (data.paymentMethod) {
    token.paymentMethod = data.paymentMethod
  }
  await token.save()

  // If this token was created from a referral, link the referral with the order
  if (token.referralId) {
    try {
      await HospitalReferral.findByIdAndUpdate(token.referralId, {
        $set: {
          tokenNo: token.tokenNo,
          linkedOrderId: orderId,
          status: 'completed'
        }
      })
    } catch {}
  }

  // Post revenue journal to finance (non-corporate only)
  try {
    if (!token.corporateId && net > 0) {
      const userAccount = `${actor}/lab`
      const methodToUse = data.paymentMethod || token.paymentMethod
      await postLabOrderJournal({
        orderId: orderId,
        dateIso: now.slice(0, 10),
        amount: net,
        paidMethod: resolvePaidMethod(methodToUse),
        patientName: token.patient?.fullName || token.patientName,
        mrn: token.patient?.mrn || token.mrn,
        tokenNo: token.tokenNo,
        createdByUsername: actor,
      })
    }
  } catch (e) {
    console.error('Failed to post Lab revenue journal:', e)
  }

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

  const fmt = await LabSettings.findOne().lean().then((s: any) => s?.labNumberFormat).catch(() => undefined)
  const tokenObj = token.toObject ? token.toObject() : token
  const orderObj = order.toObject ? order.toObject() : order
  res.json({
    token: { ...tokenObj, formattedLabNumber: formatLabNumber(tokenObj.labNumber, fmt) },
    order: { ...orderObj, formattedLabNumber: formatLabNumber(orderObj.labNumber, fmt) },
  })
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

// Mark report as printed
export async function markReportPrinted(req: Request, res: Response) {
  const { id } = req.params
  const actor = (req as any).user?.username || 'system'
  const now = new Date().toISOString()

  const isObjectId = /^[a-f\d]{24}$/i.test(String(id || ''))
  let token: any = isObjectId ? await LabToken.findById(id) : null
  if (!token) token = await LabToken.findOne({ tokenNo: id })
  if (!token) return res.status(404).json({ error: 'Token not found' })

  token.reportPrintedAt = now
  token.reportPrintedBy = actor
  await token.save()
  res.json({ reportPrintedAt: now, reportPrintedBy: actor })
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

  if (token.status !== 'token_generated' && patch.tests) {
    return res.status(400).json({ error: 'Tests can only be edited before conversion' })
  }

  const set: any = {}
  if (patch.patient) set.patient = { ...(token.patient || {}), ...(patch.patient || {}) }

  let resolvedTests: any[] | null = null
  const packageTests: any[] = []
  if (Array.isArray(patch.packageIds) && patch.packageIds.length > 0) {
    const packages = await LabTestPackage.find({ _id: { $in: patch.packageIds } }).lean()
    for (const pkg of packages) {
      const pkgTests = Array.isArray(pkg.tests) ? pkg.tests : []
      for (const pt of pkgTests) {
        if (!pt?.testId) continue
        packageTests.push({
          testId: String(pt.testId),
          testName: pt.testName,
          price: pt.price || 0,
        })
      }
    }
  }

  const testsMap = new Map<string, any>()
  for (const t of packageTests) {
    testsMap.set(t.testId, t)
  }

  const testIdsToFetch: string[] = []
  if (patch.tests) {
    const patchTests = patch.tests as any[]
    for (const t of patchTests) {
      if (typeof t === 'string') {
        testIdsToFetch.push(t)
      } else if (t?.testId) {
        testsMap.set(t.testId, t)
      }
    }
  }

  if (testIdsToFetch.length > 0) {
    const fetchedTests = await LabTest.find({ _id: { $in: testIdsToFetch } }).lean()
    for (const ft of fetchedTests) {
      testsMap.set(String(ft._id), {
        testId: String(ft._id),
        testName: ft.name,
        price: ft.price || 0,
      })
    }
  }

  if (testsMap.size > 0) {
    resolvedTests = Array.from(testsMap.values())
    set.tests = resolvedTests
  } else if (patch.tests) {
    set.tests = patch.tests
  }

  if (patch.referringConsultant != null) set.referringConsultant = patch.referringConsultant
  if (patch.sampleType != null) set.sampleType = patch.sampleType
  if (patch.packageIds != null) set.packageIds = patch.packageIds

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
