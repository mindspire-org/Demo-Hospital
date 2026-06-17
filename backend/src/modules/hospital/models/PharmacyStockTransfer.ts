import { Schema, model, models } from 'mongoose'

const TransferItemSchema = new Schema({
  medicineId: { type: Schema.Types.ObjectId, ref: 'IndoorPharmacy_InventoryItem' },
  name: { type: String, required: true },
  batchNumber: { type: String },
  qty: { type: Number, required: true },
  unitCost: { type: Number, default: 0 },
}, { _id: true })

const PharmacyStockTransferSchema = new Schema({
  transferId: { type: String, unique: true, required: true, index: true },
  fromLocation: { type: String, enum: ['outdoor', 'indoor', 'ot'], required: true },
  toLocation: { type: String, enum: ['outdoor', 'indoor', 'ot'], required: true },

  items: { type: [TransferItemSchema], default: [] },

  reason: { type: String }, // stock_adjustment, emergency_transfer, ot_requirement
  status: { type: String, enum: ['pending', 'approved', 'completed', 'rejected'], default: 'pending', index: true },

  requestedBy: { type: Schema.Types.ObjectId, ref: 'Hospital_User' },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'Hospital_User' },
  transferredAt: { type: Date },

  notes: { type: String },
}, { timestamps: true, collection: 'hospital_pharmacy_stock_transfers' })

export type PharmacyStockTransferDoc = {
  _id: string
  transferId: string
  fromLocation: 'outdoor'|'indoor'|'ot'
  toLocation: 'outdoor'|'indoor'|'ot'
  items: {
    _id: string
    medicineId?: string
    name: string
    batchNumber?: string
    qty: number
    unitCost?: number
  }[]
  reason?: string
  status: 'pending'|'approved'|'completed'|'rejected'
  requestedBy?: string
  approvedBy?: string
  transferredAt?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export const HospitalPharmacyStockTransfer = models.Hospital_PharmacyStockTransfer || model('Hospital_PharmacyStockTransfer', PharmacyStockTransferSchema)
