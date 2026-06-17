/**
 * Aesthetic Finance API Module
 * 
 * Handles aesthetic center finance operations:
 * - Doctor Earnings, Payouts, Balances
 * - Payables Summary
 * - Journal Reversals
 */

import { api, withQuery } from '../../api'

export const aestheticFinanceApi = {
  // -------------------------------------------------------------------------
  // Doctor Earnings & Payouts
  // -------------------------------------------------------------------------
  manualDoctorEarning: (data: { doctorId: string; amount: number; revenueAccount?: 'OPD_REVENUE' | 'PROCEDURE_REVENUE' | 'IPD_REVENUE'; paidMethod?: 'Cash' | 'Bank' | 'AR'; memo?: string; patientName?: string; mrn?: string }) =>
    api('/aesthetic/finance/manual-doctor-earning', { method: 'POST', body: JSON.stringify(data) }),
  doctorPayout: (data: { doctorId: string; amount: number; method?: 'Cash' | 'Bank'; memo?: string; sourceAccount?: string; destinationAccount?: string }) =>
    api('/aesthetic/finance/doctor-payout', { method: 'POST', body: JSON.stringify(data) }),
  doctorBalance: (doctorId: string) =>
    api(`/aesthetic/finance/doctor/${encodeURIComponent(doctorId)}/balance`),
  doctorPayouts: (doctorId: string, limit?: number) =>
    api(`/aesthetic/finance/doctor/${encodeURIComponent(doctorId)}/payouts${limit ? `?limit=${limit}` : ''}`),
  doctorEarnings: (params?: { doctorId?: string; from?: string; to?: string }) =>
    api(withQuery('/aesthetic/finance/earnings', params)),

  // -------------------------------------------------------------------------
  // Journal & Payables
  // -------------------------------------------------------------------------
  reverseJournal: (journalId: string, memo?: string) =>
    api(`/aesthetic/finance/journal/${encodeURIComponent(journalId)}/reverse`, { method: 'POST', body: JSON.stringify({ memo }) }),
  payablesSummary: () => api('/aesthetic/finance/payables-summary'),
  listRecentPayouts: (limit?: number) => api(`/aesthetic/finance/payouts${limit ? `?limit=${limit}` : ''}`),
}

export default aestheticFinanceApi
