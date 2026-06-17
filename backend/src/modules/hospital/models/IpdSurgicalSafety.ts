import { Schema, model, models } from 'mongoose'

const IpdSurgicalSafetySchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true },
  surgeryRecordId: { type: Schema.Types.ObjectId, ref: 'Hospital_IpdSurgeryRecord' },
  // WHO Surgical Safety Checklist - Sign In (Before Induction)
  signIn: {
    patientConfirmed: { type: Boolean },
    siteMarked: { type: Boolean },
    anesthesiaSafetyCheckCompleted: { type: Boolean },
    pulseOximeterOn: { type: Boolean },
    knownAllergy: { type: String },
    difficultAirwayRisk: { type: String },
    aspirationRisk: { type: String },
    bloodLossRisk: { type: String },
    bloodProductsAvailable: { type: Boolean },
    signInCompletedAt: { type: Date },
    signInCompletedBy: { type: String }
  },
  // Time Out (Before Skin Incision)
  timeOut: {
    teamMembersIntroduced: { type: Boolean },
    surgeonName: { type: String },
    anesthesiologistName: { type: String },
    scrubNurseName: { type: String },
    procedureConfirmed: { type: Boolean },
    correctSiteConfirmed: { type: Boolean },
    correctPatientConfirmed: { type: Boolean },
    correctProcedureConfirmed: { type: Boolean },
    criticalStepsDiscussed: { type: String },
    criticalEventsSurgeon: { type: String },
    criticalEventsAnaesthesia: { type: String },
    criticalEventsNursing: { type: String },
    expectedDuration: { type: String },
    anticipatedProblems: { type: String },
    antibioticGiven: { type: Boolean },
    antibioticName: { type: String },
    antibioticGivenAt: { type: Date },
    dvtProphylaxis: { type: Boolean },
    dvtProphylaxisType: { type: String },
    imagingDisplayed: { type: String },
    timeOutCompletedAt: { type: Date },
    timeOutCompletedBy: { type: String }
  },
  // Sign Out (Before Patient Leaves OR)
  signOut: {
    procedureNameRecorded: { type: String },
    procedureCompleted: { type: Boolean },
    instrumentCountCorrect: { type: Boolean },
    spongeCountCorrect: { type: Boolean },
    sharpsCountCorrect: { type: Boolean },
    specimenLabeled: { type: Boolean },
    specimenDetails: { type: String },
    equipmentIssues: { type: String },
    keyConcernsForRecovery: { type: String },
    postOpInstructionsGiven: { type: Boolean },
    signOutCompletedAt: { type: Date },
    signOutCompletedBy: { type: String }
  },
  // Overall status
  status: { 
    type: String, 
    enum: ['pending', 'sign-in-complete', 'time-out-complete', 'completed', 'aborted'],
    default: 'pending',
    index: true
  },
  completedAt: { type: Date },
  // Team signatures
  surgeonSignature: { type: String },
  anesthesiologistSignature: { type: String },
  nurseSignature: { type: String },
  notes: { type: String },
}, { timestamps: true })

IpdSurgicalSafetySchema.index({ encounterId: 1, createdAt: -1 })
IpdSurgicalSafetySchema.index({ surgeryRecordId: 1 })

export type HospitalIpdSurgicalSafetyDoc = {
  _id: string
  patientId: string
  encounterId: string
  surgeryRecordId?: string
  signIn?: {
    patientConfirmed?: boolean
    siteMarked?: boolean
    anesthesiaSafetyCheckCompleted?: boolean
    pulseOximeterOn?: boolean
    knownAllergy?: string
    difficultAirwayRisk?: string
    aspirationRisk?: string
    bloodLossRisk?: string
    bloodProductsAvailable?: boolean
    signInCompletedAt?: Date
    signInCompletedBy?: string
  }
  timeOut?: {
    teamMembersIntroduced?: boolean
    surgeonName?: string
    anesthesiologistName?: string
    scrubNurseName?: string
    procedureConfirmed?: boolean
    correctSiteConfirmed?: boolean
    correctPatientConfirmed?: boolean
    correctProcedureConfirmed?: boolean
    criticalStepsDiscussed?: string
    criticalEventsSurgeon?: string
    criticalEventsAnaesthesia?: string
    criticalEventsNursing?: string
    expectedDuration?: string
    anticipatedProblems?: string
    antibioticGiven?: boolean
    antibioticName?: string
    antibioticGivenAt?: Date
    dvtProphylaxis?: boolean
    dvtProphylaxisType?: string
    imagingDisplayed?: string
    timeOutCompletedAt?: Date
    timeOutCompletedBy?: string
  }
  signOut?: {
    procedureNameRecorded?: string
    procedureCompleted?: boolean
    instrumentCountCorrect?: boolean
    spongeCountCorrect?: boolean
    sharpsCountCorrect?: boolean
    specimenLabeled?: boolean
    specimenDetails?: string
    equipmentIssues?: string
    keyConcernsForRecovery?: string
    postOpInstructionsGiven?: boolean
    signOutCompletedAt?: Date
    signOutCompletedBy?: string
  }
  status?: 'pending' | 'sign-in-complete' | 'time-out-complete' | 'completed' | 'aborted'
  completedAt?: Date
  surgeonSignature?: string
  anesthesiologistSignature?: string
  nurseSignature?: string
  notes?: string
}

export const HospitalIpdSurgicalSafety = models.Hospital_IpdSurgicalSafety || model('Hospital_IpdSurgicalSafety', IpdSurgicalSafetySchema)
