import { Schema, model, models } from 'mongoose'

const LeaveSchema = new Schema({
  staffId: { type: String, required: true, index: true },
  type: { type: String, enum: ['annual', 'casual', 'sick', 'other'], required: true },
  startDate: { type: String, required: true }, // yyyy-mm-dd
  endDate: { type: String, required: true }, // yyyy-mm-dd
  isHalfDay: { type: Boolean, default: false },
  halfDayType: { type: String, enum: ['first_half', 'second_half'], default: null },
  reason: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  appliedDate: { type: String, required: true },
  approvedBy: { type: String },
  approvedDate: { type: String },
  rejectionReason: { type: String },
}, { timestamps: true })

export type HospitalLeaveDoc = {
  _id: string
  staffId: string
  type: 'annual' | 'casual' | 'sick' | 'other'
  startDate: string
  endDate: string
  isHalfDay: boolean
  halfDayType?: 'first_half' | 'second_half'
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  appliedDate: string
  approvedBy?: string
  approvedDate?: string
  rejectionReason?: string
}

export const HospitalLeave = models.Hospital_Leave || model('Hospital_Leave', LeaveSchema)
