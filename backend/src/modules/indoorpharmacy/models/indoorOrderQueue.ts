import { Schema, model, models } from 'mongoose'

const OrderQueueItemSchema = new Schema({
  medicineId: { type: Schema.Types.ObjectId, ref: 'IndoorPharmacy_InventoryItem' },
  medicineName: { type: String },
  requestedQty: { type: Number, required: true, default: 1 },
  dispensedQty: { type: Number, default: 0 },
  dose: { type: String },
  frequency: { type: String },
  duration: { type: String },
  route: { type: String }, // oral, iv, im, etc.
  instructions: { type: String },
  status: { type: String, enum: ['pending', 'dispensing', 'dispensed', 'partial', 'cancelled'], default: 'pending' },
}, { _id: true })

const OrderQueueSchema = new Schema({
  orderId: { type: String, unique: true, required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true },
  patientName: { type: String },
  mrn: { type: String },
  admissionNo: { type: String, index: true },
  bedNumber: { type: String },
  wardId: { type: Schema.Types.ObjectId, ref: 'Hospital_Ward' },

  // Order Items
  items: { type: [OrderQueueItemSchema], default: [] },

  // Status Tracking
  status: { type: String, enum: ['pending', 'processing', 'dispensed', 'delivered', 'cancelled'], default: 'pending', index: true },
  priority: { type: String, enum: ['normal', 'urgent', 'stat'], default: 'normal' },

  // Source
  sourceType: { type: String, enum: ['ipd', 'er', 'ot', 'opd'], default: 'ipd' },
  prescribedBy: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  ePrescriptionId: { type: Schema.Types.ObjectId, ref: 'Hospital_Prescription' },

  // Timestamps
  requestedAt: { type: Date, default: Date.now, index: true },
  dispensedAt: { type: Date },
  deliveredAt: { type: Date },

  // Assigned Staff
  assignedTo: { type: Schema.Types.ObjectId, ref: 'IndoorPharmacy_User' }, // Pharmacist
  deliveredBy: { type: Schema.Types.ObjectId, ref: 'Hospital_User' }, // Nurse who collected

  // Billing
  billingStatus: { type: String, enum: ['pending', 'added_to_bill', 'paid'], default: 'pending' },
  totalAmount: { type: Number, default: 0 },
}, { timestamps: true, collection: 'indoorpharmacy_orderqueue' })

OrderQueueSchema.index({ status: 1, priority: -1, requestedAt: 1 })
OrderQueueSchema.index({ encounterId: 1, status: 1 })

export type IndoorOrderQueueDoc = {
  _id: string
  orderId: string
  encounterId: string
  patientId: string
  patientName?: string
  mrn?: string
  admissionNo?: string
  bedNumber?: string
  wardId?: string
  items: {
    _id: string
    medicineId?: string
    medicineName?: string
    requestedQty: number
    dispensedQty?: number
    dose?: string
    frequency?: string
    duration?: string
    route?: string
    instructions?: string
    status: 'pending'|'dispensing'|'dispensed'|'partial'|'cancelled'
  }[]
  status: 'pending'|'processing'|'dispensed'|'delivered'|'cancelled'
  priority: 'normal'|'urgent'|'stat'
  sourceType?: 'ipd'|'er'|'ot'|'opd'
  prescribedBy?: string
  ePrescriptionId?: string
  requestedAt: Date
  dispensedAt?: Date
  deliveredAt?: Date
  assignedTo?: string
  deliveredBy?: string
  billingStatus?: 'pending'|'added_to_bill'|'paid'
  totalAmount?: number
  createdAt: Date
  updatedAt: Date
}

export const IndoorOrderQueue = models.IndoorPharmacy_OrderQueue || model('IndoorPharmacy_OrderQueue', OrderQueueSchema)
