/**
 * Reception API Module
 * 
 * Handles reception portal operations:
 * - Authentication
 * - Shift management
 * - Reports
 * - Intake (lab/diagnostic orders)
 * - Users
 * - Sidebar roles & permissions
 */

import { api, withQuery } from '../../api'

export const receptionApi = {
  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------
  login: (username: string, password: string) =>
    api('/reception/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  logout: () =>
    api('/reception/logout', { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Shifts
  // -------------------------------------------------------------------------
  listShifts: () =>
    api('/reception/shifts'),

  createShift: (data: any) =>
    api('/reception/shifts', { method: 'POST', body: JSON.stringify(data) }),

  updateShift: (id: string, data: any) =>
    api(`/reception/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteShift: (id: string) =>
    api(`/reception/shifts/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Reports
  // -------------------------------------------------------------------------
  myActivityReport: (params?: { mode?: 'today' | 'shift' }) =>
    api(withQuery('/reception/reports/my-activity', params)),

  // -------------------------------------------------------------------------
  // Intake (create Lab/Diagnostic tokens from Reception portal)
  // -------------------------------------------------------------------------
  createLabOrder: (data: any) =>
    api('/reception/intake/lab/orders', { method: 'POST', body: JSON.stringify(data) }),

  createDiagnosticToken: (data: any) =>
    api('/reception/intake/diagnostic/tokens', { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------
  listUsers: () =>
    api('/reception/users'),

  createUser: (data: { username: string; role: string; password: string }) =>
    api('/reception/users', { method: 'POST', body: JSON.stringify(data) }),

  updateUser: (id: string, data: { username?: string; role?: string; password?: string }) =>
    api(`/reception/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteUser: (id: string) =>
    api(`/reception/users/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Sidebar Roles & Permissions
  // -------------------------------------------------------------------------
  listSidebarRoles: () =>
    api('/reception/sidebar-roles'),

  createSidebarRole: (role: string, permissions?: Array<{ path: string; label: string; visible?: boolean; order?: number }>) =>
    api('/reception/sidebar-roles', { method: 'POST', body: JSON.stringify({ role, permissions }) }),

  deleteSidebarRole: (role: string) =>
    api(`/reception/sidebar-roles/${encodeURIComponent(role)}`, { method: 'DELETE' }),

  listSidebarPermissions: (role?: string) =>
    role
      ? api(`/reception/sidebar-permissions?role=${encodeURIComponent(role)}`)
      : api('/reception/sidebar-permissions'),

  updateSidebarPermissions: (role: string, data: { permissions: Array<{ path: string; label: string; visible: boolean; order: number }> }) =>
    api(`/reception/sidebar-permissions/${encodeURIComponent(role)}`, { method: 'PUT', body: JSON.stringify(data) }),

  resetSidebarPermissions: (role: string) =>
    api(`/reception/sidebar-permissions/${encodeURIComponent(role)}/reset`, { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Cash Movements (Pay In/Out)
  // -------------------------------------------------------------------------
  listCashMovements: (params?: { from?: string; to?: string; type?: 'IN' | 'OUT'; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/reception/cash-movements', params)),

  createCashMovement: (data: { date: string; type: 'IN' | 'OUT'; category?: string; amount: number; receiver?: string; handoverBy?: string; note?: string }) =>
    api('/reception/cash-movements', { method: 'POST', body: JSON.stringify(data) }),

  deleteCashMovement: (id: string) =>
    api(`/reception/cash-movements/${id}`, { method: 'DELETE' }),

  cashMovementSummary: (params?: { from?: string; to?: string }) =>
    api(withQuery('/reception/cash-movements/summary', params)),
}

export default receptionApi
