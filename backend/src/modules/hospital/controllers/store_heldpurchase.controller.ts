import type { Request, Response } from 'express'
import { HeldPurchase } from '../models/store_heldpurchase.model'

export const storeHeldPurchaseController = {
  // Create a new held purchase
  async create(req: Request, res: Response) {
    try {
      const { form, lines, totalAmount, notes } = req.body
      const user = (req as any).user || {}
      
      const held = await HeldPurchase.create({
        userId: user._id || user.id,
        username: user.username || user.name,
        date: form?.date,
        invoiceNo: form?.invoiceNo,
        supplierId: form?.supplierId,
        supplierName: form?.supplierName,
        paymentMode: form?.paymentMode || 'credit',
        storeLocation: form?.storeLocation,
        lines: lines || [],
        totalAmount: totalAmount || 0,
        notes,
        heldAt: new Date(),
      })
      
      return res.json({ success: true, held: { id: held._id, _id: held._id, heldAt: held.heldAt } })
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to hold purchase' })
    }
  },

  // List all held purchases for current user
  async list(req: Request, res: Response) {
    try {
      const user = (req as any).user || {}
      const userId = user._id || user.id
      
      // Get held purchases for this user, sorted by most recent first
      const items = await HeldPurchase.find(userId ? { userId } : {})
        .sort({ heldAt: -1 })
        .lean() as any[]
      
      return res.json({ 
        success: true, 
        items: items.map((h: any) => ({
          id: h._id?.toString(),
          _id: h._id?.toString(),
          userId: h.userId,
          username: h.username,
          form: {
            date: h.date,
            invoiceNo: h.invoiceNo,
            supplierId: h.supplierId,
            supplierName: h.supplierName,
            paymentMode: h.paymentMode,
            storeLocation: h.storeLocation,
          },
          lines: h.lines,
          totalAmount: h.totalAmount,
          heldAt: h.heldAt,
          notes: h.notes,
        }))
      })
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to list held purchases' })
    }
  },

  // Get a single held purchase
  async get(req: Request, res: Response) {
    try {
      const { id } = req.params
      const held = await HeldPurchase.findById(id).lean() as any
      
      if (!held) {
        return res.status(404).json({ success: false, error: 'Held purchase not found' })
      }
      
      return res.json({
        success: true,
        held: {
          id: held._id?.toString(),
          _id: held._id?.toString(),
          form: {
            date: held.date,
            invoiceNo: held.invoiceNo,
            supplierId: held.supplierId,
            supplierName: held.supplierName,
            paymentMode: held.paymentMode,
            storeLocation: held.storeLocation,
          },
          lines: held.lines,
          totalAmount: held.totalAmount,
          heldAt: held.heldAt,
          notes: held.notes,
        }
      })
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to get held purchase' })
    }
  },

  // Delete a held purchase
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      await HeldPurchase.findByIdAndDelete(id)
      return res.json({ success: true })
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to delete held purchase' })
    }
  },

  // Restore (get and delete) a held purchase
  async restore(req: Request, res: Response) {
    try {
      const { id } = req.params
      const held = await HeldPurchase.findById(id).lean() as any
      
      if (!held) {
        return res.status(404).json({ success: false, error: 'Held purchase not found' })
      }
      
      // Delete after retrieving
      await HeldPurchase.findByIdAndDelete(id)
      
      return res.json({
        success: true,
        held: {
          id: held._id?.toString(),
          _id: held._id?.toString(),
          form: {
            date: held.date,
            invoiceNo: held.invoiceNo,
            supplierId: held.supplierId,
            supplierName: held.supplierName,
            paymentMode: held.paymentMode,
            storeLocation: held.storeLocation,
          },
          lines: held.lines,
          totalAmount: held.totalAmount,
          heldAt: held.heldAt,
          notes: held.notes,
        }
      })
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to restore held purchase' })
    }
  }
}
