import { Schema, model, models } from 'mongoose'

const ACCOUNT_TYPES = ['ASSETS','LIABILITIES','EQUITY','INCOME','EXPENSE'] as const
export type AccountType = typeof ACCOUNT_TYPES[number]

const ACCOUNT_MODULES = ['opd','er','ipd','lab','pharmacy','diagnostic','dialysis','aesthetic','cafeteria','general'] as const
export type AccountModule = typeof ACCOUNT_MODULES[number]

const ChartOfAccountSchema = new Schema({
  code: { type: String, unique: true, index: true },           // "2000-101", "4000-103"
  name: { type: String, required: true, unique: true },        // "CASH IN HAND", "LABORATORY RECEIPTS"
  type: { type: String, required: true, enum: ACCOUNT_TYPES, index: true },
  subType: { type: String, index: true },                      // "CASH & BANK", "INCOME", "CREDITORS", etc.
  module: { type: String, enum: ACCOUNT_MODULES, index: true }, // Which module this account belongs to (null = shared)
  parentId: { type: Schema.Types.ObjectId, ref: 'Hospital_ChartOfAccount' }, // Parent group account
  isGroup: { type: Boolean, default: false },                  // True for group/header accounts
  portal: { type: String },
  linkedUserId: { type: String },      // User ID in their module's collection
  linkedUsername: { type: String },    // Denormalized for quick lookup
  balance: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  currency: { type: String, default: 'PKR' },
  tax: { type: Number, default: 0 },
  systemNames: { type: [String], default: [] },  // Maps internal FinanceJournal names e.g. ['CASH','OPD_REVENUE']
}, { timestamps: true })

export type ChartOfAccountDoc = {
  _id: string
  code?: string
  name: string
  type: AccountType
  subType?: string
  module?: AccountModule
  parentId?: string
  isGroup?: boolean
  portal?: string
  linkedUserId?: string
  linkedUsername?: string
  balance?: number
  active?: boolean
  currency?: string
  tax?: number
  systemNames?: string[]
  createdAt?: Date
  updatedAt?: Date
}

export const ChartOfAccount = models.Hospital_ChartOfAccount || model('Hospital_ChartOfAccount', ChartOfAccountSchema)
