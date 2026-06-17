import { Schema, model, models } from 'mongoose'

const OtPharmacyRequestItemSchema = new Schema({
  medicineId: { type: Schema.Types.ObjectId, ref: 'IndoorPharmacy_InventoryItem' },
  name: { type: String, required: true },
  qty: { type: Number, required: true, default: 1 },
  unit: { type: String }, // ampoule, vial, tablet
  route: { type: String },
  purpose: { type: String }, // anesthesia, antibiotic, pain management
  requestedAt: { type: Date, default: Date.now },
  dispensedQty: { type: Number, default: 0 },
  consumedQty: { type: Number, default: 0 },
  returnedQty: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
}, { _id: true })

const OtPharmacyRequestSchema = new Schema({
  requestId: { type: String, unique: true, required: true, index: true },
  otScheduleId: { type: Schema.Types.ObjectId, ref: 'Hospital_OTBooking' },
  surgeryId: { type: Schema.Types.ObjectId, ref: 'Hospital_SurgeryRecord' },
  procedureId: { type: Schema.Types.ObjectId, ref: 'Hospital_Procedure' },

  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter' }, // IPD encounter if admitted
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient' },
  patientName: { type: String },

  // Request Details
  items: { type: [OtPharmacyRequestItemSchema], default: [] },

  // Source Selection
  sourceType: { type: String, enum: ['ot_stock', 'indoor_pharmacy', 'outdoor_pharmacy'], required: true, default: 'indoor_pharmacy' },

  // Status
  status: { type: String, enum: ['requested', 'approved', 'dispensed', 'consumed', 'returned'], default: 'requested', index: true },

  // Billing
  billingMode: { type: String, enum: ['surgery_package', 'separate_charge', 'patient_bill'], default: 'patient_bill' },

  // Timestamps
  requestedBy: { type: Schema.Types.ObjectId, ref: 'Hospital_User' },
  requestedAt: { type: Date, default: Date.now },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'Hospital_User' },
  approvedAt: { type: Date },
  dispensedAt: { type: Date },
  completedAt: { type: Date },

  anesthetistId: { type: Schema.Types.ObjectId, ref: 'Hospital_User' },
  surgeonId: { type: Schema.Types.ObjectId, ref: 'Hospital_User' },

  notes: { type: String },
}, { timestamps: true, collection: 'hospital_ot_pharmacy_requests' })

OtPharmacyRequestSchema.index({ otScheduleId: 1, status: 1 })
OtPharmacyRequestSchema.index({ encounterId: 1, status: 1 })

export type OtPharmacyRequestDoc = {
  _id: string
  requestId: string
  otScheduleId?: string
  surgeryId?: string
  procedureId?: string
  encounterId?: string
  patientId?: string
  patientName?: string
  items: {
    _id: string
    medicineId?: string
    name: string
    qty: number
    unit?: string
    route?: string
    purpose?: string
    requestedAt: Date
    dispensedQty?: number
    consumedQty?: number
    returnedQty?: number
    unitPrice?: number
  }[]
  sourceType: 'ot_stock'|'indoor_pharmacy'|'outdoor_pharmacy'
  status: 'requested'|'approved'|'dispensed'|'consumed'|'returned'
  billingMode?: 'surgery_package'|'separate_charge'|'patient_bill'
  requestedBy?: string
  requestedAt: Date
  approvedBy?: string
  approvedAt?: Date
  dispensedAt?: Date
  completedAt?: Date
  anesthetistId?: string
  surgeonId?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export const HospitalOtPharmacyRequest = models.Hospital_OtPharmacyRequest || model('Hospital_OtPharmacyRequest', OtPharmacyRequestSchema)
