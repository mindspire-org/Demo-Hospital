import { Navigate } from 'react-router-dom'
import { JSX } from 'react'

function isTokenValid(): boolean {
  try {
    const token = localStorage.getItem('super_admin.token')
    if (!token) return false
    const payload = JSON.parse(atob(token.split('.')[1]))
    const exp = payload?.exp
    if (!exp) return false
    return Date.now() < exp * 1000
  } catch { return false }
}

export default function SuperAdminGuard({ children }: { children: JSX.Element }) {
  if (!isTokenValid()) {
    return <Navigate to="/super-admin/login" replace />
  }
  return children
}
