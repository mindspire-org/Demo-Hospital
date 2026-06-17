import { Request, Response } from 'express'
import { HospitalLeave } from '../models/Leave'
import { HospitalStaff } from '../models/Staff'
import { HospitalAttendance } from '../models/Attendance'
import { z } from 'zod'

const leaveRequestSchema = z.object({
  staffId: z.string().min(1),
  type: z.enum(['annual', 'casual', 'sick', 'other']),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  isHalfDay: z.boolean().optional(),
  halfDayType: z.enum(['first_half', 'second_half']).optional().nullable(),
  reason: z.string().optional(),
})

export async function createLeaveRequest(req: Request, res: Response) {
  try {
    const data = leaveRequestSchema.parse(req.body)
    const leave = await HospitalLeave.create({
      ...data,
      status: 'pending',
      appliedDate: new Date().toISOString().split('T')[0],
    })
    res.json({ ok: true, item: leave })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}

export async function listLeaves(req: Request, res: Response) {
  const { staffId, status, from, to } = req.query
  const filter: any = {}
  if (staffId) filter.staffId = staffId
  if (status) filter.status = status
  if (from || to) {
    filter.startDate = {}
    if (from) filter.startDate.$gte = from
    if (to) filter.startDate.$lte = to
  }
  const items = await HospitalLeave.find(filter).sort({ createdAt: -1 }).lean()
  res.json({ items })
}

export async function approveLeave(req: Request, res: Response) {
  const { id } = req.params
  const { status, rejectionReason } = req.body // 'approved' or 'rejected'
  
  const leave = await HospitalLeave.findById(id)
  if (!leave) return res.status(404).json({ error: 'Leave not found' })
  if (leave.status !== 'pending') return res.status(400).json({ error: 'Leave already processed' })

  if (status === 'approved') {
    leave.status = 'approved'
    leave.approvedBy = (req as any).user?._id || 'admin'
    leave.approvedDate = new Date().toISOString().split('T')[0]
    await leave.save()

    // Update staff balances if it's not 'other'
    if (leave.type !== 'other') {
      const staff = await HospitalStaff.findById(leave.staffId)
      if (staff) {
        const days = leave.isHalfDay ? 0.5 : (
          (new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24) + 1
        )
        const currentBalance = staff.leaveBalances?.[leave.type as 'annual'|'casual'|'sick'] || 0
        const currentQuota = staff.leaveQuotas?.[leave.type as 'annual'|'casual'|'sick'] || 0
        
        // We allow negative balance for now or just deduct?
        // Usually, we deduct from balance. If balance is 0, it might go negative or we could cap it.
        if (!staff.leaveBalances) staff.leaveBalances = { annual: 0, casual: 0, sick: 0 }
        staff.leaveBalances[leave.type as 'annual'|'casual'|'sick'] = currentBalance + days
        await staff.save()
      }
    }

    // Automatically mark attendance as 'leave' for those days
    const start = new Date(leave.startDate)
    const end = new Date(leave.endDate)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      await HospitalAttendance.findOneAndUpdate(
        { staffId: leave.staffId, date: dateStr },
        { 
          $set: { 
            status: 'leave', 
            notes: `${leave.isHalfDay ? 'Half-day ' : ''}${leave.type} leave approved. ${leave.reason || ''}` 
          } 
        },
        { upsert: true }
      )
    }
  } else if (status === 'rejected') {
    leave.status = 'rejected'
    leave.rejectionReason = rejectionReason
    await leave.save()
  }

  res.json({ ok: true, item: leave })
}

export async function deleteLeave(req: Request, res: Response) {
  const { id } = req.params
  await HospitalLeave.findByIdAndDelete(id)
  res.json({ ok: true })
}
