/**
 * Finance API Module
 * 
 * Handles finance operations:
 * - Doctor Earnings, Payouts, Balances
 * - Cash Sessions, Cash Counts, Cash Handovers
 * - Chart of Accounts
 * - Users, Sidebar Roles & Permissions
 * - Audit Logs
 */

import { api, withQuery } from '@/api'

export const financeApi = {
  // -------------------------------------------------------------------------
  // Doctor Earnings & Payouts
  // -------------------------------------------------------------------------
  manualDoctorEarning: (data: { doctorId: string; departmentId?: string; departmentName?: string; phone?: string; amount: number; revenueAccount?: 'OPD_REVENUE' | 'PROCEDURE_REVENUE' | 'IPD_REVENUE'; paidMethod?: 'Cash' | 'Bank' | 'AR'; memo?: string; sharePercent?: number; patientName?: string; mrn?: string; createdByUsername?: string }) =>
    api('/finance/manual-doctor-earning', { method: 'POST', body: JSON.stringify(data) }),
  doctorPayout: (data: { doctorId: string; amount: number; method?: 'Cash' | 'Bank'; memo?: string }) =>
    api('/finance/doctor-payout', { method: 'POST', body: JSON.stringify(data) }),
  listRecentDoctorPayouts: (params?: { page?: number; limit?: number }) =>
    api(withQuery('/finance/transactions', { ...params, type: 'Doctor Payout' })),
  doctorBalance: (doctorId: string) =>
    api(`/finance/doctor/${encodeURIComponent(doctorId)}/balance`),
  doctorPayouts: (doctorId: string, limit?: number) =>
    api(`/finance/doctor/${encodeURIComponent(doctorId)}/payouts${limit ? `?limit=${limit}` : ''}`),
  doctorAccruals: (doctorId: string, from: string, to: string) =>
    api(`/finance/doctor/${encodeURIComponent(doctorId)}/accruals?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  doctorEarnings: (params?: { doctorId?: string; from?: string; to?: string }) =>
    api(withQuery('/finance/earnings', params)),
  reverseJournal: (journalId: string, memo?: string) =>
    api(`/finance/journal/${encodeURIComponent(journalId)}/reverse`, { method: 'POST', body: JSON.stringify({ memo }) }),
  deleteManualEarning: (journalId: string) =>
    api(`/finance/manual-earning/${encodeURIComponent(journalId)}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Cash Sessions
  // -------------------------------------------------------------------------
  currentCashSession: () => api('/finance/cash-sessions/current'),
  openCashSession: (data: { openingFloat?: number; counterId?: string; shiftId?: string; shiftName?: string; note?: string }) =>
    api('/finance/cash-sessions/open', { method: 'POST', body: JSON.stringify(data) }),
  closeCashSession: (id: string, data: { countedCash: number; note?: string }) =>
    api(`/finance/cash-sessions/${encodeURIComponent(id)}/close`, { method: 'POST', body: JSON.stringify(data) }),
  listCashSessions: (params?: { from?: string; to?: string; userId?: string }) =>
    api(withQuery('/finance/cash-sessions', params)),

  // -------------------------------------------------------------------------
  // Cash Counts
  // -------------------------------------------------------------------------
  listCashCounts: (params?: { from?: string; to?: string; userId?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/finance/cash-counts', params)),
  createCashCount: (data: { date: string; amount: number; receiver?: string; handoverBy?: string; note?: string }) =>
    api('/finance/cash-counts', { method: 'POST', body: JSON.stringify(data) }),
  deleteCashCount: (id: string) => api(`/finance/cash-counts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  cashCountSummary: (params?: { from?: string; to?: string; search?: string }) =>
    api(withQuery('/finance/cash-counts/summary', params)),

  // -------------------------------------------------------------------------
  // Users & Auth
  // -------------------------------------------------------------------------
  listUsers: () => api('/finance/users'),
  createUser: (data: { username: string; role: string; password: string }) =>
    api('/finance/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: { username?: string; role?: string; password?: string }) =>
    api(`/finance/users/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => api(`/finance/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  login: (username: string, password: string) =>
    api('/finance/users/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => api('/finance/users/logout', { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Sidebar Roles & Permissions
  // -------------------------------------------------------------------------
  listSidebarRoles: () => api('/finance/sidebar-roles'),
  createSidebarRole: (role: string, permissions?: Array<{ path: string; label: string; visible?: boolean; order?: number }>) =>
    api('/finance/sidebar-roles', { method: 'POST', body: JSON.stringify({ role, permissions }) }),
  deleteSidebarRole: (role: string) => api(`/finance/sidebar-roles/${encodeURIComponent(role)}`, { method: 'DELETE' }),
  listSidebarPermissions: (role?: string) =>
    role ? api(`/finance/sidebar-permissions?role=${encodeURIComponent(role)}`) : api('/finance/sidebar-permissions'),
  updateSidebarPermissions: (role: string, data: { permissions: Array<{ path: string; label: string; visible: boolean; order: number }> }) =>
    api(`/finance/sidebar-permissions/${encodeURIComponent(role)}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetSidebarPermissions: (role: string) =>
    api(`/finance/sidebar-permissions/${encodeURIComponent(role)}/reset`, { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Audit Logs
  // -------------------------------------------------------------------------
  listAuditLogs: (params?: { search?: string; action?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/finance/audit-logs', params)),
  createAuditLog: (data: { actor?: string; action: string; label?: string; method?: string; path?: string; at: string; detail?: string }) =>
    api('/finance/audit-logs', { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Chart of Accounts
  // -------------------------------------------------------------------------
  listChartOfAccounts: (params?: { portal?: string; type?: string; active?: boolean }) =>
    api(withQuery('/finance/chart-of-accounts', params)),
  getChartOfAccount: (id: string) => api(`/finance/chart-of-accounts/${encodeURIComponent(id)}`),
  createChartOfAccount: (data: { code?: string; name: string; type: string; subType?: string; portal?: string }) =>
    api('/finance/chart-of-accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateChartOfAccount: (id: string, data: { code?: string; name?: string; type?: string; subType?: string; portal?: string; active?: boolean }) =>
    api(`/finance/chart-of-accounts/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChartOfAccount: (id: string) => api(`/finance/chart-of-accounts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getAccountBalance: (id: string) => api(`/finance/chart-of-accounts/${encodeURIComponent(id)}/balance`),
  getAccountLedger: (id: string, params?: { from?: string; to?: string }) =>
    api(withQuery(`/finance/chart-of-accounts/${encodeURIComponent(id)}/ledger`, params)),
  createUserAccount: (data: { portal: string; userId: string; username: string }) =>
    api('/finance/chart-of-accounts/create-user-account', { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Cash Handovers
  // -------------------------------------------------------------------------
  createCashHandover: (data: { fromAccountId: string; toAccountId: string; amount: number; shiftId?: string; shiftName?: string; notes?: string }) =>
    api('/finance/cash-handovers', { method: 'POST', body: JSON.stringify(data) }),
  listCashHandovers: (params?: { status?: string; from?: string; to?: string }) =>
    api(withQuery('/finance/cash-handovers', params)),
  getPendingHandovers: () => api('/finance/cash-handovers/pending'),
  approveCashHandover: (id: string) => api(`/finance/cash-handovers/${encodeURIComponent(id)}/approve`, { method: 'POST' }),
  rejectCashHandover: (id: string, reason?: string) =>
    api(`/finance/cash-handovers/${encodeURIComponent(id)}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
}

export default financeApi
