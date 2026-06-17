import { Schema, models, model } from 'mongoose'

const IpdPressureUlcerRiskSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },

  // Braden Scale scores (1-4 each, except frictionShear 1-3)
  sensoryPerception: { type: Number, min: 1, max: 4 },
  moisture: { type: Number, min: 1, max: 4 },
  activity: { type: Number, min: 1, max: 4 },
  mobility: { type: Number, min: 1, max: 4 },
  nutrition: { type: Number, min: 1, max: 4 },
  frictionShear: { type: Number, min: 1, max: 3 },

  // Computed on save or read; stored for query convenience
  totalScore: { type: Number },
  riskLevel: { type: String, enum: ['high', 'moderate', 'low'] },

  notes: { type: String },
  others: { type: String },

  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  doctorName: { type: String },
  recordedAt: { type: Date, default: Date.now, index: true },
  recordedBy: { type: String },
  signed: { type: Boolean, default: false },
  signedAt: { type: Date },
  signature: { type: String },
}, { timestamps: true })

IpdPressureUlcerRiskSchema.index({ encounterId: 1, recordedAt: -1 })

// Auto-compute totalScore and riskLevel before save
IpdPressureUlcerRiskSchema.pre('save', function () {
  const total =
    (this.sensoryPerception || 0) +
    (this.moisture || 0) +
    (this.activity || 0) +
    (this.mobility || 0) +
    (this.nutrition || 0) +
    (this.frictionShear || 0)
  this.totalScore = total
  if (total <= 14) this.riskLevel = 'high'
  else if (total <= 18) this.riskLevel = 'moderate'
  else this.riskLevel = 'low'
})

export const HospitalIpdPressureUlcerRisk =
  models.Hospital_IpdPressureUlcerRisk || model('Hospital_IpdPressureUlcerRisk', IpdPressureUlcerRiskSchema)
