import { Schema, model, models } from 'mongoose'

const IpdFluidBalanceSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true },
  // Date and shift
  date: { type: Date, required: true, index: true },
  shift: { type: String, enum: ['morning', 'evening', 'night'], lowercase: true, index: true },
  // Intake
  intake: {
    oral: { type: Number, default: 0 }, // ml
    ivFluids: [{
      name: { type: String }, // Normal Saline, D5W, Ringer's, etc.
      volume: { type: Number },
      rate: { type: String } // ml/hr
    }],
    ivTotal: { type: Number, default: 0 },
    tpn: { type: Number, default: 0 },
    bloodProducts: [{
      type: { type: String }, // PRBC, FFP, etc.
      volume: { type: Number }
    }],
    bloodTotal: { type: Number, default: 0 },
    medications: [{
      name: { type: String },
      volume: { type: Number }
    }],
    medicationTotal: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    otherDescription: { type: String },
    total: { type: Number, default: 0 }
  },
  // Output
  output: {
    urine: { type: Number, default: 0 }, // ml
    urineColor: { type: String },
    urineSpecificGravity: { type: Number },
    vomitus: { type: Number, default: 0 },
    vomitusDescription: { type: String },
    stool: { type: Number, default: 0 },
    stoolDescription: { type: String },
    drains: [{
      location: { type: String }, // abdominal, chest, etc.
      type: { type: String },
      volume: { type: Number }
    }],
    drainTotal: { type: Number, default: 0 },
    bloodLoss: { type: Number, default: 0 },
    bloodLossDescription: { type: String },
    other: { type: Number, default: 0 },
    otherDescription: { type: String },
    total: { type: Number, default: 0 }
  },
  // Balance
  netBalance: { type: Number, default: 0 }, // intake - output
  cumulativeBalance: { type: Number, default: 0 }, // running total since admission
  // Nursing
  recordedBy: { type: String },
  recordedAt: { type: Date, default: Date.now },
  verifiedBy: { type: String },
  notes: { type: String },
}, { timestamps: true })

IpdFluidBalanceSchema.index({ encounterId: 1, date: -1, shift: 1 })
IpdFluidBalanceSchema.index({ patientId: 1, date: -1 })

export type HospitalIpdFluidBalanceDoc = {
  _id: string
  patientId: string
  encounterId: string
  date: Date
  shift?: 'morning' | 'evening' | 'night'
  intake?: {
    oral?: number
    ivFluids?: Array<{ name?: string; volume?: number; rate?: string }>
    ivTotal?: number
    tpn?: number
    bloodProducts?: Array<{ type?: string; volume?: number }>
    bloodTotal?: number
    medications?: Array<{ name?: string; volume?: number }>
    medicationTotal?: number
    other?: number
    otherDescription?: string
    total?: number
  }
  output?: {
    urine?: number
    urineColor?: string
    urineSpecificGravity?: number
    vomitus?: number
    vomitusDescription?: string
    stool?: number
    stoolDescription?: string
    drains?: Array<{ location?: string; type?: string; volume?: number }>
    drainTotal?: number
    bloodLoss?: number
    bloodLossDescription?: string
    other?: number
    otherDescription?: string
    total?: number
  }
  netBalance?: number
  cumulativeBalance?: number
  recordedBy?: string
  recordedAt?: Date
  verifiedBy?: string
  notes?: string
}

export const HospitalIpdFluidBalance = models.Hospital_IpdFluidBalance || model('Hospital_IpdFluidBalance', IpdFluidBalanceSchema)
