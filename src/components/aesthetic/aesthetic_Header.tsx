import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import PortalHeader from '../PortalHeader'

type Props = { onToggleSidebar?: ()=>void; collapsed?: boolean; onToggleTheme?: ()=>void; theme?: 'light'|'dark'; onLogout?: ()=>void; username?: string; variant?: 'default'|'navy' }

export default function Aesthetic_Header({ onToggleSidebar, onToggleTheme, theme, onLogout, username }: Props){
  const navigate = useNavigate()
  function defaultLogout(){
    try { localStorage.removeItem('aesthetic.session') } catch {}
    navigate('/aesthetic/login')
  }
  return (
    <PortalHeader
      brand="Aesthetic ERP"
      subtitle="Cosmetic & aesthetic services"
      logo={<Sparkles className="h-5 w-5" />}
      to="/aesthetic"
      username={username}
      onToggleSidebar={onToggleSidebar}
      onToggleTheme={onToggleTheme}
      theme={theme}
      onLogout={onLogout || defaultLogout}
      sessionKey="aesthetic.session"
    />
  )
}
