import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Menu, Bell, Sun, Moon } from 'lucide-react'
import { indoorPharmacyApi } from '../../utils/api'
import { useEffect, useState } from 'react'
import IndoorPharmacy_NotificationPopup from './indoorpharmacy_NotificationPopup'
import LiveClock from '../common/LiveClock'

type Props = { onToggleSidebar?: () => void; onToggleTheme?: () => void; theme?: 'light'|'dark'; variant?: 'default' | 'navy' }

export default function IndoorPharmacy_Header({ onToggleSidebar, onToggleTheme, theme, variant = 'default' }: Props) {
  const navigate = useNavigate()
  const [indoorPharmacyName, setIndoorPharmacyName] = useState('Indoor Pharmacy')
  const [notificationCount, setNotificationCount] = useState(0)
  const [showNotificationPopup, setShowNotificationPopup] = useState(false)
  const [displayName, setDisplayName] = useState<string>('Admin')
  const showThemeToggle = !!onToggleTheme && (theme === 'light' || theme === 'dark')

  useEffect(() => {
    let mounted = true
    indoorPharmacyApi.getSettings().then(s => {
      if (mounted) setIndoorPharmacyName(s.pharmacyName || 'Indoor Pharmacy')
    }).catch(() => {})

    // Load display name from localStorage (indoor pharmacy specific)
    try {
      const raw = localStorage.getItem('indoorpharmacy.user')
      if (raw) {
        const u = JSON.parse(raw)
        setDisplayName(u?.username || u?.name || u?.role || 'Admin')
      }
    } catch {}
    
    // Fetch notification count
    const fetchNotifications = async () => {
      try {
        const res: any = await indoorPharmacyApi.getNotifications()
        if (mounted) setNotificationCount(Number(res?.unreadCount || 0))
      } catch {}
    }
    fetchNotifications()
    
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    
    return () => { 
      mounted = false
      clearInterval(interval)
    }
  }, [])
  
  async function handleLogout(){
    try {
      await indoorPharmacyApi.logoutUser(displayName)
      await indoorPharmacyApi.createAuditLog({
        actor: displayName || 'system',
        action: 'Logout',
        label: 'LOGOUT',
        method: 'POST',
        path: '/indoor-pharmacy/logout',
        at: new Date().toISOString(),
        detail: 'User logout',
      })
    } catch {}
    try { localStorage.removeItem('indoorpharmacy.user'); localStorage.removeItem('indoorpharmacy.token') } catch {}
    navigate('/indoor-pharmacy/login')
  }
  const isNavy = variant === 'navy'
  const headerCls = isNavy
    ? 'h-14 w-full'
    : 'sticky top-0 z-10 h-16 w-full border-b border-slate-200 bg-white/90 backdrop-blur'
  const innerCls = isNavy
    ? 'flex h-full w-full items-center gap-3 px-2 sm:px-3 text-white'
    : 'flex h-full items-center gap-3 px-4 sm:px-6'
  const btnCls = isNavy
    ? 'mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10'
    : 'mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50'
  const pillCls = isNavy ? 'ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/90' : 'ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700'
  
  const iconBtnCls = isNavy
    ? 'relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/90 hover:bg-white/10 transition-all'
    : 'relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-all'
  const chipWrapCls = isNavy
    ? 'hidden sm:flex items-center rounded-full border border-white/15 bg-white/5 shadow-sm backdrop-blur overflow-hidden'
    : 'hidden sm:flex items-center rounded-full border border-slate-200 bg-white/70 shadow-sm backdrop-blur overflow-hidden'
  const chipBtnCls = isNavy
    ? 'inline-flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 transition'
    : 'inline-flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 transition'
  const chipDivCls = isNavy ? 'h-6 w-px bg-white/15' : 'h-6 w-px bg-slate-200'
  const chipTextCls = isNavy ? 'px-3 py-2 text-white capitalize' : 'px-3 py-2 text-slate-700 capitalize dark:text-slate-200'
  const chipLogoutCls = isNavy
    ? 'inline-flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 transition'
    : 'inline-flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition'
  const mobileBtnCls = isNavy
    ? 'inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10 sm:hidden'
    : 'inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 sm:hidden'
  const brandTitleCls = isNavy
    ? 'text-sm font-bold text-white'
    : 'text-sm font-bold bg-linear-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent'

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
        <Link to="/indoor-pharmacy" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-sky-500 to-indigo-600 text-white shadow-lg">
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' className='h-5 w-5'><path d='M4.5 12a5.5 5.5 0 0 1 9.9-3.3l.4.5 3 3a5.5 5.5 0 0 1-7.8 7.8l-3-3-.5-.4A5.48 5.48 0 0 1 4.5 12Zm4.9-3.6L7.1 10l6.9 6.9 2.3-2.3-6.9-6.9Z'/></svg>
          </div>
          <div className="flex flex-col leading-tight">
            <div className={brandTitleCls.replace('HealthSpire', '') + ' ' + (isNavy ? 'text-white' : 'text-slate-900')}>Indoor Pharmacy</div>
            <div className={`text-[10px] uppercase tracking-wider ${isNavy ? 'text-white/60' : 'text-slate-400'}`}>{indoorPharmacyName}</div>
          </div>
          <span className={pillCls}>Online</span>
        </Link>

        <div className="ml-auto flex items-center gap-2 text-sm">
          {/* Notification Bell */}
          <button
            type="button"
            onClick={() => setShowNotificationPopup(!showNotificationPopup)}
            className={iconBtnCls}
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          <div className="hidden items-center gap-2 sm:flex">
             <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 border ${isNavy ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200/80 shadow-sm'}`}>
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className={`h-4 w-4 ${isNavy ? 'text-sky-400' : 'text-sky-500'}`}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <div className="flex flex-col">
                  <span className={`text-[10px] uppercase font-bold ${isNavy ? 'text-white/40' : 'text-slate-400'}`}>Today</span>
                  <span className={`text-xs font-semibold ${isNavy ? '' : 'text-slate-700 dark:text-slate-200'}`}>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
             </div>
             <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 border ${isNavy ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200/80 shadow-sm'}`}>
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
              onClick={() => onToggleTheme?.()}
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
                onClick={() => onToggleTheme?.()}
                className={chipBtnCls}
                title="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="text-sm font-medium">Theme</span>
              </button>
            ) : null}

            {showThemeToggle ? <div className={chipDivCls} /> : null}

            <div className={chipTextCls}>
              <span className="text-sm font-medium">{displayName}</span>
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

      {/* Notification Popup */}
      <IndoorPharmacy_NotificationPopup
        open={showNotificationPopup}
        onClose={() => setShowNotificationPopup(false)}
        onViewAll={() => {
          setShowNotificationPopup(false)
          navigate('/indoor-pharmacy/notifications')
        }}
      />
    </header>
  )
}

