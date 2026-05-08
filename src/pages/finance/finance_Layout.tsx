import { Outlet, useNavigate } from 'react-router-dom'

import { useEffect, useState } from 'react'

import Finance_Sidebar from '../../components/finance/finance_Sidebar'

import Finance_Header from '../../components/finance/finance_Header'



export default function Finance_Layout(){

  const navigate = useNavigate()

  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('finance.session')
      if (!raw) { navigate('/finance/login', { replace: true }); return }
      setAuthed(true)
    } catch {
      navigate('/finance/login', { replace: true })
    }
  }, [navigate])

  const [collapsed, setCollapsed] = useState(false)

  const [theme, setTheme] = useState<'light'|'dark'>(()=>{

    try { return (localStorage.getItem('finance.theme') as 'light'|'dark') || 'light' } catch { return 'light' }

  })

  useEffect(()=>{ try { localStorage.setItem('finance.theme', theme) } catch {} }, [theme])

  if (authed !== true) return null

  const shell = theme === 'dark' ? 'h-dvh bg-slate-900 text-slate-100' : 'h-dvh bg-slate-50 text-slate-900'

  return (

    <div className={theme === 'dark' ? 'finance-scope dark' : 'finance-scope'}>

      <div className={shell}>

        <div className="sticky top-0 z-20 w-full border-b border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">

          <Finance_Header

            onToggleSidebar={()=> setCollapsed(c=>!c)}

            onToggleTheme={()=> setTheme(t=> t==='dark'?'light':'dark')}

            theme={theme}

          />

        </div>



        <div className="flex">

          <Finance_Sidebar collapsed={collapsed} />

          <main className="w-full flex-1">

            <Outlet />

          </main>

        </div>

      </div>

    </div>

  )

}

