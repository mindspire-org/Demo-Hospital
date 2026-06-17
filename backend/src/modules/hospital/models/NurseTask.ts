import { Schema, model, models } from 'mongoose'

const NurseTaskSchema = new Schema({
  // Task Identification
  taskId: { type: String, required: true, unique: true, index: true },
  
  // Assignment
  assignedBy: { type: Schema.Types.ObjectId, ref: 'Hospital_User', required: true, index: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'Hospital_User', required: true, index: true },
  assignedAt: { type: Date, default: Date.now },
  
  // Patient Context
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  patientMrn: { type: String, required: true, index: true },
  patientName: { type: String, required: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', index: true },
  location: { 
    type: String, 
    enum: ['IPD', 'OPD', 'ER', 'OT', 'ICU', 'Dialysis'],
    required: true,
    index: true
  },
  bedNumber: { type: String },
  ward: { type: String, index: true },
  
  // Task Details
  taskType: { 
    type: String, 
    enum: [
      'injection', 'iv_drip', 'iv_medication', 'oral_medication', 
      'dressing', 'vitals', 'nebulization', 'ecg', 'catheterization',
      'blood_draw', 'transfusion', 'suction', 'ng_tube', 'enema',
      'pre_op_prep', 'post_op_care', 'shift_handover', 'other'
    ],
    required: true,
    index: true
  },
  priority: { 
    type: String, 
    enum: ['routine', 'urgent', 'stat', 'emergency'],
    default: 'routine',
    index: true
  },
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'completed', 'cancelled', 'overdue'],
    default: 'pending',
    index: true
  },
  
  // Scheduling
  scheduledTime: { type: Date, required: true, index: true },
  completedAt: { type: Date },
  dueTime: { type: Date },
  
  // Clinical Details
  prescriptionItemId: { type: Schema.Types.ObjectId },
  medicationName: { type: String },
  dosage: { type: String },
  route: { 
    type: String, 
    enum: ['IV', 'IM', 'SC', 'PO', 'PR', 'Sublingual', 'Inhalation', 'Topical', 'Other']
  },
  frequency: { type: String },
  specialInstructions: { type: String },
  
  // Vitals (if taskType is vitals)
  vitalsData: {
    bp: String,
    pulse: Number,
    temp: Number,
    spo2: Number,
    rr: Number,
    painScale: Number,
    weight: Number,
    height: Number,
    bsr: Number,
    intakeIV: String,
    urine: String
  },
  
  // Execution
  notes: { type: String },
  complications: { type: String },
  patientResponse: { 
    type: String, 
    enum: ['excellent', 'good', 'fair', 'poor']
  },
  
  // Cancellation
  cancelledBy: { type: Schema.Types.ObjectId, ref: 'Hospital_User' },
  cancelledReason: { type: String },
  cancelledAt: { type: Date },
  
  // Reassignment
  reassignedFrom: { type: Schema.Types.ObjectId, ref: 'Hospital_User' },
  reassignedAt: { type: Date },
  reassignmentReason: { type: String }
}, { timestamps: true, collection: 'hospital_nurse_tasks' })

// Compound indexes for common queries
NurseTaskSchema.index({ assignedTo: 1, status: 1, scheduledTime: 1 })
NurseTaskSchema.index({ patientId: 1, status: 1, createdAt: -1 })
NurseTaskSchema.index({ location: 1, ward: 1, status: 1 })
NurseTaskSchema.index({ priority: 1, scheduledTime: 1 })

export type NurseTaskDoc = {
  _id: string
  taskId: string
  assignedBy: string
  assignedTo: string
  assignedAt: Date
  patientId: string
  patientMrn: string
  patientName: string
  encounterId?: string
  location: 'IPD' | 'OPD' | 'ER' | 'OT' | 'ICU' | 'Dialysis'
  bedNumber?: string
  ward?: string
  taskType: 'injection' | 'iv_drip' | 'iv_medication' | 'oral_medication' | 'dressing' | 'vitals' | 'nebulization' | 'ecg' | 'catheterization' | 'blood_draw' | 'transfusion' | 'suction' | 'ng_tube' | 'enema' | 'pre_op_prep' | 'post_op_care' | 'shift_handover' | 'other'
  priority: 'routine' | 'urgent' | 'stat' | 'emergency'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue'
  scheduledTime: Date
  completedAt?: Date
  dueTime?: Date
  prescriptionItemId?: string
  medicationName?: string
  dosage?: string
  route?: 'IV' | 'IM' | 'SC' | 'PO' | 'PR' | 'Sublingual' | 'Inhalation' | 'Topical' | 'Other'
  frequency?: string
  specialInstructions?: string
  vitalsData?: {
    bp?: string
    pulse?: number
    temp?: number
    spo2?: number
    rr?: number
    painScale?: number
    weight?: number
    height?: number
    bsr?: number
    intakeIV?: string
    urine?: string
  }
  notes?: string
  complications?: string
  patientResponse?: 'excellent' | 'good' | 'fair' | 'poor'
  cancelledBy?: string
  cancelledReason?: string
  cancelledAt?: Date
  reassignedFrom?: string
  reassignedAt?: Date
  reassignmentReason?: string
  createdAt: Date
  updatedAt: Date
}

export const NurseTask = models.Hospital_NurseTask || model('Hospital_NurseTask', NurseTaskSchema)
