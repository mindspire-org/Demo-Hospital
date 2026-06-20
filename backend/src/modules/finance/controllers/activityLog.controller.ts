import { Request, Response } from 'express'
import { ActivityLog } from '../models/ActivityLog'

function parseDate(d?: string) {
  if (!d) return null
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? null : dt
}

// GET /finance/activity-log
export async function list(req: Request, res: Response) {
  try {
    const { userId, userName, portal, action, module, from, to, page = '1', limit = '50', search } = req.query

    const filter: any = {}
    if (userId) filter.userId = String(userId)
    if (userName) filter.userName = { $regex: String(userName), $options: 'i' }
    if (portal) filter.portal = String(portal)
    if (action) filter.action = String(action)
    if (module) filter.module = String(module)
    if (search) {
      filter.$or = [
        { entityLabel: { $regex: String(search), $options: 'i' } },
        { userName: { $regex: String(search), $options: 'i' } },
      ]
    }

    const fromDate = parseDate(String(from || ''))
    const toDate = parseDate(String(to || ''))
    if (fromDate || toDate) {
      filter.createdAt = {}
      if (fromDate) filter.createdAt.$gte = fromDate
      if (toDate) {
        const end = new Date(toDate)
        end.setHours(23, 59, 59, 999)
        filter.createdAt.$lte = end
      }
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1)
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit), 10) || 50))
    const skip = (pageNum - 1) * limitNum

    const [items, total] = await Promise.all([
      ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      ActivityLog.countDocuments(filter),
    ])

    res.json({ items, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to list activity logs' })
  }
}

// GET /finance/activity-log/summary
export async function summary(req: Request, res: Response) {
  try {
    const { userId, from, to } = req.query
    const filter: any = {}
    if (userId) filter.userId = String(userId)

    const fromDate = parseDate(String(from || ''))
    const toDate = parseDate(String(to || ''))
    if (fromDate || toDate) {
      filter.createdAt = {}
      if (fromDate) filter.createdAt.$gte = fromDate
      if (toDate) {
        const end = new Date(toDate)
        end.setHours(23, 59, 59, 999)
        filter.createdAt.$lte = end
      }
    }

    const pipeline: any[] = [
      { $match: filter },
      {
        $group: {
          _id: { action: '$action', portal: '$portal' },
          count: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$amount', 0] } },
        },
      },
      { $sort: { '_id.action': 1 } },
    ]

    const byActionPortal = await ActivityLog.aggregate(pipeline)

    const totalsPipeline: any[] = [
      { $match: filter },
      {
        $group: {
          _id: null,
          totalIn: {
            $sum: {
              $cond: [
                { $in: ['$action', ['Payment Collected', 'OPD Payment Collected', 'IPD Payment Collected', 'Lab Payment Collected', 'Pharmacy Sale', 'Aesthetic Payment', 'Cash Session Opened', 'Shift Opened', 'Manual Earning Recorded']] },
                { $ifNull: ['$amount', 0] },
                0,
              ],
            },
          },
          totalOut: {
            $sum: {
              $cond: [
                { $in: ['$action', ['Refund Issued', 'IPD Refund Issued', 'Lab Refund Issued', 'Pharmacy Refund', 'Expense Created', 'Expense Approved', 'Doctor Payout', 'Cash Movement']] },
                { $ifNull: ['$amount', 0] },
                0,
              ],
            },
          },
          totalActivities: { $sum: 1 },
        },
      },
    ]

    const totalsResult = await ActivityLog.aggregate(totalsPipeline)
    const totals = totalsResult[0] || { totalIn: 0, totalOut: 0, totalActivities: 0 }

    res.json({
      byActionPortal,
      totalIn: totals.totalIn,
      totalOut: totals.totalOut,
      netBalance: totals.totalIn - totals.totalOut,
      totalActivities: totals.totalActivities,
    })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to get summary' })
  }
}

// GET /finance/activity-log/users
export async function users(req: Request, res: Response) {
  try {
    const result = await ActivityLog.aggregate([
      { $group: { _id: '$userId', userName: { $first: '$userName' } } },
      { $sort: { userName: 1 } },
      { $project: { userId: '$_id', userName: 1, _id: 0 } },
    ])
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to list users' })
  }
}

// GET /finance/activity-log/actions
export async function actions(req: Request, res: Response) {
  try {
    const result = await ActivityLog.distinct('action')
    res.json(result.sort())
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to list actions' })
  }
}

// GET /finance/activity-log/export
export async function exportLogs(req: Request, res: Response) {
  try {
    const { userId, userName, portal, action, module, from, to, search } = req.query

    const filter: any = {}
    if (userId) filter.userId = String(userId)
    if (userName) filter.userName = { $regex: String(userName), $options: 'i' }
    if (portal) filter.portal = String(portal)
    if (action) filter.action = String(action)
    if (module) filter.module = String(module)
    if (search) {
      filter.$or = [
        { entityLabel: { $regex: String(search), $options: 'i' } },
        { userName: { $regex: String(search), $options: 'i' } },
      ]
    }

    const fromDate = parseDate(String(from || ''))
    const toDate = parseDate(String(to || ''))
    if (fromDate || toDate) {
      filter.createdAt = {}
      if (fromDate) filter.createdAt.$gte = fromDate
      if (toDate) {
        const end = new Date(toDate)
        end.setHours(23, 59, 59, 999)
        filter.createdAt.$lte = end
      }
    }

    const items = await ActivityLog.find(filter).sort({ createdAt: -1 }).lean()

    const headers = ['Date', 'User', 'Portal', 'Action', 'Module', 'Entity', 'Amount', 'Method']
    const rows = items.map((i: any) => [
      i.createdAt ? new Date(i.createdAt).toISOString() : '',
      `"${(i.userName || '').replace(/"/g, '""')}"`,
      i.portal || '',
      i.action || '',
      i.module || '',
      `"${(i.entityLabel || '').replace(/"/g, '""')}"`,
      i.amount != null ? i.amount.toString() : '',
      i.method || '',
    ])

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="activity-log.csv"')
    res.send(csv)
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to export' })
  }
}
