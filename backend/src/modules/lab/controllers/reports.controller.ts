import { Request, Response } from 'express'
import { LabOrder } from '../models/Order'
import { LabExpense } from '../models/Expense'
import { LabPurchase } from '../models/Purchase'
import { LabToken } from '../models/Token'

function parseDateOnly(s?: string){
  if (!s) return undefined
  // Parse as Pakistan local date and convert to UTC
  // Pakistan timezone is UTC+5
  const pakDate = new Date(s + 'T00:00:00')
  const utcDate = new Date(pakDate.getTime() - (5 * 60 * 60 * 1000))
  return isNaN(utcDate.getTime()) ? undefined : utcDate
}

function rangeFromQuery(q: any){
  const now = new Date()
  // Default range: last 7 days in Pakistan time, converted to UTC
  // Pakistan midnight = UTC 19:00 (previous day)
  const defToPak = new Date(now.toISOString().slice(0,10) + 'T23:59:59.999')
  const defTo = new Date(defToPak.getTime() - (5 * 60 * 60 * 1000))
  const defFromPak = new Date(now.toISOString().slice(0,10) + 'T00:00:00')
  defFromPak.setDate(defFromPak.getDate()-6)
  const defFrom = new Date(defFromPak.getTime() - (5 * 60 * 60 * 1000))
  
  let from = parseDateOnly(q.from)
  let to: Date | undefined
  if (q.to) {
    const pakTo = new Date(q.to + 'T23:59:59.999')
    to = new Date(pakTo.getTime() - (5 * 60 * 60 * 1000))
  } else {
    to = defTo
  }
  if (!from) from = defFrom
  return { from, to }
}

function monthBounds(date = new Date()){
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth()+1, 0)
  end.setHours(23,59,59,999)
  return { start, end }
}

export async function summary(req: Request, res: Response){
  // Prevent caching to ensure fresh data
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')

  const { from, to } = rangeFromQuery(req.query)
  const { collectionCenterId, wardId, referringDoctorId } = req.query as any

  // Fetch all required data in one go
  // Include non-corporate orders OR corporate orders with co-pay (net > 0)
  const orderMatch: any = {
    createdAt: { $gte: from, $lte: to },
    $or: [
      { corporateId: { $exists: false } },
      { corporateId: { $exists: true }, net: { $gt: 0 } },
    ],
  }
  const tokenMatch: any = {
    status: 'token_generated',
    createdAt: { $gte: from, $lte: to },
    $or: [
      { corporateId: { $exists: false } },
      { corporateId: { $exists: true }, net: { $gt: 0 } },
    ],
  }
  if (collectionCenterId) {
    orderMatch.collectionCenterId = collectionCenterId
    tokenMatch.collectionCenterId = collectionCenterId
  }
  if (wardId) {
    orderMatch.wardId = wardId
    tokenMatch.wardId = wardId
  }
  if (referringDoctorId) {
    orderMatch.referringDoctorId = referringDoctorId
    tokenMatch.referringDoctorId = referringDoctorId
  }

  const [ordersRaw, tokensRaw, expensesRaw, purchasesRaw] = await Promise.all([
    LabOrder.find(orderMatch).select('createdAt tests net status tokenNo receivedAmount receivableAmount testStatuses').lean(),
    // Include unconverted tokens (token_generated) as part of finance, with co-pay only for corporate
    LabToken.find(tokenMatch).select('createdAt tests net receivedAmount receivableAmount corporateId').lean(),
    LabExpense.find({}).lean(), // we'll filter by date below since it's a string
    LabPurchase.find({}).lean(), // filter by string date like expenses
  ])

  const ordersInRange = ordersRaw
  const tokensInRange = tokensRaw
  const expensesInRange = expensesRaw
  const purchasesAll = purchasesRaw

  // Debug logging to help diagnose data issues
  console.log('[LabReports] Date range:', { from: from?.toISOString(), to: to?.toISOString() })
  console.log('[LabReports] Orders found:', ordersInRange.length)
  console.log('[LabReports] Tokens found:', tokensInRange.length)
  if (ordersInRange.length > 0) {
    console.log('[LabReports] First order:', { id: ordersInRange[0]._id, tokenNo: ordersInRange[0].tokenNo, net: ordersInRange[0].net, corporateId: ordersInRange[0].corporateId })
  }
  if (tokensInRange.length > 0) {
    console.log('[LabReports] First token:', { id: tokensInRange[0]._id, tokenNo: tokensInRange[0].tokenNo, net: tokensInRange[0].net, status: (tokensInRange[0] as any).status })
  }

  const totalOrders = ordersInRange.length
  
  // Calculate total tests excluding returned ones
  const totalTests = ordersInRange.reduce((acc, o) => {
    const activeTests = (o.testStatuses || []).filter((t: any) => t.status !== 'returned').length
    return acc + activeTests
  }, 0) + tokensInRange.reduce((s: any, t: any) => s + (Array.isArray((t as any).tests) ? (t as any).tests.length : 0), 0)

  const totalRevenueRaw = ordersInRange.reduce((s: any, o: any) => s + Number(o.net || 0), 0)
    + tokensInRange.reduce((s: any, t: any) => s + Number((t as any).net || 0), 0)

  // Status counts based on per-test status
  let pendingResults = 0
  let pendingApproval = 0
  let completedTests = 0
  let ordersRevenue = 0

  ordersInRange.forEach(o => {
    // Recalculate revenue based on non-returned tests for better accuracy in reports
    const activeNet = (o.testStatuses || []).filter((ts: any) => ts.status !== 'returned').length > 0
      ? (o.net || 0) // if there are active tests, we take the current net which should be updated
      : 0
    ordersRevenue += Number(activeNet || 0)

    const statuses = Array.isArray(o.testStatuses) ? o.testStatuses : []
    statuses.forEach((ts: any) => {
      if (ts.status === 'returned') return
      if (ts.status === 'result_entered') pendingApproval++
      else if (ts.status === 'completed') completedTests++
      else pendingResults++
    })
  })
  
  // Total Revenue should reflect adjustments
  const tokenRevenueBase = tokensInRange.reduce((s: any, t: any) => s + Number((t as any).net || 0), 0)
  const totalRevenue = ordersRevenue + tokenRevenueBase
  
  // Also count tests in unconverted tokens as pending results
  tokensInRange.forEach(t => {
    pendingResults += (Array.isArray(t.tests) ? t.tests.length : 0)
  })

  // Daily revenue breakdown
  const fmt = (d: Date)=> `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const revByDay = new Map<string, number>()
  ordersInRange.forEach(o=>{
    const d = new Date(o.createdAt as any)
    const key = fmt(d)
    revByDay.set(key, (revByDay.get(key)||0) + Number(o.net||0))
  })
  tokensInRange.forEach(t=>{
    const d = new Date((t as any).createdAt as any)
    const key = fmt(d)
    revByDay.set(key, (revByDay.get(key)||0) + Number((t as any).net||0))
  })
  // ensure every day in range present with 0
  for (let d = new Date(from); d <= to; d = new Date(d.getTime()+24*60*60*1000)){
    const key = fmt(d)
    if (!revByDay.has(key)) revByDay.set(key, 0)
  }
  const dailyRevenue = Array.from(revByDay.entries()).sort((a,b)=> a[0]<b[0]? -1 : 1).map(([date,value])=>({ date, value }))

  // Expenses filter by date string
  const expFromTo = expensesInRange.filter(e=>{
    const d = parseDateOnly((e as any).date)
    return !!d && d >= from && d <= to
  })
  const totalExpenses = expFromTo.reduce((s:any,e:any)=> s + Number(e.amount||0), 0)

  // Purchases filter by date string
  const purFromTo = purchasesAll.filter(p=>{
    const d = parseDateOnly((p as any).date)
    return !!d && d >= from && d <= to
  })
  const totalPurchases = purFromTo.length
  const totalPurchasesAmount = purFromTo.reduce((s:any,p:any)=> s + Number((p.totals?.net ?? p.totalAmount) || 0), 0)

  // Match for aggregations - include non-corporate AND corporate with co-pay
  const match: any = {
    $or: [
      { corporateId: { $exists: false } },
      { corporateId: { $exists: true }, net: { $gt: 0 } },
    ],
  }
  if (from || to) {
    match.createdAt = {}
    if (from) match.createdAt.$gte = from
    if (to) match.createdAt.$lte = to
  }
  // Token-wise received/receivable (avoid multiplying by per-test rows)
  const tokenPayAgg = await LabOrder.aggregate([
    { $match: match },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$tokenNo',
        receivedAmount: { $first: '$receivedAmount' },
        receivableAmount: { $first: '$receivableAmount' },
      },
    },
    {
      $group: {
        _id: null,
        totalReceived: { $sum: '$receivedAmount' },
        totalReceivable: { $sum: '$receivableAmount' },
      },
    },
  ])
  // Add unconverted tokens received/receivable
  const tokenAggMatch: any = {
    status: 'token_generated',
    $or: [
      { corporateId: { $exists: false } },
      { corporateId: { $exists: true }, net: { $gt: 0 } },
    ],
  }
  if (from || to) {
    tokenAggMatch.createdAt = {}
    if (from) tokenAggMatch.createdAt.$gte = from
    if (to) tokenAggMatch.createdAt.$lte = to
  }
  if (collectionCenterId) tokenAggMatch.collectionCenterId = collectionCenterId
  if (wardId) tokenAggMatch.wardId = wardId
  if (referringDoctorId) tokenAggMatch.referringDoctorId = referringDoctorId
  const tokenStageAgg = await LabToken.aggregate([
    { $match: tokenAggMatch },
    {
      $group: {
        _id: null,
        totalReceived: { $sum: { $ifNull: ['$receivedAmount', 0] } },
        totalReceivable: { $sum: { $ifNull: ['$receivableAmount', 0] } },
      },
    },
  ])
  const totalReceived = Number(tokenPayAgg?.[0]?.totalReceived || 0) + Number(tokenStageAgg?.[0]?.totalReceived || 0)
  const totalReceivable = Number(tokenPayAgg?.[0]?.totalReceivable || 0) + Number(tokenStageAgg?.[0]?.totalReceivable || 0)
  const finalRevenue = totalRevenue

  res.json({
    from: from.toISOString(),
    to: to.toISOString(),
    totalTests,
    totalOrders,
    totalExpenses: Number(totalExpenses.toFixed(2)),
    totalRevenue: Number(finalRevenue.toFixed(2)),
    pendingResults,
    pendingApproval,
    completedTests,
    totalPurchases,
    totalPurchasesAmount: Number(totalPurchasesAmount.toFixed(2)),
    dailyRevenue,
    totalReceived,
    totalReceivable,
    comparison: [
      { label: 'Revenue', value: Number(finalRevenue.toFixed(2)) },
      { label: 'Expenses', value: Number(totalExpenses.toFixed(2)) },
      { label: 'Purchases', value: Number(totalPurchasesAmount.toFixed(2)) },
    ],
  })
}
