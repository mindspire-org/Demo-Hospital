import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import IndoorPharmacy_Sidebar from '../../components/indoorpharmacy/indoorpharmacy_Sidebar'
import IndoorPharmacy_Header from '../../components/indoorpharmacy/indoorpharmacy_Header'
import { useEffect, useState } from 'react'

export default function IndoorPharmacy_Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useState<'light'|'dark'>(()=>{
    try { return (localStorage.getItem('indoorpharmacy.theme') as 'light'|'dark') || 'light' } catch { return 'light' }
  })
  useEffect(()=>{ try { localStorage.setItem('indoorpharmacy.theme', theme) } catch {} }, [theme])

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
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const tag = (t?.tagName || '').toLowerCase()
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || !!t?.isContentEditable
      if (isTyping) return

      const key = e.key?.toLowerCase?.() || ''
      if (e.ctrlKey && !e.shiftKey && key === 'n') {
        e.preventDefault()
        navigate('/indoor-pharmacy/pos')
        return
      }
      if (e.shiftKey && !e.ctrlKey && key === 'r') {
        e.preventDefault()
        navigate('/indoor-pharmacy/reports')
        return
      }
      if (e.shiftKey && !e.ctrlKey && key === 'i') {
        e.preventDefault()
        navigate('/indoor-pharmacy/inventory')
        return
      }
      if (e.ctrlKey && !e.shiftKey && key === 'd') {
        if (location.pathname.startsWith('/indoor-pharmacy/pos')) {
          e.preventDefault()
          setTimeout(() => { (document.getElementById('indoorpharmacy-pos-search') as HTMLInputElement | null)?.focus() }, 0)
        }
        return
      }
      if (e.shiftKey && !e.ctrlKey && key === 'f') {
        if (location.pathname.startsWith('/indoor-pharmacy/inventory')) {
          e.preventDefault()
          setTimeout(() => { (document.getElementById('indoorpharmacy-inventory-search') as HTMLInputElement | null)?.focus() }, 0)
        }
        return
      }
      if (e.ctrlKey && !e.shiftKey && key === 'p') {
        if (location.pathname.startsWith('/indoor-pharmacy/pos')) {
          e.preventDefault()
          try { window.dispatchEvent(new Event('indoor-pharmacy:pos:pay')) } catch {}
        }
        return
      }
    }
    window.addEventListener('keydown', onKeyDown as any)
    return () => window.removeEventListener('keydown', onKeyDown as any)
  }, [navigate, location.pathname])
  const shell = theme === 'dark' ? 'min-h-dvh bg-slate-900 text-slate-100' : 'min-h-dvh bg-slate-50 text-slate-900'
  return (
    <div className={theme === 'dark' ? 'indoorpharmacy-scope dark' : 'indoorpharmacy-scope'}>
      <div className={shell}>
        <div className="sticky top-0 z-20 w-full md:border-b border-slate-200/80" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)' }}>
          <div className="flex h-14">
            <IndoorPharmacy_Header
              variant="default"
              onToggleSidebar={() => setCollapsed(c => !c)}
              onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              theme={theme}
            />
          </div>
        </div>

        <div className="flex">
          <IndoorPharmacy_Sidebar collapsed={collapsed} />
          <main className="w-full flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
