import { Request, Response } from 'express'
import { LabResult } from '../models/Result'
import { LabToken } from '../models/Token'
import { LabOrder } from '../models/Order'
import { LabOrderTest } from '../models/OrderTest'
import { LabTest } from '../models/Test'
import { LabCriticalEvent } from '../models/CriticalEvent'
import { LabCriticalParameter } from '../models/CriticalParameter'
import { LabNotification } from '../models/Notification'
import { HospitalReferral } from '../../hospital/models/Referral'
import { resultCreateSchema, resultQuerySchema, resultUpdateSchema } from '../validators/result'
import { validateTotalPercent } from '../utils/totalPercent'
import { pickInterpretation, toNumber, computeFlag } from '../utils/interpretation'
import { logAudit, actorOf } from '../utils/audit'
import { scopeFilter, departmentFilter } from '../middleware/scope'

function resolveActor(req: Request) {
  return (req as any).user?.username || (req as any).user?.name || (req as any).user?.email || 'system'
}

/**
 * Compute flags, auto-interpretation, validation, critical-event candidates
 * for a saved/updated result. Returns the enriched data.
 */
function pickNormalRangeForPatient(male?: string, female?: string, pediatric?: string, patient?: any): string | undefined {
  if (!patient) return male || female || pediatric || undefined
  const ageStr = String(patient.age || '').trim()
  const ageNum = parseInt(ageStr, 10)
  const isPediatric = Number.isFinite(ageNum) && ageNum > 0 && ageNum < 15
  if (isPediatric && pediatric) return pediatric
  const g = String(patient.gender || '').toLowerCase().trim()
  if (g === 'female' || g === 'f') return female || male || pediatric || undefined
  return male || female || pediatric || undefined
}

async function enrichResult(testId: string | undefined, rows: any[], existingTest?: any, patient?: any) {
  let test: any = existingTest
  if (!test && testId) test = await LabTest.findById(testId).lean()

  const validation = validateTotalPercent(test, rows || [])
  let autoInterpretation: string | undefined
  let hasCritical = false
  const criticalCandidates: any[] = []

  if (test?.parameters) {
    for (const r of rows || []) {
      const p = test.parameters.find((x: any) => String(x.name).toLowerCase() === String(r.test).toLowerCase())
      if (!p) continue
      // Only quantitative
      if ((p.kind || 'quantitative') === 'qualitative') {
        if (!r.kind) r.kind = 'qualitative'
        if (r.value && !r.qualitativeValue) r.qualitativeValue = r.value
        continue
      }
      const num = toNumber(r.value ?? r.numericValue)
      if (num !== null) {
        r.numericValue = num
        const flag = computeFlag({
          value: num,
          normalRange: pickNormalRangeForPatient(p.normalRangeMale, p.normalRangeFemale, p.normalRangePediatric, patient),
          criticalMin: p.criticalMin,
          criticalMax: p.criticalMax,
        })
        if (flag) r.flag = flag
        if (flag === 'critical') {
          hasCritical = true
          criticalCandidates.push({
            parameter: p.name,
            value: String(r.value ?? num),
            unit: p.unit || r.unit,
            criticalMin: p.criticalMin,
            criticalMax: p.criticalMax,
          })
        }
        if (p.interpretationRules?.length) {
          const hit = pickInterpretation(p.interpretationRules, num)
          if (hit) {
            const line = `${p.name}: ${hit.label || ''}${hit.text ? ' — ' + hit.text : ''}`
            autoInterpretation = autoInterpretation ? autoInterpretation + '\n' + line : line
          }
        }
      }
    }
  }

  // Fallback: also check global critical-parameter list when test has no thresholds
  try {
    const globals = await LabCriticalParameter.find({ enabled: true }).lean()
    for (const r of rows || []) {
      if (r.flag === 'critical') continue
      const num = toNumber(r.value ?? r.numericValue)
      if (num === null) continue
      const matches = globals.filter(g => String(g.parameter).toLowerCase() === String(r.test).toLowerCase())
      for (const g of matches) {
        if ((g.criticalMin != null && num <= g.criticalMin) || (g.criticalMax != null && num >= g.criticalMax)) {
          r.flag = 'critical'
          hasCritical = true
          criticalCandidates.push({
            parameter: r.test,
            value: String(r.value ?? num),
            unit: r.unit || g.unit,
            criticalMin: g.criticalMin,
            criticalMax: g.criticalMax,
          })
          break
        }
      }
    }
  } catch {}

  return { rows, validation, autoInterpretation, hasCritical, criticalCandidates, test }
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

  // Enrich rows: flags, auto-interpretation, validation, critical detection
  const incomingRows = Array.isArray((data as any).rows) ? (data as any).rows : []
  // Fetch patient from order for gender-aware normal ranges
  let patient: any = undefined
  try {
    if (data.orderId) {
      const order: any = await LabOrder.findById(data.orderId).lean()
      patient = order?.patient
    }
  } catch {}
  const enrich = await enrichResult((data as any).testId, incomingRows, undefined, patient)

  // Block save when total% group is invalid (CBC clerical-mistake rule).
  // Only block if reportStatus !== 'pending' OR caller explicitly asks for strict.
  // For initial drafts (where staff are still entering), still record but mark errors.
  const strict = (req.body as any).strict === true
  if (strict && !enrich.validation.ok) {
    return res.status(400).json({
      code: 'TOTAL_PERCENT_MISMATCH',
      message: 'Differential total is not 100%. Report cannot be submitted — please review entries.',
      validation: enrich.validation,
    })
  }

  const doc = await LabResult.create({
    ...data,
    rows: enrich.rows,
    submittedBy: actor,
    autoInterpretation: enrich.autoInterpretation,
    validation: enrich.validation,
    hasCritical: enrich.hasCritical,
    template: enrich.test?.template || (data as any).template || 'general',
    performedBy: actor,
    performedAt: new Date(),
  })

  // Persist critical events
  try {
    if (enrich.hasCritical && enrich.criticalCandidates.length) {
      let order: any = null
      try { if (data.orderId) order = await LabOrder.findById(data.orderId).lean() } catch {}
      for (const c of enrich.criticalCandidates) {
        const ce = await LabCriticalEvent.create({
          orderId: data.orderId,
          resultId: String(doc._id),
          testId: (data as any).testId,
          testName: (data as any).testName || enrich.test?.name,
          parameter: c.parameter,
          value: c.value,
          unit: c.unit,
          criticalMin: c.criticalMin,
          criticalMax: c.criticalMax,
          patientId: order?.patientId,
          patientName: order?.patient?.fullName,
          patientPhone: order?.patient?.phone,
          collectionCenterId: order?.collectionCenterId,
          detectedAt: new Date().toISOString(),
          detectedBy: actor,
          status: 'open',
          log: [{ at: new Date().toISOString(), by: actor, action: 'detected' }],
        })
        await LabNotification.create({
          scope: 'main',
          kind: 'critical',
          title: `Critical: ${c.parameter} = ${c.value}`,
          body: `Patient ${order?.patient?.fullName || ''} (${(data as any).testName || ''})`,
          meta: { eventId: ce._id, orderId: data.orderId },
        })
      }
    }
  } catch (e) { console.warn('Failed to record critical events', e) }
  await logAudit(req, { action: 'result.create', entity: 'result', entityId: String(doc._id), label: (data as any).testName, after: { rows: enrich.rows.length, hasCritical: enrich.hasCritical } })
  
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

  // Update interpretation only if it's explicitly provided in the patch
  if (patch.interpretation !== undefined) {
    doc.interpretation = patch.interpretation
  }

  // Re-enrich on every update so flags + validation stay current
  try {
    // Fetch patient from order for gender-aware normal ranges
    let patient: any = undefined
    try {
      if (doc.orderId) {
        const order: any = await LabOrder.findById(doc.orderId).lean()
        patient = order?.patient
      }
    } catch {}
    const enrich = await enrichResult((doc as any).testId, doc.rows as any[], undefined, patient)
    doc.rows = enrich.rows as any
    ;(doc as any).validation = enrich.validation
    ;(doc as any).autoInterpretation = enrich.autoInterpretation
    ;(doc as any).hasCritical = enrich.hasCritical
    // Block approval when total% invalid
    if (patch.reportStatus === 'approved' && !enrich.validation.ok) {
      return res.status(400).json({
        code: 'TOTAL_PERCENT_MISMATCH',
        message: 'Differential total is not 100%. Approval blocked — please review entries.',
        validation: enrich.validation,
      })
    }
    // Trigger critical events for any new critical rows that weren't already recorded
    if (enrich.hasCritical && enrich.criticalCandidates.length) {
      try {
        let order: any = null
        try { if (doc.orderId) order = await LabOrder.findById(doc.orderId).lean() } catch {}
        for (const c of enrich.criticalCandidates) {
          const dupe = await LabCriticalEvent.findOne({
            resultId: String(doc._id),
            parameter: c.parameter,
            value: c.value,
          }).lean()
          if (dupe) continue
          const ce = await LabCriticalEvent.create({
            orderId: doc.orderId,
            resultId: String(doc._id),
            testId: (doc as any).testId,
            testName: (doc as any).testName,
            parameter: c.parameter,
            value: c.value,
            unit: c.unit,
            criticalMin: c.criticalMin,
            criticalMax: c.criticalMax,
            patientId: order?.patientId,
            patientName: order?.patient?.fullName,
            patientPhone: order?.patient?.phone,
            collectionCenterId: order?.collectionCenterId,
            detectedAt: new Date().toISOString(),
            detectedBy: actor,
            status: 'open',
            log: [{ at: new Date().toISOString(), by: actor, action: 'detected' }],
          })
          await LabNotification.create({
            scope: 'main',
            kind: 'critical',
            title: `Critical: ${c.parameter} = ${c.value}`,
            body: `Patient ${order?.patient?.fullName || ''}`,
            meta: { eventId: ce._id, orderId: doc.orderId },
          })
        }
      } catch (e) { console.warn('Critical re-detect failed', e) }
    }
  } catch (e) { console.warn('enrichResult failed in update', e) }

  if (patch.reportStatus !== undefined) {
    doc.reportStatus = patch.reportStatus
    if (patch.reportStatus === 'approved') {
      doc.approvedBy = patch.approvedBy || actor
      doc.approvedAt = patch.approvedAt || new Date()
      // Notify center on approval
      try {
        const order: any = doc.orderId ? await LabOrder.findById(doc.orderId).lean() : null
        if (order?.collectionCenterId) {
          await LabNotification.create({
            scope: 'center',
            centerId: order.collectionCenterId,
            kind: 'result_approved',
            title: 'Report approved',
            body: `${(doc as any).testName || 'Test'} for ${order?.patient?.fullName || ''}`,
            meta: { resultId: doc._id, orderId: order._id },
          })
        }
      } catch {}
    } else if (patch.reportStatus === 'rejected') {
      doc.rejectedAt = new Date()
      doc.rejectedBy = actor
      doc.rejectionReason = patch.rejectionReason || 'Not specified'
    }
  }

  await doc.save()
  await logAudit(req, { action: 'result.update', entity: 'result', entityId: id, label: (doc as any).testName, after: { rows: doc.rows.length, status: doc.reportStatus } })

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

// === Extended endpoints ===

/**
 * GET /lab/results/history?patientId=&testId=
 * Returns prior parameter values for a given patient + test, useful for the
 * "Test history" panel during result entry (image 14).
 */
export async function history(req: Request, res: Response) {
  const { patientId, testId, testName } = req.query as any
  if (!patientId) return res.status(400).json({ message: 'patientId required' })
  // Find orders for this patient
  const orders = await LabOrder.find({ patientId }).select('_id createdAt').limit(50).lean()
  const orderIds = orders.map(o => String(o._id))
  const filter: any = { orderId: { $in: orderIds } }
  if (testId) filter.testId = testId
  if (!testId && testName) filter.testName = testName
  const results = await LabResult.find(filter)
    .select('orderId testId testName rows performedAt createdAt')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()
  const flat: any[] = []
  for (const r of results) {
    const at = r.performedAt || r.createdAt
    for (const row of r.rows || []) {
      flat.push({
        at,
        testName: r.testName,
        parameter: row.test,
        value: row.value,
        unit: row.unit,
        flag: row.flag,
      })
    }
  }
  res.json({ items: flat })
}

/**
 * POST /lab/results/:id/repeat
 * Snapshots current rows, clears values, records reason. Result becomes
 * pending again. Counts as a repeat for inventory/usage.
 */
export async function repeatSample(req: Request, res: Response) {
  const { actor } = actorOf(req)
  const { reason } = req.body || {}
  if (!reason) return res.status(400).json({ message: 'reason is required' })
  const doc: any = await LabResult.findById(req.params.id)
  if (!doc) return res.status(404).json({ message: 'Not found' })

  const snapshot = {
    rows: doc.rows,
    interpretation: doc.interpretation,
    autoInterpretation: doc.autoInterpretation,
    reportStatus: doc.reportStatus,
    approvedAt: doc.approvedAt,
    approvedBy: doc.approvedBy,
  }
  doc.repeatHistory = doc.repeatHistory || []
  doc.repeatHistory.push({
    at: new Date().toISOString(),
    by: actor,
    reason,
    snapshot,
    consumablesDeducted: false,
  })

  // Clear current values, mark pending
  doc.rows = (doc.rows || []).map((r: any) => ({ ...r, value: '', numericValue: undefined, qualitativeValue: '', flag: undefined }))
  doc.interpretation = ''
  doc.autoInterpretation = ''
  doc.reportStatus = 'pending'
  doc.approvedAt = undefined
  doc.approvedBy = undefined
  doc.editedAt = new Date()
  doc.editedBy = actor
  doc.editCount = (doc.editCount || 0) + 1
  doc.hasCritical = false
  await doc.save()

  // Move related token/order back so it shows up in the pending-perform list
  try {
    if (doc.orderId) {
      const order: any = await LabOrder.findById(doc.orderId)
      if (order && order.status !== 'cancelled') {
        order.status = 'in_progress'
        if (order.testStatuses) {
          for (const ts of order.testStatuses) {
            if (String(ts.resultId) === String(doc._id)) ts.status = 'sample_collected'
          }
        }
        await order.save()
        if (order.tokenNo) {
          const token: any = await LabToken.findOne({ tokenNo: order.tokenNo })
          if (token) {
            token.status = 'sample_received'
            token.testStatuses = order.testStatuses
            await token.save()
          }
        }
      }
    }
  } catch (e) { console.warn('Repeat sample sync failed', e) }

  await logAudit(req, {
    action: 'result.repeat',
    entity: 'result',
    entityId: req.params.id,
    label: doc.testName,
    detail: reason,
    before: snapshot,
  })

  // Notify
  try {
    await LabNotification.create({
      scope: 'main',
      kind: 'repeat_sample',
      title: 'Repeat sample requested',
      body: `${doc.testName || 'Test'} — reason: ${reason}`,
      meta: { resultId: doc._id, orderId: doc.orderId },
    })
  } catch {}

  res.json(doc)
}

/**
 * GET /lab/results/instances
 * Test Result List backing endpoint. Aggregates LabOrderTest rows with their
 * latest result + scope filtering.
 */
export async function listInstances(req: Request, res: Response) {
  const { status, sampleType, q, from, to, limit = '200' } = req.query as any
  const filter: any = { ...scopeFilter(req, 'collectionCenterId'), ...departmentFilter(req, 'departmentId') }
  if (status) filter.status = status
  if (sampleType) filter.sampleType = sampleType
  if (q) filter.testName = new RegExp(String(q), 'i')
  if (from || to) {
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(String(from))
    if (to) { const end = new Date(String(to)); end.setHours(23,59,59,999); filter.createdAt.$lte = end }
  }
  const items = await LabOrderTest.find(filter).sort({ createdAt: -1 }).limit(Math.min(2000, Number(limit) || 200)).lean()
  // Enrich with patient + token info
  const orderIds = Array.from(new Set(items.map((t: any) => String(t.orderId))))
  const orders = await LabOrder.find({ _id: { $in: orderIds } }).select('tokenNo patient labNumber sampleType collectionCenterId departmentId').lean()
  const map = new Map<string, any>(orders.map((o: any) => [String(o._id), o]))
  const enriched = items.map((t: any) => ({ ...t, _order: map.get(String(t.orderId)) }))
  res.json({ items: enriched, total: enriched.length })
}

