import { Schema, model, models } from 'mongoose'

const NurseShiftSchema = new Schema({
  nurseId: { type: Schema.Types.ObjectId, ref: 'Hospital_User', required: true, index: true },
  date: { type: Date, required: true, index: true },
  shiftType: { 
    type: String, 
    enum: ['morning', 'evening', 'night'],
    required: true
  },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  
  // Ward Assignments
  wardAssignments: [{ type: String }],
  bedCount: { type: Number, default: 0 },
  department: { type: String },
  
  // Handover
  handoverFrom: { type: Schema.Types.ObjectId, ref: 'Hospital_User' },
  handoverFromNotes: { type: String },
  handoverTo: { type: Schema.Types.ObjectId, ref: 'Hospital_User' },
  handoverToNotes: { type: String },
  handoverCompleted: { type: Boolean, default: false },
  handoverCompletedAt: { type: Date },
  
  // Status
  status: { 
    type: String, 
    enum: ['scheduled', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
    default: 'scheduled',
    index: true
  },
  checkInAt: { type: Date },
  checkOutAt: { type: Date },
  checkInLocation: { type: String },
  
  // Attendance
  lateMinutes: { type: Number, default: 0 },
  earlyDepartureMinutes: { type: Number, default: 0 },
  
  // Performance Metrics (auto-calculated)
  tasksAssigned: { type: Number, default: 0 },
  tasksCompleted: { type: Number, default: 0 },
  tasksOverdue: { type: Number, default: 0 },
  tasksPending: { type: Number, default: 0 },
  avgResponseTime: { type: Number, default: 0 },
  avgCompletionTime: { type: Number, default: 0 },
  
  // Notes
  notes: { type: String },
  supervisorNotes: { type: String }
}, { timestamps: true, collection: 'hospital_nurse_shifts' })

// Compound indexes
NurseShiftSchema.index({ nurseId: 1, date: -1 })
NurseShiftSchema.index({ date: 1, shiftType: 1 })
NurseShiftSchema.index({ wardAssignments: 1, date: 1 })
NurseShiftSchema.index({ status: 1, date: 1 })

export type NurseShiftDoc = {
  _id: string
  nurseId: string
  date: Date
  shiftType: 'morning' | 'evening' | 'night'
  startTime: Date
  endTime: Date
  wardAssignments: string[]
  bedCount: number
  department?: string
  handoverFrom?: string
  handoverFromNotes?: string
  handoverTo?: string
  handoverToNotes?: string
  handoverCompleted: boolean
  handoverCompletedAt?: Date
  status: 'scheduled' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show'
  checkInAt?: Date
  checkOutAt?: Date
  checkInLocation?: string
  lateMinutes: number
  earlyDepartureMinutes: number
  tasksAssigned: number
  tasksCompleted: number
  tasksOverdue: number
  tasksPending: number
  avgResponseTime: number
  avgCompletionTime: number
  notes?: string
  supervisorNotes?: string
  createdAt: Date
  updatedAt: Date
}

export const NurseShift = models.Hospital_NurseShift || model('Hospital_NurseShift', NurseShiftSchema)
