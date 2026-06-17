import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, Sun, Moon, LogOut, Calendar, Clock } from 'lucide-react'

type Props = {
  portalName: string
  portalPath: string
  onToggleSidebar: () => void
  onToggleTheme: () => void
  theme: 'light' | 'dark'
  username?: string
  sessionKey: string
  loginPath: string
  children?: React.ReactNode
}

export default function UniversalHeader({
  portalName,
  portalPath,
  onToggleSidebar,
  onToggleTheme,
  theme,
  username,
  sessionKey,
  loginPath,
  children
}: Props) {
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  function handleLogout() {
    try {
      localStorage.removeItem(sessionKey)
      // Also clear tokens if they exist in handleTokenPersistence logic
      const portal = sessionKey.split('.')[0]
      localStorage.removeItem(`${portal}.token`)
    } catch { }
    navigate(loginPath)
  }

  const displayName = username || (()=>{
    try {
      const session = JSON.parse(localStorage.getItem(sessionKey) || '{}')
      return session.username || portalName.toLowerCase()
    } catch { return portalName.toLowerCase() }
  })()

  const formattedDate = currentTime.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to={portalPath} className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-lg shadow-slate-500/20 bg-slate-100 text-slate-600 border border-slate-200`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
              <path d="M4.5 12a5.5 5.5 0 0 1 9.9-3.3l.4.5 3 3a5.5 5.5 0 0 1-7.8 7.8l-3-3-.5-.4A5.48 5.48 0 0 1 4.5 12Zm4.9-3.6L7.1 10l6.9 6.9 2.3-2.3-6.9-6.9Z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">{portalName}</span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Online
              </span>
            </div>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Clinical operations & administration</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {children}
        {/* Date/Time Group */}
        <div className="hidden items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50/50 p-1 dark:border-slate-800 dark:bg-slate-800/50 xl:flex">
          <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-2 shadow-sm dark:bg-slate-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase text-slate-400">Today</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{formattedDate}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-2 shadow-sm dark:bg-slate-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Clock className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase text-slate-400">Local Time</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{formattedTime}</span>
            </div>
          </div>
        </div>

        {/* User/Theme Actions */}
        <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50/50 p-1 dark:border-slate-800 dark:bg-slate-800/50">
          <button
            onClick={onToggleTheme}
            className="flex h-10 items-center gap-2 rounded-xl px-4 text-slate-600 hover:bg-white hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-900 transition-all"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="hidden text-sm font-bold sm:inline">Theme</span>
          </button>
          
          <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-800"></div>
          
          <div className="flex h-10 items-center px-4">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{displayName}</span>
          </div>
          
          <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-800"></div>
          
          <button
            onClick={handleLogout}
            className="flex h-10 items-center gap-2 rounded-xl px-4 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:shadow-sm dark:text-slate-400 dark:hover:bg-rose-900/20 dark:hover:text-rose-400 transition-all"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden text-sm font-bold sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}
