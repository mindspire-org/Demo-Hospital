import { Request, Response } from 'express'
import { EquipmentSupplier } from '../models/EquipmentSupplier'
import { EquipmentExpense } from '../models/EquipmentExpense'
import { createSupplierSchema, updateSupplierSchema, listSupplierSchema } from '../validators/equipmentSupplier'

export async function list(req: Request, res: Response) {
  const q = listSupplierSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  
  const { q: search, type, status, page = 1, limit = 200 } = q.data
  const criteria: any = {}
  if (status) criteria.status = status
  if (type) criteria.type = type
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    criteria.$or = [{ name: rx }, { company: rx }, { contactPerson: rx }, { email: rx }]
  }
  
  const items = await EquipmentSupplier.find(criteria)
    .sort({ name: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()
  
  const total = await EquipmentSupplier.countDocuments(criteria)
  res.json({ items, total, page, limit })
}

export async function create(req: Request, res: Response) {
  const data = createSupplierSchema.parse(req.body)
  const item = await EquipmentSupplier.create(data)
  res.status(201).json(item)
}

export async function update(req: Request, res: Response) {
  const { id } = req.params
  const data = updateSupplierSchema.parse(req.body)
  const item = await EquipmentSupplier.findByIdAndUpdate(id, data, { new: true })
  if (!item) return res.status(404).json({ error: 'Supplier not found' })
  res.json(item)
}

export async function getLedger(req: Request, res: Response) {
  const { id } = req.params
  const expenses = await EquipmentExpense.find({ supplierId: id })
    .populate('equipmentId', 'name code')
    .sort({ createdAt: -1 })
    .lean()
  
  const supplier = await EquipmentSupplier.findById(id).lean()
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' })

  // Calculate stats on the fly for accuracy
  const totalPurchases = expenses.filter(e => e.category === 'Purchase').reduce((sum, e) => sum + (e.totalAmount || 0), 0)
  const totalServices = expenses.filter(e => e.category !== 'Purchase').reduce((sum, e) => sum + (e.totalAmount || 0), 0)
  const totalPaid = expenses.reduce((sum, e) => sum + (e.paidAmount || 0), 0)
  const totalBusiness = totalPurchases + totalServices
  const outstanding = totalBusiness - totalPaid
  
  res.json({ 
    items: expenses,
    stats: {
      totalPurchases,
      totalServices,
      totalPaid,
      totalBusiness,
      outstanding
    },
    supplier
  })
}

export async function addPayment(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { amount, paymentMethod, referenceNo, notes, date } = req.body

    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount is required' })

    const supplier = await EquipmentSupplier.findById(id)
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' })

    // Create a payment expense record
    // We treat payment as a special expense or update existing ones
    // For simplicity, let's find the oldest pending/partial expense and apply payment
    let remainingToPay = Number(amount)
    const unpaidExpenses = await EquipmentExpense.find({ 
      supplierId: id, 
      paymentStatus: { $in: ['Pending', 'Partial'] } 
    }).sort({ createdAt: 1 })

    for (const exp of unpaidExpenses) {
      if (remainingToPay <= 0) break
      
      const expRemaining = exp.totalAmount - exp.paidAmount
      if (expRemaining <= 0) continue

      const paymentForThis = Math.min(remainingToPay, expRemaining)
      exp.paidAmount += paymentForThis
      exp.paymentStatus = exp.paidAmount >= exp.totalAmount ? 'Paid' : 'Partial'
      await exp.save()
      
      remainingToPay -= paymentForThis
    }

    // If there's still money left (advance payment), create an unlinked expense record with negative balance or just record it
    if (remainingToPay > 0) {
      // In a real system, we'd have a separate Payments collection. 
      // For now, let's update the supplier's totalPaid directly or create a dummy expense.
      await EquipmentExpense.create({
        supplierId: id,
        equipmentId: unpaidExpenses[0]?.equipmentId, // Link to last equipment if possible
        category: 'Other',
        amount: 0,
        totalAmount: 0,
        paidAmount: remainingToPay,
        paymentStatus: 'Paid',
        notes: `Advance Payment: ${notes || ''}`,
        referenceNo,
        referenceDate: date || new Date()
      })
    }

    res.json({ message: 'Payment recorded successfully' })
  } catch (error) {
    console.error('Payment error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export async function stats(req: Request, res: Response) {
  const activeSuppliers = await EquipmentSupplier.find({ status: 'Active' }).lean()
  const totalSuppliers = activeSuppliers.length
  
  // Calculate aggregate stats across all suppliers
  let totalOutstanding = 0
  let totalBusiness = 0

  for (const s of activeSuppliers) {
    const expenses = await EquipmentExpense.find({ supplierId: s._id }).lean()
    const totalPaid = expenses.reduce((sum, e) => sum + (e.paidAmount || 0), 0)
    const totalBus = expenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0)
    
    totalBusiness += totalBus
    totalOutstanding += (totalBus - totalPaid)
  }
  
  res.json({
    totalSuppliers,
    totalOutstanding,
    totalBusiness
  })
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params
  const item = await EquipmentSupplier.findByIdAndDelete(id)
  if (!item) return res.status(404).json({ error: 'Supplier not found' })
  res.json({ message: 'Supplier deleted successfully' })
}
