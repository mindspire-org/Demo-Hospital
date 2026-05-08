import { Schema, model, models } from 'mongoose'

const CriticalLogEntrySchema = new Schema({
  at: { type: String, required: true },
  by: { type: String },
  action: { type: String, required: true }, // 'detected' | 'notified' | 'resolved' | 'comment'
  note: { type: String },
}, { _id: false })

const CriticalEventSchema = new Schema({
  orderId: { type: String, index: true },
  resultId: { type: String, index: true },
  testId: { type: String },
  testName: { type: String },
  parameter: { type: String, required: true },
  value: { type: String, required: true },
  unit: { type: String },
  criticalMin: { type: Number },
  criticalMax: { type: Number },
  patientId: { type: String, index: true },
  patientName: { type: String },
  patientPhone: { type: String },
  collectionCenterId: { type: Schema.Types.ObjectId, ref: 'Lab_CollectionCenter', index: true },
  detectedAt: { type: String, required: true },
  detectedBy: { type: String },
  resolvedAt: { type: String },
  resolvedBy: { type: String },
  doctor: { type: String },
  comment: { type: String },
  infoMode: { type: String, enum: ['verbal', 'phone', 'sms', 'email', null], default: null },
  status: { type: String, enum: ['open', 'resolved'], default: 'open', index: true },
  log: { type: [CriticalLogEntrySchema], default: [] },
}, { timestamps: true })

CriticalEventSchema.index({ status: 1, detectedAt: -1 })

export type LabCriticalEventDoc = {
  _id: string
  orderId?: string
  resultId?: string
  testId?: string
  testName?: string
  parameter: string
  value: string
  unit?: string
  criticalMin?: number
  criticalMax?: number
  patientId?: string
  patientName?: string
  patientPhone?: string
  collectionCenterId?: string
  detectedAt: string
  detectedBy?: string
  resolvedAt?: string
  resolvedBy?: string
  doctor?: string
  comment?: string
  infoMode?: 'verbal' | 'phone' | 'sms' | 'email' | null
  status: 'open' | 'resolved'
  log: Array<{ at: string; by?: string; action: string; note?: string }>
  createdAt?: string
  updatedAt?: string
}

export const LabCriticalEvent = models.Lab_CriticalEvent || model('Lab_CriticalEvent', CriticalEventSchema)
