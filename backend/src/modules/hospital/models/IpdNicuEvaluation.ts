import { Schema, models, model } from 'mongoose'

const IpdNicuEvaluationSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },

  gpe: { type: String },
  colour: { type: String },
  af: { type: String },
  afTension: { type: String },
  ofc: { type: String },
  weight: { type: String },
  eyes: { type: String },
  ear: { type: String },
  nose: { type: String },
  oralCavity: { type: String },
  chestAbdomen: { type: String },
  cord: { type: String },
  genetalia: { type: String },
  testies: { type: String },
  backSpine: { type: String },
  analOpening: { type: String },
  handFoot: { type: String },
  others: { type: String },

  vitals: {
    hr: { type: String },
    rr: { type: String },
    spo2: { type: String },
  },

  neonatalReflexes: { type: String },
  sucking: { type: String },
  routing: { type: String },
  syestemic: { type: String },
  cvs: { type: String },
  cns: { type: String },
  resp: { type: String },
  git: { type: String },
  adv: { type: String },

  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  doctorName: { type: String },
  recordedAt: { type: Date, default: Date.now, index: true },
  recordedBy: { type: String },
  signed: { type: Boolean, default: false },
  signedAt: { type: Date },
  signature: { type: String },
}, { timestamps: true })

IpdNicuEvaluationSchema.index({ encounterId: 1, recordedAt: -1 })

export const HospitalIpdNicuEvaluation =
  models.Hospital_IpdNicuEvaluation || model('Hospital_IpdNicuEvaluation', IpdNicuEvaluationSchema)
