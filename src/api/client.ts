/**
 * Core API Client
 * 
 * Handles:
 * - Base URL configuration (web, Electron, file protocol)
 * - Multi-tenant token management
 * - HTTP fetch wrapper with auth headers
 * - Response parsing (JSON/text)
 * - Auto-persist tokens on login/logout
 * - In-memory caching for GET requests
 */

// ============================================================================
// BASE URL CONFIGURATION
// ============================================================================

const rawBase = (import.meta as any).env?.VITE_API_URL as string | undefined

const isElectronOrFile = (() => {
  try {
    if (typeof window === 'undefined') return true
    if (window.location?.protocol === 'file:') return true
    return /Electron/i.test(navigator.userAgent || '')
  } catch {
    return true
  }
})()

export const baseURL = rawBase
  ? (
    /^https?:/i.test(rawBase)
      ? rawBase
      : (isElectronOrFile ? `http://127.0.0.1:4000${rawBase}` : rawBase)
  )
  : (isElectronOrFile ? 'http://127.0.0.1:4000/api' : '/api')

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Token key mapping for multi-tenant/multi-portal support
 * Each portal (reception, hospital, lab, etc.) has its own token
 */
const TOKEN_KEYS: Record<string, string[]> = {
  '/reception': ['reception.token', 'token'],
  '/hospital': ['hospital.token', 'token'],
  '/diagnostic': ['diagnostic.token', 'token'],
  '/lab': ['lab.token', 'hospital.token', 'reception.token', 'aesthetic.token', 'token'],
  '/aesthetic': ['aesthetic.token', 'token'],
  '/pharmacy': ['pharmacy.token', 'token'],
  '/indoor-pharmacy': ['indoorpharmacy.token', 'token'],
  '/dialysis': ['dialysis.token', 'token'],
}

/**
 * Get the appropriate auth token for a given API path
 * Falls back to legacy 'token' key if no specific portal token found
 */
export function getToken(path?: string): string {
  try {
    if (path) {
      for (const [prefix, keys] of Object.entries(TOKEN_KEYS)) {
        if (path.startsWith(prefix)) {
          for (const key of keys) {
            const token = localStorage.getItem(key)
            if (token) return token
          }
        }
      }
    }
    return localStorage.getItem('token') || ''
  } catch {
    return ''
  }
}

/**
 * Set token for a specific portal
 */
export function setToken(portal: string, token: string): void {
  try {
    localStorage.setItem(`${portal}.token`, token)
    localStorage.setItem('token', token) // Keep legacy key in sync
  } catch { }
}

/**
 * Remove token for a specific portal
 */
export function removeToken(portal: string): void {
  try {
    localStorage.removeItem(`${portal}.token`)
  } catch { }
}

// ============================================================================
// CORE API FUNCTION
// ============================================================================

/**
 * Core fetch wrapper with:
 * - Automatic Bearer token injection
 * - JSON content-type handling
 * - Error handling with response text
 * - Auto-persist tokens on login/logout
 */
export async function api(path: string, init?: RequestInit): Promise<any> {
  const token = getToken(path)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as any || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${baseURL}${path}`, { ...init, headers })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }

  const contentType = res.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const data = await res.json()
    // Auto-persist tokens on login, clear on logout
    handleTokenPersistence(path, data)
    return data
  }

  return res.text()
}

/**
 * Handle automatic token persistence for login/logout flows
 */
function handleTokenPersistence(path: string, data: any): void {
  try {
    // Reception login/logout
    if (path.startsWith('/reception') && /\/login$/.test(path) && data?.token) {
      setToken('reception', data.token)
    }
    if (path.startsWith('/reception') && /\/logout$/.test(path)) {
      removeToken('reception')
    }

    // Hospital login/logout
    if (path.startsWith('/hospital') && /\/users\/login$/.test(path) && data?.token) {
      setToken('hospital', data.token)
    }
    if (path.startsWith('/hospital') && /\/users\/logout$/.test(path)) {
      removeToken('hospital')
    }

    // Indoor Pharmacy login/logout
    if (path.startsWith('/indoor-pharmacy') && /\/users\/login$/.test(path) && data?.token) {
      setToken('indoorpharmacy', data.token)
    }
    if (path.startsWith('/indoor-pharmacy') && /\/users\/logout$/.test(path)) {
      removeToken('indoorpharmacy')
    }
  } catch { }
}

// ============================================================================
// CACHING
// ============================================================================

type CacheEntry = { at: number; data: any }
const __apiCache: Map<string, CacheEntry> = new Map()

export interface CachedApiOptions {
  ttlMs?: number
  cacheKey?: string
  forceRefresh?: boolean
}

/**
 * Cached version of api() for GET requests
 * Non-GET requests bypass cache entirely
 */
export async function cachedApi(
  path: string,
  init?: RequestInit,
  opts?: CachedApiOptions
): Promise<any> {
  const method = (init?.method || 'GET').toUpperCase()
  const isGet = method === 'GET'
  const ttl = Math.max(0, opts?.ttlMs ?? 60_000)
  const token = getToken(path)
  const key = opts?.cacheKey || `${token || ''}::${path}`

  // Non-GET requests always bypass cache
  if (!isGet) {
    return api(path, init)
  }

  // Check cache for GET requests
  if (!opts?.forceRefresh && ttl > 0) {
    const hit = __apiCache.get(key)
    if (hit && (Date.now() - hit.at) < ttl) {
      return hit.data
    }
  }

  // Fetch and cache
  const data = await api(path, init)
  if (ttl > 0) __apiCache.set(key, { at: Date.now(), data })
  return data
}

/**
 * Clear the entire API cache
 */
export function clearApiCache(): void {
  __apiCache.clear()
}

/**
 * Clear a specific cache entry by key
 */
export function invalidateCache(cacheKey: string): void {
  __apiCache.delete(cacheKey)
}
