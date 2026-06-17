import { Request, Response } from 'express'
import { HospitalEncounter } from '../models/Encounter'
import { HospitalIpdBillingItem } from '../models/IpdBillingItem'
import { IndoorOrderQueue } from '../../indoorpharmacy/models/indoorOrderQueue'
import { Dispense } from '../../indoorpharmacy/models/indoorDispense'
import { InventoryItem } from '../../indoorpharmacy/models/indoorInventoryItem'
import mongoose from 'mongoose'

function handleError(res: Response, e: any) {
  if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' })
  if (e?.code === 11000) return res.status(409).json({ error: 'Duplicate entry' })
  if (e?.status) return res.status(e.status).json({ error: e.error || 'Error' })
  return res.status(500).json({ error: 'Internal Server Error' })
}

function todayKey() {
  const d = new Date()
  const y = String(d.getFullYear()).slice(2)
  const m = String(d.getMonth()+1).padStart(2,'0')
  const day = String(d.getDate()).padStart(2,'0')
  return `${y}${m}${day}`
}

// ── Core: Dispense + Auto-billing ──

export async function dispenseAndAddToBill(req: Request, res: Response) {
  try {
    const body = req.body as any
    const encounterId = body.encounterId
    if (!encounterId || !mongoose.isValidObjectId(encounterId)) {
      return res.status(400).json({ error: 'Invalid encounterId' })
    }

    const encounter = await HospitalEncounter.findById(String(encounterId)).lean() as any
    if (!encounter) return res.status(404).json({ error: 'Encounter not found' })

    const lines = (body.lines || []) as any[]
    if (!lines.length) return res.status(400).json({ error: 'No items to dispense' })

    // Calculate totals and resolve costs
    let subtotal = 0
    let totalCost = 0
    const enrichedLines: any[] = []
    for (const line of lines) {
      const unitPrice = Number(line.unitPrice || 0)
      const qty = Number(line.qty || 1)
      const lineTotal = unitPrice * qty
      subtotal += lineTotal

      // Resolve cost from inventory
      let item: any = null
      const medId = String(line.medicineId || '').trim()
      if (medId && mongoose.isValidObjectId(medId)) {
        item = await InventoryItem.findById(medId).lean()
      }
      if (!item && line.name) {
        item = await InventoryItem.findOne({ key: String(line.name).toLowerCase() }).lean()
      }
      const costPerUnit = Number(item?.avgCostPerUnit || item?.lastBuyPerUnitAfterTax || item?.lastBuyPerUnit || 0)
      totalCost += costPerUnit * qty

      enrichedLines.push({
        medicineId: medId || item?._id?.toString() || '',
        name: String(line.name || item?.name || ''),
        unitPrice,
        qty,
        costPerUnit,
        discountRs: Number(line.discountRs || 0),
      })
    }

    const discountPct = Number(body.discountPct || 0)
    const lineDiscountTotal = enrichedLines.reduce((s, l) => s + (l.discountRs || 0), 0)
    const billDiscount = ((Math.max(0, subtotal - lineDiscountTotal)) * discountPct) / 100
    const total = subtotal - lineDiscountTotal - billDiscount

    // Generate bill number
    const key = todayKey()
    const countToday = await Dispense.countDocuments({ billNo: new RegExp(`^IN-${key}-`) })
    const billNo = `IN-${key}-${String(countToday + 1).padStart(3, '0')}`

    // Create dispense record
    const dispense = await Dispense.create({
      datetime: new Date().toISOString(),
      billNo,
      customerId: String(encounter.patientId),
      customer: body.patientName || 'Patient',
      payment: body.payment || 'Credit', // IPD is usually credit
      discountPct,
      lineDiscountTotal,
      subtotal,
      total,
      lines: enrichedLines,
      profit: subtotal - totalCost - lineDiscountTotal - billDiscount,
      createdBy: body.dispensedBy || '',
      encounterId: String(encounterId),
      encounterType: encounter.type || 'IPD',
      admissionNo: encounter.admissionNo || '',
      bedNumber: encounter.bedId || body.bedNumber || '',
      wardId: encounter.wardId || body.wardId || undefined,
      billingStatus: 'added_to_bill',
      isDirectBilling: true,
      orderSource: body.orderSource || 'manual_order',
      linkedOrderId: body.linkedOrderId ? String(body.linkedOrderId) : undefined,
      prescribedBy: body.prescribedBy ? String(body.prescribedBy) : undefined,
      dispensedBy: body.dispensedBy ? String(body.dispensedBy) : undefined,
      unitCost: totalCost,
      sellingPrice: total,
      corporateId: encounter.corporateId ? String(encounter.corporateId) : undefined,
    })

    // Create billing items for each line
    const billingItems = []
    for (const line of enrichedLines) {
      const billingItem = await HospitalIpdBillingItem.create({
        patientId: String(encounter.patientId),
        encounterId: String(encounterId),
        type: 'medication',
        description: `${line.name} x${line.qty}`,
        qty: line.qty,
        unitPrice: line.unitPrice,
        amount: (line.unitPrice * line.qty) - (line.discountRs || 0),
        paidAmount: 0,
        date: new Date(),
        refId: billNo,
        billedBy: body.dispensedBy || '',
        pharmacyDispenseId: (dispense as any)._id,
        medicineId: line.medicineId || undefined,
        medicineName: line.name,
        isPackageIncluded: false,
        patientPayable: (line.unitPrice * line.qty) - (line.discountRs || 0),
      })
      billingItems.push(billingItem)
    }

    // Update order queue status if linked
    if (body.linkedOrderId) {
      await IndoorOrderQueue.findByIdAndUpdate(
        String(body.linkedOrderId),
        { $set: { status: 'dispensed', dispensedAt: new Date(), billingStatus: 'added_to_bill', totalAmount: total } }
      )
    }

    res.status(201).json({ dispense, billingItems })
  } catch (e) {
    console.error('[dispenseAndAddToBill] ERROR:', e)
    return handleError(res, e)
  }
}

export async function getPharmacyChargesByEncounter(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    if (!encounterId || !mongoose.isValidObjectId(encounterId)) {
      return res.status(400).json({ error: 'Invalid encounterId' })
    }
    const items = await HospitalIpdBillingItem.find({
      encounterId: String(encounterId),
      type: 'medication',
    }).sort({ date: -1 }).lean()

    const totalAmount = items.reduce((s, it) => s + (it.amount || 0), 0)
    const totalPaid = items.reduce((s, it) => s + (it.paidAmount || 0), 0)

    res.json({ items, totalAmount, totalPaid, outstanding: totalAmount - totalPaid })
  } catch (e) { return handleError(res, e) }
}

export async function voidPharmacyCharge(req: Request, res: Response) {
  try {
    const { id } = req.body as any
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid billing item id' })
    }
    const item = await HospitalIpdBillingItem.findByIdAndDelete(String(id)).lean() as any
    if (!item) return res.status(404).json({ error: 'Billing item not found' })

    // Mark dispense as refunded if linked
    if (item.pharmacyDispenseId) {
      await Dispense.findByIdAndUpdate(String(item.pharmacyDispenseId), {
        $set: { billingStatus: 'refunded' }
      })
    }

    res.json({ ok: true, item })
  } catch (e) { return handleError(res, e) }
}

// ── Return handling ──

export async function processMedicationReturn(req: Request, res: Response) {
  try {
    const body = req.body as any
    const dispenseId = body.dispenseId
    const encounterId = body.encounterId
    if (!dispenseId || !mongoose.isValidObjectId(dispenseId)) {
      return res.status(400).json({ error: 'Invalid dispenseId' })
    }

    const dispense = await Dispense.findById(String(dispenseId)).lean() as any
    if (!dispense) return res.status(404).json({ error: 'Dispense not found' })

    // Void linked billing items
    await HospitalIpdBillingItem.deleteMany({ pharmacyDispenseId: String(dispenseId) })

    // Mark dispense as refunded
    await Dispense.findByIdAndUpdate(String(dispenseId), {
      $set: { billingStatus: 'refunded' }
    })

    // Update encounter pending amount if needed
    if (encounterId && mongoose.isValidObjectId(encounterId)) {
      const encounter = await HospitalEncounter.findById(String(encounterId)).lean() as any
      if (encounter) {
        // Recalculate total pharmacy charges
        const pharmacyItems = await HospitalIpdBillingItem.find({
          encounterId: String(encounterId),
          type: 'medication',
        }).lean()
        const totalPharmacy = pharmacyItems.reduce((s, it) => s + (it.amount || 0), 0)
        await HospitalEncounter.findByIdAndUpdate(String(encounterId), {
          $set: { pendingAmount: Math.max(0, (encounter.pendingAmount || 0) - (dispense.total || 0)) }
        })
      }
    }

    res.json({ ok: true, refundedAmount: dispense.total })
  } catch (e) { return handleError(res, e) }
}

// ── Administration log ──

export async function getMedicationAdministrationLog(req: Request, res: Response) {
  try {
    const { encounterId } = req.params as any
    if (!encounterId || !mongoose.isValidObjectId(encounterId)) {
      return res.status(400).json({ error: 'Invalid encounterId' })
    }
    const dispenses = await Dispense.find({
      encounterId: String(encounterId),
      'administrationLog.0': { $exists: true },
    }).sort({ datetime: -1 }).lean()
    res.json({ logs: dispenses })
  } catch (e) { return handleError(res, e) }
}

export async function logMedicationAdministration(req: Request, res: Response) {
  try {
    const { dispenseId } = req.params as any
    const body = req.body as any
    if (!dispenseId || !mongoose.isValidObjectId(dispenseId)) {
      return res.status(400).json({ error: 'Invalid dispenseId' })
    }
    const entry = {
      administeredAt: new Date(),
      administeredBy: body.administeredBy ? String(body.administeredBy) : undefined,
      doseGiven: String(body.doseGiven || ''),
      notes: String(body.notes || ''),
      patientResponse: String(body.patientResponse || ''),
    }
    const dispense = await Dispense.findByIdAndUpdate(
      String(dispenseId),
      { $push: { administrationLog: entry }, $set: { administeredBy: entry.administeredBy } },
      { new: true }
    ).lean()
    if (!dispense) return res.status(404).json({ error: 'Dispense not found' })
    res.json({ dispense, entry })
  } catch (e) { return handleError(res, e) }
}
