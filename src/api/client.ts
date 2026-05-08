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
 * - Automatic retry with backoff for network errors (Electron backend startup)
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

/** Detect if current origin can reach /api (Vite proxy or same-origin backend). Fall back to direct backend. */
const isProxied = (() => {
  try {
    // Vite dev server runs on 5173 by default; if we're on a different port without a proxy, /api won't work
    const port = window.location?.port
    if (isElectronOrFile) return true
    // In dev, our Vite server may run on any port (e.g. 8080). Use the /api proxy when dev server is active.
    if ((import.meta as any).env?.DEV) return true
    if (port === '5173') return true  // fallback
    if (port === '4000') return true   // Backend serves frontend directly
    return false // Other ports (8080, 3000, etc.) likely have no proxy
  } catch { return false }
})()

export const baseURL = rawBase
  ? (
    /^https?:/i.test(rawBase)
      ? rawBase
      : (isElectronOrFile ? `http://127.0.0.1:4000${rawBase}` : rawBase)
  )
  : (isElectronOrFile ? 'http://127.0.0.1:4000/api' : isProxied ? '/api' : 'http://127.0.0.1:4000/api')

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Token key mapping for multi-tenant/multi-portal support
 * Each portal (reception, hospital, lab, etc.) has its own token
 */
const TOKEN_KEYS: Record<string, string[]> = {
  '/reception': ['reception.token', 'token'],
  '/hospital': ['hospital.token', 'doctor.token', 'token'],
  '/diagnostic': ['diagnostic.token', 'token'],
  '/lab': ['lab.token', 'hospital.token', 'reception.token', 'token'],
  '/aesthetic': ['aesthetic.token', 'token'],
  '/pharmacy': ['pharmacy.token', 'token'],
  '/indoor-pharmacy': ['indoorpharmacy.token', 'token'],
  '/dialysis': ['dialysis.token', 'token'],
  '/finance': ['finance.token', 'token'],
  '/doctor': ['doctor.token', 'token'],
}

/** Maps API path prefixes to their portal metadata for 401 handling */
const PORTAL_META: Record<string, { tokenKey: string; sessionKey: string; loginRoute: string }> = {
  '/reception':      { tokenKey: 'reception.token',      sessionKey: 'reception.session',      loginRoute: '/reception/login' },
  '/hospital':      { tokenKey: 'hospital.token',      sessionKey: 'hospital.session',      loginRoute: '/hospital/login' },
  '/diagnostic':     { tokenKey: 'diagnostic.token',    sessionKey: 'diagnostic.session',    loginRoute: '/diagnostic/login' },
  '/lab':            { tokenKey: 'lab.token',           sessionKey: 'lab.session',           loginRoute: '/lab/login' },
  '/aesthetic':      { tokenKey: 'aesthetic.token',     sessionKey: 'aesthetic.session',     loginRoute: '/aesthetic/login' },
  '/pharmacy':       { tokenKey: 'pharmacy.token',      sessionKey: 'pharmacy.session',      loginRoute: '/pharmacy/login' },
  '/indoor-pharmacy':{ tokenKey: 'indoorpharmacy.token',sessionKey: 'indoorpharmacy.session',loginRoute: '/indoor-pharmacy/login' },
  '/dialysis':       { tokenKey: 'dialysis.token',      sessionKey: 'dialysis.session',      loginRoute: '/dialysis/login' },
  '/finance':        { tokenKey: 'finance.token',       sessionKey: 'finance.session',       loginRoute: '/finance/login' },
  '/doctor':         { tokenKey: 'doctor.token',        sessionKey: 'doctor.session',        loginRoute: '/doctor/login' },
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

/** Guard: only redirect once per 401 burst — auto-resets after navigation completes */
let __redirecting401 = false

/**
 * Core fetch wrapper with:
 * - Automatic Bearer token injection
 * - JSON content-type handling
 * - Error handling with response text
 * - Auto-persist tokens on login/logout
 * - 401 auto-redirect to portal login
 * - Automatic retry with exponential backoff for network errors
 *   (handles Electron backend startup delay)
 */
export async function api(path: string, init?: RequestInit): Promise<any> {
  const token = getToken(path)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as any || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const maxRetries = isElectronOrFile ? 6 : 1  // In Electron, retry up to 6 times (~15s total)
  const isMutation = (init?.method || 'GET').toUpperCase() !== 'GET'
  let lastError: any = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(`${baseURL}${path}`, { ...init, headers })

      if (!res.ok) {
        // Auto-handle 401: clear token + session, redirect to portal login
        // But skip redirect for auth/login endpoints — a 401 there means "wrong credentials", not "session expired"
        const isAuthEndpoint = /\/(login|logout)$/.test(path)
        if (res.status === 401 && !isAuthEndpoint) {
          if (!__redirecting401) {
            __redirecting401 = true
            // Clear all tokens for the matching portal
            for (const [prefix, meta] of Object.entries(PORTAL_META)) {
              if (path.startsWith(prefix)) {
                try { localStorage.removeItem(meta.tokenKey) } catch {}
                try { localStorage.removeItem(meta.sessionKey) } catch {}
                try { localStorage.removeItem('token') } catch {}
                // In Electron (file: protocol), use hash routing to avoid "Not allowed to load local resource" error
                if (isElectronOrFile) {
                  window.location.replace('#' + meta.loginRoute)
                } else {
                  window.location.replace(meta.loginRoute)
                }
                break
              }
            }
            try { localStorage.removeItem('token') } catch {}
            // Reset guard after navigation completes so future 401s are handled
            setTimeout(() => { __redirecting401 = false }, 2000)
          }
          // Always throw for this request so callers see the error
          const text = await res.text().catch(() => '')
          throw new Error(text || 'Session expired')
        }
        if (res.status === 401 && isAuthEndpoint) {
          const text = await res.text().catch(() => '')
          throw new Error(text || 'Invalid credentials')
        }
        const text = await res.text()
        throw new Error(text || res.statusText)
      }

      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('application/json')) {
        const data = await res.json()
        handleTokenPersistence(path, data)
        return data
      }

      return res.text()
    } catch (err: any) {
      lastError = err
      // Only retry on network-level errors (TypeError from fetch failure), not on HTTP errors (those throw Error with message)
      const isNetworkError = err instanceof TypeError || (err?.name === 'TypeError')
      const shouldRetry = isNetworkError && !isMutation && attempt < maxRetries - 1
      if (!shouldRetry) break
      // Exponential backoff: 500ms, 1s, 2s, 4s, 8s
      const delay = Math.min(500 * Math.pow(2, attempt), 8000)
      await new Promise(r => setTimeout(r, delay))
    }
  }

  // If we exhausted retries, provide a helpful message
  if (lastError instanceof TypeError || lastError?.name === 'TypeError') {
    const hint = isElectronOrFile
      ? 'Backend server is not responding. It may still be starting up — please wait a moment and try again.'
      : 'Network error: unable to reach the server.'
    throw new Error(hint)
  }
  throw lastError
}

/**
 * Handle automatic token persistence for login/logout flows
 */
function handleTokenPersistence(path: string, data: any): void {
  try {
    // Generic handler: iterate PORTAL_META for login/logout persistence
    for (const [prefix, meta] of Object.entries(PORTAL_META)) {
      if (!path.startsWith(prefix)) continue
      // Match both /portal/login and /portal/users/login patterns
      if (/(\/login$|\/users\/login$)/.test(path) && data?.token) {
        setToken(meta.tokenKey.replace(/\.token$/, ''), data.token)
      }
      // Match both /portal/logout and /portal/users/logout patterns
      if (/(\/logout$|\/users\/logout$)/.test(path)) {
        removeToken(meta.tokenKey.replace(/\.token$/, ''))
      }
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
