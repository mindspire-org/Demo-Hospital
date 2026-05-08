import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pill, Bell } from 'lucide-react'
import PortalHeader from '../PortalHeader'
import IndoorPharmacy_NotificationPopup from './indoorpharmacy_NotificationPopup'
import { indoorPharmacyApi } from '../../utils/api'

type Props = { onToggleSidebar?: () => void; onToggleTheme?: () => void; theme?: 'light'|'dark'; variant?: 'default' | 'navy' }

export default function IndoorPharmacy_Header({ onToggleSidebar, onToggleTheme, theme }: Props){
  const navigate = useNavigate()
  const [notificationCount, setNotificationCount] = useState(0)
  const [showPopup, setShowPopup] = useState(false)
  const [displayName, setDisplayName] = useState<string>('Admin')

  useEffect(() => {
    let alive = true
    try {
      const raw = localStorage.getItem('indoorpharmacy.session') || localStorage.getItem('user') || localStorage.getItem('indoorpharmacy.user')
      if (raw){ const u = JSON.parse(raw); setDisplayName(u?.username || u?.name || 'User') }
    } catch {}
    const fetchN = async () => {
      try { const r: any = await indoorPharmacyApi.getNotifications(); if (alive) setNotificationCount(Number(r?.unreadCount || 0)) } catch {}
    }
    fetchN()
    const t = setInterval(fetchN, 30000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  async function logout(){
    try { await indoorPharmacyApi.logoutUser(displayName) } catch {}
    try {
      localStorage.removeItem('indoorpharmacy.session'); localStorage.removeItem('user'); localStorage.removeItem('indoorpharmacy.user'); localStorage.removeItem('indoorpharmacy.token')
    } catch {}
    navigate('/indoor-pharmacy/login')
  }

  return (
    <>
      <PortalHeader
        brand="Indoor Pharmacy ERP"
        subtitle="Inpatient pharmacy dispense"
        logo={<Pill className="h-5 w-5" />}
        to="/indoor-pharmacy"
        username={displayName}
        onToggleSidebar={onToggleSidebar}
        onToggleTheme={onToggleTheme}
        theme={theme}
        onLogout={logout}
        rightExtras={(
          <button
            type="button"
            onClick={() => setShowPopup(v => !v)}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>
        )}
      />
      <IndoorPharmacy_NotificationPopup
        open={showPopup}
        onClose={() => setShowPopup(false)}
        onViewAll={() => { setShowPopup(false); navigate('/indoor-pharmacy/notifications') }}
      />
    </>
  )
}
