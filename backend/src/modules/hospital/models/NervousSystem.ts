import mongoose, { Schema, Document } from 'mongoose'

export interface INervousSystem extends Document {
  patientId: mongoose.Types.ObjectId
  encounterId: mongoose.Types.ObjectId
  doctorId: mongoose.Types.ObjectId
  
  // History
  headache: boolean
  headacheDetails?: string
  seizures: boolean
  seizureDetails?: string
  lossOfConsciousness: boolean
  locDetails?: string
  weakness: boolean
  weaknessDetails?: string
  numbness: boolean
  numbnessDetails?: string
  visionChanges: boolean
  visionDetails?: string
  speechChanges: boolean
  speechDetails?: string
  memoryChanges: boolean
  memoryDetails?: string
  gaitChanges: boolean
  gaitDetails?: string
  tremors: boolean
  tremorDetails?: string
  
  // Mental Status
  mentalStatus: string
  orientation: string
  speech: string
  mood: string
  affect: string
  thoughtProcess: string
  
  // Cranial Nerves
  cranialNerves: string
  cranialNerveDeficits?: string
  
  // Motor Examination
  muscleBulk: string
  muscleTone: string
  muscleStrength: string
  coordination: string
  abnormalMovements: string
  
  // Sensory Examination
  lightTouch: string
  pain: string
  temperature: string
  vibration: string
  proprioception: string
  
  // Reflexes
  deepTendonReflexes: string
  superficialReflexes: string
  plantarResponse: string
  
  // Diagnostic Tests
  ctBrainFindings?: string
  mriBrainFindings?: string
  eegFindings?: string
  nerveConductionStudies?: string
  emgFindings?: string
  
  // Diagnosis
  primaryDiagnosis: string
  secondaryDiagnosis?: string
  
  // Treatment
  medications: Array<{
    name: string
    dosage: string
    frequency: string
    duration: string
  }>
  physiotherapy?: string
  rehabilitationPlan?: string
  
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const NervousSystemSchema = new Schema<INervousSystem>({
  patientId: { type: Schema.Types.ObjectId, ref: 'LabPatient', required: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'HospitalEncounter', required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'HospitalDoctor', required: true },
  
  headache: { type: Boolean, default: false },
  headacheDetails: String,
  seizures: { type: Boolean, default: false },
  seizureDetails: String,
  lossOfConsciousness: { type: Boolean, default: false },
  locDetails: String,
  weakness: { type: Boolean, default: false },
  weaknessDetails: String,
  numbness: { type: Boolean, default: false },
  numbnessDetails: String,
  visionChanges: { type: Boolean, default: false },
  visionDetails: String,
  speechChanges: { type: Boolean, default: false },
  speechDetails: String,
  memoryChanges: { type: Boolean, default: false },
  memoryDetails: String,
  gaitChanges: { type: Boolean, default: false },
  gaitDetails: String,
  tremors: { type: Boolean, default: false },
  tremorDetails: String,
  
  mentalStatus: String,
  orientation: String,
  speech: String,
  mood: String,
  affect: String,
  thoughtProcess: String,
  
  cranialNerves: String,
  cranialNerveDeficits: String,
  
  muscleBulk: String,
  muscleTone: String,
  muscleStrength: String,
  coordination: String,
  abnormalMovements: String,
  
  lightTouch: String,
  pain: String,
  temperature: String,
  vibration: String,
  proprioception: String,
  
  deepTendonReflexes: String,
  superficialReflexes: String,
  plantarResponse: String,
  
  ctBrainFindings: String,
  mriBrainFindings: String,
  eegFindings: String,
  nerveConductionStudies: String,
  emgFindings: String,
  
  primaryDiagnosis: { type: String, required: true },
  secondaryDiagnosis: String,
  
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    duration: String
  }],
  physiotherapy: String,
  rehabilitationPlan: String,
  
  notes: String
}, { timestamps: true })

export const NervousSystem = mongoose.model<INervousSystem>('NervousSystem', NervousSystemSchema)
