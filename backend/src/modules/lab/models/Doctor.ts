import { Schema, model, models } from 'mongoose'

const DoctorSchema = new Schema({
  name: { type: String, required: true, index: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  specialization: { type: String, default: '' },
  address: { type: String, default: '' },
  commissionPercent: { type: Number, default: 0, min: 0, max: 100 },
  active: { type: Boolean, default: true },
  notes: { type: String, default: '' },
}, { timestamps: true })

export type LabDoctorDoc = {
  _id: string
  name: string
  phone?: string
  email?: string
  specialization?: string
  address?: string
  commissionPercent?: number
  active?: boolean
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export const LabDoctor = models.Lab_Doctor || model('Lab_Doctor', DoctorSchema)
