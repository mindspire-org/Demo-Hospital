import { Schema, model, models } from 'mongoose'

const SuperAdminUserSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true },
  fullName: { type: String },
  email: { type: String },
  phone: { type: String },
  active: { type: Boolean, default: true },
}, { timestamps: true })

export type SuperAdminUserDoc = {
  _id: string
  username: string
  passwordHash: string
  fullName?: string
  email?: string
  phone?: string
  active: boolean
  createdAt?: Date
  updatedAt?: Date
}

export const SuperAdminUser = models.SuperAdmin_User || model('SuperAdmin_User', SuperAdminUserSchema)
