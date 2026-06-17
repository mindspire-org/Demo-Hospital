import { Schema, model, models } from 'mongoose'

const BPSchema = new Schema({ systolic: Number, diastolic: Number }, { _id: false })
const GCSSchema = new Schema({ eye: Number, verbal: Number, motor: Number, total: Number }, { _id: false })
const IntakeSchema = new Schema({ oral: Number, iv: Number, ng: Number, total: Number }, { _id: false })
const OutputSchema = new Schema({ urine: Number, drain: Number, emesis: Number, total: Number }, { _id: false })
const VentilatorSchema = new Schema({
  mode: String,
  fio2: Number,
  peep: Number,
  tidalVolume: Number,
  rate: Number,
  pressureSupport: Number,
  flowRate: Number,
  ieRatio: String,
  pip: Number,
  plateauPressure: Number,
  minuteVolume: Number,
}, { _id: false })

const ICUFlowsheetSchema = new Schema({
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },
  recordedAt: { type: Date, default: Date.now, index: true },
  bp: BPSchema,
  hr: { type: Number },
  rr: { type: Number },
  temp: { type: Number },
  spo2: { type: Number },
  gcs: GCSSchema,
  pupils: { left: String, right: String },
  painScore: { type: Number, min: 0, max: 10 },
  sedationScore: { type: Number },
  intake: IntakeSchema,
  output: OutputSchema,
  cvp: { type: Number },
  artLine: { type: Number },
  ventilator: VentilatorSchema,
  notes: { type: String },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'Hospital_User' },
  shift: { type: String, enum: ['morning', 'evening', 'night'] },
}, { timestamps: true })

ICUFlowsheetSchema.index({ encounterId: 1, recordedAt: -1 })

export type ICUFlowsheetDoc = {
  _id: string
  encounterId: string
  recordedAt: Date
  bp?: { systolic?: number; diastolic?: number }
  hr?: number
  rr?: number
  temp?: number
  spo2?: number
  gcs?: { eye?: number; verbal?: number; motor?: number; total?: number }
  pupils?: { left?: string; right?: string }
  painScore?: number
  sedationScore?: number
  intake?: { oral?: number; iv?: number; ng?: number; total?: number }
  output?: { urine?: number; drain?: number; emesis?: number; total?: number }
  cvp?: number
  artLine?: number
  ventilator?: {
    mode?: string
    fio2?: number
    peep?: number
    tidalVolume?: number
    rate?: number
    pressureSupport?: number
    flowRate?: number
    ieRatio?: string
    pip?: number
    plateauPressure?: number
    minuteVolume?: number
  }
  notes?: string
  recordedBy?: string
  shift?: 'morning' | 'evening' | 'night'
  createdAt: Date
  updatedAt: Date
}

export const ICUFlowsheet = models.Hospital_ICUFlowsheet || model('Hospital_ICUFlowsheet', ICUFlowsheetSchema)
