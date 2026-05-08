import { Request, Response } from 'express'
import { LabOrder } from '../models/Order'
import { LabInventoryItem } from '../models/InventoryItem'
import { LabToken } from '../models/Token'
import { LabResult } from '../models/Result'

function todayBounds(){
  const start = new Date()
  start.setHours(0,0,0,0)
  const end = new Date()
  end.setHours(23,59,59,999)
  return { start, end }
}

function yesterdayBounds(){
  const start = new Date()
  start.setDate(start.getDate() - 1)
  start.setHours(0,0,0,0)
  const end = new Date()
  end.setHours(23,59,59,999)
  return { start, end }
}

export async function summary(_req: Request, res: Response){
  const { start, end } = todayBounds()
  const { start: yesterdayStart } = yesterdayBounds()

  const [ordersToday, completedToday, pendingReports, pendingReceived, inventory, recentTokens, recentOrders, recentResults] = await Promise.all([
    LabOrder.find({ createdAt: { $gte: start, $lte: end } }).select('tests status returnedTests').lean(),
    LabOrder.countDocuments({ status: 'completed', updatedAt: { $gte: start, $lte: end } } as any),
    LabOrder.countDocuments({ status: 'received' }),
    LabOrder.countDocuments({ status: 'pending' }),
    LabInventoryItem.find({}).select('onHand minStock').lean(),
    // Recent activity - last 10 tokens
    LabToken.find({ createdAt: { $gte: yesterdayStart } })
      .select('tokenNo patient createdAt status generatedBy')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    // Recent activity - last 10 orders
    LabOrder.find({ createdAt: { $gte: yesterdayStart } })
      .select('tokenNo patient createdAt status barcode')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    // Recent activity - last 10 results
    LabResult.find({ createdAt: { $gte: yesterdayStart } })
      .select('orderId createdAt submittedBy performedBy editedBy')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ])

  const todaysTests = ordersToday.reduce((s:any,o:any)=> s + (Array.isArray(o.tests)? o.tests.length : 0), 0)
  const samplesReceived = ordersToday.length
  const lowReagents = inventory.reduce((s:any,it:any)=> s + ((it.minStock!=null && Number(it.onHand||0) <= Number(it.minStock)) ? 1 : 0), 0)
  const outOfStock = inventory.reduce((s:any,it:any)=> s + ((Number(it.onHand||0) <= 0) ? 1 : 0), 0)

  // Build a map for recent result -> order (to render token + patient)
  const recentResultOrderIds = Array.from(new Set((recentResults || []).map((r: any) => String(r?.orderId || '')).filter(Boolean)))
  const resultOrders = recentResultOrderIds.length
    ? await LabOrder.find({ _id: { $in: recentResultOrderIds } }).select('tokenNo patient').lean()
    : []
  const orderById = new Map<string, any>()
  for (const o of (resultOrders || [])) orderById.set(String((o as any)._id), o)

  // Build recent activity list
  const activity = [
    ...(recentTokens || []).map((t: any) => ({
      type: 'token' as const,
      title: `Token Generated: ${t.tokenNo}`,
      patient: t.patient?.fullName || '-',
      at: t.createdAt,
      status: t.status,
      by: t.generatedBy || '-',
    })),
    ...(recentOrders || []).map((o: any) => ({
      type: 'order' as const,
      title: `Sample Received: ${o.tokenNo}`,
      patient: o.patient?.fullName || '-',
      at: o.createdAt,
      status: o.status,
      by: '-',
    })),
    ...(recentResults || []).map((r: any) => ({
      type: 'result' as const,
      title: `Result Entered: ${orderById.get(String(r.orderId))?.tokenNo || '-'}`,
      patient: orderById.get(String(r.orderId))?.patient?.fullName || '-',
      at: r.createdAt,
      status: 'completed',
      by: r.submittedBy || r.performedBy || r.editedBy || '-',
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10)

  res.json({
    todaysTests,
    pendingReports,
    pendingReceived,
    completedToday,
    samplesReceived,
    lowReagents,
    outOfStock,
    at: new Date().toISOString(),
    recentActivity: activity,
  })
}
