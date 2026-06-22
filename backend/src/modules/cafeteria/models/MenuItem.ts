import { Schema, model, models } from 'mongoose'

const MenuItemSchema = new Schema({
  name: { type: String, required: true, unique: true },
  category: { type: String, default: 'General' },
  price: { type: Number, required: true, default: 0 },
  costPrice: { type: Number, default: 0 },
  stockQty: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  active: { type: Boolean, default: true },
  image: { type: String },
}, { timestamps: true })

export type MenuItemDoc = {
  _id: string
  name: string
  category?: string
  price: number
  costPrice?: number
  stockQty?: number
  lowStockThreshold?: number
  active?: boolean
  image?: string
}

export const MenuItem = models.Cafeteria_MenuItem || model('Cafeteria_MenuItem', MenuItemSchema)
