import { Request, Response } from 'express'
import { Shift, ShiftDoc } from '../models/Shift'
import { Types } from 'mongoose'

// Helper to round to 2 decimals
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

// Get all shifts with filters
export async function listShifts(req: Request, res: Response) {
  try {
    const { counterId, status, from, to, shiftType, page = '1', limit = '20' } = req.query as any
    
    const filter: any = {}
    if (counterId) filter.counterId = counterId
    if (status) filter.status = status
    if (shiftType) filter.shiftType = shiftType
    if (from && to) {
      filter.startTime = {
        $gte: new Date(from),
        $lte: new Date(to)
      }
    }
    
    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.max(1, parseInt(limit))
    const skip = (pageNum - 1) * limitNum
    
    const [shifts, total] = await Promise.all([
      Shift.find(filter)
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Shift.countDocuments(filter)
    ])
    
    res.json({
      shifts,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to list shifts' })
  }
}

// Get current active shift for a counter
export async function getCurrentShift(req: Request, res: Response) {
  try {
    const { counterId } = req.query as any
    
    if (!counterId) {
      return res.status(400).json({ error: 'counterId is required' })
    }
    
    const shift = await Shift.findOne({
      counterId,
      status: { $in: ['open', 'closing'] }
    }).sort({ startTime: -1 }).lean()
    
    if (!shift) {
      return res.json({ shift: null, message: 'No active shift found' })
    }
    
    res.json({ shift })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get current shift' })
  }
}

// Open a new shift
export async function openShift(req: Request, res: Response) {
  try {
    const {
      shiftType,
      shiftName,
      counterId,
      counterName,
      openingFloat = 0,
      notes
    } = req.body
    
    if (!shiftType || !counterId || !counterName) {
      return res.status(400).json({ 
        error: 'shiftType, counterId, and counterName are required' 
      })
    }
    
    // Check if there's already an open shift for this counter
    const existingOpen = await Shift.findOne({
      counterId,
      status: { $in: ['open', 'closing'] }
    })
    
    if (existingOpen) {
      return res.status(400).json({
        error: 'There is already an active shift for this counter',
        existingShift: existingOpen
      })
    }
    
    const user = (req as any).user
    const userId = String(user?._id || user?.id || user?.sub || 'unknown')
    const username = String(user?.username || user?.name || user?.fullName || user?.email || 'Unknown')
    
    const shift = await Shift.create({
      shiftType,
      shiftName: shiftName || `${shiftType} Shift`,
      counterId,
      counterName,
      openingFloat: round2(openingFloat),
      openedBy: {
        userId,
        username,
        at: new Date()
      },
      startTime: new Date(),
      status: 'open',
      notes,
      collections: {
        opd: 0, lab: 0, pharmacy: 0, ipd: 0, er: 0,
        diagnostic: 0, dialysis: 0, aesthetic: 0, total: 0
      },
      expenses: {
        doctorPayouts: 0, purchases: 0, pettyCash: 0, refunds: 0, total: 0
      },
      expectedCash: round2(openingFloat),
      actualCash: 0,
      variance: 0,
      vouchers: [],
      attachments: []
    })
    
    res.status(201).json({
      message: 'Shift opened successfully',
      shift
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to open shift' })
  }
}

// Update shift collections (called when revenue is collected)
export async function updateShiftCollections(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { module, amount } = req.body
    
    if (!module || !amount || amount <= 0) {
      return res.status(400).json({ error: 'module and positive amount are required' })
    }
    
    const validModules = ['opd', 'lab', 'pharmacy', 'ipd', 'er', 'diagnostic', 'dialysis', 'aesthetic']
    if (!validModules.includes(module)) {
      return res.status(400).json({ error: `module must be one of: ${validModules.join(', ')}` })
    }
    
    const shift = await Shift.findById(id)
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }
    
    if (shift.status !== 'open') {
      return res.status(400).json({ error: 'Can only update collections for open shifts' })
    }
    
    // Update collection for the specific module
    ;(shift.collections as any)[module] = round2((shift.collections as any)[module] + amount)
    shift.collections.total = round2(
      shift.collections.opd + shift.collections.lab + shift.collections.pharmacy +
      shift.collections.ipd + shift.collections.er + shift.collections.diagnostic +
      shift.collections.dialysis + shift.collections.aesthetic
    )
    
    // Recalculate expected cash
    shift.expectedCash = round2(shift.openingFloat + shift.collections.total - shift.expenses.total)
    
    await shift.save()
    
    res.json({
      message: 'Collections updated',
      shift: await Shift.findById(id).lean()
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update collections' })
  }
}

// Update shift expenses
export async function updateShiftExpenses(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { type, amount } = req.body
    
    if (!type || !amount || amount <= 0) {
      return res.status(400).json({ error: 'type and positive amount are required' })
    }
    
    const validTypes = ['doctorPayouts', 'purchases', 'pettyCash', 'refunds']
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` })
    }
    
    const shift = await Shift.findById(id)
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }
    
    if (shift.status !== 'open') {
      return res.status(400).json({ error: 'Can only update expenses for open shifts' })
    }
    
    // Update expense
    ;(shift.expenses as any)[type] = round2((shift.expenses as any)[type] + amount)
    shift.expenses.total = round2(
      shift.expenses.doctorPayouts + shift.expenses.purchases +
      shift.expenses.pettyCash + shift.expenses.refunds
    )
    
    // Recalculate expected cash
    shift.expectedCash = round2(shift.openingFloat + shift.collections.total - shift.expenses.total)
    
    await shift.save()
    
    res.json({
      message: 'Expenses updated',
      shift: await Shift.findById(id).lean()
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update expenses' })
  }
}

// Close shift (initiate closing process)
export async function closeShift(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { actualCash, notes } = req.body
    
    if (actualCash === undefined || actualCash === null) {
      return res.status(400).json({ error: 'actualCash is required' })
    }
    
    const shift = await Shift.findById(id)
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }
    
    if (shift.status !== 'open') {
      return res.status(400).json({ error: 'Can only close open shifts' })
    }
    
    const user = (req as any).user
    const userId = String(user?._id || user?.id || user?.sub || 'unknown')
    const username = String(user?.username || user?.name || user?.fullName || user?.email || 'Unknown')
    
    // Calculate variance
    const actual = round2(Number(actualCash))
    const expected = shift.expectedCash
    const variance = round2(actual - expected)
    
    shift.actualCash = actual
    shift.variance = variance
    shift.status = variance !== 0 ? 'closing' : 'closed'
    
    shift.closedBy = {
      userId,
      username,
      at: new Date()
    }
    
    shift.endTime = new Date()
    
    if (notes) {
      shift.notes = shift.notes ? `${shift.notes}\n${notes}` : notes
    }
    
    await shift.save()
    
    res.json({
      message: variance !== 0 
        ? 'Shift closing initiated. Variance detected - requires approval.' 
        : 'Shift closed successfully',
      shift: await Shift.findById(id).lean(),
      variance,
      requiresApproval: variance !== 0
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to close shift' })
  }
}

// Approve shift closure (for variances)
export async function approveShiftClosure(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { varianceReason } = req.body
    
    const shift = await Shift.findById(id)
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }
    
    if (shift.status !== 'closing') {
      return res.status(400).json({ error: 'Can only approve shifts in closing status' })
    }
    
    if (!varianceReason && shift.variance !== 0) {
      return res.status(400).json({ error: 'varianceReason is required when there is a variance' })
    }
    
    const user = (req as any).user
    
    shift.status = 'closed'
    shift.varianceReason = varianceReason
    shift.handoverTo = {
      userId: String(user?._id || user?.id || 'unknown'),
      username: String(user?.username || user?.name || 'Unknown'),
      at: new Date()
    }
    
    await shift.save()
    
    res.json({
      message: 'Shift closure approved',
      shift: await Shift.findById(id).lean()
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to approve shift closure' })
  }
}

// Get shift by ID
export async function getShift(req: Request, res: Response) {
  try {
    const { id } = req.params
    
    const shift = await Shift.findById(id).lean()
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }
    
    res.json({ shift })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get shift' })
  }
}

// Get shift summary report
export async function getShiftSummary(req: Request, res: Response) {
  try {
    const { from, to, counterId } = req.query as any
    
    const match: any = { status: { $in: ['closed', 'reconciled'] } }
    if (from && to) {
      match.startTime = {
        $gte: new Date(from),
        $lte: new Date(to)
      }
    }
    if (counterId) match.counterId = counterId
    
    const summary = await Shift.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalShifts: { $sum: 1 },
          totalOpeningFloat: { $sum: '$openingFloat' },
          totalCollections: { $sum: '$collections.total' },
          totalExpenses: { $sum: '$expenses.total' },
          totalActualCash: { $sum: '$actualCash' },
          totalVariance: { $sum: '$variance' },
          avgVariance: { $avg: '$variance' },
          shiftsWithVariance: {
            $sum: { $cond: [{ $ne: ['$variance', 0] }, 1, 0] }
          },
          byShiftType: {
            $push: {
              k: '$shiftType',
              v: {
                collections: '$collections.total',
                expenses: '$expenses.total',
                variance: '$variance'
              }
            }
          }
        }
      }
    ])
    
    // Get daily breakdown
    const dailyBreakdown = await Shift.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: '$startTime' },
            month: { $month: '$startTime' },
            day: { $dayOfMonth: '$startTime' }
          },
          date: { $first: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } } },
          shifts: { $sum: 1 },
          collections: { $sum: '$collections.total' },
          expenses: { $sum: '$expenses.total' },
          variance: { $sum: '$variance' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
      { $limit: 30 }
    ])
    
    res.json({
      summary: summary[0] || null,
      dailyBreakdown,
      period: { from, to }
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get shift summary' })
  }
}

// Get shift comparison (compare multiple shifts)
export async function compareShifts(req: Request, res: Response) {
  try {
    const { shiftIds } = req.body as { shiftIds: string[] }
    
    if (!Array.isArray(shiftIds) || shiftIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 shiftIds are required' })
    }
    
    const shifts = await Shift.find({
      _id: { $in: shiftIds.map(id => new Types.ObjectId(id)) }
    }).lean()
    
    // Calculate averages and totals
    const totals = shifts.reduce((acc, shift) => ({
      collections: acc.collections + shift.collections.total,
      expenses: acc.expenses + shift.expenses.total,
      variance: acc.variance + shift.variance,
      count: acc.count + 1
    }), { collections: 0, expenses: 0, variance: 0, count: 0 })
    
    res.json({
      shifts,
      comparison: {
        totalShifts: totals.count,
        avgCollections: round2(totals.collections / totals.count),
        avgExpenses: round2(totals.expenses / totals.count),
        avgVariance: round2(totals.variance / totals.count),
        totalCollections: round2(totals.collections),
        totalExpenses: round2(totals.expenses),
        totalVariance: round2(totals.variance)
      }
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to compare shifts' })
  }
}

// Reconcile shift (mark as fully reconciled)
export async function reconcileShift(req: Request, res: Response) {
  try {
    const { id } = req.params
    
    const shift = await Shift.findById(id)
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }
    
    if (shift.status !== 'closed') {
      return res.status(400).json({ error: 'Can only reconcile closed shifts' })
    }
    
    shift.status = 'reconciled'
    await shift.save()
    
    res.json({
      message: 'Shift reconciled successfully',
      shift: await Shift.findById(id).lean()
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to reconcile shift' })
  }
}
