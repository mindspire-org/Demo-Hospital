import { Outlet } from 'react-router-dom'

import { useEffect, useState } from 'react'

import Diagnostic_Sidebar from '../../components/diagnostic/diagnostic_Sidebar'

import Diagnostic_Header from '../../components/diagnostic/diagnostic_Header'



export default function Diagnostic_Layout() {

  const [collapsed, setCollapsed] = useState<boolean>(()=>{

    try { return localStorage.getItem('diagnostic.sidebar.collapsed') === '1' } catch { return false }

  })

  const [theme, setTheme] = useState<'light'|'dark'>(()=>{

    try { return (localStorage.getItem('diagnostic.theme') as 'light'|'dark') || 'light' } catch { return 'light' }

  })

  useEffect(()=>{ try { localStorage.setItem('diagnostic.theme', theme) } catch {} }, [theme])

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

  const toggle = () => {

    setCollapsed(v=>{

      const nv = !v

      try { localStorage.setItem('diagnostic.sidebar.collapsed', nv ? '1' : '0') } catch {}

      return nv

    })

  }

  const shell = theme === 'dark' ? 'h-dvh bg-slate-900 text-slate-100' : 'h-dvh bg-slate-50 text-slate-900'

  return (
    <div className={theme === 'dark' ? 'diagnostic-scope dark' : 'diagnostic-scope'}>
      <div className={`${shell} flex flex-col overflow-hidden`}>
        <div className="shrink-0 z-20 w-full" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)' }}>
          <div className="flex h-14">
            <Diagnostic_Header onToggleSidebar={toggle} onToggleTheme={()=> setTheme(t=>t==='dark'?'light':'dark')} theme={theme} />
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <Diagnostic_Sidebar collapsed={collapsed} />
          <main className="w-full flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )

}

