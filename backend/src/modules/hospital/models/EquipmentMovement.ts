import { Schema, model, models } from 'mongoose'

const EquipmentMovementSchema = new Schema({
  equipmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Equipment', required: true },
  fromDepartmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Department' },
  toDepartmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Department', required: true },
  fromCustodian: { type: String },
  toCustodian: { type: String },
  movementType: { 
    type: String, 
    enum: ['Transfer', 'Repair', 'Storage', 'Disposal'],
    default: 'Transfer'
  },
  movementDate: { type: Date, default: Date.now },
  approvedBy: { type: String },
  reason: { type: String }
}, { timestamps: true })

export type EquipmentMovementDoc = {
  _id: string
  equipmentId: string
  fromDepartmentId?: string
  toDepartmentId: string
  fromCustodian?: string
  toCustodian?: string
  movementType: 'Transfer' | 'Repair' | 'Storage' | 'Disposal'
  movementDate: Date
  approvedBy?: string
  reason?: string
}

export const EquipmentMovement = models.Hospital_EquipmentMovement || model('Hospital_EquipmentMovement', EquipmentMovementSchema)
