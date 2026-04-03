import { Schema, model, models } from 'mongoose'

const DialysisDialyzerTypeSchema = new Schema({
  name: { type: String, required: true, trim: true },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true })

export type DialysisDialyzerTypeDoc = {
  _id: string
  name: string
  active: boolean
  createdAt?: Date
  updatedAt?: Date
}

export const DialysisDialyzerType = models.Dialysis_DialyzerType || model('Dialysis_DialyzerType', DialysisDialyzerTypeSchema)
