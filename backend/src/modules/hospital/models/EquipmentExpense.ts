import { Schema, model, models } from 'mongoose'

const EquipmentExpenseSchema = new Schema({
  equipmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Equipment', required: true },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Hospital_EquipmentSupplier' },
  category: { 
    type: String, 
    enum: ['Purchase', 'PPM', 'Calibration', 'Repair', 'Breakdown', 'AMC', 'SpareParts', 'Other'],
    required: true 
  },
  amount: { type: Number, required: true },
  gstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  referenceNo: { type: String }, // Invoice/Receipt number
  referenceDate: { type: Date },
  maintenanceId: { type: Schema.Types.ObjectId, ref: 'Hospital_EquipmentMaintenance' },
  paymentStatus: { 
    type: String, 
    enum: ['Pending', 'Partial', 'Paid'], 
    default: 'Paid' 
  },
  paidAmount: { type: Number, default: 0 },
  notes: { type: String },
  attachments: [{ type: String }]
}, { timestamps: true })

export type EquipmentExpenseDoc = {
  _id: string
  equipmentId: string
  supplierId?: string
  category: 'Purchase' | 'PPM' | 'Calibration' | 'Repair' | 'Breakdown' | 'AMC' | 'SpareParts' | 'Other'
  amount: number
  gstAmount: number
  totalAmount: number
  referenceNo?: string
  referenceDate?: Date
  maintenanceId?: string
  paymentStatus: 'Pending' | 'Partial' | 'Paid'
  paidAmount: number
  notes?: string
  attachments?: string[]
}

export const EquipmentExpense = models.Hospital_EquipmentExpense || model('Hospital_EquipmentExpense', EquipmentExpenseSchema)
