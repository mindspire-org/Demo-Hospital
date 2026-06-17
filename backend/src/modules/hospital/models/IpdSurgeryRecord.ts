import { Schema, model, models } from 'mongoose'

const IpdSurgeryRecordSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true },
  // Surgery details
  surgeryType: { type: String }, // elective, emergency
  surgeryDate: { type: Date, index: true },
  surgeryTime: { type: String }, // start time
  surgeryEndTime: { type: String }, // end time
  diagnosis: { type: String },
  procedures: [{
    name: { type: String },
    code: { type: String }, // ICD-10/CPT
    notes: { type: String }
  }],
  // Team
  surgeonId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  surgeonName: { type: String },
  assistantSurgeon: { type: String },
  anesthesiologistId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  anesthesiologistName: { type: String },
  scrubNurse: { type: String },
  circulatingNurse: { type: String },
  // OT details
  otRoomId: { type: Schema.Types.ObjectId, ref: 'Hospital_OTRoom' },
  otRoomName: { type: String },
  // Pre-op
  preOpDiagnosis: { type: String },
  preOpNotes: { type: String },
  preOpChecklist: { type: Schema.Types.Mixed },
  // Intra-op
  intraOpFindings: { type: String },
  intraOpComplications: { type: String },
  bloodLoss: { type: String }, // in ml
  specimensSent: { type: Boolean, default: false },
  specimenDetails: { type: String },
  implantsUsed: [{ type: String }],
  drainsPlaced: { type: String },
  // Post-op
  postOpDiagnosis: { type: String },
  postOpInstructions: { type: String },
  postOpCondition: { type: String }, // stable, critical, etc.
  // Status
  status: { 
    type: String, 
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'postponed'], 
    default: 'scheduled',
    index: true 
  },
  cancellationReason: { type: String },
  // Signatures
  surgeonSign: { type: String }, // base64 signature
  surgeonSignedAt: { type: Date },
  notes: { type: String },
}, { timestamps: true })

IpdSurgeryRecordSchema.index({ encounterId: 1, surgeryDate: -1 })
IpdSurgeryRecordSchema.index({ surgeonId: 1, surgeryDate: -1 })

export type HospitalIpdSurgeryRecordDoc = {
  _id: string
  patientId: string
  encounterId: string
  surgeryType?: string
  surgeryDate?: Date
  surgeryTime?: string
  surgeryEndTime?: string
  diagnosis?: string
  procedures?: Array<{ name?: string; code?: string; notes?: string }>
  surgeonId?: string
  surgeonName?: string
  assistantSurgeon?: string
  anesthesiologistId?: string
  anesthesiologistName?: string
  scrubNurse?: string
  circulatingNurse?: string
  otRoomId?: string
  otRoomName?: string
  preOpDiagnosis?: string
  preOpNotes?: string
  preOpChecklist?: any
  intraOpFindings?: string
  intraOpComplications?: string
  bloodLoss?: string
  specimensSent?: boolean
  specimenDetails?: string
  implantsUsed?: string[]
  drainsPlaced?: string
  postOpDiagnosis?: string
  postOpInstructions?: string
  postOpCondition?: string
  status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'postponed'
  cancellationReason?: string
  surgeonSign?: string
  surgeonSignedAt?: Date
  notes?: string
}

export const HospitalIpdSurgeryRecord = models.Hospital_IpdSurgeryRecord || model('Hospital_IpdSurgeryRecord', IpdSurgeryRecordSchema)
