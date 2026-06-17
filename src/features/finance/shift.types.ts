export interface Shift {
  _id: string
  shiftType: 'morning' | 'evening' | 'night' | 'custom'
  shiftName: string
  counterId: string
  counterName: string
  
  openedBy: {
    userId: string
    username: string
    at: string
  }
  openingFloat: number
  
  closedBy?: {
    userId: string
    username: string
    at: string
  }
  closingCash?: number
  
  collections: {
    opd: number
    lab: number
    pharmacy: number
    ipd: number
    er: number
    diagnostic: number
    dialysis: number
    aesthetic: number
    total: number
  }
  
  expenses: {
    doctorPayouts: number
    purchases: number
    pettyCash: number
    refunds: number
    total: number
  }
  
  expectedCash: number
  actualCash: number
  variance: number
  varianceReason?: string
  
  status: 'open' | 'closing' | 'closed' | 'reconciled'
  
  handoverTo?: {
    userId: string
    username: string
    at: string
  }
  
  startTime: string
  endTime?: string
  
  notes?: string
  vouchers: string[]
  attachments: string[]
  
  createdAt: string
  updatedAt: string
}

export interface ShiftSummary {
  totalShifts: number
  totalOpeningFloat: number
  totalCollections: number
  totalExpenses: number
  totalActualCash: number
  totalVariance: number
  avgVariance: number
  shiftsWithVariance: number
}

export interface DailyShiftData {
  _id: {
    year: number
    month: number
    day: number
  }
  date: string
  shifts: number
  collections: number
  expenses: number
  variance: number
}

export interface ShiftComparison {
  shifts: Shift[]
  comparison: {
    totalShifts: number
    avgCollections: number
    avgExpenses: number
    avgVariance: number
    totalCollections: number
    totalExpenses: number
    totalVariance: number
  }
}

export const MODULE_NAMES: Record<string, string> = {
  opd: 'OPD',
  lab: 'Laboratory',
  pharmacy: 'Pharmacy',
  ipd: 'IPD',
  er: 'Emergency',
  diagnostic: 'Diagnostic',
  dialysis: 'Dialysis',
  aesthetic: 'Aesthetic'
}

export const EXPENSE_TYPES: Record<string, string> = {
  doctorPayouts: 'Doctor Payouts',
  purchases: 'Purchases',
  pettyCash: 'Petty Cash',
  refunds: 'Refunds'
}

export const SHIFT_TYPE_COLORS: Record<string, string> = {
  morning: 'bg-amber-500',
  evening: 'bg-indigo-500',
  night: 'bg-slate-700',
  custom: 'bg-emerald-500'
}

export const SHIFT_TYPE_LABELS: Record<string, string> = {
  morning: 'Morning Shift',
  evening: 'Evening Shift',
  night: 'Night Shift',
  custom: 'Custom Shift'
}

export const STATUS_COLORS: Record<string, string> = {
  open: 'bg-emerald-500',
  closing: 'bg-amber-500',
  closed: 'bg-slate-500',
  reconciled: 'bg-blue-500'
}

export const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  closing: 'Closing (Needs Approval)',
  closed: 'Closed',
  reconciled: 'Reconciled'
}
