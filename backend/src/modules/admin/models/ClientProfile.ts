import { Schema, model, models } from 'mongoose'

const UsageEntrySchema = new Schema({
  action: { type: String, required: true },
  module: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: false })

const ClientProfileSchema = new Schema({
  clientName: { type: String, required: true },
  licenseKey: { type: String, required: true, unique: true },
  installationDate: { type: Date, default: Date.now },
  supportExpiry: { type: Date },
  contactPerson: { type: String },
  contactPhone: { type: String },
  contactEmail: { type: String },
  hospitalName: { type: String },
  address: { type: String },
  city: { type: String },
  country: { type: String },
  maxUsers: { type: Number, default: 0 },
  modulesAllowed: { type: [String], default: [] },
  usageLog: { type: [UsageEntrySchema], default: [] },
}, { timestamps: true })

export type ClientProfileDoc = {
  _id: string
  clientName: string
  licenseKey: string
  installationDate: Date
  supportExpiry?: Date
  contactPerson?: string
  contactPhone?: string
  contactEmail?: string
  hospitalName?: string
  address?: string
  city?: string
  country?: string
  maxUsers: number
  modulesAllowed: string[]
  usageLog: Array<{ action: string; module: string; timestamp: Date }>
  createdAt?: Date
  updatedAt?: Date
}

export const ClientProfile = models.Client_Profile || model('Client_Profile', ClientProfileSchema)
