import mongoose from 'mongoose'

const StoreItemSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, index: true }, // normalized lower-case name
    name: { type: String, required: true, trim: true },
    category: { type: String, ref: 'StoreCategory' },
    unit: { type: String, default: 'pcs' }, // pcs, pack, box, bottle, tube, set
    currentStock: { type: Number, default: 0 },
    minStock: { type: Number, default: 0 },
    avgCost: { type: Number, default: 0 },
    lastPurchase: { type: Date },
    lastSupplier: { type: String },
    lastSupplierId: { type: String },
    earliestExpiry: { type: Date },
    location: { type: String }, // store location label/id
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

StoreItemSchema.index({ name: 1 })
StoreItemSchema.index({ category: 1 })
StoreItemSchema.index({ currentStock: 1 })

export const StoreItemModel = mongoose.models.StoreItem || mongoose.model('StoreItem', StoreItemSchema)
export type DocStoreItem = mongoose.Document & {
  key?: string
  name: string
  category?: string
  unit: string
  currentStock: number
  minStock: number
  avgCost: number
  lastPurchase?: Date
  lastSupplier?: string
  lastSupplierId?: string
  earliestExpiry?: Date
  location?: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}
