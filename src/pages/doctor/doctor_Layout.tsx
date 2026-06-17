import { Outlet, useNavigate } from 'react-router-dom'
import Doctor_Sidebar from '../../components/doctor/doctor_Sidebar'
import Doctor_Header from '../../components/doctor/doctor_Header'
import { useEffect, useState } from 'react'

export default function Doctor_Layout() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useState<'light'|'dark'>(()=>{
    try { return (localStorage.getItem('doctor.theme') as 'light'|'dark') || 'light' } catch { return 'light' }
  })
  useEffect(()=>{ try { localStorage.setItem('doctor.theme', theme) } catch {} }, [theme])
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
      const raw = localStorage.getItem('doctor.session')
      if (!raw) navigate('/hospital/login')
    } catch { navigate('/hospital/login') }
  }, [navigate])
  const shell = theme === 'dark' ? 'min-h-dvh bg-slate-900 text-slate-100' : 'min-h-dvh bg-slate-50 text-slate-900'
  return (
    <div className={theme === 'dark' ? 'doctor-scope dark' : 'doctor-scope'}>
      <div className={shell}>
        <div className="sticky top-0 z-20 w-full md:border-b" style={{ background: '#f1f5f9', borderColor: '#e2e8f0' }}>
          <div className="flex h-14">
            <Doctor_Header onToggle={() => setCollapsed(c=>!c)} onToggleTheme={() => setTheme(t=>t==='dark'?'light':'dark')} theme={theme} variant="light" />
          </div>
        </div>

        <div className="flex">
          <Doctor_Sidebar collapsed={collapsed} />
          <main className="w-full flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
