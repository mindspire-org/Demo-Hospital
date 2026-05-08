import { Schema, model, models } from 'mongoose'

const PackageTestSchema = new Schema({
  testId: { type: String, required: true },
  testName: { type: String, required: true },
  price: { type: Number, default: 0 },
}, { _id: false })

const TestPackageSchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  tests: { type: [PackageTestSchema], default: [] },
  price: { type: Number, default: 0 },
  discountPct: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

export type LabTestPackageDoc = {
  _id: string
  name: string
  description?: string
  tests: Array<{ testId: string; testName: string; price: number }>
  price: number
  discountPct: number
  isActive: boolean
}

export const LabTestPackage = models.Lab_TestPackage || model('Lab_TestPackage', TestPackageSchema)
