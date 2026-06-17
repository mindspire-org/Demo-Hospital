import { Schema, model, models } from 'mongoose'

const IpdAnesthesiaPostOpSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true },
  surgeryRecordId: { type: Schema.Types.ObjectId, ref: 'Hospital_IpdSurgeryRecord' },
  // ---- Recovery (Immediate Post Anesthesia) ----
  recovery: {
    emergenceTime: { type: Date },
    loc: { type: String },
    bp: { type: String },
    pulse: { type: String },
    rr: { type: String },
    spo2: { type: String },
    painStimulus: { type: String },
    recoveryCondition: { type: String },
    extubationTime: { type: Date },
    extubationType: { type: String, enum: ['smooth', 'stormy', 'delayed'] },
  },
  // ---- Post-Recovery (at Shifting from Recovery Room) ----
  postRecovery: {
    shiftTime: { type: Date },
    bp: { type: String },
    pulse: { type: String },
    rr: { type: String },
    spo2: { type: String },
    pain: { type: String },
    temp: { type: String },
    aldreteScore: { type: String },
    vomiting: { type: String },
    shivering: { type: String },
    siteBleedingHematoma: { type: String },
    postOpAnalgesia: { type: String },
  },
  // ---- Adverse Events ----
  adverseEvents: [{
    when: { type: Date },
    anyEvent: { type: Boolean, default: false },
    details: { type: String },
    phase: { type: String, enum: ['intra-op', 'recovery', 'post-recovery'] },
  }],
  // ---- Complications (summary) ----
  complications: [{ type: String }],
  complicationDetails: { type: String },
  // Team
  anesthesiologistId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  anesthesiologistName: { type: String },
  // Sign-off
  anesthesiologistSign: { type: String },
  anesthesiologistSignedAt: { type: Date },
  // Status
  status: {
    type: String,
    enum: ['recovery', 'post-recovery', 'completed'],
    default: 'recovery',
    index: true,
  },
}, { timestamps: true })

IpdAnesthesiaPostOpSchema.index({ encounterId: 1, createdAt: -1 })
IpdAnesthesiaPostOpSchema.index({ surgeryRecordId: 1 })

export type HospitalIpdAnesthesiaPostOpDoc = {
  _id: string
  patientId: string
  encounterId: string
  surgeryRecordId?: string
  recovery?: {
    emergenceTime?: Date; loc?: string; bp?: string; pulse?: string; rr?: string; spo2?: string
    painStimulus?: string; recoveryCondition?: string; extubationTime?: Date
    extubationType?: 'smooth' | 'stormy' | 'delayed'
  }
  postRecovery?: {
    shiftTime?: Date; bp?: string; pulse?: string; rr?: string; spo2?: string; pain?: string
    temp?: string; aldreteScore?: string; vomiting?: string; shivering?: string
    siteBleedingHematoma?: string; postOpAnalgesia?: string
  }
  adverseEvents?: Array<{
    when?: Date; anyEvent?: boolean; details?: string; phase?: 'intra-op' | 'recovery' | 'post-recovery'
  }>
  complications?: string[]
  complicationDetails?: string
  anesthesiologistId?: string
  anesthesiologistName?: string
  anesthesiologistSign?: string
  anesthesiologistSignedAt?: Date
  status?: 'recovery' | 'post-recovery' | 'completed'
}

export const HospitalIpdAnesthesiaPostOp = models.Hospital_IpdAnesthesiaPostOp || model('Hospital_IpdAnesthesiaPostOp', IpdAnesthesiaPostOpSchema)
