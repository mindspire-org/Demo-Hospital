import { Schema, model, models, Types } from 'mongoose'

const BudgetSchema = new Schema({
  name: { type: String, required: true },
  fiscalPeriodId: { type: Schema.Types.ObjectId, ref: 'FiscalPeriod', index: true },
  costCenter: { type: String, index: true },                  // "opd"|"lab"|"pharmacy"|etc
  expenseCategory: { type: String, index: true },             // "Salaries", "Electricity"
  budgetAmount: { type: Number, required: true },
  year: { type: Number, required: true, index: true },
  month: { type: Number, index: true },                       // optional, for monthly budgets (1-12)
}, { timestamps: true })

BudgetSchema.index({ costCenter: 1, expenseCategory: 1, year: 1, month: 1 })

export type BudgetDoc = {
  _id: string
  name: string
  fiscalPeriodId?: Types.ObjectId
  costCenter?: string
  expenseCategory?: string
  budgetAmount: number
  year: number
  month?: number
}

export const Budget = models.Budget || model('Budget', BudgetSchema)
