import { Schema, model, models } from 'mongoose'

const NursePerformanceSchema = new Schema({
  nurseId: { type: Schema.Types.ObjectId, ref: 'Hospital_User', required: true, index: true },
  period: { 
    type: String, 
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  date: { type: Date, required: true, index: true },
  
  // Task Metrics
  totalTasksAssigned: { type: Number, default: 0 },
  totalTasksCompleted: { type: Number, default: 0 },
  totalTasksPending: { type: Number, default: 0 },
  totalTasksOverdue: { type: Number, default: 0 },
  totalTasksCancelled: { type: Number, default: 0 },
  completionRate: { type: Number, default: 0, min: 0, max: 100 },
  
  // Time Metrics
  avgResponseTime: { type: Number, default: 0 },  // Minutes from assignment to acceptance
  avgCompletionTime: { type: Number, default: 0 }, // Minutes from start to completion
  totalWorkingMinutes: { type: Number, default: 0 },
  
  // Quality Metrics
  medicationErrors: { type: Number, default: 0 },
  patientComplaints: { type: Number, default: 0 },
  patientCompliments: { type: Number, default: 0 },
  documentationErrors: { type: Number, default: 0 },
  
  // Clinical Metrics
  vitalsRecorded: { type: Number, default: 0 },
  medicationsAdministered: { type: Number, default: 0 },
  injectionsGiven: { type: Number, default: 0 },
  ivDripsStarted: { type: Number, default: 0 },
  dressingsDone: { type: Number, default: 0 },
  ecgsDone: { type: Number, default: 0 },
  proceduresCompleted: { type: Number, default: 0 },
  
  // Attendance Metrics
  shiftsScheduled: { type: Number, default: 0 },
  shiftsWorked: { type: Number, default: 0 },
  shiftsCancelled: { type: Number, default: 0 },
  lateCheckIns: { type: Number, default: 0 },
  earlyCheckOuts: { type: Number, default: 0 },
  totalLateMinutes: { type: Number, default: 0 },
  attendanceRate: { type: Number, default: 0, min: 0, max: 100 },
  
  // Priority Task Metrics
  statTasksCompleted: { type: Number, default: 0 },
  urgentTasksCompleted: { type: Number, default: 0 },
  statTaskAvgCompletionTime: { type: Number, default: 0 },
  
  // Patient Interaction
  patientsCared: { type: Number, default: 0 },
  avgPatientsPerShift: { type: Number, default: 0 },
  patientSatisfactionScore: { type: Number, default: 0, min: 0, max: 5 },
  
  // Handover Metrics
  handoversGiven: { type: Number, default: 0 },
  handoversReceived: { type: Number, default: 0 },
  handoverCompletionRate: { type: Number, default: 0, min: 0, max: 100 },
  
  // Calculated Score (0-100)
  performanceScore: { type: Number, default: 0, min: 0, max: 100 },
  rating: { 
    type: String, 
    enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor'],
    default: 'satisfactory'
  },
  
  // Component scores
  taskScore: { type: Number, default: 0, min: 0, max: 100 },
  qualityScore: { type: Number, default: 0, min: 0, max: 100 },
  attendanceScore: { type: Number, default: 0, min: 0, max: 100 },
  clinicalScore: { type: Number, default: 0, min: 0, max: 100 },
  documentationScore: { type: Number, default: 0, min: 0, max: 100 },
  
  // Supervisor assessment
  supervisorRating: { type: Number, min: 0, max: 5 },
  supervisorComments: { type: String },
  
  // Notes
  notes: { type: String }
}, { timestamps: true, collection: 'hospital_nurse_performances' })

// Indexes
NursePerformanceSchema.index({ nurseId: 1, date: -1 })
NursePerformanceSchema.index({ period: 1, date: -1 })
NursePerformanceSchema.index({ performanceScore: -1 })
NursePerformanceSchema.index({ rating: 1, date: -1 })

export type NursePerformanceDoc = {
  _id: string
  nurseId: string
  period: 'daily' | 'weekly' | 'monthly'
  date: Date
  totalTasksAssigned: number
  totalTasksCompleted: number
  totalTasksPending: number
  totalTasksOverdue: number
  totalTasksCancelled: number
  completionRate: number
  avgResponseTime: number
  avgCompletionTime: number
  totalWorkingMinutes: number
  medicationErrors: number
  patientComplaints: number
  patientCompliments: number
  documentationErrors: number
  vitalsRecorded: number
  medicationsAdministered: number
  injectionsGiven: number
  ivDripsStarted: number
  dressingsDone: number
  ecgsDone: number
  proceduresCompleted: number
  shiftsScheduled: number
  shiftsWorked: number
  shiftsCancelled: number
  lateCheckIns: number
  earlyCheckOuts: number
  totalLateMinutes: number
  attendanceRate: number
  statTasksCompleted: number
  urgentTasksCompleted: number
  statTaskAvgCompletionTime: number
  patientsCared: number
  avgPatientsPerShift: number
  patientSatisfactionScore: number
  handoversGiven: number
  handoversReceived: number
  handoverCompletionRate: number
  performanceScore: number
  rating: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement' | 'poor'
  taskScore: number
  qualityScore: number
  attendanceScore: number
  clinicalScore: number
  documentationScore: number
  supervisorRating?: number
  supervisorComments?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export const NursePerformance = models.Hospital_NursePerformance || model('Hospital_NursePerformance', NursePerformanceSchema)
