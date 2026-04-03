import { Link } from 'react-router-dom'
import { Menu, Droplets, Sun, Moon } from 'lucide-react'

type Props = { onToggleSidebar?: () => void; collapsed?: boolean; onToggleTheme?: () => void; theme?: 'light'|'dark'; variant?: 'default' | 'teal' }

export default function Dialysis_Header({ onToggleSidebar, collapsed, onToggleTheme, theme, variant = 'default' }: Props) {
  const showThemeToggle = !!onToggleTheme && (theme === 'light' || theme === 'dark')

  function handleToggleTheme(){
    const next = theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem('dialysis.theme', next) } catch {}
    try {
      const scope = document.querySelector('.dialysis-scope')
      if (scope) scope.classList.toggle('dark', next === 'dark')
    } catch {}
    onToggleTheme?.()
  }

  const isTeal = variant === 'teal'
  const headerCls = isTeal
    ? 'h-14 w-full'
    : 'sticky top-0 z-10 h-16 w-full border-b border-slate-200 bg-white/80 backdrop-blur shadow-sm dark:border-slate-700 dark:bg-slate-900/80'
  const innerCls = isTeal
    ? 'flex h-full w-full items-center gap-3 px-2 sm:px-3 text-white'
    : 'flex h-full items-center gap-3 px-4 sm:px-6'

  const btnCls = isTeal
    ? 'inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10'
    : 'inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
  const titleCls = isTeal ? 'font-semibold text-white' : 'font-semibold text-slate-900 dark:text-slate-200'
  const pillCls = isTeal ? 'ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/90' : 'ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700'
  const metaTextCls = isTeal ? 'hidden items-center gap-2 text-white/80 sm:flex' : 'hidden items-center gap-2 text-slate-600 sm:flex dark:text-slate-300'
  
  const chipWrapCls = isTeal
    ? 'hidden sm:flex items-center rounded-full border border-white/15 bg-white/5 shadow-sm backdrop-blur overflow-hidden'
    : 'hidden sm:flex items-center rounded-full border border-slate-200 bg-white/70 shadow-sm backdrop-blur overflow-hidden dark:border-slate-700 dark:bg-slate-800/50'
  const chipBtnCls = isTeal
    ? 'inline-flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 transition'
    : 'inline-flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 transition dark:text-slate-200 dark:hover:bg-slate-800'
  const chipDivCls = isTeal ? 'h-6 w-px bg-white/15' : 'h-6 w-px bg-slate-200 dark:bg-slate-700'
  const chipTextCls = isTeal ? 'px-3 py-2 text-white capitalize' : 'px-3 py-2 text-slate-700 capitalize dark:text-slate-200'
  const mobileBtnCls = isTeal
    ? 'inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10 sm:hidden'
    : 'inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:hidden'

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

        <Link to="/dialysis" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-teal-600 shadow-inner">
            <Droplets className="h-5 w-5" />
          </div>
          <div className={titleCls}>DialysisCare</div>
          <span className={pillCls}>Online</span>
        </Link>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <div className={metaTextCls}>
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' className='h-4 w-4'><path d='M6.75 3A2.75 2.75 0 0 0 4 5.75v12.5A2.75 2.75 0 0 0 6.75 21h10.5A2.75 2.75 0 0 0 20 18.25V5.75A2.75 2.75 0 0 0 17.25 3H6.75Zm0 1.5h10.5c.69 0 1.25.56 1.25 1.25v12.5c0 .69-.56 1.25-1.25 1.25H6.75c-.69 0-1.25-.56-1.25-1.25V5.75c0-.69.56-1.25 1.25-1.25Z'/></svg>
            <span>{new Date().toLocaleDateString()}</span>
            <span className="opacity-60">{new Date().toLocaleTimeString()}</span>
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
              <span className="text-sm font-medium">Admin</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
