import { Schema, model, models } from 'mongoose'

const ICUBedSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['general', 'surgical', 'cardiac', 'neonatal', 'pediatric'], default: 'general' },
  status: { type: String, enum: ['available', 'occupied', 'maintenance', 'cleaning'], default: 'available', index: true },
  clinicalStatus: { type: String, enum: ['stable', 'critical', 'unstable', 'emergency', 'empty'], default: 'empty' },
  // Infection control
  isolationType: { type: String, enum: ['none', 'contact', 'droplet', 'airborne', 'protective'], default: 'none' },
  cleaningStatus: { type: String, enum: ['clean', 'dirty', 'in-progress', 'ready'], default: 'clean' },
  expectedAvailableAt: { type: Date },
  // Equipment
  ventilatorAvailable: { type: Boolean, default: false },
  equipment: [{ type: String }],
  notes: { type: String },
  active: { type: Boolean, default: true },
}, { timestamps: true })

export type ICUBedDoc = {
  _id: string
  name: string
  type?: 'general' | 'surgical' | 'cardiac' | 'neonatal' | 'pediatric'
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning'
  clinicalStatus?: 'stable' | 'critical' | 'unstable' | 'emergency' | 'empty'
  isolationType?: 'none' | 'contact' | 'droplet' | 'airborne' | 'protective'
  cleaningStatus?: 'clean' | 'dirty' | 'in-progress' | 'ready'
  expectedAvailableAt?: Date
  ventilatorAvailable?: boolean
  equipment?: string[]
  notes?: string
  active?: boolean
  createdAt: Date
  updatedAt: Date
}

export const ICUBed = models.Hospital_ICUBed || model('Hospital_ICUBed', ICUBedSchema)
