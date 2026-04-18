import { Schema, model, models } from 'mongoose'

const CashHandoverSchema = new Schema({
  fromAccountId: { type: Schema.Types.ObjectId, ref: 'Hospital_ChartOfAccount', required: true },
  toAccountId: { type: Schema.Types.ObjectId, ref: 'Hospital_ChartOfAccount', required: true },
  amount: { type: Number, required: true },
  shiftId: { type: String },
  shiftName: { type: String },
  handoverBy: { type: String, required: true },      // Username handing over
  receivedBy: { type: String },                       // Finance manager username
  status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  notes: { type: String },
  approvedAt: { type: Date },
  approvedBy: { type: String },
  journalId: { type: Schema.Types.ObjectId, ref: 'Hospital_Finance_Journal' },
}, { timestamps: true })

export type CashHandoverDoc = {
  _id: string
  fromAccountId: string
  toAccountId: string
  amount: number
  shiftId?: string
  shiftName?: string
  handoverBy: string
  receivedBy?: string
  status: 'pending' | 'approved' | 'rejected'
  notes?: string
  approvedAt?: Date
  approvedBy?: string
  journalId?: string
  createdAt?: Date
  updatedAt?: Date
}

export const CashHandover = models.Hospital_CashHandover || model('Hospital_CashHandover', CashHandoverSchema)
