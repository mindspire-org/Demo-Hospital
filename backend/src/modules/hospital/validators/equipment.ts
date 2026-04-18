import { z } from 'zod'

export const listEquipmentSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['Working','UnderMaintenance','NotWorking','Condemned','Spare']).optional(),
  departmentId: z.string().optional(),
  from: z.string().optional(), // purchaseDate from
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
})

export const createEquipmentSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1),
  category: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  serialNo: z.string().optional(),
  purchaseDate: z.string().optional(),
  cost: z.coerce.number().optional(),
  vendorId: z.string().optional(),
  locationDepartmentId: z.string().optional(),
  custodian: z.string().optional(),
  installDate: z.string().optional(),
  warrantyStart: z.string().optional(),
  warrantyEnd: z.string().optional(),
  amcStart: z.string().optional(),
  amcEnd: z.string().optional(),
  requiresCalibration: z.boolean().optional(),
  calibFrequencyMonths: z.coerce.number().optional(),
  ppmFrequencyMonths: z.coerce.number().optional(),
  criticality: z.enum(['critical','high','medium','low']).optional(),
  status: z.enum(['Working','UnderMaintenance','NotWorking','Condemned','Spare']).optional(),
  nextPpmDue: z.string().optional(),
  nextCalibDue: z.string().optional(),
  supplierId: z.string().optional(),
  condition: z.enum(['New', 'Used', 'Refurbished']).optional(),
  manufacturingCompany: z.string().optional(),
})

export const updateEquipmentSchema = createEquipmentSchema.partial()

export const createPPMSchema = z.object({
  equipmentId: z.string().min(1),
  performedAt: z.string().min(1),
  nextDue: z.string().optional(),
  doneBy: z.string().optional(),
  vendorId: z.string().optional(),
  notes: z.string().optional(),
  partsUsed: z.array(z.object({ partName: z.string().optional(), qty: z.number().optional(), cost: z.number().optional() })).optional(),
  cost: z.number().optional(),
})

export const updatePPMSchema = createPPMSchema.partial()

export const listPPMSchema = z.object({
  equipmentId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
})

export const createCalibrationSchema = z.object({
  equipmentId: z.string().min(1),
  performedAt: z.string().min(1),
  nextDue: z.string().optional(),
  labName: z.string().optional(),
  certificateNo: z.string().optional(),
  result: z.string().optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  notes: z.string().optional(),
  cost: z.number().optional(),
})

export const updateCalibrationSchema = createCalibrationSchema.partial()

export const listCalibrationSchema = z.object({
  equipmentId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
})

export const equipmentDueSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})

// Breakdowns
export const createBreakdownSchema = z.object({
  equipmentId: z.string().min(1),
  reportedAt: z.string().min(1),
  restoredAt: z.string().optional(),
  description: z.string().optional(),
  rootCause: z.string().optional(),
  correctiveAction: z.string().optional(),
  vendorId: z.string().optional(),
  severity: z.enum(['low','medium','high']).optional(),
  status: z.enum(['Open','Closed']).optional(),
  cost: z.number().optional(),
})

export const updateBreakdownSchema = createBreakdownSchema.partial()

export const listBreakdownsSchema = z.object({
  equipmentId: z.string().optional(),
  status: z.enum(['Open','Closed']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
})

// Condemnations
export const createCondemnationSchema = z.object({
  equipmentId: z.string().min(1),
  proposedAt: z.string().optional(),
  reason: z.string().optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional(),
  status: z.enum(['Proposed','Approved','Disposed']).optional(),
  disposalMethod: z.string().optional(),
  disposalDate: z.string().optional(),
  notes: z.string().optional(),
})

export const updateCondemnationSchema = createCondemnationSchema.partial()

export const listCondemnationsSchema = z.object({
  equipmentId: z.string().optional(),
  status: z.enum(['Proposed','Approved','Disposed']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
})

// Unified Maintenance (PPM/Calibration/Repair)
export const createMaintenanceSchema = z.object({
  equipmentId: z.string().min(1),
  type: z.enum(['PPM', 'Calibration', 'Repair', 'Installation', 'Upgrade']),
  performedDate: z.string().min(1),
  nextDueDate: z.string().optional(),
  performedBy: z.string().optional(),
  vendorId: z.string().optional(),
  description: z.string().min(1),
  findings: z.string().optional(),
  actionsTaken: z.string().optional(),
  partsUsed: z.array(z.object({
    partName: z.string(),
    partNumber: z.string().optional(),
    quantity: z.number(),
    unitCost: z.number(),
    totalCost: z.number()
  })).optional(),
  laborCost: z.number().optional(),
  partsCost: z.number().optional(),
  totalCost: z.number().optional(),
  certificateNo: z.string().optional(),
  labName: z.string().optional(),
  result: z.string().optional(),
  notes: z.string().optional(),
})

export const listMaintenanceSchema = z.object({
  equipmentId: z.string().optional(),
  type: z.enum(['PPM', 'Calibration', 'Repair', 'Installation', 'Upgrade']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
})

// KPIs
export const kpiQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})
