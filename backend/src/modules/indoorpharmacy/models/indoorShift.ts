import { Schema, model, models } from 'mongoose'

const ShiftSchema = new Schema({
  name: { type: String, required: true },
  start: { type: String, required: true },
  end: { type: String, required: true }, 
  absentCharges: { type: Number, default: 0 },
  lateDeduction: { type: Number, default: 0 },
  earlyOutDeduction: { type: Number, default: 0 },
}, { timestamps: true, collection: 'indoorpharmacy_shifts' })

export type ShiftDoc = {
  _id: string
  name: string
  start: string
  end: string
  graceMin?: number
  leaveDeduction?: number
  absentCharges?: number
  lateDeduction?: number
  earlyOutDeduction?: number
}

export const Shift = models.IndoorPharmacy_Shift || model('IndoorPharmacy_Shift', ShiftSchema)
