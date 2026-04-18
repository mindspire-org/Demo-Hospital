/**
 * Lab API Module
 * 
 * Handles laboratory operations:
 * - Auth, Settings, Users, Audit Logs
 * - Purchase Orders, Drafts, Purchases, Returns
 * - Suppliers, Companies, Inventory
 * - Shifts, Staff, Attendance, Earnings, Expenses
 * - Cash Movements, Cash Counts
 * - Patients, Tests (Catalog), Orders, Tokens
 * - Results, Payments, Income Ledger
 * - Appointments, Dashboard, Reports
 * - Blood Bank (Donors, Receivers, Inventory)
 * - Sidebar Roles & Permissions
 */

import { api, withQuery } from '@/api'

export const labApi = {
  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------
  login: (username: string, password: string) => api('/lab/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  loginUser: (username: string, password: string) => api('/lab/users/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logoutUser: () => api('/lab/users/logout', { method: 'POST' }),
  logout: () => api('/lab/logout', { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------
  getSettings: () => api('/lab/settings'),
  updateSettings: (data: any) => api('/lab/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Purchase Orders
  // -------------------------------------------------------------------------
  listPurchaseOrders: (params?: { q?: string; page?: number; limit?: number }) =>
    api(withQuery('/lab/purchase-orders', params)),
  getPurchaseOrder: (id: string) => api(`/lab/purchase-orders/${id}`),
  createPurchaseOrder: (data: any) => api('/lab/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  updatePurchaseOrder: (id: string, data: any) => api(`/lab/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updatePurchaseOrderStatus: (id: string, status: string) =>
    api(`/lab/purchase-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deletePurchaseOrder: (id: string) => api(`/lab/purchase-orders/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Purchase Drafts
  // -------------------------------------------------------------------------
  listPurchaseDrafts: (params?: { from?: string; to?: string; search?: string; limit?: number }) =>
    api(withQuery('/lab/purchase-drafts', params)),
  getPurchaseDraft: (id: string) => api(`/lab/purchase-drafts/${id}`),
  createPurchaseDraft: (data: any) => api('/lab/purchase-drafts', { method: 'POST', body: JSON.stringify(data) }),
  updatePurchaseDraft: (id: string, data: any) => api(`/lab/purchase-drafts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  approvePurchaseDraft: (id: string) => api(`/lab/purchase-drafts/${id}/approve`, { method: 'POST' }),
  deletePurchaseDraft: (id: string) => api(`/lab/purchase-drafts/${id}`, { method: 'DELETE' }),
  getNextPurchaseInvoiceNumber: () => api('/lab/purchase-drafts/next-invoice-number'),

  // -------------------------------------------------------------------------
  // Held Purchase Invoices
  // -------------------------------------------------------------------------
  createHoldPurchaseInvoice: (data: any) => api('/lab/hold-purchase-invoices', { method: 'POST', body: JSON.stringify(data) }),
  listHoldPurchaseInvoices: () => api('/lab/hold-purchase-invoices'),
  getHoldPurchaseInvoice: (id: string) => api(`/lab/hold-purchase-invoices/${id}`),
  deleteHoldPurchaseInvoice: (id: string) => api(`/lab/hold-purchase-invoices/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Companies
  // -------------------------------------------------------------------------
  listCompanies: (params?: { distributorId?: string }) =>
    api(withQuery('/lab/companies', params)),
  createCompany: (data: any) => api('/lab/companies', { method: 'POST', body: JSON.stringify(data) }),
  updateCompany: (id: string, data: any) => api(`/lab/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCompany: (id: string) => api(`/lab/companies/${id}`, { method: 'DELETE' }),
  assignSupplierCompanies: (supplierId: string, data: { companyIds?: string[]; unassignIds?: string[] }) =>
    api(`/lab/suppliers/${supplierId}/companies`, { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Inventory
  // -------------------------------------------------------------------------
  listInventory: (params?: { search?: string; page?: number; limit?: number }) =>
    api(withQuery('/lab/inventory', params)),
  inventorySummary: (params?: { search?: string; limit?: number }) =>
    api(withQuery('/lab/inventory/summary', params)),
  deleteInventoryItem: (key: string) => api(`/lab/inventory/${encodeURIComponent(key)}`, { method: 'DELETE' }),
  updateInventoryItem: (key: string, data: any) => api(`/lab/inventory/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Purchases
  // -------------------------------------------------------------------------
  listPurchases: (params?: { from?: string; to?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/lab/purchases', params)),
  createPurchase: (data: any) => api('/lab/purchases', { method: 'POST', body: JSON.stringify(data) }),
  deletePurchase: (id: string) => api(`/lab/purchases/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Returns
  // -------------------------------------------------------------------------
  listReturns: (params?: { type?: 'Customer' | 'Supplier'; from?: string; to?: string; search?: string; party?: string; reference?: string; page?: number; limit?: number }) =>
    api(withQuery('/lab/returns', params)),
  createReturn: (data: any) => api('/lab/returns', { method: 'POST', body: JSON.stringify(data) }),
  undoReturn: (data: { reference: string; testId?: string; testName?: string; note?: string }) =>
    api('/lab/returns/undo', { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Suppliers
  // -------------------------------------------------------------------------
  listSuppliers: (params?: string | { q?: string; page?: number; limit?: number }) => {
    if (typeof params === 'string') return api(`/lab/suppliers?q=${encodeURIComponent(params)}`)
    return api(withQuery('/lab/suppliers', params))
  },
  createSupplier: (data: any) => api('/lab/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: any) => api(`/lab/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id: string) => api(`/lab/suppliers/${id}`, { method: 'DELETE' }),
  recordSupplierPayment: (id: string, data: { amount: number; purchaseId?: string; method?: string; note?: string; date?: string }) =>
    api(`/lab/suppliers/${id}/payment`, { method: 'POST', body: JSON.stringify(data) }),
  listSupplierPurchases: (id: string) => api(`/lab/suppliers/${id}/purchases`),

  // -------------------------------------------------------------------------
  // Shifts, Staff, Attendance, Earnings
  // -------------------------------------------------------------------------
  listShifts: () => api('/lab/shifts'),
  createShift: (data: any) => api('/lab/shifts', { method: 'POST', body: JSON.stringify(data) }),
  updateShift: (id: string, data: any) => api(`/lab/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShift: (id: string) => api(`/lab/shifts/${id}`, { method: 'DELETE' }),

  listStaff: (params?: { q?: string; shiftId?: string; page?: number; limit?: number } | string) => {
    if (typeof params === 'string') return api(`/lab/staff?q=${encodeURIComponent(params)}`)
    return api(withQuery('/lab/staff', params))
  },
  createStaff: (data: any) => api('/lab/staff', { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: (id: string, data: any) => api(`/lab/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaff: (id: string) => api(`/lab/staff/${id}`, { method: 'DELETE' }),

  listAttendance: (params?: { date?: string; shiftId?: string; staffId?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/lab/attendance', params)),
  upsertAttendance: (data: any) => api('/lab/attendance', { method: 'POST', body: JSON.stringify(data) }),

  listStaffEarnings: (params?: { staffId?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/lab/staff-earnings', params)),
  createStaffEarning: (data: { staffId: string; date: string; category: 'Bonus' | 'Award' | 'LumpSum' | 'RevenueShare'; amount?: number; rate?: number; base?: number; notes?: string }) =>
    api('/lab/staff-earnings', { method: 'POST', body: JSON.stringify(data) }),
  updateStaffEarning: (id: string, data: Partial<{ staffId: string; date: string; category: 'Bonus' | 'Award' | 'LumpSum' | 'RevenueShare'; amount?: number; rate?: number; base?: number; notes?: string }>) =>
    api(`/lab/staff-earnings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaffEarning: (id: string) => api(`/lab/staff-earnings/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Expenses
  // -------------------------------------------------------------------------
  listExpenses: (params?: { from?: string; to?: string; minAmount?: number; search?: string; type?: string; page?: number; limit?: number }) =>
    api(withQuery('/lab/expenses', params)),
  createExpense: (data: any) => api('/lab/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id: string) => api(`/lab/expenses/${id}`, { method: 'DELETE' }),
  expensesSummary: (params?: { from?: string; to?: string }) =>
    api(withQuery('/lab/expenses/summary', params)),

  // -------------------------------------------------------------------------
  // Cash Movements & Counts
  // -------------------------------------------------------------------------
  listCashMovements: (params?: { from?: string; to?: string; type?: 'IN' | 'OUT'; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/lab/cash-movements', params)),
  createCashMovement: (data: { date: string; type: 'IN' | 'OUT'; category?: string; amount: number; receiver?: string; handoverBy?: string; note?: string }) =>
    api('/lab/cash-movements', { method: 'POST', body: JSON.stringify(data) }),
  deleteCashMovement: (id: string) => api(`/lab/cash-movements/${id}`, { method: 'DELETE' }),
  cashMovementSummary: (params?: { from?: string; to?: string; type?: 'IN' | 'OUT' }) =>
    api(withQuery('/lab/cash-movements/summary', params)),

  listCashCounts: (params?: { from?: string; to?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/lab/cash-counts', params)),
  createCashCount: (data: { date: string; amount: number; receiver?: string; handoverBy?: string; note?: string }) =>
    api('/lab/cash-counts', { method: 'POST', body: JSON.stringify(data) }),
  deleteCashCount: (id: string) => api(`/lab/cash-counts/${id}`, { method: 'DELETE' }),
  cashCountSummary: (params?: { from?: string; to?: string; search?: string }) =>
    api(withQuery('/lab/cash-counts/summary', params)),

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------
  listUsers: () => api('/lab/users'),
  createUser: (data: any) => api('/lab/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => api(`/lab/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => api(`/lab/users/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Sidebar Roles & Permissions
  // -------------------------------------------------------------------------
  listSidebarRoles: () => api('/lab/sidebar-roles'),
  createSidebarRole: (role: string, permissions?: Array<{ path: string; label: string; visible?: boolean; order?: number }>) =>
    api('/lab/sidebar-roles', { method: 'POST', body: JSON.stringify({ role, permissions }) }),
  deleteSidebarRole: (role: string) => api(`/lab/sidebar-roles/${encodeURIComponent(role)}`, { method: 'DELETE' }),
  listSidebarPermissions: (role?: string) =>
    role ? api(`/lab/sidebar-permissions?role=${encodeURIComponent(role)}`) : api('/lab/sidebar-permissions'),
  updateSidebarPermissions: (role: string, data: { permissions: Array<{ path: string; label: string; visible: boolean; order: number }> }) =>
    api(`/lab/sidebar-permissions/${encodeURIComponent(role)}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetSidebarPermissions: (role: string) =>
    api(`/lab/sidebar-permissions/${encodeURIComponent(role)}/reset`, { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Audit Logs
  // -------------------------------------------------------------------------
  listAuditLogs: (params?: { search?: string; action?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/lab/audit-logs', params)),
  createAuditLog: (data: any) => api('/lab/audit-logs', { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Patients
  // -------------------------------------------------------------------------
  findOrCreatePatient: (data: { fullName: string; guardianName?: string; phone?: string; cnic?: string; gender?: string; address?: string; age?: string; guardianRel?: string; selectId?: string; forceCreate?: boolean }) =>
    api('/lab/patients/find-or-create', { method: 'POST', body: JSON.stringify(data) }),
  getPatientByMrn: (mrn: string) => api(`/lab/patients/by-mrn?mrn=${encodeURIComponent(mrn)}`),
  searchPatients: (params?: { phone?: string; name?: string; fatherName?: string; mrn?: string; limit?: number }) =>
    api(withQuery('/lab/patients/search', params)),
  updatePatient: (id: string, data: { fullName?: string; fatherName?: string; phone?: string; cnic?: string; gender?: string; age?: string; address?: string; mrn?: string }) =>
    api(`/lab/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Tests (Catalog)
  // -------------------------------------------------------------------------
  listTests: (params?: { q?: string; page?: number; limit?: number }) =>
    api(withQuery('/lab/tests', params)),
  createTest: (data: any) => api('/lab/tests', { method: 'POST', body: JSON.stringify(data) }),
  updateTest: (id: string, data: any) => api(`/lab/tests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTest: (id: string) => api(`/lab/tests/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Orders
  // -------------------------------------------------------------------------
  listOrders: (params?: { q?: string; status?: 'received' | 'completed'; from?: string; to?: string; collectionCenterId?: string; page?: number; limit?: number }) =>
    api(withQuery('/lab/orders', params)),
  createOrder: (data: any) => api('/lab/orders', { method: 'POST', body: JSON.stringify(data) }),
  receiveTokenPayment: (tokenNo: string, data: { amount: number; note?: string; method?: string }) =>
    api(`/lab/orders/token/${encodeURIComponent(tokenNo)}/receive-payment`, { method: 'POST', body: JSON.stringify(data) }),
  updateOrderTrack: (id: string, data: { testId?: string; orderTestId?: string; sampleTime?: string; reportingTime?: string; status?: 'pending' | 'received' | 'sample_collected' | 'in_progress' | 'result_entered' | 'approved' | 'completed' | 'returned' | 'cancelled'; referringConsultant?: string; barcode?: string; isReturned?: boolean; returnReason?: string; refundAmount?: number; refundMethod?: string }) =>
    api(`/lab/orders/${id}/track`, { method: 'PUT', body: JSON.stringify(data) }),
  assignBarcode: (id: string, barcode: string) =>
    api(`/lab/orders/${id}/track`, { method: 'PUT', body: JSON.stringify({ barcode }) }),
  deleteOrder: (id: string) => api(`/lab/orders/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Income Ledger
  // -------------------------------------------------------------------------
  incomeLedger: (params?: { from?: string; to?: string; status?: 'all' | 'paid' | 'receivable'; method?: string; q?: string; page?: number; limit?: number }) =>
    api(withQuery('/lab/income-ledger', params)),

  // -------------------------------------------------------------------------
  // Appointments
  // -------------------------------------------------------------------------
  listAppointments: (params?: { date?: string; from?: string; to?: string; status?: 'booked' | 'confirmed' | 'cancelled' | 'converted'; q?: string; limit?: number }) =>
    api(withQuery('/lab/appointments', params)),
  createAppointment: (data: { dateIso: string; time?: string; tests: string[]; patientId?: string; mrn?: string; patientName?: string; phone?: string; gender?: string; age?: string; notes?: string }) =>
    api('/lab/appointments', { method: 'POST', body: JSON.stringify(data) }),
  updateAppointment: (id: string, data: { dateIso?: string; time?: string; tests?: string[]; patientName?: string; phone?: string; gender?: string; age?: string; notes?: string }) =>
    api(`/lab/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateAppointmentStatus: (id: string, status: 'booked' | 'confirmed' | 'cancelled' | 'converted') =>
    api(`/lab/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteAppointment: (id: string) => api(`/lab/appointments/${id}`, { method: 'DELETE' }),
  convertAppointmentToToken: (id: string) => api(`/lab/appointments/${id}/convert-to-token`, { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Results
  // -------------------------------------------------------------------------
  listResults: (params?: { orderId?: string; from?: string; to?: string; reportStatus?: string; page?: number; limit?: number }) =>
    api(withQuery('/lab/results', params)),
  getResult: (id: string) => api(`/lab/results/${id}`),
  createResult: (data: { orderId: string; orderTestId?: string; rows?: any[]; interpretation?: string; submittedBy?: string } | any) =>
    api('/lab/results', { method: 'POST', body: JSON.stringify(data) }),
  updateResult: (id: string, data: { rows?: any[]; interpretation?: string; reportStatus?: 'pending' | 'approved'; approvedAt?: string | Date; approvedBy?: string } | any) =>
    api(`/lab/results/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Payments
  // -------------------------------------------------------------------------
  listPayments: (params?: { tokenId?: string; orderId?: string; patientId?: string; type?: 'payment' | 'refund' | 'adjustment' }) =>
    api(withQuery('/lab/payments', params)),

  // -------------------------------------------------------------------------
  // Tokens
  // -------------------------------------------------------------------------
  listTokens: (params?: { q?: string; status?: 'token_generated' | 'converted_to_sample' | 'sample_received' | 'result_entered' | 'approved' | 'cancelled'; from?: string; to?: string; collectionCenterId?: string; page?: number; limit?: number }) =>
    api(withQuery('/lab/tokens', params)),
  getToken: (id: string) => api(`/lab/tokens/${id}`),
  getTokenTimeline: (id: string) => api(`/lab/tokens/${id}/timeline`),
  createToken: (data: { patientId: string; patient: { fullName: string; phone?: string; mrn?: string; age?: string; gender?: string }; tests?: string[]; referringConsultant?: string; corporateId?: string; portal?: 'lab' | 'reception'; subtotal?: number; discount?: number; net?: number; receivedAmount?: number }) =>
    api('/lab/tokens', { method: 'POST', body: JSON.stringify(data) }),
  updateToken: (id: string, data: { patient?: { mrn?: string; fullName?: string; phone?: string; age?: string; gender?: string; address?: string; guardianRelation?: string; guardianName?: string; cnic?: string }; tests?: string[]; referringConsultant?: string } | any) =>
    api(`/lab/tokens/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  convertTokenToSample: (id: string, data: { tests: string[]; subtotal?: number; discount?: number; net?: number; receivedAmount?: number; paymentMethod?: string; paymentNote?: string; referringConsultant?: string; corporateId?: string }) =>
    api(`/lab/tokens/${id}/convert`, { method: 'POST', body: JSON.stringify(data) }),
  updateTokenStatus: (id: string, data: { status: 'token_generated' | 'converted_to_sample' | 'sample_received' | 'result_entered' | 'approved' | 'cancelled'; orderId?: string; resultId?: string }) =>
    api(`/lab/tokens/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteToken: (id: string) => api(`/lab/tokens/${id}`, { method: 'DELETE' }),
  receivePayment: (tokenNo: string, data: { amount: number; method?: string; note?: string }) =>
    api(`/lab/tokens/${encodeURIComponent(tokenNo)}/receive-payment`, { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Dashboard & Reports
  // -------------------------------------------------------------------------
  dashboardSummary: () => api('/lab/dashboard/summary'),
  reportsSummary: (params?: { from?: string; to?: string }) =>
    api(withQuery('/lab/reports/summary', params)),

  // -------------------------------------------------------------------------
  // Blood Bank - Donors
  // -------------------------------------------------------------------------
  listBBDonors: (params?: { q?: string; page?: number; limit?: number }) =>
    api(withQuery('/lab/bb/donors', params)),
  createBBDonor: (data: any) => api('/lab/bb/donors', { method: 'POST', body: JSON.stringify(data) }),
  updateBBDonor: (id: string, data: any) => api(`/lab/bb/donors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBBDonor: (id: string) => api(`/lab/bb/donors/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Blood Bank - Receivers
  // -------------------------------------------------------------------------
  listBBReceivers: (params?: { q?: string; status?: 'URGENT' | 'PENDING' | 'DISPENSED' | 'APPROVED'; type?: string; page?: number; limit?: number }) =>
    api(withQuery('/lab/bb/receivers', params)),
  createBBReceiver: (data: any) => api('/lab/bb/receivers', { method: 'POST', body: JSON.stringify(data) }),
  updateBBReceiver: (id: string, data: any) => api(`/lab/bb/receivers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBBReceiver: (id: string) => api(`/lab/bb/receivers/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Blood Bank - Inventory
  // -------------------------------------------------------------------------
  listBBInventory: (params?: { q?: string; status?: 'Available' | 'Quarantined' | 'Used' | 'Expired'; type?: string; page?: number; limit?: number }) =>
    api(withQuery('/lab/bb/inventory', params)),
  bbInventorySummary: () => api('/lab/bb/inventory/summary'),
  createBBBag: (data: any) => api('/lab/bb/inventory', { method: 'POST', body: JSON.stringify(data) }),
  updateBBBag: (id: string, data: any) => api(`/lab/bb/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBBBag: (id: string) => api(`/lab/bb/inventory/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Collection Centers
  // -------------------------------------------------------------------------
  listCollectionCenters: (params?: { q?: string; status?: string; page?: number; limit?: number }) =>
    api(withQuery('/lab/collection-centers', params)),
  listActiveCollectionCenters: () => api('/lab/collection-centers/active'),
  createCollectionCenter: (data: { name: string; code: string; address?: string; contactPerson?: string; phone?: string; email?: string; status?: 'Active' | 'Inactive'; commissionPercent?: number }) =>
    api('/lab/collection-centers', { method: 'POST', body: JSON.stringify(data) }),
  updateCollectionCenter: (id: string, data: Partial<{ name: string; code: string; address?: string; contactPerson?: string; phone?: string; email?: string; status?: 'Active' | 'Inactive'; commissionPercent?: number }>) =>
    api(`/lab/collection-centers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCollectionCenter: (id: string) => api(`/lab/collection-centers/${id}`, { method: 'DELETE' }),
  getCollectionCenterTokens: (id: string, params?: { from?: string; to?: string; status?: string; page?: number; limit?: number }) =>
    api(withQuery(`/lab/collection-centers/${id}/tokens`, params)),
  getCollectionCenterRevenue: (id: string, params?: { from?: string; to?: string }) =>
    api(withQuery(`/lab/collection-centers/${id}/revenue`, params)),
  getCollectionCentersRevenueSummary: (params?: { from?: string; to?: string }) =>
    api(withQuery('/lab/collection-centers/revenue/summary', params)),
  recordCollectionCenterPayment: (id: string, data: { date: string; amount: number; note?: string }) =>
    api(`/lab/collection-centers/${id}/record-payment`, { method: 'POST', body: JSON.stringify(data) }),
  getCollectionCenterPaymentHistory: (id: string) =>
    api(`/lab/collection-centers/${id}/payment-history`),
}

export default labApi
