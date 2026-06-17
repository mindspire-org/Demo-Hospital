import { Schema, model, models } from 'mongoose'

const ShiftSchema = new Schema({
  name: { type: String, required: true },
  start: { type: String, required: true },
  end: { type: String, required: true },
  absentCharges: { type: Number, default: 0 },
  lateDeduction: { type: Number, default: 0 },
  earlyOutDeduction: { type: Number, default: 0 },
  lateThreshold: { type: Number, default: 0 },
  bonusPerPresent: { type: Number, default: 0 },
  deductionPerAbsent: { type: Number, default: 0 },
  deductionPerLate: { type: Number, default: 0 },
  deductionPerMinLate: { type: Number, default: 0 },
  deductionPerMinEarlyOut: { type: Number, default: 0 },
  enableAbsentChargesRate: { type: Boolean, default: false },
}, { timestamps: true })

export type HospitalShiftDoc = {
  _id: string
  name: string
  start: string
  end: string
  absentCharges?: number
  lateDeduction?: number
  earlyOutDeduction?: number
  lateThreshold?: number
  bonusPerPresent?: number
  deductionPerAbsent?: number
  deductionPerLate?: number
  deductionPerMinLate?: number
  deductionPerMinEarlyOut?: number
  enableAbsentChargesRate?: boolean
}

export const HospitalShift = models.Hospital_Shift || model('Hospital_Shift', ShiftSchema)
