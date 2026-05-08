/**
 * Simple in-memory cache for API responses
 * Prevents redundant API calls when navigating/paginating
 */

type CacheEntry<T> = {
  data: T
  timestamp: number
  expiresAt: number
}

type CacheKey = string

// In-memory cache store
const cache = new Map<CacheKey, CacheEntry<any>>()

// Default TTL: 30 seconds for list data, can be overridden
const DEFAULT_TTL_MS = 30 * 1000

/**
 * Generate a cache key from endpoint and params
 */
export function createCacheKey(endpoint: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) return endpoint
  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&')
  return `${endpoint}?${sortedParams}`
}

/**
 * Get cached data if valid (not expired)
 */
export function getCache<T>(key: CacheKey): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  
  const now = Date.now()
  if (now > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  
  return entry.data as T
}

/**
 * Set cache with optional TTL
 */
export function setCache<T>(key: CacheKey, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  const now = Date.now()
  cache.set(key, {
    data,
    timestamp: now,
    expiresAt: now + ttlMs,
  })
}

/**
 * Invalidate cache entries matching a pattern (prefix match)
 */
export function invalidateCache(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      cache.delete(key)
    }
  }
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  cache.clear()
}

/**
 * Get cached data or fetch and cache
 * Useful wrapper for API calls
 */
export async function fetchWithCache<T>(
  key: CacheKey,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
  forceRefresh: boolean = false
): Promise<T> {
  // Return cached if valid and not forcing refresh
  if (!forceRefresh) {
    const cached = getCache<T>(key)
    if (cached !== null) {
      return cached
    }
  }
  
  // Fetch fresh data
  const data = await fetcher()
  
  // Cache the result
  setCache(key, data, ttlMs)
  
  return data
}

/**
 * Hook-like utility for components to track cache state
 * Returns a stable reference that can be used in useEffect dependencies
 */
export function createCacheKeyForTokens(params: {
  date?: string
  departmentId?: string
  doctorId?: string
  page?: number
  limit?: number
}): string {
  return createCacheKey('/hospital/tokens', params)
}

export function createCacheKeyForPatients(params: {
  q?: string
  page?: number
  limit?: number
}): string {
  return createCacheKey('/lab/patients', params)
}
