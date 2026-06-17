import { Request, Response } from 'express'
import { z } from 'zod'
import { NursePerformance } from '../models/NursePerformance'
import { NurseTask, NurseTaskDoc } from '../models/NurseTask'
import { NurseShift, NurseShiftDoc } from '../models/NurseShift'
import { NurseActivityLog, NurseActivityLogDoc } from '../models/NurseActivityLog'

// Validation schemas
const calculatePerformanceSchema = z.object({
  nurseId: z.string().min(1),
  period: z.enum(['daily', 'weekly', 'monthly']),
  date: z.string()
})

const updateSupervisorRatingSchema = z.object({
  supervisorRating: z.number().min(0).max(5),
  supervisorComments: z.string().optional()
})

// Calculate performance for a nurse
export async function calculatePerformance(req: Request, res: Response) {
  try {
    const data = calculatePerformanceSchema.parse(req.body)
    const { nurseId, period, date } = data
    
    const targetDate = new Date(date)
    const startDate = new Date(targetDate)
    const endDate = new Date(targetDate)
    
    // Set date range based on period
    if (period === 'daily') {
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
    } else if (period === 'weekly') {
      const dayOfWeek = startDate.getDay()
      startDate.setDate(startDate.getDate() - dayOfWeek)
      startDate.setHours(0, 0, 0, 0)
      endDate.setDate(startDate.getDate() + 6)
      endDate.setHours(23, 59, 59, 999)
    } else {
      // Monthly
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)
      endDate.setMonth(endDate.getMonth() + 1)
      endDate.setDate(0)
      endDate.setHours(23, 59, 59, 999)
    }
    
    // Get all tasks in period
    const tasks = await NurseTask.find({
      assignedTo: nurseId,
      assignedAt: { $gte: startDate, $lte: endDate }
    }).lean() as unknown as NurseTaskDoc[]
    
    // Get all shifts in period
    const shifts = await NurseShift.find({
      nurseId,
      date: { $gte: startDate, $lte: endDate }
    }).lean() as unknown as NurseShiftDoc[]
    
    // Get activity logs for additional metrics
    const activityLogs = await NurseActivityLog.find({
      nurseId,
      timestamp: { $gte: startDate, $lte: endDate }
    }).lean() as unknown as NurseActivityLogDoc[]
    
    // Calculate metrics
    const totalTasksAssigned = tasks.length
    const totalTasksCompleted = tasks.filter(t => t.status === 'completed').length
    const totalTasksPending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length
    const totalTasksOverdue = tasks.filter(t => t.status !== 'completed' && t.dueTime && t.dueTime < endDate).length
    const totalTasksCancelled = tasks.filter(t => t.status === 'cancelled').length
    
    // Completion rate
    const completionRate = totalTasksAssigned > 0 
      ? Math.round((totalTasksCompleted / totalTasksAssigned) * 100) 
      : 0
    
    // Time metrics
    let totalResponseTime = 0
    let totalCompletionTime = 0
    let responseCount = 0
    let completionCount = 0
    
    tasks.forEach(task => {
      if (task.assignedAt && task.status === 'in_progress') {
        // Estimate acceptance time based on activity log if available
        const acceptLog = activityLogs.find(log => 
          log.action === 'task_accepted' && 
          log.entityId.toString() === task._id.toString()
        )
        if (acceptLog) {
          const responseTime = Math.round((acceptLog.timestamp.getTime() - task.assignedAt.getTime()) / 60000)
          if (responseTime > 0 && responseTime < 240) { // Max 4 hours
            totalResponseTime += responseTime
            responseCount++
          }
        }
      }
      
      if (task.assignedAt && task.completedAt) {
        const completionTime = Math.round((task.completedAt.getTime() - task.assignedAt.getTime()) / 60000)
        if (completionTime > 0 && completionTime < 480) { // Max 8 hours
          totalCompletionTime += completionTime
          completionCount++
        }
      }
    })
    
    const avgResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0
    const avgCompletionTime = completionCount > 0 ? Math.round(totalCompletionTime / completionCount) : 0
    
    // Shift metrics
    const shiftsScheduled = shifts.filter(s => s.status !== 'cancelled').length
    const shiftsWorked = shifts.filter(s => s.status === 'checked_out').length
    const shiftsCancelled = shifts.filter(s => s.status === 'cancelled').length
    const lateCheckIns = shifts.filter(s => s.lateMinutes > 0).length
    const earlyCheckOuts = shifts.filter(s => s.earlyDepartureMinutes > 10).length
    const totalLateMinutes = shifts.reduce((sum, s) => sum + (s.lateMinutes || 0), 0)
    
    const attendanceRate = shiftsScheduled > 0 
      ? Math.round((shiftsWorked / shiftsScheduled) * 100) 
      : 0
    
    // Total working minutes
    let totalWorkingMinutes = 0
    shifts.forEach(shift => {
      if (shift.checkInAt && shift.checkOutAt) {
        const minutes = Math.round((shift.checkOutAt.getTime() - shift.checkInAt.getTime()) / 60000)
        if (minutes > 0 && minutes < 720) { // Max 12 hours
          totalWorkingMinutes += minutes
        }
      }
    })
    
    // Clinical metrics from tasks
    const vitalsRecorded = tasks.filter(t => t.taskType === 'vitals').length
    const medicationsAdministered = tasks.filter(t => 
      ['oral_medication', 'iv_medication', 'injection'].includes(t.taskType)
    ).length
    const injectionsGiven = tasks.filter(t => t.taskType === 'injection').length
    const ivDripsStarted = tasks.filter(t => t.taskType === 'iv_drip').length
    const dressingsDone = tasks.filter(t => t.taskType === 'dressing').length
    const ecgsDone = tasks.filter(t => t.taskType === 'ecg').length
    const proceduresCompleted = tasks.filter(t => 
      ['catheterization', 'ng_tube', 'suction', 'blood_draw'].includes(t.taskType) && 
      t.status === 'completed'
    ).length
    
    // Priority task metrics
    const statTasksCompleted = tasks.filter(t => t.priority === 'stat' && t.status === 'completed').length
    const urgentTasksCompleted = tasks.filter(t => t.priority === 'urgent' && t.status === 'completed').length
    const statTaskAvgCompletionTime = tasks
      .filter(t => t.priority === 'stat' && t.status === 'completed' && t.completedAt && t.assignedAt)
      .reduce((sum, t) => sum + (t.completedAt!.getTime() - t.assignedAt.getTime()) / 60000, 0) / 
      Math.max(1, tasks.filter(t => t.priority === 'stat' && t.status === 'completed').length)
    
    // Patient metrics
    const uniquePatients = new Set(tasks.map(t => t.patientId.toString()))
    const patientsCared = uniquePatients.size
    const avgPatientsPerShift = shiftsWorked > 0 ? Math.round((patientsCared / shiftsWorked) * 10) / 10 : 0
    
    // Handover metrics
    const handoversGiven = activityLogs.filter(log => log.action === 'handover_given').length
    const handoversReceived = activityLogs.filter(log => log.action === 'handover_received').length
    const handoverCompletionRate = shiftsWorked > 0 
      ? Math.round((handoversGiven / Math.max(1, shiftsWorked)) * 100) 
      : 0
    
    // Quality metrics from logs
    const medicationErrors = activityLogs.filter(log => log.action === 'medication_administered' && (log.details as any)?.error).length
    const documentationErrors = 0 // Would need additional tracking
    
    // Patient satisfaction (would need external input)
    const patientComplaints = 0 // Would need tracking system
    const patientCompliments = activityLogs.filter(log => (log.details as any)?.patientResponse === 'excellent').length
    const patientSatisfactionScore = totalTasksCompleted > 0 
      ? Math.min(5, Math.round((patientCompliments / Math.max(1, totalTasksCompleted)) * 50 * 10) / 10)
      : 0
    
    // Calculate component scores (0-100)
    const taskScore = Math.min(100, 
      (completionRate * 0.6) + 
      (Math.max(0, 100 - avgResponseTime) * 0.2) + 
      (Math.max(0, 100 - Math.min(avgCompletionTime, 100)) * 0.2)
    )
    
    const qualityScore = Math.min(100, 
      100 - (medicationErrors * 10) - (documentationErrors * 5)
    )
    
    const attendanceScore = Math.min(100,
      (attendanceRate * 0.7) + 
      (Math.max(0, 100 - lateCheckIns * 5) * 0.15) + 
      (Math.max(0, 100 - earlyCheckOuts * 5) * 0.15)
    )
    
    const clinicalScore = Math.min(100,
      Math.min(100, (vitalsRecorded + medicationsAdministered + proceduresCompleted) * 2)
    )
    
    const documentationScore = Math.min(100,
      100 - (documentationErrors * 10)
    )
    
    // Overall performance score (0-100)
    const performanceScore = Math.round(
      (taskScore * 0.25) + 
      (qualityScore * 0.20) + 
      (attendanceScore * 0.15) + 
      (clinicalScore * 0.20) + 
      (documentationScore * 0.10) +
      (patientSatisfactionScore * 2 * 0.10)
    )
    
    // Determine rating
    let rating: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement' | 'poor'
    if (performanceScore >= 90) rating = 'excellent'
    else if (performanceScore >= 75) rating = 'good'
    else if (performanceScore >= 60) rating = 'satisfactory'
    else if (performanceScore >= 40) rating = 'needs_improvement'
    else rating = 'poor'
    
    // Save or update performance record
    const performanceData = {
      nurseId,
      period,
      date: targetDate,
      totalTasksAssigned,
      totalTasksCompleted,
      totalTasksPending,
      totalTasksOverdue,
      totalTasksCancelled,
      completionRate,
      avgResponseTime,
      avgCompletionTime,
      totalWorkingMinutes,
      medicationErrors,
      patientComplaints,
      patientCompliments,
      documentationErrors,
      vitalsRecorded,
      medicationsAdministered,
      injectionsGiven,
      ivDripsStarted,
      dressingsDone,
      ecgsDone,
      proceduresCompleted,
      shiftsScheduled,
      shiftsWorked,
      shiftsCancelled,
      lateCheckIns,
      earlyCheckOuts,
      totalLateMinutes,
      attendanceRate,
      statTasksCompleted,
      urgentTasksCompleted,
      statTaskAvgCompletionTime: Math.round(statTaskAvgCompletionTime),
      patientsCared,
      avgPatientsPerShift,
      patientSatisfactionScore,
      handoversGiven,
      handoversReceived,
      handoverCompletionRate,
      performanceScore,
      rating,
      taskScore: Math.round(taskScore),
      qualityScore: Math.round(qualityScore),
      attendanceScore: Math.round(attendanceScore),
      clinicalScore: Math.round(clinicalScore),
      documentationScore: Math.round(documentationScore)
    }
    
    const performance = await NursePerformance.findOneAndUpdate(
      { nurseId, period, date: { $gte: startDate, $lte: endDate } },
      performanceData,
      { upsert: true, new: true }
    )
    
    res.json(performance)
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors })
    }
    console.error('Calculate performance error:', e)
    res.status(500).json({ error: 'Failed to calculate performance' })
  }
}

// Get performance for nurse
export async function getPerformance(req: Request, res: Response) {
  try {
    const { nurseId } = req.params
    const { period, from, to, limit = '30' } = req.query
    
    const filter: any = { nurseId }
    if (period) filter.period = period
    
    if (from || to) {
      filter.date = {}
      if (from) filter.date.$gte = new Date(from as string)
      if (to) {
        const toDate = new Date(to as string)
        toDate.setHours(23, 59, 59, 999)
        filter.date.$lte = toDate
      }
    }
    
    const performances = await NursePerformance.find(filter)
      .sort({ date: -1 })
      .limit(Number(limit))
      .lean()
    
    res.json({ items: performances, total: performances.length })
  } catch (e) {
    console.error('Get performance error:', e)
    res.status(500).json({ error: 'Failed to get performance' })
  }
}

// Get my performance
export async function getMyPerformance(req: Request, res: Response) {
  try {
    const nurseId = (req as any).user?.id
    
    if (!nurseId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    const { period, limit = '30' } = req.query
    
    const filter: any = { nurseId }
    if (period) filter.period = period
    
    const performances = await NursePerformance.find(filter)
      .sort({ date: -1 })
      .limit(Number(limit))
      .lean()
    
    // Get latest performance summary
    const latest = performances[0] || null
    
    // Calculate averages across all periods
    const avgScore = performances.length > 0 
      ? Math.round(performances.reduce((sum, p) => sum + p.performanceScore, 0) / performances.length)
      : 0
    
    res.json({
      items: performances,
      total: performances.length,
      latest,
      averageScore: avgScore,
      summary: latest ? {
        totalTasksCompleted: latest.totalTasksCompleted,
        completionRate: latest.completionRate,
        attendanceRate: latest.attendanceRate,
        patientSatisfactionScore: latest.patientSatisfactionScore,
        rating: latest.rating
      } : null
    })
  } catch (e) {
    console.error('Get my performance error:', e)
    res.status(500).json({ error: 'Failed to get performance' })
  }
}

// Update supervisor rating
export async function updateSupervisorRating(req: Request, res: Response) {
  try {
    const { id } = req.params
    const data = updateSupervisorRatingSchema.parse(req.body)
    
    const performance = await NursePerformance.findByIdAndUpdate(
      id,
      {
        supervisorRating: data.supervisorRating,
        supervisorComments: data.supervisorComments,
        updatedAt: new Date()
      },
      { new: true }
    )
    
    if (!performance) {
      return res.status(404).json({ error: 'Performance record not found' })
    }
    
    res.json(performance)
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors })
    }
    console.error('Update supervisor rating error:', e)
    res.status(500).json({ error: 'Failed to update rating' })
  }
}

// Get performance leaderboard
export async function getLeaderboard(req: Request, res: Response) {
  try {
    const { period = 'monthly', date, limit = '10' } = req.query
    
    const targetDate = date ? new Date(date as string) : new Date()
    
    const performances = await NursePerformance.find({
      period,
      date: {
        $gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), 1),
        $lte: new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999)
      }
    })
      .sort({ performanceScore: -1 })
      .limit(Number(limit))
      .populate('nurseId', 'fullName username')
      .lean()
    
    res.json({
      items: performances.map((p, index) => ({
        ...p,
        rank: index + 1
      })),
      total: performances.length,
      period,
      date: targetDate
    })
  } catch (e) {
    console.error('Get leaderboard error:', e)
    res.status(500).json({ error: 'Failed to get leaderboard' })
  }
}

// Get department performance summary
export async function getDepartmentSummary(req: Request, res: Response) {
  try {
    const { department, from, to } = req.query
    
    // This would require joining with NurseProfile to get departments
    // For now, return aggregate stats
    
    const filter: any = {}
    
    if (from || to) {
      filter.date = {}
      if (from) filter.date.$gte = new Date(from as string)
      if (to) {
        const toDate = new Date(to as string)
        toDate.setHours(23, 59, 59, 999)
        filter.date.$lte = toDate
      }
    }
    
    const performances = await NursePerformance.find(filter).lean()
    
    const summary = {
      totalNurses: new Set(performances.map(p => p.nurseId.toString())).size,
      avgPerformanceScore: performances.length > 0 
        ? Math.round(performances.reduce((sum, p) => sum + p.performanceScore, 0) / performances.length)
        : 0,
      avgCompletionRate: performances.length > 0
        ? Math.round(performances.reduce((sum, p) => sum + p.completionRate, 0) / performances.length)
        : 0,
      avgAttendanceRate: performances.length > 0
        ? Math.round(performances.reduce((sum, p) => sum + p.attendanceRate, 0) / performances.length)
        : 0,
      topPerformers: performances
        .sort((a, b) => b.performanceScore - a.performanceScore)
        .slice(0, 5)
        .map(p => p.nurseId.toString())
    }
    
    res.json(summary)
  } catch (e) {
    console.error('Get department summary error:', e)
    res.status(500).json({ error: 'Failed to get department summary' })
  }
}
