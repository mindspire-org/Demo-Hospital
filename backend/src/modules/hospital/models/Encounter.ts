import { Schema, model, models } from 'mongoose'

const EncounterSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  type: { type: String, enum: ['OPD','IPD','ER'], required: true, index: true },
  status: { type: String, required: true, index: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Department', required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  corporateId: { type: Schema.Types.ObjectId, ref: 'Corporate_Company' },
  corporatePreAuthNo: { type: String },
  corporateCoPayPercent: { type: Number },
  corporateCoverageCap: { type: Number },
  startAt: { type: Date, default: Date.now },
  endAt: { type: Date },
  // OPD
  visitType: { type: String, enum: ['new','followup'] },
  consultationFeeResolved: { type: Number },
  feeSource: { type: String },
  paymentRef: { type: String },
  // IPD
  admissionNo: { type: String, index: true },
  wardId: { type: String },
  bedId: { type: String },
  deposit: { type: Number },
  tokenId: { type: Schema.Types.ObjectId, ref: 'Hospital_Token' },
  // ER-specific fields
  triage: { type: String, enum: ['red', 'yellow', 'green'], index: true },
  arrivalMode: { type: String, enum: ['walk-in', 'ambulance', 'referral'] },
  chiefComplaint: { type: String },
  disposition: { type: String, enum: ['discharged', 'admitted', 'transferred', 'left-against-advice', 'expired'] },
}, { timestamps: true })

EncounterSchema.index({ patientId: 1, startAt: -1 })
EncounterSchema.index({ doctorId: 1, startAt: -1 })

export type HospitalEncounterDoc = {
  _id: string
  patientId: string
  type: 'OPD'|'IPD'|'ER'
  status: string
  departmentId: string
  doctorId?: string
  corporateId?: string
  corporatePreAuthNo?: string
  corporateCoPayPercent?: number
  corporateCoverageCap?: number
  startAt: Date
  endAt?: Date
  visitType?: 'new'|'followup'
  consultationFeeResolved?: number
  feeSource?: string
  paymentRef?: string
  admissionNo?: string
  wardId?: string
  bedId?: string
  deposit?: number
  tokenId?: string
  // ER-specific fields
  triage?: 'red'|'yellow'|'green'
  arrivalMode?: 'walk-in'|'ambulance'|'referral'
  chiefComplaint?: string
  disposition?: 'discharged'|'admitted'|'transferred'|'left-against-advice'|'expired'
}

export const HospitalEncounter = models.Hospital_Encounter || model('Hospital_Encounter', EncounterSchema)
