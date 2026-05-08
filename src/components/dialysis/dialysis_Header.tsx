import { useNavigate } from 'react-router-dom'
import { Droplets } from 'lucide-react'
import PortalHeader from '../PortalHeader'

type Props = { onToggleSidebar?: () => void; collapsed?: boolean; onToggleTheme?: () => void; theme?: 'light'|'dark'; variant?: 'default' | 'teal' }

export default function Dialysis_Header({ onToggleSidebar, onToggleTheme, theme }: Props){
  const navigate = useNavigate()
  function logout(){
    try { localStorage.removeItem('dialysis.session') } catch {}
    try { localStorage.removeItem('dialysis.token') } catch {}
    navigate('/dialysis/login')
  }
  return (
    <PortalHeader
      brand="Dialysis ERP"
      subtitle="Renal dialysis operations"
      logo={<Droplets className="h-5 w-5" />}
      to="/dialysis"
      onToggleSidebar={onToggleSidebar}
      onToggleTheme={onToggleTheme}
      theme={theme}
      onLogout={logout}
      sessionKey="dialysis.session"
    />
  )
}
