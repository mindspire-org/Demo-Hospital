import { Request, Response } from 'express'
import { ICUBed } from '../models/ICUBed'
import { ICUAdmission } from '../models/ICUAdmission'
import { ICUFlowsheet } from '../models/ICUFlowsheet'
import { ICUScore } from '../models/ICUScore'
import { HospitalEncounter } from '../models/Encounter'

// ============================================================================
// ICU Beds
// ============================================================================

export async function listBeds(req: Request, res: Response) {
  try {
    const { status, ventilatorAvailable, isolationType, cleaningStatus, clinicalStatus, q, page = 1, limit = 50 } = req.query
    const filter: any = { active: { $ne: false } }
    if (status) filter.status = status
    if (ventilatorAvailable !== undefined) filter.ventilatorAvailable = ventilatorAvailable === 'true'
    if (isolationType) filter.isolationType = isolationType
    if (cleaningStatus) filter.cleaningStatus = cleaningStatus
    if (clinicalStatus) filter.clinicalStatus = clinicalStatus
    if (q) filter.name = { $regex: q, $options: 'i' }

    const beds = await ICUBed.find(filter)
      .sort({ name: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))

    const total = await ICUBed.countDocuments(filter)

    res.json({ beds, total, page: Number(page), limit: Number(limit) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export async function createBed(req: Request, res: Response) {
  try {
    const bed = await ICUBed.create(req.body)
    res.status(201).json(bed)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function updateBed(req: Request, res: Response) {
  try {
    const bed = await ICUBed.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!bed) return res.status(404).json({ error: 'Bed not found' })
    res.json(bed)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function deleteBed(req: Request, res: Response) {
  try {
    const bed = await ICUBed.findByIdAndUpdate(req.params.id, { active: false })
    if (!bed) return res.status(404).json({ error: 'Bed not found' })
    res.json({ success: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

// ============================================================================
// ICU Admissions
// ============================================================================

export async function listAdmissions(req: Request, res: Response) {
  try {
    const {
      status, bedId, encounterId, patientId,
      from, to, severity, q, page = 1, limit = 50
    } = req.query

    const filter: any = {}
    if (status) filter.status = status
    if (bedId) filter.bedId = bedId
    if (encounterId) filter.encounterId = encounterId
    if (patientId) filter.patientId = patientId
    if (severity) filter.severity = severity
    if (q) filter.reason = { $regex: q, $options: 'i' }

    if (from || to) {
      filter.admittedAt = {}
      if (from) filter.admittedAt.$gte = new Date(from as string)
      if (to) filter.admittedAt.$lte = new Date(to as string)
    }

    const admissions = await ICUAdmission.find(filter)
      .populate('encounterId')
      .populate('patientId')
      .populate('bedId')
      .populate('attendingDoctorId')
      .populate('referringPhysicianId')
      .populate('acceptingConsultantId')
      .sort({ admittedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))

    const total = await ICUAdmission.countDocuments(filter)

    res.json({ admissions, total, page: Number(page), limit: Number(limit) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export async function getAdmissionById(req: Request, res: Response) {
  try {
    const admission = await ICUAdmission.findById(req.params.id)
      .populate('encounterId')
      .populate('patientId')
      .populate('bedId')
      .populate('attendingDoctorId')
      .populate('referringPhysicianId')
      .populate('acceptingConsultantId')

    if (!admission) return res.status(404).json({ error: 'Admission not found' })
    res.json(admission)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export async function createAdmission(req: Request, res: Response) {
  try {
    const { encounterId, bedId } = req.body

    // Get patient from encounter
    const encounter = await HospitalEncounter.findById(encounterId)
    const patientId = encounter?.patientId

    const admission = await ICUAdmission.create({
      ...req.body,
      patientId,
    })

    // Update bed status if assigned
    if (bedId) {
      await ICUBed.findByIdAndUpdate(bedId, { status: 'occupied' })
    }

    res.status(201).json(admission)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function updateAdmission(req: Request, res: Response) {
  try {
    const oldAdmission = await ICUAdmission.findById(req.params.id)
    const admission = await ICUAdmission.findByIdAndUpdate(req.params.id, req.body, { new: true })

    if (!admission) return res.status(404).json({ error: 'Admission not found' })

    // Handle bed changes
    if (req.body.bedId && req.body.bedId !== oldAdmission?.bedId?.toString()) {
      if (oldAdmission?.bedId) {
        await ICUBed.findByIdAndUpdate(oldAdmission.bedId, { status: 'available' })
      }
      await ICUBed.findByIdAndUpdate(req.body.bedId, { status: 'occupied' })
    }

    // Handle discharge/transfer
    if (req.body.status && req.body.status !== 'active' && oldAdmission?.status === 'active') {
      if (admission.bedId) {
        await ICUBed.findByIdAndUpdate(admission.bedId, { status: 'available' })
      }
    }

    res.json(admission)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function deleteAdmission(req: Request, res: Response) {
  try {
    const admission = await ICUAdmission.findById(req.params.id)
    if (!admission) return res.status(404).json({ error: 'Admission not found' })

    // Release bed
    if (admission.bedId) {
      await ICUBed.findByIdAndUpdate(admission.bedId, { status: 'available' })
    }

    await ICUAdmission.findByIdAndDelete(req.params.id)
    res.json({ success: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

// ============================================================================
// ICU Flowsheet
// ============================================================================

export async function listFlowsheet(req: Request, res: Response) {
  try {
    const { encounterId } = req.params
    const { from, to, page = 1, limit = 100 } = req.query

    const filter: any = { encounterId }
    if (from || to) {
      filter.recordedAt = {}
      if (from) filter.recordedAt.$gte = new Date(from as string)
      if (to) filter.recordedAt.$lte = new Date(to as string)
    }

    const flowsheet = await ICUFlowsheet.find(filter)
      .populate('recordedBy')
      .sort({ recordedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))

    const total = await ICUFlowsheet.countDocuments(filter)

    res.json({ flowsheet, total, page: Number(page), limit: Number(limit) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export async function createFlowsheetEntry(req: Request, res: Response) {
  try {
    const { encounterId } = req.params
    const entry = await ICUFlowsheet.create({
      ...req.body,
      encounterId,
    })
    res.status(201).json(entry)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function updateFlowsheetEntry(req: Request, res: Response) {
  try {
    const entry = await ICUFlowsheet.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!entry) return res.status(404).json({ error: 'Flowsheet entry not found' })
    res.json(entry)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function deleteFlowsheetEntry(req: Request, res: Response) {
  try {
    const entry = await ICUFlowsheet.findByIdAndDelete(req.params.id)
    if (!entry) return res.status(404).json({ error: 'Flowsheet entry not found' })
    res.json({ success: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

// ============================================================================
// ICU Scores
// ============================================================================

export async function listScores(req: Request, res: Response) {
  try {
    const { encounterId } = req.params
    const { type, from, to, page = 1, limit = 100 } = req.query

    const filter: any = { encounterId }
    if (type) filter.type = type
    if (from || to) {
      filter.recordedAt = {}
      if (from) filter.recordedAt.$gte = new Date(from as string)
      if (to) filter.recordedAt.$lte = new Date(to as string)
    }

    const scores = await ICUScore.find(filter)
      .populate('calculatedBy')
      .sort({ recordedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))

    const total = await ICUScore.countDocuments(filter)

    res.json({ scores, total, page: Number(page), limit: Number(limit) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export async function createScore(req: Request, res: Response) {
  try {
    const { encounterId } = req.params
    const score = await ICUScore.create({
      ...req.body,
      encounterId,
    })
    res.status(201).json(score)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function updateScore(req: Request, res: Response) {
  try {
    const score = await ICUScore.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!score) return res.status(404).json({ error: 'Score not found' })
    res.json(score)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export async function deleteScore(req: Request, res: Response) {
  try {
    const score = await ICUScore.findByIdAndDelete(req.params.id)
    if (!score) return res.status(404).json({ error: 'Score not found' })
    res.json({ success: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

// ============================================================================
// ICU Statistics
// ============================================================================

export async function getStatistics(req: Request, res: Response) {
  try {
    const { from, to } = req.query
    const dateFilter: any = {}
    if (from || to) {
      dateFilter.admittedAt = {}
      if (from) dateFilter.admittedAt.$gte = new Date(from as string)
      if (to) dateFilter.admittedAt.$lte = new Date(to as string)
    }

    // Basic counts
    const [total, active, critical, severe, moderate, mild, onVentilator, discharged, deceased, transferred] = await Promise.all([
      ICUAdmission.countDocuments(dateFilter),
      ICUAdmission.countDocuments({ ...dateFilter, status: 'active' }),
      ICUAdmission.countDocuments({ ...dateFilter, status: 'active', severity: 'critical' }),
      ICUAdmission.countDocuments({ ...dateFilter, status: 'active', severity: 'severe' }),
      ICUAdmission.countDocuments({ ...dateFilter, status: 'active', severity: 'moderate' }),
      ICUAdmission.countDocuments({ ...dateFilter, status: 'active', severity: 'mild' }),
      ICUAdmission.countDocuments({ ...dateFilter, status: 'active', ventilatorRequired: true }),
      ICUAdmission.countDocuments({ ...dateFilter, status: 'discharged' }),
      ICUAdmission.countDocuments({ ...dateFilter, status: 'deceased' }),
      ICUAdmission.countDocuments({ ...dateFilter, status: 'transferred' }),
    ])

    // Bed statistics with new fields
    const beds = await ICUBed.find({ active: { $ne: false } })
    const availableBeds = beds.filter(b => b.status === 'available' && b.cleaningStatus !== 'dirty').length
    const occupiedBeds = beds.filter(b => b.status === 'occupied').length
    const cleaningBeds = beds.filter(b => b.status === 'cleaning' || b.cleaningStatus === 'in-progress').length
    const maintenanceBeds = beds.filter(b => b.status === 'maintenance').length
    const ventilatorBeds = beds.filter(b => b.ventilatorAvailable).length
    const isolationBeds = beds.filter(b => b.isolationType !== 'none').length
    const readyBeds = beds.filter(b => b.cleaningStatus === 'ready').length

    // Discharge destination breakdown
    const dischargeDestinations = await ICUAdmission.aggregate([
      { $match: { ...dateFilter, status: { $in: ['discharged', 'transferred', 'deceased'] } } },
      { $group: { _id: '$dischargeDestination', count: { $sum: 1 } } }
    ])

    // Average length of stay calculation
    const completedAdmissions = await ICUAdmission.find({
      ...dateFilter,
      status: { $in: ['discharged', 'deceased', 'transferred'] },
      dischargedAt: { $exists: true }
    })

    let totalLOS = 0
    let losCount = 0
    for (const admission of completedAdmissions) {
      if (admission.admittedAt && admission.dischargedAt) {
        const days = (admission.dischargedAt.getTime() - admission.admittedAt.getTime()) / (1000 * 60 * 60 * 24)
        totalLOS += days
        losCount++
      }
    }
    const averageLOS = losCount > 0 ? totalLOS / losCount : 0

    // Mortality rate calculation
    const closedAdmissions = discharged + deceased + transferred
    const mortalityRate = closedAdmissions > 0 ? (deceased / closedAdmissions) * 100 : 0

    res.json({
      // Admission counts
      total,
      active,
      severity: { critical, severe, moderate, mild },
      onVentilator,
      outcomes: { discharged, deceased, transferred },
      // Bed occupancy
      beds: {
        total: beds.length,
        available: availableBeds,
        occupied: occupiedBeds,
        cleaning: cleaningBeds,
        maintenance: maintenanceBeds,
        ready: readyBeds,
        withVentilator: ventilatorBeds,
        withIsolation: isolationBeds,
        occupancyRate: beds.length > 0 ? (occupiedBeds / beds.length) * 100 : 0
      },
      // Quality indicators
      quality: {
        averageLOS: Number(averageLOS.toFixed(1)),
        mortalityRate: Number(mortalityRate.toFixed(1)),
        dischargeDestinations: dischargeDestinations.reduce((acc, d) => ({ ...acc, [d._id || 'unknown']: d.count }), {})
      }
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
