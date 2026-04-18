import { Schema, model, models } from 'mongoose'

const ChartOfAccountSchema = new Schema({
  code: { type: String, unique: true, index: true },           // "REC-001", "LAB-001"
  name: { type: String, required: true, unique: true },        // "ali/reception"
  type: { type: String, enum: ['Asset','Liability','Equity','Income','Expense'], required: true },
  subType: { type: String, enum: ['CASH','RECEIVABLE','PAYABLE','USER_ACCOUNT','REVENUE','BANK'] },
  portal: { type: String, enum: ['hospital','lab','pharmacy','diagnostic','reception','finance','aesthetic','dialysis'] },
  linkedUserId: { type: String },      // User ID in their module's collection
  linkedUsername: { type: String },    // Denormalized for quick lookup
  balance: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true })

export type ChartOfAccountDoc = {
  _id: string
  code?: string
  name: string
  type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense'
  subType?: 'CASH' | 'RECEIVABLE' | 'PAYABLE' | 'USER_ACCOUNT' | 'REVENUE' | 'BANK'
  portal?: 'hospital' | 'lab' | 'pharmacy' | 'diagnostic' | 'reception' | 'finance' | 'aesthetic' | 'dialysis'
  linkedUserId?: string
  linkedUsername?: string
  balance?: number
  active?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export const ChartOfAccount = models.Hospital_ChartOfAccount || model('Hospital_ChartOfAccount', ChartOfAccountSchema)
