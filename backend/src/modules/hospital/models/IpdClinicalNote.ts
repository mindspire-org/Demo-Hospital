import { Schema, model, models } from 'mongoose'

// IpdClinicalNote - Now used ONLY for Consultant Notes
// Other forms have their own dedicated collections:
// - Operation Consent -> IpdOperationConsent
// - Infection Control -> IpdInfectionControl
// - Blood Transfusion -> IpdBloodTransfusion
// - Surgery Records -> IpdSurgeryRecord
// - Anesthesia Pre-Assessment -> IpdAnesthesiaPreAssessment
// - Anesthesia Intra-Op -> IpdAnesthesiaRecord
// - Anesthesia Post-Op -> IpdAnesthesiaPostOp
// - History & Exam -> IpdHistoryExam
// - Surgical Safety -> IpdSurgicalSafety
// - Doctor Visits/Progress -> IpdDoctorVisit
// - Consultations -> IpdConsultation

const IpdClinicalNoteSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true },
  
  // Note type - Consultant notes only
  type: {
    type: String,
    enum: ['consultant-note', 'specialist-opinion', 'referral-note', 'other'],
    default: 'consultant-note',
    index: true
  },
  
  // Title and content
  title: { type: String },
  content: { type: String },
  
  // Consultant details
  consultantId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  consultantName: { type: String },
  consultantSpecialty: { type: String },
  
  // Related consultation (links to IpdConsultation)
  relatedConsultationId: { type: Schema.Types.ObjectId, ref: 'Hospital_IpdConsultation' },
  
  // Findings and recommendations
  findings: { type: String },
  diagnosis: { type: String },
  recommendations: { type: String },
  
  // Recording info
  recordedBy: { type: String },
  recordedAt: { type: Date, default: Date.now },
  noteDate: { type: Date, default: Date.now, index: true },
  
  // Signature
  signed: { type: Boolean, default: false },
  signedAt: { type: Date },
  signature: { type: String }, // base64
  
  // Status
  status: { 
    type: String, 
    enum: ['draft', 'final', 'amended'],
    default: 'final',
    index: true
  },
  
  // Amendment tracking
  amendedFrom: { type: Schema.Types.ObjectId, ref: 'Hospital_IpdClinicalNote' },
  amendmentReason: { type: String },
}, { timestamps: true })

IpdClinicalNoteSchema.index({ encounterId: 1, type: 1, recordedAt: -1 })
IpdClinicalNoteSchema.index({ patientId: 1, noteDate: -1 })
IpdClinicalNoteSchema.index({ consultantId: 1, noteDate: -1 })

export type HospitalIpdClinicalNoteDoc = {
  _id: string
  patientId: string
  encounterId: string
  type?: 'consultant-note' | 'specialist-opinion' | 'referral-note' | 'other'
  title?: string
  content?: string
  consultantId?: string
  consultantName?: string
  consultantSpecialty?: string
  relatedConsultationId?: string
  findings?: string
  diagnosis?: string
  recommendations?: string
  recordedBy?: string
  recordedAt?: Date
  noteDate?: Date
  signed?: boolean
  signedAt?: Date
  signature?: string
  status?: 'draft' | 'final' | 'amended'
  amendedFrom?: string
  amendmentReason?: string
  createdAt?: Date
  updatedAt?: Date
}

export const HospitalIpdClinicalNote = models.Hospital_IpdClinicalNote || model('Hospital_IpdClinicalNote', IpdClinicalNoteSchema)
