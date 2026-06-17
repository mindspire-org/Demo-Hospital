import { Schema, model, models } from 'mongoose'

const PatientSnapshotSchema = new Schema({
  mrn: { type: String },
  fullName: { type: String, required: true },
  phone: { type: String },
  age: { type: String },
  gender: { type: String },
  address: { type: String },
  guardianRelation: { type: String },
  guardianName: { type: String },
  cnic: { type: String },
}, { _id: false })

const DiagnosticTestSnapshotSchema = new Schema({
  testId: { type: String, required: true },
  testName: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
}, { _id: false })

const PaymentSchema = new Schema({
  amount: { type: Number, required: true },
  at: { type: String, required: true },
  note: { type: String },
  method: { type: String },
  receivedBy: { type: String },
}, { _id: false })

const TokenSchema = new Schema({
  tokenNo: { type: String, required: true, unique: true },
  patientId: { type: String, required: true },
  patient: { type: PatientSnapshotSchema, required: true },
  tests: { type: [DiagnosticTestSnapshotSchema], default: [] },
  
  status: { 
    type: String, 
    enum: ['token_generated', 'converted_to_sample', 'cancelled'],
    default: 'token_generated',
    index: true 
  },
  
  generatedAt: { type: String, required: true },
  generatedBy: { type: String, required: true },
  
  convertedAt: { type: String },
  convertedBy: { type: String },
  orderId: { type: String }, // Link to Diagnostic_Order when converted

  cancelledAt: { type: String },
  cancelledBy: { type: String },
  
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  net: { type: Number, default: 0 },
  receivedAmount: { type: Number, default: 0 },
  receivableAmount: { type: Number, default: 0 },
  paymentMethod: { type: String },
  payments: { type: [PaymentSchema], default: [] },
  
  referringConsultant: { type: String },
  referralId: { type: String, index: true },
  corporateId: { type: Schema.Types.ObjectId, ref: 'Corporate_Company' },
  portal: { type: String, enum: ['diagnostic', 'reception'], index: true },
  
  fbrInvoiceNo: { type: String },
  fbrQrCode: { type: String },
  fbrStatus: { type: String },
  fbrMode: { type: String },
  fbrError: { type: String },
}, { timestamps: true })

export type DiagnosticTokenDoc = {
  _id: string
  tokenNo: string
  patientId: string
  patient: {
    mrn?: string
    fullName: string
    phone?: string
    age?: string
    gender?: string
    address?: string
    guardianRelation?: string
    guardianName?: string
    cnic?: string
  }
  tests: Array<{ testId: string; testName: string; price: number }>
  status: 'token_generated' | 'converted_to_sample' | 'cancelled'
  generatedAt: string
  generatedBy: string
  convertedAt?: string
  convertedBy?: string
  orderId?: string
  cancelledAt?: string
  cancelledBy?: string
  subtotal?: number
  discount?: number
  net?: number
  receivedAmount?: number
  receivableAmount?: number
  paymentMethod?: string
  payments?: Array<{ amount: number; at: string; note?: string; method?: string; receivedBy?: string }>
  referringConsultant?: string
  referralId?: string
  corporateId?: string
  portal?: 'diagnostic' | 'reception'
  createdAt: string
  updatedAt: string
  fbrInvoiceNo?: string
  fbrQrCode?: string
  fbrStatus?: string
  fbrMode?: string
  fbrError?: string
}

export const DiagnosticToken = models.Diagnostic_Token || model('Diagnostic_Token', TokenSchema)
