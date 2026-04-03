import { Schema, model, models } from 'mongoose'

const DialysisSessionTypeSchema = new Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, default: '', trim: true },
  price: { type: Number, default: 0, min: 0 },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true })

export type DialysisSessionTypeDoc = {
  _id: string
  name: string
  code?: string
  price?: number
  active: boolean
  createdAt?: Date
  updatedAt?: Date
}

export const DialysisSessionType = models.Dialysis_SessionType || model('Dialysis_SessionType', DialysisSessionTypeSchema)
