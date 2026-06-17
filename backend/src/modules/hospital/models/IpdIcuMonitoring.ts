import { Schema, model, models } from 'mongoose'

const IpdIcuMonitoringSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true },
  icuAdmissionId: { type: Schema.Types.ObjectId, ref: 'Hospital_ICUAdmission' },
  // Timestamp
  recordedAt: { type: Date, default: Date.now, index: true },
  shift: { type: String, enum: ['morning', 'evening', 'night'], lowercase: true },
  // Vital signs
  vitals: {
    bp: { type: String },
    map: { type: Number }, // Mean Arterial Pressure
    hr: { type: Number },
    hrRhythm: { type: String, enum: ['regular', 'irregular', 'paced'] },
    rr: { type: Number },
    temp: { type: Number },
    tempRoute: { type: String, enum: ['oral', 'axillary', 'rectal', 'tympanic'] },
    spo2: { type: Number },
    spo2On: { type: String, enum: ['room-air', 'oxygen', 'ventilator'] },
    etco2: { type: Number },
  },
  // Neurological
  neurological: {
    gcs: {
      eye: { type: Number, min: 1, max: 4 },
      verbal: { type: Number, min: 1, max: 5 },
      motor: { type: Number, min: 1, max: 6 },
      total: { type: Number, min: 3, max: 15 }
    },
    pupils: {
      left: { size: { type: Number }, reaction: { type: String } },
      right: { size: { type: Number }, reaction: { type: String } }
    },
    sedationScore: { type: String }, // RASS or similar
    sedationAgent: { type: String },
    levelOfConsciousness: { type: String }
  },
  // Respiratory/Ventilator
  ventilator: {
    mode: { type: String }, // AC, SIMV, PS, CPAP, etc.
    fio2: { type: Number }, // %
    tidalVolume: { type: Number }, // ml
    respiratoryRate: { type: Number }, // set rate
    peep: { type: Number }, // cmH2O
    peakPressure: { type: Number }, // cmH2O
    plateauPressure: { type: Number },
    compliance: { type: Number },
    minuteVolume: { type: Number },
    ieRatio: { type: String },
    psSupport: { type: Number },
    sigh: { type: Boolean },
    alarms: [{ type: String }]
  },
  // Hemodynamic monitoring
  hemodynamic: {
    cvp: { type: Number }, // Central Venous Pressure
    pap: { type: Number }, // Pulmonary Artery Pressure
    pcwp: { type: Number }, // Pulmonary Capillary Wedge Pressure
    co: { type: Number }, // Cardiac Output
    ci: { type: Number }, // Cardiac Index
    svr: { type: Number }, // Systemic Vascular Resistance
    inotropes: [{
      drug: { type: String },
      dose: { type: String },
      route: { type: String }
    }]
  },
  // Renal
  renal: {
    urineOutput: { type: Number }, // ml
    urineColor: { type: String },
    urineSpecificGravity: { type: Number },
    dialysisType: { type: String, enum: ['hemodialysis', 'peritoneal', 'CRRT', 'none'] },
    dialysisDuration: { type: Number }, // minutes
    fluidRemoved: { type: Number } // ml
  },
  // Intake/Output summary
  fluidBalance: {
    intake: {
      oral: { type: Number },
      iv: { type: Number },
      tpn: { type: Number },
      blood: { type: Number },
      medications: { type: Number },
      total: { type: Number }
    },
    output: {
      urine: { type: Number },
      drain: { type: Number },
      vomitus: { type: Number },
      stool: { type: Number },
      bloodLoss: { type: Number },
      total: { type: Number }
    },
    netBalance: { type: Number },
    cumulativeBalance: { type: Number }
  },
  // Lines and tubes
  lines: [{
    type: { type: String, enum: ['CVP', 'Arterial', 'PICC', 'Peripheral IV', 'Dialysis'] },
    site: { type: String },
    insertedAt: { type: Date },
    daysInSitu: { type: Number },
    condition: { type: String }
  }],
  tubes: [{
    type: { type: String, enum: ['ETT', 'Tracheostomy', 'NGT', 'Chest Tube', 'Foley', 'Drain'] },
    site: { type: String },
    size: { type: String },
    insertedAt: { type: Date },
    daysInSitu: { type: Number },
    condition: { type: String }
  }],
  // Drains
  drains: [{
    location: { type: String },
    type: { type: String },
    output: { type: Number },
    color: { type: String },
    notes: { type: String }
  }],
  // Wounds
  wounds: [{
    location: { type: String },
    type: { type: String },
    size: { type: String },
    appearance: { type: String },
    dressingType: { type: String },
    dressingChanged: { type: Boolean }
  }],
  // Nursing care
  nursingCare: {
    position: { type: String },
    repositioningDone: { type: Boolean },
    mouthCareDone: { type: Boolean },
    eyeCareDone: { type: Boolean },
    skinCareDone: { type: Boolean },
    physiotherapyDone: { type: Boolean }
  },
  // Scores
  scores: {
    apacheII: { type: Number },
    sofa: { type: Number },
    glasgow: { type: Number },
    nrs: { type: Number } // Nutrition Risk Score
  },
  // Staff
  recordedBy: { type: String },
  verifiedBy: { type: String },
  notes: { type: String },
}, { timestamps: true })

IpdIcuMonitoringSchema.index({ encounterId: 1, recordedAt: -1 })
IpdIcuMonitoringSchema.index({ icuAdmissionId: 1, recordedAt: -1 })

// Transform to omit empty arrays
IpdIcuMonitoringSchema.set('toJSON', {
  transform: function(doc, ret: any) {
    if (Array.isArray(ret.lines) && ret.lines.length === 0) ret.lines = undefined
    if (Array.isArray(ret.tubes) && ret.tubes.length === 0) ret.tubes = undefined
    if (Array.isArray(ret.drains) && ret.drains.length === 0) ret.drains = undefined
    if (Array.isArray(ret.wounds) && ret.wounds.length === 0) ret.wounds = undefined
    if (ret.ventilator && Array.isArray(ret.ventilator.alarms) && ret.ventilator.alarms.length === 0) ret.ventilator.alarms = undefined
    if (ret.hemodynamic && Array.isArray(ret.hemodynamic.inotropes) && ret.hemodynamic.inotropes.length === 0) ret.hemodynamic.inotropes = undefined
    return ret
  }
})

export type HospitalIpdIcuMonitoringDoc = {
  _id: string
  patientId: string
  encounterId: string
  icuAdmissionId?: string
  recordedAt: Date
  shift?: 'morning' | 'evening' | 'night'
  vitals?: {
    bp?: string
    map?: number
    hr?: number
    hrRhythm?: 'regular' | 'irregular' | 'paced'
    rr?: number
    temp?: number
    tempRoute?: 'oral' | 'axillary' | 'rectal' | 'tympanic'
    spo2?: number
    spo2On?: 'room-air' | 'oxygen' | 'ventilator'
    etco2?: number
  }
  neurological?: {
    gcs?: { eye?: number; verbal?: number; motor?: number; total?: number }
    pupils?: { left?: { size?: number; reaction?: string }; right?: { size?: number; reaction?: string } }
    sedationScore?: string
    sedationAgent?: string
    levelOfConsciousness?: string
  }
  ventilator?: {
    mode?: string
    fio2?: number
    tidalVolume?: number
    respiratoryRate?: number
    peep?: number
    peakPressure?: number
    plateauPressure?: number
    compliance?: number
    minuteVolume?: number
    ieRatio?: string
    psSupport?: number
    sigh?: boolean
    alarms?: string[]
  }
  hemodynamic?: {
    cvp?: number
    pap?: number
    pcwp?: number
    co?: number
    ci?: number
    svr?: number
    inotropes?: Array<{ drug?: string; dose?: string; route?: string }>
  }
  renal?: {
    urineOutput?: number
    urineColor?: string
    urineSpecificGravity?: number
    dialysisType?: 'hemodialysis' | 'peritoneal' | 'CRRT' | 'none'
    dialysisDuration?: number
    fluidRemoved?: number
  }
  fluidBalance?: {
    intake?: { oral?: number; iv?: number; tpn?: number; blood?: number; medications?: number; total?: number }
    output?: { urine?: number; drain?: number; vomitus?: number; stool?: number; bloodLoss?: number; total?: number }
    netBalance?: number
    cumulativeBalance?: number
  }
  lines?: Array<{
    type?: 'CVP' | 'Arterial' | 'PICC' | 'Peripheral IV' | 'Dialysis'
    site?: string
    insertedAt?: Date
    daysInSitu?: number
    condition?: string
  }>
  tubes?: Array<{
    type?: 'ETT' | 'Tracheostomy' | 'NGT' | 'Chest Tube' | 'Foley' | 'Drain'
    site?: string
    size?: string
    insertedAt?: Date
    daysInSitu?: number
    condition?: string
  }>
  drains?: Array<{ location?: string; type?: string; output?: number; color?: string; notes?: string }>
  wounds?: Array<{
    location?: string
    type?: string
    size?: string
    appearance?: string
    dressingType?: string
    dressingChanged?: boolean
  }>
  nursingCare?: {
    position?: string
    repositioningDone?: boolean
    mouthCareDone?: boolean
    eyeCareDone?: boolean
    skinCareDone?: boolean
    physiotherapyDone?: boolean
  }
  scores?: { apacheII?: number; sofa?: number; glasgow?: number; nrs?: number }
  recordedBy?: string
  verifiedBy?: string
  notes?: string
}

export const HospitalIpdIcuMonitoring = models.Hospital_IpdIcuMonitoring || model('Hospital_IpdIcuMonitoring', IpdIcuMonitoringSchema)
