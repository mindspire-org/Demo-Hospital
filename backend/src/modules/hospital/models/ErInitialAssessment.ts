import { Schema, model, models } from 'mongoose'

const ErInitialAssessmentSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true },
  arrivalTime: { type: Date, required: true },
  assessmentTime: { type: Date, default: Date.now, required: true },
  assessedBy: { type: String, required: true },
  chiefComplaint: { type: String, required: true },
  historyOfPresentingIllness: { type: String },
  pastMedicalHistory: { type: String },
  medications: { type: String },
  allergies: { type: String },
  vitals: {
    bp: { type: String },
    pulse: { type: Number },
    temp: { type: Number },
    rr: { type: Number },
    spo2: { type: Number },
    pain: { type: Number },
  },
  nurseNotes: { type: String },
}, { timestamps: true })

ErInitialAssessmentSchema.index({ encounterId: 1, assessmentTime: -1 })

export type HospitalErInitialAssessmentDoc = {
  _id: string
  patientId: string
  encounterId: string
  arrivalTime: Date
  assessmentTime: Date
  assessedBy: string
  chiefComplaint: string
  historyOfPresentingIllness?: string
  pastMedicalHistory?: string
  medications?: string
  allergies?: string
  vitals?: {
    bp?: string
    pulse?: number
    temp?: number
    rr?: number
    spo2?: number
    pain?: number
  }
  nurseNotes?: string
}

export const HospitalErInitialAssessment = models.Hospital_ErInitialAssessment || model('Hospital_ErInitialAssessment', ErInitialAssessmentSchema)
