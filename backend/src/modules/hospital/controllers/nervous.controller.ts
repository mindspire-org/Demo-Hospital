import { Request, Response } from 'express'
import { NervousSystem } from '../models/NervousSystem'
import { HospitalEncounter } from '../models/Encounter'

export async function create(req: Request, res: Response) {
  try {
    const data = req.body
    const enc = await HospitalEncounter.findById(data.encounterId)
    if (!enc) return res.status(404).json({ error: 'Encounter not found' })

    const record = await NervousSystem.create({
      patientId: enc.patientId,
      encounterId: data.encounterId,
      doctorId: data.doctorId || enc.doctorId,
      ...data
    })

    res.status(201).json({ record })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export async function list(req: Request, res: Response) {
  try {
    const { patientId, encounterId, page = 1, limit = 50 } = req.query as any
    const query: any = {}
    if (patientId) query.patientId = patientId
    if (encounterId) query.encounterId = encounterId
    
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [records, total] = await Promise.all([
      NervousSystem.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit))
        .populate('patientId', 'fullName mrn').populate('doctorId', 'name').lean(),
      NervousSystem.countDocuments(query)
    ])
    res.json({ records, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export async function getById(req: Request, res: Response) {
  try {
    const record = await NervousSystem.findById(req.params.id)
      .populate('patientId', 'fullName mrn').populate('doctorId', 'name').lean()
    if (!record) return res.status(404).json({ error: 'Record not found' })
    res.json({ record })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export async function update(req: Request, res: Response) {
  try {
    const record = await NervousSystem.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true })
    if (!record) return res.status(404).json({ error: 'Record not found' })
    res.json({ record })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const record = await NervousSystem.findByIdAndDelete(req.params.id)
    if (!record) return res.status(404).json({ error: 'Record not found' })
    res.json({ message: 'Record deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}
