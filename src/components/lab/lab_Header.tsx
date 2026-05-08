import { useNavigate } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import PortalHeader from '../PortalHeader'
import { labApi } from '../../utils/api'
import LabNotificationsBell from './LabNotificationsBell'

type Props = { onToggleSidebar?: () => void; onToggleTheme?: () => void; theme?: 'light'|'dark'; variant?: 'default' | 'navy' }

export default function Lab_Header({ onToggleSidebar, onToggleTheme, theme }: Props){
  const navigate = useNavigate()
  async function logout(){
    try { await labApi.logoutUser() } catch {}
    try { localStorage.removeItem('lab.session') } catch {}
    navigate('/lab/login')
  }
  return (
    <PortalHeader
      brand="HealthSpire"
      subtitle="Lab Management System"
      logo={<FlaskConical className="h-5 w-5" />}
      to="/lab"
      onToggleSidebar={onToggleSidebar}
      onToggleTheme={onToggleTheme}
      theme={theme}
      onLogout={logout}
      sessionKey="lab.session"
      rightExtras={<LabNotificationsBell />}
    />
  )
}
