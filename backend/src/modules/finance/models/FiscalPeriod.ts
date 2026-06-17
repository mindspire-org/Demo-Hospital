import { Schema, model, models, Types } from 'mongoose'

const FiscalPeriodSchema = new Schema({
  name: { type: String, required: true },                    // "FY 2025-26", "Q1 2025-26", "Jul 2025"
  type: { type: String, required: true, enum: ['yearly', 'quarterly', 'monthly'], index: true },
  startDate: { type: String, required: true, index: true },  // "2025-07-01"
  endDate: { type: String, required: true, index: true },    // "2026-06-30"
  status: { type: String, enum: ['open', 'closed', 'locked'], default: 'open', index: true },
  closingVoucherId: { type: Schema.Types.ObjectId, ref: 'Voucher' },  // the year-end closing JV
  closedBy: { type: String },
  closedAt: { type: String },
}, { timestamps: true })

FiscalPeriodSchema.index({ startDate: 1, endDate: 1 })

export type FiscalPeriodDoc = {
  _id: string
  name: string
  type: 'yearly' | 'quarterly' | 'monthly'
  startDate: string
  endDate: string
  status: 'open' | 'closed' | 'locked'
  closingVoucherId?: Types.ObjectId
  closedBy?: string
  closedAt?: string
}

export const FiscalPeriod = models.FiscalPeriod || model('FiscalPeriod', FiscalPeriodSchema)
