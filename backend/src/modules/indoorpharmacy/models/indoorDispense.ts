import { Schema, model, models } from 'mongoose'

const LineSchema = new Schema({
  medicineId: { type: String, required: true },
  name: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  qty: { type: Number, required: true },
  costPerUnit: { type: Number, default: 0 },
  discountRs: { type: Number, default: 0 },
})

const DispenseSchema = new Schema({
  datetime: { type: String, required: true }, // ISO
  billNo: { type: String, required: true, index: true },
  customerId: { type: String },
  customer: { type: String, default: 'Walk-in' },
  customerPhone: { type: String },
  payment: { type: String, enum: ['Cash','Card','Credit'], default: 'Cash' },
  discountPct: { type: Number, default: 0 },
  lineDiscountTotal: { type: Number, default: 0 },
  subtotal: { type: Number, required: true },
  total: { type: Number, required: true },
  lines: { type: [LineSchema], default: [] },
  profit: { type: Number, default: 0 },
  createdBy: { type: String },
  fbrInvoiceNo: { type: String },
  fbrQrCode: { type: String },
  fbrStatus: { type: String },
  fbrMode: { type: String },
  fbrError: { type: String },

  // ── Hospital Encounter Integration ──
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter' },
  encounterType: { type: String, enum: ['IPD', 'ER', 'OT', 'OPD'] },
  admissionNo: { type: String, index: true },
  bedNumber: { type: String },
  wardId: { type: Schema.Types.ObjectId, ref: 'Hospital_Ward' },

  // ── Billing Integration ──
  billingStatus: { type: String, enum: ['pending', 'added_to_bill', 'paid', 'refunded'], default: 'pending' },
  billingItemId: { type: Schema.Types.ObjectId, ref: 'Hospital_IpdBillingItem' },
  isDirectBilling: { type: Boolean, default: true },

  // ── OT Integration ──
  otProcedureId: { type: Schema.Types.ObjectId, ref: 'Hospital_OT_Procedure' },
  surgeryId: { type: String },

  // ── Staff Assignment ──
  prescribedBy: { type: Schema.Types.ObjectId, ref: 'Hospital_User' },
  dispensedBy: { type: Schema.Types.ObjectId, ref: 'IndoorPharmacy_User' },
  administeredBy: { type: Schema.Types.ObjectId, ref: 'Hospital_User' },

  // ── Order Source ──
  orderSource: { type: String, enum: ['e_prescription', 'manual_order', 'ot_request', 'nurse_request'] },
  linkedOrderId: { type: Schema.Types.ObjectId }, // IpdPharmacyOrder / e-Prescription

  // ── Medication Administration Log (IPD) ──
  administrationLog: [{
    administeredAt: Date,
    administeredBy: { type: Schema.Types.ObjectId, ref: 'Hospital_User' },
    doseGiven: String,
    notes: String,
    patientResponse: String,
  }],

  // ── Pricing & Insurance ──
  unitCost: Number,
  sellingPrice: Number,
  insuranceCovered: { type: Boolean, default: false },
  corporateId: { type: Schema.Types.ObjectId, ref: 'Corporate_Company' },
}, { timestamps: true, collection: 'indoorpharmacy_dispenses' })

export type DispenseDoc = {
  _id: string
  datetime: string
  billNo: string
  customerId?: string
  customer?: string
  customerPhone?: string
  payment: 'Cash'|'Card'|'Credit'
  discountPct?: number
  lineDiscountTotal?: number
  subtotal: number
  total: number
  profit?: number
  createdBy?: string
  lines: { medicineId: string; name: string; unitPrice: number; qty: number; costPerUnit?: number; discountRs?: number }[]
  fbrInvoiceNo?: string
  fbrQrCode?: string
  fbrStatus?: string
  fbrMode?: string
  fbrError?: string
  // Integration fields
  encounterId?: string
  encounterType?: 'IPD'|'ER'|'OT'|'OPD'
  admissionNo?: string
  bedNumber?: string
  wardId?: string
  billingStatus?: 'pending'|'added_to_bill'|'paid'|'refunded'
  billingItemId?: string
  isDirectBilling?: boolean
  otProcedureId?: string
  surgeryId?: string
  prescribedBy?: string
  dispensedBy?: string
  administeredBy?: string
  orderSource?: 'e_prescription'|'manual_order'|'ot_request'|'nurse_request'
  linkedOrderId?: string
  unitCost?: number
  sellingPrice?: number
  insuranceCovered?: boolean
  corporateId?: string
}

export const Dispense = models.IndoorPharmacy_Dispense || model('IndoorPharmacy_Dispense', DispenseSchema)


