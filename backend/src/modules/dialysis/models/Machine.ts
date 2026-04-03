import { Schema, model, models } from 'mongoose'

const DialysisMachineSchema = new Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, default: '', trim: true },
  status: { type: String, default: 'available', index: true },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true })

export type DialysisMachineDoc = {
  _id: string
  name: string
  code?: string
  status: string
  active: boolean
  createdAt?: Date
  updatedAt?: Date
}

export const DialysisMachine = models.Dialysis_Machine || model('Dialysis_Machine', DialysisMachineSchema)
