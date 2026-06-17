import { Schema, models, model } from 'mongoose'

const AssessmentEntrySchema = new Schema({
  date: { type: String },
  size: { type: String },
  depth: { type: String },
  edge: {
    clearVisible: { type: Boolean },
    attachedToWoundBase: { type: Boolean },
    fibroticScarred: { type: Boolean },
  },
  undermining: { type: String },
  necroticTissue: { type: String },
  slough: { type: String },
  eschar: { type: String },
  exudate: {
    serous: { type: Boolean },
    serosanguinous: { type: Boolean },
    purulent: { type: Boolean },
  },
  granulation: {
    healthy: { type: Boolean },
    septic: { type: Boolean },
  },
  epithelialization: { type: String },
  surroundingSkin: {
    brightRed: { type: Boolean },
    blanchable: { type: Boolean },
    edematous: { type: Boolean },
    indurated: { type: Boolean },
  },
  stageOfPressureUlcer: { type: String },
  nurseSignatureId: { type: String },
}, { _id: false })

const IpdDailyUlcerAssessmentSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },

  assessments: { type: [AssessmentEntrySchema], default: [] },
  others: { type: String },

  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  doctorName: { type: String },
  recordedAt: { type: Date, default: Date.now, index: true },
  recordedBy: { type: String },
  signed: { type: Boolean, default: false },
  signedAt: { type: Date },
  signature: { type: String },
}, { timestamps: true })

IpdDailyUlcerAssessmentSchema.index({ encounterId: 1, recordedAt: -1 })

export const HospitalIpdDailyUlcerAssessment =
  models.Hospital_IpdDailyUlcerAssessment || model('Hospital_IpdDailyUlcerAssessment', IpdDailyUlcerAssessmentSchema)
