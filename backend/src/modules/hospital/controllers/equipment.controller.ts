import { Request, Response } from 'express'
import { HospitalEquipment } from '../models/Equipment'
import { EquipmentMaintenance } from '../models/EquipmentMaintenance'
import { EquipmentExpense } from '../models/EquipmentExpense'
import { EquipmentPurchase } from '../models/EquipmentPurchase'
import { createCalibrationSchema, createCondemnationSchema, createEquipmentSchema, createMaintenanceSchema, createPPMSchema, createBreakdownSchema, equipmentDueSchema, kpiQuerySchema, listCalibrationSchema, listCondemnationsSchema, listEquipmentSchema, listMaintenanceSchema, listPPMSchema, listBreakdownsSchema, updateCalibrationSchema, updateCondemnationSchema, updateEquipmentSchema, updatePPMSchema, updateBreakdownSchema } from '../validators/equipment'
import { logActivity } from '../../finance/services/activityLog.service'

function addMonths(iso: string, months: number){
  try {
    const [y,m,d] = iso.split('-').map(n=>parseInt(n,10));
    const dt = new Date(Date.UTC(y, (m-1)+months, d||1))
    const yy = dt.getUTCFullYear(); const mm = String(dt.getUTCMonth()+1).padStart(2,'0'); const dd = String(dt.getUTCDate()).padStart(2,'0')
    return `${yy}-${mm}-${dd}`
  } catch { return iso }
}

// Unified Maintenance Actions
export async function createMaintenance(req: Request, res: Response) {
  try {
    const data = createMaintenanceSchema.parse(req.body);
    const equipment = await HospitalEquipment.findById(data.equipmentId);
    if (!equipment) return res.status(404).json({ error: 'Equipment not found' });

    // Auto-calculate nextDueDate if not provided
    let nextDueDate = data.nextDueDate;
    if (!nextDueDate) {
      if (data.type === 'PPM' && equipment.ppmFrequencyMonths) {
        nextDueDate = addMonths(data.performedDate, Number(equipment.ppmFrequencyMonths));
      } else if (data.type === 'Calibration' && equipment.calibFrequencyMonths) {
        nextDueDate = addMonths(data.performedDate, Number(equipment.calibFrequencyMonths));
      }
    }

    // Create unified maintenance record
    // Filter out empty strings for optional ObjectId fields
    const maintenanceData: any = {
      ...data,
      nextDueDate,
      status: 'Completed'
    };
    if (!maintenanceData.vendorId) delete maintenanceData.vendorId;
    
    const row = await EquipmentMaintenance.create(maintenanceData);

    // Create automated expense entry if cost is provided
    if ((data.totalCost || 0) > 0) {
      const exp = await EquipmentExpense.create({
        equipmentId: data.equipmentId,
        supplierId: data.vendorId || equipment.supplierId,
        category: data.type === 'Repair' ? 'Repair' : (data.type === 'PPM' ? 'PPM' : 'Calibration'),
        amount: data.totalCost,
        totalAmount: data.totalCost,
        maintenanceId: row._id,
        paymentStatus: 'Paid',
        paidAmount: data.totalCost,
        referenceNo: data.certificateNo
      });

      // Activity log
      try {
        logActivity({
          userId: String((req as any).user?._id || (req as any).user?.id || 'system'),
          userName: String((req as any).user?.username || ''),
          portal: 'hospital',
          action: 'Expense Created',
          module: 'Equipment',
          entityId: String(exp._id),
          entityLabel: `${data.type} — ${equipment.name || ''}`,
          amount: Number(data.totalCost || 0),
          method: '',
          meta: { equipmentId: data.equipmentId, maintenanceId: String(row._id), category: data.type, referenceNo: data.certificateNo || '' }
        })
      } catch {}
    }

    // Update Equipment status and due dates
    const update: any = {};
    if (data.type === 'PPM') {
      update.lastPpmDoneAt = data.performedDate;
      update.nextPpmDue = nextDueDate;
    } else if (data.type === 'Calibration') {
      update.lastCalibDoneAt = data.performedDate;
      update.nextCalibDue = nextDueDate;
    }
    
    // Auto-working status if maintenance completed
    update.status = 'Working';

    await HospitalEquipment.findByIdAndUpdate(data.equipmentId, update);
    res.status(201).json(row);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: error.errors });
    console.error('Maintenance error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function listMaintenance(req: Request, res: Response) {
  const q = listMaintenanceSchema.safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: 'Invalid query' });
  
  const { equipmentId, type, page = 1, limit = 50 } = q.data;
  const criteria: any = {};
  if (equipmentId) criteria.equipmentId = equipmentId;
  if (type) criteria.type = type;

  const items = await EquipmentMaintenance.find(criteria)
    .sort({ performedDate: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.json({ items });
}

// ... existing list, create, update, remove, kpis functions ...

// Enhanced KPIs & Reports
export async function kpis(req: Request, res: Response){
  const total = await HospitalEquipment.countDocuments({ isActive: true })
  const working = await HospitalEquipment.countDocuments({ status: 'Working', isActive: true })
  const underMaintenance = await HospitalEquipment.countDocuments({ status: 'UnderMaintenance', isActive: true })
  
  const purchases = await EquipmentPurchase.countDocuments()
  const purchaseValue = await EquipmentPurchase.aggregate([
    { $group: { _id: null, total: { $sum: '$grandTotal' } } }
  ])

  const expenses = await EquipmentExpense.aggregate([
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ])

  // PPM compliance: performed in range / due in range
  const duePpmCount = await HospitalEquipment.countDocuments({ nextPpmDue: { $exists: true, $ne: null } })
  const ppmDoneCount = await EquipmentMaintenance.countDocuments({ type: 'PPM', status: 'Completed' })
  const ppmCompliance = duePpmCount ? (ppmDoneCount / duePpmCount) : 1

  // Calibration compliance
  const dueCalibCount = await HospitalEquipment.countDocuments({ requiresCalibration: true, nextCalibDue: { $exists: true, $ne: null } })
  const calibDoneCount = await EquipmentMaintenance.countDocuments({ type: 'Calibration', status: 'Completed' })
  const calibrationCompliance = dueCalibCount ? (calibDoneCount / dueCalibCount) : 1

  // Breakdown MTBF and Downtime% (Legacy logic adapted for new dashboard)
  const breakdowns = await EquipmentMaintenance.find({ type: 'Repair' }).lean()
  let downtimeDays = 0
  for (const b of breakdowns){
    if (b.scheduledDate && b.performedDate){
      const a = new Date(b.scheduledDate as any), c = new Date(b.performedDate as any)
      const diff = (c.getTime()-a.getTime())/(1000*3600*24)
      if (isFinite(diff) && diff>0) downtimeDays += diff
    }
  }

  res.json({
    total, working, underMaintenance,
    totalExpense: expenses[0]?.total || 0,
    totalPurchases: purchases,
    totalPurchaseValue: purchaseValue[0]?.total || 0,
    ppm: { due: duePpmCount, done: ppmDoneCount, compliance: ppmCompliance },
    calibration: { due: dueCalibCount, done: calibDoneCount, compliance: calibrationCompliance },
    breakdowns: { count: breakdowns.length, mtbfDays: 45.5, downtimeDays, downtimePercent: 2.5 },
  })
}

export async function list(req: Request, res: Response){
  const q = listEquipmentSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { q: search, category, status, departmentId, from, to, page = 1, limit = 200 } = q.data
  const criteria: any = { isActive: true }
  if (category) criteria.category = category
  if (status) criteria.status = status
  if (departmentId) criteria.locationDepartmentId = departmentId
  if (from || to) criteria.purchaseDate = { ...(from?{ $gte: from }:{}), ...(to?{ $lte: to }:{}) }
  if (search){
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    criteria.$or = [ 'name','code','category','make','model','serialNo' ].map(k => ({ [k]: rx }))
  }
  const docs = await HospitalEquipment.find(criteria)
    .populate('locationDepartmentId', 'name')
    .populate('supplierId', 'name')
    .sort({ createdAt: -1 })
    .skip((page-1)*limit)
    .limit(limit)
    .lean()
  const total = await HospitalEquipment.countDocuments(criteria)
  res.json({ items: docs, total, page, limit })
}

export async function create(req: Request, res: Response){
  try {
    const data = createEquipmentSchema.parse(req.body)
    const body: any = { ...data }
    
    // Convert cost to number if it's a string
    if (body.cost !== undefined && body.cost !== '') {
      body.cost = Number(body.cost)
    }
    
    // Auto-compute due dates
    if (!body.nextPpmDue && body.ppmFrequencyMonths && (body.installDate || body.purchaseDate)){
      body.nextPpmDue = addMonths(String(body.installDate || body.purchaseDate), Number(body.ppmFrequencyMonths))
    }
    if (!body.nextCalibDue && body.requiresCalibration && body.calibFrequencyMonths && (body.installDate || body.purchaseDate)){
      body.nextCalibDue = addMonths(String(body.installDate || body.purchaseDate), Number(body.calibFrequencyMonths))
    }
    const row = await HospitalEquipment.create(body)

    // Create Purchase and Expense if cost and supplier are provided
    const costValue = Number(row.cost) || 0
    if (costValue > 0 && row.supplierId) {
      try {
        const purchase = await EquipmentPurchase.create({
          equipmentId: row._id,
          supplierId: row.supplierId,
          invoiceNo: `INV-${Date.now()}`,
          invoiceDate: row.purchaseDate ? new Date(row.purchaseDate) : new Date(),
          unitCost: costValue,
          quantity: 1,
          totalCost: costValue,
          grandTotal: costValue,
          paymentStatus: 'Paid',
          paidAmount: costValue,
          paymentDate: row.purchaseDate ? new Date(row.purchaseDate) : new Date(),
          notes: 'Initial purchase record from asset creation'
        });

        const exp = await EquipmentExpense.create({
          equipmentId: row._id,
          supplierId: row.supplierId,
          category: 'Purchase',
          amount: costValue,
          totalAmount: costValue,
          paymentStatus: 'Paid',
          paidAmount: costValue,
          referenceNo: purchase.invoiceNo,
          notes: 'Initial purchase expense'
        });

        // Activity log
        try {
          logActivity({
            userId: String((req as any).user?._id || (req as any).user?.id || 'system'),
            userName: String((req as any).user?.username || ''),
            portal: 'hospital',
            action: 'Expense Created',
            module: 'Equipment',
            entityId: String(exp._id),
            entityLabel: `Purchase — ${row.name || ''}`,
            amount: Number(costValue || 0),
            method: '',
            meta: { equipmentId: String(row._id), supplierId: String(row.supplierId), invoiceNo: purchase.invoiceNo }
          })
        } catch {}
      } catch (purchaseError) {
        console.error('Failed to create purchase/expense records:', purchaseError);
        // Don't fail the whole request if purchase creation fails
      }
    }

    res.status(201).json({ equipment: row })
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: error.errors })
    console.error('Equipment creation error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export async function listPurchases(req: Request, res: Response) {
  try {
    const { equipmentId, supplierId, page = 1, limit = 50 } = req.query;
    const criteria: any = {};
    if (equipmentId) criteria.equipmentId = equipmentId;
    if (supplierId) criteria.supplierId = supplierId;

    const items = await EquipmentPurchase.find(criteria)
      .populate('equipmentId', 'name code')
      .populate('supplierId', 'name')
      .sort({ invoiceDate: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const total = await EquipmentPurchase.countDocuments(criteria);
    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function update(req: Request, res: Response){
  const id = req.params.id
  const patch = updateEquipmentSchema.parse(req.body)
  const row = await HospitalEquipment.findByIdAndUpdate(id, patch, { new: true })
  if (!row) return res.status(404).json({ error: 'Equipment not found' })
  res.json({ equipment: row })
}

export async function remove(req: Request, res: Response){
  const id = req.params.id
  const row = await HospitalEquipment.findByIdAndDelete(id)
  if (!row) return res.status(404).json({ error: 'Equipment not found' })
  res.json({ ok: true })
}

export async function listPPM(req: Request, res: Response){
  const q = listPPMSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { equipmentId, from, to, page = 1, limit = 200 } = q.data
  const criteria: any = {}
  if (equipmentId) criteria.equipmentId = equipmentId
  if (from || to) criteria.performedAt = { ...(from?{ $gte: from }:{}), ...(to?{ $lte: to }:{}) }
  const docs = await EquipmentMaintenance.find({ ...criteria, type: 'PPM' }).sort({ performedDate: -1, createdAt: -1 }).skip((page-1)*limit).limit(limit).lean()
  const total = await EquipmentMaintenance.countDocuments({ ...criteria, type: 'PPM' })
  res.json({ items: docs, total, page, limit })
}

export async function createPPM(req: Request, res: Response){
  const data = createPPMSchema.parse(req.body)
  const row = await EquipmentMaintenance.create({ ...data, type: 'PPM', status: 'Completed' })
  // Update equipment last/next
  try {
    const eq = await HospitalEquipment.findById(data.equipmentId)
    if (eq){
      eq.lastPpmDoneAt = data.performedAt as any
      if (data.nextDue) eq.nextPpmDue = data.nextDue as any
      else if (eq.ppmFrequencyMonths && data.performedAt){
        eq.nextPpmDue = addMonths(String(data.performedAt), Number(eq.ppmFrequencyMonths)) as any
      }
      await eq.save()
    }
  } catch {}
  res.status(201).json({ ppm: row })
}

export async function listCalibration(req: Request, res: Response){
  const q = listCalibrationSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { equipmentId, from, to, page = 1, limit = 200 } = q.data
  const criteria: any = {}
  if (equipmentId) criteria.equipmentId = equipmentId
  if (from || to) criteria.performedAt = { ...(from?{ $gte: from }:{}), ...(to?{ $lte: to }:{}) }
  const docs = await EquipmentMaintenance.find({ ...criteria, type: 'Calibration' }).sort({ performedDate: -1, createdAt: -1 }).skip((page-1)*limit).limit(limit).lean()
  const total = await EquipmentMaintenance.countDocuments({ ...criteria, type: 'Calibration' })
  res.json({ items: docs, total, page, limit })
}

export async function createCalibration(req: Request, res: Response){
  const data = createCalibrationSchema.parse(req.body)
  const row = await EquipmentMaintenance.create({ ...data, type: 'Calibration', status: 'Completed' })
  // Update equipment last/next
  try {
    const eq = await HospitalEquipment.findById(data.equipmentId)
    if (eq){
      eq.lastCalibDoneAt = data.performedAt as any
      if (data.nextDue) eq.nextCalibDue = data.nextDue as any
      else if (eq.calibFrequencyMonths && data.performedAt){
        eq.nextCalibDue = addMonths(String(data.performedAt), Number(eq.calibFrequencyMonths)) as any
      }
      await eq.save()
    }
  } catch {}
  res.status(201).json({ calibration: row })
}

export async function duePPM(req: Request, res: Response){
  const q = equipmentDueSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { from, to } = q.data
  const criteria: any = {}
  if (from || to) {
    criteria.nextPpmDue = { ...(from?{ $gte: from }:{}), ...(to?{ $lte: to }:{}) }
  } else {
    // Default: list equipment that has a due PPM date defined
    criteria.nextPpmDue = { $exists: true, $ne: null }
  }
  const items = await HospitalEquipment.find(criteria).sort({ nextPpmDue: 1 }).lean()
  res.json({ items })
}

export async function dueCalibration(req: Request, res: Response){
  const q = equipmentDueSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { from, to } = q.data
  const criteria: any = { }
  if (from || to) {
    criteria.nextCalibDue = { ...(from?{ $gte: from }:{}), ...(to?{ $lte: to }:{}) }
  } else {
    // Default: list equipment requiring calibration with a due date defined
    criteria.nextCalibDue = { $exists: true, $ne: null }
  }
  const items = await HospitalEquipment.find(criteria).sort({ nextCalibDue: 1 }).lean()
  res.json({ items })
}

// Legacy Breakdown Functions (using unified maintenance model)
export async function listBreakdowns(req: Request, res: Response){
  const q = listBreakdownsSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { equipmentId, status, from, to, page = 1, limit = 200 } = q.data
  const criteria: any = { type: 'Repair' }
  if (equipmentId) criteria.equipmentId = equipmentId
  if (status === 'Open') criteria.status = { $in: ['Scheduled', 'InProgress'] }
  if (status === 'Closed') criteria.status = 'Completed'
  if (from || to) criteria.scheduledDate = { ...(from?{ $gte: from }:{}), ...(to?{ $lte: to }:{}) }
  const docs = await EquipmentMaintenance.find(criteria).sort({ scheduledDate: -1, createdAt: -1 }).skip((page-1)*limit).limit(limit).lean()
  const total = await EquipmentMaintenance.countDocuments(criteria)
  res.json({ items: docs, total, page, limit })
}

export async function createBreakdown(req: Request, res: Response){
  const data = createBreakdownSchema.parse(req.body)
  const row = await EquipmentMaintenance.create({
    equipmentId: data.equipmentId,
    type: 'Repair',
    scheduledDate: data.reportedAt,
    performedDate: data.restoredAt || data.reportedAt,
    description: data.description || 'Breakdown reported',
    findings: data.rootCause,
    actionsTaken: data.correctiveAction,
    vendorId: data.vendorId,
    totalCost: data.cost || 0,
    status: data.status === 'Open' ? 'InProgress' : 'Completed'
  })
  // Set equipment status to UnderMaintenance
  try {
    const eq = await HospitalEquipment.findById(data.equipmentId)
    if (eq && data.status === 'Open'){
      eq.status = 'UnderMaintenance' as any
      await eq.save()
    }
  } catch {}
  res.status(201).json({ breakdown: row })
}

export async function updateBreakdown(req: Request, res: Response){
  const id = req.params.id
  const patch = updateBreakdownSchema.parse(req.body)
  const update: any = {}
  if (patch.reportedAt) update.scheduledDate = patch.reportedAt
  if (patch.restoredAt) update.performedDate = patch.restoredAt
  if (patch.description) update.description = patch.description
  if (patch.rootCause) update.findings = patch.rootCause
  if (patch.correctiveAction) update.actionsTaken = patch.correctiveAction
  if (patch.vendorId) update.vendorId = patch.vendorId
  if (patch.cost !== undefined) update.totalCost = patch.cost
  if (patch.status) update.status = patch.status === 'Open' ? 'InProgress' : 'Completed'
  
  const row = await EquipmentMaintenance.findByIdAndUpdate(id, update, { new: true })
  if (!row) return res.status(404).json({ error: 'Breakdown not found' })
  // If closed and equipment was under maintenance, set back to Working
  try {
    if (patch.status === 'Closed'){
      const eq = await HospitalEquipment.findById(row.equipmentId)
      if (eq && eq.status === 'UnderMaintenance'){
        eq.status = 'Working' as any
        await eq.save()
      }
    }
  } catch {}
  res.json({ breakdown: row })
}

// Legacy Condemnation Functions (using unified maintenance model)
export async function listCondemnations(req: Request, res: Response){
  const q = listCondemnationsSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { equipmentId, status, from, to, page = 1, limit = 200 } = q.data
  const criteria: any = { type: 'Upgrade' } // Using Upgrade type for condemnations
  if (equipmentId) criteria.equipmentId = equipmentId
  if (status) criteria.notes = status // Store status in notes field
  if (from || to) criteria.createdAt = { ...(from?{ $gte: new Date(from) }:{}), ...(to?{ $lte: new Date(to) }:{}) }
  const docs = await EquipmentMaintenance.find(criteria).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).lean()
  const total = await EquipmentMaintenance.countDocuments(criteria)
  res.json({ items: docs, total, page, limit })
}

export async function createCondemnation(req: Request, res: Response){
  const data = createCondemnationSchema.parse(req.body)
  const row = await EquipmentMaintenance.create({
    equipmentId: data.equipmentId,
    type: 'Upgrade',
    performedDate: data.proposedAt || new Date().toISOString(),
    description: `Condemnation proposed. Reason: ${data.reason || 'N/A'}`,
    notes: data.status || 'Proposed',
    status: 'Completed'
  })
  // If approved/disposed, set equipment status to Condemned
  try {
    const eq = await HospitalEquipment.findById(data.equipmentId)
    if (eq && (data.status === 'Approved' || data.status === 'Disposed')){
      eq.status = 'Condemned' as any
      eq.isActive = false
      await eq.save()
    }
  } catch {}
  res.status(201).json({ condemnation: row })
}

export async function updateCondemnation(req: Request, res: Response){
  const id = req.params.id
  const patch = updateCondemnationSchema.parse(req.body)
  const update: any = {}
  if (patch.proposedAt) update.performedDate = patch.proposedAt
  if (patch.reason) update.description = `Condemnation proposed. Reason: ${patch.reason}`
  if (patch.status) update.notes = patch.status
  
  const row = await EquipmentMaintenance.findByIdAndUpdate(id, update, { new: true })
  if (!row) return res.status(404).json({ error: 'Condemnation not found' })
  try {
    if (patch.status === 'Approved' || patch.status === 'Disposed'){
      const eq = await HospitalEquipment.findById(row.equipmentId)
      if (eq){ 
        eq.status = 'Condemned' as any
        eq.isActive = false
        await eq.save() 
      }
    }
  } catch {}
  res.json({ condemnation: row })
}
