import { Request, Response } from 'express'
import { DiagnosticToken } from '../models/Token'
import { DiagnosticOrder } from '../models/Order'
import { DiagnosticTest } from '../models/Test'
import { DiagnosticCounter } from '../models/Counter'
import { DiagnosticAuditLog } from '../models/AuditLog'
import jwt from 'jsonwebtoken'
import { env } from '../../../config/env'
import { resolveTestPrice } from '../../corporate/utils/price'
import { CorporateTransaction } from '../../corporate/models/Transaction'
import { CorporateCompany } from '../../corporate/models/Company'
import { LabPatient } from '../../lab/models/Patient'
import { postFbrInvoiceViaSDC } from '../../hospital/services/fbr'
import { postDiagnosticOrderJournal } from '../../finance/controllers/finance_ledger'
import { diagnosticTokenCreateSchema, diagnosticTokenQuerySchema } from '../validators/token'

function getActor(req: Request) {
  try {
    const auth = String(req.headers['authorization'] || '')
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!token) return {}
    const payload: any = jwt.verify(token, env.JWT_SECRET)
    return { actorId: String(payload?.sub || ''), actorUsername: String(payload?.username || '') }
  } catch { return {} }
}

function getDatePartsInTimeZone(d: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d)
  const year = parts.find(p => p.type === 'year')?.value || String(d.getFullYear())
  const month = parts.find(p => p.type === 'month')?.value || String(d.getMonth() + 1).padStart(2, '0')
  const day = parts.find(p => p.type === 'day')?.value || String(d.getDate()).padStart(2, '0')
  return { year, month, day }
}

async function nextToken(date?: Date) {
  const d = date || new Date()
  const tz = String((env as any).DIAGNOSTIC_TOKEN_TZ || 'Asia/Karachi')
  const { year: y, month: m, day } = getDatePartsInTimeZone(d, tz)
  const key = `diagnostic_token_${y}${m}${day}`
  let c: any = await (DiagnosticCounter as any).findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  if (c && Number(c.seq) === 1) {
    try {
      const start = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d) + 'T00:00:00')
      const end = new Date(start); end.setDate(start.getDate() + 1); end.setMilliseconds(end.getMilliseconds() - 1)
      const docs: any[] = await DiagnosticToken.find({ createdAt: { $gte: start, $lte: end }, tokenNo: { $regex: /^\d+$/ } }).select('tokenNo').lean()
      const maxSeq = (docs || []).reduce((mx: number, o: any) => {
        const n = parseInt(String(o?.tokenNo || ''), 10)
        return isNaN(n) ? mx : Math.max(mx, n)
      }, 0)
      if (maxSeq > 0) {
        c = await (DiagnosticCounter as any).findOneAndUpdate({ _id: key, seq: 1 }, { $set: { seq: maxSeq + 1 } }, { new: true }) || c
      }
    } catch { }
  }
  return String(c?.seq || 1)
}

export async function list(req: Request, res: Response) {
  const parsed = diagnosticTokenQuerySchema.safeParse(req.query)
  const { q, status, from, to, page, limit } = parsed.success ? parsed.data as any : {}
  const filter: any = {}

  if (q) {
    const rx = new RegExp(String(q), 'i')
    filter.$or = [{ 'patient.fullName': rx }, { 'patient.phone': rx }, { tokenNo: rx }, { 'patient.mrn': rx }]
  }

  if (status) filter.status = status

  if (from || to) {
    filter.createdAt = {}
    if (from) {
      const pakFrom = new Date(from + 'T00:00:00')
      const utcFrom = new Date(pakFrom.getTime() - (5 * 60 * 60 * 1000))
      filter.createdAt.$gte = utcFrom
    }
    if (to) {
      const pakTo = new Date(to + 'T23:59:59.999')
      const utcTo = new Date(pakTo.getTime() - (5 * 60 * 60 * 1000))
      filter.createdAt.$lte = utcTo
    }
  }

  const lim = Math.min(500, Number(limit || 20))
  const pg = Math.max(1, Number(page || 1))
  const skip = (pg - 1) * lim

  const [items, total] = await Promise.all([
    DiagnosticToken.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    DiagnosticToken.countDocuments(filter),
  ])

  const totalPages = Math.max(1, Math.ceil((total || 0) / lim))
  res.json({ items, total, page: pg, totalPages })
}

export async function create(req: Request, res: Response) {
  const data = diagnosticTokenCreateSchema.parse(req.body)
  const isCorporate = Boolean((data as any).corporateId)
  const coPayPct = Math.max(0, Math.min(100, Number((data as any)?.corporateCoPayPercent || 0)))

  if ((data as any).corporateId) {
    const comp = await CorporateCompany.findById(String((data as any).corporateId)).lean()
    if (!comp) return res.status(400).json({ error: 'Invalid corporateId' })
    if ((comp as any).active === false) return res.status(400).json({ error: 'Corporate company inactive' })
  }

  const tokenNo = (data as any).tokenNo || await nextToken(new Date())

  // Always sync snapshot MRN from shared patient table (Lab_Patient)
  try {
    const pid = String((data as any)?.patientId || '').trim()
    if (pid) {
      const pat: any = await LabPatient.findById(pid).select('mrn').lean()
      if (pat?.mrn) {
        ; (data as any).patient = { ...(data as any).patient, mrn: String(pat.mrn) }
      }
    }
  } catch { }

  let corpCoPayIncome = 0
  if (isCorporate && coPayPct > 0) {
    try {
      const ids = Array.isArray((data as any).tests) ? (data as any).tests : []
      const docs = await DiagnosticTest.find({ _id: { $in: ids } }).select('price').lean()
      const sum = (docs || []).reduce((s: number, t: any) => s + Math.max(0, Number(t?.price || 0)), 0)
      corpCoPayIncome = Math.max(0, sum * (coPayPct / 100))
    } catch { }
  }

  let received = 0, receivable = 0
  if (isCorporate) {
    const inputReceived = Math.max(0, Number((data as any).receivedAmount || 0))
    received = Math.min(corpCoPayIncome, inputReceived)
    receivable = 0
  } else {
    const net = Math.max(0, Number((data as any).net || (data as any).subtotal || 0) - Number((data as any).discount || 0))
    const inputReceived = Math.max(0, Number((data as any).receivedAmount || 0))
    received = Math.min(net, inputReceived)
    receivable = Math.max(0, net - received)
  }

  const actor = getActor(req) as any
  const performedBy = String(
    actor?.actorUsername ||
    (req as any).user?.username ||
    (req as any).user?.name ||
    (req as any).user?.email ||
    ''
  ).trim().toLowerCase() || undefined

  if (!performedBy) return res.status(401).json({ error: 'Unauthorized' })

  const resolvedTests = await DiagnosticTest.find({ _id: { $in: data.tests } }).lean()
  const testsToSave = data.tests.map(tid => {
    const t: any = resolvedTests.find((x: any) => String(x._id) === String(tid))
    return { testId: tid, testName: t?.name || 'Unknown', price: t?.price || 0 }
  })

  let payments = []
  if (received > 0) {
    payments.push({
      amount: received,
      at: new Date().toISOString(),
      note: 'Initial Payment',
      method: (data as any).paymentMethod || 'Cash',
      receivedBy: performedBy
    })
  }

  const doc: any = await DiagnosticToken.create({
    ...data,
    tests: testsToSave,
    tokenNo,
    generatedAt: new Date().toISOString(),
    generatedBy: performedBy,
    portal: req.body.portal || 'diagnostic',
    status: 'token_generated',
    receivedAmount: received,
    receivableAmount: receivable,
    payments,
    paymentMethod: (data as any).paymentMethod,
    ...(isCorporate
      ? {
        subtotal: 0,
        discount: 0,
        net: corpCoPayIncome,
      }
      : {}),
  })

  // FBR fiscalization
  try {
    if (isCorporate) throw new Error('skip_fbr_for_corporate')
    const payload = {
      tokenNo,
      patient: (data as any).patient || undefined,
      patientName: (data as any)?.patient?.fullName || undefined,
      phone: (data as any)?.patient?.phone || undefined,
      cnic: (data as any)?.patient?.cnic || undefined,
      lines: resolvedTests.map((t: any) => ({ name: t?.name || 'Test', qty: 1, unitPrice: Number(t?.price || 0) })),
      subtotal: Number((data as any).subtotal || (data as any).total || 0),
      discount: Number((data as any).discount || 0),
      net: Number((data as any).net || (data as any).total || 0),
    }
    const amount = Number((payload as any).net || (payload as any).subtotal || 0)
    const r: any = await postFbrInvoiceViaSDC({ module: 'DIAGNOSTIC_TOKEN_CREATE', invoiceType: 'DIAGNOSTIC' as any, refId: String(doc._id), amount, payload })
    if (r) {
      ; (doc as any).fbrInvoiceNo = r.fbrInvoiceNo
      ; (doc as any).fbrQrCode = r.qrCode
      ; (doc as any).fbrStatus = r.status
      ; (doc as any).fbrMode = r.mode
      ; (doc as any).fbrError = r.error
      try { await doc.save() } catch { }
    }
  } catch { }

  try {
    await DiagnosticAuditLog.create({
      action: 'token.create',
      subjectType: 'Token',
      subjectId: String((doc as any)?._id || ''),
      message: `Generated Diagnostic Token ${tokenNo} for ${data?.patient?.fullName || '-'}`,
      data: { tests: data.tests || [], tokenNo },
      actorId: actor.actorId,
      actorUsername: actor.actorUsername,
      ip: req.ip,
      userAgent: String(req.headers['user-agent'] || ''),
    })
  } catch { }

  // Corporate transactions
  try {
    const companyId = (data as any).corporateId ? String((data as any).corporateId) : ''
    if (companyId) {
      const testIds = Array.isArray(data.tests) ? data.tests : []
      const tests = await DiagnosticTest.find({ _id: { $in: testIds } }).lean()
      const map = new Map<string, any>(tests.map(t => [String((t as any)._id), t]))
      const dateIso = new Date().toISOString().slice(0, 10)

      for (const tid of testIds) {
        const t = map.get(String(tid))
        const listPrice = Number(t?.price || 0)
        const corp = await resolveTestPrice({ companyId, scope: 'DIAG', testId: String(tid), defaultPrice: listPrice })
        const baseCorp = Number(corp.price || 0)
        const coPayPct = Math.max(0, Math.min(100, Number((data as any)?.corporateCoPayPercent || 0)))
        const coPayAmt = Math.max(0, baseCorp * (coPayPct / 100))
        let net = Math.max(0, baseCorp - coPayAmt)
        const cap = Number((data as any)?.corporateCoverageCap || 0) || 0

        if (cap > 0) {
          try {
            const existing = await CorporateTransaction.find({ refType: 'diag_order', refId: String((doc as any)?._id || '') }).select('netToCorporate').lean()
            const used = (existing || []).reduce((s: number, tx: any) => s + Number(tx?.netToCorporate || 0), 0)
            const remaining = Math.max(0, cap - used)
            net = Math.max(0, Math.min(net, remaining))
          } catch { }
        }

        await CorporateTransaction.create({
          companyId,
          patientMrn: String((data as any)?.patient?.mrn || ''),
          patientName: String((data as any)?.patient?.fullName || ''),
          serviceType: 'DIAG',
          refType: 'diag_order',
          refId: String((doc as any)?._id || ''),
          itemRef: String(tid),
          dateIso,
          description: `Diagnostic Test${t?.name ? `: ${t.name}` : ''}`,
          qty: 1,
          unitPrice: listPrice,
          corpUnitPrice: baseCorp,
          coPay: coPayAmt,
          netToCorporate: net,
          corpRuleId: String(corp.appliedRuleId || ''),
          status: 'accrued',
        })
      }
    }
  } catch (e) { console.warn('Failed to create corporate transactions for Diagnostic token', e) }

  // Auto-post revenue journal to finance (non-corporate only)
  try {
    const net = Number((data as any).net || 0)
    if (!isCorporate && net > 0) {
      await postDiagnosticOrderJournal({
        orderId: String(doc._id), // We can use the token ID here to link the finance journal
        dateIso: new Date().toISOString().slice(0, 10),
        amount: net,
        paidMethod: doc.paymentMethod === 'Bank' ? 'Bank' : 'Cash',
        tokenNo,
        createdByUsername: doc.generatedBy,
        patientName: (data as any)?.patient?.fullName,
        mrn: (data as any)?.patient?.mrn,
      })
    }
  } catch (e) {
    console.error('Failed to post Diagnostic revenue journal:', e)
  }

  res.status(201).json(doc)
}

export async function convertToSample(req: Request, res: Response) {
  const { id } = req.params
  
  const token: any = await DiagnosticToken.findById(id)
  if (!token) return res.status(404).json({ error: 'Token not found' })

  if (token.status === 'converted_to_sample') {
    return res.status(400).json({ error: 'Token is already converted to sample' })
  }
  if (token.status === 'cancelled') {
    return res.status(400).json({ error: 'Token is cancelled' })
  }

  const actor = getActor(req) as any
  const performedBy = String(
    actor?.actorUsername ||
    (req as any).user?.username ||
    (req as any).user?.name ||
    (req as any).user?.email ||
    ''
  ).trim().toLowerCase() || undefined

  if (!performedBy) return res.status(401).json({ error: 'Unauthorized' })

  // Convert to order
  const testIds = (token.tests || []).map((t: any) => String(t.testId))
  const items = testIds.map((tid: string) => ({ testId: tid, status: 'received' as const }))

  const orderData = {
    patientId: token.patientId,
    patient: token.patient,
    corporateId: token.corporateId,
    createdByUsername: performedBy,
    tests: testIds,
    items,
    subtotal: token.subtotal,
    discount: token.discount,
    net: token.net,
    receivedAmount: token.receivedAmount,
    receivableAmount: token.receivableAmount,
    payments: token.payments,
    tokenNo: token.tokenNo,
    status: 'received',
    referringConsultant: token.referringConsultant,
    fbrInvoiceNo: token.fbrInvoiceNo,
    fbrQrCode: token.fbrQrCode,
    fbrStatus: token.fbrStatus,
    fbrMode: token.fbrMode,
    fbrError: token.fbrError,
    portal: token.portal,
  }

  const order: any = await DiagnosticOrder.create(orderData)

  token.status = 'converted_to_sample'
  token.convertedAt = new Date().toISOString()
  token.convertedBy = performedBy
  token.orderId = String(order._id)
  await token.save()

  try {
    await DiagnosticAuditLog.create({
      action: 'token.convert',
      subjectType: 'Token',
      subjectId: String(token._id),
      message: `Converted Diagnostic Token ${token.tokenNo} to Sample`,
      data: { orderId: String(order._id) },
      actorId: actor.actorId,
      actorUsername: actor.actorUsername,
      ip: req.ip,
      userAgent: String(req.headers['user-agent'] || ''),
    })
  } catch { }

  res.json({ success: true, token, order })
}

export async function updateStatus(req: Request, res: Response) {
  const { id } = req.params
  const { status } = req.body
  const token = await DiagnosticToken.findByIdAndUpdate(id, { status }, { new: true })
  res.json(token)
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params
  await DiagnosticToken.findByIdAndDelete(id)
  res.json({ success: true })
}

export async function update(req: Request, res: Response) {
  const { id } = req.params
  const token = await DiagnosticToken.findByIdAndUpdate(id, req.body, { new: true })
  res.json(token)
}
