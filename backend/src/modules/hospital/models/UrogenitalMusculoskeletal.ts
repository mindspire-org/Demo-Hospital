import mongoose, { Schema, Document } from 'mongoose'

export interface IUrogenitalMusculoskeletal extends Document {
  patientId: mongoose.Types.ObjectId
  encounterId: mongoose.Types.ObjectId
  doctorId: mongoose.Types.ObjectId
  
  // Urogenital History
  dysuria: boolean
  dysuriaDetails?: string
  frequency: boolean
  urgency: boolean
  hematuria: boolean
  hematuriaDetails?: string
  nocturia: boolean
  nocturiaTimes?: number
  weakStream: boolean
  hesitancy: boolean
  incontinence: boolean
  incontinenceType?: string
  flankPain: boolean
  flankPainSide?: string
  urethralDischarge: boolean
  dischargeDetails?: string
  sexualDysfunction: boolean
  menstrualIrregularities?: string
  
  // Musculoskeletal History
  jointPain: boolean
  jointPainDetails?: string
  morningStiffness: boolean
  stiffnessDuration?: string
  swelling: boolean
  swellingJoints?: string
  deformity: boolean
  deformityDetails?: string
  backPain: boolean
  backPainDetails?: string
  muscleWeakness: boolean
  trauma: boolean
  traumaDetails?: string
  
  // Physical Examination - Urogenital
  kidneyPalpation: string
  suprapubicTenderness: boolean
  prostateExamination?: string
  externalGenitalia?: string
  
  // Physical Examination - Musculoskeletal
  gait: string
  spineExamination: string
  jointInspection: string
  rangeOfMotion: string
  muscleStrength: string
  tenderness: string
  crepitus: boolean
  instability: boolean
  deformityExamination: string
  
  // Diagnostic Tests
  urineAnalysis?: string
  urineCulture?: string
  psaLevel?: number
  renalFunctionTests?: string
  ultrasoundKub?: string
  ctKubFindings?: string
  xrayFindings?: string
  mriFindings?: string
  boneDensity?: string
  rheumatoidFactor?: string
  
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
  physiotherapy?: string
  surgicalPlan?: string
  
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const UrogenitalMusculoskeletalSchema = new Schema<IUrogenitalMusculoskeletal>({
  patientId: { type: Schema.Types.ObjectId, ref: 'LabPatient', required: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'HospitalEncounter', required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'HospitalDoctor', required: true },
  
  dysuria: { type: Boolean, default: false },
  dysuriaDetails: String,
  frequency: { type: Boolean, default: false },
  urgency: { type: Boolean, default: false },
  hematuria: { type: Boolean, default: false },
  hematuriaDetails: String,
  nocturia: { type: Boolean, default: false },
  nocturiaTimes: Number,
  weakStream: { type: Boolean, default: false },
  hesitancy: { type: Boolean, default: false },
  incontinence: { type: Boolean, default: false },
  incontinenceType: String,
  flankPain: { type: Boolean, default: false },
  flankPainSide: String,
  urethralDischarge: { type: Boolean, default: false },
  dischargeDetails: String,
  sexualDysfunction: { type: Boolean, default: false },
  menstrualIrregularities: String,
  
  jointPain: { type: Boolean, default: false },
  jointPainDetails: String,
  morningStiffness: { type: Boolean, default: false },
  stiffnessDuration: String,
  swelling: { type: Boolean, default: false },
  swellingJoints: String,
  deformity: { type: Boolean, default: false },
  deformityDetails: String,
  backPain: { type: Boolean, default: false },
  backPainDetails: String,
  muscleWeakness: { type: Boolean, default: false },
  trauma: { type: Boolean, default: false },
  traumaDetails: String,
  
  kidneyPalpation: String,
  suprapubicTenderness: { type: Boolean, default: false },
  prostateExamination: String,
  externalGenitalia: String,
  
  gait: String,
  spineExamination: String,
  jointInspection: String,
  rangeOfMotion: String,
  muscleStrength: String,
  tenderness: String,
  crepitus: { type: Boolean, default: false },
  instability: { type: Boolean, default: false },
  deformityExamination: String,
  
  urineAnalysis: String,
  urineCulture: String,
  psaLevel: Number,
  renalFunctionTests: String,
  ultrasoundKub: String,
  ctKubFindings: String,
  xrayFindings: String,
  mriFindings: String,
  boneDensity: String,
  rheumatoidFactor: String,
  
  primaryDiagnosis: { type: String, required: true },
  secondaryDiagnosis: String,
  
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    duration: String
  }],
  physiotherapy: String,
  surgicalPlan: String,
  
  notes: String
}, { timestamps: true })

export const UrogenitalMusculoskeletal = mongoose.model<IUrogenitalMusculoskeletal>('UrogenitalMusculoskeletal', UrogenitalMusculoskeletalSchema)
