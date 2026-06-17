import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, Sun, Moon, LogOut } from 'lucide-react'
import LiveClock from '../common/LiveClock'

type DoctorSession = { id: string; name: string; username: string }

type Props = { onToggle?: () => void; onToggleTheme?: () => void; theme?: 'light'|'dark'; variant?: 'default' | 'navy' | 'light' }

export default function Doctor_Header({ onToggle, onToggleTheme, theme, variant = 'default' }: Props) {
  const navigate = useNavigate()
  const [doc, setDoc] = useState<DoctorSession | null>(null)
  
  useEffect(() => {
    try {
      const raw = localStorage.getItem('doctor.session')
      setDoc(raw ? JSON.parse(raw) : null)
    } catch { setDoc(null) }
  }, [])

  function handleLogout(){
    try { localStorage.removeItem('doctor.session'); localStorage.removeItem('doctor.user') } catch {}
    navigate('/doctor/login')
  }

  const showThemeToggle = !!onToggleTheme && (theme === 'light' || theme === 'dark')

  function handleToggleTheme(){
    const next = theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem('doctor.theme', next) } catch {}
    try { const scope = document.querySelector('.doctor-scope'); if (scope) scope.classList.toggle('dark', next === 'dark') } catch {}
    onToggleTheme?.()
  }

  const isNavy = variant === 'navy'
  const isLight = variant === 'light'
  const headerCls = isNavy
    ? 'h-14 w-full'
    : 'h-14 w-full'
  const innerCls = isNavy
    ? 'flex h-full w-full items-center justify-between px-2 sm:px-3 text-white'
    : 'flex h-full w-full items-center justify-between px-2 sm:px-3'
  const btnCls = isNavy
    ? 'rounded-md border border-white/15 bg-white/5 p-2 text-white hover:bg-white/10'
    : 'rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-100'
  const titleCls = isNavy ? 'font-semibold text-white' : 'font-semibold text-slate-800'
  const pillCls = isNavy
    ? 'ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/90'
    : 'ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700'
  
  const chipWrapCls = isNavy
    ? 'hidden sm:flex items-center rounded-full border border-white/15 bg-white/5 shadow-sm backdrop-blur overflow-hidden'
    : 'hidden sm:flex items-center rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden'
  const chipBtnCls = isNavy
    ? 'inline-flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 transition'
    : 'inline-flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50 transition'
  const chipDivCls = isNavy ? 'h-6 w-px bg-white/15' : 'h-6 w-px bg-slate-200'
  const chipTextCls = isNavy ? 'px-3 py-2 text-white capitalize' : 'px-3 py-2 text-slate-700 capitalize'
  const chipLogoutCls = isNavy
    ? 'inline-flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 transition'
    : 'inline-flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition'
  const mobileBtnCls = isNavy
    ? 'inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10 sm:hidden'
    : 'inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 sm:hidden'
  void isLight

  return (
    <header className={headerCls}>
      <div className={innerCls}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onToggle} className={btnCls} title="Toggle Sidebar" aria-label="Toggle Sidebar">
            <Menu className="h-4 w-4" />
          </button>
          <Link to="/doctor" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-inner">
              <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' className='h-5 w-5'><path d='M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-7 15h-2v-2h2v2Zm0-4h-2V6h2v8Z'/></svg>
            </div>
            <div className="flex flex-col leading-tight">
              <div className={titleCls}>Doctor Portal</div>
              <div className={isNavy ? 'text-[10px] uppercase tracking-wider text-white/60' : 'text-[10px] uppercase tracking-wider text-slate-400'}>Clinical Care & Patient Management</div>
            </div>
            <span className={pillCls}>Online</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex text-sm">
             <div className={isNavy ? 'flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 border border-white/10' : 'flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 border border-slate-200'}>
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className={isNavy ? 'h-4 w-4 text-sky-400' : 'h-4 w-4 text-sky-500'}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <div className="flex flex-col">
                  <span className={isNavy ? 'text-[10px] uppercase text-white/40 font-bold' : 'text-[10px] uppercase text-slate-400 font-bold'}>Today</span>
                  <span className={isNavy ? 'text-xs font-semibold' : 'text-xs font-semibold text-slate-700'}>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
             </div>
             <div className={isNavy ? 'flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 border border-white/10' : 'flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 border border-slate-200'}>
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className={isNavy ? 'h-4 w-4 text-emerald-400' : 'h-4 w-4 text-emerald-500'}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <div className="flex flex-col">
                  <span className={isNavy ? 'text-[10px] uppercase text-white/40 font-bold' : 'text-[10px] uppercase text-slate-400 font-bold'}>Local Time</span>
                  <LiveClock className={isNavy ? 'text-xs font-semibold' : 'text-xs font-semibold text-slate-700'} showSeconds={true} showTimezone={false} showDate={false} compact />
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
              <span className="text-sm font-medium">{doc?.name || 'Doctor'}</span>
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
