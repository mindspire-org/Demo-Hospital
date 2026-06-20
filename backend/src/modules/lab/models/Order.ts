import { Schema, model, models } from 'mongoose'

const ConsumableSchema = new Schema({
  item: { type: String, required: true },
  qty: { type: Number, required: true },
}, { _id: false })

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

const LabTestSnapshotSchema = new Schema({
  testId: { type: String, required: true },
  testName: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
}, { _id: false })

const OrderSchema = new Schema({
  tokenId: { type: Schema.Types.ObjectId, ref: 'Lab_Token', required: true, index: true },
  tokenNo: { type: String, required: true, index: true },
  labNumber: { type: Number, index: true },
  patientId: { type: String, required: true },
  patient: { type: PatientSnapshotSchema, required: true },
  
  status: {
    type: String,
    enum: ['received', 'in_progress', 'result_entered', 'completed', 'cancelled'],
    default: 'received',
    index: true
  },
  
  barcode: { type: String },
  sampleCollectedAt: { type: Date }, // Optional global timestamp
  
  referringConsultant: { type: String },
  referringDoctorId: { type: String },
  referringDoctorName: { type: String },
  corporateId: { type: Schema.Types.ObjectId, ref: 'Corporate_Company' },
  
  // FBR fields
  fbrInvoiceNo: { type: String },
  fbrQrCode: { type: String },
  fbrStatus: { type: String },
  fbrMode: { type: String },
  fbrError: { type: String },
  
  portal: { type: String, enum: ['lab', 'reception'], index: true },
  notes: { type: String },
  
  // Snapshots of tests for this order
  tests: { type: [LabTestSnapshotSchema], default: [] },
  
  // Per-test status tracking (synced from LabOrderTest)
  testStatuses: {
    type: [new Schema({
      testId: String,
      testName: String,
      status: String,
      resultId: String
    }, { _id: false })],
    default: []
  },

  // Financial fields
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  net: { type: Number, default: 0 },
  receivedAmount: { type: Number, default: 0 },
  receivableAmount: { type: Number, default: 0 },
  payments: {
    type: [new Schema({
      amount: Number,
      at: String,
      note: String,
      method: String,
      receivedBy: String
    }, { _id: false })],
    default: []
  },
  // Tracking who created the order
  createdByUsername: { type: String },
}, { timestamps: true })

export type LabOrderDoc = {
  _id: string
  tokenId: string
  tokenNo: string
  labNumber?: number
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
  status: 'received' | 'in_progress' | 'result_entered' | 'completed' | 'cancelled'
  barcode?: string
  sampleCollectedAt?: string
  referringConsultant?: string
  corporateId?: string
  fbrInvoiceNo?: string
  fbrQrCode?: string
  fbrStatus?: string
  fbrMode?: string
  fbrError?: string
  portal?: 'lab' | 'reception'
  notes?: string
  createdAt: string
  tests: Array<{ testId: string; testName: string; price: number }>
  testStatuses?: Array<{
    testId: string
    testName: string
    status: string
    resultId?: string
  }>
  subtotal?: number
  discount?: number
  net?: number
  receivedAmount?: number
  receivableAmount?: number
  payments?: Array<{
    amount: number
    at: string
    note?: string
    method?: string
    receivedBy?: string
  }>
  createdByUsername?: string
}

export const LabOrder = models.Lab_Order || model('Lab_Order', OrderSchema)
