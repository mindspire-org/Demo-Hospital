import { Schema, model, models } from 'mongoose'

const SupplierSchema = new Schema({
  name: { type: String, required: true },
  company: { type: String },
  phone: { type: String },
  address: { type: String },
  taxId: { type: String },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  totalPurchases: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  lastOrder: { type: String },
}, { timestamps: true, collection: 'indoorpharmacy_suppliers' })

export type SupplierDoc = {
  _id: string
  name: string
  company?: string
  phone?: string
  address?: string
  taxId?: string
  status: 'Active' | 'Inactive'
  totalPurchases?: number
  paid?: number
  lastOrder?: string
}

export const Supplier = models.IndoorPharmacy_Supplier || model('IndoorPharmacy_Supplier', SupplierSchema)
