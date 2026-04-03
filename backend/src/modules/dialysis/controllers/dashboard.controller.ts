import { Request, Response } from 'express'
import { DialysisPatient } from '../models/DialysisPatient'
import { DialysisSession } from '../models/DialysisSession'
import { DialysisToken } from '../models/Token'
import { DialysisAppointment } from '../models/DialysisAppointment'
import { DialysisMachine } from '../models/Machine'
import { DialysisSessionType } from '../models/SessionType'

export async function getStats(req: Request, res: Response) {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    // Total dialysis patients
    const totalPatients = await DialysisPatient.countDocuments({ active: true })

    // Today's sessions
    const todaySessions = await DialysisSession.find({ dateIso: today }).lean()
    const todaySessionsCount = todaySessions.length
    const completedToday = todaySessions.filter((s: any) => s.timeCompleted).length

    // Active machines
    const machines = await DialysisMachine.find({}).lean()
    const activeMachines = machines.filter((m: any) => m.status === 'busy' || m.status === 'available').length

    // Pending appointments (scheduled for today or future)
    const pendingAppointments = await DialysisAppointment.countDocuments({
      status: 'scheduled',
      appointmentDate: { $gte: today }
    })

    // Today's appointments
    const todayAppointments = await DialysisAppointment.find({
      status: 'scheduled',
      appointmentDate: today
    }).lean()

    // This month's revenue (from tokens)
    const monthTokens = await DialysisToken.find({
      dateIso: { $gte: startOfMonth.slice(0, 10) }
    }).lean()
    const revenue = monthTokens.reduce((sum: number, t: any) => sum + (t.fee || 0) - (t.discount || 0), 0)

    // Weekly sessions data (last 7 days)
    const weeklyData = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
      const sessions = await DialysisSession.countDocuments({ dateIso: dateStr })
      const uniquePatients = await DialysisSession.distinct('labPatientId', { dateIso: dateStr })
      weeklyData.push({ day: dayName, sessions, patients: uniquePatients.length })
    }

    // Session type distribution
    const sessionTypes = await DialysisSessionType.find({}).lean()
    const sessionTypeData = []
    for (const st of sessionTypes) {
      const count = await DialysisSession.countDocuments({ sessionTypeName: st.name })
      if (count > 0) {
        sessionTypeData.push({
          name: st.name,
          value: count,
          color: '#0d9488'
        })
      }
    }
    // If no session types, provide default
    if (sessionTypeData.length === 0) {
      sessionTypeData.push({ name: 'Hemodialysis', value: 100, color: '#0d9488' })
    }

    // Revenue trend (last 6 months)
    const revenueData = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
      const monthName = d.toLocaleDateString('en-US', { month: 'short' })
      
      const monthTokens = await DialysisToken.find({
        dateIso: { $gte: monthStart, $lte: monthEnd }
      }).lean()
      const monthRevenue = monthTokens.reduce((sum: number, t: any) => sum + (t.fee || 0) - (t.discount || 0), 0)
      
      revenueData.push({ month: monthName, revenue: monthRevenue })
    }

    // Recent sessions (last 10)
    const recentSessionsRaw = await DialysisSession.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
    
    const recentSessions = recentSessionsRaw.map((s: any) => ({
      id: s._id,
      patient: s.patientName || 'Unknown',
      mrn: s.mrn || '',
      type: s.sessionTypeName || 'Hemodialysis',
      time: s.timeStarted || '',
      status: s.timeCompleted ? 'completed' : s.timeStarted ? 'in-progress' : 'scheduled',
      machine: s.machineName || ''
    }))

    // Upcoming appointments (next 5 for today)
    const upcomingAppointmentsRaw = await DialysisAppointment.find({
      status: 'scheduled',
      appointmentDate: today
    })
      .sort({ appointmentTime: 1 })
      .limit(5)
      .lean()

    const upcomingAppointments = upcomingAppointmentsRaw.map((a: any) => ({
      id: a._id,
      patient: a.patientName || a.newPatientName || 'Unknown',
      time: a.appointmentTime || '',
      type: a.sessionTypeName || 'Hemodialysis',
      shift: a.shiftName || ''
    }))

    res.json({
      stats: {
        totalPatients,
        todaySessions: todaySessionsCount,
        activeMachines,
        pendingAppointments,
        completedToday,
        cancelledToday: 0,
        avgSessionTime: 4,
        revenue
      },
      weeklyData,
      sessionTypeData: sessionTypeData.slice(0, 5),
      revenueData,
      recentSessions,
      upcomingAppointments
    })
  } catch (err: any) {
    console.error('Dashboard stats error:', err)
    res.status(500).json({ error: err.message || 'Failed to fetch dashboard stats' })
  }
}
