import { Schema, model, models } from 'mongoose'

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  role: { type: String, default: 'admin' },
  passwordHash: { type: String, required: true },
  shiftId: { type: Schema.Types.ObjectId, ref: 'Lab_Shift', index: true },
  shiftRestricted: { type: Boolean, default: false },

  // Scope: which collection center & department this user belongs to
  assignedCenterId: { type: Schema.Types.ObjectId, ref: 'Lab_CollectionCenter', index: true },
  assignedDepartmentId: { type: String, index: true },
  emergencyDayIds: { type: [String], default: [] },
  isMainLab: { type: Boolean, default: true }, // false for collection-center / outsource users

  // Outsource portal: link to outsource lab record
  outsourceLabId: { type: Schema.Types.ObjectId, ref: 'Lab_OutsourceLab' },

  fullName: { type: String },
  email: { type: String },
  phone: { type: String },
}, { timestamps: true })

export type LabUserDoc = {
  _id: string
  username: string
  role: string
  passwordHash: string
  shiftId?: string
  shiftRestricted?: boolean
  assignedCenterId?: string
  assignedDepartmentId?: string
  emergencyDayIds?: string[]
  isMainLab?: boolean
  outsourceLabId?: string
  fullName?: string
  email?: string
  phone?: string
}

export const LabUser = models.Lab_User || model('Lab_User', UserSchema)
