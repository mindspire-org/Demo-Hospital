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
 * Fallbacks enable cross-module access when logged in from another portal
 */
const TOKEN_KEYS: Record<string, string[]> = {
  '/reception': ['reception.token', 'hospital.token'],
  '/hospital': ['hospital.token', 'reception.token'],
  '/admin': ['hospital.token', 'reception.token'],
  '/finance': ['hospital.token', 'reception.token', 'lab.token', 'aesthetic.token', 'pharmacy.token', 'indoorpharmacy.token', 'dialysis.token', 'diagnostic.token'],
  '/diagnostic': ['diagnostic.token', 'hospital.token', 'reception.token'],
  '/lab': ['lab.token', 'hospital.token', 'reception.token', 'aesthetic.token'],
  '/aesthetic': ['aesthetic.token', 'hospital.token', 'reception.token'],
  '/pharmacy': ['pharmacy.token', 'hospital.token', 'reception.token'],
  '/indoor-pharmacy': ['indoorpharmacy.token', 'hospital.token', 'reception.token'],
  '/dialysis': ['dialysis.token', 'hospital.token', 'reception.token'],
  '/camp': ['camp.token', 'hospital.token', 'reception.token'],
  '/cafeteria': ['cafeteria.token', 'hospital.token', 'reception.token'],
  '/biometric': ['hospital.token', 'reception.token'],
  '/super-admin': ['super_admin.token'],
  '/admin/super': ['super_admin.token'],
}

/**
 * Get the appropriate auth token for a given API path
 * Each portal uses its own specific token key to prevent cross-contamination
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
    // Fallback to generic token key for cross-module access
    const genericToken = localStorage.getItem('token')
    if (genericToken) return genericToken

    // Final fallback: scan ALL portal-specific tokens to ensure cross-module access
    // This guarantees that logging into any module provides auth for all API paths
    const allPortalKeys = [
      'hospital.token', 'lab.token', 'reception.token',
      'diagnostic.token', 'aesthetic.token', 'pharmacy.token',
      'indoorpharmacy.token', 'dialysis.token', 'super_admin.token',
      'cafeteria.token',
    ]
    for (const key of allPortalKeys) {
      const token = localStorage.getItem(key)
      if (token) return token
    }

    return ''
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
  if (token && !headers['Authorization']) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${baseURL}${path}`, { ...init, headers, credentials: 'include' })
  } catch (networkErr) {
    // fetch only rejects on network-level failures (server down, no connection,
    // CORS, DNS). Surface a clear, distinguishable error for callers/login pages.
    const err = new Error('Unable to reach the server. Please check your connection and try again.')
    ;(err as any).code = 'NETWORK_ERROR'
    ;(err as any).cause = networkErr
    throw err
  }

  if (!res.ok) {
    const text = await res.text()
    // Try to parse JSON error response
    try {
      const json = JSON.parse(text)
      // Create error with message, but also attach all fields from response
      const err = new Error(json?.error || json?.message || res.statusText)
      ;(err as any).status = res.status
      // Attach additional fields for billing block errors
      if (json?.code) (err as any).code = json.code
      if (json?.netOutstanding !== undefined) (err as any).netOutstanding = json.netOutstanding
      if (json?.unallocatedAdvance !== undefined) (err as any).unallocatedAdvance = json.unallocatedAdvance
      if (json?.grandTotal !== undefined) (err as any).grandTotal = json.grandTotal
      throw err
    } catch (parseError) {
      // If not JSON or parsing failed, use raw text
      if (parseError instanceof SyntaxError) {
        const err = new Error(text || res.statusText)
        ;(err as any).status = res.status
        throw err
      }
      throw parseError
    }
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
      // Hospital pages use Lab APIs for patient data — also persist as lab.token
      setToken('lab', data.token)
    }
    if (path.startsWith('/hospital') && /\/users\/logout$/.test(path)) {
      removeToken('hospital')
      removeToken('lab')
    }

    // Indoor Pharmacy login/logout
    if (path.startsWith('/indoor-pharmacy') && /\/users\/login$/.test(path) && data?.token) {
      setToken('indoorpharmacy', data.token)
    }
    if (path.startsWith('/indoor-pharmacy') && /\/users\/logout$/.test(path)) {
      removeToken('indoorpharmacy')
    }

    // Outdoor Pharmacy login/logout
    if (path.startsWith('/pharmacy') && /\/users\/login$/.test(path) && data?.token) {
      setToken('pharmacy', data.token)
    }
    if (path.startsWith('/pharmacy') && /\/users\/logout$/.test(path)) {
      removeToken('pharmacy')
    }

    // Lab login/logout
    if (path.startsWith('/lab') && (/\/users\/login$/.test(path) || /\/login$/.test(path)) && data?.token) {
      setToken('lab', data.token)
    }
    if (path.startsWith('/lab') && (/\/users\/logout$/.test(path) || /\/logout$/.test(path))) {
      removeToken('lab')
    }

    // Aesthetic login/logout
    if (path.startsWith('/aesthetic') && /\/users\/login$/.test(path) && data?.token) {
      setToken('aesthetic', data.token)
    }
    if (path.startsWith('/aesthetic') && /\/users\/logout$/.test(path)) {
      removeToken('aesthetic')
    }

    // Dialysis login/logout
    if (path.startsWith('/dialysis') && /\/users\/login$/.test(path) && data?.token) {
      setToken('dialysis', data.token)
    }
    if (path.startsWith('/dialysis') && /\/users\/logout$/.test(path)) {
      removeToken('dialysis')
    }

    // Super admin login/logout
    if (path.startsWith('/admin/super') && /\/login$/.test(path) && data?.token) {
      setToken('super_admin', data.token)
    }
    if (path.startsWith('/admin/super') && /\/logout$/.test(path)) {
      removeToken('super_admin')
    }

    // Cafeteria login/logout
    if (path.startsWith('/cafeteria') && /\/users\/login$/.test(path) && data?.token) {
      setToken('cafeteria', data.token)
    }
    if (path.startsWith('/cafeteria') && /\/users\/logout$/.test(path)) {
      removeToken('cafeteria')
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
