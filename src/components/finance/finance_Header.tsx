import { Link, useNavigate } from 'react-router-dom'
import { Menu, Sun, Moon, LogOut } from 'lucide-react'
import HeaderDateTimeChip from '../HeaderDateTimeChip'

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
    ? 'h-14 w-full'
    : 'sticky top-0 z-10 h-16 w-full border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80'
  const innerCls = isNavy
    ? 'flex h-full w-full items-center gap-3 px-2 sm:px-3 text-white'
    : 'flex h-full items-center gap-3 px-4 sm:px-6'
  const btnCls = isNavy
    ? 'mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10'
    : 'mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
  const titleCls = isNavy ? 'font-semibold text-white' : 'font-semibold text-slate-900 dark:text-slate-200'
  const pillCls = isNavy ? 'ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/90' : 'ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700'
  
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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-sm">
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'>
              <path d='M3 21h18' />
              <path d='M5 21V7l8-4v18' />
              <path d='M19 21V11l-6-4' />
              <path d='M9 9h.01' />
              <path d='M9 13h.01' />
              <path d='M9 17h.01' />
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <div className="flex items-center gap-2">
              <span className={titleCls}>Finance ERP</span>
              <span className={`${pillCls} !bg-emerald-500/15 !text-emerald-500`}>● Online</span>
            </div>
            <span className={isNavy ? 'text-[11px] text-white/70' : 'text-[11px] text-slate-500 dark:text-slate-400'}>Hospital finance control center</span>
          </div>
        </Link>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <HeaderDateTimeChip variant={isNavy ? 'navy' : 'default'} />

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
