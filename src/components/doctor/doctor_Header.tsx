import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stethoscope } from 'lucide-react'
import PortalHeader from '../PortalHeader'

type DoctorSession = { id: string; name: string; username: string }

type Props = { onToggle?: () => void; onToggleTheme?: () => void; theme?: 'light'|'dark'; variant?: 'default' | 'navy' }

export default function Doctor_Header({ onToggle, onToggleTheme, theme }: Props){
  const navigate = useNavigate()
  const [doc, setDoc] = useState<DoctorSession | null>(null)
  useEffect(() => {
    try { const raw = localStorage.getItem('doctor.session'); setDoc(raw ? JSON.parse(raw) : null) } catch { setDoc(null) }
  }, [])

  function logout(){
    try { localStorage.removeItem('doctor.session') } catch {}
    navigate('/hospital/login')
  }

  return (
    <PortalHeader
      brand="Doctor ERP"
      subtitle="Clinician workspace"
      logo={<Stethoscope className="h-5 w-5" />}
      to="/doctor"
      username={doc?.name || doc?.username}
      onToggleSidebar={onToggle}
      onToggleTheme={onToggleTheme}
      theme={theme}
      onLogout={logout}
      sessionKey="doctor.session"
    />
  )
}
