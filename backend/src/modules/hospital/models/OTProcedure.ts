import { Schema, model, models } from 'mongoose'

const OTProcedureSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String }, // e.g., PROC-001, GS-001, etc.
  description: { type: String },
  estimatedDuration: { type: Number }, // minutes
  requiredEquipment: [{ type: String }],
  requiredStaff: [{
    role: { type: String, enum: ['surgeon', 'assistant-surgeon', 'anesthesiologist', 'anesthesia-tech', 'scrub-nurse', 'circulating-nurse', 'ot-technician'] },
    count: { type: Number, default: 1 }
  }],
  anesthesiaTypes: [{ type: String, enum: ['general', 'spinal', 'epidural', 'local', 'regional', 'sedation', 'none'] }],
  specialInstructions: { type: String },
  price: { type: Number },
  active: { type: Boolean, default: true },
}, { timestamps: true })

OTProcedureSchema.index({ name: 1 })
OTProcedureSchema.index({ code: 1 })

export type OTProcedureDoc = {
  _id: string
  name: string
  code?: string
  description?: string
  estimatedDuration?: number
  requiredEquipment?: string[]
  requiredStaff?: Array<{ role: string; count: number }>
  anesthesiaTypes?: string[]
  specialInstructions?: string
  price?: number
  active?: boolean
  createdAt: Date
  updatedAt: Date
}

export const OTProcedure = models.Hospital_OTProcedure || model('Hospital_OTProcedure', OTProcedureSchema)
