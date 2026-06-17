// Portal switch utilities
export type SwitchTarget = {
  portal: 'hospital' | 'reception' | 'finance' | 'lab' | 'pharmacy' | 'diagnostic' | 'doctor' | 'aesthetic'
  username?: string
  role?: string
}

export function getSwitchTargetsCache(): SwitchTarget[] {
  try {
    const raw = localStorage.getItem('switchTargets')
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function isSwitchMode(): boolean {
  try {
    return localStorage.getItem('switchMode') === '1'
  } catch {
    return false
  }
}

export function setSwitchMode(from: string, to: string) {
  try {
    localStorage.setItem('switchMode', '1')
    localStorage.setItem('switchFrom', from)
    localStorage.setItem('switchTo', to)
  } catch {}
}

export function ensureModuleSessionForPortal(portal: string, user: { username: string; role: string }) {
  try {
    const sessionKey = `${portal}.session`
    localStorage.setItem(sessionKey, JSON.stringify(user))
  } catch {}
}
