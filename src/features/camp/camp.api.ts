import { api, withQuery } from '../../api'

export const campApi = {
  // Auth
  login: async (username: string, password: string) => {
    const r: any = await api('/camp/login', { method: 'POST', body: JSON.stringify({ username, password }) })
    if (r?.token) {
      localStorage.setItem('camp.token', r.token)
      localStorage.setItem('camp.session', JSON.stringify({ username, role: r.user?.role || 'admin', fullName: r.user?.fullName || '' }))
    }
    return r
  },
  logout: async () => {
    try { localStorage.removeItem('camp.token') } catch {}
    try { localStorage.removeItem('camp.session') } catch {}
    return api('/camp/logout', { method: 'POST' })
  },
  me: () => api('/camp/me'),

  // Users
  listUsers: () => api('/camp/users'),
  getUser: (id: string) => api(`/camp/users/${encodeURIComponent(id)}`),
  createUser: (data: any) => api('/camp/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => api(`/camp/users/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => api(`/camp/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Camps
  listCamps: (params?: { status?: string; q?: string }) => api(withQuery('/camp/camps', params)),
  getCamp: (id: string) => api(`/camp/camps/${encodeURIComponent(id)}`),
  createCamp: (data: any) => api('/camp/camps', { method: 'POST', body: JSON.stringify(data) }),
  updateCamp: (id: string, data: any) => api(`/camp/camps/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCamp: (id: string) => api(`/camp/camps/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getCampStats: (id: string) => api(`/camp/camps/${encodeURIComponent(id)}/stats`),

  // Patients
  listPatients: (params?: { campId?: string; q?: string }) => api(withQuery('/camp/patients', params)),
  getPatient: (id: string) => api(`/camp/patients/${encodeURIComponent(id)}`),
  getPatientByToken: (campId: string, tokenNo: string) => api(`/camp/patients/by-token/${encodeURIComponent(campId)}/${encodeURIComponent(tokenNo)}`),
  createPatient: (data: any) => api('/camp/patients', { method: 'POST', body: JSON.stringify(data) }),
  updatePatient: (id: string, data: any) => api(`/camp/patients/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePatient: (id: string) => api(`/camp/patients/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Sessions
  listSessions: (params?: { campId?: string }) => api(withQuery('/camp/sessions', params)),
  getSession: (id: string) => api(`/camp/sessions/${encodeURIComponent(id)}`),
  createSession: (data: any) => api('/camp/sessions', { method: 'POST', body: JSON.stringify(data) }),
  updateSession: (id: string, data: any) => api(`/camp/sessions/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSession: (id: string) => api(`/camp/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Staff
  listStaff: (params?: { campId?: string; role?: string; active?: boolean; q?: string }) => api(withQuery('/camp/staff', params)),
  getStaff: (id: string) => api(`/camp/staff/${encodeURIComponent(id)}`),
  createStaff: (data: any) => api('/camp/staff', { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: (id: string, data: any) => api(`/camp/staff/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaff: (id: string) => api(`/camp/staff/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Settings
  getSettings: () => api('/camp/settings'),
  updateSettings: (data: any) => api('/camp/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Reports
  getDashboardStats: () => api('/camp/reports/dashboard'),
  getCampReport: (params?: { campId?: string; from?: string; to?: string }) => api(withQuery('/camp/reports/camp', params)),

  // Audit
  listAuditLogs: (params?: { action?: string; actor?: string; from?: string; to?: string }) => api(withQuery('/camp/audit-logs', params)),

  // Sidebar
  listSidebarRoles: () => api('/camp/sidebar-roles'),
  createSidebarRole: (role: string) => api('/camp/sidebar-roles', { method: 'POST', body: JSON.stringify({ role }) }),
  deleteSidebarRole: (role: string) => api(`/camp/sidebar-roles/${encodeURIComponent(role)}`, { method: 'DELETE' }),
  getSidebarPermissions: (role: string) => api(withQuery('/camp/sidebar-permissions', { role })),
  updateSidebarPermissions: (role: string, permissions: any) => api(`/camp/sidebar-permissions/${encodeURIComponent(role)}`, { method: 'PUT', body: JSON.stringify({ permissions }) }),
  resetSidebarPermissions: (role: string) => api(`/camp/sidebar-permissions/${encodeURIComponent(role)}/reset`, { method: 'POST' }),
}
