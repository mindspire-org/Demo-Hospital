import { Schema, model, models } from 'mongoose'

const CampSettingsSchema = new Schema({
  campName: { type: String, default: 'Medical Camp' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  email: { type: String, default: '' },
  reportFooter: { type: String, default: '' },
  logoDataUrl: { type: String, default: '' },
  defaultTokenPrefix: { type: String, default: 'CAMP' },
}, { timestamps: true })

export type CampSettingsDoc = {
  _id: string
  campName?: string
  phone?: string
  address?: string
  email?: string
  reportFooter?: string
  logoDataUrl?: string
  defaultTokenPrefix?: string
}

export const CampSettings = models.CampSettings || model('CampSettings', CampSettingsSchema)
