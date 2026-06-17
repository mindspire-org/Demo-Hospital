import { useState, useEffect } from 'react'

export interface LabSession {
  userId: string | null
  username: string | null
  role: string | null
  isAdmin: boolean
  isMainLab: boolean
  isCollector: boolean
  assignedCollectionCenters: string[] // List of center IDs this user can access
}

function decodeJwt(token: string): any {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (e) {
    console.error('Failed to decode JWT manually:', e)
    return null
  }
}

export function useLabSession(): LabSession {
  const [session, setSession] = useState<LabSession>({
    userId: null,
    username: null,
    role: null,
    isAdmin: false,
    isMainLab: true,
    isCollector: false,
    assignedCollectionCenters: [],
  })

  useEffect(() => {
    // 1. Try reading from lab.session JSON
    let sessionUser: any = null
    try {
      const raw = localStorage.getItem('lab.session') || localStorage.getItem('user')
      if (raw) {
        sessionUser = JSON.parse(raw)
      }
    } catch (err) {
      console.error('Failed to parse lab.session from localStorage:', err)
    }

    // 2. Try decoding JWT token for additional/fallback info
    const token = localStorage.getItem('lab.token') || localStorage.getItem('token')
    let decoded: any = null
    if (token) {
      decoded = decodeJwt(token)
    }

    const username = sessionUser?.username || sessionUser?.name || decoded?.username || decoded?.name || null
    const role = sessionUser?.role || decoded?.role || null
    const userId = sessionUser?.id || sessionUser?._id || decoded?.id || null

    const roleLower = String(role || '').toLowerCase()
    const isAdmin = roleLower === 'admin' || roleLower === 'administrator'
    const isCollector = roleLower.includes('collector')
    const isMainLab = !roleLower.includes('outsource') && !roleLower.includes('cc') && !roleLower.includes('collector')

    // Load assigned collection centers
    const assignedCenters = sessionUser?.assignedCollectionCenters 
      || sessionUser?.collectionCenterIds 
      || decoded?.assignedCollectionCenters 
      || decoded?.collectionCenterIds 
      || []
    
    setSession({
      userId,
      username,
      role,
      isAdmin,
      isMainLab,
      isCollector,
      assignedCollectionCenters: Array.isArray(assignedCenters) ? assignedCenters : [],
    })
  }, [])

  return session
}
