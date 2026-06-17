import mongoose, { Schema, Document } from 'mongoose'

export interface IErPharmacyOrderItem {
  name: string
  qty: number
  dose?: string
  notes?: string
}

export interface IErPharmacyOrder extends Document {
  encounterId: mongoose.Types.ObjectId
  patientId: mongoose.Types.ObjectId
  doctorId?: mongoose.Types.ObjectId
  items: IErPharmacyOrderItem[]
  status: 'pending' | 'completed' | 'cancelled'
  linkedReferralId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const ErPharmacyOrderSchema = new Schema({
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Hospital_Patient', required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  items: [{
    name: { type: String, required: true },
    qty: { type: Number, required: true, default: 1 },
    dose: { type: String },
    notes: { type: String }
  }],
  status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
  linkedReferralId: { type: Schema.Types.ObjectId, ref: 'Hospital_Referral' }
}, { timestamps: true })

export const ErPharmacyOrder = mongoose.model<IErPharmacyOrder>('Hospital_ErPharmacyOrder', ErPharmacyOrderSchema)
