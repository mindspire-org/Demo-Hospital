import { Schema, model, models } from 'mongoose'

// Per-patient, per-department treatment progress entries. A patient under a
// department (e.g. breast oncology) accumulates a timeline of progress notes
// such as "Chemo cycle 2/6", "Post-op day 3", "Rehab phase II".
const DepartmentProgressSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Department', index: true },
  departmentKey: { type: String, index: true },   // 'cardiac' | 'breast-onco' | 'omfs' | 'neuro' | ...
  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter' },
  title: { type: String, required: true },         // short label for the timeline entry
  stage: { type: String },                         // free-form stage e.g. "Cycle 2/6"
  status: { type: String, enum: ['active', 'completed', 'on-hold'], default: 'active', index: true },
  notes: { type: String },
  date: { type: Date, default: Date.now },
  nextDate: { type: Date },
  createdBy: { type: String },
}, { timestamps: true })

export type HospitalDepartmentProgressDoc = {
  _id: string
  patientId: string
  departmentId?: string
  departmentKey?: string
  doctorId?: string
  encounterId?: string
  title: string
  stage?: string
  status?: 'active' | 'completed' | 'on-hold'
  notes?: string
  date?: string
  nextDate?: string
  createdBy?: string
}

export const HospitalDepartmentProgress =
  models.Hospital_DepartmentProgress || model('Hospital_DepartmentProgress', DepartmentProgressSchema)
