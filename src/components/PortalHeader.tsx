/**
 * PortalHeader — the unified light-theme header used by every portal
 * (Hospital, Reception, Lab, Pharmacy, Indoor Pharmacy, Aesthetic,
 * Diagnostic, Dialysis, Doctor, Finance).
 *
 * Mirrors the Finance ERP header exactly:
 *   [☰] [🟦 LOGO] <Brand + ● Online> · <subtitle>   ...   [📅 date / 🕒 time]  [Theme | User | Logout]
 *
 * Each portal passes its own brand/subtitle/icon/route. Optional
 * `rightExtras` slot lets a portal (e.g. Pharmacy) drop in a notification
 * bell before the actions chip.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Menu, Sun, Moon, LogOut } from 'lucide-react'
import HeaderDateTimeChip from './HeaderDateTimeChip'

export type PortalHeaderProps = {
  brand: string
  subtitle?: string
  /** Lucide icon element (or any JSX) rendered inside the logo tile. */
  logo: ReactNode
  /** Route the logo links to (defaults to '#'). */
  to?: string
  username?: string
  /** localStorage key for this portal's session (e.g. 'lab.session'). Used to read the correct username when `username` is not provided. */
  sessionKey?: string
  onToggleSidebar?: () => void
  onToggleTheme?: () => void
  theme?: 'light' | 'dark'
  onLogout?: () => void
  /** Slot rendered between the date chip and the actions pill (e.g. notifications). */
  rightExtras?: ReactNode
}

export default function PortalHeader({
  brand,
  subtitle,
  logo,
  to = '#',
  username,
  sessionKey,
  onToggleSidebar,
  onToggleTheme,
  theme,
  onLogout,
  rightExtras,
}: PortalHeaderProps){
  const showThemeToggle = !!onToggleTheme && (theme === 'light' || theme === 'dark')
  const displayUser = username || (() => {
    // If sessionKey is provided, read from that specific key first.
    if (sessionKey) {
      try { const v = localStorage.getItem(sessionKey); if (v){ const u = JSON.parse(v); if (u?.username) return u.username } } catch {}
    }
    // Fallback: best-effort guess from any portal's session in localStorage.
    const keys = ['finance.session', 'hospital.session', 'reception.session', 'lab.session', 'pharmacy.session', 'indoorpharmacy.session', 'aesthetic.session', 'diagnostic.session', 'dialysis.session', 'doctor.session']
    for (const k of keys){
      try { const v = localStorage.getItem(k); if (v){ const u = JSON.parse(v); if (u?.username) return u.username } } catch {}
    }
    return 'user'
  })()

  return (
    <header className="flex h-14 w-full items-center gap-3 px-4 sm:px-6">
      {/* Sidebar toggle */}
      <button
        type="button"
        onClick={onToggleSidebar}
        className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Brand */}
      <Link to={to} className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-blue-700 text-white shadow-sm">
          {logo}
        </div>
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-slate-200">{brand}</span>
            <span className="ml-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600">● Online</span>
          </div>
          {subtitle && <span className="text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</span>}
        </div>
      </Link>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3 text-sm">
        <HeaderDateTimeChip />

        {rightExtras}

        <div className="hidden sm:flex items-center rounded-full border border-slate-200 bg-white/70 shadow-sm backdrop-blur overflow-hidden dark:border-slate-700 dark:bg-slate-800/50">
          {showThemeToggle ? (
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 transition dark:text-slate-200 dark:hover:bg-slate-800"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="text-sm font-medium">Theme</span>
            </button>
          ) : null}

          {showThemeToggle ? <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" /> : null}

          <div className="px-3 py-2 text-slate-700 capitalize dark:text-slate-200">
            <span className="text-sm font-medium">{displayUser}</span>
          </div>

          {onLogout && (
            <>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition dark:text-slate-200 dark:hover:bg-rose-900/30"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </>
          )}
        </div>

        {/* Mobile logout fallback */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:hidden"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  )
}
