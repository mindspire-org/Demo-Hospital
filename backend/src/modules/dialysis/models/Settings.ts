import { Schema, model, models } from 'mongoose'

const SettingsSchema = new Schema({
  centerName: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  email: { type: String, default: '' },
  logoDataUrl: { type: String, default: '' },
  reportFooter: { type: String, default: '' },
  sessionCharge: { type: String, default: '' },
  currency: { type: String, default: '' },
  dateFormat: { type: String, default: '' },
}, { timestamps: true })

export type SettingsDoc = {
  _id: string
  centerName: string
  phone: string
  address: string
  email: string
  logoDataUrl?: string
  reportFooter: string
  sessionCharge: string
  currency: string
  dateFormat: string
}

export const Settings = models.Dialysis_Settings || model('Dialysis_Settings', SettingsSchema)
