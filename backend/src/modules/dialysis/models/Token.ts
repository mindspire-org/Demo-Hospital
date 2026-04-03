import { Schema, model, models } from 'mongoose'

const TokenSchema = new Schema({
  dateIso: { type: String, index: true },
  tokenNo: { type: String, unique: true, index: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', index: true },
  mrn: { type: String },
  patientName: { type: String },
  phone: { type: String },
  age: { type: String },
  gender: { type: String },
  createdByUserId: { type: Schema.Types.ObjectId, ref: 'Dialysis_User', index: true },
  createdByUsername: { type: String, index: true },
  // Session details
  sessionTypeId: { type: Schema.Types.ObjectId, ref: 'Dialysis_SessionType' },
  sessionTypeName: { type: String },
  shiftId: { type: Schema.Types.ObjectId, ref: 'Dialysis_Shift' },
  shiftName: { type: String },
  machineId: { type: Schema.Types.ObjectId, ref: 'Dialysis_Machine' },
  machineName: { type: String },
  dialyzerTypeId: { type: Schema.Types.ObjectId, ref: 'Dialysis_DialyzerType' },
  dialyzerTypeName: { type: String },
  duration: { type: Number, default: 4 }, // hours
  notes: { type: String },
  // Billing
  fee: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  netAmount: { type: Number, default: 0 },
  receivedAmount: { type: Number, default: 0 },
  receivableAmount: { type: Number, default: 0 },
  paidMethod: { type: String, enum: ['Cash', 'Bank', 'AR'], default: 'Cash' },
  // Status
  status: { type: String, enum: ['scheduled', 'in-progress', 'completed', 'cancelled'], default: 'scheduled', index: true },
}, { timestamps: true })

export type DialysisTokenDoc = {
  _id: string
  dateIso?: string
  tokenNo: string
  patientId?: string
  mrn?: string
  patientName?: string
  phone?: string
  age?: string
  gender?: string
  createdByUserId?: string
  createdByUsername?: string
  sessionTypeId?: string
  sessionTypeName?: string
  shiftId?: string
  shiftName?: string
  machineId?: string
  machineName?: string
  dialyzerTypeId?: string
  dialyzerTypeName?: string
  duration?: number
  notes?: string
  fee?: number
  discount?: number
  netAmount?: number
  receivedAmount?: number
  receivableAmount?: number
  paidMethod?: 'Cash' | 'Bank' | 'AR'
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  createdAt?: Date
  updatedAt?: Date
}

export const DialysisToken = models.Dialysis_Token || model('Dialysis_Token', TokenSchema)
