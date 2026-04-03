import { Schema, model, models } from 'mongoose'

const LineSchema = new Schema({
  itemName: { type: String, required: true },
  category: { type: String },
  batchNo: { type: String },
  quantity: { type: Number, default: 0 },
  unit: { type: String, default: 'pcs' },
  purchaseCost: { type: Number, default: 0 },
  expiry: { type: String }, // yyyy-mm-dd
  minStock: { type: Number, default: 0 },
})

const StorePurchaseDraftSchema = new Schema({
  date: { type: String, required: true }, // yyyy-mm-dd
  invoiceNo: { type: String, required: true, index: true },
  supplierId: { type: String },
  supplierName: { type: String },
  paymentMode: { type: String },
  storeLocation: { type: String },
  notes: { type: String },
  totalAmount: { type: Number, default: 0 },
  lines: { type: [LineSchema], default: [] },
}, { timestamps: true, collection: 'hospital_store_purchasedrafts' })

export type StorePurchaseDraftDoc = {
  _id: string
  date: string
  invoiceNo: string
  supplierId?: string
  supplierName?: string
  paymentMode?: string
  storeLocation?: string
  notes?: string
  totalAmount: number
  lines: {
    itemName: string
    category?: string
    batchNo?: string
    quantity: number
    unit: string
    purchaseCost: number
    expiry?: string
    minStock?: number
  }[]
}

export const StorePurchaseDraft = models.Hospital_StorePurchaseDraft || model('Hospital_StorePurchaseDraft', StorePurchaseDraftSchema)
