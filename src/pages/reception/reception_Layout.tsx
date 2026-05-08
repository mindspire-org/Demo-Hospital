import { Outlet, Navigate } from 'react-router-dom'

import { useEffect, useState } from 'react'

import Reception_Sidebar from '../../components/reception/reception_Sidebar'

import Reception_Header from '../../components/reception/reception_Header'



export default function Reception_Layout(){

  const [collapsed, setCollapsed] = useState(false)

  const [theme, setTheme] = useState<'light'|'dark'>(()=>{

    try { return (localStorage.getItem('reception.theme') as 'light'|'dark') || 'light' } catch { return 'light' }

  })

  const hasSession = (()=>{ try { return !!localStorage.getItem('reception.session') } catch { return false } })()

  useEffect(()=>{ try { localStorage.setItem('reception.theme', theme) } catch {} }, [theme])

  const shell = theme === 'dark' ? 'h-dvh bg-slate-900 text-slate-100' : 'h-dvh bg-slate-50 text-slate-900'

  if (!hasSession) return <Navigate to="/reception/login" replace />

  return (

    <div className={theme === 'dark' ? 'reception-scope dark' : 'reception-scope'}>

      <div className={shell}>

        <div className="sticky top-0 z-20 w-full border-b border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">

          <div>

            <Reception_Header

              onToggleSidebar={()=> setCollapsed(c=>!c)}

              onToggleTheme={()=> setTheme(t=> t==='dark'?'light':'dark')}

              theme={theme}

            />

          </div>

        </div>



        <div className="flex">

          <Reception_Sidebar collapsed={collapsed} />

          <main className="w-full flex-1">

            <Outlet />

          </main>

        </div>

      </div>

    </div>

  )

}

