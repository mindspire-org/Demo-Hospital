import { Schema, model, models } from 'mongoose'

const IpdDocumentSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true },
  // Document details
  documentType: { 
    type: String, 
    enum: [
      'lab-report',
      'xray',
      'ct-scan',
      'mri',
      'ultrasound',
      'ecg',
      'echo',
      'endoscopy',
      'pathology-report',
      'discharge-summary',
      'operation-note',
      'consent-form',
      'referral-letter',
      'insurance-card',
      'id-card',
      'old-records',
      'prescription',
      'other'
    ],
    required: true,
    index: true
  },
  documentName: { type: String, required: true },
  description: { type: String },
  // File storage
  fileUrl: { type: String, required: true },
  fileName: { type: String },
  fileSize: { type: Number }, // bytes
  mimeType: { type: String },
  // Metadata
  documentDate: { type: Date }, // When the document was created
  source: { type: String, enum: ['uploaded', 'generated', 'external', 'scanned'], default: 'uploaded' },
  externalFacility: { type: String }, // If from external facility
  // Organization
  category: { 
    type: String, 
    enum: ['imaging', 'lab', 'insurance', 'identification', 'external-records', 'clinical', 'administrative'],
    index: true
  },
  tags: [{ type: String }],
  // Access control
  isConfidential: { type: Boolean, default: false },
  accessLevel: { 
    type: String, 
    enum: ['all', 'doctors-only', 'admin-only'],
    default: 'all'
  },
  // Upload tracking
  uploadedBy: { type: String },
  uploadedAt: { type: Date, default: Date.now },
  // Version control
  version: { type: Number, default: 1 },
  previousVersionId: { type: Schema.Types.ObjectId, ref: 'Hospital_IpdDocument' },
  // Related records
  relatedRecordType: { type: String }, // e.g., 'lab-order', 'imaging-order'
  relatedRecordId: { type: Schema.Types.ObjectId },
  notes: { type: String },
}, { timestamps: true })

IpdDocumentSchema.index({ encounterId: 1, documentType: 1, createdAt: -1 })
IpdDocumentSchema.index({ patientId: 1, createdAt: -1 })

export type HospitalIpdDocumentDoc = {
  _id: string
  patientId: string
  encounterId: string
  documentType: 'lab-report' | 'xray' | 'ct-scan' | 'mri' | 'ultrasound' | 'ecg' | 'echo' | 'endoscopy' | 'pathology-report' | 'discharge-summary' | 'operation-note' | 'consent-form' | 'referral-letter' | 'insurance-card' | 'id-card' | 'old-records' | 'prescription' | 'other'
  documentName: string
  description?: string
  fileUrl: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  documentDate?: Date
  source?: 'uploaded' | 'generated' | 'external' | 'scanned'
  externalFacility?: string
  category?: 'imaging' | 'lab' | 'insurance' | 'identification' | 'external-records' | 'clinical' | 'administrative'
  tags?: string[]
  isConfidential?: boolean
  accessLevel?: 'all' | 'doctors-only' | 'admin-only'
  uploadedBy?: string
  uploadedAt?: Date
  version?: number
  previousVersionId?: string
  relatedRecordType?: string
  relatedRecordId?: string
  notes?: string
}

export const HospitalIpdDocument = models.Hospital_IpdDocument || model('Hospital_IpdDocument', IpdDocumentSchema)
