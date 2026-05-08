/**
 * Admin API Module
 * 
 * Handles system administration operations:
 * - Database backup/export
 * - Database restore
 * - Database purge
 * - Snapshot management
 * - Backup status
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

  getStatus: async () => api('/admin/backup/status') as Promise<any>,

  listSnapshots: async () => api('/admin/backup/snapshots') as Promise<any>,

  createSnapshot: async () =>
    api('/admin/backup/snapshots', { method: 'POST' }) as Promise<any>,

  downloadSnapshot: async (filename: string) =>
    api(`/admin/backup/snapshots/${encodeURIComponent(filename)}`) as Promise<any>,

  restoreSnapshot: async (filename: string) =>
    api(`/admin/backup/snapshots/${encodeURIComponent(filename)}/restore`, {
      method: 'POST',
      body: JSON.stringify({ confirm: 'RESTORE' }),
    }) as Promise<any>,

  deleteSnapshot: async (filename: string) =>
    api(`/admin/backup/snapshots/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    }) as Promise<any>,
}

export default adminApi
