import { Schema, model, models } from 'mongoose'

const SaleLineSchema = new Schema({
  menuItemId: { type: Schema.Types.ObjectId },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  qty: { type: Number, required: true },
  costPrice: { type: Number, default: 0 },
}, { _id: false })

const SaleSchema = new Schema({
  billNo: { type: String, required: true, unique: true, index: true },
  datetime: { type: String, required: true },
  items: { type: [SaleLineSchema], default: [] },
  subtotal: { type: Number, default: 0 },
  discountPct: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ['Cash', 'Card', 'Bank'], default: 'Cash' },
  orderType: { type: String, enum: ['Dining', 'Take Away', 'Delivery'], default: 'Dining' },
  tableNumber: { type: String, default: '' },
  deliveryAddress: { type: String, default: '' },
  deliveryPhone: { type: String, default: '' },
  customerName: { type: String, default: 'Walk-in' },
  customerPhone: { type: String, default: '' },
  createdBy: { type: String },
  profit: { type: Number, default: 0 },
  shiftId: { type: Schema.Types.ObjectId, ref: 'Cafeteria_DailyShift', default: null },
}, { timestamps: true })

export type SaleLine = {
  menuItemId?: string
  name: string
  price: number
  qty: number
  costPrice?: number
}

export type SaleDoc = {
  _id: string
  billNo: string
  datetime: string
  items: SaleLine[]
  subtotal: number
  discountPct?: number
  discountAmount?: number
  deliveryFee?: number
  total: number
  paymentMethod: string
  orderType?: string
  tableNumber?: string
  deliveryAddress?: string
  deliveryPhone?: string
  customerName: string
  customerPhone?: string
  createdBy?: string
  profit: number
  shiftId?: string
}

export const Sale = models.Cafeteria_Sale || model('Cafeteria_Sale', SaleSchema)
