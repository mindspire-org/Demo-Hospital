import { Schema, model, models } from 'mongoose'

const DialysisShiftSchema = new Schema({
  name: { type: String, required: true, trim: true },
  start: { type: String, default: '', trim: true },
  end: { type: String, default: '', trim: true },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true })

export type DialysisShiftDoc = {
  _id: string
  name: string
  start?: string
  end?: string
  active: boolean
  createdAt?: Date
  updatedAt?: Date
}

export const DialysisShift = models.Dialysis_Shift || model('Dialysis_Shift', DialysisShiftSchema)
