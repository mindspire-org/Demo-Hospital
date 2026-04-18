/**
 * API Module - Core Infrastructure
 * 
 * Re-exports all API client utilities for use across the application
 */

export {
  baseURL,
  getToken,
  setToken,
  removeToken,
  api,
  cachedApi,
  clearApiCache,
  invalidateCache,
  type CachedApiOptions,
} from './client'

export {
  buildQuery,
  withQuery,
  encodePathSegment,
  buildUrl,
  jsonBody,
  request,
} from './utils'
