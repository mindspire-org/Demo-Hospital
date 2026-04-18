import { Schema, model, models } from 'mongoose'

const PaymentHistorySchema = new Schema({
  date: { type: String, required: true },
  amount: { type: Number, required: true },
  note: { type: String },
  recordedBy: { type: String },
}, { _id: true })

const CollectionCenterSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  address: { type: String },
  contactPerson: { type: String },
  phone: { type: String },
  email: { type: String },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  commissionPercent: { type: Number, default: 0, min: 0, max: 100 },
  totalTokens: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  totalCommission: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  paymentHistory: { type: [PaymentHistorySchema], default: [] },
}, { timestamps: true })

export type LabCollectionCenterDoc = {
  _id: string
  name: string
  code: string
  address?: string
  contactPerson?: string
  phone?: string
  email?: string
  status: 'Active' | 'Inactive'
  commissionPercent: number
  totalTokens: number
  totalRevenue: number
  totalCommission: number
  balanceDue: number
  paymentHistory: Array<{
    _id: string
    date: string
    amount: number
    note?: string
    recordedBy?: string
  }>
  createdAt: string
  updatedAt: string
}

export const LabCollectionCenter = models.Lab_CollectionCenter || model('Lab_CollectionCenter', CollectionCenterSchema)
