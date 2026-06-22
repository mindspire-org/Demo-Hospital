import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'

interface AdminUser {
  id: string
  username: string
  role: string
  scope: string
  portal?: string
}

interface AuthState {
  user: AdminUser | null
  loading: boolean
  checked: boolean
}

export function useAdminAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, checked: false })

  const check = useCallback(async () => {
    const token = localStorage.getItem('super_admin.token')
    if (!token) {
      setState({ user: null, loading: false, checked: true })
      return
    }
    try {
      const data = await api('/admin/me')
      if (data?.authenticated && data?.user) {
        setState({ user: data.user, loading: false, checked: true })
      } else {
        setState({ user: null, loading: false, checked: true })
      }
    } catch {
      setState({ user: null, loading: false, checked: true })
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api('/admin/logout', { method: 'POST' })
    } catch {}
    // Also clear any legacy localStorage token
    try { localStorage.removeItem('super_admin.token') } catch {}
    setState({ user: null, loading: false, checked: true })
    window.location.reload()
  }, [])

  useEffect(() => {
    check()
  }, [check])

  return {
    user: state.user,
    isAdmin: !!state.user,
    loading: state.loading,
    checked: state.checked,
    check,
    logout,
  }
}
