import { useEffect, useState, useMemo } from 'react'
import { labApi } from '@/features/lab'

export type LabSession = {
  username: string
  role: string
  isAdmin: boolean
  isMainLab: boolean
  collectionCenterId: string
  permissions: string[]
  loading: boolean
}

function readLocalSession(): { username: string; role: string } {
  try {
    const raw = localStorage.getItem('lab.session')
    if (raw) {
      const u = JSON.parse(raw)
      return { username: String(u.username || u.name || ''), role: String(u.role || 'Lab') }
    }
  } catch {}
  return { username: '', role: 'Lab' }
}

/**
 * Shared hook for Lab RBAC.
 *
 * 1. Reads `lab.session` from localStorage for immediate UI rendering.
 * 2. Calls backend `GET /lab/sidebar-permissions?role=...` to get authoritative permissions.
 * 3. Derives isAdmin / isMainLab / collectionCenterId for role-based UI logic.
 */
export function useLabSession(): LabSession {
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const local = useMemo(readLocalSession, [])
  const role = local.role.toLowerCase()
  const isAdmin = role === 'admin'
  const isMainLab = role === 'admin' || !local.role.toLowerCase().includes('collection')

  // Derive collectionCenterId from session if present
  const collectionCenterId = useMemo(() => {
    try {
      const raw = localStorage.getItem('lab.session')
      if (raw) {
        const u = JSON.parse(raw)
        return String(u.collectionCenterId || u.centerId || '')
      }
    } catch {}
    return ''
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res: any = await labApi.listSidebarPermissions(local.role)
        if (!mounted) return
        const perms: string[] = Array.isArray(res?.permissions)
          ? res.permissions.map((p: any) => String(p.path || p.label || ''))
          : Array.isArray(res)
            ? res.map((p: any) => String(p.path || p.label || ''))
            : []
        setPermissions(perms)
      } catch {
        // Backend unreachable — keep local-only session
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [local.role])

  return {
    username: local.username,
    role: local.role,
    isAdmin,
    isMainLab,
    collectionCenterId,
    permissions,
    loading,
  }
}
