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

import { api, withQuery } from '../../api'

export const financeApi = {
  // -------------------------------------------------------------------------
  // Doctor Earnings & Payouts
  // -------------------------------------------------------------------------
  manualDoctorEarning: (data: { doctorId: string; departmentId?: string; departmentName?: string; phone?: string; amount: number; revenueAccount?: 'OPD_REVENUE' | 'PROCEDURE_REVENUE' | 'IPD_REVENUE'; paidMethod?: 'Cash' | 'Bank' | 'AR'; memo?: string; sharePercent?: number; patientName?: string; mrn?: string; createdByUsername?: string }) =>
    api('/finance/manual-doctor-earning', { method: 'POST', body: JSON.stringify(data) }),
  doctorPayout: (data: { doctorId: string; amount: number; method?: 'Cash' | 'Bank'; memo?: string; sourceAccount?: string; destinationAccount?: string }) =>
    api('/finance/doctor-payout', { method: 'POST', body: JSON.stringify(data) }),
  listRecentDoctorPayouts: (params?: { page?: number; limit?: number }) =>
    api(withQuery('/finance/transactions', { ...params, type: 'Doctor Payout' })),
  listTransactions: (params?: { from?: string; to?: string; type?: string; module?: string; method?: string; page?: number; limit?: number }) =>
    api(withQuery('/finance/transactions', params)),
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
  listChartOfAccounts: (params?: { portal?: string; type?: string; subType?: string; module?: string; active?: boolean; page?: number; limit?: number }) =>
    api(withQuery('/finance/chart-of-accounts', params)),
  getChartOfAccount: (id: string) => api(`/finance/chart-of-accounts/${encodeURIComponent(id)}`),
  createChartOfAccount: (data: { code?: string; name: string; type: string; subType?: string; module?: string; parentId?: string; isGroup?: boolean; portal?: string; currency?: string; tax?: number; systemNames?: string[] }) =>
    api('/finance/chart-of-accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateChartOfAccount: (id: string, data: { code?: string; name?: string; type?: string; subType?: string; module?: string; parentId?: string; isGroup?: boolean; portal?: string; active?: boolean; currency?: string; tax?: number; systemNames?: string[] }) =>
    api(`/finance/chart-of-accounts/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChartOfAccount: (id: string) => api(`/finance/chart-of-accounts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getAccountBalance: (id: string) => api(`/finance/chart-of-accounts/${encodeURIComponent(id)}/balance`),
  getAccountLedger: (id: string, params?: { from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery(`/finance/chart-of-accounts/${encodeURIComponent(id)}/ledger`, params)),
  createUserAccount: (data: { portal: string; userId: string; username: string }) =>
    api('/finance/chart-of-accounts/create-user-account', { method: 'POST', body: JSON.stringify(data) }),
  importChartOfAccounts: (accounts: Array<{ code?: string; name: string; type: string; subType?: string; module?: string; parentId?: string; isGroup?: boolean; currency?: string; active?: boolean; tax?: number }>) =>
    api('/finance/chart-of-accounts/import', { method: 'POST', body: JSON.stringify({ accounts }) }),

  // -------------------------------------------------------------------------
  // Accounts Ledger
  // -------------------------------------------------------------------------
  listAllAccountsLedger: (params?: { type?: string; subType?: string; search?: string; active?: boolean; page?: number; limit?: number }) =>
    api(withQuery('/finance/accounts-ledger', params)),

  // -------------------------------------------------------------------------
  // Vouchers
  // -------------------------------------------------------------------------
  nextVoucherNo: (type: string) =>
    api(withQuery('/finance/vouchers/next-no', { type })),
  listVouchers: (params?: { type?: string; status?: string; from?: string; to?: string; module?: string; isExpense?: boolean; q?: string; page?: number; limit?: number }) =>
    api(withQuery('/finance/vouchers', params)),
  getVoucher: (id: string) => api(`/finance/vouchers/${encodeURIComponent(id)}`),
  createVoucher: (data: { voucherType: 'BPV' | 'BRV' | 'CPV' | 'CRV' | 'JV' | 'CONTRA'; dateIso: string; payee?: string; chequeNo?: string; chequeDate?: string; narration?: string; module?: string; lines: Array<{ accountCode: string; accountName?: string; debit?: number; credit?: number }>; createdBy?: string }) =>
    api('/finance/vouchers', { method: 'POST', body: JSON.stringify(data) }),
  updateVoucher: (id: string, data: { dateIso?: string; payee?: string; chequeNo?: string; chequeDate?: string; narration?: string; module?: string; lines?: Array<{ accountCode: string; accountName?: string; debit?: number; credit?: number }> }) =>
    api(`/finance/vouchers/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVoucher: (id: string) => api(`/finance/vouchers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  postVoucher: (id: string) => api(`/finance/vouchers/${encodeURIComponent(id)}/post`, { method: 'POST' }),
  createExpenseVoucher: (data: { dateIso: string; expenseAccountCode?: string; costCenter?: string; amount: number; method: 'cash' | 'bank'; note?: string; payee?: string; module?: string; taxAmount?: number; taxType?: 'none' | 'sales_tax' | 'withholding' }) =>
    api('/finance/vouchers/expense', { method: 'POST', body: JSON.stringify(data) }),
  cancelVoucher: (id: string, memo?: string) =>
    api(`/finance/vouchers/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: JSON.stringify({ memo }) }),
  approveVoucher: (id: string) =>
    api(`/finance/vouchers/${encodeURIComponent(id)}/approve`, { method: 'POST' }),
  printVoucher: (id: string) => `/finance/vouchers/${encodeURIComponent(id)}/print`,


  // -------------------------------------------------------------------------
  // Fiscal Periods
  // -------------------------------------------------------------------------
  listFiscalPeriods: (params?: { type?: string; status?: string }) =>
    api(withQuery('/finance/fiscal-periods', params)),
  createFiscalPeriod: (data: { name: string; type: 'yearly' | 'quarterly' | 'monthly'; startDate: string; endDate: string }) =>
    api('/finance/fiscal-periods', { method: 'POST', body: JSON.stringify(data) }),
  closeFiscalPeriod: (id: string) =>
    api(`/finance/fiscal-periods/${encodeURIComponent(id)}/close`, { method: 'POST' }),
  yearEndCloseFiscalPeriod: (id: string) =>
    api(`/finance/fiscal-periods/${encodeURIComponent(id)}/year-end-close`, { method: 'POST' }),
  lockFiscalPeriod: (id: string) =>
    api(`/finance/fiscal-periods/${encodeURIComponent(id)}/lock`, { method: 'POST' }),
  reopenFiscalPeriod: (id: string) =>
    api(`/finance/fiscal-periods/${encodeURIComponent(id)}/reopen`, { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Recurring Vouchers
  // -------------------------------------------------------------------------
  listRecurringVouchers: (params?: { active?: string }) =>
    api(withQuery('/finance/recurring-vouchers', params)),
  createRecurringVoucher: (data: { name: string; voucherType: 'BPV' | 'BRV' | 'CPV' | 'CRV' | 'JV' | 'CONTRA'; frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'; dayOfMonth?: number; lines: Array<{ accountCode: string; accountName?: string; debit?: number; credit?: number }>; payee?: string; narration?: string; module?: string; expenseCategory?: string; expenseDepartment?: string; costCenter?: string }) =>
    api('/finance/recurring-vouchers', { method: 'POST', body: JSON.stringify(data) }),
  updateRecurringVoucher: (id: string, data: any) =>
    api(`/finance/recurring-vouchers/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRecurringVoucher: (id: string) =>
    api(`/finance/recurring-vouchers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  generateDueRecurringVouchers: () =>
    api('/finance/recurring-vouchers/generate-due', { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Budgets
  // -------------------------------------------------------------------------
  listBudgets: (params?: { year?: number; costCenter?: string; expenseCategory?: string }) =>
    api(withQuery('/finance/budgets', params)),
  createBudget: (data: { name: string; fiscalPeriodId?: string; costCenter?: string; expenseCategory?: string; budgetAmount: number; year: number; month?: number }) =>
    api('/finance/budgets', { method: 'POST', body: JSON.stringify(data) }),
  updateBudget: (id: string, data: any) =>
    api(`/finance/budgets/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  budgetVsActual: (params?: { year?: number; costCenter?: string }) =>
    api(withQuery('/finance/budgets/vs-actual', params)),
  costCenterPnL: (params?: { year?: number; from?: string; to?: string }) =>
    api(withQuery('/finance/budgets/cost-center-pnl', params)),

  // -------------------------------------------------------------------------
  // Bank Reconciliation
  // -------------------------------------------------------------------------
  listBankReconciliations: (params?: { bankAccountCode?: string; status?: string }) =>
    api(withQuery('/finance/bank-reconciliation', params)),
  createBankReconciliation: (data: { bankAccountCode: string; bankAccountName?: string; statementDate: string; statementBalance: number; items?: Array<{ date: string; description?: string; amount: number; type: 'deposit' | 'withdrawal' }> }) =>
    api('/finance/bank-reconciliation', { method: 'POST', body: JSON.stringify(data) }),
  updateBankReconciliation: (id: string, data: any) =>
    api(`/finance/bank-reconciliation/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  autoMatchBankReconciliation: (id: string) =>
    api(`/finance/bank-reconciliation/${encodeURIComponent(id)}/auto-match`, { method: 'POST' }),
  reconcileBankReconciliation: (id: string) =>
    api(`/finance/bank-reconciliation/${encodeURIComponent(id)}/reconcile`, { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Inter-module Settlements
  // -------------------------------------------------------------------------
  createSettlement: (data: { dateIso: string; fromCostCenter: string; toCostCenter: string; amount: number; description?: string; module?: string }) =>
    api('/finance/settlements', { method: 'POST', body: JSON.stringify(data) }),
  listSettlements: (params?: { from?: string; to?: string }) =>
    api(withQuery('/finance/settlements', params)),

  // -------------------------------------------------------------------------
  // Reports
  // -------------------------------------------------------------------------
  trialBalance: (params?: { from?: string; to?: string }) =>
    api(withQuery('/finance/reports/trial-balance', params)),
  profitLoss: (params?: { from?: string; to?: string }) =>
    api(withQuery('/finance/reports/profit-loss', params)),
  balanceSheet: (params?: { asOf?: string }) =>
    api(withQuery('/finance/reports/balance-sheet', params)),
  cashFlow: (params?: { from?: string; to?: string }) =>
    api(withQuery('/finance/reports/cash-flow', params)),

  // -------------------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------------------
  dashboardStats: (params?: { from?: string; to?: string }) =>
    api(withQuery('/finance/dashboard/stats', params)),

  // -------------------------------------------------------------------------
  // Shift Management
  // -------------------------------------------------------------------------
  listShifts: (params?: { counterId?: string; status?: string; from?: string; to?: string; shiftType?: string; page?: number; limit?: number }) =>
    api(withQuery('/finance/shifts', params)),
  getCurrentShift: (counterId: string) =>
    api(withQuery('/finance/shifts/current', { counterId })),
  getShiftSummary: (params?: { from?: string; to?: string; counterId?: string }) =>
    api(withQuery('/finance/shifts/summary', params)),
  getShift: (id: string) =>
    api(`/finance/shifts/${id}`),
  openShift: (data: { shiftType: 'morning' | 'evening' | 'night' | 'custom'; shiftName?: string; counterId: string; counterName: string; openingFloat?: number; notes?: string }) =>
    api('/finance/shifts', { method: 'POST', body: JSON.stringify(data) }),
  updateShiftCollections: (id: string, data: { module: 'opd' | 'lab' | 'pharmacy' | 'ipd' | 'er' | 'diagnostic' | 'dialysis' | 'aesthetic'; amount: number }) =>
    api(`/finance/shifts/${id}/collections`, { method: 'POST', body: JSON.stringify(data) }),
  updateShiftExpenses: (id: string, data: { type: 'doctorPayouts' | 'purchases' | 'pettyCash' | 'refunds'; amount: number }) =>
    api(`/finance/shifts/${id}/expenses`, { method: 'POST', body: JSON.stringify(data) }),
  closeShift: (id: string, data: { actualCash: number; notes?: string }) =>
    api(`/finance/shifts/${id}/close`, { method: 'POST', body: JSON.stringify(data) }),
  approveShiftClosure: (id: string, data?: { varianceReason?: string }) =>
    api(`/finance/shifts/${id}/approve`, { method: 'POST', body: JSON.stringify(data || {}) }),
  reconcileShift: (id: string) =>
    api(`/finance/shifts/${id}/reconcile`, { method: 'POST' }),
  compareShifts: (shiftIds: string[]) =>
    api('/finance/shifts/compare', { method: 'POST', body: JSON.stringify({ shiftIds }) }),

  // -------------------------------------------------------------------------
  // Shift Settings
  // -------------------------------------------------------------------------
  getShiftSettings: () =>
    api('/finance/shift-settings'),
  updateShiftSettings: (data: {
    mode?: 'auto' | 'manual'
    timeSlots?: Array<{
      shiftType: 'morning' | 'evening' | 'night' | 'custom'
      shiftName: string
      startTime: string
      endTime: string
      active: boolean
    }>
    allowMultipleShiftsPerDay?: boolean
    autoCloseReminder?: boolean
    reminderMinutes?: number
    gracePeriodMinutes?: number
  }) =>
    api('/finance/shift-settings', { method: 'PUT', body: JSON.stringify(data) }),
  getCurrentShiftTimeSlot: () =>
    api('/finance/shift-settings/current-slot'),

  // -------------------------------------------------------------------------
  // Reception Expense Approvals
  // -------------------------------------------------------------------------
  listReceptionExpenses: (params?: { status?: 'pending' | 'approved' | 'rejected'; from?: string; to?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/reception/expenses/all', params)),
  approveReceptionExpense: (id: string) =>
    api(`/reception/expenses/${id}/approve`, { method: 'POST' }),
  rejectReceptionExpense: (id: string, reason?: string) =>
    api(`/reception/expenses/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // -------------------------------------------------------------------------
  // Activity Log
  // -------------------------------------------------------------------------
  listActivityLogs: (params?: { userId?: string; userName?: string; portal?: string; action?: string; module?: string; from?: string; to?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/finance/activity-log', params)),
  getActivitySummary: (params?: { userId?: string; from?: string; to?: string }) =>
    api(withQuery('/finance/activity-log/summary', params)),
  listActivityUsers: () => api('/finance/activity-log/users'),
  listActivityActions: () => api('/finance/activity-log/actions'),
  exportActivityLogs: (params?: { userId?: string; userName?: string; portal?: string; action?: string; module?: string; from?: string; to?: string; search?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return `/finance/activity-log/export${qs ? `?${qs}` : ''}`
  },
}

export default financeApi
