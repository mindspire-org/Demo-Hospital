import { Schema, model, models } from 'mongoose'

const SettingsSchema = new Schema({
  cafeteriaName: { type: String, default: 'Hospital Cafeteria' },
  taxRate: { type: Number, default: 0 },
  currency: { type: String, default: 'PKR' },
  lowStockAlerts: { type: Boolean, default: true },
}, { timestamps: true })

export const Settings = models.Cafeteria_Settings || model('Cafeteria_Settings', SettingsSchema)
