import { Schema, model, models } from 'mongoose'

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  role: { type: String, default: 'admin' },
  passwordHash: { type: String, required: true },
}, { timestamps: true })

export type CafeteriaUserDoc = {
  _id: string
  username: string
  role: string
  passwordHash: string
}

export const CafeteriaUser = models.Cafeteria_User || model('Cafeteria_User', UserSchema)
