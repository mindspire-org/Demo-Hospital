import { Schema, model, models } from 'mongoose'

const EquipmentSchema = new Schema({
  code: { type: String },
  name: { type: String, required: true },
  category: { type: String },
  make: { type: String },
  model: { type: String },
  serialNo: { type: String },
  purchaseDate: { type: String }, // YYYY-MM-DD (Legacy, preferring new fields)
  cost: { type: Number },          // Legacy, renamed in v2 as purchaseCost
  vendorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Vendor' }, // Legacy

  // NEW: Purchase Information (v2)
  condition: { type: String, enum: ['New', 'Used', 'Refurbished'], default: 'New' },
  purchaseOrderNo: { type: String },
  invoiceNo: { type: String },
  purchaseCost: { type: Number },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Hospital_EquipmentSupplier' },
  
  // NEW: Company/Warranty
  manufacturingCompany: { type: String },
  warrantyStart: { type: String }, // YYYY-MM-DD
  warrantyEnd: { type: String },   // YYYY-MM-DD
  warrantyTerms: { type: String },
  amcProviderId: { type: Schema.Types.ObjectId, ref: 'Hospital_EquipmentSupplier' },

  // NEW: Technical Specifications
  specifications: { type: Map, of: String },
  powerRequirements: { type: String },
  dimensions: { type: String },
  weight: { type: Number },

  // NEW: Financial/Lifecycle
  depreciationMethod: { type: String, enum: ['StraightLine', 'ReducingBalance'] },
  depreciationRate: { type: Number },
  currentBookValue: { type: Number },
  salvageValue: { type: Number },
  commissionDate: { type: String },
  decommissionDate: { type: String },
  expectedLifeYears: { type: Number },

  // NEW: Assets
  assetTag: { type: String },
  barcode: { type: String },
  rfidTag: { type: String },
  attachments: [{ type: String }],
  isActive: { type: Boolean, default: true },

  locationDepartmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Department' },
  custodian: { type: String },
  installDate: { type: String }, // YYYY-MM-DD
  amcStart: { type: String },
  amcEnd: { type: String },
  requiresCalibration: { type: Boolean, default: false },
  calibFrequencyMonths: { type: Number },
  ppmFrequencyMonths: { type: Number },
  criticality: { type: String, enum: ['critical','high','medium','low'], default: 'medium' },
  status: { type: String, enum: ['Working','UnderMaintenance','NotWorking','Condemned','Spare'], default: 'Working' },
  nextPpmDue: { type: String }, // YYYY-MM-DD
  nextCalibDue: { type: String }, // YYYY-MM-DD
  lastPpmDoneAt: { type: String }, // YYYY-MM-DD
  lastCalibDoneAt: { type: String }, // YYYY-MM-DD
}, { timestamps: true })

export type HospitalEquipmentDoc = {
  _id: string
  code?: string
  name: string
  category?: string
  make?: string
  model?: string
  serialNo?: string
  purchaseDate?: string
  cost?: number
  
  // v2 fields
  condition: 'New' | 'Used' | 'Refurbished'
  purchaseOrderNo?: string
  invoiceNo?: string
  purchaseCost?: number
  supplierId?: string
  manufacturingCompany?: string
  warrantyStart?: string
  warrantyEnd?: string
  warrantyTerms?: string
  amcProviderId?: string
  specifications?: Record<string, string>
  powerRequirements?: string
  dimensions?: string
  weight?: number
  depreciationMethod?: 'StraightLine' | 'ReducingBalance'
  depreciationRate?: number
  currentBookValue?: number
  salvageValue?: number
  commissionDate?: string
  decommissionDate?: string
  expectedLifeYears?: number
  assetTag?: string
  barcode?: string
  rfidTag?: string
  attachments?: string[]
  isActive: boolean

  vendorId?: string
  locationDepartmentId?: string
  custodian?: string
  installDate?: string
  amcStart?: string
  amcEnd?: string
  requiresCalibration?: boolean
  calibFrequencyMonths?: number
  ppmFrequencyMonths?: number
  criticality?: 'critical'|'high'|'medium'|'low'
  status: 'Working'|'UnderMaintenance'|'NotWorking'|'Condemned'|'Spare'
  nextPpmDue?: string
  nextCalibDue?: string
  lastPpmDoneAt?: string
  lastCalibDoneAt?: string
}

export const HospitalEquipment = models.Hospital_Equipment || model('Hospital_Equipment', EquipmentSchema)
