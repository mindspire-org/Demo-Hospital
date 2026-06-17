import { Schema, model, models, Types } from 'mongoose'

const NurseProfileSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'Hospital_User', required: true, unique: true, index: true },
  licenseNumber: { type: String, required: true, trim: true },
  specialization: { 
    type: String, 
    enum: ['General Ward', 'ICU', 'OT', 'Emergency', 'Pediatrics', 'Oncology', 'Cardiology', 'Orthopedics', 'Neurology', 'NICU', 'Dialysis', 'None'],
    default: 'General Ward'
  },
  department: { type: String, trim: true },
  shiftPreference: { 
    type: String, 
    enum: ['morning', 'evening', 'night', 'rotating'],
    default: 'rotating'
  },
  maxPatientsPerShift: { type: Number, default: 10, min: 1, max: 50 },
  certifications: [{ type: String }],
  joiningDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true, index: true },
  contactInfo: {
    phone: String,
    emergencyContact: String,
    address: String
  },
  qualifications: [{
    degree: String,
    institution: String,
    year: Number
  }],
  notes: { type: String }
}, { timestamps: true, collection: 'hospital_nurse_profiles' })

NurseProfileSchema.index({ specialization: 1, isActive: 1 })
NurseProfileSchema.index({ department: 1 })

export type NurseProfileDoc = {
  _id: string
  userId: string
  licenseNumber: string
  specialization: 'General Ward' | 'ICU' | 'OT' | 'Emergency' | 'Pediatrics' | 'Oncology' | 'Cardiology' | 'Orthopedics' | 'Neurology' | 'NICU' | 'Dialysis' | 'None'
  department?: string
  shiftPreference: 'morning' | 'evening' | 'night' | 'rotating'
  maxPatientsPerShift: number
  certifications: string[]
  joiningDate: Date
  isActive: boolean
  contactInfo?: {
    phone?: string
    emergencyContact?: string
    address?: string
  }
  qualifications?: Array<{
    degree: string
    institution: string
    year: number
  }>
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export const NurseProfile = models.Hospital_NurseProfile || model('Hospital_NurseProfile', NurseProfileSchema)
