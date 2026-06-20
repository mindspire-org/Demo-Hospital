import { Schema, model, models } from 'mongoose'

const CampUserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  fullName: { type: String, default: '' },
  role: { type: String, default: 'admin' },
  passwordHash: { type: String, required: true },
  active: { type: Boolean, default: true },
}, { timestamps: true })

export type CampUserDoc = {
  _id: string
  username: string
  fullName?: string
  role: string
  passwordHash: string
  active?: boolean
}

export const CampUser = models.CampUser || model('CampUser', CampUserSchema)
