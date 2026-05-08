import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCircle2, AlertTriangle, FlaskConical, FileCheck, Truck, Info, CheckCheck, X } from 'lucide-react'
import { api } from '../../api'

type Notif = {
  _id: string
  kind: string
  title: string
  body?: string
  link?: string
  scope?: string
  centerId?: string
  meta?: any
  read?: boolean
  readBy?: string[]
  createdAt: string
}

const POLL_MS = 30_000

const kindConfig: Record<string, { icon: any; accent: string; bg: string; text: string; glow: string }> = {
  critical:          { icon: AlertTriangle, accent: '#F43F5E', bg: '#FFF1F2', text: '#BE123C', glow: '0 0 12px #F43F5E30' },
  pending_approval:  { icon: FileCheck,      accent: '#F59E0B', bg: '#FFFBEB', text: '#B45309', glow: '0 0 12px #F59E0B30' },
  result_approved:   { icon: CheckCircle2,   accent: '#10B981', bg: '#ECFDF5', text: '#065F46', glow: '0 0 12px #10B98130' },
  sample_received:   { icon: FlaskConical,   accent: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8', glow: '0 0 12px #3B82F630' },
  outsource:         { icon: Truck,          accent: '#8B5CF6', bg: '#F5F3FF', text: '#6D28D9', glow: '0 0 12px #8B5CF630' },
}
const defaultKindCfg = { icon: Info, accent: '#64748B', bg: '#F8FAFC', text: '#475569', glow: 'none' }

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export default function LabNotificationsBell() {
  const [items, setItems] = useState<Notif[]>([])
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  async function load() {
    try {
      const r = await api('/lab/notifications?limit=20')
      setItems(r.items || [])
    } catch {}
  }
  useEffect(() => {
    load()
    const t = setInterval(load, POLL_MS)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!boxRef.current) return
      if (!boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const unread = items.filter(i => !i.read).length

  async function markRead(id: string) {
    try {
      await api(`/lab/notifications/${id}/read`, { method: 'POST', body: JSON.stringify({}) })
    } catch {}
    setItems(prev => prev.map(x => x._id === id ? { ...x, read: true } : x))
  }
  async function markAll() {
    try {
      await api('/lab/notifications/read-all', { method: 'POST', body: JSON.stringify({}) })
    } catch {}
    setItems(prev => prev.map(x => ({ ...x, read: true })))
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:shadow-md transition-all"
        aria-label="Notifications"
      >
        <Bell className={`h-4 w-4 transition-transform ${open ? 'scale-110' : ''}`} />
        {unread > 0 && (
          <span
            className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-sm shadow-rose-300 animate-pulse"
            style={{ animationDuration: '2s' }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-[400px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/50 ring-1 ring-black/5">
          {/* Header */}
          <div className="bg-linear-to-r from-violet-600 to-indigo-600 px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                  <Bell className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Notifications</div>
                  <div className="text-[10px] text-indigo-200">{unread > 0 ? `${unread} unread` : 'All caught up!'}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    onClick={markAll}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm hover:bg-white/25 transition-colors"
                  >
                    <CheckCheck className="h-3 w-3" /> Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mb-3">
                  <Bell className="h-6 w-6 text-slate-300" />
                </div>
                <div className="text-sm font-semibold text-slate-500">No notifications yet</div>
                <div className="text-xs text-slate-400 mt-0.5">You're all caught up!</div>
              </div>
            )}
            {items.map((n, idx) => {
              const cfg = kindConfig[n.kind] || defaultKindCfg
              const KindIcon = cfg.icon
              return (
                <button
                  key={n._id}
                  onClick={() => { if (!n.read) markRead(n._id); if (n.link) window.location.href = n.link }}
                  className={`group block w-full cursor-pointer border-b border-slate-100 px-4 py-3.5 text-left transition-all hover:bg-slate-50 ${!n.read ? 'bg-violet-50/40' : ''} ${idx === items.length - 1 ? 'border-b-0' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                      style={{ background: cfg.bg, boxShadow: !n.read ? cfg.glow : 'none' }}
                    >
                      <KindIcon size={16} style={{ color: cfg.accent }} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                          style={{ background: cfg.bg, color: cfg.text }}
                        >
                          {n.kind.replace(/_/g, ' ')}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {!n.read && (
                            <span className="h-2 w-2 rounded-full bg-violet-500 shadow-sm shadow-violet-300" />
                          )}
                          <span className="text-[10px] text-slate-400">{timeAgo(n.createdAt)}</span>
                        </div>
                      </div>
                      <div className={`mt-1 text-sm leading-snug ${!n.read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>{n.title}</div>
                      {n.body && <div className="mt-0.5 text-xs leading-relaxed text-slate-500 line-clamp-2">{n.body}</div>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5">
              <div className="text-center text-[10px] text-slate-400">Showing {items.length} recent notifications</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
