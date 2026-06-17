import { Outlet } from 'react-router-dom'

import { useEffect, useState } from 'react'

import Finance_Sidebar from '../../components/finance/finance_Sidebar'

import Finance_Header from '../../components/finance/finance_Header'



export default function Finance_Layout(){

  const [collapsed, setCollapsed] = useState(false)

  const [theme, setTheme] = useState<'light'|'dark'>(()=>{

    try { return (localStorage.getItem('finance.theme') as 'light'|'dark') || 'light' } catch { return 'light' }

  })

  useEffect(()=>{ try { localStorage.setItem('finance.theme', theme) } catch {} }, [theme])

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

  const shell = theme === 'dark' ? 'h-dvh bg-slate-900 text-slate-100' : 'h-dvh bg-slate-50 text-slate-900'

  return (

    <div className={theme === 'dark' ? 'finance-scope dark' : 'finance-scope'}>

      <div className={shell}>

        <div className="sticky top-0 z-20 w-full md:border-b border-slate-200" style={{ background: '#f1f5f9' }}>
          <div className="flex h-14">
            <Finance_Header
              variant="default"
              onToggleSidebar={()=> setCollapsed(c=>!c)}
              onToggleTheme={()=> setTheme(t=> t==='dark'?'light':'dark')}
              theme={theme}
            />
          </div>
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

