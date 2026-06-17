import mongoose, { Schema, Document } from 'mongoose'

export interface ICardiovascularSystem extends Document {
  patientId: mongoose.Types.ObjectId
  encounterId: mongoose.Types.ObjectId
  doctorId: mongoose.Types.ObjectId
  
  // Cardiovascular Examination
  chestPain: boolean
  chestPainDetails?: string
  dyspnea: boolean
  dyspneaDetails?: string
  palpitations: boolean
  palpitationsDetails?: string
  orthopnea: boolean
  orthopneaDetails?: string
  paroxysmalNocturnalDyspnea: boolean
  pndDetails?: string
  claudication: boolean
  claudicationDetails?: string
  
  // Physical Examination
  heartRate: number
  bloodPressureSystolic: number
  bloodPressureDiastolic: number
  jugularVenousPressure: string
  pedalEdema: boolean
  pedalEdemaGrade?: string
  heartSounds: string
  murmurs: boolean
  murmurDetails?: string
  
  // Diagnostic Tests
  ecgFindings?: string
  echocardiogramFindings?: string
  stressTestResults?: string
  cardiacEnzymes?: string
  lipidProfile?: string
  
  // Diagnosis
  primaryDiagnosis: string
  secondaryDiagnosis?: string
  
  // Treatment
  medications: Array<{
    name: string
    dosage: string
    frequency: string
    duration: string
  }>
  lifestyleAdvice?: string
  followUpPlan?: string
  
  // Additional Notes
  notes?: string
  
  createdAt: Date
  updatedAt: Date
}

const CardiovascularSystemSchema = new Schema<ICardiovascularSystem>({
  patientId: { type: Schema.Types.ObjectId, ref: 'LabPatient', required: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'HospitalEncounter', required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'HospitalDoctor', required: true },
  
  chestPain: { type: Boolean, default: false },
  chestPainDetails: String,
  dyspnea: { type: Boolean, default: false },
  dyspneaDetails: String,
  palpitations: { type: Boolean, default: false },
  palpitationsDetails: String,
  orthopnea: { type: Boolean, default: false },
  orthopneaDetails: String,
  paroxysmalNocturnalDyspnea: { type: Boolean, default: false },
  pndDetails: String,
  claudication: { type: Boolean, default: false },
  claudicationDetails: String,
  
  heartRate: Number,
  bloodPressureSystolic: Number,
  bloodPressureDiastolic: Number,
  jugularVenousPressure: String,
  pedalEdema: { type: Boolean, default: false },
  pedalEdemaGrade: String,
  heartSounds: String,
  murmurs: { type: Boolean, default: false },
  murmurDetails: String,
  
  ecgFindings: String,
  echocardiogramFindings: String,
  stressTestResults: String,
  cardiacEnzymes: String,
  lipidProfile: String,
  
  primaryDiagnosis: { type: String, required: true },
  secondaryDiagnosis: String,
  
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    duration: String
  }],
  lifestyleAdvice: String,
  followUpPlan: String,
  notes: String
}, { timestamps: true })

export const CardiovascularSystem = mongoose.model<ICardiovascularSystem>('CardiovascularSystem', CardiovascularSystemSchema)
