import { Schema, model, models } from 'mongoose'

const IpdConsentFormSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true },
  // Form details
  formType: { 
    type: String, 
    enum: [
      'surgery', 
      'anesthesia', 
      'blood-transfusion', 
      'procedure', 
      'discharge-against-advice',
      'informed-consent',
      'hipaa',
      'financial',
      'other'
    ],
    required: true,
    index: true
  },
  formTitle: { type: String, required: true },
  // Content
  procedureName: { type: String },
  procedureDescription: { type: String },
  risksAndBenefits: { type: String },
  alternatives: { type: String },
  additionalNotes: { type: String },
  customContent: { type: Schema.Types.Mixed }, // For custom form fields
  // Witnesses
  witnessName: { type: String },
  witnessRelation: { type: String },
  witnessContact: { type: String },
  // Translator (if needed)
  translatorNeeded: { type: Boolean, default: false },
  translatorName: { type: String },
  // Signatures
  patientSignature: { type: String }, // base64
  patientSignedAt: { type: Date },
  patientSignMethod: { type: String, enum: ['signature', 'fingerprint', 'verbal-consent'] },
  // If patient cannot sign
  representativeName: { type: String },
  representativeRelation: { type: String },
  representativeCnic: { type: String },
  representativeSignature: { type: String },
  representativeSignedAt: { type: Date },
  // Doctor signatures
  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  doctorName: { type: String },
  doctorSignature: { type: String },
  doctorSignedAt: { type: Date },
  // Witness signature
  witnessSignature: { type: String },
  witnessSignedAt: { type: Date },
  // Status
  status: { 
    type: String, 
    enum: ['draft', 'pending-signatures', 'signed', 'witnessed', 'completed', 'cancelled'],
    default: 'draft',
    index: true
  },
  // Version control
  version: { type: Number, default: 1 },
  previousVersionId: { type: Schema.Types.ObjectId, ref: 'Hospital_IpdConsentForm' },
  // Print tracking
  printedAt: { type: Date },
  printedBy: { type: String },
}, { timestamps: true })

IpdConsentFormSchema.index({ encounterId: 1, formType: 1, createdAt: -1 })
IpdConsentFormSchema.index({ patientId: 1, createdAt: -1 })

export type HospitalIpdConsentFormDoc = {
  _id: string
  patientId: string
  encounterId: string
  formType: 'surgery' | 'anesthesia' | 'blood-transfusion' | 'procedure' | 'discharge-against-advice' | 'informed-consent' | 'hipaa' | 'financial' | 'other'
  formTitle: string
  procedureName?: string
  procedureDescription?: string
  risksAndBenefits?: string
  alternatives?: string
  additionalNotes?: string
  customContent?: any
  witnessName?: string
  witnessRelation?: string
  witnessContact?: string
  translatorNeeded?: boolean
  translatorName?: string
  patientSignature?: string
  patientSignedAt?: Date
  patientSignMethod?: 'signature' | 'fingerprint' | 'verbal-consent'
  representativeName?: string
  representativeRelation?: string
  representativeCnic?: string
  representativeSignature?: string
  representativeSignedAt?: Date
  doctorId?: string
  doctorName?: string
  doctorSignature?: string
  doctorSignedAt?: Date
  witnessSignature?: string
  witnessSignedAt?: Date
  status?: 'draft' | 'pending-signatures' | 'signed' | 'witnessed' | 'completed' | 'cancelled'
  version?: number
  previousVersionId?: string
  printedAt?: Date
  printedBy?: string
}

export const HospitalIpdConsentForm = models.Hospital_IpdConsentForm || model('Hospital_IpdConsentForm', IpdConsentFormSchema)
