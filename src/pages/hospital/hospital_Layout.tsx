import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Hospital_Sidebar from '../../components/hospital/hospital_Sidebar'
import Hospital_Header from '../../components/hospital/hospital_Header'
import Nurse_Sidebar from '../../components/hospital/Nurse_Sidebar'
import { hospitalApi } from '../../utils/api'

function isHospitalAuthenticated() {
  try {
    const session = localStorage.getItem('hospital.session')
    const token = localStorage.getItem('hospital.token')
    return !!(session && token)
  } catch { return false }
}

export default function Hospital_Layout() {
  const location = useLocation()
  const navigate = useNavigate()

  // Auth guard: save intended path then redirect to login
  useEffect(() => {
    if (!isHospitalAuthenticated()) {
      const intended = location.pathname + location.search
      try { sessionStorage.setItem('hospital.redirect', intended) } catch {}
      navigate('/hospital/login', { replace: true })
    }
  }, [location.pathname])

  if (!isHospitalAuthenticated()) return null
  const isNurseRoute = location.pathname.startsWith('/hospital/nurse/') || location.pathname.startsWith('/hospital/nurse-admin/')
  const [hospitalName, setHospitalName] = useState('Health Spire')

  useEffect(()=>{
    if (!isNurseRoute) return
    let mounted = true
    ;(async()=>{
      try {
        const s: any = await hospitalApi.getSettings()
        if (mounted && s?.hospitalName) setHospitalName(String(s.hospitalName))
      } catch {}
    })()
    return ()=>{ mounted = false }
  }, [isNurseRoute])

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('hospital.sidebar_collapsed') === '1'
  })
  const [theme, setTheme] = useState<'light'|'dark'>(()=>{
    try { return (localStorage.getItem('hospital.theme') as 'light'|'dark') || 'light' } catch { return 'light' }
  })
  useEffect(()=>{ try { localStorage.setItem('hospital.theme', theme) } catch {} }, [theme])

  useEffect(()=>{
    const html = document.documentElement
    const hadDark = (() => {
      try { return html.classList.contains('dark') } catch { return false }
    })()
    const forceRemove = () => {
      try {
        if (html.classList.contains('dark')) html.classList.remove('dark')
      } catch {}
    }
    forceRemove()

    let obs: MutationObserver | null = null
    try {
      obs = new MutationObserver(() => forceRemove())
      obs.observe(html, { attributes: true, attributeFilter: ['class'] })
    } catch {}

    return () => {
      try {
        if (obs) obs.disconnect()
        html.classList.toggle('dark', hadDark)
      } catch {}
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('hospital.sidebar_collapsed', sidebarCollapsed ? '1' : '0')
    } catch (_) {}
  }, [sidebarCollapsed])

  const shell = theme === 'dark' ? 'h-dvh bg-slate-900 text-slate-100' : 'h-dvh bg-slate-50 text-slate-900'

  if (isNurseRoute) {
    return (
      <div className={theme === 'dark' ? 'hospital-scope dark' : 'hospital-scope'}>
        <div className={`${shell} flex flex-col`}>
          {/* Nurse Top Header */}
          <div className="shrink-0 z-20 w-full border-b border-slate-200/80" style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #e8edf4 50%, #dde4ef 100%)' }}>
            <div className="flex h-14 items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSidebarCollapsed(v => !v)}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="Toggle sidebar"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <span className="text-sm font-semibold text-slate-700">{hospitalName}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <Nurse_Sidebar collapsed={sidebarCollapsed} hospitalName={hospitalName} />
            <main className="w-full flex-1 overflow-y-auto bg-slate-50">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={theme === 'dark' ? 'hospital-scope dark' : 'hospital-scope'}>
      <div className={`${shell} flex flex-col`}>
        <div className="shrink-0 z-20 w-full border-b border-slate-200/80" style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #e8edf4 50%, #dde4ef 100%)' }}>
          <div className="flex h-14">
            <Hospital_Header
              variant="default"
              onToggleSidebar={() => setSidebarCollapsed(v => !v)}
              collapsed={sidebarCollapsed}
              onToggleTheme={() => setTheme(t=>t==='dark'?'light':'dark')}
              theme={theme}
            />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <Hospital_Sidebar collapsed={sidebarCollapsed} />
          <main className="w-full flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
