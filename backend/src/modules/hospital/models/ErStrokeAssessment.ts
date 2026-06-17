import { Schema, model, models } from 'mongoose'

const ErStrokeAssessmentSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true },
  assessedBy: { type: String, required: true },
  assessmentTime: { type: Date, default: Date.now, required: true },

  mrsBeforeIllness: { type: String },
  lastSeenWell: { type: String },
  presentingComplaints: { type: String },
  previousPciCabg: { type: String },
  comorbidities: { type: String },

  vitals: {
    pulse: { type: String },
    bp: { type: String },
    rr: { type: String },
    temp: { type: String },
    spo2: { type: String },
    bsr: { type: String }
  },

  cvsExam: { type: String },
  chestExam: { type: String },
  
  consciousLevel: { type: String },
  pupilResponse: { type: String },
  eyeDeviation: { type: String },
  faceDeviation: { type: String },
  speech: { type: String },
  comprehension: { type: String },

  power: {
    rightArm: { type: String },
    rightLeg: { type: String },
    leftArm: { type: String },
    leftLeg: { type: String }
  },

  plantarResponse: {
    right: { type: String },
    left: { type: String }
  },

  nihss: { type: String },
  abdomenExam: { type: String },
  otherExam: { type: String },

  provisionalDiagnosis: { type: String },
  ecg: { type: String },
  cardiacEnzymes: { type: String },
  echoFindings: { type: String },
  managementPlan: { type: String },
  referralAdmission: { type: String }
}, { timestamps: true })

ErStrokeAssessmentSchema.index({ encounterId: 1, assessmentTime: -1 })

export type HospitalErStrokeAssessmentDoc = {
  _id: string
  patientId: string
  encounterId: string
  assessedBy: string
  assessmentTime: Date

  mrsBeforeIllness?: string
  lastSeenWell?: string
  presentingComplaints?: string
  previousPciCabg?: string
  comorbidities?: string

  vitals?: {
    pulse?: string
    bp?: string
    rr?: string
    temp?: string
    spo2?: string
    bsr?: string
  }

  cvsExam?: string
  chestExam?: string
  
  consciousLevel?: string
  pupilResponse?: string
  eyeDeviation?: string
  faceDeviation?: string
  speech?: string
  comprehension?: string

  power?: {
    rightArm?: string
    rightLeg?: string
    leftArm?: string
    leftLeg?: string
  }

  plantarResponse?: {
    right?: string
    left?: string
  }

  nihss?: string
  abdomenExam?: string
  otherExam?: string

  provisionalDiagnosis?: string
  ecg?: string
  cardiacEnzymes?: string
  echoFindings?: string
  managementPlan?: string
  referralAdmission?: string
}

export const HospitalErStrokeAssessment = models.Hospital_ErStrokeAssessment || model('Hospital_ErStrokeAssessment', ErStrokeAssessmentSchema)
