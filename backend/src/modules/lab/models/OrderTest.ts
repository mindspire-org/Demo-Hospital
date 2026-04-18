import { Schema, model, models } from 'mongoose'

const LabOrderTestSchema = new Schema({
  tokenId: { type: Schema.Types.ObjectId, ref: 'Lab_Token', required: true, index: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Lab_Order', required: true, index: true },
  tokenNo: { type: String, required: true, index: true },
  patientId: { type: String, required: true, index: true },
  
  testId: { type: String, required: true },
  testName: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
  
  status: {
    type: String,
    enum: ['pending', 'sample_collected', 'in_progress', 'result_entered', 'completed', 'returned'],
    default: 'pending',
    index: true
  },
  
  sampleTime: { type: String },
  resultId: { type: Schema.Types.ObjectId, ref: 'Lab_Result' },
  
  // Return handling
  isReturned: { type: Boolean, default: false },
  returnedAt: { type: Date },
  returnReason: { type: String },
  
  // Audit
  performedBy: { type: String },
  verifiedBy: { type: String },
}, { timestamps: true })

// Indexes for performance
LabOrderTestSchema.index({ tokenNo: 1 })
LabOrderTestSchema.index({ status: 1 })
LabOrderTestSchema.index({ tokenId: 1, status: 1 })
LabOrderTestSchema.index({ orderId: 1 })

export type LabOrderTestDoc = {
  _id: string
  tokenId: string
  orderId: string
  tokenNo: string
  patientId: string
  testId: string
  testName: string
  price: number
  status: 'pending' | 'sample_collected' | 'in_progress' | 'result_entered' | 'completed' | 'returned'
  sampleTime?: string
  resultId?: string
  isReturned: boolean
  returnedAt?: string
  returnReason?: string
  performedBy?: string
  verifiedBy?: string
  createdAt: string
}

export const LabOrderTest = models.Lab_OrderTest || model('Lab_OrderTest', LabOrderTestSchema)
