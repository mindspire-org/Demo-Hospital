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

      <div className={shell}>

        <div className="sticky top-0 z-20 w-full border-b border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">

          <Diagnostic_Header onToggleSidebar={toggle} onToggleTheme={()=> setTheme(t=>t==='dark'?'light':'dark')} theme={theme} />

        </div>



        <div className="flex">

          <Diagnostic_Sidebar collapsed={collapsed} />

          <main className="w-full flex-1">

            <Outlet />

          </main>

        </div>

      </div>

    </div>

  )

}

