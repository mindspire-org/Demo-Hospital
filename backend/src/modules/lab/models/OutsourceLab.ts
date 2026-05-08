import { Schema, model, models } from 'mongoose'

const OutsourceLabSchema = new Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String },
  address: { type: String },
  contactPerson: { type: String },
  phone: { type: String },
  email: { type: String },
  shareMode: { type: String, enum: ['percent', 'amount'], default: 'percent' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  // Optional portal credentials for outsource portal login
  portalUsername: { type: String },
  portalPasswordHash: { type: String },
  notes: { type: String },
}, { timestamps: true })

export type LabOutsourceLabDoc = {
  _id: string
  name: string
  code?: string
  address?: string
  contactPerson?: string
  phone?: string
  email?: string
  shareMode: 'percent' | 'amount'
  status: 'Active' | 'Inactive'
  portalUsername?: string
  notes?: string
}

export const LabOutsourceLab = models.Lab_OutsourceLab || model('Lab_OutsourceLab', OutsourceLabSchema)
