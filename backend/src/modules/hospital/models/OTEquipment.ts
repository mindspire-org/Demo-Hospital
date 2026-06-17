import { Schema, model, models } from 'mongoose'

const OTEquipmentSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String },
  roomId: { type: Schema.Types.ObjectId, ref: 'Hospital_OTRoom' },
  status: { type: String, enum: ['available', 'in-use', 'maintenance', 'retired'], default: 'available' },
  manufacturer: { type: String },
  model: { type: String },
  serialNumber: { type: String },
  purchaseDate: { type: Date },
  warrantyExpiry: { type: Date },
  lastMaintenance: { type: Date },
  nextMaintenance: { type: Date },
  maintenanceInterval: { type: Number }, // days
  notes: { type: String },
  active: { type: Boolean, default: true },
}, { timestamps: true })

OTEquipmentSchema.index({ status: 1 })
OTEquipmentSchema.index({ roomId: 1 })

export type OTEquipmentDoc = {
  _id: string
  name: string
  code?: string
  roomId?: string
  status: 'available' | 'in-use' | 'maintenance' | 'retired'
  manufacturer?: string
  model?: string
  serialNumber?: string
  purchaseDate?: Date
  warrantyExpiry?: Date
  lastMaintenance?: Date
  nextMaintenance?: Date
  maintenanceInterval?: number
  notes?: string
  active?: boolean
  createdAt: Date
  updatedAt: Date
}

export const OTEquipment = models.Hospital_OTEquipment || model('Hospital_OTEquipment', OTEquipmentSchema)
