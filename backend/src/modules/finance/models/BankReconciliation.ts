import { Schema, model, models, Types } from 'mongoose'

const ReconciliationItemSchema = new Schema({
  date: { type: String, required: true },
  description: { type: String },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['deposit', 'withdrawal'], required: true },
  voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher' },
  matched: { type: Boolean, default: false },
}, { _id: false })

const BankReconciliationSchema = new Schema({
  bankAccountCode: { type: String, required: true, index: true },  // "2000-102"
  bankAccountName: { type: String },
  statementDate: { type: String, required: true, index: true },
  statementBalance: { type: Number, required: true },
  systemBalance: { type: Number },
  difference: { type: Number },
  status: { type: String, enum: ['draft', 'reconciled'], default: 'draft', index: true },
  items: { type: [ReconciliationItemSchema], default: [] },
  reconciledBy: { type: String },
  reconciledAt: { type: String },
}, { timestamps: true })

export type ReconciliationItem = {
  date: string
  description?: string
  amount: number
  type: 'deposit' | 'withdrawal'
  voucherId?: Types.ObjectId
  matched: boolean
}

export type BankReconciliationDoc = {
  _id: string
  bankAccountCode: string
  bankAccountName?: string
  statementDate: string
  statementBalance: number
  systemBalance?: number
  difference?: number
  status: 'draft' | 'reconciled'
  items: ReconciliationItem[]
  reconciledBy?: string
  reconciledAt?: string
}

export const BankReconciliation = models.BankReconciliation || model('BankReconciliation', BankReconciliationSchema)
