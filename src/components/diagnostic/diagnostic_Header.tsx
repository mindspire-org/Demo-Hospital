import { useNavigate } from 'react-router-dom'
import { ScanLine } from 'lucide-react'
import PortalHeader from '../PortalHeader'

export default function Diagnostic_Header({ onToggleSidebar, onToggleTheme, theme }: { onToggleSidebar?: ()=>void; onToggleTheme?: ()=>void; theme?: 'light'|'dark' }){
  const navigate = useNavigate()
  function logout(){
    try { localStorage.removeItem('diagnostic.session') } catch {}
    navigate('/diagnostic/login')
  }
  return (
    <PortalHeader
      brand="Diagnostic ERP"
      subtitle="Radiology & diagnostic services"
      logo={<ScanLine className="h-5 w-5" />}
      to="/diagnostic"
      onToggleSidebar={onToggleSidebar}
      onToggleTheme={onToggleTheme}
      theme={theme}
      onLogout={logout}
      sessionKey="diagnostic.session"
    />
  )
}
