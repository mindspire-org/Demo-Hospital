import { Request, Response } from 'express'
import { LabReturn } from '../models/Return'
import { labReturnCreateSchema, labReturnQuerySchema, labReturnUndoSchema } from '../validators/return'
import { LabPurchase } from '../models/Purchase'
import { LabInventoryItem } from '../models/InventoryItem'
import mongoose from 'mongoose'
import { ApiError } from '../../../common/errors/ApiError'
import { LabAuditLog } from '../models/AuditLog'
import { LabOrder } from '../models/Order'
import { LabOrderTest } from '../models/OrderTest'
import { LabToken } from '../models/Token'
import { LabTest } from '../models/Test'
import { LabPayment } from '../models/Payment'

function resolveActor(req: Request) {
  return (req as any).user?.username || (req as any).user?.name || (req as any).user?.email || 'system'
}

export async function list(req: Request, res: Response){
  const parsed = labReturnQuerySchema.safeParse(req.query)
  const { type, from, to, party, reference, search, page, limit } = parsed.success ? parsed.data as any : {}
  const filter: any = {}
  if (type) filter.type = type
  if (party) filter.party = new RegExp(party, 'i')
  if (reference) filter.reference = new RegExp(reference, 'i')
  if (search) {
    const rx = new RegExp(search, 'i')
    filter.$or = [ { party: rx }, { reference: rx } ]
  }
  if (from || to) {
    filter.datetime = {}
    if (from) filter.datetime.$gte = new Date(from).toISOString()
    if (to) { const end = new Date(to); end.setHours(23,59,59,999); filter.datetime.$lte = end.toISOString() }
  }
  const effectiveLimit = Number(limit || 10)
  const currentPage = Math.max(1, Number(page || 1))
  const skip = (currentPage - 1) * effectiveLimit
  const total = await LabReturn.countDocuments(filter)
  const items = await LabReturn.find(filter).sort({ datetime: -1 }).skip(skip).limit(effectiveLimit).lean()
  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit))
  res.json({ items, total, page: currentPage, totalPages })
}

export async function create(req: Request, res: Response){
  const data = labReturnCreateSchema.parse(req.body)

  if (data.type === 'Customer'){
    // Find order by tokenNo reference or by id
    let order: any = await LabOrder.findOne({ tokenNo: data.reference })
    if (!order && mongoose.isValidObjectId(data.reference)) order = await LabOrder.findById(data.reference)
    if (!order) throw new ApiError(404, 'Order not found for reference')
    const wasReturned = String(order.status) === 'cancelled'

    // Get all tests from LabOrderTest collection (source of truth)
    const orderTests = await LabOrderTest.find({ orderId: order._id }).lean()
    const tests = orderTests || []
    
    const nameMap = new Map<string, string>(tests.map((t: any) => [String(t.testId), String(t.testName || '')]))
    const priceMap = new Map<string, number>(tests.map((t: any) => [String(t.testId), Number(t.price || 0)]))

    const selTid = (data as any).testId ? String((data as any).testId) : undefined
    let computedReturnLines: { itemId?: string; name: string; qty: number; amount: number }[] = []
    let totalReturnAmount = 0
    const actor = resolveActor(req)

    if (selTid && tests.some((t: any) => String(t.testId) === selTid)) {
      // Per-test return
      const testToReturn = tests.find((t: any) => String(t.testId) === selTid)
      if (testToReturn && !testToReturn.isReturned) {
        totalReturnAmount = Number(testToReturn.price || 0)
        computedReturnLines = [{
          itemId: String(selTid),
          name: testToReturn.testName || String(selTid),
          qty: 1,
          amount: totalReturnAmount
        }]
        // Update LabOrderTest status
        await LabOrderTest.findByIdAndUpdate(testToReturn._id, {
          isReturned: true,
          status: 'returned',
          returnedAt: new Date(),
          returnReason: (data as any).note || ''
        })
      }
    } else {
      // Fallback: whole-order return (all tests that aren't already returned)
      const toReturn = tests.filter((t: any) => !t.isReturned)
      
      for (const t of toReturn) {
        totalReturnAmount += Number(t.price || 0)
        computedReturnLines.push({
          itemId: String(t.testId),
          name: t.testName || String(t.testId),
          qty: 1,
          amount: Number(t.price || 0)
        })
        // Update LabOrderTest status
        await LabOrderTest.findByIdAndUpdate(t._id, {
          isReturned: true,
          status: 'returned',
          returnedAt: new Date(),
          returnReason: (data as any).note || ''
        })
      }
    }

    // Check if all tests are returned to update order status
    const remainingTests = await LabOrderTest.countDocuments({ orderId: order._id, isReturned: false })
    if (remainingTests === 0) {
      order.status = 'cancelled'
      await order.save()
    }

    // Calculate current financials from LabOrderTest and LabPayment
    const activeTests = await LabOrderTest.find({ orderId: order._id, isReturned: false }).lean()
    const newTotal = activeTests.reduce((sum, t) => sum + (t.price || 0), 0)
    
    const payments = await LabPayment.find({ orderId: order._id }).lean()
    const totalPaid = payments.reduce((sum, p) => {
      if (p.type === 'payment') return sum + p.amount
      if (p.type === 'refund') return sum - p.amount
      return sum
    }, 0)

    // Record refund if totalPaid > newTotal
    if (totalPaid > newTotal) {
      const refundAmount = totalPaid - newTotal
      await LabPayment.create({
        tokenId: order.tokenId,
        orderId: order._id,
        patientId: order.patientId,
        type: 'refund',
        amount: refundAmount,
        method: 'cash',
        note: `Refund for returned test: ${selTid || 'All'}`,
        createdBy: actor
      })
    } else if (totalReturnAmount > 0) {
      // Just an adjustment
      await LabPayment.create({
        tokenId: order.tokenId,
        orderId: order._id,
        patientId: order.patientId,
        type: 'adjustment',
        amount: -totalReturnAmount, // Negative to indicate reduction
        note: `Balance adjustment for returned test: ${selTid || 'All'}`,
        createdBy: actor
      })
    }

    // Sync with LabToken if exists
    try {
      if (order.tokenNo) {
        const token = await LabToken.findOne({ tokenNo: order.tokenNo })
        if (token) {
          token.subtotal = newTotal
          token.net = newTotal
          token.receivedAmount = Math.min(totalPaid, newTotal)
          token.receivableAmount = Math.max(0, newTotal - totalPaid)
          if (remainingTests === 0) token.status = 'cancelled'
          await token.save()
        }
      }
    } catch (e) { console.warn('Failed to sync LabToken on return', e) }

    // Inventory: on whole-order returned transition, restore consumables once
    try {
      if (remainingTests === 0 && !wasReturned){
        const cons: any[] = Array.isArray((order as any)?.consumables) ? (order as any).consumables : []
        await Promise.all(cons.map(async (c: any) => {
          const key = String(c.item || '').trim().toLowerCase()
          const qty = Math.max(0, Number(c.qty || 0))
          if (!key || qty <= 0) return
          const it = await LabInventoryItem.findOne({ key })
          if (!it) return
          const cur = Math.max(0, Number((it as any).onHand || 0))
          ;(it as any).onHand = cur + qty
          await it.save()
        }))
      }
    } catch {}

    // Create return record
    const items = computedReturnLines.reduce((s: number, l: { qty: number }) => s + (Number(l.qty) || 0), 0)
    const total = totalReturnAmount
    const token = String(order.tokenNo || data.reference || '')
    const party = String(order?.patient?.fullName || data.party || '')
    const doc = await LabReturn.create({
      type: 'Customer',
      datetime: data.datetime,
      reference: token,
      party,
      note: (data as any).note || '',
      items,
      total,
      lines: computedReturnLines,
    })
    try {
      const actor = (req as any).user?.name || (req as any).user?.email || 'system'
      await LabAuditLog.create({
        actor,
        action: 'Customer Return',
        label: 'RETURN_CUSTOMER',
        method: 'POST',
        path: req.originalUrl,
        at: new Date().toISOString(),
        detail: `Token ${token} — ${party}`,
      })
    } catch {}
    return res.status(201).json({ ok: true, order: { id: order._id, status: order.status }, return: doc })
  }

  if (data.type === 'Supplier'){
    // Find the purchase by invoice number (reference)
    const purchase: any = await LabPurchase.findOne({ invoice: data.reference })
    if (!purchase) throw new ApiError(404, 'Purchase not found for invoice')

    // Build quick lookup by id/name
    const lineByName = new Map<string, any>()
    const lineById = new Map<string, any>()
    for (const l of (purchase?.lines || [])){
      if (l.name) lineByName.set(String(l.name).trim().toLowerCase(), l)
      if ((l as any).itemId) lineById.set(String((l as any).itemId), l)
    }

    const computedReturnLines: { itemId?:string; name:string; qty:number; amount:number }[] = []
    for (const r of data.lines){
      const id = String((r as any).itemId || '').trim()
      const name = String(r.name || '').trim()
      const key = name.toLowerCase()
      const pLine = (id && lineById.get(id)) || lineByName.get(key)
      if (!pLine) throw new ApiError(400, `Item not found in purchase: ${name || id}`)
      const qtyToReturn = Number(r.qty || 0)
      if (qtyToReturn <= 0) continue
      const current = Number(pLine.totalItems || 0)
      if (qtyToReturn > current) throw new ApiError(400, `Return qty exceeds purchased qty for ${pLine.name}`)
      // Decrease purchase quantities
      pLine.totalItems = current - qtyToReturn
      const unitsPerPack = Number(pLine.unitsPerPack || 1)
      if (unitsPerPack > 0) pLine.packs = Math.floor(Number(pLine.totalItems || 0) / unitsPerPack)
      // Compute amount using after-tax unit if available
      const unitCost = Number(pLine.buyPerUnitAfterTax || pLine.buyPerUnit || (pLine.unitsPerPack && pLine.buyPerPack ? (pLine.buyPerPack / pLine.unitsPerPack) : 0) || 0)
      const lineAmount = unitCost * qtyToReturn
      computedReturnLines.push({ itemId: id || String((pLine as any).itemId || ''), name: pLine.name, qty: qtyToReturn, amount: Number(lineAmount.toFixed(2)) })
    }

    // Remove zero-items lines
    purchase.lines = (purchase.lines || []).filter((l: any) => Number(l.totalItems || 0) > 0)
    // Recompute purchase total from per-unit after-tax * items
    const newTotal = (purchase.lines || []).reduce((s: number, l: any) => {
      const unitCost = Number(l.buyPerUnitAfterTax || l.buyPerUnit || (l.unitsPerPack && l.buyPerPack ? (l.buyPerPack / l.unitsPerPack) : 0) || 0)
      return s + unitCost * Number(l.totalItems || 0)
    }, 0)
    purchase.totalAmount = Number(newTotal.toFixed(2))
    await purchase.save()

    // Decrease inventory onHand for returned items
    for (const r of data.lines){
      try {
        const id = String((r as any).itemId || '').trim()
        const name = String(r.name || '').trim()
        let item: any = null
        if (id && mongoose.isValidObjectId(id)) item = await LabInventoryItem.findById(id)
        if (!item && name) item = await LabInventoryItem.findOne({ key: name.toLowerCase() })
        if (!item && id) item = await LabInventoryItem.findOne({ lastItemId: id })
        if (!item) continue
        const dec = Number(r.qty || 0)
        item.onHand = Math.max(0, Number(item.onHand || 0) - dec)
        await item.save()
      } catch {}
    }

    // Create return record
    const items = computedReturnLines.reduce((s: number, l: { qty: number }) => s + (Number(l.qty) || 0), 0)
    const total = computedReturnLines.reduce((s: number, l: { amount: number }) => s + (Number(l.amount) || 0), 0)
    const doc = await LabReturn.create({
      type: 'Supplier',
      datetime: data.datetime,
      reference: purchase.invoice,
      party: String(purchase.supplierName || ''),
      note: (data as any).note || '',
      items,
      total: Number(total.toFixed(2)),
      lines: computedReturnLines,
    })
    try {
      const actor = (req as any).user?.name || (req as any).user?.email || 'system'
      await LabAuditLog.create({
        actor,
        action: 'Supplier Return',
        label: 'RETURN_SUPPLIER',
        method: 'POST',
        path: req.originalUrl,
        at: new Date().toISOString(),
        detail: `Invoice ${purchase.invoice} — ${doc.party} — Rs ${Number(doc.total||0).toFixed(2)}`,
      })
    } catch {}
    return res.status(201).json({ ok: true, purchase: { invoice: purchase.invoice, totalAmount: purchase.totalAmount }, return: doc })
  }

  // Default behavior: just persist as-is
  const items = (data.lines || []).reduce((s, l) => s + (l.qty || 0), 0)
  const total = (data.lines || []).reduce((s, l) => s + (l.amount || 0), 0)
  const doc = await LabReturn.create({
    type: data.type,
    datetime: data.datetime,
    reference: data.reference,
    party: data.party,
    note: (data as any).note || '',
    items,
    total,
    lines: data.lines,
  })
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await LabAuditLog.create({
      actor,
      action: `${data.type} Return`,
      label: `RETURN_${String(data.type||'').toUpperCase()}`,
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${data.reference || ''} — ${data.party || ''} — Rs ${Number(total||0).toFixed(2)}`,
    })
  } catch {}
  return res.status(201).json(doc)
}

export async function undo(req: Request, res: Response){
  const body = labReturnUndoSchema.parse(req.body)
  // Find order by tokenNo reference or id
  let order: any = await LabOrder.findOne({ tokenNo: body.reference })
  if (!order && mongoose.isValidObjectId(body.reference)) order = await LabOrder.findById(body.reference)
  if (!order) throw new ApiError(404, 'Order not found for reference')
  const wasAllReturned = String(order.status) === 'cancelled'
  
  const actor = resolveActor(req)
  
  // Resolve target test id
  let tid = String((body as any).testId || '').trim()
  
  // Find the LabOrderTest document
  const orderTestQuery = tid 
    ? { orderId: order._id, testId: tid }
    : { orderId: order._id, testName: (body as any).testName }
  let orderTest: any = await LabOrderTest.findOne(orderTestQuery)
  
  if (!orderTest) throw new ApiError(400, 'Test not found in order for undo')
  if (!orderTest.isReturned) {
    return res.status(200).json({ ok: true, orderTest: { id: orderTest._id, isReturned: false } })
  }

  // Restore the test
  const restoreAmount = Number(orderTest.price || 0)
  await LabOrderTest.findByIdAndUpdate(orderTest._id, {
    isReturned: false,
    status: 'pending',
    returnedAt: undefined,
    returnReason: undefined
  })

  // Record adjustment in ledger (positive to add back)
  await LabPayment.create({
    tokenId: order.tokenId,
    orderId: order._id,
    patientId: order.patientId,
    type: 'adjustment',
    amount: restoreAmount,
    note: `Undo return adjustment for test: ${orderTest.testName}`,
    createdBy: actor
  })

  // Recalculate and sync token
  const activeTests = await LabOrderTest.find({ orderId: order._id, isReturned: false }).lean()
  const newTotal = activeTests.reduce((sum, t) => sum + (t.price || 0), 0)
  
  const payments = await LabPayment.find({ orderId: order._id }).lean()
  const totalPaid = payments.reduce((sum, p) => {
    if (p.type === 'payment') return sum + p.amount
    if (p.type === 'refund') return sum - p.amount
    return sum
  }, 0)

  // Update order status if transitioning from cancelled
  if (wasAllReturned) {
    order.status = 'received'
    await order.save()
  }

  // Sync with LabToken if exists
  try {
    if (order.tokenNo) {
      const token = await LabToken.findOne({ tokenNo: order.tokenNo })
      if (token) {
        token.subtotal = newTotal
        token.net = newTotal
        token.receivedAmount = Math.min(totalPaid, newTotal)
        token.receivableAmount = Math.max(0, newTotal - totalPaid)
        if (token.status === 'cancelled') {
          token.status = 'converted_to_sample'
        }
        await token.save()
      }
    }
  } catch (e) { console.warn('Failed to sync LabToken on undo return', e) }


  // Inventory: if transitioning from all-returned -> some active, re-deduct previously restored consumables
  try {
    if (wasAllReturned && order.status !== 'cancelled'){
      const cons: any[] = Array.isArray((order as any)?.consumables) ? (order as any).consumables : []
      await Promise.all(cons.map(async (c: any) => {
        const key = String(c.item || '').trim().toLowerCase()
        const qty = Math.max(0, Number(c.qty || 0))
        if (!key || qty <= 0) return
        const it = await LabInventoryItem.findOne({ key })
        if (!it) return
        const cur = Math.max(0, Number((it as any).onHand || 0))
        ;(it as any).onHand = Math.max(0, cur - qty)
        await it.save()
      }))
    }
  } catch {}

  // Remove matching line from the latest customer return doc for this token
  try {
    const token = String(order.tokenNo || body.reference)
    const testName = orderTest?.testName || ''
    let doc: any = await LabReturn.findOne({ type: 'Customer', reference: token, 'lines.itemId': tid }).sort({ createdAt: -1 })
    if (!doc && testName){
      doc = await LabReturn.findOne({ type: 'Customer', reference: token, 'lines.name': testName }).sort({ createdAt: -1 })
    }
    if (doc){
      const origLines = Array.isArray(doc.lines) ? doc.lines : []
      const filtered = origLines.filter((l: any) => String(l.itemId || '') !== String(tid) && String(l.name || '') !== String(testName))
      if (filtered.length === 0){
        await doc.deleteOne()
      } else {
        doc.lines = filtered
        doc.items = filtered.reduce((s: number, l: any) => s + Number(l.qty || 0), 0)
        doc.total = filtered.reduce((s: number, l: any) => s + Number(l.amount || 0), 0)
        await doc.save()
      }
    }
  } catch {}

  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await LabAuditLog.create({
      actor,
      action: 'Undo Return',
      label: 'RETURN_UNDO',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Token ${String(order.tokenNo || body.reference)} — Test ${tid}${body.note ? ` — ${body.note}` : ''}`,
    })
  } catch {}

  return res.json({ ok: true, order: { id: order._id, status: order.status }, orderTest: { id: orderTest._id, testId: orderTest.testId, isReturned: false } })
}
