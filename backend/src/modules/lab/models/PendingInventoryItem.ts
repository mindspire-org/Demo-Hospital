import { Schema, model, models } from 'mongoose'

const PendingInventoryItemSchema = new Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String },
  price: { type: Number },
  supplier: { type: String },
  purchaseOrderId: { type: String, required: true },
  purchaseOrderNumber: { type: String, required: true },
  purchaseOrderDate: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  notes: { type: String },
  reviewedBy: { type: String },
  reviewedAt: { type: Date },
}, { timestamps: true, collection: 'lab_pendinginventoryitems' })

export type LabPendingInventoryItemDoc = {
  _id: string
  name: string
  quantity: number
  unit?: string
  price?: number
  supplier?: string
  purchaseOrderId: string
  purchaseOrderNumber: string
  purchaseOrderDate?: string
  status: 'pending' | 'approved' | 'rejected'
  notes?: string
  reviewedBy?: string
  reviewedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

export const LabPendingInventoryItem = models.Lab_PendingInventoryItem || model('Lab_PendingInventoryItem', PendingInventoryItemSchema)
