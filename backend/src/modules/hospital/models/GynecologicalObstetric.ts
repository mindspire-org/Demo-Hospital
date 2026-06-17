import mongoose, { Schema, Document } from 'mongoose'

export interface IGynecologicalObstetric extends Document {
  patientId: mongoose.Types.ObjectId
  encounterId: mongoose.Types.ObjectId
  doctorId: mongoose.Types.ObjectId
  
  // Obstetric History
  gravida: number
  para: number
  abortions: number
  livingChildren: number
  lastMenstrualPeriod?: Date
  expectedDeliveryDate?: Date
  gestationalAge?: string
  previousDeliveries?: Array<{
    year: number
    mode: string
    complications?: string
  }>
  
  // Current Pregnancy
  pregnant: boolean
  trimester?: number
  antenatalVisits?: number
  highRiskPregnancy: boolean
  riskFactors?: string
  
  // Gynecological History
  menarcheAge?: number
  menstrualCycle: string
  menstrualDuration?: string
  menstrualFlow?: string
  dysmenorrhea: boolean
  menorrhagia: boolean
  intermenstrualBleeding: boolean
  postcoitalBleeding: boolean
  postmenopausalBleeding: boolean
  menopauseAge?: number
  
  // Symptoms
  vaginalDischarge: boolean
  dischargeType?: string
  pruritus: boolean
  dyspareunia: boolean
  pelvicPain: boolean
  urinarySymptoms: boolean
  
  // Physical Examination
  generalCondition: string
  vitalSigns: {
    bp?: string
    pulse?: number
    temp?: number
    respiratoryRate?: number
  }
  fundalHeight?: string
  fetalHeartRate?: number
  presentation?: string
  pelvicExamination: string
  vaginalExamination: string
  cervicalFindings?: string
  papSmear?: string
  
  // Diagnostic Tests
  ultrasoundFindings?: string
  bloodHb?: number
  bloodGroup?: string
  hivStatus?: string
  hepatitisBStatus?: string
  vdrlTest?: string
  rubellaStatus?: string
  bloodSugar?: string
  
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
  immunizations?: string
  nutritionalAdvice?: string
  deliveryPlan?: string
  
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const GynecologicalObstetricSchema = new Schema<IGynecologicalObstetric>({
  patientId: { type: Schema.Types.ObjectId, ref: 'LabPatient', required: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'HospitalEncounter', required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'HospitalDoctor', required: true },
  
  gravida: { type: Number, default: 0 },
  para: { type: Number, default: 0 },
  abortions: { type: Number, default: 0 },
  livingChildren: { type: Number, default: 0 },
  lastMenstrualPeriod: Date,
  expectedDeliveryDate: Date,
  gestationalAge: String,
  previousDeliveries: [{
    year: Number,
    mode: String,
    complications: String
  }],
  
  pregnant: { type: Boolean, default: false },
  trimester: Number,
  antenatalVisits: Number,
  highRiskPregnancy: { type: Boolean, default: false },
  riskFactors: String,
  
  menarcheAge: Number,
  menstrualCycle: String,
  menstrualDuration: String,
  menstrualFlow: String,
  dysmenorrhea: { type: Boolean, default: false },
  menorrhagia: { type: Boolean, default: false },
  intermenstrualBleeding: { type: Boolean, default: false },
  postcoitalBleeding: { type: Boolean, default: false },
  postmenopausalBleeding: { type: Boolean, default: false },
  menopauseAge: Number,
  
  vaginalDischarge: { type: Boolean, default: false },
  dischargeType: String,
  pruritus: { type: Boolean, default: false },
  dyspareunia: { type: Boolean, default: false },
  pelvicPain: { type: Boolean, default: false },
  urinarySymptoms: { type: Boolean, default: false },
  
  generalCondition: String,
  vitalSigns: {
    bp: String,
    pulse: Number,
    temp: Number,
    respiratoryRate: Number
  },
  fundalHeight: String,
  fetalHeartRate: Number,
  presentation: String,
  pelvicExamination: String,
  vaginalExamination: String,
  cervicalFindings: String,
  papSmear: String,
  
  ultrasoundFindings: String,
  bloodHb: Number,
  bloodGroup: String,
  hivStatus: String,
  hepatitisBStatus: String,
  vdrlTest: String,
  rubellaStatus: String,
  bloodSugar: String,
  
  primaryDiagnosis: { type: String, required: true },
  secondaryDiagnosis: String,
  
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    duration: String
  }],
  immunizations: String,
  nutritionalAdvice: String,
  deliveryPlan: String,
  
  notes: String
}, { timestamps: true })

export const GynecologicalObstetric = mongoose.model<IGynecologicalObstetric>('GynecologicalObstetric', GynecologicalObstetricSchema)
