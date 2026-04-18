import { Schema, model, models } from 'mongoose'

const CashCountSchema = new Schema({
  date: { type: String, required: true },
  amount: { type: Number, required: true },
  receiver: { type: String, default: '' },
  handoverBy: { type: String, default: '' },
  note: { type: String, default: '' },
}, { timestamps: true, collection: 'indoorpharmacy_cashcounts' })

export type CashCountDoc = {
  _id: string
  date: string
  amount: number
  receiver?: string
  handoverBy?: string
  note?: string
}

export const CashCount = models.IndoorPharmacy_CashCount || model('IndoorPharmacy_CashCount', CashCountSchema)
