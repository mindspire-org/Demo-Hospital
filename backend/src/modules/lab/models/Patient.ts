import { Schema, model, models } from 'mongoose'

const PatientSchema = new Schema({
  mrn: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  fatherName: { type: String },
  phoneNormalized: { type: String, index: true },
  cnicNormalized: { type: String, index: true },
  gender: { type: String },
  age: { type: String },
  guardianRel: { type: String },
  address: { type: String },
  createdAtIso: { type: String },

  // Extended fields
  hospitalRegistrationNumber: { type: String, index: true },
  patientImageUrl: { type: String },
  bloodGroup: { type: String },
  patientType: { type: String, enum: ['OPD', 'IPD', 'ER', 'OTHER'], default: 'OPD' },
  email: { type: String },
  whatsapp: { type: String },
  departmentId: { type: String, index: true },
  wardId: { type: String, index: true },
  emergencyDayId: { type: String, index: true },
  // Reference to active patient card
  activeCardId: { type: Schema.Types.ObjectId, ref: 'Lab_PatientCard' },
}, { timestamps: true })

export type LabPatientDoc = {
  _id: string
  mrn: string
  fullName: string
  fatherName?: string
  phoneNormalized?: string
  cnicNormalized?: string
  gender?: string
  age?: string
  guardianRel?: string
  address?: string
  createdAtIso?: string
  hospitalRegistrationNumber?: string
  patientImageUrl?: string
  bloodGroup?: string
  patientType?: 'OPD' | 'IPD' | 'ER' | 'OTHER'
  email?: string
  whatsapp?: string
  departmentId?: string
  wardId?: string
  emergencyDayId?: string
  activeCardId?: string
}

export const LabPatient = models.Lab_Patient || model('Lab_Patient', PatientSchema)
