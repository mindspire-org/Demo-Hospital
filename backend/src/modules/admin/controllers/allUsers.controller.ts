import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { Types } from 'mongoose'

import { HospitalUser } from '../../hospital/models/User'
import { ReceptionUser } from '../../reception/models/User'
import { LabUser } from '../../lab/models/User'
import { PharmacyUser as OutdoorPharmacyUser } from '../../pharmacy/models/User'
import { PharmacyUser as IndoorPharmacyUser } from '../../indoorpharmacy/models/indoorUser'
import { FinanceUser } from '../../finance/models/finance_User'
import { DialysisUser } from '../../dialysis/models/User'
import { DiagnosticUser } from '../../diagnostic/models/User'
import { AestheticUser } from '../../aesthetic/models/User'
import { SuperAdminUser } from '../../admin/models/SuperAdminUser'

// ---------------------------------------------------------------------------
// Portal registry: maps portal key -> Mongoose model
// ---------------------------------------------------------------------------
const PORTAL_MODELS: Record<string, any> = {
  hospital: HospitalUser,
  reception: ReceptionUser,
  lab: LabUser,
  pharmacy: OutdoorPharmacyUser,
  'indoor-pharmacy': IndoorPharmacyUser,
  finance: FinanceUser,
  dialysis: DialysisUser,
  diagnostic: DiagnosticUser,
  aesthetic: AestheticUser,
  'super-admin': SuperAdminUser,
}

const PORTAL_LABELS: Record<string, string> = {
  hospital: 'Hospital',
  reception: 'Reception',
  lab: 'Lab',
  pharmacy: 'Pharmacy',
  'indoor-pharmacy': 'Indoor Pharmacy',
  finance: 'Finance',
  dialysis: 'Dialysis',
  diagnostic: 'Diagnostic',
  aesthetic: 'Aesthetic',
  'super-admin': 'Super Admin',
}

// Role enums per portal (for frontend dropdowns / basic validation)
const PORTAL_ROLES: Record<string, string[]> = {
  hospital: ['admin', 'doctor', 'nurse', 'receptionist', 'staff', 'finance'],
  reception: ['admin', 'receptionist'],
  lab: ['admin', 'technician', 'collection-agent'],
  pharmacy: ['admin', 'salesman', 'pharmacist'],
  'indoor-pharmacy': ['admin', 'salesman', 'pharmacist'],
  finance: ['admin', 'accountant', 'cashier'],
  dialysis: ['admin', 'doctor', 'nurse', 'technician', 'staff'],
  diagnostic: ['admin', 'radiologist', 'technician'],
  aesthetic: ['admin', 'doctor', 'staff'],
  'super-admin': ['super-admin'],
}

// Default roles that cannot be deleted per portal
const PROTECTED_ROLES: Record<string, string[]> = {
  hospital: ['admin', 'superadmin'],
  reception: ['admin'],
  lab: ['admin'],
  pharmacy: ['admin'],
  'indoor-pharmacy': ['admin'],
  finance: ['admin'],
  dialysis: ['admin'],
  diagnostic: ['admin'],
  aesthetic: ['admin'],
  'super-admin': ['super-admin'],
}

function getModel(portal: string) {
  const m = PORTAL_MODELS[portal]
  if (!m) throw new Error(`Unknown portal: ${portal}`)
  return m
}

function safeObjectId(id: string) {
  try { return new Types.ObjectId(id) } catch { return null }
}

// ---------------------------------------------------------------------------
// GET /all-users
// ---------------------------------------------------------------------------
export async function listAllUsers(_req: Request, res: Response) {
  const results: Record<string, any[]> = {}

  for (const [portal, Model] of Object.entries(PORTAL_MODELS)) {
    try {
      const users = await Model.find({}, { passwordHash: 0 }).sort({ username: 1 }).lean()
      results[portal] = (users || []).map((u: any) => ({
        _id: String(u._id),
        username: u.username || '',
        role: u.role || '',
        fullName: u.fullName || '',
        email: u.email || '',
        phone: u.phone || '',
        active: u.active !== false,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }))
    } catch {
      results[portal] = []
    }
  }

  res.json({ portals: PORTAL_LABELS, roles: PORTAL_ROLES, users: results })
}

// ---------------------------------------------------------------------------
// POST /all-users
// Body: { portal, username, password, role, fullName?, email?, phone? }
// ---------------------------------------------------------------------------
export async function createUser(req: Request, res: Response) {
  const { portal, username, password, role, fullName, email, phone } = req.body || {}

  if (!portal || !username || !password || !role) {
    return res.status(400).json({ error: 'portal, username, password, and role are required' })
  }

  const Model = getModel(portal)

  try {
    const existing = await Model.findOne({ username: String(username).trim().toLowerCase() }).lean()
    if (existing) return res.status(409).json({ error: 'Username already exists in this portal' })

    const passwordHash = await bcrypt.hash(String(password), 10)
    const payload: any = {
      username: String(username).trim().toLowerCase(),
      role: String(role).trim().toLowerCase(),
      passwordHash,
    }

    if (fullName !== undefined) payload.fullName = fullName
    if (email !== undefined) payload.email = email
    if (phone !== undefined) payload.phone = phone

    const doc = await Model.create(payload)
    const created = await Model.findById(doc._id, { passwordHash: 0 }).lean()

    res.status(201).json({ ok: true, user: created })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to create user' })
  }
}

// ---------------------------------------------------------------------------
// PUT /all-users/:portal/:id
// Body: { username?, role?, fullName?, email?, phone?, active?, password? }
// ---------------------------------------------------------------------------
export async function updateUser(req: Request, res: Response) {
  const { portal, id } = req.params
  const Model = getModel(portal)

  const oid = safeObjectId(id)
  if (!oid) return res.status(400).json({ error: 'Invalid user ID' })

  const data = req.body || {}
  const patch: any = {}

  if (data.username !== undefined) patch.username = String(data.username).trim().toLowerCase()
  if (data.role !== undefined) patch.role = String(data.role).trim().toLowerCase()
  if (data.fullName !== undefined) patch.fullName = data.fullName
  if (data.email !== undefined) patch.email = data.email
  if (data.phone !== undefined) patch.phone = data.phone
  if (data.active !== undefined) patch.active = !!data.active
  if (data.shiftId !== undefined) patch.shiftId = data.shiftId || null
  if (data.shiftRestricted !== undefined) patch.shiftRestricted = !!data.shiftRestricted

  if (data.password) {
    patch.passwordHash = await bcrypt.hash(String(data.password), 10)
  }

  try {
    const updated = await Model.findByIdAndUpdate(oid, patch, { new: true, runValidators: false }).lean()
    if (!updated) return res.status(404).json({ error: 'User not found' })

    const { passwordHash, ...rest } = updated as any
    res.json({ ok: true, user: rest })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update user' })
  }
}

// ---------------------------------------------------------------------------
// DELETE /all-users/:portal/:id
// ---------------------------------------------------------------------------
export async function deleteUser(req: Request, res: Response) {
  const { portal, id } = req.params
  const Model = getModel(portal)

  const oid = safeObjectId(id)
  if (!oid) return res.status(400).json({ error: 'Invalid user ID' })

  try {
    const user: any = await Model.findById(oid).lean()
    if (!user) return res.status(404).json({ error: 'User not found' })

    const role = String(user.role || '').toLowerCase().trim()
    const protectedList = PROTECTED_ROLES[portal] || []
    if (protectedList.includes(role)) {
      return res.status(403).json({ error: `Cannot delete protected role: ${role}` })
    }

    // Prevent self-deletion
    const selfId = String((req as any).user?._id || (req as any).user?.id || (req as any).user?.sub || '')
    if (selfId && String(user._id) === selfId) {
      return res.status(403).json({ error: 'Cannot delete yourself' })
    }

    await Model.findByIdAndDelete(oid)
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to delete user' })
  }
}

// ---------------------------------------------------------------------------
// POST /all-users/:portal/:id/reset-password
// ---------------------------------------------------------------------------
export async function resetPassword(req: Request, res: Response) {
  const { portal, id } = req.params
  const { newPassword } = req.body || {}
  const password = newPassword || '123'

  const Model = getModel(portal)
  const oid = safeObjectId(id)
  if (!oid) return res.status(400).json({ error: 'Invalid user ID' })

  try {
    const passwordHash = await bcrypt.hash(String(password), 10)
    const updated = await Model.findByIdAndUpdate(oid, { passwordHash }, { new: true }).lean()
    if (!updated) return res.status(404).json({ error: 'User not found' })
    res.json({ ok: true, message: `Password reset to: ${password}` })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to reset password' })
  }
}
