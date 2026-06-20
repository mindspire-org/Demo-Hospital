import { useNavigate } from 'react-router-dom'
import { campApi } from '../../features/camp/camp.api'
import { LogOut, Menu } from 'lucide-react'

export default function Camp_Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const navigate = useNavigate()
  const session = (() => {
    try {
      const raw = localStorage.getItem('camp.session')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })()

  const logout = async () => {
    try { await campApi.logout() } catch {}
    try { localStorage.removeItem('camp.token') } catch {}
    try { localStorage.removeItem('camp.session') } catch {}
    navigate('/camp/login')
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-emerald-200 bg-white px-4 shadow-sm">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 md:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M3.5 21l7-18 7 18" /><path d="M5 21h14" /><path d="M12 11l3 10" /><path d="M12 11l-3 10" /></svg>
          </div>
          <span className="text-sm font-bold text-slate-800 hidden sm:inline">Medical Camp</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {session && (
          <span className="hidden text-xs text-slate-500 sm:inline">
            {session.fullName || session.username} <span className="text-slate-300">|</span> {session.role}
          </span>
        )}
        <button onClick={logout} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800">
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  )
}
