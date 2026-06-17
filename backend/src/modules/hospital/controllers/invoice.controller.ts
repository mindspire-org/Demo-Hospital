import { Request, Response } from 'express'
import { HospitalInvoice } from '../models/Invoice'
import { HospitalEncounter } from '../models/Encounter'

// Get next invoice number with persistent counter
async function getNextInvoiceNumber(encounterType: string): Promise<string> {
  const prefix = encounterType.toUpperCase() === 'EMERGENCY' ? 'ER' : 'IPD'
  
  // Find the highest existing invoice number for this type
  const lastInvoice: any = await HospitalInvoice.findOne({ 
    invoiceNo: { $regex: `^${prefix}-` } 
  }).sort({ invoiceNo: -1 }).lean()
  
  let nextNum = 1
  if ((lastInvoice as any)?.invoiceNo) {
    const match = (lastInvoice as any).invoiceNo.match(/-(\d+)$/)
    if (match) {
      nextNum = parseInt(match[1], 10) + 1
    }
  }
  
  return `${prefix}-${String(nextNum).padStart(6, '0')}`
}

// Save invoice (upsert by encounterId - idempotent)
export async function save(req: Request, res: Response) {
  const { encounterType, encounterId } = req.params
  const { lineItems, discount, totalAmount, totalPaid, netOutstanding, dateOfDischarge, dischargeTime } = req.body

  // Get patientId from encounter
  const encounterDoc = await HospitalEncounter.findById(encounterId).lean()
  if (!encounterDoc) {
    return res.status(404).json({ error: 'Encounter not found' })
  }
  const encounter = encounterDoc as any

  // Get patient details for denormalization
  const patient: any = encounter.patientId || {}
  
  // Check if invoice already exists for this encounter
  const existingInvoice = await HospitalInvoice.findOne({ encounterId })
  
  // Generate invoice number only for new invoices
  let invoiceNo = existingInvoice?.invoiceNo
  if (!invoiceNo) {
    invoiceNo = await getNextInvoiceNumber(encounterType)
  }
  
  // Upsert invoice (one per encounter - idempotent)
  const invoice = await HospitalInvoice.findOneAndUpdate(
    { encounterId },
    {
      $set: {
        invoiceNo, // Always set invoice number
        patientId: encounter.patientId?._id || encounter.patientId,
        encounterType: encounterType.toUpperCase(),
        // Denormalize patient data for list display
        patientName: patient.fullName || patient.name,
        mrn: patient.mrn,
        cnic: patient.cnicNormalized,
        phone: patient.phoneNormalized,
        department: encounter.departmentId?.name,
        departmentId: encounter.departmentId?._id || encounter.departmentId,
        lineItems: lineItems.map((item: any) => ({
          _id: item._id,
          description: item.description,
          rate: item.rate,
          qty: item.qty || 1,
          amount: item.amount,
          paidAmount: item.paidAmount || 0,
        })),
        discount: discount || 0,
        totalAmount: totalAmount || 0,
        totalPaid: totalPaid || 0,
        netOutstanding: netOutstanding || 0,
        dateOfDischarge: dateOfDischarge ? new Date(dateOfDischarge) : undefined,
        dischargeTime: dischargeTime || undefined,
        status: 'final',
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )

  res.json({ invoice })
}

// Get invoice by encounter
export async function getByEncounter(req: Request, res: Response) {
  const { encounterType, encounterId } = req.params

  const invoice = await HospitalInvoice.findOne({ encounterId, encounterType: encounterType.toUpperCase() }).lean()
  
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' })
  }

  res.json({ invoice })
}

// List invoices
export async function list(req: Request, res: Response) {
  const { encounterType, patientId, status, from, to, page = 1, limit = 50, q } = req.query

  const query: any = {}
  if (encounterType && encounterType !== 'ALL') query.encounterType = (encounterType as string).toUpperCase()
  if (patientId) query.patientId = patientId
  if (status) query.status = status
  if (from || to) {
    query.createdAt = {}
    if (from) query.createdAt.$gte = new Date(from as string)
    if (to) query.createdAt.$lte = new Date(to as string)
  }
  
  // Text search on denormalized fields
  if (q) {
    const searchRegex = new RegExp(q as string, 'i')
    query.$or = [
      { invoiceNo: searchRegex },
      { patientName: searchRegex },
      { mrn: searchRegex },
      { department: searchRegex },
    ]
  }

  const skip = (Number(page) - 1) * Number(limit)
  
  let [invoices, total] = await Promise.all([
    HospitalInvoice.find(query)
      .populate({ path: 'patientId', select: 'fullName mrn cnicNormalized phoneNormalized' })
      .populate({ path: 'departmentId', select: 'name' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    HospitalInvoice.countDocuments(query)
  ])

  // Populate missing denormalized data for legacy invoices
  invoices = invoices.map((inv: any) => {
    const patient = inv.patientId || {}
    return {
      ...inv,
      invoiceNo: inv.invoiceNo || '-',
      patientName: inv.patientName || patient.fullName || '-',
      mrn: inv.mrn || patient.mrn || '-',
      cnic: inv.cnic || patient.cnicNormalized || '-',
      phone: inv.phone || patient.phoneNormalized || '-',
      department: inv.department || inv.departmentId?.name || '-',
    }
  })

  res.json({ invoices, total, page: Number(page), limit: Number(limit) })
}

// Get invoice by ID
export async function getById(req: Request, res: Response) {
  const { id } = req.params

  const invoice = await HospitalInvoice.findById(id).lean()
  
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' })
  }

  res.json({ invoice })
}

// Mark as printed
export async function markPrinted(req: Request, res: Response) {
  const { id } = req.params

  const invoice = await HospitalInvoice.findByIdAndUpdate(
    id,
    { $set: { printedAt: new Date() } },
    { new: true }
  )

  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' })
  }

  res.json({ invoice })
}
