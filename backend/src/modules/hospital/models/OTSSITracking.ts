import { Schema, model, models } from 'mongoose'

/**
 * Surgical Site Infection (SSI) Tracking Model
 * 
 * Tracks post-operative infections per CDC NHSN guidelines:
 * - Superficial Incisional SSI (within 30 days)
 * - Deep Incisional SSI (within 30/90 days)
 * - Organ/Space SSI (within 30/90 days)
 */

const OTSSITrackingSchema = new Schema({
  // Reference to surgery
  bookingId: { type: Schema.Types.ObjectId, ref: 'Hospital_OTBooking', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true },

  // Surgery details (denormalized for quick reference)
  procedure: { type: String },
  surgeryDate: { type: Date },
  surgeonId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  asaClass: { type: String, enum: ['ASA-I', 'ASA-II', 'ASA-III', 'ASA-IV', 'ASA-V', 'ASA-VI'] },
  woundClass: { type: String, enum: ['Clean', 'Clean-Contaminated', 'Contaminated', 'Dirty/Infected'] },

  // SSI Detection
  ssiDetected: { type: Boolean, default: false },
  ssiDetectedAt: { type: Date },
  daysToDetection: { type: Number }, // Days post-surgery

  // SSI Classification (per CDC NHSN)
  ssiType: { 
    type: String, 
    enum: ['superficial-incisional', 'deep-incisional', 'organ-space', 'none'],
    default: 'none'
  },

  // SSI Criteria (CDC NHSN definitions)
  criteria: {
    // Superficial Incisional
    purulentDrainage: { type: Boolean, default: false },
    organismsCultured: { type: Boolean, default: false },
    signsOfInflammation: { type: Boolean, default: false },
    
    // Deep Incisional
    deepPurulentDrainage: { type: Boolean, default: false },
    fascialDehiscence: { type: Boolean, default: false },
    deepAbscess: { type: Boolean, default: false },
    
    // Organ/Space
    organSpaceAbscess: { type: Boolean, default: false },
    organSpacePurulentDrainage: { type: Boolean, default: false },
  },

  // Culture Results
  cultureDone: { type: Boolean, default: false },
  cultureDate: { type: Date },
  cultureResults: { type: String }, // e.g., "MSSA", "MRSA", "E. coli"
  antibioticSensitivity: [{ type: String }],

  // Treatment
  treatmentRequired: { type: Boolean, default: false },
  treatmentDetails: { type: String },
  antibioticsGiven: { type: String },
  interventionRequired: { type: Boolean, default: false }, // e.g., reoperation, drainage
  interventionDetails: { type: String },

  // Outcome
  outcome: { 
    type: String, 
    enum: ['resolved', 'ongoing', 'died', 'unknown'],
    default: 'unknown'
  },
  resolvedAt: { type: Date },
  deathRelatedToSSI: { type: Boolean, default: false },

  // Risk Factors (for analysis)
  riskFactors: {
    diabetes: { type: Boolean, default: false },
    obesity: { type: Boolean, default: false },
    smoking: { type: Boolean, default: false },
    immunosuppression: { type: Boolean, default: false },
    emergencySurgery: { type: Boolean, default: false },
    durationOver2Hours: { type: Boolean, default: false },
  },

  // Follow-up tracking
  followUpScheduled: { type: Boolean, default: false },
  followUpDate30Day: { type: Date },
  followUpDate90Day: { type: Date },
  followUpCompleted30Day: { type: Boolean, default: false },
  followUpCompleted90Day: { type: Boolean, default: false },

  // Reporting
  reportedToNHSN: { type: Boolean, default: false },
  nhsnReportDate: { type: Date },

  // Notes
  notes: { type: String },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'Hospital_User' },
}, { timestamps: true })

// Indexes for surveillance
OTSSITrackingSchema.index({ bookingId: 1 })
OTSSITrackingSchema.index({ encounterId: 1 })
OTSSITrackingSchema.index({ ssiDetected: 1, ssiDetectedAt: -1 })
OTSSITrackingSchema.index({ surgeryDate: -1 })
OTSSITrackingSchema.index({ 'followUpScheduled': 1, 'followUpDate30Day': 1 })

export type OTSSITrackingDoc = {
  _id: string
  bookingId: string
  encounterId: string
  patientId: string
  procedure?: string
  surgeryDate?: Date
  surgeonId?: string
  asaClass?: 'ASA-I' | 'ASA-II' | 'ASA-III' | 'ASA-IV' | 'ASA-V' | 'ASA-VI'
  woundClass?: 'Clean' | 'Clean-Contaminated' | 'Contaminated' | 'Dirty/Infected'
  ssiDetected: boolean
  ssiDetectedAt?: Date
  daysToDetection?: number
  ssiType: 'superficial-incisional' | 'deep-incisional' | 'organ-space' | 'none'
  criteria?: {
    purulentDrainage?: boolean
    organismsCultured?: boolean
    signsOfInflammation?: boolean
    deepPurulentDrainage?: boolean
    fascialDehiscence?: boolean
    deepAbscess?: boolean
    organSpaceAbscess?: boolean
    organSpacePurulentDrainage?: boolean
  }
  cultureDone?: boolean
  cultureDate?: Date
  cultureResults?: string
  antibioticSensitivity?: string[]
  treatmentRequired?: boolean
  treatmentDetails?: string
  antibioticsGiven?: string
  interventionRequired?: boolean
  interventionDetails?: string
  outcome?: 'resolved' | 'ongoing' | 'died' | 'unknown'
  resolvedAt?: Date
  deathRelatedToSSI?: boolean
  riskFactors?: {
    diabetes?: boolean
    obesity?: boolean
    smoking?: boolean
    immunosuppression?: boolean
    emergencySurgery?: boolean
    durationOver2Hours?: boolean
  }
  followUpScheduled?: boolean
  followUpDate30Day?: Date
  followUpDate90Day?: Date
  followUpCompleted30Day?: boolean
  followUpCompleted90Day?: boolean
  reportedToNHSN?: boolean
  nhsnReportDate?: Date
  notes?: string
  recordedBy?: string
  createdAt: Date
  updatedAt: Date
}

export const OTSSITracking = models.Hospital_OTSSITracking || model('Hospital_OTSSITracking', OTSSITrackingSchema)
