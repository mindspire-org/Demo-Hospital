import { Request, Response } from 'express'
import { OTRoom } from '../models/OTRoom'
import { OTBooking } from '../models/OTBooking'
import { OTSterilization } from '../models/OTSterilization'
import { OTEquipment } from '../models/OTEquipment'
import { OTProcedure } from '../models/OTProcedure'
import { HospitalEncounter } from '../models/Encounter'
import { HospitalStaff } from '../models/Staff'
import { OTSSITracking } from '../models/OTSSITracking'

// ============================================================================
// OT Rooms
// ============================================================================

export async function listRooms(req: Request, res: Response) {
  try {
    const { status, type, q, page = 1, limit = 50 } = req.query
    const filter: any = { active: { $ne: false } }
    if (status) filter.status = status
    if (type) filter.type = type
    if (q) filter.name = { $regex: q, $options: 'i' }

    const rooms = await OTRoom.find(filter)
      .sort({ name: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))

    const total = await OTRoom.countDocuments(filter)

    res.json({ rooms, total, page: Number(page), limit: Number(limit) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export async function createRoom(req: Request, res: Response) {
  try {
    const room = await OTRoom.create(req.body)
    res.status(201).json(room)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function updateRoom(req: Request, res: Response) {
  try {
    const room = await OTRoom.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!room) return res.status(404).json({ error: 'Room not found' })
    res.json(room)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function deleteRoom(req: Request, res: Response) {
  try {
    const room = await OTRoom.findByIdAndUpdate(req.params.id, { active: false })
    if (!room) return res.status(404).json({ error: 'Room not found' })
    res.json({ success: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

// ============================================================================
// OT Bookings
// ============================================================================

export async function listBookings(req: Request, res: Response) {
  try {
    const {
      status, roomId, surgeonId, encounterId, patientId,
      from, to, date, priority, q, page = 1, limit = 50
    } = req.query

    const filter: any = {}
    if (status) filter.status = status
    if (roomId) filter.roomId = roomId
    if (surgeonId) filter.surgeonId = surgeonId
    if (encounterId) filter.encounterId = encounterId
    if (patientId) filter.patientId = patientId
    if (priority) filter.priority = priority
    if (q) filter.procedure = { $regex: q, $options: 'i' }

    if (date) {
      const start = new Date(date as string)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      filter.scheduledAt = { $gte: start, $lt: end }
    } else if (from || to) {
      filter.scheduledAt = {}
      if (from) filter.scheduledAt.$gte = new Date(from as string)
      if (to) filter.scheduledAt.$lte = new Date(to as string)
    }

    const bookings = await OTBooking.find(filter)
      .populate('encounterId')
      .populate('patientId')
      .populate('roomId')
      .populate('surgeonId')
      .populate('anesthesiologistId')
      .sort({ scheduledAt: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))

    const total = await OTBooking.countDocuments(filter)

    res.json({ bookings, total, page: Number(page), limit: Number(limit) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export async function getBookingById(req: Request, res: Response) {
  try {
    const booking = await OTBooking.findById(req.params.id)
      .populate('encounterId')
      .populate('patientId')
      .populate('roomId')
      .populate('surgeonId')
      .populate('anesthesiologistId')
      .populate('team.staffId')

    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    res.json(booking)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export async function createBooking(req: Request, res: Response) {
  try {
    const { encounterId, patientData, referredFrom, preOpChecklist } = req.body

    let patientId = null
    
    // Get patient from encounter if IPD/ER booking
    if (encounterId) {
      const encounter = await HospitalEncounter.findById(encounterId)
      patientId = encounter?.patientId
    }

    // Process preOpChecklist - convert consentDate string to Date if present
    const processedChecklist = preOpChecklist ? {
      ...preOpChecklist,
      consentDate: preOpChecklist.consentDate ? new Date(preOpChecklist.consentDate) : undefined,
    } : undefined

    const booking = await OTBooking.create({
      ...req.body,
      patientId,
      preOpChecklist: processedChecklist,
    })

    // Update room status if assigned
    if (req.body.roomId) {
      await OTRoom.findByIdAndUpdate(req.body.roomId, { status: 'occupied' })
    }

    res.status(201).json(booking)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function updateBooking(req: Request, res: Response) {
  try {
    const oldBooking = await OTBooking.findById(req.params.id)
    const booking = await OTBooking.findByIdAndUpdate(req.params.id, req.body, { new: true })

    if (!booking) return res.status(404).json({ error: 'Booking not found' })

    // Handle room status changes
    if (req.body.roomId && req.body.roomId !== oldBooking?.roomId?.toString()) {
      if (oldBooking?.roomId) {
        await OTRoom.findByIdAndUpdate(oldBooking.roomId, { status: 'available' })
      }
      await OTRoom.findByIdAndUpdate(req.body.roomId, { status: 'occupied' })
    }

    // Handle status changes
    if (req.body.status === 'completed' || req.body.status === 'cancelled') {
      if (booking.roomId) {
        await OTRoom.findByIdAndUpdate(booking.roomId, { status: 'available' })
      }
    }

    res.json(booking)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function deleteBooking(req: Request, res: Response) {
  try {
    const booking = await OTBooking.findById(req.params.id)
    if (!booking) return res.status(404).json({ error: 'Booking not found' })

    // Release room
    if (booking.roomId) {
      await OTRoom.findByIdAndUpdate(booking.roomId, { status: 'available' })
    }

    await OTBooking.findByIdAndDelete(req.params.id)
    res.json({ success: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

// ============================================================================
// OT Sterilization
// ============================================================================

export async function listSterilizations(req: Request, res: Response) {
  try {
    const { status, from, to, page = 1, limit = 50 } = req.query
    const filter: any = {}
    if (status) filter.status = status
    if (from || to) {
      filter.startedAt = {}
      if (from) filter.startedAt.$gte = new Date(from as string)
      if (to) filter.startedAt.$lte = new Date(to as string)
    }

    const sterilizations = await OTSterilization.find(filter)
      .populate('operatorId')
      .populate('verifiedBy')
      .sort({ startedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))

    const total = await OTSterilization.countDocuments(filter)

    res.json({ sterilizations, total, page: Number(page), limit: Number(limit) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export async function createSterilization(req: Request, res: Response) {
  try {
    const sterilization = await OTSterilization.create(req.body)
    res.status(201).json(sterilization)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function updateSterilization(req: Request, res: Response) {
  try {
    const sterilization = await OTSterilization.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!sterilization) return res.status(404).json({ error: 'Sterilization record not found' })
    res.json(sterilization)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function deleteSterilization(req: Request, res: Response) {
  try {
    const sterilization = await OTSterilization.findByIdAndDelete(req.params.id)
    if (!sterilization) return res.status(404).json({ error: 'Sterilization record not found' })
    res.json({ success: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

// ============================================================================
// OT Statistics
// ============================================================================

export async function getStatistics(req: Request, res: Response) {
  try {
    const { from, to } = req.query
    const dateFilter: any = {}
    if (from || to) {
      dateFilter.scheduledAt = {}
      if (from) dateFilter.scheduledAt.$gte = new Date(from as string)
      if (to) dateFilter.scheduledAt.$lte = new Date(to as string)
    }

    const [total, scheduled, inProgress, completed, cancelled, emergency] = await Promise.all([
      OTBooking.countDocuments(dateFilter),
      OTBooking.countDocuments({ ...dateFilter, status: 'scheduled' }),
      OTBooking.countDocuments({ ...dateFilter, status: 'in-progress' }),
      OTBooking.countDocuments({ ...dateFilter, status: 'completed' }),
      OTBooking.countDocuments({ ...dateFilter, status: { $in: ['cancelled', 'postponed'] } }),
      OTBooking.countDocuments({ ...dateFilter, priority: 'emergency' }),
    ])

    const rooms = await OTRoom.find({ active: { $ne: false } })
    const availableRooms = rooms.filter(r => r.status === 'available').length
    const occupiedRooms = rooms.filter(r => r.status === 'occupied').length

    res.json({
      total,
      scheduled,
      inProgress,
      completed,
      cancelled,
      emergency,
      availableRooms,
      occupiedRooms,
      totalRooms: rooms.length,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

// ============================================================================
// OT Equipment
// ============================================================================

export async function listEquipment(req: Request, res: Response) {
  try {
    const { status, roomId, q, page = 1, limit = 50 } = req.query
    const filter: any = { active: { $ne: false } }
    if (status) filter.status = status
    if (roomId) filter.roomId = roomId
    if (q) filter.name = { $regex: q, $options: 'i' }

    const equipment = await OTEquipment.find(filter)
      .populate('roomId')
      .sort({ name: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))

    const total = await OTEquipment.countDocuments(filter)

    res.json({ equipment, total, page: Number(page), limit: Number(limit) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export async function createEquipment(req: Request, res: Response) {
  try {
    const equipment = await OTEquipment.create(req.body)
    res.status(201).json(equipment)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function updateEquipment(req: Request, res: Response) {
  try {
    const equipment = await OTEquipment.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!equipment) return res.status(404).json({ error: 'Equipment not found' })
    res.json(equipment)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function deleteEquipment(req: Request, res: Response) {
  try {
    const equipment = await OTEquipment.findByIdAndUpdate(req.params.id, { active: false })
    if (!equipment) return res.status(404).json({ error: 'Equipment not found' })
    res.json({ success: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

// ============================================================================
// OT Procedures
// ============================================================================

export async function listProcedures(req: Request, res: Response) {
  try {
    const { code, q, page = 1, limit = 50 } = req.query
    const filter: any = { active: { $ne: false } }
    if (code) filter.code = code
    if (q) filter.name = { $regex: q, $options: 'i' }

    const procedures = await OTProcedure.find(filter)
      .sort({ name: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))

    const total = await OTProcedure.countDocuments(filter)

    res.json({ procedures, total, page: Number(page), limit: Number(limit) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export async function getProcedureById(req: Request, res: Response) {
  try {
    const procedure = await OTProcedure.findById(req.params.id)
    if (!procedure) return res.status(404).json({ error: 'Procedure not found' })
    res.json(procedure)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export async function createProcedure(req: Request, res: Response) {
  try {
    const procedure = await OTProcedure.create(req.body)
    res.status(201).json(procedure)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function updateProcedure(req: Request, res: Response) {
  try {
    const procedure = await OTProcedure.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!procedure) return res.status(404).json({ error: 'Procedure not found' })
    res.json(procedure)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function deleteProcedure(req: Request, res: Response) {
  try {
    const procedure = await OTProcedure.findByIdAndUpdate(req.params.id, { active: false })
    if (!procedure) return res.status(404).json({ error: 'Procedure not found' })
    res.json({ success: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

// ============================================================================
// OT Team Members
// ============================================================================

export async function listTeamMembers(req: Request, res: Response) {
  try {
    const booking = await OTBooking.findById(req.params.bookingId).populate('team.staffId')
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    res.json(booking.team || [])
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export async function addTeamMember(req: Request, res: Response) {
  try {
    const { staffId, role } = req.body
    const booking = await OTBooking.findById(req.params.bookingId)
    if (!booking) return res.status(404).json({ error: 'Booking not found' })

    // Check if already added
    const exists = booking.team?.find((t: any) => t.staffId?.toString() === staffId)
    if (exists) return res.status(400).json({ error: 'Staff already added to team' })

    booking.team = booking.team || []
    booking.team.push({ staffId, role })
    await booking.save()

    const updated = await OTBooking.findById(req.params.bookingId).populate('team.staffId')
    res.status(201).json(updated?.team || [])
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function removeTeamMember(req: Request, res: Response) {
  try {
    const booking = await OTBooking.findById(req.params.bookingId)
    if (!booking) return res.status(404).json({ error: 'Booking not found' })

    booking.team = booking.team?.filter((t: any) => t.staffId?.toString() !== req.params.staffId) || []
    await booking.save()

    const updated = await OTBooking.findById(req.params.bookingId).populate('team.staffId')
    res.json(updated?.team || [])
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

// ============================================================================
// OT Surgery Reports
// ============================================================================

export async function getSurgeryReport(req: Request, res: Response) {
  try {
    const { from, to, surgeonId, status } = req.query
    const filter: any = {}
    
    if (from || to) {
      filter.scheduledAt = {}
      if (from) filter.scheduledAt.$gte = new Date(from as string)
      if (to) filter.scheduledAt.$lte = new Date(to as string)
    }
    if (surgeonId) filter.surgeonId = surgeonId
    if (status) filter.status = status

    const surgeries = await OTBooking.find(filter)
      .populate('patientId')
      .populate('surgeonId')
      .populate('roomId')
      .populate('anesthesiologistId')
      .sort({ scheduledAt: -1 })

    // Summary by status
    const byStatus = await OTBooking.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])

    // Summary by surgeon
    const bySurgeon = await OTBooking.aggregate([
      { $match: filter },
      { $group: { _id: '$surgeonId', count: { $sum: 1 } } },
      { $lookup: { from: 'hospital_doctors', localField: '_id', foreignField: '_id', as: 'doctor' } },
      { $project: { _id: 1, count: 1, doctor: { $arrayElemAt: ['$doctor', 0] } } }
    ])

    // Summary by priority
    const byPriority = await OTBooking.aggregate([
      { $match: filter },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ])

    res.json({
      surgeries,
      summary: {
        byStatus: byStatus.reduce((acc: any, s: any) => { acc[s._id] = s.count; return acc }, {}),
        bySurgeon,
        byPriority: byPriority.reduce((acc: any, p: any) => { acc[p._id] = p.count; return acc }, {}),
        total: surgeries.length
      }
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

// ============================================================================
// SSI Tracking (CDC NHSN Surveillance)
// ============================================================================

export async function listSSITracking(req: Request, res: Response) {
  try {
    const { from, to, ssiDetected, bookingId, patientId, page = 1, limit = 50 } = req.query
    const filter: any = {}
    
    if (from || to) {
      filter.surgeryDate = {}
      if (from) filter.surgeryDate.$gte = new Date(from as string)
      if (to) filter.surgeryDate.$lte = new Date(to as string)
    }
    if (ssiDetected !== undefined) filter.ssiDetected = ssiDetected === 'true'
    if (bookingId) filter.bookingId = bookingId
    if (patientId) filter.patientId = patientId

    const cases = await OTSSITracking.find(filter)
      .populate('patientId', 'fullName mrNumber')
      .populate('bookingId', 'procedure scheduledAt')
      .populate('surgeonId', 'name')
      .sort({ surgeryDate: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))

    const total = await OTSSITracking.countDocuments(filter)

    res.json({ cases, total, page: Number(page), limit: Number(limit) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export async function createSSITracking(req: Request, res: Response) {
  try {
    const data = req.body
    
    // Calculate days to detection if not provided
    if (data.ssiDetected && data.ssiDetectedAt && data.surgeryDate && !data.daysToDetection) {
      const surgeryDate = new Date(data.surgeryDate)
      const detectedAt = new Date(data.ssiDetectedAt)
      data.daysToDetection = Math.floor((detectedAt.getTime() - surgeryDate.getTime()) / (1000 * 60 * 60 * 24))
    }

    const tracking = await OTSSITracking.create(data)
    res.status(201).json(tracking)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function updateSSITracking(req: Request, res: Response) {
  try {
    const data = req.body
    
    // Recalculate days to detection if dates changed
    if (data.ssiDetectedAt && data.surgeryDate) {
      const surgeryDate = new Date(data.surgeryDate)
      const detectedAt = new Date(data.ssiDetectedAt)
      data.daysToDetection = Math.floor((detectedAt.getTime() - surgeryDate.getTime()) / (1000 * 60 * 60 * 24))
    }

    const tracking = await OTSSITracking.findByIdAndUpdate(req.params.id, data, { new: true })
    if (!tracking) return res.status(404).json({ error: 'SSI tracking record not found' })
    res.json(tracking)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function deleteSSITracking(req: Request, res: Response) {
  try {
    const tracking = await OTSSITracking.findByIdAndDelete(req.params.id)
    if (!tracking) return res.status(404).json({ error: 'SSI tracking record not found' })
    res.json({ success: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function getSSITrackingById(req: Request, res: Response) {
  try {
    const tracking = await OTSSITracking.findById(req.params.id)
      .populate('patientId', 'fullName mrNumber')
      .populate('bookingId')
      .populate('surgeonId', 'name')
    if (!tracking) return res.status(404).json({ error: 'SSI tracking record not found' })
    res.json(tracking)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
