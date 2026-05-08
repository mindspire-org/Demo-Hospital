import { useNavigate } from 'react-router-dom'
import { UserCheck } from 'lucide-react'
import PortalHeader from '../PortalHeader'

type Props = { onToggleSidebar?: () => void; onToggleTheme?: () => void; theme?: 'light'|'dark'; variant?: 'default' | 'navy' }

export default function Reception_Header({ onToggleSidebar, onToggleTheme, theme }: Props){
  const navigate = useNavigate()
  function logout(){
    try { localStorage.removeItem('reception.session') } catch {}
    navigate('/reception/login')
  }
  return (
    <PortalHeader
      brand="Reception ERP"
      subtitle="Patient reception & token desk"
      logo={<UserCheck className="h-5 w-5" />}
      to="/reception"
      onToggleSidebar={onToggleSidebar}
      onToggleTheme={onToggleTheme}
      theme={theme}
      onLogout={logout}
      sessionKey="reception.session"
    />
  )
}
