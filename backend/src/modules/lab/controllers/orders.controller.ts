import { Request, Response } from 'express'
import { LabOrder } from '../models/Order'
import { LabOrderTest } from '../models/OrderTest'
import { LabToken } from '../models/Token'
import { LabAuditLog } from '../models/AuditLog'
import { LabSettings } from '../models/Settings'
import { orderCreateSchema, orderQuerySchema, orderTrackUpdateSchema } from '../validators/order'
import { LabCounter } from '../models/Counter'
import { LabResult } from '../models/Result'
import { LabInventoryItem } from '../models/InventoryItem'
import { LabPayment } from '../models/Payment'
import { LabTest } from '../models/Test'
import { resolveTestPrice } from '../../corporate/utils/price'
import { CorporateTransaction } from '../../corporate/models/Transaction'
import { CorporateCompany } from '../../corporate/models/Company'
import { postFbrInvoiceViaSDC } from '../../hospital/services/fbr'
import { postLabOrderJournal } from '../../finance/controllers/finance_ledger'
import { logActivity } from '../../finance/services/activityLog.service'
import { formatLabNumber } from '../../../common/utils/labNumberFormat'

function getPakistanDate(): string {
  // Pakistan Standard Time is UTC+5
  const now = new Date()
  const pakistanOffset = 5 * 60 * 60 * 1000 // 5 hours in milliseconds
  const pakistanTime = new Date(now.getTime() + pakistanOffset)
  return pakistanTime.toISOString().slice(0, 10)
}

function resolvePaidMethod(paymentMethod?: string): 'Cash' | 'Bank' | 'AR' {
  const method = String(paymentMethod || '').trim().toLowerCase()
  if (method === 'cash') return 'Cash'
  if (method === 'bank' || method === 'card') return 'Bank'
  return 'AR'
}

async function nextLabNumber(): Promise<number> {
  const key = 'lab_number_global'
  const c: any = await LabCounter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true })
  return c?.seq || 1
}

async function nextToken(date?: Date){
  const d = date || new Date()
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0')
  const key = `lab_token_${y}${m}${day}`
  const c: any = await LabCounter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true })
  return String(c?.seq || 1)
}

function resolveActor(req: Request) {
  return (req as any).user?.username || (req as any).user?.name || (req as any).user?.email || 'system'
}

function clampMoney(n: any){
  const x = Number(n || 0)
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.round(x))
}

async function recomputeTokenTotals(tokenNo: string){
  const orders: any[] = await LabOrder.find({ tokenNo }).sort({ createdAt: 1 })
  const base = orders[0]
  
  // Calculate tokenNet from non-returned LabOrderTest items (single source of truth)
  const orderTests: any[] = await LabOrderTest.find({ tokenNo })
  const tokenNet = orderTests
    .filter(t => !t.isReturned)
    .reduce((s, t) => s + clampMoney(t?.price || 0), 0)
  
  const received = clampMoney(base?.receivedAmount)
  const receivable = Math.max(0, tokenNet - received)
  return { orders, tokenNet, received, receivable }
}

function uniqStrings(arr: any[]){
  const out: string[] = []
  const seen = new Set<string>()
  for (const x of (arr || [])){
    const s = String(x || '').trim()
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}

export async function list(req: Request, res: Response){
  const parsed = orderQuerySchema.safeParse(req.query)
  const { q, status, from, to, page, limit } = parsed.success ? parsed.data as any : {}
  const filter: any = {}
  if (q){
    const rx = new RegExp(String(q), 'i')
    filter.$or = [ { 'patient.fullName': rx }, { 'patient.phone': rx }, { tokenNo: rx }, { 'patient.mrn': rx } ]
  }
  if (status) {
    filter.status = status
  }
  if (from || to){
    // Pakistan timezone is UTC+5. Convert Pakistan local dates to UTC boundaries.
    // Pakistan midnight = UTC 19:00 (previous day)
    filter.createdAt = {}
    if (from) {
      // Start of day in Pakistan = 19:00 UTC previous day
      const pakFrom = new Date(from + 'T00:00:00')
      const utcFrom = new Date(pakFrom.getTime() - (5 * 60 * 60 * 1000))
      filter.createdAt.$gte = utcFrom
    }
    if (to) {
      // End of day in Pakistan = 18:59:59.999 UTC same day
      const pakTo = new Date(to + 'T23:59:59.999')
      const utcTo = new Date(pakTo.getTime() - (5 * 60 * 60 * 1000))
      filter.createdAt.$lte = utcTo
    }
  }
  const lim = Math.min(500, Number(limit || 20))
  const pg = Math.max(1, Number(page || 1))
  const skip = (pg - 1) * lim
  const [items, total] = await Promise.all([
    LabOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    LabOrder.countDocuments(filter),
  ])

  // Fetch associated tests for each order
  const fmt = await LabSettings.findOne().lean().then((s: any) => s?.labNumberFormat).catch(() => undefined)
  const ordersWithTests = await Promise.all(items.map(async (order: any) => {
    const tests = await LabOrderTest.find({ orderId: order._id }).lean()
    return { ...order, tests, formattedLabNumber: formatLabNumber(order.labNumber, fmt) }
  }))

  const totalPages = Math.max(1, Math.ceil((total || 0) / lim))
  res.json({ items: ordersWithTests, total, page: pg, limit: lim, totalPages })
}

export async function create(req: Request, res: Response){
  const data = orderCreateSchema.parse(req.body)
  const isCorporate = Boolean((data as any).corporateId)
  const coPayPct = Math.max(0, Math.min(100, Number((data as any)?.corporateCoPayPercent || 0)))
  const portal = String((req as any).body?.portal || 'lab')
  if ((data as any).corporateId){
    const comp = await CorporateCompany.findById(String((data as any).corporateId)).lean()
    if (!comp) return res.status(400).json({ error: 'Invalid corporateId' })
    if ((comp as any).active === false) return res.status(400).json({ error: 'Corporate company inactive' })
  }
  // Merge manual consumables with test-defined defaults
  let combinedConsumables: Array<{ item: string; qty: number }> = []
  try {
    const manual = Array.isArray((data as any).consumables) ? (data as any).consumables : []
    const testIds = Array.isArray((data as any).tests) ? (data as any).tests : []
    const tests = await LabTest.find({ _id: { $in: testIds } }).lean()
    const defaults = tests.flatMap((t: any) => Array.isArray(t?.consumables) ? t.consumables : [])
    const all = [...manual, ...defaults]
    const map = new Map<string, number>()
    for (const c of all){
      const key = String((c as any).item || '').trim().toLowerCase()
      const qty = Math.max(0, Number((c as any).qty || 0))
      if (!key || qty <= 0) continue
      map.set(key, (map.get(key) || 0) + qty)
    }
    combinedConsumables = Array.from(map.entries()).map(([item, qty]) => ({ item, qty }))
  } catch (e){ console.warn('Failed to merge test consumables', e); combinedConsumables = Array.isArray((data as any).consumables)? (data as any).consumables as any : [] }

  const tokenNo = (data as any).tokenNo || await nextToken(new Date())
  const actor = resolveActor(req)
  
  // Generate labNumber for this token (continuously growing serial)
  const existingOrders = await LabOrder.find({ tokenNo }).lean()
  const labNumber = existingOrders.length > 0 && existingOrders[0]?.labNumber 
    ? existingOrders[0].labNumber 
    : await nextLabNumber()
  
  const existingCount = existingOrders.length
  const isFirstRow = existingCount === 0
  // For corporate tokens: Lab should only record co-pay (patient portion) as received income.
  // Corporate portion is tracked via CorporateTransactions/claims and must not create Lab receivable.
  const initReceived = isFirstRow
    ? (isCorporate
      ? clampMoney((data as any).receivedAmount)
      : clampMoney((data as any).receivedAmount))
    : 0
  const payments = (isFirstRow && initReceived > 0)
    ? [{ amount: initReceived, at: new Date().toISOString(), note: (data as any).paymentNote || undefined, method: (data as any).paymentMethod || undefined, receivedBy: actor }]
    : []

  // If corporate: compute lab-side income as co-pay amount on list prices.
  let corpCoPayIncome = 0
  if (isCorporate && coPayPct > 0){
    try {
      const ids = Array.isArray((data as any).tests) ? (data as any).tests : []
      const docs = await LabTest.find({ _id: { $in: ids } }).select('price').lean()
      const sum = (docs || []).reduce((s: number, t: any)=> s + Math.max(0, Number(t?.price || 0)), 0)
      corpCoPayIncome = Math.max(0, sum * (coPayPct/100))
    } catch {}
  }

  // Calculate financials for non-corporate orders
  let orderSubtotal = 0
  if (!isCorporate) {
    try {
      const ids = Array.isArray((data as any).tests) ? (data as any).tests : []
      const docs = await LabTest.find({ _id: { $in: ids } }).select('price').lean()
      orderSubtotal = (docs || []).reduce((s: number, t: any)=> s + Math.max(0, Number(t?.price || 0)), 0)
    } catch {}
  }
  const orderDiscount = clampMoney((data as any).discount || 0)
  const orderNet = isCorporate ? corpCoPayIncome : Math.max(0, orderSubtotal - orderDiscount)
  const orderReceived = isCorporate 
    ? (isFirstRow ? Math.min(corpCoPayIncome, initReceived) : 0)
    : (isFirstRow ? Math.min(orderNet, initReceived) : 0)

  const doc: any = await LabOrder.create({
    ...data,
    createdByUsername: actor,
    portal,
    labNumber,
    // Financial fields
    subtotal: isCorporate ? 0 : orderSubtotal,
    discount: orderDiscount,
    net: orderNet,
    receivedAmount: orderReceived || 0,
    receivableAmount: Math.max(0, orderNet - (orderReceived || 0)),
    payments,
    consumables: combinedConsumables,
    tokenNo,
    status: 'received',
  })

  // Create LabOrderTest documents for each test (CORE - per test control)
  try {
    const testIds = Array.isArray((data as any).tests) ? (data as any).tests : []
    const tests = await LabTest.find({ _id: { $in: testIds } }).lean()
    const map = new Map<string, any>(tests.map(t => [String((t as any)._id), t]))
    
    // Format sample time as HH:mm in Pakistan timezone (UTC+5) for frontend time input compatibility
    const now = new Date()
    // Pakistan is UTC+5
    const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000))
    const hours = String(pakistanTime.getUTCHours()).padStart(2, '0')
    const minutes = String(pakistanTime.getUTCMinutes()).padStart(2, '0')
    const sampleTimeStr = `${hours}:${minutes}`
    
    const orderTestDocs = testIds.map((tid: any) => {
      const t = map.get(String(tid))
      return {
        tokenId: existingOrders.length > 0 ? existingOrders[0].tokenId : undefined, // Will be fixed below if needed
        orderId: doc._id,
        tokenNo,
        patientId: String((data as any).patientId || ''),
        testId: String(tid),
        testName: t?.name || String(tid),
        price: Number(t?.price || 0),
        status: 'pending',
        sampleTime: sampleTimeStr, // Auto-set sample time to current time (HH:mm format)
      }
    })
    
    // If we have a tokenId from existing token record
    const existingToken = await LabToken.findOne({ tokenNo })
    if (existingToken) {
      orderTestDocs.forEach((d: any) => d.tokenId = existingToken._id)
    }
    
    await LabOrderTest.insertMany(orderTestDocs)
  } catch (e) { console.error('Failed to create LabOrderTest documents:', e) }

  // After inserting, recompute token totals (net across all rows) and sync to all orders
  try {
    const allTests = await LabOrderTest.find({ tokenNo }).lean()
    const testStatuses = allTests.map(t => ({
      testId: t.testId,
      testName: t.testName,
      status: t.status,
      resultId: t.resultId
    }))
    
    // Also fetch test snapshots for the order
    const testDocs = await LabTest.find({ _id: { $in: uniqStrings(allTests.map(t => t.testId)) } }).lean()
    const tests = testDocs.map(t => ({
      testId: String(t._id),
      testName: t.name,
      price: t.price || 0
    }))

    if (isCorporate){
      // Keep corporate tokens non-receivable; preserve co-pay received on first row
      const received = isFirstRow ? Math.min(corpCoPayIncome, initReceived) : 0
      await LabOrder.updateMany({ tokenNo }, { $set: { receivedAmount: received, receivableAmount: 0, testStatuses, tests } })
    } else {
      const { tokenNet, received, receivable } = await recomputeTokenTotals(tokenNo)
      await LabOrder.updateMany({ tokenNo }, { $set: { receivedAmount: received, receivableAmount: receivable, testStatuses, tests } })
    }
  } catch {}

  // FBR fiscalization (Lab is paid at order creation)
  try {
    if (isCorporate) throw new Error('skip_fbr_for_corporate')
    const payload = {
      tokenNo,
      patient: (data as any).patient || undefined,
      patientName: (data as any)?.patient?.fullName || undefined,
      phone: (data as any)?.patient?.phone || undefined,
      cnic: (data as any)?.patient?.cnic || undefined,
      lines: Array.isArray((data as any).tests)
        ? (await LabTest.find({ _id: { $in: (data as any).tests } }).select('name price').lean()).map((t: any)=> ({ name: t?.name || 'Test', qty: 1, unitPrice: Number(t?.price || 0) }))
        : [],
      subtotal: Number((data as any).subtotal || (data as any).total || 0),
      discount: Number((data as any).discount || 0),
      net: Number((data as any).net || (data as any).total || 0),
    }
    const amount = Number((payload as any).net || (payload as any).subtotal || 0)
    const r: any = await postFbrInvoiceViaSDC({ module: 'LAB_ORDER_CREATE', invoiceType: 'LAB', refId: String(doc._id), amount, payload })
    if (r) {
      ;(doc as any).fbrInvoiceNo = r.fbrInvoiceNo
      ;(doc as any).fbrQrCode = r.qrCode
      ;(doc as any).fbrStatus = r.status
      ;(doc as any).fbrMode = r.mode
      ;(doc as any).fbrError = r.error
      try { await doc.save() } catch {}
    }
  } catch {}
  // Deduct consumables from inventory (best-effort)
  try {
    const cons = Array.isArray(combinedConsumables) ? combinedConsumables : []
    await Promise.all(cons.map(async (c: any) => {
      const key = String(c.item || '').trim().toLowerCase()
      const qty = Math.max(0, Number(c.qty || 0))
      if (!key || qty <= 0) return
      const it = await (LabInventoryItem as any).findOne({ key })
      if (!it) return
      const cur = Math.max(0, Number(it.onHand || 0))
      it.onHand = Math.max(0, cur - qty)
      await it.save()
    }))
  } catch (e){
    console.error('Consumable deduction failed:', e)
  }
  try {
    await LabAuditLog.create({
      actor,
      action: 'Sample Intake',
      label: 'SAMPLE_INTAKE',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Token ${tokenNo} — ${String((data as any)?.patient?.fullName || '')}`,
    })
  } catch {}
  // Corporate: create ledger lines per test
  try {
    const companyId = (data as any).corporateId ? String((data as any).corporateId) : ''
    if (companyId){
      const testIds = Array.isArray(data.tests)? data.tests : []
      const tests = await LabTest.find({ _id: { $in: testIds } }).lean()
      const map = new Map<string, any>(tests.map(t => [String((t as any)._id), t]))
      const dateIso = getPakistanDate()
      for (const tid of testIds){
        const t = map.get(String(tid))
        const listPrice = Number(t?.price || 0)
        const corp = await resolveTestPrice({ companyId, scope: 'LAB', testId: String(tid), defaultPrice: listPrice })
        const baseCorp = Number(corp.price || 0)
        const coPayPct = Math.max(0, Math.min(100, Number((data as any)?.corporateCoPayPercent || 0)))
        const coPayAmt = Math.max(0, baseCorp * (coPayPct/100))
        let net = Math.max(0, baseCorp - coPayAmt)
        const cap = Number((data as any)?.corporateCoverageCap || 0) || 0
        if (cap > 0){
          try {
            const existing = await CorporateTransaction.find({ refType: 'lab_order', refId: String((doc as any)?._id || '') }).select('netToCorporate').lean()
            const used = (existing || []).reduce((s: number, tx: any)=> s + Number(tx?.netToCorporate||0), 0)
            const remaining = Math.max(0, cap - used)
            net = Math.max(0, Math.min(net, remaining))
          } catch {}
        }
        await CorporateTransaction.create({
          companyId,
          patientMrn: String((data as any)?.patient?.mrn || ''),
          patientName: String((data as any)?.patient?.fullName || ''),
          serviceType: 'LAB',
          refType: 'lab_order',
          refId: String((doc as any)?._id || ''),
          itemRef: String(tid),
          dateIso,
          description: `Lab Test${t?.name?`: ${t.name}`:''}`,
          qty: 1,
          unitPrice: listPrice,
          corpUnitPrice: baseCorp,
          coPay: coPayAmt,
          netToCorporate: net,
          corpRuleId: String(corp.appliedRuleId||''),
          status: 'accrued',
        })
      }
    }
  } catch (e) { console.warn('Failed to create corporate transactions for Lab order', e) }
  
  // Sync with LabToken collection for tracking
  try {
    const now = new Date().toISOString()
    const orderNet = isCorporate ? corpCoPayIncome : Number((data as any).net || 0)
    const orderReceived = isCorporate 
      ? (isFirstRow ? Math.min(corpCoPayIncome, initReceived) : 0)
      : (isFirstRow ? initReceived : 0)
    const existingToken = await LabToken.findOne({ tokenNo })
    if (existingToken) {
      // Update existing token
      existingToken.status = 'converted_to_sample'
      existingToken.convertedAt = now
      existingToken.convertedBy = actor
      existingToken.orderId = String(doc._id)
      if (!existingToken.barcode) {
        const y = new Date().getFullYear()
        existingToken.barcode = `BC-${y}-${tokenNo.replace(/\s+/g, '').replace(/[^a-z0-9_-]/gi, '')}`
      }
      // Update financial data (aggregate with existing)
      existingToken.receivedAmount = (existingToken.receivedAmount || 0) + orderReceived
      existingToken.receivableAmount = Math.max(0, orderNet - (existingToken.receivedAmount || 0))
      await existingToken.save()
    } else {
      // Create new token record (for backward compatibility with existing orders)
      const y = new Date().getFullYear()
      const barcode = `BC-${y}-${tokenNo.replace(/\s+/g, '').replace(/[^a-z0-9_-]/gi, '')}`
      await LabToken.create({
        tokenNo,
        labNumber,
        patientId: String((data as any)?.patientId || ''),
        patient: (data as any)?.patient,
        tests: Array.isArray((data as any)?.tests) ? (data as any).tests : [],
        status: 'converted_to_sample',
        generatedAt: now,
        generatedBy: actor,
        convertedAt: now,
        convertedBy: actor,
        orderId: String(doc._id),
        barcode,
        referringConsultant: (data as any)?.referringConsultant,
        corporateId: (data as any)?.corporateId,
        portal,
        receivedAmount: orderReceived,
        receivableAmount: Math.max(0, orderNet - orderReceived),
      })
    }
  } catch (e) { console.warn('Failed to sync LabToken for order', e) }

  // Auto-post revenue journal to finance (non-corporate only)
  try {
    const net = Number((data as any).net || 0)
    if (!isCorporate && net > 0) {
      const userAccount = `${actor}/lab`
      await postLabOrderJournal({
        orderId: String(doc._id),
        dateIso: getPakistanDate(),
        amount: net,
        paidMethod: resolvePaidMethod((data as any).paymentMethod),
        patientName: (data as any)?.patient?.fullName,
        mrn: (data as any)?.patient?.mrn,
        tokenNo: tokenNo,
        createdByUsername: actor,
      })
    }
  } catch (e) {
    console.error('Failed to post Lab revenue journal:', e)
  }

  // Activity log
  try {
    logActivity({
      userId: String((req as any).user?._id || (req as any).user?.id || (req as any).user?.email || 'system'),
      userName: String(actor || ''),
      portal: 'lab',
      action: orderReceived > 0 ? 'Lab Payment Collected' : 'Order Created',
      module: 'Lab',
      entityId: String(doc._id),
      entityLabel: `Order ${tokenNo} — ${(data as any)?.patient?.fullName || ''}`,
      amount: Number(orderReceived || 0),
      method: resolvePaidMethod((data as any).paymentMethod),
      meta: { tokenNo, patientId: String((data as any)?.patientId || ''), labNumber: doc.labNumber, net: orderNet }
    })
  } catch {}

  const fmt = await LabSettings.findOne().lean().then((s: any) => s?.labNumberFormat).catch(() => undefined)
  res.status(201).json({ ...doc.toObject(), formattedLabNumber: formatLabNumber(doc.labNumber, fmt) })
}

export async function receivePayment(req: Request, res: Response){
  const tokenNo = String((req as any).params?.tokenNo || '').trim()
  if (!tokenNo) return res.status(400).json({ error: 'tokenNo is required' })
  try {
    const anyCorporate = await LabOrder.exists({ tokenNo, corporateId: { $exists: true, $ne: null } })
    if (anyCorporate) return res.status(400).json({ error: 'Cannot receive cash payment for corporate token' })
  } catch {}
  const amount = clampMoney((req as any).body?.amount)
  const note = String((req as any).body?.note || '').trim() || undefined
  const method = String((req as any).body?.method || '').trim() || undefined
  if (amount <= 0) return res.status(400).json({ error: 'amount must be > 0' })

  const actor = resolveActor(req)
  const { orders, tokenNet, received: already } = await recomputeTokenTotals(tokenNo)
  if (!orders.length) return res.status(404).json({ error: 'Token not found' })

  const nextReceived = Math.min(tokenNet, already + amount)
  const deltaApplied = Math.max(0, nextReceived - already)
  const nextReceivable = Math.max(0, tokenNet - nextReceived)
  if (deltaApplied <= 0) return res.status(400).json({ error: 'Nothing receivable for this token' })

  const payment = { amount: deltaApplied, at: new Date().toISOString(), note, method, receivedBy: actor }
  await LabOrder.updateMany(
    { tokenNo },
    {
      $set: { receivedAmount: nextReceived, receivableAmount: nextReceivable },
      $push: { payments: payment },
    },
  )
  
  // Sync financial data with LabToken
  try {
    const token = await LabToken.findOne({ tokenNo })
    if (token) {
      token.receivedAmount = nextReceived
      token.receivableAmount = nextReceivable
      await token.save()
    }
  } catch {}

  try {
    await LabAuditLog.create({
      actor,
      action: 'Receive Payment',
      label: 'LAB_RECEIVE_PAYMENT',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Token ${tokenNo} — Received ${deltaApplied}`,
    })
  } catch {}

  // Activity log
  try {
    logActivity({
      userId: String((req as any).user?._id || (req as any).user?.id || (req as any).user?.email || 'system'),
      userName: actor,
      portal: 'lab',
      action: 'Lab Payment Received',
      module: 'Lab',
      entityId: String(tokenNo),
      entityLabel: `Token ${tokenNo}`,
      amount: Number(deltaApplied || 0),
      method: String(method || 'Cash'),
      meta: { tokenNo, nextReceived, nextReceivable, note: note || '' }
    })
  } catch {}

  const updated = await LabOrder.find({ tokenNo }).sort({ createdAt: 1 }).lean()
  res.json({ tokenNo, receivedAmount: nextReceived, receivableAmount: nextReceivable, payment, items: updated })
}

export async function updateTrack(req: Request, res: Response){
  const { id } = req.params
  const patch = orderTrackUpdateSchema.parse(req.body)
  const actor = resolveActor(req)
  const before: any = await LabOrder.findById(id)
  if (!before) return res.status(404).json({ message: 'Order not found' })

  const { testId, orderTestId, ...otherFields } = patch
  
  // Handle per-test updates
  if (orderTestId || testId) {
    let financialDelta = 0
    let financialDeltaType: 'refund' | 'payment' | null = null

    const updateData: any = {}
    if (otherFields.sampleTime !== undefined) updateData.sampleTime = otherFields.sampleTime
    if (otherFields.status !== undefined) updateData.status = otherFields.status
    if (otherFields.isReturned !== undefined) {
      updateData.isReturned = otherFields.isReturned
      if (otherFields.isReturned === true) {
        updateData.returnedAt = new Date()
      } else if (otherFields.isReturned === false) {
        updateData.returnedAt = undefined
      }
    }
    if (otherFields.returnReason !== undefined) updateData.returnReason = otherFields.returnReason
    // Track who performed the sample collection, status change, or return
    if (updateData.sampleTime !== undefined || updateData.status !== undefined || updateData.isReturned !== undefined) {
      updateData.performedBy = actor
    }
    
    let testDoc: any = null
    if (orderTestId) {
      testDoc = await LabOrderTest.findByIdAndUpdate(orderTestId, { $set: updateData }, { new: true })
    } else {
      testDoc = await LabOrderTest.findOneAndUpdate({ orderId: id, testId }, { $set: updateData }, { new: true })
    }

    if (testDoc) {
      // Logic for RETURNED test
      if (updateData.isReturned === true || updateData.status === 'returned') {
        // Create refund if requested or by default for return
        const amountToRefund = patch.refundAmount !== undefined ? patch.refundAmount : (testDoc.price || 0)
        if (amountToRefund > 0) {
          const rawMethod = String(patch.refundMethod || 'cash').toLowerCase()
          const safeMethod = ['cash', 'card', 'online', 'bank_transfer', 'corporate_credit'].includes(rawMethod) ? rawMethod : (rawMethod === 'corporate' ? 'corporate_credit' : 'cash')
          await LabPayment.create({
            tokenId: before.tokenId,
            orderId: id,
            patientId: before.patientId,
            type: 'refund',
            amount: amountToRefund,
            method: safeMethod,
            note: `Refund for returned test: ${testDoc.testName}. Reason: ${testDoc.returnReason || 'N/A'}`,
            createdBy: actor
          })
          financialDelta = Math.max(0, Number(amountToRefund) || 0)
          financialDeltaType = 'refund'
        }
      } 
      // Logic for UNDO RETURN
      else if (updateData.isReturned === false && testDoc.isReturned === true) {
        // Create payment entry for undoing a return
        await LabPayment.create({
          tokenId: before.tokenId,
          orderId: id,
          patientId: before.patientId,
          type: 'payment',
          amount: testDoc.price || 0,
          method: 'cash',
          note: `Undo return for test: ${testDoc.testName}`,
          createdBy: actor
        })
        financialDelta = Math.max(0, Number(testDoc.price || 0))
        financialDeltaType = 'payment'
      }
    }

    // Sync testStatuses back to LabOrder
    try {
      const allTests = await LabOrderTest.find({ orderId: id })
      const testStatuses = allTests.map(t => ({
        testId: t.testId,
        testName: t.testName,
        status: t.status,
        resultId: t.resultId,
        orderTestId: t._id,
        isReturned: t.isReturned
      }))

      const activeTests = allTests.filter(t => !t.isReturned)
      const allCompleted = activeTests.length > 0 && activeTests.every(t => t.status === 'completed')
      const allHaveResults = activeTests.length > 0 && activeTests.every(t => t.status === 'result_entered' || t.status === 'completed')
      const anyInProgress = activeTests.some(t => t.status === 'in_progress' || t.status === 'sample_collected')

      let nextOrderStatus: any = before?.status || 'received'
      if (activeTests.length === 0 && allTests.some(t => t.isReturned)) nextOrderStatus = 'cancelled' // or stay as is
      else if (allCompleted) nextOrderStatus = 'completed'
      else if (allHaveResults) nextOrderStatus = 'result_entered'
      else if (anyInProgress) nextOrderStatus = 'in_progress'
      
      await LabOrder.findByIdAndUpdate(id, {
        $set: {
          testStatuses,
          status: nextOrderStatus,
        }
      })

      // Recompute and persist token/order financials based on non-returned tests.
      // This keeps totals consistent across Sample Tracking print, Today's Tokens print, and Track dialog.
      try {
        const tokenNo = String((before as any)?.tokenNo || '')
        if (tokenNo) {
          const activeSubtotal = activeTests.reduce((s: number, t: any) => s + Math.max(0, Number(t?.price || 0)), 0)
          const discount = 0
          const net = Math.max(0, activeSubtotal - discount)

          const tokenDoc: any = await LabToken.findOne({ tokenNo })
          const prevReceived = Math.max(0, Number(tokenDoc?.receivedAmount ?? (before as any)?.receivedAmount ?? 0))
          const nextReceived = financialDeltaType === 'refund'
            ? Math.max(0, prevReceived - financialDelta)
            : (financialDeltaType === 'payment'
              ? (prevReceived + financialDelta)
              : prevReceived)
          const nextReceivable = Math.max(0, net - nextReceived)

          await LabOrder.updateMany(
            { tokenNo },
            {
              $set: {
                subtotal: activeSubtotal,
                discount,
                net,
                receivedAmount: nextReceived,
                receivableAmount: nextReceivable,
              },
            },
          )

          if (tokenDoc) {
            tokenDoc.subtotal = activeSubtotal
            tokenDoc.discount = discount
            tokenDoc.net = net
            tokenDoc.receivedAmount = nextReceived
            tokenDoc.receivableAmount = nextReceivable
            await tokenDoc.save()
          }
        }
      } catch (e) { console.warn('Failed to recompute token financials after return/undo return', e) }
    } catch (e) { console.warn('Failed to sync testStatuses to LabOrder in updateTrack', e) }
  }

  // Handle order-level updates
  let updateQuery: any = { $set: {} }
  for (const [key, value] of Object.entries(otherFields)) {
    if (value !== undefined && key !== 'sampleTime' && key !== 'status') {
      updateQuery.$set[key] = value
    }
  }

  // Only update LabOrder if there are non-test-specific fields
  let doc = before
  if (Object.keys(updateQuery.$set).length > 0) {
    doc = await LabOrder.findByIdAndUpdate(id, updateQuery, { new: true })
    if (!doc) return res.status(404).json({ message: 'Order not found' })
  }
  // Corporate: on returned, create reversals for all items
  try {
    if ((patch as any).status === 'returned' && String(before?.status) !== 'returned'){
      const existing: any[] = await CorporateTransaction.find({ refType: 'lab_order', refId: String(id), status: { $ne: 'reversed' } }).lean()
      for (const tx of existing){
        try { await CorporateTransaction.findByIdAndUpdate(String(tx._id), { $set: { status: 'reversed' } }) } catch {}
        try {
          await CorporateTransaction.create({
            companyId: tx.companyId,
            patientMrn: tx.patientMrn,
            patientName: tx.patientName,
            serviceType: tx.serviceType,
            refType: tx.refType,
            refId: tx.refId,
            itemRef: tx.itemRef,
            dateIso: getPakistanDate(),
            description: `Reversal: ${tx.description || 'Lab Test'}`,
            qty: tx.qty,
            unitPrice: -Math.abs(Number(tx.unitPrice||0)),
            corpUnitPrice: -Math.abs(Number(tx.corpUnitPrice||0)),
            coPay: -Math.abs(Number(tx.coPay||0)),
            netToCorporate: -Math.abs(Number(tx.netToCorporate||0)),
            corpRuleId: tx.corpRuleId,
            status: 'accrued',
            reversalOf: String(tx._id),
          })
        } catch (e) { console.warn('Failed to create corporate reversal for Lab order', e) }
      }
    }
  } catch (e) { console.warn('Corporate reversal (lab updateTrack) failed', e) }
  // Inventory: on returned, restore consumables once per transition
  try {
    if ((patch as any).status === 'returned' && String(before?.status) !== 'returned'){
      const cons: any[] = Array.isArray((doc as any)?.consumables) ? (doc as any).consumables : []
      await Promise.all(cons.map(async (c: any) => {
        const key = String(c.item || '').trim().toLowerCase()
        const qty = Math.max(0, Number(c.qty || 0))
        if (!key || qty <= 0) return
        const it = await (LabInventoryItem as any).findOne({ key })
        if (!it) return
        const cur = Math.max(0, Number(it.onHand || 0))
        it.onHand = cur + qty
        await it.save()
      }))
    }
  } catch (e) { console.warn('Inventory restore (lab updateTrack) failed', e) }
  
  // Sync with LabToken for sample_received status
  try {
    const tokenNo = (doc as any)?.tokenNo
    if (tokenNo && (patch as any).sampleTime) {
      const actor = resolveActor(req)
      const existingToken = await LabToken.findOne({ tokenNo })
      if (existingToken && existingToken.status === 'converted_to_sample') {
        existingToken.status = 'sample_received'
        existingToken.sampleReceivedAt = new Date().toISOString()
        existingToken.sampleReceivedBy = actor
        await existingToken.save()
      }
    }
  } catch (e) { console.warn('Failed to sync LabToken for sample received', e) }
  
  try {
    const actor = resolveActor(req)
    const keys = ['status','sampleTime','reportingTime']
    const changed = keys.filter(k => (patch as any)[k] != null).map(k => `${k}=${(patch as any)[k]}`).join(', ')
    await LabAuditLog.create({
      actor,
      action: 'Tracking Update',
      label: 'TRACKING_UPDATE',
      method: 'PUT',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Order ${id}${changed ? ' — ' + changed : ''}`,
    })
  } catch {}
  // Include LabOrderTest data in response
  const tests = await LabOrderTest.find({ orderId: id }).lean()
  res.json({ ...doc, tests })
}

export async function remove(req: Request, res: Response){
  const { id } = req.params
  // Remove associated results and order tests first to avoid orphans
  await LabResult.deleteMany({ orderId: id })
  await LabOrderTest.deleteMany({ orderId: id })
  // Corporate: create reversals before deleting the order
  try {
    const existing: any[] = await CorporateTransaction.find({ refType: 'lab_order', refId: String(id), status: { $ne: 'reversed' } }).lean()
    for (const tx of existing){
      try { await CorporateTransaction.findByIdAndUpdate(String(tx._id), { $set: { status: 'reversed' } }) } catch {}
      try {
        await CorporateTransaction.create({
          companyId: tx.companyId,
          patientMrn: tx.patientMrn,
          patientName: tx.patientName,
          serviceType: tx.serviceType,
          refType: tx.refType,
          refId: tx.refId,
          itemRef: tx.itemRef,
          dateIso: getPakistanDate(),
          description: `Reversal: ${tx.description || 'Lab Test'}`,
          qty: tx.qty,
          unitPrice: -Math.abs(Number(tx.unitPrice||0)),
          corpUnitPrice: -Math.abs(Number(tx.corpUnitPrice||0)),
          coPay: -Math.abs(Number(tx.coPay||0)),
          netToCorporate: -Math.abs(Number(tx.netToCorporate||0)),
          corpRuleId: tx.corpRuleId,
          status: 'accrued',
          reversalOf: String(tx._id),
        })
      } catch (e) { console.warn('Failed to create corporate reversal for Lab order (delete)', e) }
    }
  } catch (e) { console.warn('Corporate reversal lookup failed for Lab order delete', e) }
  const doc = await LabOrder.findByIdAndDelete(id)
  if (!doc) return res.status(404).json({ message: 'Order not found' })
  try {
    const actor = resolveActor(req)
    await LabAuditLog.create({
      actor,
      action: 'Delete Sample',
      label: 'DELETE_SAMPLE',
      method: 'DELETE',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Token ${String((doc as any)?.tokenNo || id)} — ${String((doc as any)?.patient?.fullName || '')}`,
    })
  } catch {}
  res.json({ success: true })
}
