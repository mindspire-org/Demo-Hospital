import mongoose, { Schema, Document } from 'mongoose'

export interface IExpense extends Document {
  date: Date
  category: string
  amount: number
  description: string
  receiptUrl?: string
  createdBy: string
  createdByUsername: string
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  approvedByUsername?: string
  approvedAt?: Date
  rejectionReason?: string
  createdAt: Date
  updatedAt: Date
}

const ExpenseSchema = new Schema<IExpense>({
  date: { type: Date, required: true, default: Date.now },
  category: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, required: true },
  receiptUrl: { type: String },
  createdBy: { type: String, required: true },
  createdByUsername: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: String },
  approvedByUsername: { type: String },
  approvedAt: { type: Date },
  rejectionReason: { type: String },
}, { timestamps: true })

// Index for performance
ExpenseSchema.index({ createdBy: 1, createdAt: -1 })
ExpenseSchema.index({ status: 1, createdAt: -1 })

export default mongoose.model<IExpense>('ReceptionExpense', ExpenseSchema)
