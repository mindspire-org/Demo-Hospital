import { Schema, model, models } from 'mongoose'

const CampStaffAssignmentSchema = new Schema({
  campId: { type: Schema.Types.ObjectId, ref: 'Camp', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'CampUser', required: true },
  role: { type: String, enum: ['doctor', 'nurse', 'pharmacist', 'lab-tech', 'coordinator'], required: true },
  fullName: { type: String, required: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  shift: { type: String, default: 'morning' },
  notes: { type: String, default: '' },
  active: { type: Boolean, default: true },
}, { timestamps: true })

CampStaffAssignmentSchema.index({ campId: 1, userId: 1 }, { unique: true })

export type CampStaffAssignmentDoc = {
  _id: string
  campId: string
  userId: string
  role: 'doctor' | 'nurse' | 'pharmacist' | 'lab-tech' | 'coordinator'
  fullName: string
  phone?: string
  email?: string
  startDate: Date
  endDate: Date
  shift?: string
  notes?: string
  active?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export const CampStaffAssignment = models.CampStaffAssignment || model('CampStaffAssignment', CampStaffAssignmentSchema)
