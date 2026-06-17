import { Schema, model, models } from 'mongoose'

const OTTeamMemberSchema = new Schema({
  staffId: { type: Schema.Types.ObjectId, ref: 'Hospital_Staff', required: true },
  role: { type: String, enum: ['surgeon', 'assistant-surgeon', 'anesthesiologist', 'anesthesia-tech', 'scrub-nurse', 'circulating-nurse', 'ot-technician'], required: true },
}, { _id: false })

// Manual patient data for non-IPD bookings
const ManualPatientSchema = new Schema({
  fullName: { type: String },
  mrNumber: { type: String },
  age: { type: Number },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  contact: { type: String },
  allergies: { type: String },
  comorbidities: { type: String },
}, { _id: false })

// Case context
const CaseContextSchema = new Schema({
  diagnosis: { type: String },
  consultingDoctor: { type: String },
}, { _id: false })

// Equipment and implants
const EquipmentSchema = new Schema({
  requiredEquipment: { type: String },
  implants: { type: String },
}, { _id: false })

// Anesthesia details
const AnesthesiaDetailsSchema = new Schema({
  asaClass: { type: String, enum: ['ASA-I', 'ASA-II', 'ASA-III', 'ASA-IV', 'ASA-V', 'ASA-VI'] },
  fastingStatus: { type: String },
  notes: { type: String },
}, { _id: false })

// Pre-operative checklist
const PreOpChecklistSchema = new Schema({
  consentSigned: { type: Boolean, default: false },
  consentDate: { type: Date },
  labReportsAvailable: { type: Boolean, default: false },
  bloodArranged: { type: Boolean, default: false },
  bloodUnits: { type: String },
  imagingAttached: { type: Boolean, default: false },
  imagingTypes: [{ type: String }],
  surgicalSiteMarked: { type: Boolean, default: false },
  preOpAssessmentDone: { type: Boolean, default: false },
  npoVerified: { type: Boolean, default: false },
}, { _id: false })

// Post-operative plan
const PostOpPlanSchema = new Schema({
  destination: { type: String, enum: ['ward', 'icu', 'hdu', 'recovery'] },
  instructions: { type: String },
  expectedComplications: { type: String },
}, { _id: false })

const OTBookingSchema = new Schema({
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter' },
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient' },

  // Manual patient entry (for non-IPD bookings)
  patientData: { type: ManualPatientSchema },

  // Core procedure details
  procedure: { type: String, required: true },
  procedureCode: { type: String },
  surgeryType: { type: String, enum: ['major', 'minor', 'emergency'] },

  // OT Room and scheduling
  roomId: { type: Schema.Types.ObjectId, ref: 'Hospital_OTRoom' },
  scheduledAt: { type: Date },
  estimatedDuration: { type: Number }, // minutes
  actualStart: { type: Date },
  actualEnd: { type: Date },

  // Surgical team
  surgeonId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  anesthesiologistId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  team: [OTTeamMemberSchema],

  // Status and priority
  status: { type: String, enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'postponed'], default: 'scheduled' },
  priority: { type: String, enum: ['routine', 'urgent', 'emergency'], default: 'routine' },

  // Anesthesia
  anesthesiaType: { type: String, enum: ['general', 'spinal', 'epidural', 'local', 'regional', 'sedation', 'none'] },
  anesthesiaDetails: { type: AnesthesiaDetailsSchema },

  // Referral source
  referredFrom: { type: String, enum: ['ipd', 'er', 'manual'] },

  // Case context
  caseContext: { type: CaseContextSchema },

  // Equipment and implants
  equipment: { type: EquipmentSchema },

  // Pre-operative checklist
  preOpChecklist: { type: PreOpChecklistSchema },

  // Post-operative plan
  postOpPlan: { type: PostOpPlanSchema },

  // Intra-operative findings
  findings: { type: String },
  complications: { type: String },

  // Notes
  notes: { type: String },

  // Cancellation details
  cancelledReason: { type: String },
  cancelledAt: { type: Date },
  cancelledBy: { type: Schema.Types.ObjectId, ref: 'Hospital_User' },
}, { timestamps: true })

OTBookingSchema.index({ status: 1, scheduledAt: 1 })
OTBookingSchema.index({ encounterId: 1, status: 1 })

export type OTBookingDoc = {
  _id: string
  encounterId?: string
  patientId?: string
  patientData?: {
    fullName?: string
    mrNumber?: string
    age?: number
    gender?: 'male' | 'female' | 'other'
    contact?: string
    allergies?: string
    comorbidities?: string
  }
  procedure: string
  procedureCode?: string
  surgeryType?: 'major' | 'minor' | 'emergency'
  roomId?: string
  scheduledAt?: Date
  estimatedDuration?: number
  actualStart?: Date
  actualEnd?: Date
  surgeonId?: string
  anesthesiologistId?: string
  team?: Array<{ staffId: string; role: string }>
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'postponed'
  priority: 'routine' | 'urgent' | 'emergency'
  anesthesiaType?: 'general' | 'spinal' | 'epidural' | 'local' | 'regional' | 'sedation' | 'none'
  anesthesiaDetails?: {
    asaClass?: 'ASA-I' | 'ASA-II' | 'ASA-III' | 'ASA-IV' | 'ASA-V' | 'ASA-VI'
    fastingStatus?: string
    notes?: string
  }
  referredFrom?: 'ipd' | 'er' | 'manual'
  caseContext?: {
    diagnosis?: string
    consultingDoctor?: string
  }
  equipment?: {
    requiredEquipment?: string
    implants?: string
  }
  preOpChecklist?: {
    consentSigned?: boolean
    consentDate?: Date
    labReportsAvailable?: boolean
    bloodArranged?: boolean
    bloodUnits?: string
    imagingAttached?: boolean
    imagingTypes?: string[]
    surgicalSiteMarked?: boolean
    preOpAssessmentDone?: boolean
    npoVerified?: boolean
  }
  postOpPlan?: {
    destination?: 'ward' | 'icu' | 'hdu' | 'recovery'
    instructions?: string
    expectedComplications?: string
  }
  findings?: string
  complications?: string
  notes?: string
  cancelledReason?: string
  cancelledAt?: Date
  cancelledBy?: string
  createdAt: Date
  updatedAt: Date
}

export const OTBooking = models.Hospital_OTBooking || model('Hospital_OTBooking', OTBookingSchema)
