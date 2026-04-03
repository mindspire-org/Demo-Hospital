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

const TokenSchema = new Schema({
  // Lab number (continuously growing serial number, separate from token number)
  labNumber: { type: Number, unique: true, index: true },
  tokenNo: { type: String, required: true, unique: true, index: true },
  patientId: { type: String, required: true },
  patient: { type: PatientSnapshotSchema, required: true },
  tests: { type: [String], default: [] },
  
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
  
  // Additional info
  referringConsultant: { type: String },
  corporateId: { type: Schema.Types.ObjectId, ref: 'Corporate_Company' },
  portal: { type: String, enum: ['lab', 'reception'], index: true },
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
  tests: string[]
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
  cancelledAt?: string
  cancelledBy?: string
  barcode?: string
  referringConsultant?: string
  corporateId?: string
  portal?: 'lab' | 'reception'
  createdAt: string
  updatedAt: string
  // Financial fields stored on token for easy access
  subtotal?: number
  discount?: number
  net?: number
  receivedAmount?: number
  receivableAmount?: number
}

export const LabToken = models.Lab_Token || model('Lab_Token', TokenSchema)
