import { Schema, model, models } from 'mongoose'

const LabPaymentSchema = new Schema({
  tokenId: { type: Schema.Types.ObjectId, ref: 'Lab_Token', index: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Lab_Order', index: true },
  patientId: { type: String, required: true, index: true },
  
  type: { 
    type: String, 
    enum: ['payment', 'refund', 'adjustment'], 
    required: true 
  },
  
  amount: { type: Number, required: true },
  
  method: { 
    type: String, 
    enum: ['cash', 'card', 'online', 'bank_transfer', 'corporate_credit'], 
    default: 'cash' 
  },
  
  note: { type: String },
  
  createdBy: { type: String }, // Username/Actor
}, { timestamps: true })

export type LabPaymentDoc = {
  _id: string
  tokenId?: string
  orderId?: string
  patientId: string
  type: 'payment' | 'refund' | 'adjustment'
  amount: number
  method: string
  note?: string
  createdBy?: string
  createdAt: string
}

export const LabPayment = models.Lab_Payment || model('Lab_Payment', LabPaymentSchema)
