import { api } from '../../api'

const PATH = '/admin/super'

function getSuperToken(): string {
  try { return localStorage.getItem('super_admin.token') || '' } catch { return '' }
}

function superHeaders(masterKey?: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getSuperToken()
  if (token) h['Authorization'] = `Bearer ${token}`
  if (masterKey) h['X-Master-Key'] = masterKey
  return h
}

export const superAdminApi = {
  login: async (payload: { username?: string; password?: string; masterKey?: string }) =>
    api(`${PATH}/login`, {
      method: 'POST',
      headers: superHeaders(payload.masterKey),
      body: JSON.stringify(payload),
    }),

  setup: async (payload: any) =>
    api(`${PATH}/setup`, {
      method: 'POST',
      headers: superHeaders(payload.masterKey),
      body: JSON.stringify(payload),
    }),

  getPublicConfig: async () =>
    api(`${PATH}/public-config`, { method: 'GET' }),

  getSystemConfig: async () =>
    api(`${PATH}/config`, { method: 'GET', headers: superHeaders() }),

  updateSystemConfig: async (payload: any) =>
    api(`${PATH}/config`, {
      method: 'PUT',
      headers: superHeaders(),
      body: JSON.stringify(payload),
    }),

  getClientProfile: async () =>
    api(`${PATH}/client`, { method: 'GET', headers: superHeaders() }),

  updateClientProfile: async (payload: any) =>
    api(`${PATH}/client`, {
      method: 'PUT',
      headers: superHeaders(),
      body: JSON.stringify(payload),
    }),

  getModuleRoles: async (module: string) =>
    api(`${PATH}/roles/${encodeURIComponent(module)}`, { method: 'GET', headers: superHeaders() }),

  createSuperAdmin: async (payload: any, masterKey: string) =>
    api(`${PATH}/admins`, {
      method: 'POST',
      headers: superHeaders(masterKey),
      body: JSON.stringify(payload),
    }),

  listSuperAdmins: async () =>
    api(`${PATH}/admins`, { method: 'GET', headers: superHeaders() }),

  deleteSuperAdmin: async (id: string) =>
    api(`${PATH}/admins/${encodeURIComponent(id)}`, { method: 'DELETE', headers: superHeaders() }),

  getUsageStats: async () =>
    api(`${PATH}/usage`, { method: 'GET', headers: superHeaders() }),
}

export default superAdminApi
