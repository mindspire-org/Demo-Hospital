/**
 * API Utilities
 * 
 * Helper functions to reduce boilerplate in API modules
 */

/**
 * Build a query string from an object of parameters
 * 
 * @example
 * buildQuery({ q: 'test', page: 1, limit: 20 })
 * // Returns: '?q=test&page=1&limit=20'
 * 
 * buildQuery({ q: 'test' })
 * // Returns: '?q=test'
 * 
 * buildQuery({})
 * // Returns: ''
 */
export function buildQuery(params?: Record<string, any>): string {
  if (!params) return ''

  const qs = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      qs.set(key, String(value))
    }
  }

  const s = qs.toString()
  return s ? `?${s}` : ''
}

/**
 * Build a query string and append to path
 * 
 * @example
 * withQuery('/api/users', { page: 1 })
 * // Returns: '/api/users?page=1'
 */
export function withQuery(path: string, params?: Record<string, any>): string {
  const query = buildQuery(params)
  return `${path}${query}`
}

/**
 * Encode a path segment for URL safety
 * 
 * @example
 * encodePathSegment('test/sample')
 * // Returns: 'test%2Fsample'
 */
export function encodePathSegment(segment: string): string {
  return encodeURIComponent(segment)
}

/**
 * Build a URL with path parameters
 * 
 * @example
 * buildUrl('/api/users', '123', 'profile')
 * // Returns: '/api/users/123/profile'
 */
export function buildUrl(...segments: (string | number)[]): string {
  return segments.map(s => String(s)).join('/')
}

/**
 * Create a JSON body for POST/PUT requests
 */
export function jsonBody(data: any): { body: string } {
  return { body: JSON.stringify(data) }
}

/**
 * Common request options factory
 */
export const request = {
  get: (): RequestInit => ({ method: 'GET' }),
  post: (data?: any): RequestInit => ({ method: 'POST', ...jsonBody(data) }),
  put: (data?: any): RequestInit => ({ method: 'PUT', ...jsonBody(data) }),
  patch: (data?: any): RequestInit => ({ method: 'PATCH', ...jsonBody(data) }),
  delete: (): RequestInit => ({ method: 'DELETE' }),
}
