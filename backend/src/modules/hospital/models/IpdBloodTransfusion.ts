import { Schema, model, models } from 'mongoose'

const IpdBloodTransfusionSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true },
  // Pre-transfusion
  indication: { type: String, required: true },
  preTransfusionHb: { type: Number },
  issueDateTime: { type: Date },
  screeningResults: { type: String },
  preTransfusionVitals: {
    bp: { type: String },
    hr: { type: String },
    temp: { type: String },
    rr: { type: String },
    spo2: { type: String },
    chest: { type: String }
  },
  // Blood product details
  bloodProduct: {
    type: { 
      type: String, 
      enum: ['PRBC', 'FFP', 'Platelets', 'Cryoprecipitate', 'Whole Blood', 'Packed Cells'],
      required: true
    },
    bloodGroup: { type: String, required: true }, // A+, B+, O-, etc.
    rhFactor: { type: String, enum: ['positive', 'negative'] },
    units: { type: Number, default: 1 },
    volumePerUnit: { type: String }, // e.g., "350ml"
    bagNumber: { type: String },
    batchNumber: { type: String },
    expiryDate: { type: Date },
    donorId: { type: String }, // anonymized donor reference
    crossMatchResult: { type: String, enum: ['compatible', 'incompatible', 'pending'] },
    crossMatchAlbuminPhase: { type: String },
    crossMatchDoneAt: { type: Date },
    crossMatchDoneBy: { type: String }
  },
  // Transfusion details
  transfusionDate: { type: Date, required: true, index: true },
  startTime: { type: String },
  endTime: { type: String },
  durationMinutes: { type: Number },
  rate: { type: String }, // e.g., "4 hours per unit"
  site: { type: String }, // IV site
  receivedInWard: { type: String },
  // Monitoring during transfusion
  monitoringRecords: [{
    time: { type: Date },
    temp: { type: Number },
    hr: { type: Number },
    bp: { type: String },
    rr: { type: Number },
    spo2: { type: Number },
    notes: { type: String }
  }],
  // Reaction
  reactionOccurred: { type: Boolean, default: false },
  reactionType: { type: String },
  reactionSeverity: { type: String, enum: ['mild', 'moderate', 'severe'] },
  reactionDetails: { type: String },
  reactionManagement: { type: String },
  reactionTime: { type: Date },
  // Post-transfusion
  postTransfusionHb: { type: Number },
  postTransfusionVitals: {
    bp: { type: String },
    hr: { type: String },
    temp: { type: String },
    rr: { type: String },
    spo2: { type: String },
    chest: { type: String }
  },
  transfusionOutcome: { type: String, enum: ['successful', 'partial', 'failed', 'stopped-due-to-reaction'] },
  // Consent
  consentFormId: { type: Schema.Types.ObjectId, ref: 'Hospital_IpdConsentForm' },
  consentObtained: { type: Boolean, default: false },
  consentObtainedFrom: { type: String }, // patient or relative name
  // Staff
  orderedByDoctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  orderedByDoctorName: { type: String },
  administeredBy: { type: String }, // nurse name
  verifiedBy: { type: String }, // second nurse verification
  cnicNumber: { type: String },
  signatureThumb: { type: String },
  // Status
  status: { 
    type: String, 
    enum: ['ordered', 'cross-match-pending', 'ready', 'in-progress', 'completed', 'cancelled'],
    default: 'ordered',
    index: true
  },
  notes: { type: String },
}, { timestamps: true })

IpdBloodTransfusionSchema.index({ encounterId: 1, transfusionDate: -1 })
IpdBloodTransfusionSchema.index({ patientId: 1, transfusionDate: -1 })

export type HospitalIpdBloodTransfusionDoc = {
  _id: string
  patientId: string
  encounterId: string
  indication: string
  preTransfusionHb?: number
  issueDateTime?: Date
  screeningResults?: string
  preTransfusionVitals?: { bp?: string; hr?: string; temp?: string; rr?: string; spo2?: string; chest?: string }
  bloodProduct: {
    type: 'PRBC' | 'FFP' | 'Platelets' | 'Cryoprecipitate' | 'Whole Blood' | 'Packed Cells'
    bloodGroup: string
    rhFactor?: 'positive' | 'negative'
    units?: number
    volumePerUnit?: string
    bagNumber?: string
    batchNumber?: string
    expiryDate?: Date
    donorId?: string
    crossMatchResult?: 'compatible' | 'incompatible' | 'pending'
    crossMatchAlbuminPhase?: string
    crossMatchDoneAt?: Date
    crossMatchDoneBy?: string
  }
  transfusionDate: Date
  startTime?: string
  endTime?: string
  durationMinutes?: number
  rate?: string
  site?: string
  receivedInWard?: string
  monitoringRecords?: Array<{
    time?: Date
    temp?: number
    hr?: number
    bp?: string
    rr?: number
    spo2?: number
    notes?: string
  }>
  reactionOccurred?: boolean
  reactionType?: string
  reactionSeverity?: 'mild' | 'moderate' | 'severe'
  reactionDetails?: string
  reactionManagement?: string
  reactionTime?: Date
  postTransfusionHb?: number
  postTransfusionVitals?: { bp?: string; hr?: string; temp?: string; rr?: string; spo2?: string; chest?: string }
  transfusionOutcome?: 'successful' | 'partial' | 'failed' | 'stopped-due-to-reaction'
  consentFormId?: string
  consentObtained?: boolean
  consentObtainedFrom?: string
  orderedByDoctorId?: string
  orderedByDoctorName?: string
  administeredBy?: string
  verifiedBy?: string
  cnicNumber?: string
  signatureThumb?: string
  status?: 'ordered' | 'cross-match-pending' | 'ready' | 'in-progress' | 'completed' | 'cancelled'
  notes?: string
}

export const HospitalIpdBloodTransfusion = models.Hospital_IpdBloodTransfusion || model('Hospital_IpdBloodTransfusion', IpdBloodTransfusionSchema)
