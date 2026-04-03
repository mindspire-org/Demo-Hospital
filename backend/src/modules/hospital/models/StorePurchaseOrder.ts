import { Schema, model, models } from 'mongoose'

const PurchaseOrderItemSchema = new Schema({
  itemId: { type: String },
  name: { type: String, required: true },
  category: { type: String },
  qty: { type: Number, required: true },
  unit: { type: String }, // e.g., 'pcs', 'packs', 'boxes'
})

const StorePurchaseOrderSchema = new Schema({
  poNumber: { type: String, required: true, unique: true },
  orderDate: { type: String, required: true }, // yyyy-mm-dd
  expectedDelivery: { type: String }, // yyyy-mm-dd
  supplierId: { type: String },
  supplierName: { type: String, required: true },
  supplierContact: { type: String },
  supplierPhone: { type: String },
  supplierCompany: { type: String },
  supplierAddress: { type: String },
  supplierTaxId: { type: String },
  companyName: { type: String },
  deliveryAddress: { type: String },
  items: { type: [PurchaseOrderItemSchema], default: [] },
  notes: { type: String },
  terms: { type: String },
  status: { type: String, enum: ['Pending', 'Sent', 'Received', 'Complete', 'Cancelled'], default: 'Pending' },
  authorizedBy: { type: String },
}, { timestamps: true, collection: 'hospital_store_purchase_orders' })

export type StorePurchaseOrderDoc = {
  _id: string
  poNumber: string
  orderDate: string
  expectedDelivery?: string
  supplierId?: string
  supplierName: string
  supplierContact?: string
  supplierPhone?: string
  supplierCompany?: string
  supplierAddress?: string
  supplierTaxId?: string
  companyName?: string
  deliveryAddress?: string
  items: {
    itemId?: string
    name: string
    category?: string
    qty: number
    unit?: string
  }[]
  notes?: string
  terms?: string
  status: 'Pending' | 'Sent' | 'Received' | 'Complete' | 'Cancelled'
  authorizedBy?: string
  createdAt?: string
  updatedAt?: string
}

export const StorePurchaseOrder = models.Hospital_StorePurchaseOrder || model('Hospital_StorePurchaseOrder', StorePurchaseOrderSchema)
