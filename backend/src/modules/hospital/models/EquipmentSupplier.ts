import { Schema, model, models } from 'mongoose'

const EquipmentSupplierSchema = new Schema({
  name: { type: String, required: true, trim: true },
  company: { type: String, trim: true },
  contactPerson: { type: String, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true },
  address: { type: String, trim: true },
  taxId: { type: String, trim: true },
  gstNumber: { type: String, trim: true },
  type: { 
    type: String, 
    enum: ['Manufacturer', 'Distributor', 'ServiceProvider', 'AMCProvider'],
    default: 'ServiceProvider'
  },
  totalPurchases: { type: Number, default: 0 },
  totalServices: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  outstanding: { type: Number, default: 0 },
  bankDetails: { type: String },
  paymentTerms: { type: String },
  status: { 
    type: String, 
    enum: ['Active', 'Inactive', 'Blacklisted'], 
    default: 'Active' 
  },
  rating: { type: Number, min: 1, max: 5 },
  notes: { type: String },
  lastTransactionAt: { type: Date }
}, { timestamps: true })

export type EquipmentSupplierDoc = {
  _id: string
  name: string
  company?: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  taxId?: string
  gstNumber?: string
  type: 'Manufacturer' | 'Distributor' | 'ServiceProvider' | 'AMCProvider'
  totalPurchases: number
  totalServices: number
  totalPaid: number
  outstanding: number
  bankDetails?: string
  paymentTerms?: string
  status: 'Active' | 'Inactive' | 'Blacklisted'
  rating?: number
  notes?: string
  lastTransactionAt?: Date
  createdAt: Date
  updatedAt: Date
}

export const EquipmentSupplier = models.Hospital_EquipmentSupplier || model('Hospital_EquipmentSupplier', EquipmentSupplierSchema)
