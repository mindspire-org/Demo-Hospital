import { Schema, model, models } from 'mongoose'

const EmergencyContactSchema = new Schema({
  name: { type: String },
  relationship: { type: String },
  phone: { type: String },
  email: { type: String },
  isPrimary: { type: Boolean, default: false },
}, { _id: false })

const ICUAdmissionSchema = new Schema({
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient' },
  bedId: { type: Schema.Types.ObjectId, ref: 'Hospital_ICUBed' },
  admittedAt: { type: Date, default: Date.now },
  dischargedAt: { type: Date },
  reason: { type: String, required: true },
  severity: { type: String, enum: ['mild', 'moderate', 'severe', 'critical'], default: 'moderate' },
  status: { type: String, enum: ['active', 'transferred', 'discharged', 'deceased'], default: 'active' },
  ventilatorRequired: { type: Boolean, default: false },
  referredFrom: { type: String, enum: ['ipd', 'er', 'ot'] },
  // Critical patient safety fields
  dnarStatus: { type: Boolean, default: false }, // Do Not Attempt Resuscitation
  dniStatus: { type: Boolean, default: false }, // Do Not Intubate
  // Emergency contacts
  emergencyContacts: [EmergencyContactSchema],
  // Clinical coding
  icd10Codes: [{ type: String }],
  primaryDiagnosis: { type: String },
  // Billing/Insurance
  billingClass: { type: String },
  insuranceId: { type: String },
  // Physician references (using IDs instead of strings for better linking)
  referringPhysicianId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  acceptingConsultantId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  attendingDoctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  // Discharge
  dischargeDestination: { type: String, enum: ['ward', 'home', 'other-hospital', 'deceased'] },
  dischargeSummary: { type: String },
  notes: { type: String },
}, { timestamps: true })

ICUAdmissionSchema.index({ status: 1, admittedAt: -1 })
ICUAdmissionSchema.index({ encounterId: 1, status: 1 })

export type ICUAdmissionDoc = {
  _id: string
  encounterId: string
  patientId?: string
  bedId?: string
  admittedAt: Date
  dischargedAt?: Date
  reason: string
  severity: 'mild' | 'moderate' | 'severe' | 'critical'
  status: 'active' | 'transferred' | 'discharged' | 'deceased'
  ventilatorRequired?: boolean
  referredFrom?: 'ipd' | 'er' | 'ot'
  dnarStatus?: boolean
  dniStatus?: boolean
  emergencyContacts?: Array<{ name?: string; relationship?: string; phone?: string; email?: string; isPrimary?: boolean }>
  icd10Codes?: string[]
  primaryDiagnosis?: string
  billingClass?: string
  insuranceId?: string
  referringPhysicianId?: string
  acceptingConsultantId?: string
  attendingDoctorId?: string
  dischargeDestination?: 'ward' | 'home' | 'other-hospital' | 'deceased'
  dischargeSummary?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export const ICUAdmission = models.Hospital_ICUAdmission || model('Hospital_ICUAdmission', ICUAdmissionSchema)
