import { Schema, model, models } from 'mongoose'

const OTRoomSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['general', 'cardiac', 'neuro', 'orthopedic', 'laparoscopic', 'endoscopy'] },
  status: { type: String, enum: ['available', 'occupied', 'maintenance'], default: 'available', index: true },
  equipment: [{ type: String }],
  notes: { type: String },
  active: { type: Boolean, default: true },
}, { timestamps: true })

export type OTRoomDoc = {
  _id: string
  name: string
  type?: 'general' | 'cardiac' | 'neuro' | 'orthopedic' | 'laparoscopic' | 'endoscopy'
  status: 'available' | 'occupied' | 'maintenance'
  equipment?: string[]
  notes?: string
  active?: boolean
  createdAt: Date
  updatedAt: Date
}

export const OTRoom = models.Hospital_OTRoom || model('Hospital_OTRoom', OTRoomSchema)
