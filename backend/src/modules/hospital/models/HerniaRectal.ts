import mongoose, { Schema, Document } from 'mongoose'

export interface IHerniaRectal extends Document {
  patientId: mongoose.Types.ObjectId
  encounterId: mongoose.Types.ObjectId
  doctorId: mongoose.Types.ObjectId
  
  // Hernia History
  herniaPresent: boolean
  herniaType?: string
  herniaLocation?: string
  herniaDuration?: string
  reducible: boolean
  pain: boolean
  painDetails?: string
  bowelSymptoms: boolean
  bowelSymptomsDetails?: string
  previousSurgery: boolean
  previousSurgeryDetails?: string
  
  // Rectal History
  constipation: boolean
  constipationDuration?: string
  bleedingPerRectum: boolean
  bleedingDetails?: string
  painDefecation: boolean
  tenesmus: boolean
  mucusDischarge: boolean
  fecalIncontinence: boolean
  changeInBowelHabits: boolean
  changeDetails?: string
  
  // Physical Examination
  abdominalExamination: string
  herniaExamination: string
  coughImpulse: boolean
  herniaReducibility: string
  herniaSize: string
  skinChanges: boolean
  rectalExamination: string
  analTone: string
  hemorrhoids: boolean
  fissure: boolean
  fistula: boolean
  rectalMass: boolean
  prostateExamination?: string
  
  // Diagnostic Tests
  ultrasoundFindings?: string
  ctScanFindings?: string
  mriFindings?: string
  colonoscopyFindings?: string
  analManometry?: string
  defecography?: string
  
  // Diagnosis
  primaryDiagnosis: string
  secondaryDiagnosis?: string
  
  // Treatment
  conservativeManagement?: string
  surgicalPlan?: string
  procedureType?: string
  medications: Array<{
    name: string
    dosage: string
    frequency: string
    duration: string
  }>
  
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const HerniaRectalSchema = new Schema<IHerniaRectal>({
  patientId: { type: Schema.Types.ObjectId, ref: 'LabPatient', required: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'HospitalEncounter', required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'HospitalDoctor', required: true },
  
  herniaPresent: { type: Boolean, default: false },
  herniaType: String,
  herniaLocation: String,
  herniaDuration: String,
  reducible: { type: Boolean, default: false },
  pain: { type: Boolean, default: false },
  painDetails: String,
  bowelSymptoms: { type: Boolean, default: false },
  bowelSymptomsDetails: String,
  previousSurgery: { type: Boolean, default: false },
  previousSurgeryDetails: String,
  
  constipation: { type: Boolean, default: false },
  constipationDuration: String,
  bleedingPerRectum: { type: Boolean, default: false },
  bleedingDetails: String,
  painDefecation: { type: Boolean, default: false },
  tenesmus: { type: Boolean, default: false },
  mucusDischarge: { type: Boolean, default: false },
  fecalIncontinence: { type: Boolean, default: false },
  changeInBowelHabits: { type: Boolean, default: false },
  changeDetails: String,
  
  abdominalExamination: String,
  herniaExamination: String,
  coughImpulse: { type: Boolean, default: false },
  herniaReducibility: String,
  herniaSize: String,
  skinChanges: { type: Boolean, default: false },
  rectalExamination: String,
  analTone: String,
  hemorrhoids: { type: Boolean, default: false },
  fissure: { type: Boolean, default: false },
  fistula: { type: Boolean, default: false },
  rectalMass: { type: Boolean, default: false },
  prostateExamination: String,
  
  ultrasoundFindings: String,
  ctScanFindings: String,
  mriFindings: String,
  colonoscopyFindings: String,
  analManometry: String,
  defecography: String,
  
  primaryDiagnosis: { type: String, required: true },
  secondaryDiagnosis: String,
  
  conservativeManagement: String,
  surgicalPlan: String,
  procedureType: String,
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    duration: String
  }],
  
  notes: String
}, { timestamps: true })

export const HerniaRectal = mongoose.model<IHerniaRectal>('HerniaRectal', HerniaRectalSchema)
