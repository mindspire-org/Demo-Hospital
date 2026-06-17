/**
 * Aesthetic API Module
 * 
 * Handles aesthetic clinic operations:
 * - Settings, Auth, Staff, Shifts, Attendance, Earnings
 * - Suppliers, Expenses, Purchases, Returns
 * - Inventory, Notifications, Users, Audit Logs
 * - Doctors, Doctor Schedules, Appointments
 * - Tokens (OPD), Consent Templates, Consents
 * - Procedure Catalog, Procedure Sessions
 * - Sidebar Roles & Permissions
 */

import { api, withQuery } from '../../api'

export const aestheticApi = {
  // -------------------------------------------------------------------------
  // Settings & Auth
  // -------------------------------------------------------------------------
  getSettings: () => api('/aesthetic/settings'),
  updateSettings: (data: any) => api('/aesthetic/settings', { method: 'PUT', body: JSON.stringify(data) }),
  login: (username: string, password: string) => api('/aesthetic/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => api('/aesthetic/logout', { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Staff
  // -------------------------------------------------------------------------
  listStaff: (params?: { shiftId?: string; page?: number; limit?: number }) =>
    api(withQuery('/aesthetic/staff', params)),
  createStaff: (data: any) => api('/aesthetic/staff', { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: (id: string, data: any) => api(`/aesthetic/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaff: (id: string) => api(`/aesthetic/staff/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Shifts
  // -------------------------------------------------------------------------
  listShifts: () => api('/aesthetic/shifts'),
  createShift: (data: any) => api('/aesthetic/shifts', { method: 'POST', body: JSON.stringify(data) }),
  updateShift: (id: string, data: any) => api(`/aesthetic/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShift: (id: string) => api(`/aesthetic/shifts/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Attendance
  // -------------------------------------------------------------------------
  listAttendance: (params?: { date?: string; from?: string; to?: string; shiftId?: string; staffId?: string; page?: number; limit?: number }) =>
    api(withQuery('/aesthetic/attendance', params)),
  upsertAttendance: (data: any) => api('/aesthetic/attendance', { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Staff Earnings
  // -------------------------------------------------------------------------
  listStaffEarnings: (params?: { staffId?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/aesthetic/staff-earnings', params)),
  createStaffEarning: (data: { staffId: string; date: string; category: 'Bonus' | 'Award' | 'LumpSum' | 'RevenueShare'; amount?: number; rate?: number; base?: number; notes?: string }) =>
    api('/aesthetic/staff-earnings', { method: 'POST', body: JSON.stringify(data) }),
  updateStaffEarning: (id: string, data: Partial<{ staffId: string; date: string; category: 'Bonus' | 'Award' | 'LumpSum' | 'RevenueShare'; amount?: number; rate?: number; base?: number; notes?: string }>) =>
    api(`/aesthetic/staff-earnings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaffEarning: (id: string) => api(`/aesthetic/staff-earnings/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Suppliers
  // -------------------------------------------------------------------------
  listSuppliers: (params?: string | { q?: string; page?: number; limit?: number }) => {
    if (typeof params === 'string') return api(`/aesthetic/suppliers?q=${encodeURIComponent(params)}`)
    return api(withQuery('/aesthetic/suppliers', params))
  },
  createSupplier: (data: any) => api('/aesthetic/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: any) => api(`/aesthetic/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id: string) => api(`/aesthetic/suppliers/${id}`, { method: 'DELETE' }),
  recordSupplierPayment: (id: string, data: { amount: number; purchaseId?: string; method?: string; note?: string; date?: string }) =>
    api(`/aesthetic/suppliers/${id}/payment`, { method: 'POST', body: JSON.stringify(data) }),
  listSupplierPurchases: (id: string) => api(`/aesthetic/suppliers/${id}/purchases`),

  // -------------------------------------------------------------------------
  // Expenses
  // -------------------------------------------------------------------------
  listExpenses: (params?: { from?: string; to?: string; minAmount?: number; search?: string; type?: string; page?: number; limit?: number }) =>
    api(withQuery('/aesthetic/expenses', params)),
  createExpense: (data: any) => api('/aesthetic/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id: string) => api(`/aesthetic/expenses/${id}`, { method: 'DELETE' }),
  expensesSummary: (params?: { from?: string; to?: string }) =>
    api(withQuery('/aesthetic/expenses/summary', params)),

  // -------------------------------------------------------------------------
  // Purchases
  // -------------------------------------------------------------------------
  listPurchases: (params?: { from?: string; to?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/aesthetic/purchases', params)),
  createPurchase: (data: any) => api('/aesthetic/purchases', { method: 'POST', body: JSON.stringify(data) }),
  deletePurchase: (id: string) => api(`/aesthetic/purchases/${id}`, { method: 'DELETE' }),
  purchasesSummary: (params?: { from?: string; to?: string }) =>
    api(withQuery('/aesthetic/purchases/summary', params)),

  // -------------------------------------------------------------------------
  // Returns
  // -------------------------------------------------------------------------
  listReturns: (params?: { type?: 'Customer' | 'Supplier'; from?: string; to?: string; search?: string; party?: string; reference?: string; page?: number; limit?: number }) =>
    api(withQuery('/aesthetic/returns', params)),
  createReturn: (data: any) => api('/aesthetic/returns', { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Inventory
  // -------------------------------------------------------------------------
  listInventory: (params?: { search?: string; page?: number; limit?: number }) =>
    api(withQuery('/aesthetic/inventory', params)),
  inventorySummary: (params?: { search?: string; limit?: number }) =>
    api(withQuery('/aesthetic/inventory/summary', params)),
  deleteInventoryItem: (key: string) => api(`/aesthetic/inventory/${encodeURIComponent(key)}`, { method: 'DELETE' }),
  updateInventoryItem: (key: string, data: any) => api(`/aesthetic/inventory/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify(data) }),
  searchMedicines: async (q?: string, limit?: number) => {
    const res: any = await api(withQuery('/aesthetic/inventory', { search: q, limit: limit || 20 }))
    const items: any[] = res?.items ?? res ?? []
    return { suggestions: items.map((it: any) => ({ id: String(it._id || it.key || it.name || ''), name: String(it.name || '') })) }
  },
  getAllMedicines: async () => {
    const res: any = await api(withQuery('/aesthetic/inventory', { limit: 2000 }))
    const items: any[] = res?.items ?? res ?? []
    return { medicines: items.map((it: any) => ({ id: String(it._id || it.key || it.name || ''), name: String(it.name || '') })) }
  },

  // -------------------------------------------------------------------------
  // Purchase Drafts
  // -------------------------------------------------------------------------
  listPurchaseDrafts: (params?: { from?: string; to?: string; search?: string; limit?: number }) =>
    api(withQuery('/aesthetic/purchase-drafts', params)),
  createPurchaseDraft: (data: any) => api('/aesthetic/purchase-drafts', { method: 'POST', body: JSON.stringify(data) }),
  approvePurchaseDraft: (id: string) => api(`/aesthetic/purchase-drafts/${id}/approve`, { method: 'POST' }),
  deletePurchaseDraft: (id: string) => api(`/aesthetic/purchase-drafts/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------------------
  getNotifications: (params?: { page?: number; limit?: number; severity?: 'info' | 'warning' | 'critical' | 'success'; read?: boolean }) =>
    api(withQuery('/aesthetic/notifications', params)),
  markNotificationRead: (id: string) => api(`/aesthetic/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => api('/aesthetic/notifications/read-all', { method: 'POST' }),
  deleteNotification: (id: string) => api(`/aesthetic/notifications/${id}`, { method: 'DELETE' }),
  generateNotifications: () => api('/aesthetic/notifications/generate', { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Sales
  // -------------------------------------------------------------------------
  listSales: (params?: { from?: string; to?: string; limit?: number }) =>
    api(withQuery('/aesthetic/sales', params)),
  salesSummary: (params?: { payment?: 'Any' | 'Cash' | 'Card' | 'Credit'; from?: string; to?: string }) =>
    api(withQuery('/aesthetic/sales/summary', params)),

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------
  listUsers: () => api('/aesthetic/users'),
  createUser: (data: any) => api('/aesthetic/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => api(`/aesthetic/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => api(`/aesthetic/users/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Audit Logs
  // -------------------------------------------------------------------------
  listAuditLogs: (params?: { search?: string; action?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/aesthetic/audit-logs', params)),
  createAuditLog: (data: any) => api('/aesthetic/audit-logs', { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Doctors
  // -------------------------------------------------------------------------
  listDoctors: (params?: { search?: string; page?: number; limit?: number }) =>
    api(withQuery('/aesthetic/doctors', params)),
  createDoctor: (data: { name: string; specialty?: string; qualification?: string; phone?: string; fee?: number; shares?: number; active?: boolean }) =>
    api('/aesthetic/doctors', { method: 'POST', body: JSON.stringify(data) }),
  updateDoctor: (id: string, patch: Partial<{ name: string; specialty: string; qualification: string; phone: string; fee: number; shares: number; active: boolean }>) =>
    api(`/aesthetic/doctors/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteDoctor: (id: string) => api(`/aesthetic/doctors/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Doctor Schedules
  // -------------------------------------------------------------------------
  listDoctorSchedules: (params?: { doctorId?: string; date?: string }) =>
    api(withQuery('/aesthetic/doctor-schedules', params)),
  applyDoctorWeeklyPattern: (data: { doctorId: string; anchorDate?: string; weeks?: number; days: Array<{ day: number; enabled: boolean; startTime?: string; endTime?: string; slotMinutes?: number; fee?: number; followupFee?: number; notes?: string }> }) =>
    api('/aesthetic/doctor-schedules/weekly-pattern', { method: 'POST', body: JSON.stringify(data) }),
  createDoctorSchedule: (data: { doctorId: string; dateIso: string; startTime: string; endTime: string; slotMinutes?: number; fee?: number; followupFee?: number; notes?: string }) =>
    api('/aesthetic/doctor-schedules', { method: 'POST', body: JSON.stringify(data) }),
  updateDoctorSchedule: (id: string, data: { dateIso?: string; startTime?: string; endTime?: string; slotMinutes?: number; fee?: number; followupFee?: number; notes?: string }) =>
    api(`/aesthetic/doctor-schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDoctorSchedule: (id: string) => api(`/aesthetic/doctor-schedules/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Appointments
  // -------------------------------------------------------------------------
  listAppointments: (params?: { date?: string; doctorId?: string; scheduleId?: string; status?: 'booked' | 'confirmed' | 'checked-in' | 'cancelled' | 'no-show' }) =>
    api(withQuery('/aesthetic/appointments', params)),
  createAppointment: (data: { doctorId: string; scheduleId: string; apptStart?: string; slotNo?: number; patientId?: string; mrn?: string; patientName?: string; phone?: string; gender?: string; age?: string; notes?: string }) =>
    api('/aesthetic/appointments', { method: 'POST', body: JSON.stringify(data) }),
  updateAppointment: (id: string, data: { doctorId?: string; scheduleId?: string; apptStart?: string; slotNo?: number; patientName?: string; phone?: string; gender?: string; age?: string; notes?: string }) =>
    api(`/aesthetic/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateAppointmentStatus: (id: string, status: 'booked' | 'confirmed' | 'checked-in' | 'cancelled' | 'no-show') =>
    api(`/aesthetic/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteAppointment: (id: string) => api(`/aesthetic/appointments/${id}`, { method: 'DELETE' }),
  convertAppointmentToToken: (id: string) => api(`/aesthetic/appointments/${id}/convert-to-token`, { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Tokens (OPD)
  // -------------------------------------------------------------------------
  listTokens: (params?: { from?: string; to?: string; doctorId?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/aesthetic/tokens', params)),
  createToken: (data: { date?: string; patientName?: string; phone?: string; mrNumber?: string; age?: string; gender?: string; address?: string; guardianRelation?: string; guardianName?: string; cnic?: string; doctorId?: string; apptDate?: string; scheduleId?: string; apptStart?: string; fee?: number; discount?: number; payable?: number; status?: 'queued' | 'in-progress' | 'completed' | 'returned' | 'cancelled'; procedureSessionId?: string; depositToday?: number; method?: string; note?: string }) =>
    api('/aesthetic/tokens', { method: 'POST', body: JSON.stringify(data) }),
  updateToken: (id: string, patch: any) => api(`/aesthetic/tokens/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  updateTokenStatus: (id: string, status: 'queued' | 'in-progress' | 'completed' | 'returned' | 'cancelled') =>
    api(`/aesthetic/tokens/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  deleteToken: (id: string) => api(`/aesthetic/tokens/${id}`, { method: 'DELETE' }),
  nextTokenNumber: (date?: string) => api(withQuery('/aesthetic/tokens/next-number', { date })),

  // -------------------------------------------------------------------------
  // Consent Templates
  // -------------------------------------------------------------------------
  listConsentTemplates: (params?: { search?: string; page?: number; limit?: number }) =>
    api(withQuery('/aesthetic/consent-templates', params)),
  createConsentTemplate: (data: { name: string; body: string; version?: number; active?: boolean; fields?: any[] }) =>
    api('/aesthetic/consent-templates', { method: 'POST', body: JSON.stringify(data) }),
  updateConsentTemplate: (id: string, patch: Partial<{ name: string; body: string; version: number; active: boolean; fields: any[] }>) =>
    api(`/aesthetic/consent-templates/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteConsentTemplate: (id: string) => api(`/aesthetic/consent-templates/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Consents
  // -------------------------------------------------------------------------
  listConsents: (params?: { templateId?: string; patientMrn?: string; labPatientId?: string; search?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/aesthetic/consents', params)),
  createConsent: (data: { templateId: string; templateName?: string; templateVersion?: number; patientMrn?: string; labPatientId?: string; patientName?: string; answers?: any; signatureDataUrl?: string; attachments?: string[]; signedAt: string; actor?: string }) =>
    api('/aesthetic/consents', { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Procedure Catalog
  // -------------------------------------------------------------------------
  listProcedureCatalog: (params?: { search?: string; page?: number; limit?: number }) =>
    api(withQuery('/aesthetic/procedure-catalog', params)),
  createProcedureCatalog: (data: { name: string; basePrice?: number; defaultDoctorId?: string; defaultConsentTemplateId?: string; package?: { sessionsCount?: number; intervalDays?: number }; active?: boolean }) =>
    api('/aesthetic/procedure-catalog', { method: 'POST', body: JSON.stringify(data) }),
  updateProcedureCatalog: (id: string, patch: Partial<{ name: string; basePrice: number; defaultDoctorId: string; defaultConsentTemplateId: string; package: { sessionsCount?: number; intervalDays?: number }; active: boolean }>) =>
    api(`/aesthetic/procedure-catalog/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteProcedureCatalog: (id: string) => api(`/aesthetic/procedure-catalog/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Procedure Sessions
  // -------------------------------------------------------------------------
  listProcedureSessions: (params?: { search?: string; labPatientId?: string; patientMrn?: string; phone?: string; procedureId?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/aesthetic/procedure-sessions', params)),
  createProcedureSession: (data: { labPatientId?: string; patientMrn?: string; patientName?: string; phone?: string; procedureId: string; procedureName?: string; date: string; sessionNo?: number; doctorId?: string; price?: number; discount?: number; paid?: number; status?: 'planned' | 'done' | 'cancelled'; nextVisitDate?: string; notes?: string; beforeImages?: string[]; afterImages?: string[]; consentIds?: string[] }) =>
    api('/aesthetic/procedure-sessions', { method: 'POST', body: JSON.stringify(data) }),
  updateProcedureSession: (id: string, patch: Partial<{ labPatientId: string; patientMrn: string; patientName: string; phone: string; procedureId: string; procedureName: string; date: string; sessionNo: number; doctorId: string; price: number; discount: number; paid: number; status: 'planned' | 'done' | 'cancelled'; nextVisitDate: string; notes: string; beforeImages: string[]; afterImages: string[]; consentIds: string[] }>) =>
    api(`/aesthetic/procedure-sessions/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteProcedureSession: (id: string) => api(`/aesthetic/procedure-sessions/${id}`, { method: 'DELETE' }),
  completeProcedure: (data: { patientMrn: string; procedureId: string }) =>
    api('/aesthetic/procedure-sessions/complete-procedure', { method: 'POST', body: JSON.stringify(data) }),
  addProcedureSessionPayment: (id: string, data: { amount: number; method?: string; dateIso?: string; note?: string }) =>
    api(`/aesthetic/procedure-sessions/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  getProcedureSessionPayments: (id: string) => api(`/aesthetic/procedure-sessions/${id}/payments`),
  setProcedureSessionNextVisit: (id: string, nextVisitDate: string) =>
    api(`/aesthetic/procedure-sessions/${id}/next-visit`, { method: 'PUT', body: JSON.stringify({ nextVisitDate }) }),

  // -------------------------------------------------------------------------
  // Sidebar Roles & Permissions
  // -------------------------------------------------------------------------
  listSidebarRoles: () => api('/aesthetic/sidebar-roles'),
  createSidebarRole: (role: string, permissions?: Array<{ path: string; label: string; visible?: boolean; order?: number }>) =>
    api('/aesthetic/sidebar-roles', { method: 'POST', body: JSON.stringify({ role, permissions }) }),
  deleteSidebarRole: (role: string) => api(`/aesthetic/sidebar-roles/${encodeURIComponent(role)}`, { method: 'DELETE' }),
  listSidebarPermissions: (role?: string) =>
    role ? api(`/aesthetic/sidebar-permissions?role=${encodeURIComponent(role)}`) : api('/aesthetic/sidebar-permissions'),
  updateSidebarPermissions: (role: string, data: { permissions: Array<{ path: string; label: string; visible: boolean; order: number }> }) =>
    api(`/aesthetic/sidebar-permissions/${encodeURIComponent(role)}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetSidebarPermissions: (role: string) =>
    api(`/aesthetic/sidebar-permissions/${encodeURIComponent(role)}/reset`, { method: 'POST' }),
}

export default aestheticApi
