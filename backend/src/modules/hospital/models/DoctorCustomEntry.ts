import { Schema, model, models } from 'mongoose'

const DoctorCustomEntrySchema = new Schema({
  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor', required: true, index: true },
  category: { 
    type: String, 
    required: true,
    enum: [
      'primaryComplaint',
      'history',
      'primaryComplaintHistory',
      'familyHistory',
      'allergyHistory',
      'treatmentHistory',
      'examFindings',
      'diagnosis',
      'advice'
    ],
    index: true
  },
  entryText: { type: String, required: true },
}, { timestamps: true })

// Compound index for efficient queries
DoctorCustomEntrySchema.index({ doctorId: 1, category: 1 })

export type DoctorCustomEntryDoc = {
  _id: string
  doctorId: string
  category: string
  entryText: string
  createdAt: Date
  updatedAt: Date
}

export const DoctorCustomEntry = models.Doctor_CustomEntry || model('Doctor_CustomEntry', DoctorCustomEntrySchema)
