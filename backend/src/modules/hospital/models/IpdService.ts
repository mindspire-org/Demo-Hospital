import { Schema, model, models } from 'mongoose'

const IpdServiceSchema = new Schema({
  name: { type: String, required: true },
  category: { type: String },
  price: { type: Number, default: 0 },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true })

IpdServiceSchema.index({ name: 1 }, { unique: true })

export type HospitalIpdServiceDoc = {
  _id: string
  name: string
  category?: string
  price: number
  active: boolean
}

export const HospitalIpdService = models.Hospital_IpdService || model('Hospital_IpdService', IpdServiceSchema)
