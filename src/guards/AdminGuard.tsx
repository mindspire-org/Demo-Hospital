import { Navigate } from 'react-router-dom'
import type { JSX } from 'react'
import { useAdminAuth } from '../hooks/useAdminAuth'

export default function AdminGuard({ children }: { children: JSX.Element }) {
  const { isAdmin, loading, checked } = useAdminAuth()

  if (loading || !checked) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}
