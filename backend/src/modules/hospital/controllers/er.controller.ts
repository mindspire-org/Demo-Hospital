import { Request, Response } from 'express'

import { HospitalEncounter } from '../models/Encounter'
import { HospitalToken } from '../models/Token'
import { LabPatient } from '../../lab/models/Patient'
import { HospitalDoctor } from '../models/Doctor'
import { HospitalBed } from '../models/Bed'
import { HospitalFloor } from '../models/Floor'
import { HospitalRoom } from '../models/Room'
import { HospitalWard } from '../models/Ward'

import { HospitalErCharge } from '../models/ErCharge'
import { HospitalErVital } from '../models/ErVital'
import { HospitalErMedicationOrder } from '../models/ErMedicationOrder'
import { HospitalErClinicalNote } from '../models/ErClinicalNote'
import { HospitalErInitialAssessment } from '../models/ErInitialAssessment'

import { createErChargeSchema, updateErChargeSchema } from '../validators/er'

import { recalcErPaidAmounts, computeTotals } from './er_billing.controller'



async function getEREncounter(encounterId: string){

  const enc = await HospitalEncounter.findById(encounterId)
    .populate('patientId', 'mrn fullName name phone phoneNo phoneNormalized mobile age gender fatherName guardianName address city')
    .populate('doctorId', 'fullName name')
    .populate('tokenId', 'tokenNo displayTokenNo')
    .lean()

  if (!enc) throw { status: 404, error: 'Encounter not found' }

  if (String((enc as any).type) !== 'ER') throw { status: 400, error: 'Encounter is not ER' }

  return enc as any

}



function handleError(res: Response, e: any){

  if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' })

  if (e?.status) return res.status(e.status).json({ error: e.error || 'Error' })

  return res.status(500).json({ error: 'Internal Server Error' })

}



export async function listCharges(req: Request, res: Response){

  try{

    const { encounterId } = req.params as any

    const enc = await getEREncounter(String(encounterId))

    const q = req.query as any

    const limit = Math.max(1, Math.min(500, parseInt(String(q.limit || '200')) || 200))

    const rows = await HospitalErCharge.find({ encounterId: enc._id }).sort({ date: -1, createdAt: -1 }).limit(limit).lean()

    res.json({ charges: rows })

  }catch(e){ return handleError(res, e) }

}



export async function createCharge(req: Request, res: Response){

  try{

    const { encounterId } = req.params as any

    const enc = await getEREncounter(String(encounterId))

    const data = createErChargeSchema.parse(req.body)

    const amount = data.amount ?? ((data.qty || 0) * (data.unitPrice || 0))

    const row = await HospitalErCharge.create({ ...data, amount, encounterId: enc._id, patientId: (enc as any).patientId })

    // Trigger recalculation to auto-allocate any existing advances to this new charge
    await recalcErPaidAmounts(enc._id)

    // Return the charge with updated billing totals
    const totals = await computeTotals(String(enc._id))
    res.status(201).json({ charge: row, totals })

  }catch(e){ return handleError(res, e) }

}



export async function removeCharge(req: Request, res: Response){

  try{

    const { id } = req.params as any

    const row = await HospitalErCharge.findByIdAndDelete(String(id))

    if (!row) return res.status(404).json({ error: 'Charge not found' })

    res.json({ ok: true })

  }catch(e){ return handleError(res, e) }

}



export async function updateCharge(req: Request, res: Response){

  try{

    const { id } = req.params as any

    const data = updateErChargeSchema.parse(req.body)

    const set: any = { ...data }

    if (set.description != null) set.description = String(set.description).trim()



    // If qty/unitPrice changed but amount not explicitly provided, recompute

    if (set.amount == null && (set.qty != null || set.unitPrice != null)){

      const existing: any = await HospitalErCharge.findById(String(id)).lean()

      if (!existing) return res.status(404).json({ error: 'Charge not found' })

      const qty = set.qty != null ? Number(set.qty || 0) : Number(existing.qty || 0)

      const unitPrice = set.unitPrice != null ? Number(set.unitPrice || 0) : Number(existing.unitPrice || 0)

      set.amount = qty * unitPrice

    }



    const row = await HospitalErCharge.findByIdAndUpdate(String(id), { $set: set }, { new: true })

    if (!row) return res.status(404).json({ error: 'Charge not found' })

    res.json({ charge: row })

  }catch(e){ return handleError(res, e) }

}

export async function listER(req: Request, res: Response){
  try{
    const q = req.query as any
    const limit = Math.max(1, Math.min(500, parseInt(String(q.limit || '200')) || 200))
    const skip = Math.max(0, parseInt(String(q.skip || '0')) || 0)

    const filter: any = { type: 'ER' }
    if (q.status) filter.status = String(q.status)
    if (q.departmentId) filter.departmentId = String(q.departmentId)
    if (q.patientId) filter.patientId = String(q.patientId)

    const rows = await HospitalEncounter.find(filter)
      .populate('patientId', 'mrn fullName phoneNormalized age gender')
      .populate('doctorId', 'fullName name')
      .populate('tokenId', 'tokenNo')
      .populate({
        path: 'bedId',
        model: 'Hospital_Bed',
        select: 'label floorId locationType locationId'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // Transform to add bedLocation info
    const floorIds = new Set<string>()
    const roomIds = new Set<string>()
    const wardIds = new Set<string>()
    
    for (const enc of rows) {
      const bed = (enc as any).bedId
      if (bed && typeof bed === 'object') {
        if (bed.floorId) floorIds.add(String(bed.floorId))
        if (bed.locationType === 'room' && bed.locationId) roomIds.add(String(bed.locationId))
        if (bed.locationType === 'ward' && bed.locationId) wardIds.add(String(bed.locationId))
      }
    }
    
    const [floors, rooms, wards] = await Promise.all([
      HospitalFloor.find({ _id: { $in: Array.from(floorIds) } }).select('_id name').lean(),
      HospitalRoom.find({ _id: { $in: Array.from(roomIds) } }).select('_id name').lean(),
      HospitalWard.find({ _id: { $in: Array.from(wardIds) } }).select('_id name').lean(),
    ])
    
    const floorMap = new Map(floors.map(f => [String(f._id), f.name]))
    const roomMap = new Map(rooms.map(r => [String(r._id), r.name]))
    const wardMap = new Map(wards.map(w => [String(w._id), w.name]))
    
    const transformedRows = rows.map(enc => {
      const row = enc as any
      const bed = row.bedId
      
      if (bed && typeof bed === 'object') {
        const floorName = floorMap.get(String(bed.floorId)) || ''
        const locationName = bed.locationType === 'room' 
          ? (roomMap.get(String(bed.locationId)) || '')
          : (wardMap.get(String(bed.locationId)) || '')
        
        row.bedLocation = {
          floor: floorName,
          type: bed.locationType,
          location: locationName,
          bed: bed.label
        }
        row.bedLabel = bed.label
      }
      
      return row
    })

    res.json({ encounters: transformedRows })
  }catch(e){ return handleError(res, e) }
}

export async function getEREncounterById(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const enc = await getEREncounter(String(id))

    // Fetch all related records in parallel
    const [vitals, medOrders, clinicalNotes, initialAssessments, charges] = await Promise.all([
      HospitalErVital.find({ encounterId: enc._id }).sort({ recordedAt: -1 }).limit(100).lean(),
      HospitalErMedicationOrder.find({ encounterId: enc._id }).sort({ createdAt: -1 }).limit(100).lean(),
      HospitalErClinicalNote.find({ encounterId: enc._id }).sort({ recordedAt: -1 }).limit(100).lean(),
      HospitalErInitialAssessment.find({ encounterId: enc._id }).sort({ assessmentTime: -1 }).limit(10).lean(),
      HospitalErCharge.find({ encounterId: enc._id }).sort({ date: -1 }).limit(100).lean(),
    ])

    res.json({
      encounter: enc,
      vitals,
      medOrders,
      clinicalNotes,
      initialAssessments,
      charges,
    })
  }catch(e){ return handleError(res, e) }
}

