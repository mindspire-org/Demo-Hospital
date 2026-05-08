import { Schema, model, models } from 'mongoose'

const PaymentHistorySchema = new Schema({
  date: { type: String, required: true },
  amount: { type: Number, required: true },
  note: { type: String },
  recordedBy: { type: String },
}, { _id: true })

const CollectionCenterSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  address: { type: String },
  contactPerson: { type: String },
  phone: { type: String },
  email: { type: String },
  whatsappNumber: { type: String },
  mobileNumber: { type: String },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  allowedTestIds: { type: [Schema.Types.ObjectId], ref: 'Lab_Test', default: [] },
  commissionPercent: { type: Number, default: 0, min: 0, max: 100 },
  totalTokens: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  totalCommission: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  paymentHistory: { type: [PaymentHistorySchema], default: [] },

  // Hierarchy / pairing
  parentCenterId: { type: Schema.Types.ObjectId, ref: 'Lab_CollectionCenter', index: true },
  pairedCenterIds: { type: [Schema.Types.ObjectId], ref: 'Lab_CollectionCenter', default: [] },
  isHead: { type: Boolean, default: false, index: true },
  region: { type: String },

  // Discount/financial fields (image 19)
  maxDiscountPerTestPct: { type: Number, default: 0 },
  maxDiscountPerDayPct: { type: Number, default: 0 },
  dailyCounterStartValue: { type: Number, default: 1 },
  referredByEmployeeId: { type: String },
  referredByEmployeeBillSharePercent: { type: Number, default: 0 },
  maxPayableCreditAmount: { type: Number, default: 0 },
  totalPayableAmount: { type: Number, default: 0 },
  openingBalance: { type: Number, default: 0 },
  remainingOpeningBalance: { type: Number, default: 0 },
  enabled: { type: Boolean, default: true },
  printOnReportHeader: { type: Boolean, default: false },
  actualCollectionCenterId: { type: Schema.Types.ObjectId, ref: 'Lab_CollectionCenter' },
  overrideMaxDiscPct: { type: Number, default: 0 },
  description: { type: String },
  logoDataUrl: { type: String },
  // For outsource portal users
  isOutsource: { type: Boolean, default: false },
}, { timestamps: true })

export type LabCollectionCenterDoc = {
  _id: string
  name: string
  code: string
  address?: string
  contactPerson?: string
  phone?: string
  email?: string
  status: 'Active' | 'Inactive'
  allowedTestIds?: string[]
  commissionPercent: number
  totalTokens: number
  totalRevenue: number
  totalCommission: number
  balanceDue: number
  paymentHistory: Array<{
    _id: string
    date: string
    amount: number
    note?: string
    recordedBy?: string
  }>
  createdAt: string
  updatedAt: string

  // Hierarchy / pairing
  parentCenterId?: string
  pairedCenterIds?: string[]
  isHead?: boolean
  region?: string

  // Settings
  whatsappNumber?: string
  mobileNumber?: string
  maxDiscountPerTestPct?: number
  maxDiscountPerDayPct?: number
  dailyCounterStartValue?: number
  referredByEmployeeId?: string
  referredByEmployeeBillSharePercent?: number
  maxPayableCreditAmount?: number
  totalPayableAmount?: number
  openingBalance?: number
  remainingOpeningBalance?: number
  enabled?: boolean
  printOnReportHeader?: boolean
  actualCollectionCenterId?: string
  overrideMaxDiscPct?: number
  description?: string
  logoDataUrl?: string
  isOutsource?: boolean
}

export const LabCollectionCenter = models.Lab_CollectionCenter || model('Lab_CollectionCenter', CollectionCenterSchema)
