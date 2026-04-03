import { Schema, model, models } from 'mongoose'

const DialysisPatientSchema = new Schema({
  dialysisPatientSeq: { type: Number, required: true, unique: true, index: true },
  dialysisPatientId: { type: String, required: true, unique: true, index: true },
  labPatientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, unique: true, index: true },
  mrn: { type: String, index: true },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true })

export type DialysisPatientDoc = {
  _id: string
  dialysisPatientSeq: number
  dialysisPatientId: string
  labPatientId: string
  mrn?: string
  active?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export const DialysisPatient = models.Dialysis_Patient || model('Dialysis_Patient', DialysisPatientSchema)
