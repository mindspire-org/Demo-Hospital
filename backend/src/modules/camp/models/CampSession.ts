import { Schema, model, models } from 'mongoose'

const CampSessionSchema = new Schema({
  campId: { type: Schema.Types.ObjectId, ref: 'Camp', required: true, index: true },
  date: { type: Date, required: true },
  doctorsAssigned: { type: Number, default: 0 },
  nursesAssigned: { type: Number, default: 0 },
  pharmacistsAssigned: { type: Number, default: 0 },
  labTechsAssigned: { type: Number, default: 0 },
  patientsRegistered: { type: Number, default: 0 },
  patientsConsulted: { type: Number, default: 0 },
  prescriptionsIssued: { type: Number, default: 0 },
  labOrdersSent: { type: Number, default: 0 },
  diagnosticOrdersSent: { type: Number, default: 0 },
  medicinesDispensed: { type: Number, default: 0 },
  notes: { type: String, default: '' },
}, { timestamps: true })

CampSessionSchema.index({ campId: 1, date: 1 }, { unique: true })

export type CampSessionDoc = {
  _id: string
  campId: string
  date: Date
  doctorsAssigned?: number
  nursesAssigned?: number
  pharmacistsAssigned?: number
  labTechsAssigned?: number
  patientsRegistered?: number
  patientsConsulted?: number
  prescriptionsIssued?: number
  labOrdersSent?: number
  diagnosticOrdersSent?: number
  medicinesDispensed?: number
  notes?: string
  createdAt?: Date
  updatedAt?: Date
}

export const CampSession = models.CampSession || model('CampSession', CampSessionSchema)
