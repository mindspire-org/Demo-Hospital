import { Schema, model, models } from 'mongoose'

type EncounterType = 'IPD' | 'EMERGENCY'

const InvoiceSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true }, // One invoice per encounter
  encounterType: { type: String, enum: ['IPD', 'EMERGENCY'], required: true },
  invoiceNo: { type: String, unique: true, sparse: true }, // Auto-generated invoice number
  // Denormalized patient data for list display
  patientName: { type: String },
  mrn: { type: String },
  cnic: { type: String },
  phone: { type: String },
  department: { type: String },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Department' },
  lineItems: [{
    _id: { type: Schema.Types.ObjectId },
    description: String,
    rate: Number,
    qty: Number,
    amount: Number,
    paidAmount: { type: Number, default: 0 },
  }],
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  netOutstanding: { type: Number, default: 0 }, // Positive = due, Negative = credit
  dateOfDischarge: { type: Date },
  dischargeTime: { type: String },
  status: { type: String, enum: ['draft', 'final', 'cancelled'], default: 'final' },
  printedAt: { type: Date },
}, { timestamps: true })

InvoiceSchema.index({ encounterId: 1 }, { unique: true })
InvoiceSchema.index({ encounterType: 1, createdAt: -1 })
InvoiceSchema.index({ patientId: 1, createdAt: -1 })

// Auto-generate invoice number before saving
InvoiceSchema.pre('save', async function(next) {
  if (this.invoiceNo) return next()
  const count = await (this.constructor as any).countDocuments({})
  const prefix = this.encounterType === 'EMERGENCY' ? 'ER' : 'IPD'
  this.invoiceNo = `${prefix}-${String(count + 1).padStart(6, '0')}`
  next()
})

export type HospitalInvoiceDoc = {
  _id: string
  patientId: string
  encounterId: string
  encounterType: EncounterType
  invoiceNo: string
  // Denormalized
  patientName?: string
  mrn?: string
  cnic?: string
  phone?: string
  department?: string
  departmentId?: string
  lineItems: Array<{
    _id: string
    description: string
    rate: number
    qty: number
    amount: number
    paidAmount: number
  }>
  discount: number
  totalAmount: number
  totalPaid: number
  netOutstanding: number
  dateOfDischarge?: Date
  dischargeTime?: string
  status: 'draft' | 'final' | 'cancelled'
  printedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export const HospitalInvoice = models.Hospital_Invoice || model('Hospital_Invoice', InvoiceSchema)
