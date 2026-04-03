import { Schema, model, models } from 'mongoose'

const PrescriptionTemplateSchema = new Schema({
  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor', required: true, index: true },
  name: { type: String, required: true },
  items: [{
    name: { type: String, required: true },
    dose: { type: String },
    frequency: { type: String },
    duration: { type: String },
    notes: { type: String },
    route: { type: String },
    instruction: { type: String },
  }],
  labTests: [{ type: String }],
  labNotes: { type: String },
  diagnosticTests: [{ type: String }],
  diagnosticNotes: { type: String },
  primaryComplaint: { type: String },
  primaryComplaintHistory: { type: String },
  familyHistory: { type: String },
  treatmentHistory: { type: String },
  allergyHistory: { type: String },
  history: { type: String },
  examFindings: { type: String },
  diagnosis: { type: String },
  advice: { type: String },
}, { timestamps: true })

PrescriptionTemplateSchema.index({ doctorId: 1, name: 1 }, { unique: true })

export type HospitalPrescriptionTemplateDoc = {
  _id: string
  doctorId: string
  name: string
  items: Array<{ name: string; dose?: string; frequency?: string; duration?: string; notes?: string; route?: string; instruction?: string }>
  labTests?: string[]
  labNotes?: string
  diagnosticTests?: string[]
  diagnosticNotes?: string
  primaryComplaint?: string
  primaryComplaintHistory?: string
  familyHistory?: string
  treatmentHistory?: string
  allergyHistory?: string
  history?: string
  examFindings?: string
  diagnosis?: string
  advice?: string
  createdAt: Date
  updatedAt: Date
}

export const HospitalPrescriptionTemplate = models.Hospital_Prescription_Template || model('Hospital_Prescription_Template', PrescriptionTemplateSchema)
