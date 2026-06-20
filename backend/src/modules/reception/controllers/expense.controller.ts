import { Request, Response } from 'express'
import Expense from '../models/Expense'
import { logActivity } from '../../finance/services/activityLog.service'

export const expenseController = {
  // Reception user: create expense
  async create(req: Request, res: Response) {
    try {
      const { date, category, amount, description, receiptUrl } = req.body
      const createdBy = (req as any).user?.id || (req as any).user?._id
      const createdByUsername = (req as any).user?.username || 'unknown'

      if (!category || !amount || !description) {
        return res.status(400).json({ error: 'category, amount, and description are required' })
      }

      const expense = await Expense.create({
        date: date ? new Date(date) : new Date(),
        category,
        amount: Number(amount),
        description,
        receiptUrl,
        createdBy,
        createdByUsername,
        status: 'pending',
      })

      // Activity log
      try {
        logActivity({
          userId: String(createdBy || 'system'),
          userName: createdByUsername,
          portal: 'reception',
          action: 'Expense Created',
          module: 'Expense',
          entityId: String(expense._id),
          entityLabel: `${expense.category} — ${expense.description}`,
          amount: Number(expense.amount || 0),
          method: '',
          meta: { category: expense.category, status: expense.status, receiptUrl: expense.receiptUrl || '' }
        })
      } catch {}

      res.status(201).json({ expense })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  },

  // Reception user: list my own expenses
  async listMy(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || (req as any).user?._id
      const { status, from, to, page = '1', limit = '50' } = req.query

      const filter: any = { createdBy: userId }
      if (status) filter.status = status
      if (from || to) {
        filter.date = {}
        if (from) filter.date.$gte = new Date(String(from))
        if (to) filter.date.$lte = new Date(String(to))
      }

      const pageNum = Math.max(1, Number(page))
      const limitNum = Math.min(100, Math.max(1, Number(limit)))
      const skip = (pageNum - 1) * limitNum

      const [expenses, total] = await Promise.all([
        Expense.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
        Expense.countDocuments(filter),
      ])

      res.json({ expenses, total, page: pageNum, limit: limitNum })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  },

  // Reception user: delete my pending expense
  async deleteMy(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || (req as any).user?._id
      const { id } = req.params

      const expense = await Expense.findOne({ _id: id, createdBy: userId })
      if (!expense) return res.status(404).json({ error: 'Expense not found' })
      if (expense.status !== 'pending') return res.status(400).json({ error: 'Only pending expenses can be deleted' })

      await Expense.deleteOne({ _id: id })
      res.json({ deleted: true })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  },

  // Finance: list all expenses (pending + all)
  async listAll(req: Request, res: Response) {
    try {
      const { status, from, to, search, page = '1', limit = '50' } = req.query

      const filter: any = {}
      if (status) filter.status = status
      if (from || to) {
        filter.date = {}
        if (from) filter.date.$gte = new Date(String(from))
        if (to) filter.date.$lte = new Date(String(to))
      }
      if (search) {
        filter.$or = [
          { description: { $regex: String(search), $options: 'i' } },
          { category: { $regex: String(search), $options: 'i' } },
          { createdByUsername: { $regex: String(search), $options: 'i' } },
        ]
      }

      const pageNum = Math.max(1, Number(page))
      const limitNum = Math.min(100, Math.max(1, Number(limit)))
      const skip = (pageNum - 1) * limitNum

      const [expenses, total] = await Promise.all([
        Expense.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
        Expense.countDocuments(filter),
      ])

      res.json({ expenses, total, page: pageNum, limit: limitNum })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  },

  // Finance: approve expense
  async approve(req: Request, res: Response) {
    try {
      const { id } = req.params
      const approverId = (req as any).user?.id || (req as any).user?._id
      const approverUsername = (req as any).user?.username || 'unknown'

      const expense = await Expense.findById(id)
      if (!expense) return res.status(404).json({ error: 'Expense not found' })
      if (expense.status !== 'pending') return res.status(400).json({ error: 'Expense is not pending' })

      expense.status = 'approved'
      expense.approvedBy = approverId
      expense.approvedByUsername = approverUsername
      expense.approvedAt = new Date()
      expense.rejectionReason = undefined
      await expense.save()

      res.json({ expense })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  },

  // Finance: reject expense
  async reject(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { reason } = req.body
      const approverId = (req as any).user?.id || (req as any).user?._id
      const approverUsername = (req as any).user?.username || 'unknown'

      const expense = await Expense.findById(id)
      if (!expense) return res.status(404).json({ error: 'Expense not found' })
      if (expense.status !== 'pending') return res.status(400).json({ error: 'Expense is not pending' })

      expense.status = 'rejected'
      expense.approvedBy = approverId
      expense.approvedByUsername = approverUsername
      expense.approvedAt = new Date()
      expense.rejectionReason = reason || 'No reason provided'
      await expense.save()

      res.json({ expense })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  },
}
