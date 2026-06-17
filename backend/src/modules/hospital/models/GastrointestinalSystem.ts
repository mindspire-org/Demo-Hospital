import mongoose, { Schema, Document } from 'mongoose'

export interface IGastrointestinalSystem extends Document {
  patientId: mongoose.Types.ObjectId
  encounterId: mongoose.Types.ObjectId
  doctorId: mongoose.Types.ObjectId
  
  // Symptoms
  appetite: string
  nausea: boolean
  nauseaDetails?: string
  vomiting: boolean
  vomitingDetails?: string
  hematemesis: boolean
  hematemesisDetails?: string
  dysphagia: boolean
  dysphagiaDetails?: string
  odynophagia: boolean
  abdominalPain: boolean
  painLocation?: string
  painCharacter?: string
  bloating: boolean
  flatulence: boolean
  constipation: boolean
  diarrhea: boolean
  stoolColor?: string
  melena: boolean
  hematochezia: boolean
  weightLoss: boolean
  weightLossAmount?: string
  jaundice: boolean
  
  // Physical Examination
  abdominalInspection: string
  abdominalPalpation: string
  tenderness: string
  guarding: boolean
  reboundTenderness: boolean
  abdominalPercussion: string
  bowelSounds: string
  organomegaly: string
  herniaOrifices: string
  
  // Diagnostic Tests
  ultrasoundFindings?: string
  ctAbdomenFindings?: string
  endoscopyFindings?: string
  colonoscopyFindings?: string
  bariumStudyFindings?: string
  liverFunctionTests?: string
  amylaseLipase?: string
  
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
  dietaryAdvice?: string
  surgicalPlan?: string
  
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const GastrointestinalSystemSchema = new Schema<IGastrointestinalSystem>({
  patientId: { type: Schema.Types.ObjectId, ref: 'LabPatient', required: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'HospitalEncounter', required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'HospitalDoctor', required: true },
  
  appetite: String,
  nausea: { type: Boolean, default: false },
  nauseaDetails: String,
  vomiting: { type: Boolean, default: false },
  vomitingDetails: String,
  hematemesis: { type: Boolean, default: false },
  hematemesisDetails: String,
  dysphagia: { type: Boolean, default: false },
  dysphagiaDetails: String,
  odynophagia: { type: Boolean, default: false },
  abdominalPain: { type: Boolean, default: false },
  painLocation: String,
  painCharacter: String,
  bloating: { type: Boolean, default: false },
  flatulence: { type: Boolean, default: false },
  constipation: { type: Boolean, default: false },
  diarrhea: { type: Boolean, default: false },
  stoolColor: String,
  melena: { type: Boolean, default: false },
  hematochezia: { type: Boolean, default: false },
  weightLoss: { type: Boolean, default: false },
  weightLossAmount: String,
  jaundice: { type: Boolean, default: false },
  
  abdominalInspection: String,
  abdominalPalpation: String,
  tenderness: String,
  guarding: { type: Boolean, default: false },
  reboundTenderness: { type: Boolean, default: false },
  abdominalPercussion: String,
  bowelSounds: String,
  organomegaly: String,
  herniaOrifices: String,
  
  ultrasoundFindings: String,
  ctAbdomenFindings: String,
  endoscopyFindings: String,
  colonoscopyFindings: String,
  bariumStudyFindings: String,
  liverFunctionTests: String,
  amylaseLipase: String,
  
  primaryDiagnosis: { type: String, required: true },
  secondaryDiagnosis: String,
  
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    duration: String
  }],
  dietaryAdvice: String,
  surgicalPlan: String,
  
  notes: String
}, { timestamps: true })

export const GastrointestinalSystem = mongoose.model<IGastrointestinalSystem>('GastrointestinalSystem', GastrointestinalSystemSchema)
