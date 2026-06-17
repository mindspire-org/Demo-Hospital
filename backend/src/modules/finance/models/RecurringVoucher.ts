import { Schema, model, models } from 'mongoose'

const RecurringLineSchema = new Schema({
  accountCode: { type: String, required: true },
  accountName: { type: String, required: true },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
}, { _id: false })

const RecurringVoucherSchema = new Schema({
  name: { type: String, required: true },                     // "Monthly Rent", "Salary Payment"
  voucherType: { type: String, required: true, enum: ['BPV', 'BRV', 'CPV', 'CRV', 'JV', 'CONTRA'] },
  frequency: { type: String, required: true, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
  dayOfMonth: { type: Number },                               // 1-31 for monthly
  lines: { type: [RecurringLineSchema], default: [] },
  payee: { type: String, default: '' },
  narration: { type: String, default: '' },
  module: { type: String },
  expenseCategory: { type: String },
  expenseDepartment: { type: String },
  costCenter: { type: String },
  active: { type: Boolean, default: true, index: true },
  lastGeneratedDate: { type: String },
  nextDueDate: { type: String, index: true },
}, { timestamps: true })

export type RecurringLine = {
  accountCode: string
  accountName: string
  debit?: number
  credit?: number
}

export type RecurringVoucherDoc = {
  _id: string
  name: string
  voucherType: 'BPV' | 'BRV' | 'CPV' | 'CRV' | 'JV' | 'CONTRA'
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  dayOfMonth?: number
  lines: RecurringLine[]
  payee?: string
  narration?: string
  module?: string
  expenseCategory?: string
  expenseDepartment?: string
  costCenter?: string
  active: boolean
  lastGeneratedDate?: string
  nextDueDate?: string
}

export const RecurringVoucher = models.RecurringVoucher || model('RecurringVoucher', RecurringVoucherSchema)
