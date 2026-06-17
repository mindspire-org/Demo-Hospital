import { Request, Response } from 'express'
import { LabAppointment } from '../models/Appointment'
import { LabPatient } from '../models/Patient'
import { LabOrder } from '../models/Order'
import { LabTest } from '../models/Test'
import { createAppointmentSchema, listAppointmentsSchema, updateAppointmentSchema, updateAppointmentStatusSchema } from '../validators/appointment'
import { nextGlobalMrn } from '../../../common/mrn'

function normDigits(s?: string) { return (s || '').replace(/\D+/g, '') }

function resolveActor(req: Request) {
  return (req as any).user?.username || (req as any).user?.name || (req as any).user?.email || 'system'
}

export async function create(req: Request, res: Response) {
  try {
    const data = createAppointmentSchema.parse(req.body)

    // Resolve existing patient by explicit patientId/mrn, else by phone.
    let patient: any = null
    if (data.patientId) {
      patient = await LabPatient.findById(data.patientId).lean()
      if (!patient) return res.status(404).json({ error: 'Patient not found' })
    } else if (data.mrn) {
      patient = await LabPatient.findOne({ mrn: String(data.mrn).trim() }).lean()
      if (!patient) return res.status(404).json({ error: 'Patient not found' })
    } else {
      const phoneN = normDigits(data.phone)
      if (phoneN) {
        patient = await LabPatient.findOne({ phoneNormalized: phoneN }).lean()
      }
    }

    const phoneN = patient ? String(patient.phoneNormalized || '') : normDigits(data.phone)

    const appt = await LabAppointment.create({
      dateIso: String(data.dateIso).slice(0, 10),
      time: data.time || undefined,
      tests: data.tests,
      patientId: patient?._id || undefined,
      mrn: patient?.mrn || undefined,
      patientName: patient ? patient.fullName : (data.patientName || undefined),
      phoneNormalized: phoneN || undefined,
      gender: patient ? (patient.gender || undefined) : (data.gender || undefined),
      age: patient ? (patient.age || undefined) : (data.age || undefined),
      notes: data.notes || undefined,
      status: 'booked',
    })

    res.status(201).json({ appointment: appt })
  } catch (e: any) {
    if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' })
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export async function list(req: Request, res: Response) {
  try {
    const parsed = listAppointmentsSchema.safeParse(req.query)
    const q = parsed.success ? parsed.data : ({} as any)

    const filter: any = {}
    if (q.status) filter.status = q.status
    if (q.date) filter.dateIso = String(q.date).slice(0, 10)
    if (q.from || q.to) {
      filter.dateIso = filter.dateIso || {}
      if (q.from) filter.dateIso.$gte = String(q.from).slice(0, 10)
      if (q.to) filter.dateIso.$lte = String(q.to).slice(0, 10)
    }
    if (q.q) {
      const rx = new RegExp(String(q.q), 'i')
      filter.$or = [
        { patientName: rx },
        { phoneNormalized: rx },
        { mrn: rx },
      ]
    }

    const limit = Math.min(500, Number(q.limit || 200))
    const page = Math.max(1, Number(q.page || 1))
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      LabAppointment.find(filter)
        .sort({ dateIso: -1, time: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LabAppointment.countDocuments(filter)
    ])

    res.json({ appointments: items, total, page, limit })
  } catch {
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export async function update(req: Request, res: Response) {
  try {
    const id = String(req.params.id)
    const data = updateAppointmentSchema.parse(req.body)

    const patch: any = {}
    if (data.dateIso != null) patch.dateIso = String(data.dateIso).slice(0, 10)
    if (data.time != null) patch.time = data.time
    if (data.tests != null) patch.tests = data.tests
    if (data.patientName != null) patch.patientName = data.patientName
    if (data.phone != null) patch.phoneNormalized = normDigits(data.phone)
    if (data.gender != null) patch.gender = data.gender
    if (data.age != null) patch.age = data.age
    if (data.notes != null) patch.notes = data.notes

    // If phone changed, attempt to link existing patient by that phone (without creating MRN).
    if (data.phone != null) {
      const digits = normDigits(data.phone)
      const existing: any = digits ? await LabPatient.findOne({ phoneNormalized: digits }).lean() : null
      if (existing) {
        patch.patientId = (existing as any)._id
        patch.mrn = (existing as any).mrn
        patch.patientName = (existing as any).fullName
      } else {
        // keep as unlinked (do not create)
        patch.patientId = undefined
        patch.mrn = undefined
      }
    }

    const row = await LabAppointment.findByIdAndUpdate(id, { $set: patch }, { new: true })
    if (!row) return res.status(404).json({ error: 'Appointment not found' })
    res.json({ appointment: row })
  } catch (e: any) {
    if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' })
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export async function updateStatus(req: Request, res: Response) {
  try {
    const id = String(req.params.id)
    const { status } = updateAppointmentStatusSchema.parse(req.body)
    const row = await LabAppointment.findByIdAndUpdate(id, { $set: { status } }, { new: true })
    if (!row) return res.status(404).json({ error: 'Appointment not found' })
    res.json({ appointment: row })
  } catch (e: any) {
    if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' })
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const id = String(req.params.id)
    const row = await LabAppointment.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'Appointment not found' })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export async function convertToToken(req: Request, res: Response) {
  try {
    const id = String(req.params.id)
    const appt: any = await LabAppointment.findById(id).lean()
    if (!appt) return res.status(404).json({ error: 'Appointment not found' })
    if (appt.status === 'cancelled') return res.status(400).json({ error: 'Cancelled appointment cannot be converted' })

    // If already converted, return existing order info
    if (appt.orderId) {
      const ord = await LabOrder.findById(String(appt.orderId)).lean()
      if (ord) return res.json({ order: ord, appointment: appt, alreadyConverted: true })
    }

    // Resolve patient (create MRN only here if missing)
    let patient: any = null
    if (appt.patientId) {
      patient = await LabPatient.findById(appt.patientId).lean()
      if (!patient) return res.status(404).json({ error: 'Linked patient not found' })
    } else {
      const mrn = await nextGlobalMrn()
      patient = await LabPatient.create({
        mrn,
        fullName: appt.patientName || 'Patient',
        phoneNormalized: appt.phoneNormalized || undefined,
        gender: appt.gender || undefined,
        age: appt.age || undefined,
        createdAtIso: new Date().toISOString(),
      })
    }

    // Validate tests exist (best-effort)
    const testIds: string[] = Array.isArray(appt.tests) ? appt.tests.map((x: any) => String(x)) : []
    if (!testIds.length) return res.status(400).json({ error: 'Appointment has no tests' })
    const tests = await LabTest.find({ _id: { $in: testIds } }).lean()
    const testIdSet = new Set(tests.map((t: any) => String(t._id)))
    const validTestIds = testIds.filter(tid => testIdSet.has(String(tid)))
    if (!validTestIds.length) return res.status(400).json({ error: 'No valid tests on appointment' })

    // Get full test details for pre-filling
    const testDetails = tests.filter((t: any) => testIdSet.has(String(t._id)))

    // Update appointment with patient linkage if needed
    let updatedAppt = appt
    if (!appt.patientId) {
      updatedAppt = await LabAppointment.findByIdAndUpdate(
        id,
        { $set: { patientId: (patient as any)._id, mrn: patient.mrn, patientName: patient.fullName } },
        { new: true }
      ).lean()
    }

    // Return appointment data and patient info for pre-filling the token form
    res.status(200).json({
      appointment: updatedAppt || appt,
      patient: {
        _id: String(patient._id),
        mrn: patient.mrn,
        fullName: patient.fullName,
        phoneNormalized: patient.phoneNormalized || appt.phoneNormalized,
        phone: patient.phoneNormalized || appt.phoneNormalized,
        age: patient.age || appt.age,
        gender: patient.gender || appt.gender,
      },
      tests: validTestIds,
      testDetails: testDetails.map((t: any) => ({
        _id: String(t._id),
        id: String(t._id),
        name: t.name,
        price: t.price || 0
      })),
      readyForToken: true
    })
  } catch (e: any) {
    console.error('convertToToken error:', e)
    res.status(500).json({ error: 'Internal Server Error', details: e?.message })
  }
}
