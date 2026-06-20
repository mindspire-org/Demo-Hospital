import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Camp_Sidebar from '../../components/camp/camp_Sidebar'
import Camp_Header from '../../components/camp/camp_Header'

export default function Camp_Layout() {
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('camp.sidebar_collapsed') === '1'
  })

  useEffect(() => {
    const token = localStorage.getItem('camp.token')
    if (!token) {
      navigate('/camp/login')
    }
  }, [navigate])

  useEffect(() => {
    try { localStorage.setItem('camp.sidebar_collapsed', sidebarCollapsed ? '1' : '0') } catch {}
  }, [sidebarCollapsed])

  const toggleSidebar = () => setSidebarCollapsed(v => !v)

  return (
    <div className="h-dvh flex bg-slate-50 text-slate-900">
      <Camp_Sidebar collapsed={sidebarCollapsed} />
      <div className="flex flex-1 flex-col min-w-0">
        <Camp_Header onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
