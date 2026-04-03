import { useEffect, useState } from 'react'
import { Menu, Sun, Moon } from 'lucide-react'

type DoctorSession = { id: string; name: string; username: string }

type Props = { onToggle?: () => void; onToggleTheme?: () => void; theme?: 'light'|'dark'; variant?: 'default' | 'navy' }

export default function Doctor_Header({ onToggle, onToggleTheme, theme, variant = 'default' }: Props) {
  const [doc, setDoc] = useState<DoctorSession | null>(null)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('doctor.session')
      setDoc(raw ? JSON.parse(raw) : null)
    } catch { setDoc(null) }
  }, [])
  const showThemeToggle = !!onToggleTheme && (theme === 'light' || theme === 'dark')

  function handleToggleTheme(){
    const next = theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem('doctor.theme', next) } catch {}
    try { const scope = document.querySelector('.doctor-scope'); if (scope) scope.classList.toggle('dark', next === 'dark') } catch {}
    onToggleTheme?.()
  }

  const isNavy = variant === 'navy'
  const headerCls = isNavy
    ? 'h-14 w-full'
    : 'h-16 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/80'
  const innerCls = isNavy
    ? 'flex h-full w-full items-center justify-between px-2 sm:px-3 text-white'
    : 'flex h-full items-center justify-between px-4 sm:px-6'
  const btnCls = isNavy
    ? 'rounded-md border border-white/15 bg-white/5 p-2 text-white hover:bg-white/10'
    : 'rounded-md border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
  const titleCls = isNavy ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-800 dark:text-slate-200'
  
  const chipWrapCls = isNavy
    ? 'hidden sm:flex items-center rounded-full border border-white/15 bg-white/5 shadow-sm backdrop-blur overflow-hidden'
    : 'hidden sm:flex items-center rounded-full border border-slate-200 bg-white/70 shadow-sm backdrop-blur overflow-hidden dark:border-slate-700 dark:bg-slate-800/50'
  const chipBtnCls = isNavy
    ? 'inline-flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 transition'
    : 'inline-flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 transition dark:text-slate-200 dark:hover:bg-slate-800'
  const chipDivCls = isNavy ? 'h-6 w-px bg-white/15' : 'h-6 w-px bg-slate-200 dark:bg-slate-700'
  const chipTextCls = isNavy ? 'px-3 py-2 text-white capitalize' : 'px-3 py-2 text-slate-700 capitalize dark:text-slate-200'
  const mobileBtnCls = isNavy
    ? 'inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10 sm:hidden'
    : 'inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:hidden'

  return (
    <header className={headerCls}>
      <div className={innerCls}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onToggle} className={btnCls} title="Toggle Sidebar" aria-label="Toggle Sidebar">
            <Menu className="h-4 w-4" />
          </button>
          <div className={titleCls}>Doctor Portal</div>
        </div>

        <div className="flex items-center gap-3">
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
              <span className="text-sm font-medium">{doc?.name || 'Doctor'}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
