import { Request, Response } from 'express'
import { LabCenterRateList } from '../models/CenterRateList'
import { logAudit } from '../utils/audit'

export async function list(req: Request, res: Response) {
  const { centerId, q, category } = req.query as any
  if (!centerId) return res.status(400).json({ message: 'centerId required' })
  const filter: any = { centerId }
  if (q) filter.testName = new RegExp(String(q), 'i')
  if (category) filter.category = category
  const items = await LabCenterRateList.find(filter).sort({ testName: 1 }).limit(2000).lean()
  res.json({ items })
}

export async function upsert(req: Request, res: Response) {
  const { centerId, testId, ...rest } = req.body || {}
  if (!centerId || !testId) return res.status(400).json({ message: 'centerId and testId required' })
  const doc = await LabCenterRateList.findOneAndUpdate(
    { centerId, testId },
    { $set: { centerId, testId, ...rest } },
    { new: true, upsert: true },
  )
  res.json(doc)
}

export async function bulkSave(req: Request, res: Response) {
  const { centerId, items = [] } = req.body || {}
  if (!centerId) return res.status(400).json({ message: 'centerId required' })
  const ops = items.map((it: any) => ({
    updateOne: {
      filter: { centerId, testId: it.testId },
      update: { $set: { centerId, ...it } },
      upsert: true,
    },
  }))
  if (ops.length) await LabCenterRateList.bulkWrite(ops)
  await logAudit(req, { action: 'center_rate.bulk_save', entity: 'rate_list', entityId: String(centerId), label: `${ops.length} rows` })
  res.json({ ok: true, count: ops.length })
}

export async function copyRateList(req: Request, res: Response) {
  const { fromId } = req.params
  const { toId } = req.body || {}
  if (!toId) return res.status(400).json({ message: 'toId required' })
  const src = await LabCenterRateList.find({ centerId: fromId }).lean()
  const ops = src.map((s: any) => ({
    updateOne: {
      filter: { centerId: toId, testId: s.testId },
      update: {
        $set: {
          centerId: toId,
          testId: s.testId,
          testName: s.testName,
          category: s.category,
          status: s.status,
          performAtCC: s.performAtCC,
          labRate: s.labRate,
          ccPatientRate: s.ccPatientRate,
          ccShare: s.ccShare,
          ccSharePercent: s.ccSharePercent,
          labShare: s.labShare,
          discountBearByCCPct: s.discountBearByCCPct,
          discountBearByLabPct: s.discountBearByLabPct,
          maxDiscountPct: s.maxDiscountPct,
          etaDays: s.etaDays,
          etaHours: s.etaHours,
          etaMinutes: s.etaMinutes,
        },
      },
      upsert: true,
    },
  }))
  if (ops.length) await LabCenterRateList.bulkWrite(ops)
  await logAudit(req, { action: 'center_rate.copy', entity: 'rate_list', label: `${fromId}->${toId}` })
  res.json({ ok: true, count: ops.length })
}

export async function remove(req: Request, res: Response) {
  await LabCenterRateList.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
}
