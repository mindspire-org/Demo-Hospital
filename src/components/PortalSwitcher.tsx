/**
 * PortalSwitcher — admin-only quick portal switcher.
 *
 * Behaviour:
 *   1. Reads every known `<portal>.session` from localStorage and picks the
 *      first one whose `role` is Admin/admin.
 *   2. If found, renders a compact collapsible panel with a portal dropdown
 *      and a "Switch Portal" button. Otherwise renders nothing.
 *   3. On switch, copies the admin session + token into the target portal's
 *      localStorage keys so the admin lands inside the portal already logged in.
 *      No logout required — this is a convenience for admins managing multiple portals.
 *
 * Safe to drop into any portal's sidebar; it self-hides for non-admin users.
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, ChevronDown } from 'lucide-react'

type PortalKey =
  | 'finance' | 'hospital' | 'reception' | 'lab' | 'pharmacy'
  | 'indoorpharmacy' | 'diagnostic' | 'doctor' | 'dialysis' | 'aesthetic'

type Portal = {
  key: PortalKey
  label: string
  route: string
  loginRoute: string
  sessionKey: string
  tokenKey: string
}

/** Every portal that should appear in the switcher, in display order. */
const PORTALS: Portal[] = [
  { key: 'lab',             label: 'Lab',              route: '/lab',              loginRoute: '/lab/login',       sessionKey: 'lab.session',              tokenKey: 'lab.token' },
]

function readJson(key: string): any | null {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null } catch { return null }
}

/** Determine which portal the user is currently in based on the URL path. */
function getCurrentPortal(): Portal | undefined {
  const path = (typeof window !== 'undefined' ? window.location.pathname : '') || ''
  return PORTALS.find(p => path.startsWith(p.route))
}

/**
 * Find an admin session, but ONLY if the current portal's session has admin role.
 * This prevents the switcher from appearing for non-admin users who happen to
 * have an admin session stored in another portal's localStorage key.
 */
function findAdminSession(): { portal: Portal; session: any; token: string | null } | null {
  // Step 1: Verify the CURRENT portal session has admin role
  const currentPortal = getCurrentPortal()
  if (currentPortal) {
    const currentSession = readJson(currentPortal.sessionKey)
    if (!currentSession || String(currentSession.role || '').toLowerCase() !== 'admin') {
      return null // Current user is NOT admin → never show switcher
    }
  } else {
    // Not inside a known portal route — check legacy `user` key
    const u = readJson('user')
    if (!u || String(u.role || '').toLowerCase() !== 'admin') return null
  }

  // Step 2: Current user IS admin — find the admin session data
  for (const p of PORTALS) {
    const s = readJson(p.sessionKey)
    if (s && String(s.role || '').toLowerCase() === 'admin') {
      const token = (() => { try { return localStorage.getItem(p.tokenKey) || localStorage.getItem('token') } catch { return null } })()
      return { portal: p, session: s, token }
    }
  }
  // Legacy fallback: plain `user` key
  const u = readJson('user')
  if (u && String(u.role || '').toLowerCase() === 'admin') {
    const token = (() => { try { return localStorage.getItem('token') } catch { return null } })()
    return { portal: PORTALS[0], session: u, token }
  }
  return null
}

export default function PortalSwitcher({ compact = false }: { compact?: boolean }){
  const navigate = useNavigate()
  const admin = useMemo(() => findAdminSession(), [])
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<PortalKey>(() => {
    const path = (typeof window !== 'undefined' ? window.location.pathname : '') || ''
    const match = PORTALS.find(p => path.startsWith(p.route))
    return match?.key || PORTALS[0].key
  })

  if (!admin) return null

  function switchTo(key: PortalKey){
    const p = PORTALS.find(x => x.key === key)
    if (!p) return
    try {
      // Mirror admin session + token into the target portal's localStorage keys
      if (admin?.session) {
        localStorage.setItem(p.sessionKey, JSON.stringify(admin.session))
      }
      if (admin?.token) {
        localStorage.setItem(p.tokenKey, admin.token)
        localStorage.setItem('token', admin.token)
      }
    } catch {}
    // Navigate directly into the target portal (already logged in as admin)
    navigate(p.route)
  }

  // Collapsed (icon-only) variant for collapsed sidebars
  if (compact){
    return (
      <button
        onClick={() => switchTo(target)}
        title="Switch Portal"
        className="w-full inline-flex items-center justify-center rounded-md p-2 text-sm font-medium text-white"
        style={{ backgroundColor: 'var(--navy)' }}
      >
        <ArrowLeftRight className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:shadow-md hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">
            <ArrowLeftRight className="h-4 w-4" />
          </span>
          <span className="leading-tight">
            <span className="block">Switch Portal</span>
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-300">Admin quick switch</span>
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-md dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Choose portal</div>
          <div className="mb-2 text-[10px] text-slate-500 font-medium">Your admin session will be carried over to the selected portal.</div>
          <select
            value={target}
            onChange={e => setTarget(e.target.value as PortalKey)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900/30"
          >
            {PORTALS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <button
            onClick={() => switchTo(target)}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 to-sky-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md"
          >
            <ArrowLeftRight className="h-4 w-4" />
            Switch Portal
          </button>
        </div>
      )}
    </div>
  )
}
