import { Schema, model, models } from 'mongoose'

const DialysisAppointmentSchema = new Schema({
  // If patient exists, link to LabPatient and use existing MRN
  labPatientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', index: true },
  mrn: { type: String, index: true }, // existing MRN if patient exists

  // For new patients (no MRN yet), store details here
  newPatientName: { type: String },
  newPatientPhone: { type: String },
  newPatientCnic: { type: String },
  newPatientGender: { type: String },
  newPatientAge: { type: String },
  newPatientGuardianName: { type: String },
  newPatientGuardianRel: { type: String },
  newPatientAddress: { type: String },

  // Appointment details
  appointmentDate: { type: String, required: true, index: true }, // ISO date string
  appointmentTime: { type: String }, // e.g. "09:00"
  sessionTypeId: { type: Schema.Types.ObjectId, ref: 'Dialysis_SessionType' },
  sessionTypeName: { type: String },
  shiftId: { type: Schema.Types.ObjectId, ref: 'Dialysis_Shift' },
  shiftName: { type: String },
  machineId: { type: Schema.Types.ObjectId, ref: 'Dialysis_Machine' },
  machineName: { type: String },
  dialyzerTypeId: { type: Schema.Types.ObjectId, ref: 'Dialysis_DialyzerType' },
  dialyzerTypeName: { type: String },
  duration: { type: Number, default: 4 },
  notes: { type: String },

  // Status
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'converted'], default: 'scheduled', index: true },
  convertedToTokenId: { type: Schema.Types.ObjectId, ref: 'Dialysis_Token' },
  convertedAt: { type: Date },

  // Audit
  createdByUserId: { type: Schema.Types.ObjectId, ref: 'Dialysis_User' },
  createdByUsername: { type: String },
}, { timestamps: true })

DialysisAppointmentSchema.index({ appointmentDate: 1, status: 1 })

export type DialysisAppointmentDoc = {
  _id: string
  labPatientId?: string
  mrn?: string
  newPatientName?: string
  newPatientPhone?: string
  newPatientCnic?: string
  newPatientGender?: string
  newPatientAge?: string
  newPatientGuardianName?: string
  newPatientGuardianRel?: string
  newPatientAddress?: string
  appointmentDate: string
  appointmentTime?: string
  sessionTypeId?: string
  sessionTypeName?: string
  shiftId?: string
  shiftName?: string
  machineId?: string
  machineName?: string
  dialyzerTypeId?: string
  dialyzerTypeName?: string
  duration?: number
  notes?: string
  status?: string
  convertedToTokenId?: string
  convertedAt?: Date
  createdByUserId?: string
  createdByUsername?: string
  createdAt?: Date
  updatedAt?: Date
}

export const DialysisAppointment = models.Dialysis_Appointment || model('Dialysis_Appointment', DialysisAppointmentSchema)
