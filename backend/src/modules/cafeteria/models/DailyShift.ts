import { Schema, model, models } from 'mongoose'

const ShiftSchema = new Schema({
  date: { type: String, required: true, index: true },
  openedAt: { type: String, required: true },
  closedAt: { type: String, default: '' },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  openingCash: { type: Number, default: 0 },
  closingCash: { type: Number, default: 0 },
  expectedCash: { type: Number, default: 0 },
  cashDifference: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  totalProfit: { type: Number, default: 0 },
  salesCount: { type: Number, default: 0 },
  paymentBreakdown: {
    Cash: { type: Number, default: 0 },
    Card: { type: Number, default: 0 },
    Bank: { type: Number, default: 0 },
  },
  orderTypeBreakdown: {
    Dining: { type: Number, default: 0 },
    'Take Away': { type: Number, default: 0 },
    Delivery: { type: Number, default: 0 },
  },
  openedBy: { type: String, default: '' },
  closedBy: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { timestamps: true })

export type ShiftDoc = {
  _id: string
  date: string
  openedAt: string
  closedAt?: string
  status: string
  openingCash: number
  closingCash: number
  expectedCash: number
  cashDifference: number
  totalSales: number
  totalRevenue: number
  totalProfit: number
  salesCount: number
  paymentBreakdown: { Cash: number; Card: number; Bank: number }
  orderTypeBreakdown: { Dining: number; 'Take Away': number; Delivery: number }
  openedBy?: string
  closedBy?: string
  notes?: string
}

export const DailyShift = models.Cafeteria_DailyShift || model('Cafeteria_DailyShift', ShiftSchema)
