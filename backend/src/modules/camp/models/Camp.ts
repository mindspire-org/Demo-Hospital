import { Schema, model, models } from 'mongoose'

const CampSchema = new Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  address: { type: String, default: '' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['planned', 'active', 'completed', 'cancelled'], default: 'planned' },
  organizer: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  description: { type: String, default: '' },
  notes: { type: String, default: '' },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  expectedPatients: { type: Number, default: 0 },
}, { timestamps: true })

export type CampDoc = {
  _id: string
  name: string
  location: string
  address?: string
  startDate: Date
  endDate: Date
  status: 'planned' | 'active' | 'completed' | 'cancelled'
  organizer?: string
  contactPhone?: string
  description?: string
  notes?: string
  lat?: number
  lng?: number
  expectedPatients?: number
  createdAt?: Date
  updatedAt?: Date
}

export const Camp = models.Camp || model('Camp', CampSchema)
