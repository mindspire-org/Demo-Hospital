// Maps a login/auth error (from the shared api() helper) to a clear, specific,
// user-facing message. Backends should return a `code` to disambiguate
// (USER_NOT_FOUND, INVALID_PASSWORD, ACCOUNT_INACTIVE); we also fall back to
// HTTP status and message heuristics for endpoints not yet updated.

export function loginErrorMessage(err: any): string {
  const code = String(err?.code || '')
  const status = Number(err?.status || 0)
  const raw = String(err?.message || '').toLowerCase()

  // Network / server-reachability problems (set by api() on fetch rejection).
  if (code === 'NETWORK_ERROR' || raw.includes('failed to fetch') || raw.includes('networkerror') || raw.includes('unable to reach')) {
    return 'Cannot connect to the server. Please check your internet/network connection and try again.'
  }

  // Explicit codes from the backend.
  switch (code) {
    case 'USER_NOT_FOUND':   return 'No account found with this username. Please check the username.'
    case 'INVALID_PASSWORD': return 'Incorrect password. Please try again.'
    case 'ACCOUNT_INACTIVE': return 'This account is inactive. Please contact your administrator.'
    case 'SHIFT_NOT_ASSIGNED': return 'No shift is assigned to your account. Please contact your administrator.'
    case 'OUTSIDE_SHIFT':    return 'You can only log in during your assigned shift hours.'
  }

  // Heuristic fallback for endpoints still returning a generic message.
  if (status === 404 || raw.includes('not found') || raw.includes('no account') || raw.includes('no user')) {
    return 'No account found with this username. Please check the username.'
  }
  if (raw.includes('password')) return 'Incorrect password. Please try again.'
  if (raw.includes('inactive') || raw.includes('disabled')) return 'This account is inactive. Please contact your administrator.'
  if (status === 401 || status === 403 || raw.includes('invalid credentials') || raw.includes('unauthorized')) {
    return 'Invalid username or password. Please try again.'
  }
  if (status >= 500) return 'The server encountered an error. Please try again in a moment.'

  return err?.message || 'Login failed. Please try again.'
}
