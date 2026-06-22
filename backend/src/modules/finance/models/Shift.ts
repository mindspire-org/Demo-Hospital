import { Schema, model, Types } from 'mongoose'

export interface ShiftDoc {
  _id: Types.ObjectId
  shiftType: 'morning' | 'evening' | 'night' | 'custom'
  shiftName: string
  counterId: string
  counterName: string
  
  // Opening
  openedBy: {
    userId: string
    username: string
    at: Date
  }
  openingFloat: number
  
  // Closing
  closedBy?: {
    userId: string
    username: string
    at: Date
  }
  closingCash?: number
  
  // Collections by module
  collections: {
    opd: number
    lab: number
    pharmacy: number
    ipd: number
    er: number
    diagnostic: number
    dialysis: number
    aesthetic: number
    cafeteria: number
    total: number
  }
  
  // Expenses
  expenses: {
    doctorPayouts: number
    purchases: number
    pettyCash: number
    refunds: number
    total: number
  }
  
  // Cash reconciliation
  expectedCash: number
  actualCash: number
  variance: number
  varianceReason?: string
  
  // Status
  status: 'open' | 'closing' | 'closed' | 'reconciled'
  
  // Handover
  handoverTo?: {
    userId: string
    username: string
    at: Date
  }
  
  // Timestamps
  startTime: Date
  endTime?: Date
  
  // Metadata
  notes?: string
  vouchers: string[]
  attachments: string[]
  
  createdAt: Date
  updatedAt: Date
}

const ShiftSchema = new Schema<ShiftDoc>({
  shiftType: { type: String, enum: ['morning', 'evening', 'night', 'custom'], required: true },
  shiftName: { type: String, required: true },
  counterId: { type: String, required: true, index: true },
  counterName: { type: String, required: true },
  
  openedBy: {
    userId: { type: String, required: true },
    username: { type: String, required: true },
    at: { type: Date, required: true }
  },
  openingFloat: { type: Number, default: 0 },
  
  closedBy: {
    userId: { type: String },
    username: { type: String },
    at: { type: Date }
  },
  closingCash: { type: Number },
  
  collections: {
    opd: { type: Number, default: 0 },
    lab: { type: Number, default: 0 },
    pharmacy: { type: Number, default: 0 },
    ipd: { type: Number, default: 0 },
    er: { type: Number, default: 0 },
    diagnostic: { type: Number, default: 0 },
    dialysis: { type: Number, default: 0 },
    aesthetic: { type: Number, default: 0 },
    cafeteria: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  
  expenses: {
    doctorPayouts: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
    pettyCash: { type: Number, default: 0 },
    refunds: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  
  expectedCash: { type: Number, default: 0 },
  actualCash: { type: Number, default: 0 },
  variance: { type: Number, default: 0 },
  varianceReason: { type: String },
  
  status: { 
    type: String, 
    enum: ['open', 'closing', 'closed', 'reconciled'], 
    default: 'open',
    index: true 
  },
  
  handoverTo: {
    userId: { type: String },
    username: { type: String },
    at: { type: Date }
  },
  
  startTime: { type: Date, required: true, default: Date.now },
  endTime: { type: Date },
  
  notes: { type: String },
  vouchers: [{ type: String }],
  attachments: [{ type: String }]
}, {
  timestamps: true,
  collection: 'finance_shifts'
})

// Indexes for efficient querying
ShiftSchema.index({ counterId: 1, status: 1 })
ShiftSchema.index({ 'openedBy.userId': 1, startTime: -1 })
ShiftSchema.index({ startTime: -1 })
ShiftSchema.index({ shiftType: 1, startTime: -1 })

export const Shift = model<ShiftDoc>('Shift', ShiftSchema)
export default Shift
