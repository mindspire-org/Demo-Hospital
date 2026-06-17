import { Request, Response } from 'express'
import { LabPendingInventoryItem } from '../models/PendingInventoryItem'
import { LabInventoryItem } from '../models/InventoryItem'

export async function list(req: Request, res: Response) {
  try {
    const { q, status = 'pending', page = 1, limit = 50 } = req.query
    const filter: any = { status }
    
    if (q) {
      const rx = new RegExp(String(q), 'i')
      filter.$or = [
        { name: rx },
        { supplier: rx },
        { purchaseOrderNumber: rx }
      ]
    }

    const effectiveLimit = Number(limit)
    const currentPage = Math.max(1, Number(page))
    const skip = (currentPage - 1) * effectiveLimit

    const total = await LabPendingInventoryItem.countDocuments(filter)
    const items = await LabPendingInventoryItem.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(effectiveLimit)
      .lean()

    const totalPages = Math.max(1, Math.ceil(total / effectiveLimit))

    res.json({ items, total, page: currentPage, totalPages })
  } catch (error) {
    console.error('Failed to list pending inventory items:', error)
    res.status(500).json({ error: 'Failed to list pending inventory items' })
  }
}

export async function approve(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { 
      category, 
      unitsPerPack = 1, 
      minStock = 0, 
      salePerUnit = 0 
    } = req.body
    
    const actor = (req as any).user?.username || (req as any).user?.name || 'system'
    
    // Get pending item
    const pendingItem = await LabPendingInventoryItem.findById(id)
    if (!pendingItem) {
      return res.status(404).json({ error: 'Pending item not found' })
    }
    
    const itemName = String(pendingItem.name || '').trim()
    const key = itemName.toLowerCase()
    
    // Check if item already exists in inventory
    const existingItem = await LabInventoryItem.findOne({ key })
    
    if (existingItem) {
      // Update existing item - add quantity to onHand
      const newOnHand = (existingItem.onHand || 0) + (pendingItem.quantity || 0)
      await LabInventoryItem.findOneAndUpdate(
        { key },
        {
          $set: {
            onHand: newOnHand,
            lastSupplier: pendingItem.supplier,
            lastInvoice: pendingItem.purchaseOrderNumber,
            lastInvoiceDate: pendingItem.purchaseOrderDate,
            lastPacksReceived: pendingItem.quantity,
            lastTotalItemsReceived: pendingItem.quantity * (existingItem.unitsPerPack || 1),
            lastBuyPerPack: pendingItem.price || 0,
            lastBuyPerUnit: (pendingItem.price || 0) / (existingItem.unitsPerPack || 1)
          }
        }
      )
      console.log(`✅ Updated existing item: ${itemName} (added ${pendingItem.quantity} to inventory)`)
    } else {
      // Create new item in inventory
      await LabInventoryItem.create({
        key,
        name: itemName,
        category: category || 'General',
        unitsPerPack: Number(unitsPerPack) || 1,
        onHand: pendingItem.quantity || 0,
        minStock: Number(minStock) || 0,
        lastSupplier: pendingItem.supplier,
        lastInvoice: pendingItem.purchaseOrderNumber,
        lastInvoiceDate: pendingItem.purchaseOrderDate,
        lastPacksReceived: pendingItem.quantity,
        lastTotalItemsReceived: pendingItem.quantity * (Number(unitsPerPack) || 1),
        lastBuyPerPack: pendingItem.price || 0,
        lastBuyPerUnit: (pendingItem.price || 0) / (Number(unitsPerPack) || 1),
        lastSalePerUnit: Number(salePerUnit) || 0,
        lastSalePerPack: (Number(salePerUnit) || 0) * (Number(unitsPerPack) || 1)
      })
      console.log(`✅ Created new item: ${itemName}`)
    }
    
    // Mark pending item as approved
    await LabPendingInventoryItem.findByIdAndUpdate(id, {
      status: 'approved',
      reviewedBy: actor,
      reviewedAt: new Date()
    })
    
    res.json({ ok: true })
  } catch (error) {
    console.error('Failed to approve pending item:', error)
    res.status(500).json({ error: 'Failed to approve pending item' })
  }
}

export async function reject(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { notes } = req.body
    const actor = (req as any).user?.username || (req as any).user?.name || 'system'
    
    await LabPendingInventoryItem.findByIdAndUpdate(id, {
      status: 'rejected',
      notes,
      reviewedBy: actor,
      reviewedAt: new Date()
    })
    
    res.json({ ok: true })
  } catch (error) {
    console.error('Failed to reject pending item:', error)
    res.status(500).json({ error: 'Failed to reject pending item' })
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const { id } = req.params
    await LabPendingInventoryItem.findByIdAndDelete(id)
    res.json({ ok: true })
  } catch (error) {
    console.error('Failed to delete pending item:', error)
    res.status(500).json({ error: 'Failed to delete pending item' })
  }
}
