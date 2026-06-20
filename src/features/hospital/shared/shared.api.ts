/**
 * Shared Hospital API Module
 * 
 * Handles common hospital operations:
 * - Settings, Reports, FBR
 * - Finance Transactions, Corporate AR
 * - Patients, Departments, Doctors, Doctor Schedules
 * - Users, Sidebar Roles & Permissions
 * - Bed Management (Floors, Rooms, Wards, Beds)
 * - Staff, Shifts, Attendance, Earnings, Expenses
 * - Notifications, Audit Logs
 */

import { api, withQuery } from '../../../api'

export const sharedApi = {
  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------
  login: (data: { username: string; password: string }) =>
    api('/hospital/users/login', { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------
  getSettings: () => api('/hospital/settings'),
  updateSettings: (data: any) => api('/hospital/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Reports
  // -------------------------------------------------------------------------
  myActivityReport: (params?: { mode?: 'today' | 'shift' }) =>
    api(withQuery('/hospital/reports/my-activity', params)),
  dashboardStats: (params?: { from?: string; to?: string }) =>
    api(withQuery('/hospital/reports/dashboard-stats', params)),

  // -------------------------------------------------------------------------
  // FBR
  // -------------------------------------------------------------------------
  getFbrSettings: () => api('/hospital/fbr/settings'),
  updateFbrSettings: (data: any) => api('/hospital/fbr/settings', { method: 'PUT', body: JSON.stringify(data) }),
  listFbrLogs: (params?: { q?: string; from?: string; to?: string; module?: string; status?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/fbr/logs', params)),
  retryFbrLog: (id: string) => api(`/hospital/fbr/logs/${encodeURIComponent(String(id))}/retry`, { method: 'POST' }),
  summaryFbr: (params?: { invoiceType?: string; from?: string; to?: string }) =>
    api(withQuery('/hospital/fbr/summary', params)),

  // -------------------------------------------------------------------------
  // Finance Transactions
  // -------------------------------------------------------------------------
  listTransactions: (params?: { from?: string; to?: string; type?: string; method?: string; q?: string; page?: number; limit?: number; doctorId?: string; departmentId?: string; username?: string }) =>
    api(withQuery('/hospital/finance/transactions', params)),
  getCorporateARBreakdown: (params?: { from?: string; to?: string }) =>
    api(withQuery('/hospital/finance/corporate-ar-breakdown', params)),
  listCashBankAccounts: (params?: { active?: boolean; includeBalance?: boolean }) =>
    api(withQuery('/hospital/finance/cash-bank-accounts', params)),
  getCashBankAccountBalance: (id: string) =>
    api(`/hospital/finance/cash-bank-accounts/${encodeURIComponent(id)}/balance`),

  // -------------------------------------------------------------------------
  // Patients
  // -------------------------------------------------------------------------
  searchPatientsByPhone: (phone: string) => api(`/hospital/patients/search?phone=${encodeURIComponent(phone || '')}`),
  searchPatients: (params?: { mrn?: string; name?: string; fatherName?: string; phone?: string; limit?: number }) =>
    api(withQuery('/hospital/patients/search', params)),

  // -------------------------------------------------------------------------
  // Masters - Departments & Doctors
  // -------------------------------------------------------------------------
  listDepartments: (params?: { page?: number; limit?: number; q?: string; from?: string; to?: string }) =>
    api(withQuery('/hospital/departments', params || {})),
  createDepartment: (data: { name: string; description?: string; opdBaseFee: number; opdFollowupFee?: number; followupWindowDays?: number; doctorPrices?: Array<{ doctorId: string; price: number }> }) =>
    api('/hospital/departments', { method: 'POST', body: JSON.stringify(data) }),
  updateDepartment: (id: string, data: { name: string; description?: string; opdBaseFee: number; opdFollowupFee?: number; followupWindowDays?: number; doctorPrices?: Array<{ doctorId: string; price: number }> }) =>
    api(`/hospital/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDepartment: (id: string) => api(`/hospital/departments/${id}`, { method: 'DELETE' }),

  listDoctors: (params?: { q?: string; departmentId?: string; active?: boolean; page?: number; limit?: number }) =>
    api(withQuery('/hospital/doctors', params)),
  getDoctor: (id: string) => api(`/hospital/doctors/${id}`),
  createDoctor: (data: { name: string; departmentIds?: string[]; primaryDepartmentId?: string; opdPublicFee?: number; opdPrivateFee?: number; opdSubsidizedFee?: number; opdFollowupFee?: number; followupWindowDays?: number; username?: string; password?: string; phone?: string; specialization?: string; qualification?: string; cnic?: string; pmdcNo?: string; shares?: number; opdShare?: number; ipdShare?: number; active?: boolean }) =>
    api('/hospital/doctors', { method: 'POST', body: JSON.stringify(data) }),
  updateDoctor: (id: string, data: { name?: string; departmentIds?: string[]; primaryDepartmentId?: string; opdPublicFee?: number; opdPrivateFee?: number; opdSubsidizedFee?: number; opdFollowupFee?: number; followupWindowDays?: number; username?: string; password?: string; phone?: string; specialization?: string; qualification?: string; cnic?: string; pmdcNo?: string; shares?: number; opdShare?: number; ipdShare?: number; active?: boolean; prescriptionTemplate?: string; prescriptionLanguage?: string; prescriptionDesign?: any }) =>
    api(`/hospital/doctors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateDoctorProfile: (id: string, data: { name?: string; phone?: string; specialization?: string; qualification?: string; prescriptionTemplate?: string; prescriptionLanguage?: string; prescriptionDesign?: any }) =>
    api(`/hospital/doctors/${id}/profile`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDoctor: (id: string) => api(`/hospital/doctors/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Doctor Schedules
  // -------------------------------------------------------------------------
  listDoctorSchedules: (params?: { doctorId?: string; departmentId?: string; date?: string }) =>
    api(withQuery('/hospital/doctor-schedules', params)),
  applyDoctorWeeklyPattern: (data: { doctorId: string; departmentId?: string; anchorDate?: string; weeks?: number; days: Array<{ day: number; enabled: boolean; startTime?: string; endTime?: string; slotMinutes?: number; fee?: number; followupFee?: number; notes?: string }> }) =>
    api('/hospital/doctor-schedules/weekly-pattern', { method: 'POST', body: JSON.stringify(data) }),
  updateDoctorSchedule: (id: string, data: { departmentId?: string; dateIso?: string; startTime?: string; endTime?: string; slotMinutes?: number; fee?: number; followupFee?: number; notes?: string }) =>
    api(`/hospital/doctor-schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDoctorSchedule: (id: string) => api(`/hospital/doctor-schedules/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------
  listHospitalUsers: () => api('/hospital/users'),
  createHospitalUser: (data: { username: string; role: string; fullName?: string; phone?: string; email?: string; password?: string; active?: boolean }) =>
    api('/hospital/users', { method: 'POST', body: JSON.stringify(data) }),
  updateHospitalUser: (id: string, data: { username?: string; role?: string; fullName?: string; phone?: string; email?: string; password?: string; active?: boolean }) =>
    api(`/hospital/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHospitalUser: (id: string) => api(`/hospital/users/${id}`, { method: 'DELETE' }),
  loginHospitalUser: (username: string, password?: string) =>
    api('/hospital/users/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logoutHospitalUser: (username?: string) =>
    api('/hospital/users/logout', { method: 'POST', body: JSON.stringify({ username }) }),

  // -------------------------------------------------------------------------
  // Sidebar Roles & Permissions
  // -------------------------------------------------------------------------
  listSidebarRoles: () => api('/hospital/sidebar-roles'),
  createSidebarRole: (role: string, permissions?: Array<{ path: string; label: string; visible?: boolean; order?: number }>) =>
    api('/hospital/sidebar-roles', { method: 'POST', body: JSON.stringify({ role, permissions }) }),
  deleteSidebarRole: (role: string) => api(`/hospital/sidebar-roles/${encodeURIComponent(role)}`, { method: 'DELETE' }),
  listSidebarPermissions: (role?: string) =>
    role ? api(`/hospital/sidebar-permissions?role=${encodeURIComponent(role)}`) : api('/hospital/sidebar-permissions'),
  updateSidebarPermissions: (role: string, data: { permissions: Array<{ path: string; label: string; visible: boolean; order: number }> }) =>
    api(`/hospital/sidebar-permissions/${encodeURIComponent(role)}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetSidebarPermissions: (role: string) =>
    api(`/hospital/sidebar-permissions/${encodeURIComponent(role)}/reset`, { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Staff, Shifts, Attendance, Earnings, Expenses
  // -------------------------------------------------------------------------
  listStaff: (params?: { page?: number; limit?: number }) => api(withQuery('/hospital/staff', params)),
  listShifts: () => api('/hospital/shifts'),
  fetchBiometricNow: () => api('/hospital/staff/biometric/fetch', { method: 'POST' }),
  fetchBiometricViaLocal: async () => {
    const LOCAL_FETCHER_URL = 'http://localhost:4500'
    const res = await fetch(`${LOCAL_FETCHER_URL}/fetch`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || `Local fetcher returned ${res.status}`)
    }
    return res.json()
  },
  biometricStatus: () => api('/hospital/staff/biometric/status'),
  listBiometricDeviceUsers: () => api('/hospital/staff/biometric/device-users'),
  connectStaffBiometric: (id: string, data: any) => api(`/hospital/staff/${id}/biometric/connect`, { method: 'POST', body: JSON.stringify(data) }),
  getBiometricConfig: () => api('/biometric/config'),
  updateBiometricConfig: (data: any) => api('/biometric/config', { method: 'PUT', body: JSON.stringify(data) }),
  createShift: (data: any) => api('/hospital/shifts', { method: 'POST', body: JSON.stringify(data) }),
  updateShift: (id: string, data: any) => api(`/hospital/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShift: (id: string) => api(`/hospital/shifts/${id}`, { method: 'DELETE' }),
  listAttendance: (params?: { date?: string; from?: string; to?: string; shiftId?: string; staffId?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/attendance', params)),
  upsertAttendance: (data: any) => api('/hospital/attendance', { method: 'POST', body: JSON.stringify(data) }),
  createStaff: (data: any) => api('/hospital/staff', { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: (id: string, data: any) => api(`/hospital/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaff: (id: string) => api(`/hospital/staff/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Leave Management
  // -------------------------------------------------------------------------
  listLeaves: (params?: { staffId?: string; status?: string; from?: string; to?: string }) =>
    api(withQuery('/hospital/leaves', params)),
  createLeave: (data: { staffId: string; type: string; startDate: string; endDate: string; isHalfDay?: boolean; halfDayType?: string; reason?: string }) =>
    api('/hospital/leaves', { method: 'POST', body: JSON.stringify(data) }),
  approveLeave: (id: string, data: { status: 'approved' | 'rejected'; rejectionReason?: string }) =>
    api(`/hospital/leaves/${id}/approve`, { method: 'POST', body: JSON.stringify(data) }),
  deleteLeave: (id: string) => api(`/hospital/leaves/${id}`, { method: 'DELETE' }),

  listStaffEarnings: (params?: { staffId?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/staff-earnings', params)),
  createStaffEarning: (data: { staffId: string; date: string; category: 'Bonus' | 'Award' | 'LumpSum' | 'RevenueShare'; amount?: number; rate?: number; base?: number; notes?: string }) =>
    api('/hospital/staff-earnings', { method: 'POST', body: JSON.stringify(data) }),
  updateStaffEarning: (id: string, data: Partial<{ staffId: string; date: string; category: 'Bonus' | 'Award' | 'LumpSum' | 'RevenueShare'; amount?: number; rate?: number; base?: number; notes?: string }>) =>
    api(`/hospital/staff-earnings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaffEarning: (id: string) => api(`/hospital/staff-earnings/${id}`, { method: 'DELETE' }),

  listExpenses: (params?: { from?: string; to?: string }) =>
    api(withQuery('/hospital/expenses', params)),
  createExpense: (data: { dateIso: string; departmentId?: string; expenseDepartmentId?: string; departmentName?: string; category: string; expenseCategoryId?: string; categoryName?: string; amount: number; note?: string; method?: string; ref?: string; createdByUsername?: string }) =>
    api('/hospital/expenses', { method: 'POST', body: JSON.stringify(data) }),
  updateExpense: (id: string, data: { dateIso?: string; departmentId?: string; category?: string; amount?: number; note?: string; method?: string; ref?: string }) =>
    api(`/hospital/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExpense: (id: string) => api(`/hospital/expenses/${id}`, { method: 'DELETE' }),

  listExpenseDepartments: () => api('/hospital/expense-departments'),
  createExpenseDepartment: (name: string) => api('/hospital/expense-departments', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteExpenseDepartment: (id: string) => api(`/hospital/expense-departments/${id}`, { method: 'DELETE' }),
  listExpenseCategories: () => api('/hospital/expense-categories'),
  createExpenseCategory: (name: string) => api('/hospital/expense-categories', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteExpenseCategory: (id: string) => api(`/hospital/expense-categories/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Bed Management
  // -------------------------------------------------------------------------
  listFloors: () => api('/hospital/floors'),
  createFloor: (data: { name: string; number?: string }) => api('/hospital/floors', { method: 'POST', body: JSON.stringify(data) }),
  updateFloor: (id: string, data: { name?: string; number?: string }) => api(`/hospital/floors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFloor: (id: string) => api(`/hospital/floors/${id}`, { method: 'DELETE' }),

  listRooms: (floorId?: string) => api(`/hospital/rooms${floorId ? `?floorId=${encodeURIComponent(floorId)}` : ''}`),
  createRoom: (data: { name: string; floorId: string }) => api('/hospital/rooms', { method: 'POST', body: JSON.stringify(data) }),
  updateRoom: (id: string, data: { name?: string; floorId?: string }) => api(`/hospital/rooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRoom: (id: string) => api(`/hospital/rooms/${id}`, { method: 'DELETE' }),

  listWards: (floorId?: string) => api(`/hospital/wards${floorId ? `?floorId=${encodeURIComponent(floorId)}` : ''}`),
  createWard: (data: { name: string; floorId: string }) => api('/hospital/wards', { method: 'POST', body: JSON.stringify(data) }),
  updateWard: (id: string, data: { name?: string; floorId?: string }) => api(`/hospital/wards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWard: (id: string) => api(`/hospital/wards/${id}`, { method: 'DELETE' }),

  listBeds: (params?: { floorId?: string; locationType?: 'room' | 'ward'; locationId?: string; status?: 'available' | 'occupied' }) =>
    api(withQuery('/hospital/beds', params)),
  addBeds: (data: { floorId: string; locationType: 'room' | 'ward'; locationId: string; labels: string[]; charges?: number; category?: string }) =>
    api('/hospital/beds', { method: 'POST', body: JSON.stringify(data) }),
  updateBedStatus: (id: string, data: { status: 'available' | 'occupied'; encounterId?: string }) =>
    api(`/hospital/beds/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateBed: (id: string, data: { label?: string; charges?: number; category?: string }) =>
    api(`/hospital/beds/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBed: (id: string) => api(`/hospital/beds/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------------------
  listNotifications: (doctorId: string) =>
    api(`/hospital/notifications?doctorId=${encodeURIComponent(doctorId)}`),
  updateNotification: (id: string, read: boolean) =>
    api(`/hospital/notifications/${id}`, { method: 'PATCH', body: JSON.stringify({ read }) }),

  // -------------------------------------------------------------------------
  // Audit Logs
  // -------------------------------------------------------------------------
  listHospitalAuditLogs: (params?: { search?: string; action?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/audit-logs', params)),
  createHospitalAuditLog: (data: { actor?: string; action: string; label?: string; method?: string; path?: string; at: string; detail?: string }) =>
    api('/hospital/audit-logs', { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Doctor Custom Entries (for prescription fields)
  // -------------------------------------------------------------------------
  listDoctorCustomEntries: (params?: { doctorId?: string; category?: string }) =>
    api(withQuery('/hospital/doctor-custom-entries', params)),
  getDoctorCustomEntriesByCategory: (doctorId: string, category: string) =>
    api(`/hospital/doctor-custom-entries/doctor/${encodeURIComponent(doctorId)}/category/${encodeURIComponent(category)}`),
  createDoctorCustomEntry: (data: { doctorId: string; category: string; entryText: string }) =>
    api('/hospital/doctor-custom-entries', { method: 'POST', body: JSON.stringify(data) }),
  updateDoctorCustomEntry: (id: string, data: { entryText: string }) =>
    api(`/hospital/doctor-custom-entries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDoctorCustomEntry: (id: string) =>
    api(`/hospital/doctor-custom-entries/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Invoices
  // -------------------------------------------------------------------------
  listInvoices: (params?: { encounterType?: 'IPD' | 'EMERGENCY' | 'ALL'; status?: string; from?: string; to?: string; patientId?: string; department?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/invoices', params)),
  saveInvoice: (encounterId: string, encounterType: 'IPD' | 'EMERGENCY', data: { lineItems: any[]; discount: number; totalAmount: number; totalPaid: number; netOutstanding: number; dateOfDischarge?: string; dischargeTime?: string }) =>
    api(`/hospital/invoices/${encounterType.toLowerCase()}/${encodeURIComponent(encounterId)}`, { method: 'POST', body: JSON.stringify(data) }),
  getInvoiceByEncounter: (encounterId: string, encounterType: 'IPD' | 'EMERGENCY') =>
    api(`/hospital/invoices/${encounterType.toLowerCase()}/${encodeURIComponent(encounterId)}`),

  // -------------------------------------------------------------------------
  // Nurse Portal
  // -------------------------------------------------------------------------
  // Nurse Profile
  createNurseProfile: (data: any) => api('/hospital/nurses', { method: 'POST', body: JSON.stringify(data) }),
  listNurseProfiles: (params?: { specialization?: string; department?: string; isActive?: boolean; page?: number; limit?: number }) =>
    api(withQuery('/hospital/nurses', params)),
  getNurseProfile: (id: string) => api(`/hospital/nurses/${encodeURIComponent(id)}`),
  getNurseProfileByUserId: (userId: string) => api(`/hospital/nurses/user/${encodeURIComponent(userId)}`),
  updateNurseProfile: (id: string, data: any) => api(`/hospital/nurses/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNurseProfile: (id: string) => api(`/hospital/nurses/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getAvailableNurses: (params?: { specialization?: string; department?: string; shift?: string; date?: string }) =>
    api(withQuery('/hospital/nurses/available/list', params)),
  getNursesByWard: (ward: string, params?: { date?: string }) =>
    api(withQuery(`/hospital/nurses/by-ward/${encodeURIComponent(ward)}`, params)),

  // Nurse Dashboard
  getNurseDashboardStats: () => api('/hospital/nurse/dashboard'),
  getNurseAdminDashboard: () => api('/hospital/nurse-admin/dashboard'),

  // Nurse Tasks
  createNurseTask: (data: any) => api('/hospital/nurse-tasks', { method: 'POST', body: JSON.stringify(data) }),
  bulkCreateNurseTasks: (tasks: any[]) => api('/hospital/nurse-tasks/bulk', { method: 'POST', body: JSON.stringify({ tasks }) }),
  listNurseTasks: (params?: { assignedTo?: string; status?: string; taskType?: string; priority?: string; location?: string; ward?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/nurse-tasks', params)),
  getNurseTask: (id: string) => api(`/hospital/nurse-tasks/${encodeURIComponent(id)}`),
  getNurseTaskByTaskId: (taskId: string) => api(`/hospital/nurse-tasks/task-id/${encodeURIComponent(taskId)}`),
  getPendingNurseTasks: () => api('/hospital/nurse-tasks/pending'),
  getOverdueNurseTasks: (params?: { assignedTo?: string; location?: string; ward?: string }) =>
    api(withQuery('/hospital/nurse-tasks/overdue', params)),
  getPatientNurseTasks: (patientId: string, params?: { status?: string; limit?: number }) =>
    api(withQuery(`/hospital/nurse-tasks/patient/${encodeURIComponent(patientId)}`, params)),
  acceptNurseTask: (id: string) => api(`/hospital/nurse-tasks/${encodeURIComponent(id)}/accept`, { method: 'PUT' }),
  startNurseTask: (id: string) => api(`/hospital/nurse-tasks/${encodeURIComponent(id)}/start`, { method: 'PUT' }),
  completeNurseTask: (id: string, data: { notes?: string; complications?: string; patientResponse?: 'excellent' | 'good' | 'fair' | 'poor'; vitalsData?: any }) =>
    api(`/hospital/nurse-tasks/${encodeURIComponent(id)}/complete`, { method: 'PUT', body: JSON.stringify(data) }),
  cancelNurseTask: (id: string, reason: string) => api(`/hospital/nurse-tasks/${encodeURIComponent(id)}/cancel`, { method: 'PUT', body: JSON.stringify({ reason }) }),
  reassignNurseTask: (id: string, newNurseId: string, reason: string) =>
    api(`/hospital/nurse-tasks/${encodeURIComponent(id)}/reassign`, { method: 'PUT', body: JSON.stringify({ newNurseId, reason }) }),

  // Nurse Shifts
  createNurseShift: (data: any) => api('/hospital/nurse-shifts', { method: 'POST', body: JSON.stringify(data) }),
  listNurseShifts: (params?: { nurseId?: string; date?: string; from?: string; to?: string; shiftType?: string; ward?: string; status?: string; page?: number; limit?: number }) =>
    api(withQuery('/hospital/nurse-shifts', params)),
  getNurseShift: (id: string) => api(`/hospital/nurse-shifts/${encodeURIComponent(id)}`),
  updateNurseShift: (id: string, data: any) => api(`/hospital/nurse-shifts/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNurseShift: (id: string) => api(`/hospital/nurse-shifts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  checkInNurseShift: (id: string, location?: string) => api(`/hospital/nurse-shifts/${encodeURIComponent(id)}/checkin`, { method: 'PUT', body: JSON.stringify({ location }) }),
  checkOutNurseShift: (id: string) => api(`/hospital/nurse-shifts/${encodeURIComponent(id)}/checkout`, { method: 'PUT' }),
  giveHandover: (id: string, notes: string) => api(`/hospital/nurse-shifts/${encodeURIComponent(id)}/handover-give`, { method: 'PUT', body: JSON.stringify({ notes }) }),
  receiveHandover: (id: string, notes: string) => api(`/hospital/nurse-shifts/${encodeURIComponent(id)}/handover-receive`, { method: 'PUT', body: JSON.stringify({ notes }) }),
  getCurrentNurseShift: () => api('/hospital/nurse-shifts/current/my'),
  getMyNurseShifts: (params?: { from?: string; to?: string; limit?: number }) =>
    api(withQuery('/hospital/nurse-shifts/my/list', params)),
  getWardSchedule: (ward: string, date: string) =>
    api(withQuery('/hospital/nurse-shifts/ward/schedule', { ward, date })),

  // Nurse Performance
  calculateNursePerformance: (data: { nurseId: string; period: 'daily' | 'weekly' | 'monthly'; date: string }) =>
    api('/hospital/nurse-performance/calculate', { method: 'POST', body: JSON.stringify(data) }),
  getNursePerformance: (nurseId: string, params?: { period?: string; from?: string; to?: string; limit?: number }) =>
    api(withQuery(`/hospital/nurse-performance/${encodeURIComponent(nurseId)}`, params)),
  getMyNursePerformance: (params?: { period?: string; limit?: number }) =>
    api(withQuery('/hospital/nurse-performance/my/performance', params)),
  updateSupervisorRating: (id: string, data: { supervisorRating: number; supervisorComments?: string }) =>
    api(`/hospital/nurse-performance/${encodeURIComponent(id)}/supervisor-rating`, { method: 'PUT', body: JSON.stringify(data) }),
  getNursePerformanceLeaderboard: (params?: { period?: string; date?: string; limit?: number }) =>
    api(withQuery('/hospital/nurse-performance/leaderboard/list', params)),
  getNurseDepartmentSummary: (params?: { department?: string; from?: string; to?: string }) =>
    api(withQuery('/hospital/nurse-performance/department/summary', params)),
}

export default sharedApi
