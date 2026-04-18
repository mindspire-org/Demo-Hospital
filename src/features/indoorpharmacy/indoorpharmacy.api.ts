/**
 * Indoor Pharmacy API Module
 * 
 * Handles indoor pharmacy dispensing operations:
 * - Settings, Suppliers, Companies, Patients
 * - Expenses, Cash Movements, Cash Counts
 * - Medicines, Inventory (linked to hospital store)
 * - Dispensing / POS (for IPD/OPD patients)
 * - Purchases, Purchase Orders
 * - Returns (Patient returns)
 * - Notifications, Users, Audit Logs
 * - Sidebar Roles & Permissions
 */

import { api, cachedApi, withQuery } from '@/api'
import type { CachedApiOptions } from '@/api'

export const indoorPharmacyApi = {
  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------
  getSettings: () => api('/indoor-pharmacy/settings'),
  updateSettings: (data: any) => api('/indoor-pharmacy/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Suppliers
  // -------------------------------------------------------------------------
  listSuppliers: (params?: string | { q?: string; page?: number; limit?: number }) => {
    if (typeof params === 'string') {
      return api(`/indoor-pharmacy/suppliers?q=${encodeURIComponent(params)}`)
    }
    return api(withQuery('/indoor-pharmacy/suppliers', params))
  },
  listAllSuppliers: (q?: string) => api(withQuery('/indoor-pharmacy/suppliers', { q, limit: 500 })),
  createSupplier: (data: any) => api('/indoor-pharmacy/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: any) => api(`/indoor-pharmacy/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id: string) => api(`/indoor-pharmacy/suppliers/${id}`, { method: 'DELETE' }),
  recordSupplierPayment: (id: string, data: { amount: number; purchaseId?: string; method?: string; note?: string; date?: string }) =>
    api(`/indoor-pharmacy/suppliers/${id}/payment`, { method: 'POST', body: JSON.stringify(data) }),
  listSupplierPurchases: (id: string) => api(`/indoor-pharmacy/suppliers/${id}/purchases`),

  // -------------------------------------------------------------------------
  // Companies
  // -------------------------------------------------------------------------
  listCompanies: (params?: { q?: string; distributorId?: string; page?: number; limit?: number }) =>
    api(withQuery('/indoor-pharmacy/companies', params)),
  listAllCompanies: (params?: { q?: string; distributorId?: string }) =>
    api(withQuery('/indoor-pharmacy/companies', { ...params, limit: 500 })),
  createCompany: (data: { name: string; distributorId?: string; distributorName?: string; status?: 'Active' | 'Inactive' }) =>
    api('/indoor-pharmacy/companies', { method: 'POST', body: JSON.stringify(data) }),
  updateCompany: (id: string, data: Partial<{ name: string; distributorId?: string; distributorName?: string; status?: 'Active' | 'Inactive' }>) =>
    api(`/indoor-pharmacy/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCompany: (id: string) => api(`/indoor-pharmacy/companies/${id}`, { method: 'DELETE' }),
  listSupplierCompanies: (supplierId: string) => api(`/indoor-pharmacy/suppliers/${supplierId}/companies`),
  assignSupplierCompanies: (supplierId: string, data: { companyIds?: string[]; unassignIds?: string[] }) =>
    api(`/indoor-pharmacy/suppliers/${supplierId}/companies`, { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Patients (was Customers in external pharmacy)
  // -------------------------------------------------------------------------
  listPatients: (params?: { q?: string; page?: number; limit?: number }) =>
    api(withQuery('/indoor-pharmacy/patients', params)),
  getPatient: (id: string) => api(`/indoor-pharmacy/patients/${id}`),
  createPatient: (data: any) => api('/indoor-pharmacy/patients', { method: 'POST', body: JSON.stringify(data) }),
  updatePatient: (id: string, data: any) => api(`/indoor-pharmacy/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Expenses
  // -------------------------------------------------------------------------
  listExpenses: (params?: { from?: string; to?: string; minAmount?: number; search?: string; type?: string; user?: string; page?: number; limit?: number }) =>
    api(withQuery('/indoor-pharmacy/expenses', params)),
  createExpense: (data: any) => api('/indoor-pharmacy/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id: string) => api(`/indoor-pharmacy/expenses/${id}`, { method: 'DELETE' }),
  expensesSummary: (params?: { from?: string; to?: string }) =>
    api(withQuery('/indoor-pharmacy/expenses/summary', params)),

  // -------------------------------------------------------------------------
  // Cash Movements (Pay In/Out)
  // -------------------------------------------------------------------------
  listCashMovements: (params?: { from?: string; to?: string; type?: 'IN' | 'OUT'; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/indoor-pharmacy/cash-movements', params)),
  createCashMovement: (data: { date: string; type: 'IN' | 'OUT'; category?: string; amount: number; receiver?: string; handoverBy?: string; note?: string }) =>
    api('/indoor-pharmacy/cash-movements', { method: 'POST', body: JSON.stringify(data) }),
  deleteCashMovement: (id: string) => api(`/indoor-pharmacy/cash-movements/${id}`, { method: 'DELETE' }),
  cashMovementSummary: (params?: { from?: string; to?: string }) =>
    api(withQuery('/indoor-pharmacy/cash-movements/summary', params)),

  // -------------------------------------------------------------------------
  // Manager Cash Count
  // -------------------------------------------------------------------------
  listCashCounts: (params?: { from?: string; to?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/indoor-pharmacy/cash-counts', params)),
  createCashCount: (data: { date: string; amount: number; receiver?: string; handoverBy?: string; note?: string }) =>
    api('/indoor-pharmacy/cash-counts', { method: 'POST', body: JSON.stringify(data) }),
  deleteCashCount: (id: string) => api(`/indoor-pharmacy/cash-counts/${id}`, { method: 'DELETE' }),
  cashCountSummary: (params?: { from?: string; to?: string; search?: string }) =>
    api(withQuery('/indoor-pharmacy/cash-counts/summary', params)),

  // -------------------------------------------------------------------------
  // Medicines
  // -------------------------------------------------------------------------
  searchMedicines: async (q?: string, limit?: number) => {
    const res: any = await api(withQuery('/indoor-pharmacy/inventory', { search: q, limit: limit || 20 }))
    const items: any[] = res?.items ?? res ?? []
    return { suggestions: items.map((it: any) => ({ id: String(it._id || it.key || it.name || ''), name: String(it.name || '') })) }
  },
  getAllMedicines: async () => {
    const res: any = await api(withQuery('/indoor-pharmacy/inventory', { limit: 2000 }))
    const items: any[] = res?.items ?? res ?? []
    return { medicines: items.map((it: any) => ({ id: String(it._id || it.key || it.name || ''), name: String(it.name || '') })) }
  },
  createMedicine: (data: any) => api('/indoor-pharmacy/medicines', { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Dispensing / POS (for IPD/OPD patients)
  // -------------------------------------------------------------------------
  listDispenses: (params?: { bill?: string; patient?: string; patientId?: string; mrn?: string; source?: 'IPD' | 'OPD' | 'ER'; medicine?: string; user?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/indoor-pharmacy/dispenses', params)),
  createDispense: (data: any) => api('/indoor-pharmacy/dispenses', { method: 'POST', body: JSON.stringify(data) }),
  dispenseSummary: (params?: { source?: 'IPD' | 'OPD' | 'ER'; from?: string; to?: string; payment?: 'Cash' | 'Card' | 'Credit' }) =>
    api(withQuery('/indoor-pharmacy/dispenses/summary', params)),

  // -------------------------------------------------------------------------
  // Hold Dispenses (was Hold Sales)
  // -------------------------------------------------------------------------
  listHoldDispenses: () => api('/indoor-pharmacy/hold-dispenses'),
  getHoldDispense: (id: string) => api(`/indoor-pharmacy/hold-dispenses/${encodeURIComponent(id)}`),
  createHoldDispense: (data: { billDiscountPct?: number; lines: Array<{ medicineId: string; name: string; unitPrice: number; qty: number; discountRs?: number }>; patientId?: string; source?: 'IPD' | 'OPD' | 'ER' }) =>
    api('/indoor-pharmacy/hold-dispenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteHoldDispense: (id: string) => api(`/indoor-pharmacy/hold-dispenses/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Hold Purchase Invoices
  // -------------------------------------------------------------------------
  listHoldPurchaseInvoices: () => api('/indoor-pharmacy/hold-purchase-invoices'),
  getHoldPurchaseInvoice: (id: string) => api(`/indoor-pharmacy/hold-purchase-invoices/${encodeURIComponent(id)}`),
  createHoldPurchaseInvoice: (data: any) => api('/indoor-pharmacy/hold-purchase-invoices', { method: 'POST', body: JSON.stringify(data) }),
  deleteHoldPurchaseInvoice: (id: string) => api(`/indoor-pharmacy/hold-purchase-invoices/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Purchase Orders
  // -------------------------------------------------------------------------
  listPurchaseOrders: (params?: { q?: string; page?: number; limit?: number }) =>
    api(withQuery('/indoor-pharmacy/purchase-orders', params)),
  getPurchaseOrder: (id: string) => api(`/indoor-pharmacy/purchase-orders/${id}`),
  createPurchaseOrder: (data: any) => api('/indoor-pharmacy/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  updatePurchaseOrder: (id: string, data: any) => api(`/indoor-pharmacy/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updatePurchaseOrderStatus: (id: string, status: string) =>
    api(`/indoor-pharmacy/purchase-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deletePurchaseOrder: (id: string) => api(`/indoor-pharmacy/purchase-orders/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Purchases
  // -------------------------------------------------------------------------
  listPurchases: (params?: { from?: string; to?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/indoor-pharmacy/purchases', params)),
  createPurchase: (data: any) => api('/indoor-pharmacy/purchases', { method: 'POST', body: JSON.stringify(data) }),
  deletePurchase: (id: string) => api(`/indoor-pharmacy/purchases/${id}`, { method: 'DELETE' }),
  purchasesSummary: (params?: { from?: string; to?: string }) =>
    api(withQuery('/indoor-pharmacy/purchases/summary', params)),

  // -------------------------------------------------------------------------
  // Returns (Patient returns)
  // -------------------------------------------------------------------------
  listReturns: (params?: { type?: 'Patient' | 'Supplier'; from?: string; to?: string; search?: string; phone?: string; party?: string; reference?: string; page?: number; limit?: number }) =>
    api(withQuery('/indoor-pharmacy/returns', params)),
  createReturn: (data: any) => api('/indoor-pharmacy/returns', { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Inventory (linked to hospital store)
  // -------------------------------------------------------------------------
  listInventory: (params?: { search?: string; page?: number; limit?: number }) =>
    api(withQuery('/indoor-pharmacy/inventory', params)),
  listInventoryFiltered: (params: { status: 'low' | 'out' | 'expiring'; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/indoor-pharmacy/inventory/filter', params)),
  inventorySummary: (params?: { search?: string; limit?: number }) =>
    api(withQuery('/indoor-pharmacy/inventory/summary', params)),
  deleteInventoryItem: (key: string) => api(`/indoor-pharmacy/inventory/${encodeURIComponent(key)}`, { method: 'DELETE' }),
  updateInventoryItem: (key: string, data: any) => api(`/indoor-pharmacy/inventory/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify(data) }),
  manualReceipt: (data: any) => api('/indoor-pharmacy/inventory/manual-receipt', { method: 'POST', body: JSON.stringify(data) }),
  adjustInventory: (data: any) => api('/indoor-pharmacy/inventory/adjust', { method: 'POST', body: JSON.stringify(data) }),

  // Cached inventory methods
  listInventoryCached: (params?: { search?: string; page?: number; limit?: number }, opts?: CachedApiOptions) =>
    cachedApi(withQuery('/indoor-pharmacy/inventory', params), undefined, opts),
  listInventoryFilteredCached: (params: { status: 'low' | 'out' | 'expiring'; search?: string; page?: number; limit?: number }, opts?: CachedApiOptions) =>
    cachedApi(withQuery('/indoor-pharmacy/inventory/filter', params), undefined, opts),
  inventorySummaryCached: (params?: { search?: string; limit?: number }, opts?: CachedApiOptions) =>
    cachedApi(withQuery('/indoor-pharmacy/inventory/summary', params), undefined, opts),
  purchasesSummaryCached: (params?: { from?: string; to?: string }, opts?: CachedApiOptions) =>
    cachedApi(withQuery('/indoor-pharmacy/purchases/summary', params), undefined, opts),
  dispenseSummaryCached: (params?: { source?: 'IPD' | 'OPD' | 'ER'; from?: string; to?: string; payment?: 'Cash' | 'Card' | 'Credit' }, opts?: CachedApiOptions) =>
    cachedApi(withQuery('/indoor-pharmacy/dispenses/summary', params), undefined, opts),
  listDispensesCached: (params?: { bill?: string; patient?: string; patientId?: string; mrn?: string; source?: 'IPD' | 'OPD' | 'ER'; medicine?: string; from?: string; to?: string; page?: number; limit?: number }, opts?: CachedApiOptions) =>
    cachedApi(withQuery('/indoor-pharmacy/dispenses', params), undefined, opts),

  // -------------------------------------------------------------------------
  // Purchase Drafts
  // -------------------------------------------------------------------------
  listPurchaseDrafts: (params?: { from?: string; to?: string; search?: string; limit?: number }) =>
    api(withQuery('/indoor-pharmacy/purchase-drafts', params)),
  listPurchaseDraftLines: (params?: { from?: string; to?: string; search?: string; page?: number; limit?: number }) =>
    api(withQuery('/indoor-pharmacy/purchase-drafts/lines', params)),
  getNextPurchaseInvoiceNumber: () => api('/indoor-pharmacy/purchase-drafts/next-invoice-number'),
  createPurchaseDraft: (data: any) => api('/indoor-pharmacy/purchase-drafts', { method: 'POST', body: JSON.stringify(data) }),
  getPurchaseDraft: (id: string) => api(`/indoor-pharmacy/purchase-drafts/${id}`),
  updatePurchaseDraft: (id: string, data: any) => api(`/indoor-pharmacy/purchase-drafts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  approvePurchaseDraft: (id: string) => api(`/indoor-pharmacy/purchase-drafts/${id}/approve`, { method: 'POST' }),
  deletePurchaseDraft: (id: string) => api(`/indoor-pharmacy/purchase-drafts/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------------------
  getNotifications: (params?: { page?: number; limit?: number; severity?: 'info' | 'warning' | 'critical' | 'success'; read?: boolean }) =>
    api(withQuery('/indoor-pharmacy/notifications', params)),
  markNotificationRead: (id: string) => api(`/indoor-pharmacy/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => api('/indoor-pharmacy/notifications/read-all', { method: 'POST' }),
  deleteNotification: (id: string) => api(`/indoor-pharmacy/notifications/${id}`, { method: 'DELETE' }),
  generateNotifications: () => api('/indoor-pharmacy/notifications/generate', { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------
  listUsers: () => api('/indoor-pharmacy/users'),
  createUser: (data: any) => api('/indoor-pharmacy/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => api(`/indoor-pharmacy/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => api(`/indoor-pharmacy/users/${id}`, { method: 'DELETE' }),
  loginUser: (username: string, password: string) => api('/indoor-pharmacy/users/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logoutUser: (username?: string) => api('/indoor-pharmacy/users/logout', { method: 'POST', body: JSON.stringify({ username }) }),

  // -------------------------------------------------------------------------
  // Sidebar Roles & Permissions
  // -------------------------------------------------------------------------
  listSidebarRoles: () => api('/indoor-pharmacy/sidebar-roles'),
  createSidebarRole: (role: string, permissions?: Array<{ path: string; label: string; visible?: boolean; order?: number }>) =>
    api('/indoor-pharmacy/sidebar-roles', { method: 'POST', body: JSON.stringify({ role, permissions }) }),
  deleteSidebarRole: (role: string) => api(`/indoor-pharmacy/sidebar-roles/${encodeURIComponent(role)}`, { method: 'DELETE' }),
  listSidebarPermissions: (role?: string) =>
    role ? api(`/indoor-pharmacy/sidebar-permissions?role=${encodeURIComponent(role)}`) : api('/indoor-pharmacy/sidebar-permissions'),
  updateSidebarPermissions: (role: string, data: { permissions: Array<{ path: string; label: string; visible: boolean; order: number }> }) =>
    api(`/indoor-pharmacy/sidebar-permissions/${encodeURIComponent(role)}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetSidebarPermissions: (role: string) =>
    api(`/indoor-pharmacy/sidebar-permissions/${encodeURIComponent(role)}/reset`, { method: 'POST' }),

  // -------------------------------------------------------------------------
  // Audit Logs
  // -------------------------------------------------------------------------
  listAuditLogs: (params?: { search?: string; action?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/indoor-pharmacy/audit-logs', params)),
  createAuditLog: (data: any) => api('/indoor-pharmacy/audit-logs', { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Prescriptions (linked to hospital EMR)
  // -------------------------------------------------------------------------
  listPrescriptions: (params?: { patientId?: string; doctorId?: string; status?: 'Pending' | 'Dispensed' | 'Partial'; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/indoor-pharmacy/prescriptions', params)),
  getPrescription: (id: string) => api(`/indoor-pharmacy/prescriptions/${id}`),
  dispensePrescription: (id: string, data: { dispensedItems: Array<{ medicineId: string; qty: number }>; billId?: string }) =>
    api(`/indoor-pharmacy/prescriptions/${id}/dispense`, { method: 'POST', body: JSON.stringify(data) }),

  // -------------------------------------------------------------------------
  // Shifts
  // -------------------------------------------------------------------------
  listShifts: () => api('/indoor-pharmacy/shifts'),
  createShift: (data: any) => api('/indoor-pharmacy/shifts', { method: 'POST', body: JSON.stringify(data) }),
  updateShift: (id: string, data: any) => api(`/indoor-pharmacy/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShift: (id: string) => api(`/indoor-pharmacy/shifts/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Aliases for drop-in compatibility with pharmacy pages
  // -------------------------------------------------------------------------
  // Customers (alias for Patients)
  listCustomers: (params?: { q?: string; page?: number; limit?: number }) =>
    api(withQuery('/indoor-pharmacy/patients', params)),
  getCustomer: (id: string) => api(`/indoor-pharmacy/patients/${id}`),
  createCustomer: (data: any) => api('/indoor-pharmacy/patients', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: any) => api(`/indoor-pharmacy/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: string) => api(`/indoor-pharmacy/patients/${id}`, { method: 'DELETE' }),

  // Sales (alias for Dispenses)
  listSales: (params?: { bill?: string; customer?: string; customerId?: string; phone?: string; payment?: string; medicine?: string; user?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/indoor-pharmacy/dispenses', params)),
  createSale: (data: any) => api('/indoor-pharmacy/dispenses', { method: 'POST', body: JSON.stringify(data) }),
  salesSummary: (params?: { payment?: string; from?: string; to?: string }) =>
    api(withQuery('/indoor-pharmacy/dispenses/summary', params)),

  // Hold Sales (alias for Hold Dispenses)
  listHoldSales: () => api('/indoor-pharmacy/hold-dispenses'),
  getHoldSale: (id: string) => api(`/indoor-pharmacy/hold-dispenses/${encodeURIComponent(id)}`),
  createHoldSale: (data: any) => api('/indoor-pharmacy/hold-dispenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteHoldSale: (id: string) => api(`/indoor-pharmacy/hold-dispenses/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}

export default indoorPharmacyApi
