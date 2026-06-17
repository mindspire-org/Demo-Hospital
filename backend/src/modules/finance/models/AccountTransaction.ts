import mongoose, { Schema, model, models } from 'mongoose'

export interface IAccountTransaction {
  accountId: mongoose.Types.ObjectId
  accountName: string
  transactionType: 'Credit' | 'Debit'
  amount: number
  description?: string
  dateIso: string
  createdAt: Date
  status: 'active' | 'reversed'
}

const AccountTransactionSchema = new Schema<IAccountTransaction>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'ChartOfAccount', required: true },
    accountName: { type: String, required: true },
    transactionType: { type: String, enum: ['Credit', 'Debit'], required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    dateIso: { type: String, required: true },
    status: { type: String, enum: ['active', 'reversed'], default: 'active' },
  },
  { timestamps: true }
)

const AccountTransaction = models.AccountTransaction || model<IAccountTransaction>('AccountTransaction', AccountTransactionSchema)

export default AccountTransaction
