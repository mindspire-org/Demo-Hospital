import { Schema, model, models } from 'mongoose'



const SettingsSchema = new Schema({

  name: { type: String, default: '' },

  phone: { type: String, default: '' },

  address: { type: String, default: '' },

  email: { type: String, default: '' },

  website: { type: String, default: '' },

  logoDataUrl: { type: String, default: '' },

  code: { type: String, default: '' },

  slipFooter: { type: String, default: '' },

  mrnFormat: { type: String, default: '' },

  manualRxFields: { type: Schema.Types.Mixed, default: {} },

  eyeRxEnabled: { type: Boolean, default: true },

}, { timestamps: true })



export type HospitalSettingsDoc = {

  _id: string

  name: string

  phone: string

  address: string

  email?: string

  website?: string

  logoDataUrl?: string

  code?: string

  slipFooter?: string

  mrnFormat?: string

  manualRxFields?: Record<string, boolean>

  eyeRxEnabled?: boolean

}



export const HospitalSettings = models.Hospital_Settings || model('Hospital_Settings', SettingsSchema)

