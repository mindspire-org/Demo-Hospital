import { Request, Response } from 'express'
import { CardiovascularSystem } from '../models/CardiovascularSystem'
import { HospitalEncounter } from '../models/Encounter'

export async function create(req: Request, res: Response) {
  try {
    const data = req.body
    
    const enc = await HospitalEncounter.findById(data.encounterId)
    if (!enc) return res.status(404).json({ error: 'Encounter not found' })

    const record = await CardiovascularSystem.create({
      patientId: enc.patientId,
      encounterId: data.encounterId,
      doctorId: data.doctorId || enc.doctorId,
      
      chestPain: data.chestPain,
      chestPainDetails: data.chestPainDetails,
      dyspnea: data.dyspnea,
      dyspneaDetails: data.dyspneaDetails,
      palpitations: data.palpitations,
      palpitationsDetails: data.palpitationsDetails,
      orthopnea: data.orthopnea,
      orthopneaDetails: data.orthopneaDetails,
      paroxysmalNocturnalDyspnea: data.paroxysmalNocturnalDyspnea,
      pndDetails: data.pndDetails,
      claudication: data.claudication,
      claudicationDetails: data.claudicationDetails,
      
      heartRate: data.heartRate,
      bloodPressureSystolic: data.bloodPressureSystolic,
      bloodPressureDiastolic: data.bloodPressureDiastolic,
      jugularVenousPressure: data.jugularVenousPressure,
      pedalEdema: data.pedalEdema,
      pedalEdemaGrade: data.pedalEdemaGrade,
      heartSounds: data.heartSounds,
      murmurs: data.murmurs,
      murmurDetails: data.murmurDetails,
      
      ecgFindings: data.ecgFindings,
      echocardiogramFindings: data.echocardiogramFindings,
      stressTestResults: data.stressTestResults,
      cardiacEnzymes: data.cardiacEnzymes,
      lipidProfile: data.lipidProfile,
      
      primaryDiagnosis: data.primaryDiagnosis,
      secondaryDiagnosis: data.secondaryDiagnosis,
      
      medications: data.medications || [],
      lifestyleAdvice: data.lifestyleAdvice,
      followUpPlan: data.followUpPlan,
      notes: data.notes
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
      CardiovascularSystem.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('patientId', 'fullName mrn')
        .populate('doctorId', 'name')
        .lean(),
      CardiovascularSystem.countDocuments(query)
    ])
    
    res.json({ records, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export async function getById(req: Request, res: Response) {
  try {
    const { id } = req.params
    const record = await CardiovascularSystem.findById(id)
      .populate('patientId', 'fullName mrn')
      .populate('doctorId', 'name')
      .lean()
    
    if (!record) return res.status(404).json({ error: 'Record not found' })
    
    res.json({ record })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export async function update(req: Request, res: Response) {
  try {
    const { id } = req.params
    const data = req.body
    
    const record = await CardiovascularSystem.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    )
    
    if (!record) return res.status(404).json({ error: 'Record not found' })
    
    res.json({ record })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const { id } = req.params
    const record = await CardiovascularSystem.findByIdAndDelete(id)
    
    if (!record) return res.status(404).json({ error: 'Record not found' })
    
    res.json({ message: 'Record deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}
