import { Link, useNavigate } from 'react-router-dom'
import { Menu, Sun, Moon, LogOut } from 'lucide-react'
import LiveClock from '../common/LiveClock'

type Props = { onToggleSidebar?: () => void; onToggleTheme?: () => void; theme?: 'light'|'dark'; variant?: 'default' | 'navy' }

export default function Finance_Header({ onToggleSidebar, onToggleTheme, theme, variant = 'default' }: Props) {
  const navigate = useNavigate()
  const showThemeToggle = !!onToggleTheme && (theme === 'light' || theme === 'dark')

  function handleLogout(){
    try { localStorage.removeItem('finance.session') } catch {}
    navigate('/finance/login')
  }
  const user = (()=>{ try { return JSON.parse(localStorage.getItem('finance.session')||'{}') } catch { return {} } })()
  function handleToggleTheme(){
    const next = theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem('finance.theme', next) } catch {}
    try {
      const scope = document.querySelector('.finance-scope') || document.body
      scope.classList.add('finance-scope')
      scope.classList.toggle('dark', next === 'dark')
    } catch {}
    onToggleTheme?.()
  }

  const isNavy = variant === 'navy'
  const headerCls = isNavy
    ? 'h-full w-full bg-transparent'
    : 'h-full w-full bg-transparent'
  const innerCls = isNavy
    ? 'flex h-full w-full items-center gap-3 px-2 sm:px-3 text-white'
    : 'flex h-full items-center gap-3 px-4 sm:px-6'

  const btnCls = isNavy
    ? 'inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10'
    : 'inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
  const titleCls = isNavy ? 'font-semibold text-white' : 'font-semibold text-slate-900 dark:text-slate-200'
  const subtitleCls = isNavy ? 'text-white/60' : 'text-slate-400 dark:text-slate-500'
  const pillCls = isNavy ? 'ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/90' : 'ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'

  const chipWrapCls = isNavy
    ? 'hidden sm:flex items-center rounded-full border border-white/15 bg-white/5 shadow-sm backdrop-blur overflow-hidden'
    : 'hidden sm:flex items-center rounded-full border border-slate-200 bg-white/70 shadow-sm backdrop-blur overflow-hidden dark:border-slate-700 dark:bg-slate-800/50'
  const chipBtnCls = isNavy
    ? 'inline-flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 transition'
    : 'inline-flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 transition dark:text-slate-200 dark:hover:bg-slate-800'
  const chipDivCls = isNavy ? 'h-6 w-px bg-white/15' : 'h-6 w-px bg-slate-200 dark:bg-slate-700'
  const chipTextCls = isNavy ? 'px-3 py-2 text-white capitalize' : 'px-3 py-2 text-slate-700 capitalize dark:text-slate-200'
  const chipLogoutCls = isNavy
    ? 'inline-flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 transition'
    : 'inline-flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition dark:text-slate-200 dark:hover:bg-rose-900/30'
  const mobileBtnCls = isNavy
    ? 'inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10 sm:hidden'
    : 'inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:hidden'

  return (
    <header className={headerCls}>
      <div className={innerCls}>
        <button
          type="button"
          onClick={onToggleSidebar}
          className={btnCls}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/finance" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-inner">
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' className='h-5 w-5'><path d='M4 6.75A2.75 2.75 0 0 1 6.75 4h10.5A2.75 2.75 0 0 1 20 6.75v10.5A2.75 2.75 0 0 1 17.25 20H6.75A2.75 2.75 0 0 1 4 17.25V6.75Zm5.25.75a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5h-7Zm-.75 4.5c0-.414.336-.75.75-.75h7a.75.75 0 0 1 0 1.5h-7a.75.75 0 0 1-.75-.75Zm.75 3a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5H9.25Z'/></svg>
          </div>
          <div className="flex flex-col leading-tight">
            <div className={titleCls}>Finance Portal</div>
            <div className={`text-[10px] uppercase tracking-wider ${subtitleCls}`}>Financial Management & Accounts</div>
          </div>
          <span className={pillCls}>Online</span>
        </Link>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <div className="hidden items-center gap-2 sm:flex">
             <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 border border-white/10">
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4 text-sky-400'><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-white/40 font-bold">Today</span>
                  <span className="text-xs font-semibold">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
             </div>
             <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 border border-white/10">
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4 text-emerald-400'><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-white/40 font-bold">Local Time</span>
                  <LiveClock className="text-xs font-semibold" showSeconds={true} showTimezone={false} showDate={false} compact />
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
              <span className="text-sm font-medium">{(user as any)?.username || 'user'}</span>
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
