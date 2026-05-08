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
        navigate('/hospital/indoor-pharmacy/pos')
        return
      }
      if (e.shiftKey && !e.ctrlKey && key === 'r') {
        e.preventDefault()
        navigate('/hospital/indoor-pharmacy/reports')
        return
      }
      if (e.shiftKey && !e.ctrlKey && key === 'i') {
        e.preventDefault()
        navigate('/hospital/indoor-pharmacy/inventory')
        return
      }
      if (e.ctrlKey && !e.shiftKey && key === 'd') {
        if (location.pathname.startsWith('/hospital/indoor-pharmacy/pos')) {
          e.preventDefault()
          setTimeout(() => { (document.getElementById('indoorpharmacy-pos-search') as HTMLInputElement | null)?.focus() }, 0)
        }
        return
      }
      if (e.shiftKey && !e.ctrlKey && key === 'f') {
        if (location.pathname.startsWith('/hospital/indoor-pharmacy/inventory')) {
          e.preventDefault()
          setTimeout(() => { (document.getElementById('indoorpharmacy-inventory-search') as HTMLInputElement | null)?.focus() }, 0)
        }
        return
      }
      if (e.ctrlKey && !e.shiftKey && key === 'p') {
        if (location.pathname.startsWith('/hospital/indoor-pharmacy/pos')) {
          e.preventDefault()
          try { window.dispatchEvent(new Event('indoorpharmacy:pos:pay')) } catch {}
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
        <div className="sticky top-0 z-20 w-full border-b border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div>
            <IndoorPharmacy_Header
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
