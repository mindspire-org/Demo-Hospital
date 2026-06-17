import { Schema, model, models } from 'mongoose'

const StaffSchema = new Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  phone: { type: String },
  salary: { type: Number },
  shiftId: { type: String },
  joinDate: { type: String },
  address: { type: String },
  active: { type: Boolean, default: true },
  leaveQuotas: {
    annual: { type: Number, default: 0 },
    casual: { type: Number, default: 0 },
    sick: { type: Number, default: 0 },
  },
  leaveBalances: {
    annual: { type: Number, default: 0 },
    casual: { type: Number, default: 0 },
    sick: { type: Number, default: 0 },
  }
}, { timestamps: true })

export type HospitalStaffDoc = {
  _id: string
  name: string
  role: string
  phone?: string
  salary?: number
  shiftId?: string
  joinDate?: string
  address?: string
  active: boolean
  leaveQuotas?: {
    annual: number
    casual: number
    sick: number
  }
  leaveBalances?: {
    annual: number
    casual: number
    sick: number
  }
}

export const HospitalStaff = models.Hospital_Staff || model('Hospital_Staff', StaffSchema)
