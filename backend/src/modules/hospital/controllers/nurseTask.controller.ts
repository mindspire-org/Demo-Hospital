import { Request, Response } from 'express'
import { z } from 'zod'
import { NurseTask } from '../models/NurseTask'
import { NurseActivityLog } from '../models/NurseActivityLog'
import { NurseShift } from '../models/NurseShift'

// Validation schemas
const createTaskSchema = z.object({
  assignedTo: z.string().min(1),
  patientId: z.string().min(1),
  patientMrn: z.string().min(1),
  patientName: z.string().min(1),
  encounterId: z.string().optional(),
  location: z.enum(['IPD', 'OPD', 'ER', 'OT', 'ICU', 'Dialysis']),
  bedNumber: z.string().optional(),
  ward: z.string().optional(),
  taskType: z.enum([
    'injection', 'iv_drip', 'iv_medication', 'oral_medication', 
    'dressing', 'vitals', 'nebulization', 'ecg', 'catheterization',
    'blood_draw', 'transfusion', 'suction', 'ng_tube', 'enema',
    'pre_op_prep', 'post_op_care', 'shift_handover', 'other'
  ]),
  priority: z.enum(['routine', 'urgent', 'stat', 'emergency']).default('routine'),
  scheduledTime: z.string(),
  dueTime: z.string().optional(),
  prescriptionItemId: z.string().optional(),
  medicationName: z.string().optional(),
  dosage: z.string().optional(),
  route: z.enum(['IV', 'IM', 'SC', 'PO', 'PR', 'Sublingual', 'Inhalation', 'Topical', 'Other']).optional(),
  frequency: z.string().optional(),
  specialInstructions: z.string().optional()
})

const updateTaskSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  notes: z.string().optional(),
  complications: z.string().optional(),
  patientResponse: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  vitalsData: z.object({
    bp: z.string().optional(),
    pulse: z.number().optional(),
    temp: z.number().optional(),
    spo2: z.number().optional(),
    rr: z.number().optional(),
    painScale: z.number().optional(),
    weight: z.number().optional(),
    height: z.number().optional(),
    bsr: z.number().optional(),
    intakeIV: z.string().optional(),
    urine: z.string().optional()
  }).optional()
})

const reassignTaskSchema = z.object({
  newNurseId: z.string().min(1),
  reason: z.string().min(1)
})

const cancelTaskSchema = z.object({
  reason: z.string().min(1)
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

// Create task (Doctor/Admin assigns)
export async function createTask(req: Request, res: Response) {
  try {
    const data = createTaskSchema.parse(req.body)
    const assignedBy = (req as any).user?.id
    
    if (!assignedBy) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    const task = await NurseTask.create({
      ...data,
      taskId: generateTaskId(),
      assignedBy,
      assignedAt: new Date(),
      status: 'pending',
      scheduledTime: new Date(data.scheduledTime),
      dueTime: data.dueTime ? new Date(data.dueTime) : undefined
    })
    
    // Log activity
    await logActivity({
      nurseId: data.assignedTo,
      action: 'task_assigned',
      entityType: 'task',
      entityId: task._id.toString(),
      details: {
        taskId: task.taskId,
        taskType: data.taskType,
        patientMrn: data.patientMrn,
        priority: data.priority
      },
      performedBy: assignedBy
    })
    
    res.status(201).json(task)
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors })
    }
    console.error('Create task error:', e)
    res.status(500).json({ error: 'Failed to create task' })
  }
}

// List tasks (with filters)
export async function listTasks(req: Request, res: Response) {
  try {
    const {
      assignedTo,
      assignedBy,
      patientId,
      patientMrn,
      status,
      taskType,
      priority,
      location,
      ward,
      from,
      to,
      limit = '50',
      page = '1'
    } = req.query
    
    const filter: any = {}
    
    if (assignedTo) filter.assignedTo = assignedTo
    if (assignedBy) filter.assignedBy = assignedBy
    if (patientId) filter.patientId = patientId
    if (patientMrn) filter.patientMrn = patientMrn
    if (status) filter.status = status
    if (taskType) filter.taskType = taskType
    if (priority) filter.priority = priority
    if (location) filter.location = location
    if (ward) filter.ward = ward
    
    // Date range
    if (from || to) {
      filter.scheduledTime = {}
      if (from) filter.scheduledTime.$gte = new Date(from as string)
      if (to) filter.scheduledTime.$lte = new Date(to as string)
    }
    
    const effectiveLimit = Math.min(Number(limit) || 50, 100)
    const currentPage = Math.max(Number(page) || 1, 1)
    const skip = (currentPage - 1) * effectiveLimit
    
    const [tasks, total] = await Promise.all([
      NurseTask.find(filter)
        .populate('assignedTo', 'fullName username')
        .populate('assignedBy', 'fullName username')
        .populate('patientId', 'name mrn')
        .sort({ scheduledTime: 1, priority: -1 })
        .skip(skip)
        .limit(effectiveLimit)
        .lean(),
      NurseTask.countDocuments(filter)
    ])
    
    res.json({
      items: tasks,
      total,
      page: currentPage,
      totalPages: Math.ceil(total / effectiveLimit)
    })
  } catch (e) {
    console.error('List tasks error:', e)
    res.status(500).json({ error: 'Failed to list tasks' })
  }
}

// Get single task
export async function getTask(req: Request, res: Response) {
  try {
    const { id } = req.params
    
    const task = await NurseTask.findById(id)
      .populate('assignedTo', 'fullName username phone')
      .populate('assignedBy', 'fullName username')
      .populate('patientId', 'name mrn phone gender age')
      .populate('encounterId', 'admissionNo ward bedId')
      .lean()
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }
    
    res.json(task)
  } catch (e) {
    console.error('Get task error:', e)
    res.status(500).json({ error: 'Failed to get task' })
  }
}

// Get task by taskId
export async function getTaskByTaskId(req: Request, res: Response) {
  try {
    const { taskId } = req.params
    
    const task = await NurseTask.findOne({ taskId })
      .populate('assignedTo', 'fullName username phone')
      .populate('assignedBy', 'fullName username')
      .populate('patientId', 'name mrn phone gender age')
      .lean()
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }
    
    res.json(task)
  } catch (e) {
    console.error('Get task error:', e)
    res.status(500).json({ error: 'Failed to get task' })
  }
}

// Accept task (Nurse accepts assignment)
export async function acceptTask(req: Request, res: Response) {
  try {
    const { id } = req.params
    const nurseId = (req as any).user?.id
    
    const task = await NurseTask.findById(id)
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }
    
    if (task.assignedTo.toString() !== nurseId) {
      return res.status(403).json({ error: 'Not assigned to you' })
    }
    
    if (task.status !== 'pending') {
      return res.status(400).json({ error: 'Task already accepted or completed' })
    }
    
    task.status = 'in_progress'
    await task.save()
    
    // Log activity
    await logActivity({
      nurseId,
      action: 'task_accepted',
      entityType: 'task',
      entityId: id,
      details: { taskId: task.taskId, taskType: task.taskType },
      performedBy: nurseId
    })
    
    res.json(task)
  } catch (e) {
    console.error('Accept task error:', e)
    res.status(500).json({ error: 'Failed to accept task' })
  }
}

// Start task
export async function startTask(req: Request, res: Response) {
  try {
    const { id } = req.params
    const nurseId = (req as any).user?.id
    
    const task = await NurseTask.findById(id)
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }
    
    if (task.assignedTo.toString() !== nurseId) {
      return res.status(403).json({ error: 'Not assigned to you' })
    }
    
    if (task.status !== 'pending' && task.status !== 'in_progress') {
      return res.status(400).json({ error: 'Cannot start this task' })
    }
    
    task.status = 'in_progress'
    await task.save()
    
    // Log activity
    await logActivity({
      nurseId,
      action: 'task_started',
      entityType: 'task',
      entityId: id,
      details: { taskId: task.taskId, taskType: task.taskType },
      performedBy: nurseId
    })
    
    res.json(task)
  } catch (e) {
    console.error('Start task error:', e)
    res.status(500).json({ error: 'Failed to start task' })
  }
}

// Complete task
export async function completeTask(req: Request, res: Response) {
  try {
    const { id } = req.params
    const data = updateTaskSchema.parse(req.body)
    const nurseId = (req as any).user?.id
    
    const task = await NurseTask.findById(id)
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }
    
    if (task.assignedTo.toString() !== nurseId) {
      return res.status(403).json({ error: 'Not assigned to you' })
    }
    
    if (task.status === 'completed') {
      return res.status(400).json({ error: 'Task already completed' })
    }
    
    // Update task
    task.status = 'completed'
    task.completedAt = new Date()
    if (data.notes) task.notes = data.notes
    if (data.complications) task.complications = data.complications
    if (data.patientResponse) task.patientResponse = data.patientResponse
    if (data.vitalsData) task.vitalsData = data.vitalsData
    
    await task.save()
    
    // Calculate completion time
    const startTime = task.assignedAt
    const completionTime = Math.round((task.completedAt.getTime() - startTime.getTime()) / 60000)
    
    // Log activity
    await logActivity({
      nurseId,
      action: 'task_completed',
      entityType: 'task',
      entityId: id,
      details: {
        taskId: task.taskId,
        taskType: task.taskType,
        duration: completionTime,
        patientResponse: data.patientResponse
      },
      performedBy: nurseId
    })
    
    // If vitals task, also log vitals recorded
    if (task.taskType === 'vitals' && data.vitalsData) {
      await logActivity({
        nurseId,
        action: 'vitals_recorded',
        entityType: 'patient',
        entityId: task.patientId.toString(),
        details: {
          patientMrn: task.patientMrn,
          vitals: data.vitalsData
        },
        performedBy: nurseId
      })
    }
    
    res.json(task)
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors })
    }
    console.error('Complete task error:', e)
    res.status(500).json({ error: 'Failed to complete task' })
  }
}

// Cancel task
export async function cancelTask(req: Request, res: Response) {
  try {
    const { id } = req.params
    const data = cancelTaskSchema.parse(req.body)
    const cancelledBy = (req as any).user?.id
    
    const task = await NurseTask.findByIdAndUpdate(
      id,
      {
        status: 'cancelled',
        cancelledBy,
        cancelledReason: data.reason,
        cancelledAt: new Date()
      },
      { new: true }
    )
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }
    
    // Log activity
    await logActivity({
      nurseId: task.assignedTo.toString(),
      action: 'task_cancelled',
      entityType: 'task',
      entityId: id,
      details: { taskId: task.taskId, reason: data.reason },
      performedBy: cancelledBy
    })
    
    res.json(task)
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors })
    }
    console.error('Cancel task error:', e)
    res.status(500).json({ error: 'Failed to cancel task' })
  }
}

// Reassign task
export async function reassignTask(req: Request, res: Response) {
  try {
    const { id } = req.params
    const data = reassignTaskSchema.parse(req.body)
    const reassignedBy = (req as any).user?.id
    
    const task = await NurseTask.findById(id)
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }
    
    const oldNurseId = task.assignedTo.toString()
    
    task.assignedTo = data.newNurseId as any
    task.reassignedFrom = oldNurseId as any
    task.reassignedAt = new Date()
    task.reassignmentReason = data.reason
    task.status = 'pending'
    
    await task.save()
    
    // Log activity for old nurse
    await logActivity({
      nurseId: oldNurseId,
      action: 'task_reassigned',
      entityType: 'task',
      entityId: id,
      details: { taskId: task.taskId, reason: data.reason },
      performedBy: reassignedBy
    })
    
    // Log activity for new nurse
    await logActivity({
      nurseId: data.newNurseId,
      action: 'task_assigned',
      entityType: 'task',
      entityId: id,
      details: { taskId: task.taskId, reassigned: true },
      performedBy: reassignedBy
    })
    
    res.json(task)
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors })
    }
    console.error('Reassign task error:', e)
    res.status(500).json({ error: 'Failed to reassign task' })
  }
}

// Get pending tasks for nurse
export async function getPendingTasks(req: Request, res: Response) {
  try {
    const nurseId = (req as any).user?.id
    
    if (!nurseId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    const tasks = await NurseTask.find({
      assignedTo: nurseId,
      status: { $in: ['pending', 'in_progress'] }
    })
      .populate('patientId', 'name mrn gender age')
      .populate('assignedBy', 'fullName username')
      .sort({ priority: -1, scheduledTime: 1 })
      .lean()
    
    res.json({ items: tasks, total: tasks.length })
  } catch (e) {
    console.error('Get pending tasks error:', e)
    res.status(500).json({ error: 'Failed to get pending tasks' })
  }
}

// Get overdue tasks
export async function getOverdueTasks(req: Request, res: Response) {
  try {
    const { assignedTo, location, ward } = req.query
    
    const filter: any = {
      status: { $in: ['pending', 'in_progress'] },
      dueTime: { $lt: new Date() }
    }
    
    if (assignedTo) filter.assignedTo = assignedTo
    if (location) filter.location = location
    if (ward) filter.ward = ward
    
    const tasks = await NurseTask.find(filter)
      .populate('assignedTo', 'fullName username')
      .populate('patientId', 'name mrn')
      .sort({ dueTime: 1 })
      .lean()
    
    res.json({ items: tasks, total: tasks.length })
  } catch (e) {
    console.error('Get overdue tasks error:', e)
    res.status(500).json({ error: 'Failed to get overdue tasks' })
  }
}

// Get tasks for patient
export async function getPatientTasks(req: Request, res: Response) {
  try {
    const { patientId } = req.params
    const { status, limit = '50' } = req.query
    
    const filter: any = { patientId }
    if (status) filter.status = status
    
    const tasks = await NurseTask.find(filter)
      .populate('assignedTo', 'fullName username')
      .populate('assignedBy', 'fullName username')
      .sort({ scheduledTime: -1 })
      .limit(Number(limit))
      .lean()
    
    res.json({ items: tasks, total: tasks.length })
  } catch (e) {
    console.error('Get patient tasks error:', e)
    res.status(500).json({ error: 'Failed to get patient tasks' })
  }
}

// Bulk create tasks (for prescriptions with multiple items)
export async function bulkCreateTasks(req: Request, res: Response) {
  try {
    const tasks = req.body.tasks
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'Tasks array required' })
    }
    
    const assignedBy = (req as any).user?.id
    if (!assignedBy) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    const createdTasks = []
    
    for (const taskData of tasks) {
      const validated = createTaskSchema.parse(taskData)
      const task = await NurseTask.create({
        ...validated,
        taskId: generateTaskId(),
        assignedBy,
        assignedAt: new Date(),
        status: 'pending',
        scheduledTime: new Date(validated.scheduledTime),
        dueTime: validated.dueTime ? new Date(validated.dueTime) : undefined
      })
      
      createdTasks.push(task)
      
      // Log activity
      await logActivity({
        nurseId: validated.assignedTo,
        action: 'task_assigned',
        entityType: 'task',
        entityId: task._id.toString(),
        details: {
          taskId: task.taskId,
          taskType: validated.taskType,
          patientMrn: validated.patientMrn,
          priority: validated.priority
        },
        performedBy: assignedBy
      })
    }
    
    res.status(201).json({
      items: createdTasks,
      total: createdTasks.length
    })
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors })
    }
    console.error('Bulk create tasks error:', e)
    res.status(500).json({ error: 'Failed to create tasks' })
  }
}
