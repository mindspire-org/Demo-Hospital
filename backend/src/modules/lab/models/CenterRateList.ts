import { Schema, model, models } from 'mongoose'

const CenterRateListSchema = new Schema({
  centerId: { type: Schema.Types.ObjectId, ref: 'Lab_CollectionCenter', required: true, index: true },
  testId: { type: String, required: true, index: true },
  testName: { type: String, required: true },
  category: { type: String },
  status: { type: Boolean, default: true },
  performAtCC: { type: Boolean, default: false },
  labRate: { type: Number, default: 0 },
  ccPatientRate: { type: Number, default: 0 },
  ccShare: { type: Number, default: 0 },
  ccSharePercent: { type: Number },
  labShare: { type: Number, default: 0 },
  discountBearByCCPct: { type: Number, default: 0 },
  discountBearByLabPct: { type: Number, default: 100 },
  maxDiscountPct: { type: Number, default: 0 },
  etaDays: { type: Number, default: 0 },
  etaHours: { type: Number, default: 0 },
  etaMinutes: { type: Number, default: 0 },
}, { timestamps: true })

CenterRateListSchema.index({ centerId: 1, testId: 1 }, { unique: true })

export type LabCenterRateListDoc = {
  _id: string
  centerId: string
  testId: string
  testName: string
  category?: string
  status: boolean
  performAtCC: boolean
  labRate: number
  ccPatientRate: number
  ccShare: number
  ccSharePercent?: number
  labShare: number
  discountBearByCCPct: number
  discountBearByLabPct: number
  maxDiscountPct: number
  etaDays: number
  etaHours: number
  etaMinutes: number
}

export const LabCenterRateList = models.Lab_CenterRateList || model('Lab_CenterRateList', CenterRateListSchema)
