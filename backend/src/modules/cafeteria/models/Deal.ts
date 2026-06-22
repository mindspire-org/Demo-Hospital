import { Schema, model, models } from 'mongoose'

const DealItemSchema = new Schema({
  menuItemId: { type: Schema.Types.ObjectId, ref: 'Cafeteria_MenuItem' },
  name: { type: String, required: true },
  qty: { type: Number, default: 1 },
  originalPrice: { type: Number, default: 0 },
}, { _id: false })

const DealSchema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'Combo' },
  items: { type: [DealItemSchema], default: [] },
  dealPrice: { type: Number, required: true },
  originalTotal: { type: Number, default: 0 },
  savings: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  validFrom: { type: String, default: '' },
  validTo: { type: String, default: '' },
  image: { type: String, default: '' },
}, { timestamps: true })

export type DealItem = {
  menuItemId?: string
  name: string
  qty: number
  originalPrice: number
}

export type DealDoc = {
  _id: string
  name: string
  description?: string
  category?: string
  items: DealItem[]
  dealPrice: number
  originalTotal: number
  savings: number
  active: boolean
  validFrom?: string
  validTo?: string
  image?: string
}

export const Deal = models.Cafeteria_Deal || model('Cafeteria_Deal', DealSchema)
