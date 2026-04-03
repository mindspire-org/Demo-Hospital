import { Schema, model, models } from 'mongoose'

const SchemaDef = new Schema({
  name: { type: String, required: true },
  distributorId: { type: String },
  distributorName: { type: String },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true, collection: 'lab_companies' })

export const LabCompany = models?.LabCompany || model('LabCompany', SchemaDef)
