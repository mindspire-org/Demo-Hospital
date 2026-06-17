import { Schema, model, models } from 'mongoose'

// Checklist row structure
const ChecklistRowSchema = new Schema({
  id: { type: Number, required: true },
  text: { type: String, required: true },
  gloves: { type: Boolean, default: false },
  mask: { type: Boolean, default: false },
  gown: { type: Boolean, default: false },
  cap: { type: Boolean, default: false },
  isolation: { type: Boolean, default: false },
}, { _id: false })

const IpdInfectionControlSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true },
  
  // Checklist rows
  rows: [ChecklistRowSchema],
  
  // Date
  date: { type: Date, default: Date.now, index: true },
  
  // Patient signature
  patientName: { type: String },
  patientSign: { type: String }, // base64 signature or text
  
  // Head Nurse
  headNurseName: { type: String },
  headNurseSign: { type: String },
  
  // Duty Nurse
  dutyNurseName: { type: String },
  dutyNurseSign: { type: String },
  
  // Recording info
  recordedBy: { type: String },
  recordedAt: { type: Date, default: Date.now },
  
  // Status
  status: { 
    type: String, 
    enum: ['draft', 'completed'],
    default: 'completed',
    index: true 
  },
  
  notes: { type: String },
}, { timestamps: true })

IpdInfectionControlSchema.index({ encounterId: 1, date: -1 })
IpdInfectionControlSchema.index({ patientId: 1, date: -1 })

export type ChecklistRow = {
  id: number
  text: string
  gloves?: boolean
  mask?: boolean
  gown?: boolean
  cap?: boolean
  isolation?: boolean
}

export type HospitalIpdInfectionControlDoc = {
  _id: string
  patientId: string
  encounterId: string
  rows?: ChecklistRow[]
  date?: Date
  patientName?: string
  patientSign?: string
  headNurseName?: string
  headNurseSign?: string
  dutyNurseName?: string
  dutyNurseSign?: string
  recordedBy?: string
  recordedAt?: Date
  status?: 'draft' | 'completed'
  notes?: string
  createdAt?: Date
  updatedAt?: Date
}

export const HospitalIpdInfectionControl = models.Hospital_IpdInfectionControl || model('Hospital_IpdInfectionControl', IpdInfectionControlSchema)
