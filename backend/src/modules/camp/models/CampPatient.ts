import { Schema, model, models } from 'mongoose'

const CampPatientSchema = new Schema({
  campId: { type: Schema.Types.ObjectId, ref: 'Camp', required: true, index: true },
  tokenNo: { type: String, required: true },
  fullName: { type: String, required: true },
  age: { type: String, default: '' },
  gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  mrn: { type: String, default: '' },
  vitals: {
    bp: { type: String, default: '' },
    pulse: { type: String, default: '' },
    temp: { type: String, default: '' },
    spo2: { type: String, default: '' },
    weight: { type: String, default: '' },
    height: { type: String, default: '' },
    bmi: { type: String, default: '' },
    rr: { type: String, default: '' },
  },
  chiefComplaint: { type: String, default: '' },
  history: { type: String, default: '' },
  examination: { type: String, default: '' },
  diagnosis: { type: String, default: '' },
  prescription: { type: String, default: '' },
  labOrders: [{ testName: String, status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' }, result: { type: String, default: '' }, labOrderId: { type: String, default: '' } }],
  diagnosticOrders: [{ testName: String, status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' }, result: { type: String, default: '' }, diagnosticOrderId: { type: String, default: '' } }],
  medicinesDispensed: [{ name: String, qty: String, dosage: String, timing: String, days: String }],
  referredToHospital: { type: Boolean, default: false },
  hospitalPatientId: { type: String, default: '' },
  referredBy: { type: String, default: '' },
  consultedBy: { type: String, default: '' },
  consultationDate: { type: Date, default: null },
}, { timestamps: true })

CampPatientSchema.index({ campId: 1, tokenNo: 1 }, { unique: true })
CampPatientSchema.index({ campId: 1, fullName: 'text', phone: 'text' })

export type CampPatientDoc = {
  _id: string
  campId: string
  tokenNo: string
  fullName: string
  age?: string
  gender?: string
  phone?: string
  address?: string
  mrn?: string
  vitals?: Record<string, string>
  chiefComplaint?: string
  history?: string
  examination?: string
  diagnosis?: string
  prescription?: string
  labOrders?: Array<{ testName?: string; status?: string; result?: string; labOrderId?: string }>
  diagnosticOrders?: Array<{ testName?: string; status?: string; result?: string; diagnosticOrderId?: string }>
  medicinesDispensed?: Array<{ name?: string; qty?: string; dosage?: string; timing?: string; days?: string }>
  referredToHospital?: boolean
  hospitalPatientId?: string
  referredBy?: string
  consultedBy?: string
  consultationDate?: Date
  createdAt?: Date
  updatedAt?: Date
}

export const CampPatient = models.CampPatient || model('CampPatient', CampPatientSchema)
