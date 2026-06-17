/**
 * Diagnostic API Module
 * 
 * Handles diagnostic center operations:
 * - Test catalog management
 * - Orders and samples
 * - Results and reporting
 * - Settings and users
 * - Cash movements and counts
 * - Income ledger
 * - Audit logs
 * - Sidebar roles & permissions
 */

import { api, withQuery } from '../../api'

// ============================================================================
// TYPES
// ============================================================================

export interface DiagnosticTest {
  id?: string
  name: string
  price?: number
  type?: 'test' | 'procedure'
  status?: 'active' | 'inactive'
}

export interface DiagnosticOrder {
  id?: string
  patientId: string
  patient: {
    mrn?: string
    fullName: string
    phone?: string
    age?: string
    gender?: string
    address?: string
    guardianRelation?: string
    guardianName?: string
    cnic?: string
  }
  tests: string[]
  subtotal?: number
  discount?: number
  net?: number
  receivedAmount?: number
  paymentMethod?: string
  referringConsultant?: string
  tokenNo?: string
  corporateId?: string
  corporatePreAuthNo?: string
  corporateCoPayPercent?: number
  corporateCoverageCap?: number
}

export interface DiagnosticResult {
  id?: string
  orderId: string
  testId: string
  testName: string
  tokenNo?: string
  patient?: any
  formData?: any
  images?: string[]
  status?: 'draft' | 'final'
  reportedBy?: string
  reportedAt?: string
  templateVersion?: string
  notes?: string
}

// ============================================================================
// API
// ============================================================================

export const diagnosticApi = {
  // -------------------------------------------------------------------------
  // Tests (Catalog)
  // -------------------------------------------------------------------------
  listTests: (params?: { q?: string; type?: 'test' | 'procedure'; status?: 'active' | 'inactive'; lite?: boolean; page?: number; limit?: number }) =>
    api(withQuery('/diagnostic/tests', params)),

  createTest: (data: DiagnosticTest) =>
    api('/diagnostic/tests', { method: 'POST', body: JSON.stringify(data) }),

  updateTest: (id: string, data: Partial<DiagnosticTest>) =>
    api(`/diagnostic/tests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteTest: (id: string) =>
    api(`/diagnostic/tests/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------
  login: async (username: string, password: string) => {
    const r: any = await api('/diagnostic/login', { method: 'POST', body: JSON.stringify({ username, password }) })
    try {
      const tok = String(r?.token || '')
      if (tok) {
        localStorage.setItem('diagnostic.token', tok)
        localStorage.setItem('token', tok)
      }
      if (r?.user) localStorage.setItem('diagnostic.user', JSON.stringify(r.user))
    } catch { }
    return r
  },

  logout: async () => {
    try { await api('/diagnostic/logout', { method: 'POST' }) } catch { }
    try {
      localStorage.removeItem('diagnostic.token')
      localStorage.removeItem('diagnostic.user')
    } catch { }
    return { success: true }
  },

  // -------------------------------------------------------------------------
  // Tokens
  // -------------------------------------------------------------------------
  listTokens: (params?: { q?: string; status?: 'token_generated' | 'converted_to_sample' | 'cancelled'; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/diagnostic/tokens', params)),

  createToken: (data: DiagnosticOrder) =>
    api('/diagnostic/tokens', { method: 'POST', body: JSON.stringify(data) }),

  convertToken: (id: string) =>
    api(`/diagnostic/tokens/${id}/convert`, { method: 'POST' }),

  updateTokenStatus: (id: string, data: { status: string }) =>
    api(`/diagnostic/tokens/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteToken: (id: string) =>
    api(`/diagnostic/tokens/${id}`, { method: 'DELETE' }),

  updateToken: (id: string, data: any) =>
    api(`/diagnostic/tokens/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Orders (Samples)
  // -------------------------------------------------------------------------
  listOrders: (params?: { q?: string; status?: 'received' | 'completed' | 'returned'; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/diagnostic/orders', params)),

  getOrder: (id: string) =>
    api(`/diagnostic/orders/${id}`),

  createOrder: (data: DiagnosticOrder) =>
    api('/diagnostic/orders', { method: 'POST', body: JSON.stringify(data) }),

  updateOrder: (id: string, data: Partial<DiagnosticOrder>) =>
    api(`/diagnostic/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  updateOrderTrack: (id: string, data: { sampleTime?: string; reportingTime?: string; status?: 'received' | 'completed' | 'returned'; referringConsultant?: string }) =>
    api(`/diagnostic/orders/${id}/track`, { method: 'PUT', body: JSON.stringify(data) }),

  updateOrderItemTrack: (id: string, testId: string, data: { sampleTime?: string; reportingTime?: string; status?: 'received' | 'completed' | 'returned'; referringConsultant?: string }) =>
    api(`/diagnostic/orders/${id}/items/${encodeURIComponent(testId)}/track`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteOrderItem: (id: string, testId: string) =>
    api(`/diagnostic/orders/${id}/items/${encodeURIComponent(testId)}`, { method: 'DELETE' }),

  deleteOrder: (id: string) =>
    api(`/diagnostic/orders/${id}`, { method: 'DELETE' }),

  returnOrder: (id: string, data: { reason?: string; amount?: number }) =>
    api(`/diagnostic/orders/${id}/return`, { method: 'POST', body: JSON.stringify(data) }),

  undoReturn: (id: string) =>
    api(`/diagnostic/orders/${id}/undo-return`, { method: 'POST' }),

  receivePayment: (tokenNo: string, data: { amount: number; method?: string; note?: string }) =>
    api(`/diagnostic/orders/${encodeURIComponent(tokenNo)}/receive-payment`, { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Income Ledger
  // -------------------------------------------------------------------------
  incomeLedger: (params?: { from?: string; to?: string; tokenNo?: string; patientName?: string; page?: number; limit?: number }) =>
    api(withQuery('/diagnostic/income-ledger', params)),

  incomeLedgerSummary: (params?: { from?: string; to?: string }) =>
    api(withQuery('/diagnostic/income-ledger/summary', params)),

  // -------------------------------------------------------------------------
  // Results
  // -------------------------------------------------------------------------
  listResults: (params?: { orderId?: string; testId?: string; status?: 'draft' | 'final'; q?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/diagnostic/results', params)),

  getResult: (id: string) =>
    api(`/diagnostic/results/${id}`),

  createResult: (data: DiagnosticResult) =>
    api('/diagnostic/results', { method: 'POST', body: JSON.stringify(data) }),

  updateResult: (id: string, data: Partial<DiagnosticResult>) =>
    api(`/diagnostic/results/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteResult: (id: string) =>
    api(`/diagnostic/results/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Cash Movements (Pay In/Out)
  // -------------------------------------------------------------------------
  listCashMovements: (params?: { from?: string; to?: string; type?: 'IN' | 'OUT'; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/lab/cash-movements', params)),

  createCashMovement: (data: { date: string; type: 'IN' | 'OUT'; category?: string; amount: number; receiver?: string; handoverBy?: string; note?: string }) =>
    api('/lab/cash-movements', { method: 'POST', body: JSON.stringify(data) }),

  deleteCashMovement: (id: string) =>
    api(`/lab/cash-movements/${id}`, { method: 'DELETE' }),

  cashMovementSummary: (params?: { from?: string; to?: string; type?: 'IN' | 'OUT' }) =>
    api(withQuery('/lab/cash-movements/summary', params)),

  // -------------------------------------------------------------------------
  // Manager Cash Count
  // -------------------------------------------------------------------------
  listCashCounts: (params?: { from?: string; to?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/lab/cash-counts', params)),

  createCashCount: (data: { date: string; amount: number; receiver?: string; handoverBy?: string; note?: string }) =>
    api('/lab/cash-counts', { method: 'POST', body: JSON.stringify(data) }),

  deleteCashCount: (id: string) =>
    api(`/lab/cash-counts/${id}`, { method: 'DELETE' }),

  cashCountSummary: (params?: { from?: string; to?: string; search?: string }) =>
    api(withQuery('/lab/cash-counts/summary', params)),

  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------
  getSettings: () =>
    api('/diagnostic/settings'),

  updateSettings: (data: { diagnosticName?: string; phone?: string; address?: string; email?: string; reportFooter?: string; logoDataUrl?: string; department?: string; consultantName?: string; consultantDegrees?: string; consultantTitle?: string; consultants?: Array<{ name?: string; degrees?: string; title?: string }>; templateMappings?: Array<{ testId: string; testName?: string; templateKey: string }> }) =>
    api('/diagnostic/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------
  listUsers: () =>
    api('/diagnostic/users'),

  createUser: (data: any) =>
    api('/diagnostic/users', { method: 'POST', body: JSON.stringify(data) }),

  updateUser: (id: string, data: any) =>
    api(`/diagnostic/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteUser: (id: string) =>
    api(`/diagnostic/users/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Sidebar Roles & Permissions
  // -------------------------------------------------------------------------
  listSidebarRoles: () =>
    api('/diagnostic/sidebar-roles'),

  createSidebarRole: (role: string, permissions?: Array<{ path: string; label: string; visible?: boolean; order?: number }>) =>
    api('/diagnostic/sidebar-roles', { method: 'POST', body: JSON.stringify({ role, permissions }) }),

  deleteSidebarRole: (role: string) =>
    api(`/diagnostic/sidebar-roles/${encodeURIComponent(role)}`, { method: 'DELETE' }),

  listSidebarPermissions: (role?: string) =>
    role
      ? api(`/diagnostic/sidebar-permissions?role=${encodeURIComponent(role)}`)
      : api('/diagnostic/sidebar-permissions'),

  updateSidebarPermissions: (role: string, data: { permissions: Array<{ path: string; label: string; visible: boolean; order: number }> }) =>
    api(`/diagnostic/sidebar-permissions/${encodeURIComponent(role)}`, { method: 'PUT', body: JSON.stringify(data) }),

  resetSidebarPermissions: (role: string) =>
    api(`/diagnostic/sidebar-permissions/${encodeURIComponent(role)}/reset`, { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Audit Logs
  // -------------------------------------------------------------------------
  listAuditLogs: (params?: { search?: string; action?: string; subjectType?: string; subjectId?: string; actorUsername?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/diagnostic/audit-logs', params)),

  createAuditLog: (data: { action: string; subjectType?: string; subjectId?: string; message?: string; data?: any }) =>
    api('/diagnostic/audit-logs', { method: 'POST', body: JSON.stringify(data) }),
}

export default diagnosticApi
