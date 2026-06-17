import { Schema, model, models } from 'mongoose'

const IpdAnesthesiaPreAssessmentSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true },
  surgeryRecordId: { type: Schema.Types.ObjectId, ref: 'Hospital_IpdSurgeryRecord' },
  // Existing / Present Problems
  existingProblems: {
    cvs: { type: String },
    renal: { type: String },
    respiration: { type: String },
    hepatic: { type: String },
    diabetic: { type: String },
    git: { type: String },
    neurology: { type: String },
    anesthesiaHistory: { type: String },
    eventful: { type: String },
  },
  // Physical Examination
  physicalExam: {
    bp: { type: String },
    pulse: { type: String },
    temp: { type: String },
    rr: { type: String },
    cvs: { type: String },
    chest: { type: String },
    teeth: { type: String },
    mallampatiScore: { type: String, enum: ['I', 'II', 'III', 'IV'] },
    asaClass: { type: String, enum: ['I', 'II', 'III', 'IV', 'V', 'VI', 'E'] },
  },
  // Anesthesia Plan
  plan: {
    general: { type: String },
    spinal: { type: String },
    local: { type: String },
    monitoringCare: { type: String },
    npo: { type: String },
    fluidsBlood: { type: String },
    preAnesthesiaMedication: { type: String },
  },
  // Checklist
  checklist: {
    patientIdentified: { type: Boolean, default: false },
    consentRevised: { type: Boolean, default: false },
    siteChecked: { type: Boolean, default: false },
  },
  // Pre-Induction Re-evaluation
  preInduction: {
    orientation: { type: String },
    bp: { type: String },
    pulse: { type: String },
    temp: { type: String },
    spo2: { type: String },
  },
  // Change in Anesthesia Plan
  planChange: {
    changed: { type: Boolean, default: false },
    general: { type: String },
    spinal: { type: String },
    local: { type: String },
  },
  // Clinical fields
  airwayAssessment: { type: String },
  allergies: [{ type: String }],
  relevantHistory: { type: String },
  fastingStatus: { type: String },
  preMedication: { type: String },
  // Team
  anesthesiologistId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  anesthesiologistName: { type: String },
  // Sign-off
  anesthesiologistSign: { type: String },
  anesthesiologistSignedAt: { type: Date },
  // Status
  status: {
    type: String,
    enum: ['draft', 'finalized'],
    default: 'draft',
    index: true,
  },
}, { timestamps: true })

IpdAnesthesiaPreAssessmentSchema.index({ encounterId: 1, createdAt: -1 })
IpdAnesthesiaPreAssessmentSchema.index({ surgeryRecordId: 1 })

export type HospitalIpdAnesthesiaPreAssessmentDoc = {
  _id: string
  patientId: string
  encounterId: string
  surgeryRecordId?: string
  existingProblems?: {
    cvs?: string; renal?: string; respiration?: string; hepatic?: string; diabetic?: string
    git?: string; neurology?: string; anesthesiaHistory?: string; eventful?: string
  }
  physicalExam?: {
    bp?: string; pulse?: string; temp?: string; rr?: string; cvs?: string; chest?: string; teeth?: string
    mallampatiScore?: 'I' | 'II' | 'III' | 'IV'; asaClass?: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'E'
  }
  plan?: {
    general?: string; spinal?: string; local?: string; monitoringCare?: string
    npo?: string; fluidsBlood?: string; preAnesthesiaMedication?: string
  }
  checklist?: { patientIdentified?: boolean; consentRevised?: boolean; siteChecked?: boolean }
  preInduction?: { orientation?: string; bp?: string; pulse?: string; temp?: string; spo2?: string }
  planChange?: { changed?: boolean; general?: string; spinal?: string; local?: string }
  airwayAssessment?: string
  allergies?: string[]
  relevantHistory?: string
  fastingStatus?: string
  preMedication?: string
  anesthesiologistId?: string
  anesthesiologistName?: string
  anesthesiologistSign?: string
  anesthesiologistSignedAt?: Date
  status?: 'draft' | 'finalized'
}

export const HospitalIpdAnesthesiaPreAssessment = models.Hospital_IpdAnesthesiaPreAssessment || model('Hospital_IpdAnesthesiaPreAssessment', IpdAnesthesiaPreAssessmentSchema)
