import { Schema, model, models } from 'mongoose'

const OutsourceRateListSchema = new Schema({
  outsourceLabId: { type: Schema.Types.ObjectId, ref: 'Lab_OutsourceLab', required: true, index: true },
  testId: { type: String, required: true, index: true },
  testName: { type: String, required: true },
  category: { type: String },
  status: { type: Boolean, default: false }, // agreed/not-agreed toggle
  labRate: { type: Number, default: 0 },
  outsourceShareRs: { type: Number, default: 0 },
  outsourceSharePct: { type: Number, default: 0 },
}, { timestamps: true })

OutsourceRateListSchema.index({ outsourceLabId: 1, testId: 1 }, { unique: true })

export type LabOutsourceRateListDoc = {
  _id: string
  outsourceLabId: string
  testId: string
  testName: string
  category?: string
  status: boolean
  labRate: number
  outsourceShareRs: number
  outsourceSharePct: number
}

export const LabOutsourceRateList = models.Lab_OutsourceRateList || model('Lab_OutsourceRateList', OutsourceRateListSchema)


const OutsourceDispatchSchema = new Schema({
  outsourceLabId: { type: Schema.Types.ObjectId, ref: 'Lab_OutsourceLab', required: true, index: true },
  outsourceLabName: { type: String },
  orderId: { type: String, required: true, index: true },
  tokenNo: { type: String, index: true },
  patientName: { type: String },
  testId: { type: String, required: true },
  testName: { type: String, required: true },
  status: { type: String, enum: ['dispatched', 'in_progress', 'received', 'cancelled'], default: 'dispatched', index: true },
  dispatchedAt: { type: String, required: true },
  dispatchedBy: { type: String },
  receivedAt: { type: String },
  receivedBy: { type: String },
  externalReportUrl: { type: String },
  externalResultText: { type: String },
  notes: { type: String },
}, { timestamps: true })

export type LabOutsourceDispatchDoc = {
  _id: string
  outsourceLabId: string
  outsourceLabName?: string
  orderId: string
  tokenNo?: string
  patientName?: string
  testId: string
  testName: string
  status: 'dispatched' | 'in_progress' | 'received' | 'cancelled'
  dispatchedAt: string
  dispatchedBy?: string
  receivedAt?: string
  receivedBy?: string
  externalReportUrl?: string
  externalResultText?: string
  notes?: string
}

export const LabOutsourceDispatch = models.Lab_OutsourceDispatch || model('Lab_OutsourceDispatch', OutsourceDispatchSchema)
