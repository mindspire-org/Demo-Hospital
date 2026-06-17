import { Schema, model, models } from 'mongoose'

const TokenSchema = new Schema({
  dateIso: { type: String, index: true },
  tokenNo: { type: String, index: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', index: true },
  mrn: { type: String },
  patientName: { type: String },
  createdByUserId: { type: Schema.Types.ObjectId, ref: 'Hospital_User', index: true },
  createdByUsername: { type: String, index: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Department' },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  serviceIds: [{ type: Schema.Types.ObjectId, ref: 'Hospital_ErService' }],
  serviceNames: { type: String },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter' },
  corporateId: { type: Schema.Types.ObjectId, ref: 'Corporate_Company' },
  paidMethod: { type: String, enum: ['Cash','Bank','AR'], default: 'Cash', index: true },
  visitCategory: { type: String, enum: ['general','private','subsidized'], index: true },
  fee: { type: Number },
  discount: { type: Number, default: 0 },
  status: { type: String, enum: ['queued','in-progress','completed','returned','cancelled'], default: 'queued', index: true },
  // Scheduling fields (optional)
  scheduleId: { type: Schema.Types.ObjectId, ref: 'Hospital_DoctorSchedule', index: true },
  slotNo: { type: Number },
  slotStart: { type: String }, // HH:mm
  slotEnd: { type: String },   // HH:mm
  // FBR fields (optional)
  fbrInvoiceNo: { type: String },
  fbrQrCode: { type: String },
  fbrStatus: { type: String },
  fbrMode: { type: String },
  fbrError: { type: String },
  portal: { type: String, enum: ['hospital', 'reception', 'lab', 'diagnostic', 'pharmacy', 'aesthetic'], index: true },
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
}, { timestamps: true })

export type HospitalTokenDoc = {
  _id: string
  dateIso: string
  tokenNo: string
  patientId?: string
  mrn?: string
  patientName?: string
  createdByUserId?: string
  createdByUsername?: string
  departmentId?: string
  doctorId?: string
  serviceIds?: string[]
  serviceNames?: string
  encounterId?: string
  corporateId?: string
  paidMethod?: 'Cash'|'Bank'|'AR'
  visitCategory?: 'general'|'private'|'subsidized'
  fee?: number
  discount?: number
  status: 'queued'|'in-progress'|'completed'|'returned'|'cancelled'
  scheduleId?: string
  slotNo?: number
  slotStart?: string
  slotEnd?: string
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
}

export const HospitalToken = models.Hospital_Token || model('Hospital_Token', TokenSchema)
