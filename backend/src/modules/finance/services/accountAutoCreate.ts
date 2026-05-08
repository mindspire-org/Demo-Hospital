/**
 * Account Auto-Creation Service
 * Automatically creates Chart of Accounts entries when:
 * - Doctors are added
 * - Suppliers/Vendors are added
 * - Staff members are added
 * - IPD Patients are admitted
 * 
 * This ensures the Chart of Accounts stays synchronized with the hospital setup.
 */

import { ChartOfAccount } from '../models/ChartOfAccount'

type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense'
type SubType = 'CASH' | 'RECEIVABLE' | 'PAYABLE' | 'USER_ACCOUNT' | 'REVENUE' | 'BANK'
type Portal = 'hospital' | 'lab' | 'pharmacy' | 'diagnostic' | 'reception' | 'finance' | 'aesthetic' | 'dialysis'

interface CreateAccountParams {
  name: string
  type: AccountType
  subType?: SubType
  portal?: Portal
  linkedUserId?: string
  linkedUsername?: string
  parentCode?: string // Parent account code prefix
}

// Prefix map for auto-generating codes
const CODE_PREFIXES: Record<string, string> = {
  // Doctors - under Doctor Payable (LIA-001)
  doctor: 'DOC',
  // Suppliers/Vendors - under Vendor Payable (LIA-003)
  supplier: 'SUP',
  vendor: 'VEN',
  // Staff - under Staff Payable (LIA-002)
  staff: 'STF',
  // IPD Patients - under AR (AST-003)
  ipd_patient: 'IPD',
  // Reception users
  reception: 'REC',
  // Lab users
  lab: 'LAB',
  // Pharmacy users
  pharmacy: 'PHA',
  // Diagnostic users
  diagnostic: 'DIA',
  // Aesthetic users
  aesthetic: 'AES',
  // Dialysis users
  dialysis: 'DLY',
  // Corporate accounts
  corporate: 'COR',
}

/**
 * Generate the next available account code for a given prefix
 */
async function generateNextCode(prefix: string): Promise<string> {
  const lastAccount = await ChartOfAccount.findOne({
    code: { $regex: `^${prefix}-` },
  }).sort({ code: -1 })

  let nextNum = 1
  if (lastAccount?.code) {
    const match = lastAccount.code.match(/-(\d+)$/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }

  return `${prefix}-${String(nextNum).padStart(4, '0')}`
}

/**
 * Create or get an account for an entity
 */
export async function createOrUpdateAccount(params: CreateAccountParams): Promise<{
  success: boolean
  account?: any
  error?: string
}> {
  try {
    // Check if account already exists with this name
    const existing = await ChartOfAccount.findOne({ name: params.name })
    if (existing) {
      return { success: true, account: existing }
    }

    // Generate code based on parent or type
    const prefix = params.parentCode || CODE_PREFIXES[params.portal || 'hospital'] || 'ACC'
    const code = await generateNextCode(prefix)

    const account = await ChartOfAccount.create({
      code,
      name: params.name,
      type: params.type,
      subType: params.subType,
      portal: params.portal,
      linkedUserId: params.linkedUserId,
      linkedUsername: params.linkedUsername,
      balance: 0,
      active: true,
    })

    return { success: true, account }
  } catch (error: any) {
    console.error('[AccountAutoCreate] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Create account for a Doctor
 * - Creates a PAYABLE account under Doctor Payable parent
 */
export async function createDoctorAccount(doctorId: string, doctorName: string): Promise<void> {
  const accountName = `DR-${doctorName.replace(/\s+/g, '_').toUpperCase()}`
  
  await createOrUpdateAccount({
    name: accountName,
    type: 'Liability',
    subType: 'PAYABLE',
    portal: 'hospital',
    linkedUserId: doctorId,
    linkedUsername: doctorName,
    parentCode: 'DOC',
  })
}

/**
 * Create account for a Supplier/Vendor
 * - Creates a PAYABLE account under Vendor Payable parent
 */
export async function createSupplierAccount(supplierId: string, supplierName: string, portal: Portal = 'hospital'): Promise<void> {
  const accountName = `SUP-${supplierName.replace(/\s+/g, '_').toUpperCase()}`
  
  await createOrUpdateAccount({
    name: accountName,
    type: 'Liability',
    subType: 'PAYABLE',
    portal,
    linkedUserId: supplierId,
    linkedUsername: supplierName,
    parentCode: 'SUP',
  })
}

/**
 * Create account for a Staff member
 * - Creates a PAYABLE account under Staff Payable parent
 */
export async function createStaffAccount(staffId: string, staffName: string, portal: Portal = 'hospital'): Promise<void> {
  const accountName = `STF-${staffName.replace(/\s+/g, '_').toUpperCase()}`
  
  await createOrUpdateAccount({
    name: accountName,
    type: 'Liability',
    subType: 'PAYABLE',
    portal,
    linkedUserId: staffId,
    linkedUsername: staffName,
    parentCode: 'STF',
  })
}

/**
 * Create account for an IPD Patient
 * - Creates a RECEIVABLE account under AR parent
 */
export async function createIpdPatientAccount(patientId: string, patientName: string, mrn?: string): Promise<void> {
  const suffix = mrn ? `-${mrn}` : ''
  const accountName = `IPD-${patientName.replace(/\s+/g, '_').toUpperCase()}${suffix}`
  
  await createOrUpdateAccount({
    name: accountName,
    type: 'Asset',
    subType: 'RECEIVABLE',
    portal: 'hospital',
    linkedUserId: patientId,
    linkedUsername: patientName,
    parentCode: 'IPD',
  })
}

/**
 * Create account for a Corporate Company
 * - Creates a RECEIVABLE account under AR_CORPORATE parent
 */
export async function createCorporateAccount(corporateId: string, corporateName: string): Promise<void> {
  const accountName = `COR-${corporateName.replace(/\s+/g, '_').toUpperCase()}`
  
  await createOrUpdateAccount({
    name: accountName,
    type: 'Asset',
    subType: 'RECEIVABLE',
    portal: 'hospital',
    linkedUserId: corporateId,
    linkedUsername: corporateName,
    parentCode: 'COR',
  })
}

/**
 * Create account for a User (receptionist, admin, etc.)
 * - Creates a USER_ACCOUNT for cash handling tracking
 */
export async function createUserAccount(userId: string, username: string, portal: Portal): Promise<void> {
  const accountName = `${username}/${portal}`
  
  await createOrUpdateAccount({
    name: accountName,
    type: 'Asset',
    subType: 'USER_ACCOUNT',
    portal,
    linkedUserId: userId,
    linkedUsername: username,
    parentCode: CODE_PREFIXES[portal] || 'USR',
  })
}

export default {
  createDoctorAccount,
  createSupplierAccount,
  createStaffAccount,
  createIpdPatientAccount,
  createCorporateAccount,
  createUserAccount,
  createOrUpdateAccount,
}
