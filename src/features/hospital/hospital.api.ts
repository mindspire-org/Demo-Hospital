/**
 * Hospital API Module
 * 
 * Main entry point that re-exports all sub-modules:
 * - Shared (Settings, Reports, FBR, Finance, Patients, Doctors, Users, Staff, Bed Management, Notifications, Audit Logs)
 * - OPD (Tokens, Encounters, Prescriptions, Appointments, Referrals, Templates)
 * - IPD (Admissions, Discharge, Vitals, Notes, Clinical Notes, Doctor Visits, Med Orders, MAR, Lab Links, Billing, Payments, Referrals, Forms)
 * - ER (Encounters, Charges, Billing, Services, Vitals, Med Orders, Clinical Notes, Referrals)
 * - Store (Categories, Units, Locations, Items, Lots, Stock, Transactions, Suppliers, Inventory, Purchases, Issues, Reports)
 * - Ambulance (Master, Trips, Fuel, Expenses, Reports)
 * - Equipment (Management, PPM, Calibrations, Breakdowns, Condemnations)
 */

import { opdApi } from './opd'
import { ipdApi } from './ipd'
import { erApi } from './er'
import { storeApi } from './store'
import { ambulanceApi } from './ambulance'
import { equipmentApi } from './equipment'
import { sharedApi } from './shared'
import { otApi } from './ot'
import { icuApi } from './icu'
import { indoorPharmacyIntegrationApi } from './indoorpharmacy'
import { api } from '../../api'

export const hospitalApi = {
  // OPD Module
  ...opdApi,

  // IPD Module
  ...ipdApi,

  // ER Module
  ...erApi,

  // Store Module
  ...storeApi,

  // Ambulance Module
  ...ambulanceApi,

  // Equipment Module
  ...equipmentApi,

  // Shared Module
  ...sharedApi,

  // OT Module
  ...otApi,

  // ICU Module
  ...icuApi,

  // Indoor Pharmacy Integration Module
  ...indoorPharmacyIntegrationApi,

  // Patient Transfer (ER <-> IPD)
  transferPatient: (data: {
    sourceEncounterId: string
    targetType: 'IPD' | 'ER'
    departmentId: string
    doctorId?: string
    bedId?: string
    deposit?: number
    corporateId?: string
    corporatePreAuthNo?: string
    corporateCoPayPercent?: number
    corporateCoverageCap?: number
  }) => api('/hospital/patients/transfer', { method: 'POST', body: JSON.stringify(data) }),
}

export default hospitalApi
