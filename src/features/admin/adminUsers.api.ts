import { api } from '../../api'

const PATH = '/admin/super'

function getSuperToken(): string {
  try { return localStorage.getItem('super_admin.token') || '' } catch { return '' }
}

function superHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getSuperToken()
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

export const adminUsersApi = {
  listAllUsers: async () =>
    api(`${PATH}/all-users`, { method: 'GET', headers: superHeaders() }),

  createUser: async (payload: {
    portal: string
    username: string
    password: string
    role: string
    fullName?: string
    email?: string
    phone?: string
  }) =>
    api(`${PATH}/all-users`, {
      method: 'POST',
      headers: superHeaders(),
      body: JSON.stringify(payload),
    }),

  updateUser: async (
    portal: string,
    id: string,
    payload: {
      username?: string
      role?: string
      fullName?: string
      email?: string
      phone?: string
      active?: boolean
      password?: string
    }
  ) =>
    api(`${PATH}/all-users/${encodeURIComponent(portal)}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: superHeaders(),
      body: JSON.stringify(payload),
    }),

  deleteUser: async (portal: string, id: string) =>
    api(`${PATH}/all-users/${encodeURIComponent(portal)}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: superHeaders(),
    }),

  resetPassword: async (portal: string, id: string, newPassword?: string) =>
    api(`${PATH}/all-users/${encodeURIComponent(portal)}/${encodeURIComponent(id)}/reset-password`, {
      method: 'POST',
      headers: superHeaders(),
      body: JSON.stringify(newPassword ? { newPassword } : {}),
    }),
}

export default adminUsersApi
