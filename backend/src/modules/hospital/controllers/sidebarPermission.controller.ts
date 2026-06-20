import { Request, Response } from 'express'
import { HospitalSidebarPermission } from '../models/SidebarPermission'
import { sidebarPermissionCreateSchema, sidebarPermissionUpdateSchema, sidebarPermissionQuerySchema } from '../validators/sidebarPermission'

// Default sidebar items for Hospital module
const defaultSidebarItems = [
  // Top
  { path: '/hospital', label: 'Dashboard', order: 1 },
  { path: '/hospital/token-generator', label: 'Token Generator', order: 2 },
  { path: '/hospital/today-tokens', label: "Today's Tokens", order: 3 },
  { path: '/hospital/token-history', label: 'Token History', order: 4 },
  { path: '/hospital/departments', label: 'Departments', order: 5 },

  // Groups: IPD Management
  { path: '/hospital/ipd', label: 'IPD Dashboard', order: 10 },
  { path: '/hospital/bed-management', label: 'Bed Management', order: 11 },
  { path: '/hospital/patient-list', label: 'Patient List', order: 12 },
  { path: '/hospital/ipd-referrals', label: 'Referrals', order: 13 },
  { path: '/hospital/discharged', label: 'Discharged', order: 14 },

  // IPD Forms
  { path: '/hospital/forms/received-deaths', label: 'Received Death', order: 20 },
  { path: '/hospital/forms/death-certificates', label: 'Death Certificates', order: 21 },
  { path: '/hospital/forms/birth-certificates', label: 'Birth Certificates', order: 22 },
  { path: '/hospital/forms/short-stays', label: 'Short Stays', order: 23 },
  { path: '/hospital/forms/discharge-summaries', label: 'Discharge Summaries', order: 24 },
  { path: '/hospital/forms/invoices', label: 'Invoices', order: 25 },

  // Staff Management
  { path: '/hospital/staff-dashboard', label: 'Staff Dashboard', order: 30 },
  { path: '/hospital/staff-attendance', label: 'Staff Attendance', order: 31 },
  { path: '/hospital/staff-monthly', label: 'Staff Monthly', order: 32 },
  { path: '/hospital/staff-settings', label: 'Staff Settings', order: 33 },
  { path: '/hospital/biometric-settings', label: 'Biometric Settings', order: 34 },
  { path: '/hospital/staff-management', label: 'Staff Management', order: 35 },

  // Doctor Management
  { path: '/hospital/doctors', label: 'Add Doctors', order: 40 },
  { path: '/hospital/doctor-schedules', label: 'Doctor Schedules', order: 41 },
  { path: '/hospital/finance/doctors', label: 'Doctors Finance', order: 42 },
  { path: '/hospital/finance/doctor-payouts', label: 'Doctor Payouts', order: 43 },

  // OT Management
  { path: '/hospital/ot', label: 'OT Dashboard', order: 50 },
  { path: '/hospital/ot/schedule', label: 'OT Schedule', order: 51 },
  { path: '/hospital/ot/rooms', label: 'OT Rooms', order: 52 },
  { path: '/hospital/ot/team', label: 'OT Team', order: 53 },
  { path: '/hospital/ot/sterilization', label: 'Sterilization', order: 54 },
  { path: '/hospital/ot/equipment', label: 'OT Equipment', order: 55 },
  { path: '/hospital/ot/procedures', label: 'OT Procedures', order: 56 },
  { path: '/hospital/ot/reports', label: 'OT Reports', order: 57 },

  // ICU Management
  { path: '/hospital/icu', label: 'ICU Dashboard', order: 60 },
  { path: '/hospital/icu/beds', label: 'ICU Bed Status', order: 61 },
  { path: '/hospital/icu/monitoring', label: 'Vitals Monitoring', order: 62 },
  { path: '/hospital/icu/scoring', label: 'Severity Scoring', order: 63 },
  { path: '/hospital/icu/ventilator', label: 'Ventilator/Device', order: 64 },
  { path: '/hospital/icu/reports', label: 'ICU Reports', order: 65 },

  // Store Management
  { path: '/hospital/store', label: 'Store Dashboard', order: 70 },
  { path: '/hospital/store/inventory', label: 'Store Inventory', order: 71 },
  { path: '/hospital/store/add-purchase', label: 'Add Purchase', order: 72 },
  { path: '/hospital/store/purchase-history', label: 'Purchase History', order: 73 },
  { path: '/hospital/store/purchase-orders', label: 'Purchase Orders', order: 74 },
  { path: '/hospital/store/issue-history', label: 'Issue History', order: 75 },
  { path: '/hospital/store/suppliers', label: 'Store Suppliers', order: 76 },
  { path: '/hospital/store/reports', label: 'Store Reports', order: 77 },

  // Equipment Management
  { path: '/hospital/equipment/dashboard', label: 'Equipment Dashboard', order: 80 },
  { path: '/hospital/equipment', label: 'Equipment List', order: 81 },
  { path: '/hospital/equipment/purchases', label: 'Equipment Purchases', order: 82 },
  { path: '/hospital/equipment/suppliers', label: 'Equipment Suppliers', order: 83 },

  // Ambulance Management
  { path: '/hospital/ambulance', label: 'Ambulance Dashboard', order: 90 },
  { path: '/hospital/ambulance/master', label: 'Ambulance List', order: 91 },
  { path: '/hospital/ambulance/trips', label: 'Trips History', order: 92 },
  { path: '/hospital/ambulance/fuel', label: 'Fuel Logs', order: 93 },
  { path: '/hospital/ambulance/expenses', label: 'Expenses', order: 94 },
  { path: '/hospital/ambulance/reports', label: 'Ambulance Reports', order: 95 },

  // Expense Management
  { path: '/hospital/finance/add-expense', label: 'Add Expense', order: 100 },
  { path: '/hospital/finance/expenses', label: 'Expense History', order: 101 },
  { path: '/hospital/finance/transactions', label: 'Transactions', order: 102 },

  // Corporate Panel
  { path: '/hospital/corporate', label: 'Corporate Dashboard', order: 110 },
  { path: '/hospital/corporate/companies', label: 'Companies', order: 111 },
  { path: '/hospital/corporate/rate-rules', label: 'Rate Rules', order: 112 },
  { path: '/hospital/corporate/transactions', label: 'Transactions', order: 113 },
  { path: '/hospital/corporate/claims', label: 'Claims', order: 114 },
  { path: '/hospital/corporate/payments', label: 'Payments', order: 115 },
  { path: '/hospital/corporate/reports', label: 'Reports', order: 116 },

  // Bottom
  { path: '/hospital/search-patients', label: 'Search Patients', order: 120 },
  { path: '/hospital/user-management', label: 'Users', order: 121 },
  { path: '/hospital/sidebar-permissions', label: 'Sidebar Permissions', order: 122 },
  { path: '/hospital/audit', label: 'Audit log', order: 123 },
  { path: '/hospital/settings', label: 'Settings', order: 124 },
  { path: '/hospital/backup', label: 'Backup', order: 125 },
]

const defaultVisibility: Record<string, Array<{ path: string; label: string; visible: boolean; order: number }>> = {
  admin: defaultSidebarItems.map(item => ({ ...item, visible: true })),
  staff: defaultSidebarItems.map(item => ({
    ...item,
    visible: [
      '/hospital/user-management','/hospital/sidebar-permissions','/hospital/settings','/hospital/backup',
      '/hospital/corporate','/hospital/corporate/companies','/hospital/corporate/rate-rules','/hospital/corporate/transactions','/hospital/corporate/claims','/hospital/corporate/payments','/hospital/corporate/reports',
      '/hospital/finance/doctors','/hospital/finance/doctor-payouts',
    ].includes(item.path) ? false : true,
  })),
  reception: defaultSidebarItems.map(item => ({
    ...item,
    visible: [
      '/hospital','/hospital/token-generator','/hospital/today-tokens','/hospital/token-history',
      '/hospital/search-patients','/hospital/patient-list','/hospital/departments',
    ].includes(item.path) ? true : false,
  })),
  nurse: defaultSidebarItems.map(item => ({
    ...item,
    visible: [
      '/hospital','/hospital/ipd','/hospital/patient-list','/hospital/search-patients',
      '/hospital/bed-management','/hospital/forms/discharge-summaries',
    ].includes(item.path) ? true : false,
  })),
}

function normRole(role: string){ return String(role||'').trim().toLowerCase() }
const defaultAllVisible = defaultSidebarItems.map(item => ({ ...item, visible: false }))
function getDefaultForRole(role: string){
  const r = normRole(role)
  const preset = (defaultVisibility as any)[r]
  return Array.isArray(preset) ? preset : defaultAllVisible
}

export async function listRoles(_req: Request, res: Response){
  const docs = await HospitalSidebarPermission.find({}, { role: 1 }).sort({ role: 1 }).lean()
  const items = (docs||[]).map(d=>d.role).filter(r=> normRole(r) !== 'superadmin')
  res.json({ items })
}

export async function createRole(req: Request, res: Response){
  const parsed = sidebarPermissionCreateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Validation failed', issues: parsed.error.issues })
  const role = normRole(parsed.data.role)
  if (!role) return res.status(400).json({ message: 'Role is required' })
  if (role === 'superadmin') return res.status(403).json({ message: 'Reserved role' })
  const actor = (req as any).user?.name || (req as any).user?.email || 'system'
  const existing = await HospitalSidebarPermission.findOne({ role }).lean()
  if (existing) return res.status(400).json({ message: 'Role already exists' })
  const created = await HospitalSidebarPermission.create({ role, permissions: parsed.data.permissions?.length ? parsed.data.permissions : getDefaultForRole(role), updatedBy: actor })
  res.status(201).json(created)
}

export async function deleteRole(req: Request, res: Response){
  const role = normRole(req.params.role)
  if (!role) return res.status(400).json({ message: 'Role is required' })
  if (['admin','staff','reception','receptionist','nurse','doctor','finance','superadmin'].includes(role)) return res.status(400).json({ message: 'Default roles cannot be deleted' })
  await HospitalSidebarPermission.deleteOne({ role })
  res.json({ ok: true })
}

export async function getPermissions(req: Request, res: Response){
  const parsed = sidebarPermissionQuerySchema.safeParse(req.query)
  const { role } = parsed.success ? (parsed.data as any) : {}
  const filter: any = {}
  if (role){
    const r = normRole(role)
    if (r === 'superadmin') return res.status(403).json({ message: 'Reserved role cannot be queried' })
    filter.role = r
  }
  const rows = await HospitalSidebarPermission.find(filter).lean()
  if (rows.length === 0 && !role){
    const defaults = await createDefaultPermissions()
    return res.json(defaults)
  }
  if (rows.length === 0 && role){
    const roleDefault = getDefaultForRole(role)
    const doc = await HospitalSidebarPermission.create({ role: normRole(role), permissions: roleDefault, updatedBy: (req as any).user?.name || 'system' })
    return res.json([doc])
  }
  res.json(rows)
}

export async function updatePermissions(req: Request, res: Response){
  const { role } = req.params
  const data = sidebarPermissionUpdateSchema.parse(req.body)
  const actor = (req as any).user?.name || (req as any).user?.email || 'system'
  if (normRole(role) === 'superadmin') return res.status(403).json({ message: 'Reserved role cannot be modified' })
  const updated = await HospitalSidebarPermission.findOneAndUpdate({ role: normRole(role) }, { permissions: data.permissions, updatedBy: actor }, { new: true, upsert: true })
  res.json(updated)
}

export async function resetToDefaults(req: Request, res: Response){
  const { role } = req.params
  const actor = (req as any).user?.name || (req as any).user?.email || 'system'
  const roleDefault = getDefaultForRole(role)
  const reset = await HospitalSidebarPermission.findOneAndUpdate({ role: normRole(role) }, { permissions: roleDefault, updatedBy: actor }, { new: true, upsert: true })
  res.json(reset)
}

export async function createDefaultPermissions(){
  const roles = ['admin','staff','reception','nurse']
  const docs: any[] = []
  for (const r of roles){
    const ex = await HospitalSidebarPermission.findOne({ role: r }).lean()
    if (!ex){ docs.push(await HospitalSidebarPermission.create({ role: r, permissions: getDefaultForRole(r), updatedBy: 'system' })) }
  }
  if (docs.length === 0) return await HospitalSidebarPermission.find({}).lean()
  return docs
}
