import { Schema, model, models } from 'mongoose'

const CriticalParameterSchema = new Schema({
  parameter: { type: String, required: true, index: true }, // e.g. 'Platelets', 'Hb'
  testName: { type: String }, // optional test scope
  criticalMin: { type: Number },
  criticalMax: { type: Number },
  unit: { type: String },
  enabled: { type: Boolean, default: true },
  notes: { type: String },
}, { timestamps: true })

CriticalParameterSchema.index({ parameter: 1, testName: 1 }, { unique: false })

export type LabCriticalParameterDoc = {
  _id: string
  parameter: string
  testName?: string
  criticalMin?: number
  criticalMax?: number
  unit?: string
  enabled: boolean
  notes?: string
}

export const LabCriticalParameter = models.Lab_CriticalParameter || model('Lab_CriticalParameter', CriticalParameterSchema)
