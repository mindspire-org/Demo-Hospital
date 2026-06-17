import { Schema, model, models } from 'mongoose'

const IpdHistoryExamSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true },
  // History
  chiefComplaint: { type: String },
  historyOfPresentIllness: { type: String },
  pastMedicalHistory: { type: String },
  pastSurgicalHistory: { type: String },
  familyHistory: { type: String },
  socialHistory: { type: String },
  drugHistory: [{ 
    drugName: { type: String },
    dose: { type: String },
    frequency: { type: String },
    duration: { type: String }
  }],
  allergyHistory: [{
    allergen: { type: String },
    reaction: { type: String },
    severity: { type: String, enum: ['mild', 'moderate', 'severe'] }
  }],
  // Examination
  generalAppearance: { type: String },
  vitals: {
    bp: { type: String },
    hr: { type: Number },
    rr: { type: Number },
    temp: { type: Number },
    spo2: { type: Number },
    weight: { type: Number },
    height: { type: Number },
    bmi: { type: Number }
  },
  // System examination
  heent: { type: String }, // Head, Eyes, Ears, Nose, Throat
  cardiovascular: { type: String },
  respiratory: { type: String },
  abdominal: { type: String },
  musculoskeletal: { type: String },
  neurological: { type: String },
  dermatological: { type: String },
  psychiatric: { type: String },
  // Other systems
  otherSystems: { type: Schema.Types.Mixed },
  // Diagnosis
  provisionalDiagnosis: { type: String },
  differentialDiagnosis: [{ type: String }],
  finalDiagnosis: { type: String },
  diagnosisCodes: [{ 
    code: { type: String }, // ICD-10
    description: { type: String }
  }],
  // Plan
  investigationPlan: { type: String },
  treatmentPlan: { type: String },
  generalStatus: { type: String },
  advisedDiet: { type: String },
  // Doctor
  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  doctorName: { type: String },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Department' },
  // Type
  examType: { 
    type: String, 
    enum: ['admission', 'follow-up', 'pre-op', 'consultation'],
    default: 'admission',
    index: true
  },
  // Signature
  doctorSignature: { type: String },
  doctorSignedAt: { type: Date },
}, { timestamps: true })

IpdHistoryExamSchema.index({ encounterId: 1, examType: 1 })
IpdHistoryExamSchema.index({ patientId: 1, createdAt: -1 })

export type HospitalIpdHistoryExamDoc = {
  _id: string
  patientId: string
  encounterId: string
  chiefComplaint?: string
  historyOfPresentIllness?: string
  pastMedicalHistory?: string
  pastSurgicalHistory?: string
  familyHistory?: string
  socialHistory?: string
  drugHistory?: Array<{ drugName?: string; dose?: string; frequency?: string; duration?: string }>
  allergyHistory?: Array<{ allergen?: string; reaction?: string; severity?: 'mild' | 'moderate' | 'severe' }>
  generalAppearance?: string
  vitals?: {
    bp?: string
    hr?: number
    rr?: number
    temp?: number
    spo2?: number
    weight?: number
    height?: number
    bmi?: number
  }
  heent?: string
  cardiovascular?: string
  respiratory?: string
  abdominal?: string
  musculoskeletal?: string
  neurological?: string
  dermatological?: string
  psychiatric?: string
  otherSystems?: any
  provisionalDiagnosis?: string
  differentialDiagnosis?: string[]
  finalDiagnosis?: string
  diagnosisCodes?: Array<{ code?: string; description?: string }>
  investigationPlan?: string
  treatmentPlan?: string
  generalStatus?: string
  advisedDiet?: string
  doctorId?: string
  doctorName?: string
  departmentId?: string
  examType?: 'admission' | 'follow-up' | 'pre-op' | 'consultation'
  doctorSignature?: string
  doctorSignedAt?: Date
}

export const HospitalIpdHistoryExam = models.Hospital_IpdHistoryExam || model('Hospital_IpdHistoryExam', IpdHistoryExamSchema)
