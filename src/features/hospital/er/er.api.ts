/**
 * ER (Emergency Room) API Module
 * 
 * Handles ER operations:
 * - Encounters, Charges, Billing
 * - Services, Vitals, Med Orders
 * - Clinical Notes, Referrals
 */

import { api, withQuery } from '@/api'

export const erApi = {
  // -------------------------------------------------------------------------
  // ER Encounters
  // -------------------------------------------------------------------------
  listEREncounters: (params?: { status?: 'admitted' | 'discharged'; doctorId?: string; departmentId?: string; patientId?: string; from?: string; to?: string; q?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/er/encounters', params)),
  dischargeER: (encounterId: string, data?: { endAt?: string; disposition?: 'discharged' | 'admitted' | 'transferred' | 'left-against-advice' | 'expired' }) =>
    api(`/hospital/er/encounters/${encounterId}/discharge`, { method: 'PATCH', body: JSON.stringify(data || {}) }),

  // -------------------------------------------------------------------------
  // ER Charges
  // -------------------------------------------------------------------------
  listErCharges: (encounterId: string, params?: { limit?: number }) =>
    api(withQuery(`/hospital/er/encounters/${encodeURIComponent(encounterId)}/charges`, params)),
  createErCharge: (encounterId: string, data: { type?: 'service' | 'procedure' | 'other'; description: string; qty?: number; unitPrice?: number; amount?: number; date?: string | Date; refId?: string; billedBy?: string }) =>
    api(`/hospital/er/encounters/${encodeURIComponent(encounterId)}/charges`, { method: 'POST', body: JSON.stringify(data) }),
  updateErCharge: (id: string, data: { type?: 'service' | 'procedure' | 'other'; description?: string; qty?: number; unitPrice?: number; amount?: number; date?: string | Date; refId?: string; billedBy?: string }) =>
    api(`/hospital/er/charges/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteErCharge: (id: string) => api(`/hospital/er/charges/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // ER Billing
  // -------------------------------------------------------------------------
  erListBillingItems: (encounterId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/er/encounters/${encodeURIComponent(encounterId)}/billing/charges`, params)),
  erBillingSummary: (encounterId: string) => api(`/hospital/er/encounters/${encodeURIComponent(encounterId)}/billing/summary`),
  erListPayments: (encounterId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/er/encounters/${encodeURIComponent(encounterId)}/billing/payments`, params)),
  erRecentPayments: (params?: { from?: string; to?: string }) =>
    api(withQuery('/hospital/er/billing/recent-payments', params)),
  erCreatePayment: (encounterId: string, data: { amount: number; method?: string; refNo?: string; receivedBy?: string; receivedAt?: string | Date; notes?: string; allocations?: Array<{ billingItemId: string; amount: number }>; type?: 'payment' | 'refund' | 'adjustment' }) =>
    api(`/hospital/er/encounters/${encodeURIComponent(encounterId)}/billing/payments`, { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // ER Services Catalog
  // -------------------------------------------------------------------------
  listErServices: (params?: { q?: string; category?: string; active?: boolean; page?: number; limit?: number }) =>
    api(withQuery('/hospital/er/services', params)),
  createErService: (data: { name: string; category?: string; price?: number; active?: boolean }) =>
    api('/hospital/er/services', { method: 'POST', body: JSON.stringify(data) }),
  updateErService: (id: string, data: { name?: string; category?: string; price?: number; active?: boolean }) =>
    api(`/hospital/er/services/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteErService: (id: string) => api(`/hospital/er/services/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // ER Records: Vitals, Med Orders, Clinical Notes
  // -------------------------------------------------------------------------
  listErVitals: (encounterId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/er/encounters/${encounterId}/vitals`, params)),
  createErVital: (encounterId: string, data: { recordedAt?: string; bp?: string; hr?: number; rr?: number; temp?: number; spo2?: number; height?: number; weight?: number; painScale?: number; recordedBy?: string; note?: string; shift?: 'morning' | 'evening' | 'night'; bsr?: number; intakeIV?: string; urine?: string; nurseSign?: string }) =>
    api(`/hospital/er/encounters/${encounterId}/vitals`, { method: 'POST', body: JSON.stringify(data) }),

  listErMedOrders: (encounterId: string, params?: { page?: number; limit?: number }) =>
    api(withQuery(`/hospital/er/encounters/${encounterId}/med-orders`, params)),
  createErMedOrder: (encounterId: string, data: { drugId?: string; drugName?: string; dose?: string; route?: string; frequency?: string; duration?: string; startAt?: string; endAt?: string; prn?: boolean; status?: 'active' | 'stopped'; prescribedBy?: string }) =>
    api(`/hospital/er/encounters/${encounterId}/med-orders`, { method: 'POST', body: JSON.stringify(data) }),

  listErClinicalNotes: (encounterId: string, params?: { type?: 'consultant' | 'nursing' | 'progress' | 'er-notes'; page?: number; limit?: number }) =>
    api(withQuery(`/hospital/er/encounters/${encounterId}/clinical-notes`, params)),
  createErClinicalNote: (encounterId: string, data: { type: 'consultant' | 'nursing' | 'progress' | 'er-notes'; recordedAt?: string; createdBy?: string; createdByRole?: string; doctorName?: string; sign?: string; data?: any }) =>
    api(`/hospital/er/encounters/${encounterId}/clinical-notes`, { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // ER Referrals
  // -------------------------------------------------------------------------
  listErReferrals: (params?: { status?: 'New' | 'Accepted' | 'Rejected' | 'In-Progress' | 'Completed'; priority?: 'Regular' | 'Urgent' | 'Critical'; q?: string; from?: string; to?: string; departmentId?: string; doctorId?: string; referredByDoctorId?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/er/referrals', params)),
  createErReferral: (data: { patientId: string; referralDate?: string; referralTime?: string; reasonOfReferral?: string; provisionalDiagnosis?: string; vitals?: { bp?: string; pulse?: number; temperature?: number; rr?: number }; referredTo?: { departmentId?: string; doctorId?: string }; condition?: { stability?: 'Stable' | 'Unstable'; consciousness?: 'Conscious' | 'Unconscious' }; remarks?: string; priority?: 'Regular' | 'Urgent' | 'Critical'; referredByDoctorId?: string }) =>
    api('/hospital/er/referrals', { method: 'POST', body: JSON.stringify(data) }),
  getErReferralById: (id: string) => api(`/hospital/er/referrals/${id}`),
  updateErReferral: (id: string, data: any) => api(`/hospital/er/referrals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateErReferralStatus: (id: string, action: 'accept' | 'reject' | 'reopen', note?: string) =>
    api(`/hospital/er/referrals/${id}/status`, { method: 'PATCH', body: JSON.stringify({ action, note }) }),
  startErVisitFromReferral: (id: string, data: { departmentId: string; doctorId?: string }) =>
    api(`/hospital/er/referrals/${id}/start-visit`, { method: 'POST', body: JSON.stringify(data) }),
  completeErVisitFromReferral: (id: string) =>
    api(`/hospital/er/referrals/${id}/complete`, { method: 'POST' }),
}

export default erApi
