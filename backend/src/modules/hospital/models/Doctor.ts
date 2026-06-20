import { Schema, model, models } from 'mongoose'

const DoctorSchema = new Schema({
  name: { type: String, required: true },
  departmentIds: [{ type: Schema.Types.ObjectId, ref: 'Hospital_Department' }],
  primaryDepartmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Department' },
  opdPublicFee: { type: Number },
  opdPrivateFee: { type: Number },
  opdSubsidizedFee: { type: Number },
  opdFollowupFee: { type: Number },
  followupWindowDays: { type: Number },
  username: { type: String },
  phone: { type: String },
  specialization: { type: String },
  qualification: { type: String },
  cnic: { type: String },
  pmdcNo: { type: String },
  shares: { type: Number, default: 100 },
  opdShare: { type: Number },
  ipdShare: { type: Number },
  active: { type: Boolean, default: true },
  prescriptionTemplate: { type: String, default: 'hospital-rx' },
  prescriptionLanguage: { type: String, default: 'english' },
  prescriptionDesign: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true })

export type HospitalDoctorDoc = {
  _id: string
  name: string
  departmentIds?: string[]
  primaryDepartmentId?: string
  opdPublicFee?: number
  opdPrivateFee?: number
  opdSubsidizedFee?: number
  opdFollowupFee?: number
  followupWindowDays?: number
  username?: string
  phone?: string
  specialization?: string
  qualification?: string
  cnic?: string
  pmdcNo?: string
  shares?: number
  opdShare?: number
  ipdShare?: number
  active: boolean
  prescriptionTemplate?: string
  prescriptionLanguage?: string
  prescriptionDesign?: any
}

export const HospitalDoctor = models.Hospital_Doctor || model('Hospital_Doctor', DoctorSchema)
