import { Request, Response } from 'express'
import { CampSidebarPermission } from '../models/CampSidebarPermission'

const defaultSidebarItems = [
  { path: '/camp', label: 'Dashboard', order: 1 },
  { path: '/camp/schedule', label: 'Camp Schedule', order: 2 },
  { path: '/camp/patients', label: 'Patients', order: 3 },
  { path: '/camp/consultations', label: 'Consultations', order: 4 },
  { path: '/camp/prescriptions', label: 'Prescriptions', order: 5 },
  { path: '/camp/lab-orders', label: 'Lab Orders', order: 6 },
  { path: '/camp/diagnostics', label: 'Diagnostics', order: 7 },
  { path: '/camp/dispensing', label: 'Dispensing', order: 8 },
  { path: '/camp/staff', label: 'Staff', order: 9 },
  { path: '/camp/reports', label: 'Reports', order: 10 },
  { path: '/camp/settings', label: 'Settings', order: 11 },
  { path: '/camp/user-management', label: 'User Management', order: 12 },
]

const defaultVisibility: Record<string, Array<{ path: string; label: string; visible: boolean; order: number }>> = {
  admin: defaultSidebarItems.map(item => ({ ...item, visible: true })),
  doctor: defaultSidebarItems.map(item => ({ ...item, visible: true })),
  nurse: defaultSidebarItems.map(item => ({ ...item, visible: ['Dashboard', 'Patients', 'Consultations', 'Prescriptions', 'Lab Orders', 'Diagnostics', 'Dispensing'].includes(item.label) })),
  pharmacist: defaultSidebarItems.map(item => ({ ...item, visible: ['Dashboard', 'Patients', 'Dispensing', 'Prescriptions'].includes(item.label) })),
  coordinator: defaultSidebarItems.map(item => ({ ...item, visible: ['Dashboard', 'Camp Schedule', 'Patients', 'Staff', 'Reports'].includes(item.label) })),
}

const defaultAllVisible = defaultSidebarItems.map(item => ({ ...item, visible: false }))

const normalizeRole = (role: string) => String(role || '').trim().toLowerCase()

function getDefaultForRole(role: string) {
  const r = normalizeRole(role)
  const preset = (defaultVisibility as any)[r]
  return Array.isArray(preset) ? preset : defaultAllVisible
}

async function createDefaultPermissions() {
  for (const role of Object.keys(defaultVisibility)) {
    const exists = await CampSidebarPermission.findOne({ role }).lean()
    if (!exists) {
      await CampSidebarPermission.create({ role, permissions: getDefaultForRole(role) })
    }
  }
}

export async function listRoles(_req: Request, res: Response) {
  let roles = await CampSidebarPermission.find({}, { role: 1 }).sort({ role: 1 }).lean()
  if (!roles.length) {
    await createDefaultPermissions()
    roles = await CampSidebarPermission.find({}, { role: 1 }).sort({ role: 1 }).lean()
  }
  const items = roles.map(r => r.role).filter((r: any) => String(r || '').trim().toLowerCase() !== 'superadmin')
  res.json({ items })
}

export async function createRole(req: Request, res: Response) {
  const { role } = req.body || {}
  if (!role) return res.status(400).json({ message: 'Role is required' })
  const r = normalizeRole(role)
  const exists = await CampSidebarPermission.findOne({ role: r }).lean()
  if (exists) return res.status(400).json({ message: 'Role already exists' })
  const item = await CampSidebarPermission.create({ role: r, permissions: getDefaultForRole(r) })
  res.status(201).json(item)
}

export async function deleteRole(req: Request, res: Response) {
  const { role } = req.params
  await CampSidebarPermission.findOneAndDelete({ role: normalizeRole(role) })
  res.json({ ok: true })
}

export async function getPermissions(req: Request, res: Response) {
  const { role } = req.query as any
  const r = normalizeRole(role || '')
  let item = await CampSidebarPermission.findOne({ role: r }).lean() as any
  if (!item) {
    await createDefaultPermissions()
    item = await CampSidebarPermission.findOne({ role: r }).lean()
  }
  res.json(item || { role: r, permissions: getDefaultForRole(r) })
}

export async function updatePermissions(req: Request, res: Response) {
  const { role } = req.params
  const { permissions } = req.body || {}
  const r = normalizeRole(role)
  const item = await CampSidebarPermission.findOneAndUpdate(
    { role: r },
    { $set: { permissions, updatedBy: (req as any).user?.username || '' } },
    { new: true, upsert: true }
  )
  res.json(item)
}

export async function resetToDefaults(req: Request, res: Response) {
  const { role } = req.params
  const r = normalizeRole(role)
  const item = await CampSidebarPermission.findOneAndUpdate(
    { role: r },
    { $set: { permissions: getDefaultForRole(r), updatedBy: (req as any).user?.username || '' } },
    { new: true, upsert: true }
  )
  res.json(item)
}
