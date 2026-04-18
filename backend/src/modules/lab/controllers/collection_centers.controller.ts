import { Request, Response } from 'express'
import { LabCollectionCenter } from '../models/CollectionCenter'
import { LabToken } from '../models/Token'
import { LabOrder } from '../models/Order'
import { collectionCenterCreateSchema, collectionCenterUpdateSchema, recordPaymentSchema } from '../validators/collectionCenter'
import { ApiError } from '../../../common/errors/ApiError'
import { LabAuditLog } from '../models/AuditLog'

export async function list(req: Request, res: Response) {
  const q = String(req.query.q || '').trim()
  const status = String(req.query.status || '')
  const page = Math.max(1, Number((req.query as any).page || 1))
  const limit = Math.max(1, Math.min(500, Number((req.query as any).limit || 50)))
  
  const filter: any = {}
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { code: { $regex: q, $options: 'i' } },
      { contactPerson: { $regex: q, $options: 'i' } },
    ]
  }
  if (status) filter.status = status
  
  const total = await LabCollectionCenter.countDocuments(filter)
  const skip = (page - 1) * limit
  const centers = await LabCollectionCenter.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
  
  // Compute actual stats from orders joined with tokens for each center
  const M = require('mongoose')
  const centerIds = centers.map(c => String(c._id))
  
  // Aggregate from LabOrder joined with LabToken to get collection center info
  const orderStats = await LabOrder.aggregate([
    {
      $lookup: {
        from: 'lab_tokens',
        localField: 'tokenId',
        foreignField: '_id',
        as: 'token'
      }
    },
    { $unwind: { path: '$token', preserveNullAndEmptyArrays: false } },
    { $match: { 'token.collectionCenterId': { $in: centerIds.map((id: string) => new M.Types.ObjectId(id)) } } },
    {
      $group: {
        _id: '$token.collectionCenterId',
        totalTokens: { $sum: 1 },
        totalRevenue: { $sum: { $ifNull: ['$net', 0] } },
        totalCommission: { $sum: { $ifNull: ['$token.centerCommissionAmount', 0] } },
      },
    },
  ])
  
  // Create a map of stats by center ID
  const statsMap = new Map(orderStats.map(s => [String(s._id), s]))
  
  // Merge stats into center objects
  const items = centers.map(center => {
    const stats = statsMap.get(String(center._id))
    const totalCommission = stats?.totalCommission || 0
    const totalPaid = (center as any).paymentHistory?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0
    return {
      ...center,
      totalTokens: stats?.totalTokens || 0,
      totalRevenue: Math.round((stats?.totalRevenue || 0) * 100) / 100,
      totalCommission: Math.round(totalCommission * 100) / 100,
      // Calculate balance due: commission - payments
      balanceDue: Math.round((totalCommission - totalPaid) * 100) / 100,
    }
  })
  
  const totalPages = Math.max(1, Math.ceil(total / limit))
  res.json({ items, total, page, totalPages })
}

export async function listAllActive(req: Request, res: Response) {
  const items = await LabCollectionCenter.find({ status: 'Active' })
    .sort({ name: 1 })
    .lean()
  res.json({ items })
}

export async function create(req: Request, res: Response) {
  const data = collectionCenterCreateSchema.parse(req.body)
  
  // Check for duplicate code
  const existing = await LabCollectionCenter.findOne({ code: data.code }).lean()
  if (existing) {
    throw new ApiError(400, `Collection center with code '${data.code}' already exists`)
  }
  
  const center = await LabCollectionCenter.create(data)
  
  try {
    const actor = (req as any).user?.username || (req as any).user?.name || (req as any).user?.email || 'system'
    await LabAuditLog.create({
      actor,
      action: 'Add Collection Center',
      label: 'ADD_COLLECTION_CENTER',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${center.name} (${center.code})`,
    })
  } catch {}
  
  res.status(201).json(center)
}

export async function update(req: Request, res: Response) {
  const { id } = req.params
  const data = collectionCenterUpdateSchema.parse(req.body)
  
  // Check for duplicate code if code is being updated
  if (data.code) {
    const existing = await LabCollectionCenter.findOne({ 
      code: data.code, 
      _id: { $ne: id } 
    }).lean()
    if (existing) {
      throw new ApiError(400, `Collection center with code '${data.code}' already exists`)
    }
  }
  
  const center = await LabCollectionCenter.findByIdAndUpdate(id, data, { new: true })
  if (!center) throw new ApiError(404, 'Collection center not found')
  
  try {
    const actor = (req as any).user?.username || (req as any).user?.name || (req as any).user?.email || 'system'
    await LabAuditLog.create({
      actor,
      action: 'Edit Collection Center',
      label: 'EDIT_COLLECTION_CENTER',
      method: 'PUT',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${center.name} (${center.code})`,
    })
  } catch {}
  
  res.json(center)
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params
  const before: any = await LabCollectionCenter.findById(id).lean()
  
  const center = await LabCollectionCenter.findByIdAndDelete(id)
  if (!center) throw new ApiError(404, 'Collection center not found')
  
  try {
    const actor = (req as any).user?.username || (req as any).user?.name || (req as any).user?.email || 'system'
    await LabAuditLog.create({
      actor,
      action: 'Delete Collection Center',
      label: 'DELETE_COLLECTION_CENTER',
      method: 'DELETE',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${before?.name || ''} (${before?.code || ''})`,
    })
  } catch {}
  
  res.json({ ok: true })
}

export async function getTokens(req: Request, res: Response) {
  const { id } = req.params
  const from = String(req.query.from || '')
  const to = String(req.query.to || '')
  const status = String(req.query.status || '')
  const page = Math.max(1, Number((req.query as any).page || 1))
  const limit = Math.max(1, Math.min(500, Number((req.query as any).limit || 50)))
  
  const M = require('mongoose')
  const filter: any = { collectionCenterId: new M.Types.ObjectId(id) }
  if (from || to) {
    filter.generatedAt = {}
    if (from) filter.generatedAt.$gte = from
    if (to) filter.generatedAt.$lte = to + 'T23:59:59.999Z'
  }
  if (status) filter.status = status
  
  const total = await LabToken.countDocuments(filter)
  const skip = (page - 1) * limit
  const items = await LabToken.find(filter)
    .sort({ generatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
  
  const totalPages = Math.max(1, Math.ceil(total / limit))
  res.json({ items, total, page, totalPages })
}

export async function getRevenue(req: Request, res: Response) {
  const { id } = req.params
  const from = String(req.query.from || '')
  const to = String(req.query.to || '')
  
  const center = await LabCollectionCenter.findById(id).lean()
  if (!center) throw new ApiError(404, 'Collection center not found')
  
  const M = require('mongoose')
  const centerObjectId = new M.Types.ObjectId(id)
  
  // Aggregate from LabOrder joined with LabToken
  const matchFilter: any = {}
  if (from || to) {
    matchFilter.createdAt = {}
    if (from) matchFilter.createdAt.$gte = new Date(from)
    if (to) matchFilter.createdAt.$lte = new Date(to + 'T23:59:59.999Z')
  }
  
  const stats = await LabOrder.aggregate([
    { $match: matchFilter },
    {
      $lookup: {
        from: 'lab_tokens',
        localField: 'tokenId',
        foreignField: '_id',
        as: 'token'
      }
    },
    { $unwind: { path: '$token', preserveNullAndEmptyArrays: false } },
    { $match: { 'token.collectionCenterId': centerObjectId } },
    {
      $group: {
        _id: null,
        totalTokens: { $sum: 1 },
        totalRevenue: { $sum: { $ifNull: ['$net', 0] } },
        totalCommission: { $sum: { $ifNull: ['$token.centerCommissionAmount', 0] } },
        totalNetAmount: { $sum: { $ifNull: ['$token.centerNetAmount', 0] } },
      },
    },
  ])
  
  const summary = stats[0] || {
    totalTokens: 0,
    totalRevenue: 0,
    totalCommission: 0,
    totalNetAmount: 0,
  }
  
  res.json({
    center,
    summary: {
      totalTokens: summary.totalTokens,
      totalRevenue: Math.round(summary.totalRevenue * 100) / 100,
      totalCommission: Math.round(summary.totalCommission * 100) / 100,
      totalNetAmount: Math.round(summary.totalNetAmount * 100) / 100,
    },
  })
}

export async function getRevenueSummaryAll(req: Request, res: Response) {
  const from = String(req.query.from || '')
  const to = String(req.query.to || '')
  
  // Aggregate from LabOrder joined with LabToken to get collection center stats
  const matchFilter: any = {}
  if (from || to) {
    matchFilter.createdAt = {}
    if (from) matchFilter.createdAt.$gte = new Date(from)
    if (to) matchFilter.createdAt.$lte = new Date(to + 'T23:59:59.999Z')
  }
  
  const stats = await LabOrder.aggregate([
    { $match: matchFilter },
    {
      $lookup: {
        from: 'lab_tokens',
        localField: 'tokenId',
        foreignField: '_id',
        as: 'token'
      }
    },
    { $unwind: { path: '$token', preserveNullAndEmptyArrays: false } },
    { $match: { 'token.collectionCenterId': { $ne: null } } },
    {
      $group: {
        _id: '$token.collectionCenterId',
        centerName: { $first: '$token.collectionCenterName' },
        totalTokens: { $sum: 1 },
        totalRevenue: { $sum: { $ifNull: ['$net', 0] } },
        totalCommission: { $sum: { $ifNull: ['$token.centerCommissionAmount', 0] } },
        totalNetAmount: { $sum: { $ifNull: ['$token.centerNetAmount', 0] } },
      },
    },
    { $sort: { totalRevenue: -1 } },
  ])
  
  res.json({
    items: stats.map((s: any) => ({
      centerId: String(s._id),
      centerName: s.centerName || 'Unknown',
      totalTokens: s.totalTokens,
      totalRevenue: Math.round(s.totalRevenue * 100) / 100,
      totalCommission: Math.round(s.totalCommission * 100) / 100,
      totalNetAmount: Math.round(s.totalNetAmount * 100) / 100,
    })),
  })
}

export async function recordPayment(req: Request, res: Response) {
  const { id } = req.params
  const data = recordPaymentSchema.parse(req.body)
  
  const center = await LabCollectionCenter.findById(id)
  if (!center) throw new ApiError(404, 'Collection center not found')
  
  const actor = (req as any).user?.username || (req as any).user?.name || (req as any).user?.email || 'system'
  
  center.paymentHistory.push({
    date: data.date,
    amount: data.amount,
    note: data.note,
    recordedBy: actor,
  })
  
  center.balanceDue = Math.max(0, (center.balanceDue || 0) - data.amount)
  await center.save()
  
  try {
    await LabAuditLog.create({
      actor,
      action: 'Record Center Payment',
      label: 'RECORD_CENTER_PAYMENT',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${center.name} — Payment Rs ${data.amount.toFixed(2)}`,
    })
  } catch {}
  
  res.json({ ok: true, center })
}

export async function getPaymentHistory(req: Request, res: Response) {
  const { id } = req.params
  const centerRaw = await LabCollectionCenter.findById(id).lean()
  if (!centerRaw) throw new ApiError(404, 'Collection center not found')
  if (Array.isArray(centerRaw)) throw new ApiError(500, 'Unexpected array response')
  
  const center = centerRaw as any
  
  res.json({
    center: {
      _id: String(center._id),
      name: String(center.name || ''),
      code: String(center.code || ''),
    },
    payments: center.paymentHistory || [],
  })
}
