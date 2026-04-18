import { Schema, model, models } from 'mongoose'

const EquipmentPurchaseSchema = new Schema({
  equipmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Equipment', required: true },
  purchaseOrderNo: { type: String, trim: true },
  purchaseOrderDate: { type: Date },
  invoiceNo: { type: String, required: true, trim: true },
  invoiceDate: { type: Date, required: true },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Hospital_EquipmentSupplier', required: true },
  unitCost: { type: Number, required: true },
  quantity: { type: Number, default: 1 },
  totalCost: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  shippingCost: { type: Number, default: 0 },
  installationCost: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  paymentStatus: { 
    type: String, 
    enum: ['Pending', 'Partial', 'Paid'], 
    default: 'Pending' 
  },
  paidAmount: { type: Number, default: 0 },
  paymentDate: { type: Date },
  paymentMethod: { type: String },
  attachments: [{ type: String }],
  notes: { type: String }
}, { timestamps: true })

export type EquipmentPurchaseDoc = {
  _id: string
  equipmentId: string
  purchaseOrderNo?: string
  purchaseOrderDate?: Date
  invoiceNo: string
  invoiceDate: Date
  supplierId: string
  unitCost: number
  quantity: number
  totalCost: number
  discount: number
  taxAmount: number
  shippingCost: number
  installationCost: number
  grandTotal: number
  paymentStatus: 'Pending' | 'Partial' | 'Paid'
  paidAmount: number
  paymentDate?: Date
  paymentMethod?: string
  attachments?: string[]
  notes?: string
}

export const EquipmentPurchase = models.Hospital_EquipmentPurchase || model('Hospital_EquipmentPurchase', EquipmentPurchaseSchema)
