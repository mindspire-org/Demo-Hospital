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

const LabTestSnapshotSchema = new Schema({
  testId: { type: String, required: true },
  testName: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
}, { _id: false })

const TokenSchema = new Schema({
  // Lab number (continuously growing serial number, separate from token number)
  labNumber: { type: Number, unique: true },
  tokenNo: { type: String, required: true, unique: true },
  patientId: { type: String, required: true },
  patient: { type: PatientSnapshotSchema, required: true },
  tests: { type: [LabTestSnapshotSchema], default: [] }, // For display only, source of truth is LabOrderTest
  
  // Status tracking
  status: { 
    type: String, 
    enum: ['token_generated', 'converted_to_sample', 'sample_received', 'result_entered', 'approved', 'cancelled'],
    default: 'token_generated',
    index: true 
  },
  
  // Token generation tracking
  generatedAt: { type: String, required: true },
  generatedBy: { type: String, required: true },
  
  // Sample conversion tracking
  convertedAt: { type: String },
  convertedBy: { type: String },
  orderId: { type: String }, // Link to Lab_Order when converted
  
  // Sample received tracking
  sampleReceivedAt: { type: String },
  sampleReceivedBy: { type: String },
  
  // Result entry tracking
  resultEnteredAt: { type: String },
  resultEnteredBy: { type: String },
  resultId: { type: String }, // Link to Lab_Result
  
  // Approval tracking
  approvedAt: { type: String },
  approvedBy: { type: String },

  // Report print tracking
  reportPrintedAt: { type: String },
  reportPrintedBy: { type: String },

  // Cancellation tracking
  cancelledAt: { type: String },
  cancelledBy: { type: String },
  
  // Barcode (auto-assigned on conversion)
  barcode: { type: String },
  
  // Financial fields (stored at token creation and updated on conversion)
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  net: { type: Number, default: 0 },
  receivedAmount: { type: Number, default: 0 },
  receivableAmount: { type: Number, default: 0 },
  paymentMethod: { type: String },
  
  // Additional info
  referringConsultant: { type: String },
  referralId: { type: String, index: true }, // Link to Hospital_Referral when created from referral
  corporateId: { type: Schema.Types.ObjectId, ref: 'Corporate_Company' },
  portal: { type: String, enum: ['lab', 'reception'], index: true },
  
  // Collection Center fields
  collectionCenterId: { type: Schema.Types.ObjectId, ref: 'Lab_CollectionCenter', index: true },
  collectionCenterName: { type: String },
  centerCommissionPercent: { type: Number, default: 0 },
  centerCommissionAmount: { type: Number, default: 0 },
  centerNetAmount: { type: Number, default: 0 },
  
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

  // Registration enhancements
  sampleType: { type: String, enum: ['normal', 'urgent', 'stat'], default: 'normal', index: true },
  sampleReceived: { type: Boolean, default: false },
  sampleReceivedAtRegistration: { type: Boolean, default: false },
  hospitalRegistrationNumber: { type: String, index: true },
  packageIds: { type: [String], default: [] },
  patientCardId: { type: Schema.Types.ObjectId, ref: 'Lab_PatientCard' },
  patientCardKind: { type: String },

  // Department / ward / emergency day routing
  departmentId: { type: String, index: true },
  wardId: { type: String, index: true },
  emergencyDayId: { type: String, index: true },

  // Source: lab | reception | center | ward_import
  source: { type: String, enum: ['lab', 'reception', 'center', 'ward_import'], default: 'lab', index: true },

  // Contact for report dispatch
  email: { type: String },
  whatsapp: { type: String },

  // Print action selected at registration
  printAction: { type: String, enum: ['save', 'save_invoice', 'save_invoice_barcode', 'save_barcode'], default: 'save' },
}, { timestamps: true })

export type LabTokenDoc = {
  _id: string
  labNumber?: number
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
  tests: Array<{ testId: string; testName: string; price: number }> // For display only
  status: 'token_generated' | 'converted_to_sample' | 'sample_received' | 'result_entered' | 'approved' | 'cancelled'
  generatedAt: string
  generatedBy: string
  convertedAt?: string
  convertedBy?: string
  orderId?: string
  sampleReceivedAt?: string
  sampleReceivedBy?: string
  resultEnteredAt?: string
  resultEnteredBy?: string
  resultId?: string
  approvedAt?: string
  approvedBy?: string
  reportPrintedAt?: string
  reportPrintedBy?: string
  cancelledAt?: string
  cancelledBy?: string
  barcode?: string
  referringConsultant?: string
  referralId?: string
  corporateId?: string
  portal?: 'lab' | 'reception'
  // Collection Center fields
  collectionCenterId?: string
  collectionCenterName?: string
  centerCommissionPercent?: number
  centerCommissionAmount?: number
  centerNetAmount?: number
  createdAt: string
  updatedAt: string
  testStatuses?: Array<{
    testId: string
    testName: string
    status: string
    resultId?: string
  }>
  // Financial fields stored on token for easy access
  subtotal?: number
  discount?: number
  net?: number
  receivedAmount?: number
  receivableAmount?: number
  paymentMethod?: string

  // Registration extras
  sampleType?: 'normal' | 'urgent' | 'stat'
  sampleReceived?: boolean
  sampleReceivedAtRegistration?: boolean
  hospitalRegistrationNumber?: string
  packageIds?: string[]
  patientCardId?: string
  patientCardKind?: string
  departmentId?: string
  wardId?: string
  emergencyDayId?: string
  source?: 'lab' | 'reception' | 'center' | 'ward_import'
  email?: string
  whatsapp?: string
  printAction?: 'save' | 'save_invoice' | 'save_invoice_barcode' | 'save_barcode'
}

export const LabToken = models.Lab_Token || model('Lab_Token', TokenSchema)
