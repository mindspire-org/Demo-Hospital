import { useState, useEffect, useCallback } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Cafeteria_Sidebar from '../../components/cafeteria/cafeteria_Sidebar'
import Cafeteria_Header from '../../components/cafeteria/cafeteria_Header'
import { cafeteriaApi } from '../../features/cafeteria'

export default function Cafeteria_Layout() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('cafeteria-theme') === 'dark')
  const [sidebarItems, setSidebarItems] = useState<{ key: string; label: string; visible: boolean }[]>([])
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('cafeteria.token')
    if (!token) {
      navigate('/cafeteria/login')
      return
    }
    setAuthChecked(true)
  }, [navigate])

  useEffect(() => {
    if (!authChecked) return
    cafeteriaApi.getSidebarPermissions().then((r: any) => {
      if (r?.items) setSidebarItems(r.items)
    }).catch(() => {})
  }, [authChecked])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('cafeteria-theme', dark ? 'dark' : 'light')
  }, [dark])

  const toggleTheme = useCallback(() => setDark(d => !d), [])

  if (!authChecked) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-sm text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Cafeteria_Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        visibleItems={sidebarItems}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Cafeteria_Header
          onToggleSidebar={() => setCollapsed(c => !c)}
          dark={dark}
          onToggleTheme={toggleTheme}
        />
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
