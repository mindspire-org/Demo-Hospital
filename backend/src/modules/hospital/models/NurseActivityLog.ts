import { Schema, model, models } from 'mongoose'

const NurseActivityLogSchema = new Schema({
  nurseId: { type: Schema.Types.ObjectId, ref: 'Hospital_User', required: true, index: true },
  action: { 
    type: String, 
    enum: [
      'task_assigned', 'task_accepted', 'task_started', 'task_completed', 'task_cancelled',
      'vitals_recorded', 'medication_administered', 'injection_given', 'iv_started',
      'shift_checked_in', 'shift_checked_out', 'handover_given', 'handover_received',
      'profile_updated', 'notes_added', 'task_reassigned', 'task_overdue'
    ],
    required: true,
    index: true
  },
  entityType: { 
    type: String, 
    enum: ['task', 'patient', 'shift', 'encounter', 'profile'],
    required: true
  },
  entityId: { type: Schema.Types.ObjectId, required: true },
  
  // Context details
  details: {
    taskId: String,
    taskType: String,
    patientMrn: String,
    patientName: String,
    shiftType: String,
    previousValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
    notes: String,
    duration: Number,
    location: String,
    ward: String,
    bedNumber: String
  },
  
  // Audit
  performedBy: { type: Schema.Types.ObjectId, ref: 'Hospital_User' },
  ipAddress: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true, collection: 'hospital_nurse_activity_logs' })

// Indexes for reporting
NurseActivityLogSchema.index({ nurseId: 1, action: 1, timestamp: -1 })
NurseActivityLogSchema.index({ entityType: 1, entityId: 1 })
NurseActivityLogSchema.index({ timestamp: -1 })
NurseActivityLogSchema.index({ action: 1, timestamp: -1 })

export type NurseActivityLogDoc = {
  _id: string
  nurseId: string
  action: 'task_assigned' | 'task_accepted' | 'task_started' | 'task_completed' | 'task_cancelled' | 'vitals_recorded' | 'medication_administered' | 'injection_given' | 'iv_started' | 'shift_checked_in' | 'shift_checked_out' | 'handover_given' | 'handover_received' | 'profile_updated' | 'notes_added' | 'task_reassigned' | 'task_overdue'
  entityType: 'task' | 'patient' | 'shift' | 'encounter' | 'profile'
  entityId: string
  details?: {
    taskId?: string
    taskType?: string
    patientMrn?: string
    patientName?: string
    shiftType?: string
    previousValue?: any
    newValue?: any
    notes?: string
    duration?: number
    location?: string
    ward?: string
    bedNumber?: string
  }
  performedBy?: string
  ipAddress?: string
  userAgent?: string
  timestamp: Date
  createdAt: Date
  updatedAt: Date
}

export const NurseActivityLog = models.Hospital_NurseActivityLog || model('Hospital_NurseActivityLog', NurseActivityLogSchema)
