/**
 * Corporate API Module
 * 
 * Handles corporate billing operations:
 * - Companies management
 * - Rate rules
 * - Transactions
 * - Claims
 * - Payments
 * - Reports
 */

import { api, withQuery, baseURL } from '../../api'

export const corporateApi = {
  // -------------------------------------------------------------------------
  // Companies
  // -------------------------------------------------------------------------
  listCompanies: (params?: { q?: string; page?: number; limit?: number }) =>
    api(withQuery('/corporate/companies', params)),

  createCompany: (data: { name: string; code?: string; contactName?: string; phone?: string; email?: string; address?: string; terms?: string; billingCycle?: string; active?: boolean }) =>
    api('/corporate/companies', { method: 'POST', body: JSON.stringify(data) }),

  updateCompany: (id: string, data: Partial<{ name: string; code?: string; contactName?: string; phone?: string; email?: string; address?: string; terms?: string; billingCycle?: string; active?: boolean }>) =>
    api(`/corporate/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteCompany: (id: string) =>
    api(`/corporate/companies/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Rate Rules
  // -------------------------------------------------------------------------
  listRateRules: (params?: { companyId?: string; scope?: 'OPD' | 'LAB' | 'DIAG' | 'IPD'; page?: number; limit?: number }) =>
    api(withQuery('/corporate/rate-rules', params)),

  createRateRule: (data: { companyId: string; scope: 'OPD' | 'LAB' | 'DIAG' | 'IPD'; ruleType: 'default' | 'department' | 'doctor' | 'test' | 'testGroup' | 'procedure' | 'service' | 'bedCategory'; refId?: string; visitType?: 'new' | 'followup' | 'any'; mode: 'fixedPrice' | 'percentDiscount' | 'fixedDiscount'; value: number; priority?: number; effectiveFrom?: string; effectiveTo?: string; active?: boolean }) =>
    api('/corporate/rate-rules', { method: 'POST', body: JSON.stringify(data) }),

  updateRateRule: (id: string, data: Partial<{ companyId: string; scope: 'OPD' | 'LAB' | 'DIAG' | 'IPD'; ruleType: 'default' | 'department' | 'doctor' | 'test' | 'testGroup' | 'procedure' | 'service' | 'bedCategory'; refId?: string; visitType?: 'new' | 'followup' | 'any'; mode: 'fixedPrice' | 'percentDiscount' | 'fixedDiscount'; value: number; priority?: number; effectiveFrom?: string; effectiveTo?: string; active?: boolean }>) =>
    api(`/corporate/rate-rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteRateRule: (id: string) =>
    api(`/corporate/rate-rules/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Reports
  // -------------------------------------------------------------------------
  reportsOutstanding: (params?: { companyId?: string; from?: string; to?: string }) =>
    api(withQuery('/corporate/reports/outstanding', params)),

  reportsAging: (params?: { companyId?: string; from?: string; to?: string }) =>
    api(withQuery('/corporate/reports/aging', params)),

  // -------------------------------------------------------------------------
  // Transactions
  // -------------------------------------------------------------------------
  listTransactions: (params?: { companyId?: string; serviceType?: 'OPD' | 'LAB' | 'DIAG' | 'IPD'; refType?: 'opd_token' | 'lab_order' | 'diag_order' | 'ipd_billing_item'; refId?: string; status?: 'accrued' | 'claimed' | 'paid' | 'reversed' | 'rejected'; patientMrn?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/corporate/transactions', params)),

  // -------------------------------------------------------------------------
  // Claims
  // -------------------------------------------------------------------------
  listClaims: (params?: { companyId?: string; status?: 'open' | 'locked' | 'exported' | 'partially-paid' | 'paid' | 'rejected'; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/corporate/claims', params)),

  getClaim: (id: string) =>
    api(`/corporate/claims/${id}`),

  generateClaim: (data: { companyId: string; fromDate?: string; toDate?: string; patientMrn?: string; departmentId?: string; serviceType?: 'OPD' | 'LAB' | 'DIAG' | 'IPD'; refType?: 'opd_token' | 'lab_order' | 'diag_order' | 'ipd_billing_item'; transactionIds?: string[] }) =>
    api('/corporate/claims/generate', { method: 'POST', body: JSON.stringify(data) }),

  updateClaim: (id: string, data: { status?: 'open' | 'locked' | 'exported' | 'partially-paid' | 'paid' | 'rejected'; notes?: string }) =>
    api(`/corporate/claims/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  lockClaim: (id: string) =>
    api(`/corporate/claims/${id}/lock`, { method: 'POST' }),

  unlockClaim: (id: string) =>
    api(`/corporate/claims/${id}/unlock`, { method: 'POST' }),

  deleteClaim: async (id: string) => {
    const attempts: Array<{ path: string; init?: RequestInit }> = [
      { path: `/corporate/claims/${id}`, init: { method: 'DELETE' } },
      { path: `/corporate/claims/${id}/delete`, init: { method: 'POST' } },
      { path: `/corporate/claims/delete`, init: { method: 'POST', body: JSON.stringify({ id }) } },
      { path: `/corporate/claim/${id}`, init: { method: 'DELETE' } },
      { path: `/corporate/claim/${id}/delete`, init: { method: 'POST' } },
      { path: `/corporate/claim/delete`, init: { method: 'POST', body: JSON.stringify({ id }) } },
      { path: `/corporate/claims/${id}`, init: { method: 'POST', headers: { 'X-HTTP-Method-Override': 'DELETE' } } },
      { path: `/corporate/claims/${id}/remove`, init: { method: 'POST' } },
      { path: `/corporate/claims/remove`, init: { method: 'POST', body: JSON.stringify({ id }) } },
    ]
    let lastErr: any
    for (const a of attempts) {
      try { return await api(a.path, a.init) } catch (e) { lastErr = e }
    }
    throw lastErr || new Error('Failed to delete claim')
  },

  exportClaimUrl: (id: string) => `${baseURL}/corporate/claims/${encodeURIComponent(id)}/export`,

  // -------------------------------------------------------------------------
  // Payments
  // -------------------------------------------------------------------------
  listPayments: (params?: { companyId?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/corporate/payments', params)),

  getPayment: (id: string) =>
    api(`/corporate/payments/${id}`),

  createPayment: (data: { companyId: string; dateIso: string; amount: number; refNo?: string; notes?: string; allocations?: Array<{ transactionId: string; amount: number }> }) =>
    api('/corporate/payments', { method: 'POST', body: JSON.stringify(data) }),

  createPaymentForClaim: (data: { companyId: string; claimId: string; dateIso: string; amount: number; discount?: number; refNo?: string; notes?: string }) =>
    api('/corporate/payments/claim', { method: 'POST', body: JSON.stringify(data) }),
}

export default corporateApi
