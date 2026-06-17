import { Schema, model, models } from 'mongoose'

const ICUScoreSchema = new Schema({
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },
  type: { type: String, enum: ['gcs', 'apache', 'sofa'], required: true, index: true },
  recordedAt: { type: Date, default: Date.now },
  score: { type: Number, required: true },
  details: { type: Schema.Types.Mixed }, // For GCS: { eye, verbal, motor }, for APACHE: { age, chronicHealth, physiologic }, etc.
  calculatedBy: { type: Schema.Types.ObjectId, ref: 'Hospital_User' },
  notes: { type: String },
}, { timestamps: true })

ICUScoreSchema.index({ encounterId: 1, type: 1, recordedAt: -1 })

export type ICUScoreDoc = {
  _id: string
  encounterId: string
  type: 'gcs' | 'apache' | 'sofa'
  recordedAt: Date
  score: number
  details?: any
  calculatedBy?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export const ICUScore = models.Hospital_ICUScore || model('Hospital_ICUScore', ICUScoreSchema)
