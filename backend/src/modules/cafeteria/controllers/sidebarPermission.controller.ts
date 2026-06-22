import { Request, Response } from 'express'
import { SidebarPermission } from '../models/SidebarPermission'

const DEFAULT_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', visible: true },
  { key: 'pos', label: 'POS', visible: true },
  { key: 'deals', label: 'Deals & Combos', visible: true },
  { key: 'menu-items', label: 'Menu Items', visible: true },
  { key: 'sales-history', label: 'Sales History', visible: true },
  { key: 'billing', label: 'Billing & Receipts', visible: true },
  { key: 'daily-shift', label: 'Daily Opening/Closing', visible: true },
  { key: 'reports', label: 'Reports', visible: true },
  { key: 'settings', label: 'Settings', visible: true },
  { key: 'user-management', label: 'User Management', visible: true },
  { key: 'audit-logs', label: 'Audit Logs', visible: true },
  { key: 'sidebar-permissions', label: 'Sidebar Permissions', visible: true },
]

export async function list(req: Request, res: Response) {
  const role = String((req.query as any).role || (req as any).user?.role || 'admin')
  let doc: any = await SidebarPermission.findOne({ role }).lean()
  if (!doc) {
    const created = await SidebarPermission.create({ role, items: DEFAULT_ITEMS })
    doc = created.toObject()
  }
  res.json(doc)
}

export async function update(req: Request, res: Response) {
  const role = String((req.body as any).role || (req as any).user?.role || 'admin')
  const items = (req.body as any).items
  const doc = await SidebarPermission.findOneAndUpdate(
    { role },
    { $set: { items } },
    { upsert: true, new: true },
  )
  res.json(doc)
}
