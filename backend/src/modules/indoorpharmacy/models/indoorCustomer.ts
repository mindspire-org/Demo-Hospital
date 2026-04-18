import { Schema, model, models } from 'mongoose'

const CustomerSchema = new Schema({
  name: { type: String, required: true },
  company: { type: String },
  phone: { type: String },
  address: { type: String },
  cnic: { type: String },
  mrNumber: { type: String },
}, { timestamps: true, collection: 'indoorpharmacy_customers' })

export type CustomerDoc = {
  _id: string
  name: string
  company?: string
  phone?: string
  address?: string
  cnic?: string
  mrNumber?: string
}

export const Customer = models.IndoorPharmacy_Customer || model('IndoorPharmacy_Customer', CustomerSchema)
