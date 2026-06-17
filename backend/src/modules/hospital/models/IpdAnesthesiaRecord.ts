import { Schema, model, models } from 'mongoose'

const IpdAnesthesiaRecordSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true },
  surgeryRecordId: { type: Schema.Types.ObjectId, ref: 'Hospital_IpdSurgeryRecord' },
  // Anesthesia details
  anesthesiaType: {
    type: String,
    enum: ['general', 'regional', 'local', 'sedation', 'combined'],
  },
  anesthesiaTechnique: { type: String },
  inductionTime: { type: Date },
  // Induction Agents
  inductionAgents: [{
    drug: { type: String },
    dose: { type: String },
    route: { type: String },
  }],
  // Maintenance Agents
  maintenanceAgents: [{
    drug: { type: String },
    dose: { type: String },
    route: { type: String },
  }],
  // Airway Management
  airwayManagement: {
    type: { type: String },
    size: { type: String },
    technique: { type: String },
    grade: { type: String },
  },
  positioning: { type: String },
  // Monitoring during procedure (bucket pattern - one array per surgery)
  vitalPeriods: [{
    time: { type: Date },
    bp: { type: String },
    hr: { type: Number },
    rr: { type: String },
    spo2: { type: Number },
    etco2: { type: Number },
    temp: { type: Number },
    airwayPressure: { type: Number },
    drugs: { type: String },
    urineOutput: { type: String },
    bloodLoss: { type: String },
    fluidsGiven: { type: String },
  }],
  // Fluids & Blood
  fluidsGiven: [{
    type: { type: String },
    name: { type: String },
    volume: { type: String },
  }],
  bloodTransfused: [{
    type: { type: String },
    units: { type: Number },
    bloodGroup: { type: String },
  }],
  totalBloodLoss: { type: String },
  totalUrineOutput: { type: String },
  // Team
  anesthesiologistId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  anesthesiologistName: { type: String },
  anesthesiaAssistant: { type: String },
  // Status
  status: {
    type: String,
    enum: ['in-progress', 'completed'],
    default: 'in-progress',
    index: true,
  },
}, { timestamps: true })

IpdAnesthesiaRecordSchema.index({ encounterId: 1, inductionTime: -1 })
IpdAnesthesiaRecordSchema.index({ surgeryRecordId: 1 })

export type HospitalIpdAnesthesiaRecordDoc = {
  _id: string
  patientId: string
  encounterId: string
  surgeryRecordId?: string
  anesthesiaType?: 'general' | 'regional' | 'local' | 'sedation' | 'combined'
  anesthesiaTechnique?: string
  inductionTime?: Date
  inductionAgents?: Array<{ drug?: string; dose?: string; route?: string }>
  maintenanceAgents?: Array<{ drug?: string; dose?: string; route?: string }>
  airwayManagement?: { type?: string; size?: string; technique?: string; grade?: string }
  positioning?: string
  vitalPeriods?: Array<{
    time?: Date; bp?: string; hr?: number; rr?: string; spo2?: number; etco2?: number
    temp?: number; airwayPressure?: number; drugs?: string; urineOutput?: string
    bloodLoss?: string; fluidsGiven?: string
  }>
  fluidsGiven?: Array<{ type?: string; name?: string; volume?: string }>
  bloodTransfused?: Array<{ type?: string; units?: number; bloodGroup?: string }>
  totalBloodLoss?: string
  totalUrineOutput?: string
  anesthesiologistId?: string
  anesthesiologistName?: string
  anesthesiaAssistant?: string
  status?: 'in-progress' | 'completed'
}

export const HospitalIpdAnesthesiaRecord = models.Hospital_IpdAnesthesiaRecord || model('Hospital_IpdAnesthesiaRecord', IpdAnesthesiaRecordSchema)
