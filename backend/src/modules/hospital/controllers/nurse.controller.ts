import { Request, Response } from 'express'
import { z } from 'zod'
import { NurseProfile } from '../models/NurseProfile'
import { NurseTask } from '../models/NurseTask'
import { NurseShift } from '../models/NurseShift'
import { NurseActivityLog } from '../models/NurseActivityLog'
import { NursePerformance } from '../models/NursePerformance'
import { HospitalUser } from '../models/User'

// Validation schemas
const createProfileSchema = z.object({
  userId: z.string().min(1),
  licenseNumber: z.string().min(1),
  specialization: z.enum(['General Ward', 'ICU', 'OT', 'Emergency', 'Pediatrics', 'Oncology', 'Cardiology', 'Orthopedics', 'Neurology', 'NICU', 'Dialysis', 'None']).optional(),
  department: z.string().optional(),
  shiftPreference: z.enum(['morning', 'evening', 'night', 'rotating']).optional(),
  maxPatientsPerShift: z.number().min(1).max(50).optional(),
  certifications: z.array(z.string()).optional(),
  joiningDate: z.string().optional(),
  contactInfo: z.object({
    phone: z.string().optional(),
    emergencyContact: z.string().optional(),
    address: z.string().optional()
  }).optional(),
  qualifications: z.array(z.object({
    degree: z.string(),
    institution: z.string(),
    year: z.number()
  })).optional(),
  notes: z.string().optional()
})

const updateProfileSchema = z.object({
  licenseNumber: z.string().min(1).optional(),
  specialization: z.enum(['General Ward', 'ICU', 'OT', 'Emergency', 'Pediatrics', 'Oncology', 'Cardiology', 'Orthopedics', 'Neurology', 'NICU', 'Dialysis', 'None']).optional(),
  department: z.string().optional(),
  shiftPreference: z.enum(['morning', 'evening', 'night', 'rotating']).optional(),
  maxPatientsPerShift: z.number().min(1).max(50).optional(),
  certifications: z.array(z.string()).optional(),
  contactInfo: z.object({
    phone: z.string().optional(),
    emergencyContact: z.string().optional(),
    address: z.string().optional()
  }).optional(),
  qualifications: z.array(z.object({
    degree: z.string(),
    institution: z.string(),
    year: z.number()
  })).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional()
})

// Helper to generate task ID
function generateTaskId(): string {
  const prefix = 'TSK'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

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

// Create nurse profile
export async function createProfile(req: Request, res: Response) {
  try {
    const data = createProfileSchema.parse(req.body)
    
    // Check if profile already exists
    const existing = await NurseProfile.findOne({ userId: data.userId })
    if (existing) {
      return res.status(400).json({ error: 'Nurse profile already exists for this user' })
    }
    
    // Verify user exists
    const user = await HospitalUser.findById(data.userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    const profile = await NurseProfile.create({
      ...data,
      joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date()
    })
    
    // Log activity
    await logActivity({
      nurseId: data.userId,
      action: 'profile_updated',
      entityType: 'profile',
      entityId: profile._id.toString(),
      performedBy: (req as any).user?.id
    })
    
    res.status(201).json(profile)
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors })
    }
    console.error('Create nurse profile error:', e)
    res.status(500).json({ error: 'Failed to create nurse profile' })
  }
}

// List all nurse profiles
export async function listProfiles(req: Request, res: Response) {
  try {
    const { specialization, department, isActive, limit = '50', page = '1' } = req.query
    
    const filter: any = {}
    if (specialization) filter.specialization = specialization
    if (department) filter.department = department
    if (isActive !== undefined) filter.isActive = isActive === 'true'
    
    const effectiveLimit = Math.min(Number(limit) || 50, 100)
    const currentPage = Math.max(Number(page) || 1, 1)
    const skip = (currentPage - 1) * effectiveLimit
    
    const [profiles, total] = await Promise.all([
      NurseProfile.find(filter)
        .populate('userId', 'fullName username email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(effectiveLimit)
        .lean(),
      NurseProfile.countDocuments(filter)
    ])
    
    res.json({
      items: profiles,
      total,
      page: currentPage,
      totalPages: Math.ceil(total / effectiveLimit)
    })
  } catch (e) {
    console.error('List nurse profiles error:', e)
    res.status(500).json({ error: 'Failed to list nurse profiles' })
  }
}

// Get single nurse profile
export async function getProfile(req: Request, res: Response) {
  try {
    const { id } = req.params
    
    const profile = await NurseProfile.findById(id)
      .populate('userId', 'fullName username email phone active')
      .lean()
    
    if (!profile) {
      return res.status(404).json({ error: 'Nurse profile not found' })
    }
    
    res.json(profile)
  } catch (e) {
    console.error('Get nurse profile error:', e)
    res.status(500).json({ error: 'Failed to get nurse profile' })
  }
}

// Get profile by user ID
export async function getProfileByUserId(req: Request, res: Response) {
  try {
    const { userId } = req.params
    
    const profile = await NurseProfile.findOne({ userId })
      .populate('userId', 'fullName username email phone active')
      .lean()
    
    if (!profile) {
      return res.status(404).json({ error: 'Nurse profile not found' })
    }
    
    res.json(profile)
  } catch (e) {
    console.error('Get nurse profile error:', e)
    res.status(500).json({ error: 'Failed to get nurse profile' })
  }
}

// Update nurse profile
export async function updateProfile(req: Request, res: Response) {
  try {
    const { id } = req.params
    const data = updateProfileSchema.parse(req.body)
    
    const profile = await NurseProfile.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true }
    ).populate('userId', 'fullName username email phone')
    
    if (!profile) {
      return res.status(404).json({ error: 'Nurse profile not found' })
    }
    
    // Log activity
    await logActivity({
      nurseId: profile.userId.toString(),
      action: 'profile_updated',
      entityType: 'profile',
      entityId: id,
      performedBy: (req as any).user?.id
    })
    
    res.json(profile)
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors })
    }
    console.error('Update nurse profile error:', e)
    res.status(500).json({ error: 'Failed to update nurse profile' })
  }
}

// Delete (deactivate) nurse profile
export async function deleteProfile(req: Request, res: Response) {
  try {
    const { id } = req.params
    
    const profile = await NurseProfile.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    )
    
    if (!profile) {
      return res.status(404).json({ error: 'Nurse profile not found' })
    }
    
    res.json({ message: 'Nurse profile deactivated', profile })
  } catch (e) {
    console.error('Delete nurse profile error:', e)
    res.status(500).json({ error: 'Failed to delete nurse profile' })
  }
}

// Get available nurses (for assignment)
export async function getAvailableNurses(req: Request, res: Response) {
  try {
    const { specialization, department, shift, date } = req.query
    
    const filter: any = { isActive: true }
    if (specialization) filter.specialization = specialization
    if (department) filter.department = department
    
    // Get nurses
    const nurses = await NurseProfile.find(filter)
      .populate('userId', 'fullName username phone')
      .lean()
    
    // If date and shift provided, filter by availability
    let availableNurses = nurses
    if (date && shift) {
      const shiftDate = new Date(date as string)
      const shiftType = shift as string
      
      // Get nurses already assigned to this shift
      const assignedNurses = await NurseShift.find({
        date: {
          $gte: new Date(shiftDate.setHours(0, 0, 0, 0)),
          $lt: new Date(shiftDate.setHours(23, 59, 59, 999))
        },
        shiftType,
        status: { $in: ['scheduled', 'checked_in'] }
      }).distinct('nurseId')
      
      const assignedNurseIds = assignedNurses.map(id => id.toString())
      availableNurses = nurses.filter(n => !assignedNurseIds.includes(n.userId._id.toString()))
    }
    
    res.json({ items: availableNurses, total: availableNurses.length })
  } catch (e) {
    console.error('Get available nurses error:', e)
    res.status(500).json({ error: 'Failed to get available nurses' })
  }
}

// Get nurse dashboard stats
export async function getDashboardStats(req: Request, res: Response) {
  try {
    const nurseId = (req as any).user?.id
    
    if (!nurseId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    // Get today's shift
    const currentShift = await NurseShift.findOne({
      nurseId,
      date: { $gte: today, $lt: tomorrow },
      status: { $in: ['scheduled', 'checked_in'] }
    }).lean()
    
    // Get task counts
    const [
      pendingTasks,
      inProgressTasks,
      completedToday,
      overdueTasks
    ] = await Promise.all([
      NurseTask.countDocuments({ assignedTo: nurseId, status: 'pending' }),
      NurseTask.countDocuments({ assignedTo: nurseId, status: 'in_progress' }),
      NurseTask.countDocuments({
        assignedTo: nurseId,
        status: 'completed',
        completedAt: { $gte: today, $lt: tomorrow }
      }),
      NurseTask.countDocuments({
        assignedTo: nurseId,
        status: { $in: ['pending', 'in_progress'] },
        dueTime: { $lt: new Date() }
      })
    ])
    
    // Get patients under care
    const patientsUnderCare = await NurseTask.distinct('patientId', {
      assignedTo: nurseId,
      status: { $in: ['pending', 'in_progress'] }
    })
    
    res.json({
      currentShift,
      tasks: {
        pending: pendingTasks,
        inProgress: inProgressTasks,
        completedToday,
        overdue: overdueTasks,
        total: pendingTasks + inProgressTasks
      },
      patientsUnderCare: patientsUnderCare.length,
      lastUpdated: new Date()
    })
  } catch (e) {
    console.error('Get dashboard stats error:', e)
    res.status(500).json({ error: 'Failed to get dashboard stats' })
  }
}

// Get nurses by ward (for ward assignment)
export async function getNursesByWard(req: Request, res: Response) {
  try {
    const { ward, date } = req.query
    
    if (!ward || !date) {
      return res.status(400).json({ error: 'Ward and date are required' })
    }
    
    const queryDate = new Date(date as string)
    queryDate.setHours(0, 0, 0, 0)
    const nextDay = new Date(queryDate)
    nextDay.setDate(nextDay.getDate() + 1)
    
    // Get shifts for this ward on this date
    const shifts = await NurseShift.find({
      wardAssignments: ward as string,
      date: { $gte: queryDate, $lt: nextDay },
      status: { $in: ['scheduled', 'checked_in'] }
    }).populate('nurseId', 'fullName username phone').lean()
    
    const nurses = shifts.map(s => ({
      ...s.nurseId,
      shiftType: s.shiftType,
      bedCount: s.bedCount,
      status: s.status,
      checkInAt: s.checkInAt
    }))
    
    res.json({ items: nurses, total: nurses.length })
  } catch (e) {
    console.error('Get nurses by ward error:', e)
    res.status(500).json({ error: 'Failed to get nurses by ward' })
  }
}

// Get nurse admin dashboard (admin-level overview)
export async function getNurseAdminDashboard(req: Request, res: Response) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get all nurses
    const totalNurses = await NurseProfile.countDocuments({ isActive: true })
    const activeNurses = await NurseProfile.countDocuments({ isActive: true })

    // Get today's shifts
    const todayShifts = await NurseShift.find({
      date: { $gte: today, $lt: tomorrow },
      status: { $in: ['scheduled', 'checked_in'] }
    }).lean()

    const checkedInNurses = todayShifts.filter(s => s.status === 'checked_in').length
    const onDutyNurses = todayShifts.length

    // Get task counts
    const [
      pendingTasks,
      completedToday,
      overdueTasks,
      statTasks
    ] = await Promise.all([
      NurseTask.countDocuments({ status: 'pending' }),
      NurseTask.countDocuments({
        status: 'completed',
        completedAt: { $gte: today, $lt: tomorrow }
      }),
      NurseTask.countDocuments({
        status: { $in: ['pending', 'in_progress'] },
        dueTime: { $lt: new Date() }
      }),
      NurseTask.countDocuments({ priority: 'stat', status: { $in: ['pending', 'in_progress'] } })
    ])

    // Get recent tasks with details
    const recentTasks = await NurseTask.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('assignedTo', 'fullName')
      .populate('patientId', 'name mrn')
      .lean()

    // Get ward coverage
    const wardShifts = await NurseShift.find({
      date: { $gte: today, $lt: tomorrow },
      status: 'checked_in'
    }).lean()

    const wardMap = new Map()
    for (const shift of wardShifts) {
      for (const ward of (shift as any).wardAssignments || []) {
        const current = wardMap.get(ward) || { nurses: 0, patients: 0 }
        current.nurses += 1
        wardMap.set(ward, current)
      }
    }

    const wardCoverage = Array.from(wardMap.entries()).map(([ward, data]) => ({
      ward,
      nurses: data.nurses,
      patients: data.patients
    }))

    res.json({
      totalNurses,
      activeNurses,
      onDutyNurses,
      pendingTasks,
      completedTasks: completedToday,
      overdueTasks,
      statTasks,
      todayShifts: onDutyNurses,
      checkedInNurses,
      averageResponseTime: 0, // calculated from task acceptance times
      wardCoverage,
      recentTasks: recentTasks.map((t: any) => ({
        _id: String(t._id),
        taskType: t.taskType,
        patientName: t.patientId?.name || 'Unknown',
        priority: t.priority,
        status: t.status,
        assignedToName: t.assignedTo?.fullName || 'Unassigned',
        dueTime: t.dueTime
      })),
      lastUpdated: new Date()
    })
  } catch (e) {
    console.error('Get nurse admin dashboard error:', e)
    res.status(500).json({ error: 'Failed to get admin dashboard' })
  }
}
