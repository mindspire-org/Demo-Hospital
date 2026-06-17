import { Schema, model, models } from 'mongoose'

const IpdConsultationSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true },
  
  // Type: consultation request or daily progress note
  type: {
    type: String,
    enum: ['consultation', 'daily-progress'],
    default: 'consultation',
    index: true
  },
  
  // ==================== Consultation Request Fields ====================
  // Doctor requesting consultation
  requestedByDoctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  requestedByDoctorName: { type: String },
  requestedAt: { type: Date, default: Date.now },
  
  // Consultant details
  consultantDoctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  consultantDoctorName: { type: String },
  consultantSpecialty: { type: String },
  
  // Consultation details
  reasonForConsult: { type: String },
  clinicalSummary: { type: String },
  specificQuestions: [{ type: String }],
  urgency: { 
    type: String, 
    enum: ['routine', 'urgent', 'emergency'],
    default: 'routine'
  },
  
  // Consultant Response
  responseAt: { type: Date },
  findings: { type: String },
  diagnosis: { type: String },
  recommendations: { type: String },
  followUpRequired: { type: Boolean, default: false },
  followUpDate: { type: Date },
  
  // ==================== Daily Progress Note Fields ====================
  // SOAP format for daily progress
  subjective: { type: String },
  objective: { type: String },
  assessment: { type: String },
  plan: { type: String },
  
  // Vitals at time of note
  vitals: {
    bp: { type: String },
    hr: { type: Number },
    rr: { type: Number },
    temp: { type: Number },
    spo2: { type: Number },
  },
  
  // Doctor for daily progress
  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  doctorName: { type: String },
  doctorSignature: { type: String }, // base64
  noteDate: { type: Date, default: Date.now, index: true },
  
  // ==================== Common Fields ====================
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'acknowledged', 'in-progress', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Billing
  billingStatus: { 
    type: String, 
    enum: ['not-billed', 'billed', 'waived'],
    default: 'not-billed'
  },
  billingAmount: { type: Number },
  billingItemId: { type: Schema.Types.ObjectId },
  
  notes: { type: String },
}, { timestamps: true })

IpdConsultationSchema.index({ encounterId: 1, type: 1, noteDate: -1 })
IpdConsultationSchema.index({ encounterId: 1, requestedAt: -1 })
IpdConsultationSchema.index({ patientId: 1, noteDate: -1 })
IpdConsultationSchema.index({ consultantDoctorId: 1, status: 1 })

export type HospitalIpdConsultationDoc = {
  _id: string
  patientId: string
  encounterId: string
  type?: 'consultation' | 'daily-progress'
  // Consultation request
  requestedByDoctorId?: string
  requestedByDoctorName?: string
  requestedAt?: Date
  consultantDoctorId?: string
  consultantDoctorName?: string
  consultantSpecialty?: string
  reasonForConsult?: string
  clinicalSummary?: string
  specificQuestions?: string[]
  urgency?: 'routine' | 'urgent' | 'emergency'
  responseAt?: Date
  findings?: string
  diagnosis?: string
  recommendations?: string
  followUpRequired?: boolean
  followUpDate?: Date
  // Daily progress
  subjective?: string
  objective?: string
  assessment?: string
  plan?: string
  vitals?: {
    bp?: string
    hr?: number
    rr?: number
    temp?: number
    spo2?: number
  }
  doctorId?: string
  doctorName?: string
  doctorSignature?: string
  noteDate?: Date
  // Common
  status?: 'pending' | 'acknowledged' | 'in-progress' | 'completed' | 'cancelled'
  billingStatus?: 'not-billed' | 'billed' | 'waived'
  billingAmount?: number
  billingItemId?: string
  notes?: string
  createdAt?: Date
  updatedAt?: Date
}

export const HospitalIpdConsultation = models.Hospital_IpdConsultation || model('Hospital_IpdConsultation', IpdConsultationSchema)
