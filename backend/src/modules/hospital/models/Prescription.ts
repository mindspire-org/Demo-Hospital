import { Schema, model, models } from 'mongoose'

const PrescriptionSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true },
  prescriptionMode: { type: String, default: 'electronic' },
  // Draft = investigations advised, treatment pending (appears in the Pending
  // Investigations list); final = completed prescription.
  status: { type: String, enum: ['draft', 'final'], default: 'final', index: true },
  manualAttachment: {
    mimeType: { type: String },
    fileName: { type: String },
    dataUrl: { type: String },
    uploadedAt: { type: Date },
  },
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
  nextFollowUp: { type: String },
  vitals: {
    pulse: { type: Number },
    temperatureC: { type: Number },
    bloodPressureSys: { type: Number },
    bloodPressureDia: { type: Number },
    respiratoryRate: { type: Number },
    bloodSugar: { type: Number },
    weightKg: { type: Number },
    heightCm: { type: Number },
    bmi: { type: Number },
    bsa: { type: Number },
    spo2: { type: Number },
    ar: { type: String },
    va: { type: String },
    iop: { type: String },
  },
  preAnesthesia: {
    isApplied: { type: Boolean, default: false },
    history: {
      cvs: { type: String },
      respiratory: { type: String },
      renal: { type: String },
      hepatic: { type: String },
      diabetic: { type: String },
      neurology: { type: String },
      previousAnesthesia: { type: String },
      allergies: { type: String },
    },
    examination: {
      mallampatiScore: { type: String }, // I, II, III, IV
      asaClass: { type: String },        // I, II, III, IV, V, VI, E
      airway: { type: String },
      teeth: { type: String },
      notes: { type: String },
    },
    recommendation: { type: String }, // e.g., Fit for surgery, Unfit, High Risk
  },
  dentalChart: {
    teeth: [{
      toothId: { type: Number },
      condition: { type: String },
      notes: { type: String },
    }],
    generalNotes: { type: String },
  },
  eyeExamination: {
    visualAcuityRight: { type: String },
    visualAcuityLeft: { type: String },
    nearVisionRight: { type: String },
    nearVisionLeft: { type: String },
    iopRight: { type: String },
    iopLeft: { type: String },
    refractionRight: { type: String },
    refractionLeft: { type: String },
    slitLamp: { type: String },
    fundus: { type: String },
    diagnosis: { type: String },
    glassesRight: {
      sph: { type: String },
      cyl: { type: String },
      axis: { type: String },
      add: { type: String },
    },
    glassesLeft: {
      sph: { type: String },
      cyl: { type: String },
      axis: { type: String },
      add: { type: String },
    },
    generalNotes: { type: String },
  },
  // Generic department-specific clinical payload for the department-module
  // registry (cardiac, breast-onco, omfs, neuro, ...). Shape { type, data } is
  // validated per-type by Zod at the API layer; stored as Mixed for flexibility.
  departmentClinical: { type: Schema.Types.Mixed, default: undefined },
  tokenNo: { type: String },
  createdBy: { type: String },
}, { timestamps: true })

export type HospitalPrescriptionDoc = {
  _id: string
  patientId: string
  encounterId: string
  prescriptionMode?: 'electronic'|'manual'
  status?: 'draft'|'final'
  manualAttachment?: { mimeType?: string; fileName?: string; dataUrl?: string; uploadedAt?: string }
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
  nextFollowUp?: string
  vitals?: {
    pulse?: number
    temperatureC?: number
    bloodPressureSys?: number
    bloodPressureDia?: number
    respiratoryRate?: number
    bloodSugar?: number
    weightKg?: number
    heightCm?: number
    bmi?: number
    bsa?: number
    spo2?: number
    ar?: string
    va?: string
    iop?: string
  }
  preAnesthesia?: {
    isApplied: boolean
    history?: {
      cvs?: string; respiratory?: string; renal?: string; hepatic?: string; diabetic?: string
      neurology?: string; previousAnesthesia?: string; allergies?: string
    }
    examination?: {
      mallampatiScore?: string; asaClass?: string; airway?: string; teeth?: string; notes?: string
    }
    recommendation?: string
  }
  dentalChart?: {
    teeth?: Array<{ toothId: number; condition: string; notes?: string }>
    generalNotes?: string
  }
  eyeExamination?: {
    visualAcuityRight?: string
    visualAcuityLeft?: string
    nearVisionRight?: string
    nearVisionLeft?: string
    iopRight?: string
    iopLeft?: string
    refractionRight?: string
    refractionLeft?: string
    slitLamp?: string
    fundus?: string
    diagnosis?: string
    glassesRight?: { sph?: string; cyl?: string; axis?: string; add?: string }
    glassesLeft?: { sph?: string; cyl?: string; axis?: string; add?: string }
    generalNotes?: string
  }
  departmentClinical?: { type?: string; data?: any }
  tokenNo?: string
  createdBy?: string
}

export const HospitalPrescription = models.Hospital_Prescription || model('Hospital_Prescription', PrescriptionSchema)
