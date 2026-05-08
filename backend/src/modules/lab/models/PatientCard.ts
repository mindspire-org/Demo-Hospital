import { Schema, model, models } from 'mongoose'

export type PatientCardKind = 'gynae9m' | 'hep3m' | 'tb2y' | 'mdrtb2y' | 'admitted' | 'general'

const PatientCardSchema = new Schema({
  patientId: { type: String, required: true, index: true },
  cardKind: {
    type: String,
    enum: ['gynae9m', 'hep3m', 'tb2y', 'mdrtb2y', 'admitted', 'general'],
    default: 'general',
    index: true,
  },
  cardNo: { type: String, required: true, unique: true },
  issuedAt: { type: String, required: true },
  expiresAt: { type: String },
  validVisits: { type: Number, default: 0 },
  visitsUsed: { type: Number, default: 0 },
  scheme: { type: String },
  qrCode: { type: String },
  notes: { type: String },
  printedAt: { type: String },
  printedBy: { type: String },
  status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
}, { timestamps: true })

export type LabPatientCardDoc = {
  _id: string
  patientId: string
  cardKind: PatientCardKind
  cardNo: string
  issuedAt: string
  expiresAt?: string
  validVisits: number
  visitsUsed: number
  scheme?: string
  qrCode?: string
  notes?: string
  printedAt?: string
  printedBy?: string
  status: 'active' | 'expired' | 'cancelled'
}

export const LabPatientCard = models.Lab_PatientCard || model('Lab_PatientCard', PatientCardSchema)
