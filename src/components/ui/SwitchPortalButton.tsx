import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, ChevronDown, ChevronUp } from 'lucide-react'

const PORTALS = [
  { id: 'hospital', label: 'Hospital', path: '/hospital' },
  { id: 'reception', label: 'Reception', path: '/reception' },
  { id: 'lab', label: 'Lab', path: '/lab' },
  { id: 'diagnostic', label: 'Diagnostics', path: '/diagnostic' },
  { id: 'dialysis', label: 'Dialysis', path: '/dialysis' },
  { id: 'pharmacy', label: 'Pharmacy', path: '/pharmacy' },
  { id: 'finance', label: 'Finance', path: '/finance' },
]

export default function SwitchPortalButton({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [selectedPortal, setSelectedDoctor] = useState('hospital')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSwitch = () => {
    const portal = PORTALS.find(p => p.id === selectedPortal)
    if (portal) {
      navigate(portal.path)
      setOpen(false)
    }
  }

  if (collapsed) {
    return (
      <div className="relative px-2 py-2" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          title="Switch Portal"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-800 border border-slate-200"
        >
          <ArrowLeftRight className="h-5 w-5" />
        </button>
        {open && (
          <div className="absolute bottom-full left-full mb-2 ml-2 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl z-100">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">Admin Switch</div>
            <select
              value={selectedPortal}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 mb-3 bg-white"
            >
              {PORTALS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <button
              onClick={handleSwitch}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0f2851] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#1a3a6d]"
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>Switch Portal</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative px-3 py-2" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <ArrowLeftRight className="h-4 w-4 text-slate-500" />
          <span>Switch Portal</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 mx-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl z-100 ring-1 ring-black/5">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">Admin Switch</div>
          <select
            value={selectedPortal}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 mb-4 bg-white"
          >
            {PORTALS.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <button
            onClick={handleSwitch}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0f2851] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#1a3a6d]"
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span>Switch Portal</span>
          </button>
        </div>
      )}
    </div>
  )
}
