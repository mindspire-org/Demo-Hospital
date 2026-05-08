import { useNavigate } from 'react-router-dom'
import { Activity } from 'lucide-react'
import PortalHeader from '../PortalHeader'
import { hospitalApi } from '../../utils/api'

type Props = { onToggleSidebar?: () => void; collapsed?: boolean; onToggleTheme?: () => void; theme?: 'light'|'dark'; variant?: 'default' | 'navy' }

export default function Hospital_Header({ onToggleSidebar, onToggleTheme, theme }: Props){
  const navigate = useNavigate()
  async function logout(){
    try {
      const raw = localStorage.getItem('hospital.session')
      const u = raw ? JSON.parse(raw) : null
      await hospitalApi.logoutHospitalUser(u?.username || '')
    } catch {}
    try { localStorage.removeItem('hospital.session') } catch {}
    navigate('/hospital/login')
  }
  return (
    <PortalHeader
      brand="Hospital ERP"
      subtitle="Clinical operations & administration"
      logo={<Activity className="h-5 w-5" />}
      to="/hospital"
      onToggleSidebar={onToggleSidebar}
      onToggleTheme={onToggleTheme}
      theme={theme}
      onLogout={logout}
      sessionKey="hospital.session"
    />
  )
}
