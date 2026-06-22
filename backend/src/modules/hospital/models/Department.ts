import { Schema, model, models } from 'mongoose'

const DepartmentSchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  // Explicit binding to a specialized clinical module (dental, eye, cardiac,
  // breast-onco, omfs, neuro). Empty/undefined = General; falls back to
  // name-based inference. Removes dependence on department-name spelling.
  clinicalModule: { type: String },
  opdBaseFee: { type: Number, required: true, min: 0 },
  opdFollowupFee: { type: Number },
  followupWindowDays: { type: Number },
  doctorPrices: [{
    doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
    price: { type: Number },
  }],
}, { timestamps: true })

export type HospitalDepartmentDoc = {
  _id: string
  name: string
  description?: string
  clinicalModule?: string
  opdBaseFee: number
  opdFollowupFee?: number
  followupWindowDays?: number
  doctorPrices?: Array<{ doctorId: string; price: number }>
}

export const HospitalDepartment = models.Hospital_Department || model('Hospital_Department', DepartmentSchema)
