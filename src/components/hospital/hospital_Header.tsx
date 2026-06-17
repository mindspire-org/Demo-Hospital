import { Link, useNavigate } from 'react-router-dom'
import { Menu, Sun, Moon, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import LiveClock from '../common/LiveClock'

type Props = { onToggleSidebar?: () => void; collapsed?: boolean; onToggleTheme?: () => void; theme?: 'light'|'dark'; variant?: 'default' | 'navy' }

function useUserRole() {
  const [role, setRole] = useState<string>('Admin')
  useEffect(() => {
    try {
      const raw = localStorage.getItem('hospital.session') || localStorage.getItem('user')
      if (raw) {
        const u = JSON.parse(raw)
        if (u?.role) setRole(String(u.role))
      }
    } catch {}
  }, [])
  return role
}

export default function Hospital_Header({ onToggleSidebar, collapsed, onToggleTheme, theme, variant = 'default' }: Props) {
  const navigate = useNavigate()
  const userRole = useUserRole()
  const showThemeToggle = !!onToggleTheme && (theme === 'light' || theme === 'dark')

  function handleLogout(){
    try { localStorage.removeItem('hospital.session'); localStorage.removeItem('hospital.user'); localStorage.removeItem('hospital.token'); localStorage.removeItem('lab.token'); localStorage.removeItem('token') } catch {}
    navigate('/hospital/login')
  }

  function handleToggleTheme(){
    const next = theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem('hospital.theme', next) } catch {}
    try {
      const scope = document.querySelector('.hospital-scope')
      if (scope) scope.classList.toggle('dark', next === 'dark')
    } catch {}
    onToggleTheme?.()
  }

  const isNavy = variant === 'navy'
  const headerCls = 'h-14 w-full'
  const innerCls = isNavy
    ? 'flex h-full w-full items-center gap-3 px-2 sm:px-3 text-white'
    : 'flex h-full items-center gap-3 px-3 sm:px-5'

  const btnCls = isNavy
    ? 'inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10'
    : 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-sm hover:shadow hover:text-slate-800 hover:border-slate-300 transition-all duration-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
  const titleCls = isNavy ? 'font-semibold text-white' : 'font-bold text-slate-800 dark:text-slate-100'
  const subtitleCls = isNavy ? 'text-white/60' : 'text-slate-400 dark:text-slate-500'
  const pillCls = isNavy ? 'ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/90' : 'ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'

  const chipWrapCls = isNavy
    ? 'hidden sm:flex items-center rounded-full border border-white/15 bg-white/5 shadow-sm backdrop-blur overflow-hidden'
    : 'hidden sm:flex items-center rounded-full border border-slate-200/80 bg-white/90 shadow-md shadow-slate-200/50 backdrop-blur overflow-hidden dark:border-slate-700 dark:bg-slate-800/70 dark:shadow-none'
  const chipBtnCls = isNavy
    ? 'inline-flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 transition'
    : 'inline-flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition dark:text-slate-300 dark:hover:bg-slate-700'
  const chipDivCls = isNavy ? 'h-6 w-px bg-white/15' : 'h-6 w-px bg-slate-200 dark:bg-slate-600'
  const chipTextCls = isNavy ? 'px-3 py-2 text-white capitalize' : 'px-3 py-2 text-slate-600 capitalize dark:text-slate-300'
  const chipLogoutCls = isNavy
    ? 'inline-flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 transition'
    : 'inline-flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-400'
  const mobileBtnCls = isNavy
    ? 'inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10 sm:hidden'
    : 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-sm hover:shadow hover:text-slate-800 hover:border-slate-300 transition-all sm:hidden dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

  return (
    <header className={headerCls}>
      <div className={innerCls}>
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={btnCls}
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to="/hospital" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-600 shadow-inner">
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' className='h-5 w-5'><path d='M4.5 12a5.5 5.5 0 0 1 9.9-3.3l.4.5 3 3a5.5 5.5 0 0 1-7.8 7.8l-3-3-.5-.4A5.48 5.48 0 0 1 4.5 12Zm4.9-3.6L7.1 10l6.9 6.9 2.3-2.3-6.9-6.9Z'/></svg>
          </div>
          <div className="flex flex-col leading-tight">
            <div className={titleCls}>Hospital Portal</div>
            <div className={`text-[10px] uppercase tracking-wider ${subtitleCls}`}>Clinical Operations & Administration</div>
          </div>
          <span className={pillCls}>Online</span>
        </Link>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <div className="hidden items-center gap-2 sm:flex">
             <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 border ${isNavy ? 'bg-white/5 border-white/10' : 'bg-white border border-slate-200/80 shadow-sm'}`}>
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className={`h-4 w-4 ${isNavy ? 'text-sky-400' : 'text-sky-500'}`}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <div className="flex flex-col">
                  <span className={`text-[10px] uppercase font-bold ${isNavy ? 'text-white/40' : 'text-slate-400'}`}>Today</span>
                  <span className={`text-xs font-semibold ${isNavy ? '' : 'text-slate-700 dark:text-slate-200'}`}>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
             </div>
             <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 border ${isNavy ? 'bg-white/5 border-white/10' : 'bg-white border border-slate-200/80 shadow-sm'}`}>
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className={`h-4 w-4 ${isNavy ? 'text-emerald-400' : 'text-emerald-500'}`}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <div className="flex flex-col">
                  <span className={`text-[10px] uppercase font-bold ${isNavy ? 'text-white/40' : 'text-slate-400'}`}>Local Time</span>
                  <LiveClock className={`text-xs font-semibold ${isNavy ? '' : 'text-slate-700 dark:text-slate-200'}`} showSeconds={true} showTimezone={false} showDate={false} compact />
                </div>
             </div>
          </div>

          {showThemeToggle ? (
            <button
              type="button"
              onClick={handleToggleTheme}
              className={mobileBtnCls}
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          ) : null}

          <div className={chipWrapCls}>
            {showThemeToggle ? (
              <button
                type="button"
                onClick={handleToggleTheme}
                className={chipBtnCls}
                title="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="text-sm font-medium">Theme</span>
              </button>
            ) : null}

            {showThemeToggle ? <div className={chipDivCls} /> : null}

            <div className={chipTextCls}>
              <span className="text-sm font-medium">{userRole}</span>
            </div>

            <div className={chipDivCls} />

            <button
              type="button"
              onClick={handleLogout}
              className={chipLogoutCls}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className={mobileBtnCls}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
