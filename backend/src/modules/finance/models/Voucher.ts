import { Schema, model, models, Types } from 'mongoose'

const VoucherLineSchema = new Schema({
  accountCode: { type: String, required: true },   // e.g., "2000-101" — references ChartOfAccount.code
  accountName: { type: String, required: true },   // denormalized for display
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
}, { _id: false })

const VoucherSchema = new Schema({
  voucherNo: { type: String, required: true, unique: true, index: true },  // "BPV-001", "CRV-015"
  voucherType: { type: String, required: true, enum: ['BPV', 'BRV', 'CPV', 'CRV', 'JV', 'CONTRA'], index: true },
  dateIso: { type: String, required: true, index: true },
  payee: { type: String, default: '' },
  chequeNo: { type: String },
  chequeDate: { type: String },
  narration: { type: String, default: '' },
  module: { type: String, index: true },  // 'opd'|'er'|'ipd'|'lab'|'pharmacy'|'diagnostic'|'dialysis'|'aesthetic'|'general'
  lines: { type: [VoucherLineSchema], default: [] },
  // Expense-specific metadata
  isExpense: { type: Boolean, default: false, index: true },
  expenseAccountCode: { type: String },           // COA account code e.g. "4000-101" — the expense account from Chart of Accounts
  expenseAccountName: { type: String },           // denormalized COA account name for display
  costCenter: { type: String, enum: ['opd', 'ipd', 'er', 'lab', 'pharmacy', 'diagnostic', 'dialysis', 'aesthetic', 'ambulance', 'general'], index: true },

  // Tax
  taxAmount: { type: Number, default: 0 },
  taxType: { type: String, enum: ['none', 'sales_tax', 'withholding'], default: 'none' },

  // Approval workflow
  status: { type: String, enum: ['draft', 'pending_approval', 'approved', 'posted', 'cancelled'], default: 'draft', index: true },
  approvedBy: { type: String },
  approvedAt: { type: String },

  // Recurring voucher link
  recurringId: { type: String },                 // links to RecurringVoucher template

  // Print tracking
  printedAt: { type: String },

  journalId: { type: Schema.Types.ObjectId, ref: 'Hospital_Finance_Journal' },  // linked when posted
  postedAt: { type: String },
  postedBy: { type: String },
  createdBy: { type: String },
}, { timestamps: true })

export type VoucherLine = {
  accountCode: string
  accountName: string
  debit?: number
  credit?: number
}

export type VoucherDoc = {
  _id: string
  voucherNo: string
  voucherType: 'BPV' | 'BRV' | 'CPV' | 'CRV' | 'JV' | 'CONTRA'
  dateIso: string
  payee?: string
  chequeNo?: string
  chequeDate?: string
  narration?: string
  module?: string
  lines: VoucherLine[]
  isExpense?: boolean
  expenseAccountCode?: string
  expenseAccountName?: string
  costCenter?: 'opd' | 'ipd' | 'er' | 'lab' | 'pharmacy' | 'diagnostic' | 'dialysis' | 'aesthetic' | 'ambulance' | 'general'
  taxAmount?: number
  taxType?: 'none' | 'sales_tax' | 'withholding'
  status: 'draft' | 'pending_approval' | 'approved' | 'posted' | 'cancelled'
  approvedBy?: string
  approvedAt?: string
  recurringId?: string
  printedAt?: string
  journalId?: Types.ObjectId
  postedAt?: string
  postedBy?: string
  createdBy?: string
}

export const Voucher = models.Voucher || model('Voucher', VoucherSchema)
