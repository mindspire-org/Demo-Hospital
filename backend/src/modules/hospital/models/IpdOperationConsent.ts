import { Schema, model, models } from 'mongoose'

const IpdOperationConsentSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true },
  
  // Patient Info
  mrNumber: { type: String },
  patientName: { type: String },
  date: { type: Date, default: Date.now, index: true },
  
  // Doctor Info
  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  doctorName: { type: String },
  doctorSign: { type: String }, // base64 signature
  
  // ==================== ANESTHESIA CONSENT ====================
  anesthesia: {
    // Urdu text is predefined in the form, no need to store
    guardianName: { type: String }, // والد/والدہ/سرپرست نام
    guardianSign: { type: String }, // دستخط
    date: { type: Date },
    time: { type: String },
  },
  
  // ==================== OPERATION CONSENT ====================
  operation: {
    // Urdu text is predefined in the form, no need to store
    guardianName: { type: String },
    guardianSign: { type: String },
    date: { type: Date },
    time: { type: String },
  },
  
  // ==================== BLOOD TRANSFUSION CONSENT ====================
  bloodTransfusion: {
    // Urdu text is predefined in the form, no need to store
    guardianName: { type: String },
    guardianSign: { type: String },
    date: { type: Date },
    time: { type: String },
  },
  
  // Status
  status: { 
    type: String, 
    enum: ['draft', 'partial', 'completed', 'cancelled'],
    default: 'completed',
    index: true 
  },
  
  // Recording info
  recordedBy: { type: String },
  recordedAt: { type: Date, default: Date.now },
  notes: { type: String },
}, { timestamps: true })

IpdOperationConsentSchema.index({ encounterId: 1, date: -1 })
IpdOperationConsentSchema.index({ patientId: 1, date: -1 })

export type HospitalIpdOperationConsentDoc = {
  _id: string
  patientId: string
  encounterId: string
  mrNumber?: string
  patientName?: string
  date?: Date
  doctorId?: string
  doctorName?: string
  doctorSign?: string
  anesthesia?: {
    guardianName?: string
    guardianSign?: string
    date?: Date
    time?: string
  }
  operation?: {
    guardianName?: string
    guardianSign?: string
    date?: Date
    time?: string
  }
  bloodTransfusion?: {
    guardianName?: string
    guardianSign?: string
    date?: Date
    time?: string
  }
  status?: 'draft' | 'partial' | 'completed' | 'cancelled'
  recordedBy?: string
  recordedAt?: Date
  notes?: string
  createdAt?: Date
  updatedAt?: Date
}

export const HospitalIpdOperationConsent = models.Hospital_IpdOperationConsent || model('Hospital_IpdOperationConsent', IpdOperationConsentSchema)
