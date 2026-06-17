import { Schema, models, model } from 'mongoose'

const IpdNewBornBabyNotesSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },

  date: { type: String },
  time: { type: String },

  // Patient's particulars
  patientName: { type: String },
  patientAge: { type: String },
  patientAddress: { type: String },
  gynaecologist: { type: String },
  anaesthetist: { type: String },
  otSister: { type: String },
  aya: { type: String },
  diagnosis: { type: String },
  operation: { type: String },
  anaesthesia: { type: String },
  babySex: { type: String },
  congenitalAbnormality: { type: String },

  // APGAR scores
  apgarScore1Min: { type: String },
  apgarScore5Min: { type: String },

  // Remarks & foot print
  remarks: { type: String },
  footPrintNotes: { type: String },

  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  doctorName: { type: String },
  recordedAt: { type: Date, default: Date.now, index: true },
  recordedBy: { type: String },
  signed: { type: Boolean, default: false },
  signedAt: { type: Date },
  signature: { type: String },
}, { timestamps: true })

IpdNewBornBabyNotesSchema.index({ encounterId: 1, recordedAt: -1 })

export const HospitalIpdNewBornBabyNotes =
  models.Hospital_IpdNewBornBabyNotes || model('Hospital_IpdNewBornBabyNotes', IpdNewBornBabyNotesSchema)
