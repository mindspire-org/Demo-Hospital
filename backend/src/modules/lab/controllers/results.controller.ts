import { Request, Response } from 'express'
import { LabResult } from '../models/Result'
import { LabToken } from '../models/Token'
import { LabOrder } from '../models/Order'
import { LabOrderTest } from '../models/OrderTest'
import { HospitalReferral } from '../../hospital/models/Referral'
import { resultCreateSchema, resultQuerySchema, resultUpdateSchema } from '../validators/result'

function resolveActor(req: Request) {
  return (req as any).user?.username || (req as any).user?.name || (req as any).user?.email || 'system'
}

export async function list(req: Request, res: Response){
  const parsed = resultQuerySchema.safeParse(req.query)
  const { orderId, from, to, page, limit, reportStatus } = parsed.success ? parsed.data as any : {}
  const filter: any = {}
  if (orderId) filter.orderId = orderId
  if (reportStatus) filter.reportStatus = reportStatus
  if (from || to){
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(from)
    if (to) { const end = new Date(to); end.setHours(23,59,59,999); filter.createdAt.$lte = end }
  }
  const lim = Math.min(500, Number(limit || 20))
  const pg = Math.max(1, Number(page || 1))
  const skip = (pg - 1) * lim
  const [items, total] = await Promise.all([
    LabResult.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    LabResult.countDocuments(filter),
  ])
  const totalPages = Math.max(1, Math.ceil((total || 0) / lim))
  res.json({ items, total, page: pg, totalPages })
}

export async function create(req: Request, res: Response){
  const data = resultCreateSchema.parse(req.body)
  const actor = resolveActor(req)
  const doc = await LabResult.create({ ...data, submittedBy: actor })
  
  // Sync with LabOrderTest and LabOrder for result_entered status
  try {
    const orderId = String(data.orderId || '')
    const orderTestId = data.orderTestId ? String(data.orderTestId) : null
    
    if (orderId) {
      const order: any = await LabOrder.findById(orderId)
      if (!order) return
      
      // Update per-test status
      if (orderTestId) {
        // Precise update if orderTestId is provided
        await LabOrderTest.findByIdAndUpdate(orderTestId, {
          status: 'result_entered',
          resultId: doc._id
        })
      } else {
        // Fallback: update tests by name if multiple results entered at once (legacy)
        const incomingTestNames = (data.rows || []).map((r: any) => String(r.test).toLowerCase())
        const tests = await LabOrderTest.find({ orderId: orderId })
        for (const test of tests) {
          if (incomingTestNames.includes(String(test.testName).toLowerCase())) {
            test.status = 'result_entered'
            test.resultId = doc._id
            await test.save()
          }
        }
      }

      // Sync testStatuses back to LabOrder for UI filtering
      const tests = await LabOrderTest.find({ orderId: orderId })
      order.testStatuses = tests.map(t => ({
        testId: t.testId,
        testName: t.testName,
        status: t.status,
        resultId: t.resultId,
        orderTestId: t._id // Keep track of the link
      }))

      // Move order to result_entered as soon as ANY test result is entered
      const anyResultEntered = tests.some(t => t.status === 'result_entered' || t.status === 'completed')
      if (anyResultEntered && order.status !== 'completed' && order.status !== 'cancelled') {
        order.status = 'result_entered'
      }
      await order.save()

      if (order?.tokenNo) {
        const token = await LabToken.findOne({ tokenNo: order.tokenNo })
        if (token) {
          token.testStatuses = order.testStatuses
          if (token.status === 'sample_received' || token.status === 'converted_to_sample' || token.status === 'in_progress') {
            token.status = 'result_entered'
            token.resultEnteredAt = new Date().toISOString()
            token.resultEnteredBy = actor
          }
          await token.save()
          
          if (token.referralId) {
            await HospitalReferral.findByIdAndUpdate(token.referralId, {
              $set: { reportStatus: 'result_entered' }
            })
          }
        }
      }
    }
  } catch (e) { console.warn('Failed to sync LabToken/Order for result entry', e) }
  
  res.status(201).json(doc)
}

export async function get(req: Request, res: Response){
  const { id } = req.params
  const doc = await LabResult.findById(id).lean()
  if (!doc) return res.status(404).json({ message: 'Result not found' })
  res.json(doc)
}

export async function update(req: Request, res: Response){
  const { id } = req.params
  const patch = resultUpdateSchema.parse(req.body)
  const actor = resolveActor(req)
  
  const doc = await LabResult.findById(id)
  if (!doc) return res.status(404).json({ message: 'Result not found' })

  // Track if this is an edit (result already had data)
  const isEdit = (doc.rows && doc.rows.length > 0) || doc.submittedBy
  
  // Merge rows if provided
  if (patch.rows && patch.rows.length > 0) {
    const existingRows = doc.rows || []
    const newRows = [...existingRows]

    for (const incoming of patch.rows) {
      const idx = newRows.findIndex(r => r.test === incoming.test)
      if (idx !== -1) {
        newRows[idx] = { ...newRows[idx], ...incoming }
      } else {
        newRows.push(incoming as any)
      }
    }
    doc.rows = newRows
    
    // Track edit if this is not a new result
    if (isEdit) {
      doc.editedAt = new Date()
      doc.editedBy = actor
      doc.editCount = (doc.editCount || 0) + 1
    }
  }

  if (patch.interpretation !== undefined) doc.interpretation = patch.interpretation
  if (patch.reportStatus !== undefined) {
    doc.reportStatus = patch.reportStatus
    if (patch.reportStatus === 'approved') {
      doc.approvedBy = patch.approvedBy || actor
      doc.approvedAt = patch.approvedAt || new Date()
    } else if (patch.reportStatus === 'rejected') {
      doc.rejectedAt = new Date()
      doc.rejectedBy = actor
      doc.rejectionReason = patch.rejectionReason || 'Not specified'
    }
  }

  await doc.save()

  // Sync with LabToken for approved/rejected status and update referral reportStatus
  try {
    const orderId = String(doc.orderId || '')
    if (orderId) {
      const order: any = await LabOrder.findById(orderId)
      if (order) {
        // Update per-test status for all tests in this result
        const resultTests = (doc.rows || []).map((r: any) => String(r.test).toLowerCase())
        let anyUpdate = false
        if (order.testStatuses) {
          for (const ts of order.testStatuses) {
            // Match by testId if available, otherwise fall back to parameter name matching
            const isMatch = doc.testId
              ? String(ts.testId) === String(doc.testId)
              : resultTests.includes(String(ts.testName).toLowerCase())
            if (isMatch) {
              if (patch.reportStatus === 'approved') {
                ts.status = 'approved'
                anyUpdate = true
              } else if (patch.reportStatus === 'rejected') {
                ts.status = 'sample_collected' // Back to sample collected so it can be re-entered
                anyUpdate = true
              }
            }
          }
        }
        if (anyUpdate) await order.save()

        // Update LabOrderTest documents for approved/rejected tests
        try {
          const tests = await LabOrderTest.find({ orderId: orderId })
          console.log('[RESULT UPDATE] orderId:', orderId, 'doc.testId:', doc.testId, 'doc.testName:', doc.testName, 'tests count:', tests.length)
          for (const test of tests) {
            // Match by result's testId/testName if available, otherwise fall back to parameter name matching
            const isMatch = doc.testId
              ? String(test.testId) === String(doc.testId)
              : resultTests.includes(String(test.testName).toLowerCase())
            console.log('[RESULT UPDATE] test.testId:', test.testId, 'test.testName:', test.testName, 'isMatch:', isMatch)
            if (isMatch) {
              if (patch.reportStatus === 'approved') {
                console.log('[RESULT UPDATE] Setting test', test.testId, 'to completed')
                test.status = 'completed'
                await test.save()
              } else if (patch.reportStatus === 'rejected') {
                test.status = 'sample_collected'
                await test.save()
              }
            }
          }
        } catch (e) { console.warn('Failed to update LabOrderTest in result update', e) }

        // Sync testStatuses back to LabOrder for UI filtering (AFTER LabOrderTest is updated)
        try {
          const allTests = await LabOrderTest.find({ orderId: orderId })
          order.testStatuses = allTests.map(t => ({
            testId: t.testId,
            testName: t.testName,
            status: t.status,
            resultId: t.resultId
          }))
          await order.save()
        } catch (e) { console.warn('Failed to sync testStatuses to LabOrder in result update', e) }

        if (order?.tokenNo) {
          const token = await LabToken.findOne({ tokenNo: order.tokenNo })
          if (token) {
            token.testStatuses = order.testStatuses

            if (patch.reportStatus === 'approved') {
              // Only move token to approved if all tests are approved
              const allApproved = (token.testStatuses || []).every((ts: any) => ts.status === 'approved' || ts.status === 'completed')
              if (allApproved) {
                token.status = 'approved'
                token.approvedAt = new Date().toISOString()
                token.approvedBy = actor
              }
            } else if (patch.reportStatus === 'rejected') {
              token.status = 'sample_received' // Or keep as result_entered? usually back to received for re-entry
            }
            await token.save()
            
            // Update referral reportStatus
            if (token?.referralId) {
              const newReportStatus = patch.reportStatus === 'approved' ? 'final' : 'result_entered'
              await HospitalReferral.findByIdAndUpdate(token.referralId, {
                $set: { reportStatus: newReportStatus }
              })
            }
          }
        }
      }
    }
  } catch (e) { console.warn('Failed to sync LabToken in result update', e) }
  
  res.json(doc)
}
