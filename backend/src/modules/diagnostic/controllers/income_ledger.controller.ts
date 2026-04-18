import { Request, Response } from 'express'
import { DiagnosticOrder } from '../models/Order'

export async function listIncomeLedger(req: Request, res: Response) {
  try {
    const { from, to, tokenNo, patientName, page = '1', limit = '50' } = req.query as any
    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 50))

    const match: any = {}
    if (from || to) {
      match.createdAt = {}
      if (from) {
        // Pakistan timezone is UTC+5. Convert Pakistan midnight to UTC.
        // Pakistan midnight (00:00) = UTC 19:00 (previous day)
        const pakDate = new Date((from as string) + 'T00:00:00')
        const utcDate = new Date(pakDate.getTime() - (5 * 60 * 60 * 1000))
        if (!isNaN(utcDate.getTime())) match.createdAt.$gte = utcDate
      }
      if (to) {
        // Pakistan 23:59:59.999 = UTC 18:59:59.999 (same day)
        const pakDate = new Date((to as string) + 'T23:59:59.999')
        const utcDate = new Date(pakDate.getTime() - (5 * 60 * 60 * 1000))
        if (!isNaN(utcDate.getTime())) match.createdAt.$lte = utcDate
      }
    }
    if (tokenNo) {
      match.tokenNo = { $regex: String(tokenNo).trim(), $options: 'i' }
    }
    if (patientName) {
      match['patient.fullName'] = { $regex: String(patientName).trim(), $options: 'i' }
    }

    const pipeline: any[] = [
      { $match: match },
      {
        $group: {
          _id: '$tokenNo',
          tokenNo: { $first: '$tokenNo' },
          patient: { $first: '$patient' },
          createdAt: { $first: '$createdAt' },
          corporateId: { $first: '$corporateId' },
          tests: { $push: { testId: { $arrayElemAt: ['$tests', 0] }, status: '$status' } },
          subtotal: { $sum: '$subtotal' },
          discount: { $sum: '$discount' },
          net: { $sum: { $subtract: [{ $ifNull: ['$net', 0] }, { $ifNull: ['$returnInfo.amount', 0] }] } },
          receivedAmount: { $sum: '$receivedAmount' },
          receivableAmount: { $sum: '$receivableAmount' },
          returnedAmount: { $sum: { $ifNull: ['$returnInfo.amount', 0] } },
          payments: { $first: '$payments' },
        },
      },
      { $sort: { createdAt: -1 as const } },
      {
        $facet: {
          data: [
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ]

    const result = await DiagnosticOrder.aggregate(pipeline)
    const items = result[0]?.data || []
    const total = result[0]?.total?.[0]?.count || 0

    // Compute summary
    const summary = items.reduce(
      (acc: any, item: any) => {
        acc.totalNet += item.net || 0
        acc.totalReceived += item.receivedAmount || 0
        acc.totalPending += item.receivableAmount || 0
        acc.totalReturned += item.returnedAmount || 0
        return acc
      },
      { totalNet: 0, totalReceived: 0, totalPending: 0, totalReturned: 0 }
    )

    res.json({
      items,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      summary,
    })
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to fetch income ledger' })
  }
}

export async function getIncomeSummary(req: Request, res: Response) {
  try {
    const { from, to } = req.query as any

    const match: any = {}
    if (from || to) {
      match.createdAt = {}
      if (from) {
        // Pakistan timezone is UTC+5. Convert Pakistan midnight to UTC.
        // Pakistan midnight (00:00) = UTC 19:00 (previous day)
        const pakDate = new Date((from as string) + 'T00:00:00')
        const utcDate = new Date(pakDate.getTime() - (5 * 60 * 60 * 1000))
        if (!isNaN(utcDate.getTime())) match.createdAt.$gte = utcDate
      }
      if (to) {
        // Pakistan 23:59:59.999 = UTC 18:59:59.999 (same day)
        const pakDate = new Date((to as string) + 'T23:59:59.999')
        const utcDate = new Date(pakDate.getTime() - (5 * 60 * 60 * 1000))
        if (!isNaN(utcDate.getTime())) match.createdAt.$lte = utcDate
      }
    }

    const pipeline2: any[] = [
      { $match: match },
      {
        $group: {
          _id: '$tokenNo',
          net: { $sum: { $subtract: [{ $ifNull: ['$net', 0] }, { $ifNull: ['$returnInfo.amount', 0] }] } },
          receivedAmount: { $sum: '$receivedAmount' },
          receivableAmount: { $sum: '$receivableAmount' },
          returnedAmount: { $sum: { $ifNull: ['$returnInfo.amount', 0] } },
          corporateId: { $first: '$corporateId' },
        },
      },
      {
        $group: {
          _id: null,
          totalNet: { $sum: '$net' },
          totalReceived: { $sum: '$receivedAmount' },
          totalPending: { $sum: '$receivableAmount' },
          totalReturned: { $sum: '$returnedAmount' },
          corporateNet: {
            $sum: { $cond: [{ $ifNull: ['$corporateId', false] }, '$net', 0] },
          },
          cashNet: {
            $sum: { $cond: [{ $ifNull: ['$corporateId', false] }, 0, '$net'] },
          },
        },
      },
    ]

    const result = await DiagnosticOrder.aggregate(pipeline2)
    const summary = result[0] || {
      totalNet: 0,
      totalReceived: 0,
      totalPending: 0,
      totalReturned: 0,
      corporateNet: 0,
      cashNet: 0,
    }

    res.json(summary)
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to fetch income summary' })
  }
}
