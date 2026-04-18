/**
 * Backward Compatibility Layer
 *
 * This file re-exports all APIs from the new modular structure.
 * All imports from '@/utils/api' will continue to work unchanged.
 *
 * New code should import directly from feature modules:
 *   import { labApi } from '@/features/lab'
 *   import { hospitalApi } from '@/features/hospital'
 */

// Re-export core API utilities
export {
  baseURL,
  getToken,
  setToken,
  removeToken,
  api,
  cachedApi,
  clearApiCache,
  invalidateCache,
} from '@/api'

export {
  buildQuery,
  withQuery,
  encodePathSegment,
  buildUrl,
  jsonBody,
  request,
} from '@/api'

// Re-export domain APIs from feature modules
export { adminApi } from '@/features/admin'
export { diagnosticApi } from '@/features/diagnostic'
export { receptionApi } from '@/features/reception'
export { corporateApi } from '@/features/corporate'
export { pharmacyApi } from '@/features/pharmacy'
export { indoorPharmacyApi } from '@/features/indoorpharmacy'
export { aestheticApi } from '@/features/aesthetic'
export { labApi } from '@/features/lab'
export { hospitalApi } from '@/features/hospital'
// Hospital sub-modules (direct access)
export { opdApi } from '@/features/hospital/opd'
export { ipdApi } from '@/features/hospital/ipd'
export { erApi } from '@/features/hospital/er'
export { storeApi } from '@/features/hospital/store'
export { ambulanceApi } from '@/features/hospital/ambulance'
export { equipmentApi } from '@/features/hospital/equipment'
export { sharedApi } from '@/features/hospital/shared'
export { financeApi } from '@/features/finance'
export { aestheticFinanceApi } from '@/features/aestheticFinance'
export { dialysisApi } from '@/features/dialysis'
