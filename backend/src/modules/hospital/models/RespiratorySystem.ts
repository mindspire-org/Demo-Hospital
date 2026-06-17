import mongoose, { Schema, Document } from 'mongoose'

export interface IRespiratorySystem extends Document {
  patientId: mongoose.Types.ObjectId
  encounterId: mongoose.Types.ObjectId
  doctorId: mongoose.Types.ObjectId
  
  // Symptoms
  cough: boolean
  coughDuration?: string
  coughType?: string
  sputum: boolean
  sputumColor?: string
  sputumAmount?: string
  hemoptysis: boolean
  hemoptysisDetails?: string
  dyspnea: boolean
  dyspneaSeverity?: string
  chestPain: boolean
  chestPainDetails?: string
  wheezing: boolean
  wheezingDetails?: string
  orthopnea: boolean
  orthopneaPillows?: number
  paroxysmalNocturnalDyspnea: boolean
  
  // Physical Examination
  respiratoryRate: number
  chestInspection: string
  chestPalpation: string
  chestPercussion: string
  breathSounds: string
  adventitiousSounds: string
  chestExpansion: string
  tracheaPosition: string
  
  // Diagnostic Tests
  chestXRayFindings?: string
  ctScanFindings?: string
  pulmonaryFunctionTests?: string
  abgResults?: string
  sputumCytology?: string
  
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
  oxygenTherapy?: boolean
  oxygenFlowRate?: string
  nebulization?: boolean
  nebulizationDetails?: string
  physiotherapy?: string
  
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const RespiratorySystemSchema = new Schema<IRespiratorySystem>({
  patientId: { type: Schema.Types.ObjectId, ref: 'LabPatient', required: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'HospitalEncounter', required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'HospitalDoctor', required: true },
  
  cough: { type: Boolean, default: false },
  coughDuration: String,
  coughType: String,
  sputum: { type: Boolean, default: false },
  sputumColor: String,
  sputumAmount: String,
  hemoptysis: { type: Boolean, default: false },
  hemoptysisDetails: String,
  dyspnea: { type: Boolean, default: false },
  dyspneaSeverity: String,
  chestPain: { type: Boolean, default: false },
  chestPainDetails: String,
  wheezing: { type: Boolean, default: false },
  wheezingDetails: String,
  orthopnea: { type: Boolean, default: false },
  orthopneaPillows: Number,
  paroxysmalNocturnalDyspnea: { type: Boolean, default: false },
  
  respiratoryRate: Number,
  chestInspection: String,
  chestPalpation: String,
  chestPercussion: String,
  breathSounds: String,
  adventitiousSounds: String,
  chestExpansion: String,
  tracheaPosition: String,
  
  chestXRayFindings: String,
  ctScanFindings: String,
  pulmonaryFunctionTests: String,
  abgResults: String,
  sputumCytology: String,
  
  primaryDiagnosis: { type: String, required: true },
  secondaryDiagnosis: String,
  
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    duration: String
  }],
  oxygenTherapy: { type: Boolean, default: false },
  oxygenFlowRate: String,
  nebulization: { type: Boolean, default: false },
  nebulizationDetails: String,
  physiotherapy: String,
  
  notes: String
}, { timestamps: true })

export const RespiratorySystem = mongoose.model<IRespiratorySystem>('RespiratorySystem', RespiratorySystemSchema)
