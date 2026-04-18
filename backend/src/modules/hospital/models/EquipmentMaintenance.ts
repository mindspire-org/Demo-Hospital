import { Schema, model, models } from 'mongoose'

const EquipmentMaintenanceSchema = new Schema({
  equipmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Equipment', required: true },
  type: { 
    type: String, 
    enum: ['PPM', 'Calibration', 'Repair', 'Installation', 'Upgrade'],
    required: true 
  },
  scheduledDate: { type: Date },
  performedDate: { type: Date, required: true },
  completedDate: { type: Date },
  nextDueDate: { type: Date },
  performedBy: { type: String }, // Internal staff name
  vendorId: { type: Schema.Types.ObjectId, ref: 'Hospital_EquipmentSupplier' },
  vendorName: { type: String }, // Denormalized for reports
  description: { type: String, required: true },
  findings: { type: String },
  actionsTaken: { type: String },
  partsUsed: [{
    partName: { type: String },
    partNumber: { type: String },
    quantity: { type: Number },
    unitCost: { type: Number },
    totalCost: { type: Number }
  }],
  laborCost: { type: Number, default: 0 },
  partsCost: { type: Number, default: 0 },
  totalCost: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['Scheduled', 'InProgress', 'Completed', 'Cancelled', 'Overdue'],
    default: 'Completed'
  },
  certificateNo: { type: String }, // Calibration specific
  labName: { type: String },       // Calibration specific
  validFrom: { type: Date },       // Calibration specific
  validTo: { type: Date },         // Calibration specific
  result: { type: String },        // Calibration specific (Pass/Fail)
  attachments: [{ type: String }],
  notes: { type: String }
}, { timestamps: true })

export type EquipmentMaintenanceDoc = {
  _id: string
  equipmentId: string
  type: 'PPM' | 'Calibration' | 'Repair' | 'Installation' | 'Upgrade'
  scheduledDate?: Date
  performedDate: Date
  completedDate?: Date
  nextDueDate?: Date
  performedBy?: string
  vendorId?: string
  vendorName?: string
  description: string
  findings?: string
  actionsTaken?: string
  partsUsed?: Array<{
    partName: string
    partNumber?: string
    quantity: number
    unitCost: number
    totalCost: number
  }>
  laborCost: number
  partsCost: number
  totalCost: number
  status: 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled' | 'Overdue'
  certificateNo?: string
  labName?: string
  validFrom?: Date
  validTo?: Date
  result?: string
  attachments?: string[]
  notes?: string
}

export const EquipmentMaintenance = models.Hospital_EquipmentMaintenance || model('Hospital_EquipmentMaintenance', EquipmentMaintenanceSchema)
