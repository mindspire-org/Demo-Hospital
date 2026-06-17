import { Request, Response } from 'express'
import { z } from 'zod'
import { NurseShift } from '../models/NurseShift'
import { NurseActivityLog } from '../models/NurseActivityLog'

// Validation schemas
const createShiftSchema = z.object({
  nurseId: z.string().min(1),
  date: z.string(),
  shiftType: z.enum(['morning', 'evening', 'night']),
  startTime: z.string(),
  endTime: z.string(),
  wardAssignments: z.array(z.string()).optional(),
  bedCount: z.number().optional(),
  department: z.string().optional(),
  notes: z.string().optional()
})

const updateShiftSchema = z.object({
  wardAssignments: z.array(z.string()).optional(),
  bedCount: z.number().optional(),
  department: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['scheduled', 'checked_in', 'checked_out', 'cancelled', 'no_show']).optional()
})

const checkInSchema = z.object({
  location: z.string().optional()
})

const handoverSchema = z.object({
  notes: z.string().min(1)
})

// Helper to log activity
async function logActivity(data: {
  nurseId: string
  action: string
  entityType: string
  entityId: string
  details?: any
  performedBy?: string
}) {
  try {
    await NurseActivityLog.create({
      ...data,
      timestamp: new Date()
    })
  } catch (e) {
    console.error('Failed to log nurse activity:', e)
  }
}

// Create shift
export async function createShift(req: Request, res: Response) {
  try {
    const data = createShiftSchema.parse(req.body)
    const createdBy = (req as any).user?.id
    
    // Check for overlapping shifts
    const existingShift = await NurseShift.findOne({
      nurseId: data.nurseId,
      date: new Date(data.date),
      shiftType: data.shiftType,
      status: { $ne: 'cancelled' }
    })
    
    if (existingShift) {
      return res.status(400).json({ error: 'Nurse already has a shift for this date and time' })
    }
    
    const shift = await NurseShift.create({
      ...data,
      date: new Date(data.date),
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      wardAssignments: data.wardAssignments || [],
      bedCount: data.bedCount || 0,
      status: 'scheduled'
    })
    
    res.status(201).json(shift)
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors })
    }
    console.error('Create shift error:', e)
    res.status(500).json({ error: 'Failed to create shift' })
  }
}

// List shifts
export async function listShifts(req: Request, res: Response) {
  try {
    const {
      nurseId,
      date,
      from,
      to,
      shiftType,
      ward,
      status,
      limit = '50',
      page = '1'
    } = req.query
    
    const filter: any = {}
    
    if (nurseId) filter.nurseId = nurseId
    if (shiftType) filter.shiftType = shiftType
    if (status) filter.status = status
    
    // Date filtering
    if (date) {
      const d = new Date(date as string)
      d.setHours(0, 0, 0, 0)
      const nextDay = new Date(d)
      nextDay.setDate(nextDay.getDate() + 1)
      filter.date = { $gte: d, $lt: nextDay }
    } else if (from || to) {
      filter.date = {}
      if (from) filter.date.$gte = new Date(from as string)
      if (to) {
        const toDate = new Date(to as string)
        toDate.setHours(23, 59, 59, 999)
        filter.date.$lte = toDate
      }
    }
    
    // Ward filtering
    if (ward) {
      filter.wardAssignments = ward
    }
    
    const effectiveLimit = Math.min(Number(limit) || 50, 100)
    const currentPage = Math.max(Number(page) || 1, 1)
    const skip = (currentPage - 1) * effectiveLimit
    
    const [shifts, total] = await Promise.all([
      NurseShift.find(filter)
        .populate('nurseId', 'fullName username phone')
        .populate('handoverFrom', 'fullName username')
        .populate('handoverTo', 'fullName username')
        .sort({ date: -1, shiftType: 1 })
        .skip(skip)
        .limit(effectiveLimit)
        .lean(),
      NurseShift.countDocuments(filter)
    ])
    
    res.json({
      items: shifts,
      total,
      page: currentPage,
      totalPages: Math.ceil(total / effectiveLimit)
    })
  } catch (e) {
    console.error('List shifts error:', e)
    res.status(500).json({ error: 'Failed to list shifts' })
  }
}

// Get single shift
export async function getShift(req: Request, res: Response) {
  try {
    const { id } = req.params
    
    const shift = await NurseShift.findById(id)
      .populate('nurseId', 'fullName username phone')
      .populate('handoverFrom', 'fullName username')
      .populate('handoverTo', 'fullName username')
      .lean()
    
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }
    
    res.json(shift)
  } catch (e) {
    console.error('Get shift error:', e)
    res.status(500).json({ error: 'Failed to get shift' })
  }
}

// Update shift
export async function updateShift(req: Request, res: Response) {
  try {
    const { id } = req.params
    const data = updateShiftSchema.parse(req.body)
    
    const shift = await NurseShift.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true }
    ).populate('nurseId', 'fullName username')
    
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }
    
    res.json(shift)
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors })
    }
    console.error('Update shift error:', e)
    res.status(500).json({ error: 'Failed to update shift' })
  }
}

// Delete (cancel) shift
export async function deleteShift(req: Request, res: Response) {
  try {
    const { id } = req.params
    
    const shift = await NurseShift.findByIdAndUpdate(
      id,
      { status: 'cancelled', updatedAt: new Date() },
      { new: true }
    )
    
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }
    
    res.json({ message: 'Shift cancelled', shift })
  } catch (e) {
    console.error('Delete shift error:', e)
    res.status(500).json({ error: 'Failed to cancel shift' })
  }
}

// Check in
export async function checkIn(req: Request, res: Response) {
  try {
    const { id } = req.params
    const data = checkInSchema.parse(req.body)
    const nurseId = (req as any).user?.id
    
    const shift = await NurseShift.findById(id)
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }
    
    if (shift.nurseId.toString() !== nurseId) {
      return res.status(403).json({ error: 'Not your shift' })
    }
    
    const now = new Date()
    const scheduledStart = new Date(shift.startTime)
    const lateMinutes = Math.max(0, Math.round((now.getTime() - scheduledStart.getTime()) / 60000))
    
    shift.status = 'checked_in'
    shift.checkInAt = now
    shift.checkInLocation = data.location
    shift.lateMinutes = lateMinutes
    
    await shift.save()
    
    // Log activity
    await logActivity({
      nurseId,
      action: 'shift_checked_in',
      entityType: 'shift',
      entityId: id,
      details: {
        shiftType: shift.shiftType,
        lateMinutes,
        location: data.location
      },
      performedBy: nurseId
    })
    
    res.json(shift)
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors })
    }
    console.error('Check in error:', e)
    res.status(500).json({ error: 'Failed to check in' })
  }
}

// Check out
export async function checkOut(req: Request, res: Response) {
  try {
    const { id } = req.params
    const nurseId = (req as any).user?.id
    
    const shift = await NurseShift.findById(id)
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }
    
    if (shift.nurseId.toString() !== nurseId) {
      return res.status(403).json({ error: 'Not your shift' })
    }
    
    if (shift.status !== 'checked_in') {
      return res.status(400).json({ error: 'Not checked in' })
    }
    
    const now = new Date()
    const scheduledEnd = new Date(shift.endTime)
    const earlyMinutes = Math.max(0, Math.round((scheduledEnd.getTime() - now.getTime()) / 60000))
    
    shift.status = 'checked_out'
    shift.checkOutAt = now
    shift.earlyDepartureMinutes = earlyMinutes > 0 ? earlyMinutes : 0
    
    await shift.save()
    
    // Log activity
    await logActivity({
      nurseId,
      action: 'shift_checked_out',
      entityType: 'shift',
      entityId: id,
      details: {
        shiftType: shift.shiftType,
        earlyDepartureMinutes: shift.earlyDepartureMinutes
      },
      performedBy: nurseId
    })
    
    res.json(shift)
  } catch (e) {
    console.error('Check out error:', e)
    res.status(500).json({ error: 'Failed to check out' })
  }
}

// Give handover
export async function giveHandover(req: Request, res: Response) {
  try {
    const { id } = req.params
    const data = handoverSchema.parse(req.body)
    const nurseId = (req as any).user?.id
    
    const shift = await NurseShift.findById(id)
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }
    
    if (shift.nurseId.toString() !== nurseId) {
      return res.status(403).json({ error: 'Not your shift' })
    }
    
    shift.handoverToNotes = data.notes
    shift.handoverCompleted = true
    shift.handoverCompletedAt = new Date()
    
    await shift.save()
    
    // Log activity
    await logActivity({
      nurseId,
      action: 'handover_given',
      entityType: 'shift',
      entityId: id,
      details: {
        shiftType: shift.shiftType
      },
      performedBy: nurseId
    })
    
    res.json(shift)
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors })
    }
    console.error('Give handover error:', e)
    res.status(500).json({ error: 'Failed to give handover' })
  }
}

// Receive handover
export async function receiveHandover(req: Request, res: Response) {
  try {
    const { id } = req.params
    const data = handoverSchema.parse(req.body)
    const nurseId = (req as any).user?.id
    
    const shift = await NurseShift.findById(id)
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' })
    }
    
    if (shift.nurseId.toString() !== nurseId) {
      return res.status(403).json({ error: 'Not your shift' })
    }
    
    shift.handoverFromNotes = data.notes
    
    await shift.save()
    
    // Log activity
    await logActivity({
      nurseId,
      action: 'handover_received',
      entityType: 'shift',
      entityId: id,
      details: {
        shiftType: shift.shiftType
      },
      performedBy: nurseId
    })
    
    res.json(shift)
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors })
    }
    console.error('Receive handover error:', e)
    res.status(500).json({ error: 'Failed to receive handover' })
  }
}

// Get current shift for nurse
export async function getCurrentShift(req: Request, res: Response) {
  try {
    const nurseId = (req as any).user?.id
    
    if (!nurseId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const shift = await NurseShift.findOne({
      nurseId,
      date: { $gte: today, $lt: tomorrow },
      status: { $in: ['scheduled', 'checked_in'] }
    })
      .populate('nurseId', 'fullName username')
      .populate('handoverFrom', 'fullName username')
      .lean()
    
    if (!shift) {
      return res.json(null)
    }
    
    res.json(shift)
  } catch (e) {
    console.error('Get current shift error:', e)
    res.status(500).json({ error: 'Failed to get current shift' })
  }
}

// Get my shifts (for logged in nurse)
export async function getMyShifts(req: Request, res: Response) {
  try {
    const nurseId = (req as any).user?.id
    
    if (!nurseId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    const { from, to, limit = '50' } = req.query
    
    const filter: any = { nurseId }
    
    if (from || to) {
      filter.date = {}
      if (from) filter.date.$gte = new Date(from as string)
      if (to) {
        const toDate = new Date(to as string)
        toDate.setHours(23, 59, 59, 999)
        filter.date.$lte = toDate
      }
    }
    
    const shifts = await NurseShift.find(filter)
      .sort({ date: -1 })
      .limit(Number(limit))
      .lean()
    
    res.json({ items: shifts, total: shifts.length })
  } catch (e) {
    console.error('Get my shifts error:', e)
    res.status(500).json({ error: 'Failed to get shifts' })
  }
}

// Get ward schedule (all nurses for a ward on a date)
export async function getWardSchedule(req: Request, res: Response) {
  try {
    const { ward, date } = req.query
    
    if (!ward || !date) {
      return res.status(400).json({ error: 'Ward and date are required' })
    }
    
    const queryDate = new Date(date as string)
    queryDate.setHours(0, 0, 0, 0)
    const nextDay = new Date(queryDate)
    nextDay.setDate(nextDay.getDate() + 1)
    
    const shifts = await NurseShift.find({
      wardAssignments: ward as string,
      date: { $gte: queryDate, $lt: nextDay },
      status: { $ne: 'cancelled' }
    })
      .populate('nurseId', 'fullName username phone')
      .sort({ shiftType: 1 })
      .lean()
    
    // Group by shift type
    const grouped = {
      morning: shifts.filter(s => s.shiftType === 'morning'),
      evening: shifts.filter(s => s.shiftType === 'evening'),
      night: shifts.filter(s => s.shiftType === 'night')
    }
    
    res.json({
      ward,
      date: queryDate,
      shifts: grouped,
      total: shifts.length
    })
  } catch (e) {
    console.error('Get ward schedule error:', e)
    res.status(500).json({ error: 'Failed to get ward schedule' })
  }
}
