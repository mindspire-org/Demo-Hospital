import { Schema, model, models } from 'mongoose'

const OTSterilizationSchema = new Schema({
  cycleNumber: { type: String },
  type: { type: String, enum: ['autoclave', 'eto', 'plasma', 'dry-heat'], required: true },
  status: { type: String, enum: ['pending', 'in-progress', 'completed', 'failed'], default: 'pending' },
  startedAt: { type: Date },
  completedAt: { type: Date },
  temperature: { type: Number }, // Celsius
  pressure: { type: Number }, // PSI or bar
  duration: { type: Number }, // minutes
  items: [{ type: String }],
  operatorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Staff' },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'Hospital_Staff' },
  notes: { type: String },
}, { timestamps: true })

export type OTSterilizationDoc = {
  _id: string
  cycleNumber?: string
  type: 'autoclave' | 'eto' | 'plasma' | 'dry-heat'
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  startedAt?: Date
  completedAt?: Date
  temperature?: number
  pressure?: number
  duration?: number
  items?: string[]
  operatorId?: string
  verifiedBy?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export const OTSterilization = models.Hospital_OTSterilization || model('Hospital_OTSterilization', OTSterilizationSchema)
