import { api, withQuery } from '../../api'

export const cafeteriaApi = {
  // Auth
  login: async (username: string, password: string) => {
    const r: any = await api('/cafeteria/users/login', { method: 'POST', body: JSON.stringify({ username, password }) })
    if (r?.token) {
      localStorage.setItem('cafeteria.token', r.token)
      localStorage.setItem('cafeteria.session', JSON.stringify({ username, role: r.user?.role || 'admin' }))
    }
    return r
  },
  loginUser: (username: string, password: string) => api('/cafeteria/users/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: async () => {
    try { localStorage.removeItem('cafeteria.token') } catch {}
    try { localStorage.removeItem('cafeteria.session') } catch {}
    return api('/cafeteria/users/logout', { method: 'POST' })
  },

  // Menu Items
  listMenuItems: (params?: { q?: string; category?: string; page?: number; limit?: number }) =>
    api(withQuery('/cafeteria/menu-items', params)),
  createMenuItem: (data: any) => api('/cafeteria/menu-items', { method: 'POST', body: JSON.stringify(data) }),
  updateMenuItem: (id: string, data: any) => api(`/cafeteria/menu-items/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMenuItem: (id: string) => api(`/cafeteria/menu-items/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  adjustStock: (id: string, data: { adjustment: number; reason?: string }) =>
    api(`/cafeteria/menu-items/${encodeURIComponent(id)}/adjust-stock`, { method: 'POST', body: JSON.stringify(data) }),
  listLowStock: () => api('/cafeteria/menu-items/low-stock'),

  // Sales
  listSales: (params?: { from?: string; to?: string; page?: number; limit?: number }) =>
    api(withQuery('/cafeteria/sales', params)),
  createSale: (data: any) => api('/cafeteria/sales', { method: 'POST', body: JSON.stringify(data) }),
  getSale: (id: string) => api(`/cafeteria/sales/${encodeURIComponent(id)}`),
  salesSummary: (params?: { from?: string; to?: string }) =>
    api(withQuery('/cafeteria/sales/summary', params)),

  // Deals
  listDeals: (params?: { q?: string; active?: string }) =>
    api(withQuery('/cafeteria/deals', params)),
  createDeal: (data: any) => api('/cafeteria/deals', { method: 'POST', body: JSON.stringify(data) }),
  getDeal: (id: string) => api(`/cafeteria/deals/${encodeURIComponent(id)}`),
  updateDeal: (id: string, data: any) => api(`/cafeteria/deals/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDeal: (id: string) => api(`/cafeteria/deals/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Daily Shifts
  getTodayShift: () => api('/cafeteria/shifts/today'),
  openShift: (data: { openingCash: number; notes?: string }) =>
    api('/cafeteria/shifts/open', { method: 'POST', body: JSON.stringify(data) }),
  closeShift: (data: { closingCash: number; notes?: string }) =>
    api('/cafeteria/shifts/close', { method: 'PUT', body: JSON.stringify(data) }),
  listShifts: (params?: { from?: string; to?: string; limit?: number }) =>
    api(withQuery('/cafeteria/shifts', params)),
  getShift: (id: string) => api(`/cafeteria/shifts/${encodeURIComponent(id)}`),

  // Audit Logs
  listAuditLogs: (params?: { page?: number; limit?: number }) =>
    api(withQuery('/cafeteria/audit', params)),

  // Settings
  getSettings: () => api('/cafeteria/settings'),
  updateSettings: (data: any) => api('/cafeteria/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Sidebar Permissions
  getSidebarPermissions: (role?: string) => api(withQuery('/cafeteria/sidebar-permissions', role ? { role } : undefined)),
  updateSidebarPermissions: (data: any) => api('/cafeteria/sidebar-permissions', { method: 'PUT', body: JSON.stringify(data) }),

  // Users
  listUsers: () => api('/cafeteria/users'),
  createUser: (data: any) => api('/cafeteria/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => api(`/cafeteria/users/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => api(`/cafeteria/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}

export default cafeteriaApi
