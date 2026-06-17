/**
 * Hospital Indoor Pharmacy Integration API Module
 *
 * Handles:
 * - IPD/ER Pharmacy Integration (dispense + auto-billing)
 * - OT Pharmacy Requests
 * - Indoor Order Queue
 * - Medication Administration Log
 */

import { api, withQuery } from '../../../api'

export const indoorPharmacyIntegrationApi = {
  // -------------------------------------------------------------------------
  // IPD/ER Pharmacy Integration
  // -------------------------------------------------------------------------
  dispenseAndAddToBill: (data: {
    encounterId: string
    patientName?: string
    lines: Array<{ medicineId?: string; name: string; unitPrice: number; qty: number; discountRs?: number }>
    discountPct?: number
    payment?: string
    bedNumber?: string
    wardId?: string
    orderSource?: string
    linkedOrderId?: string
    prescribedBy?: string
    dispensedBy?: string
  }) => api('/hospital/pharmacy/integration/dispense', { method: 'POST', body: JSON.stringify(data) }),

  getPharmacyChargesByEncounter: (encounterId: string) =>
    api(`/hospital/pharmacy/integration/charges/${encodeURIComponent(encounterId)}`),

  voidPharmacyCharge: (id: string) =>
    api('/hospital/pharmacy/integration/void-charge', { method: 'POST', body: JSON.stringify({ id }) }),

  processMedicationReturn: (data: { dispenseId: string; encounterId?: string }) =>
    api('/hospital/pharmacy/integration/return', { method: 'POST', body: JSON.stringify(data) }),

  getMedicationAdministrationLog: (encounterId: string) =>
    api(`/hospital/pharmacy/integration/admin-log/${encodeURIComponent(encounterId)}`),

  logMedicationAdministration: (dispenseId: string, data: { administeredBy?: string; doseGiven?: string; notes?: string; patientResponse?: string }) =>
    api(`/hospital/pharmacy/integration/admin-log/${encodeURIComponent(dispenseId)}`, { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // OT Pharmacy Requests
  // -------------------------------------------------------------------------
  requestOTMedications: (data: {
    otScheduleId: string
    encounterId: string
    patientName?: string
    items: Array<{ medicineId?: string; name: string; qty: number; unit?: string; route?: string; purpose?: string; unitPrice?: number }>
    sourceType?: 'ot_stock' | 'indoor_pharmacy' | 'outdoor_pharmacy'
    billingMode?: 'surgery_package' | 'separate_charge' | 'patient_bill'
    requestedBy?: string
    anesthetistId?: string
    surgeonId?: string
    surgeryId?: string
    procedureId?: string
    notes?: string
  }) => api('/hospital/ot-pharmacy/requests', { method: 'POST', body: JSON.stringify(data) }),

  listOTPharmacyRequests: (params?: { status?: string; sourceType?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/ot-pharmacy/requests', params)),

  getOTPharmacyRequestsBySchedule: (scheduleId: string, params?: { status?: string; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/ot-pharmacy/requests/schedule/${encodeURIComponent(scheduleId)}`, params)),

  approveOTRequest: (id: string, data?: { approvedBy?: string }) =>
    api(`/hospital/ot-pharmacy/requests/${encodeURIComponent(id)}/approve`, { method: 'PATCH', body: JSON.stringify(data || {}) }),

  dispenseToOT: (id: string, data: { items: Array<{ itemId: string; dispensedQty: number }> }) =>
    api(`/hospital/ot-pharmacy/requests/${encodeURIComponent(id)}/dispense`, { method: 'PATCH', body: JSON.stringify(data) }),

  consumeOTMedication: (id: string, data: { items: Array<{ itemId: string; consumedQty: number }> }) =>
    api(`/hospital/ot-pharmacy/requests/${encodeURIComponent(id)}/consume`, { method: 'PATCH', body: JSON.stringify(data) }),

  returnOTMedications: (id: string, data: { items: Array<{ itemId: string; returnedQty: number }> }) =>
    api(`/hospital/ot-pharmacy/requests/${encodeURIComponent(id)}/return`, { method: 'PATCH', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Indoor Order Queue
  // -------------------------------------------------------------------------
  listPendingOrders: (params?: { status?: string; priority?: string; wardId?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/indoor-pharmacy/orders', params)),

  getOrdersByEncounter: (encounterId: string) =>
    api(`/hospital/indoor-pharmacy/orders/encounter/${encodeURIComponent(encounterId)}`),

  getOrdersByWard: (wardId: string, params?: { status?: string }) =>
    api(withQuery(`/hospital/indoor-pharmacy/orders/ward/${encodeURIComponent(wardId)}`, params)),

  getOrdersByBed: (bedNumber: string) =>
    api(`/hospital/indoor-pharmacy/orders/bed/${encodeURIComponent(bedNumber)}`),

  createOrderFromEPrescription: (data: {
    encounterId: string
    patientName?: string
    mrn?: string
    admissionNo?: string
    bedNumber?: string
    wardId?: string
    items: Array<{ medicineId?: string; medicineName?: string; qty?: number; dose?: string; frequency?: string; duration?: string; route?: string; instructions?: string }>
    priority?: 'normal' | 'urgent' | 'stat'
    sourceType?: 'ipd' | 'er' | 'ot' | 'opd'
    prescribedBy?: string
    ePrescriptionId?: string
  }) => api('/hospital/indoor-pharmacy/orders', { method: 'POST', body: JSON.stringify(data) }),

  updateOrderStatus: (id: string, data: { status: string; itemStatuses?: Array<{ itemId: string; status: string }> }) =>
    api(`/hospital/indoor-pharmacy/orders/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify(data) }),

  assignOrderToPharmacist: (id: string, data: { pharmacistId: string }) =>
    api(`/hospital/indoor-pharmacy/orders/${encodeURIComponent(id)}/assign`, { method: 'PATCH', body: JSON.stringify(data) }),

  markOrderDelivered: (id: string, data?: { deliveredBy?: string }) =>
    api(`/hospital/indoor-pharmacy/orders/${encodeURIComponent(id)}/deliver`, { method: 'PATCH', body: JSON.stringify(data || {}) }),

  getQueueStats: () => api('/hospital/indoor-pharmacy/queue-stats'),
}
