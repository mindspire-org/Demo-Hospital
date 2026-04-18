/**
 * Admin API Module
 * 
 * Handles system administration operations:
 * - Database backup/export
 * - Database restore
 * - Database purge
 */

import { api } from '@/api'

export const adminApi = {
  exportAll: async () => api('/admin/backup/export'),

  restoreAll: async (data: any) =>
    api('/admin/backup/restore', {
      method: 'POST',
      body: JSON.stringify({ ...data, confirm: 'RESTORE' }),
    }),

  purgeAll: async () =>
    api('/admin/backup/purge', {
      method: 'POST',
      body: JSON.stringify({ confirm: 'PURGE' }),
    }),
}

export default adminApi
