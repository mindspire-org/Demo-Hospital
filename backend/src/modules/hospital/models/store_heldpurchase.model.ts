import { Schema, model, models } from 'mongoose'

const HeldPurchaseLineSchema = new Schema({
  tempId: { type: String },
  itemId: { type: String },
  itemName: { type: String, required: true },
  category: { type: String },
  quantity: { type: Number, default: 1 },
  unit: { type: String, default: 'pcs' },
  purchaseCost: { type: Number, default: 0 },
  expiry: { type: String },
  subtotal: { type: Number, default: 0 },
})

const HeldPurchaseSchema = new Schema({
  // User who held the purchase
  userId: { type: String },
  username: { type: String },
  
  // Form data
  date: { type: String },
  invoiceNo: { type: String },
  supplierId: { type: String },
  supplierName: { type: String },
  paymentMode: { type: String, default: 'credit' },
  storeLocation: { type: String },
  
  // Items
  lines: { type: [HeldPurchaseLineSchema], default: [] },
  totalAmount: { type: Number, default: 0 },
  
  // Metadata
  heldAt: { type: Date, default: Date.now },
  notes: { type: String },
}, { timestamps: true, collection: 'hospital_store_heldpurchases' })

export type HeldPurchaseDoc = {
  _id: string
  userId?: string
  username?: string
  date?: string
  invoiceNo?: string
  supplierId?: string
  supplierName?: string
  paymentMode?: string
  storeLocation?: string
  lines: {
    tempId?: string
    itemId?: string
    itemName: string
    category?: string
    quantity: number
    unit: string
    purchaseCost: number
    expiry?: string
    subtotal?: number
  }[]
  totalAmount: number
  heldAt: Date
  notes?: string
  createdAt?: Date
  updatedAt?: Date
}

export const HeldPurchase = models.Hospital_StoreHeldPurchase || model('Hospital_StoreHeldPurchase', HeldPurchaseSchema)
