import { useEffect, useState } from 'react'
import { Bell, CheckCircle, Trash2, RefreshCcw, AlertTriangle, Clock, ChevronLeft, ChevronRight, List, AlertOctagon } from 'lucide-react'
import { pharmacyApi } from '../../utils/api'
import MiniDashboard from '../../components/common/MiniDashboard'

 type Notification = {
  _id: string
  type: 'low_stock' | 'expiring_soon' | 'purchase' | 'finance' | 'closing_balance' | 'alert'
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical' | 'success'
  read: boolean
  createdAt: string
  metadata?: any
}

export default function Pharmacy_Notifications(){
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all'|'unread'|'critical'|'warning'|'success'|'info'>('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)

  const load = async () => {
    try {
      setLoading(true)
      const params: any = { page, limit }
      if (filter === 'unread') params.read = false
      else if (filter !== 'all') params.severity = filter
      const res: any = await pharmacyApi.getNotifications(params)
      const list: Notification[] = Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res?.notifications)
          ? res.notifications
          : Array.isArray(res?.data)
            ? res.data
            : []
      const t = Number(res?.total ?? res?.count ?? res?.pagination?.total ?? (Array.isArray(res?.items)? res.items.length : 0))
      setNotifications(list)
      setTotal(isNaN(t) ? list.length : t)
    } catch (e){ console.error(e); setNotifications([]) }
    finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [page, limit, filter])

  const markAll = async () => { try { await pharmacyApi.markAllNotificationsRead(); await load() } catch(e){ console.error(e) } }
  const markOne = async (id: string) => { try { await pharmacyApi.markNotificationRead(id); setNotifications(prev=> prev.map(n=> n._id===id? { ...n, read: true } : n)) } catch(e){ console.error(e) } }
  const removeOne = async (id: string) => { try { await pharmacyApi.deleteNotification(id); setNotifications(prev=> prev.filter(n=> n._id!==id)) } catch(e){ console.error(e) } }
  const generate = async () => { try { await pharmacyApi.generateNotifications(); await load() } catch(e){ console.error(e) } }

  const start = (page - 1) * limit + 1
  const end = Math.min(start + notifications.length - 1, total)

  const pill = (sev: Notification['severity']) => {
    if (sev==='critical') return 'bg-rose-100 text-rose-800 ring-rose-300'
    if (sev==='warning') return 'bg-amber-100 text-amber-800 ring-amber-300'
    if (sev==='success') return 'bg-emerald-100 text-emerald-800 ring-emerald-300'
    return 'bg-blue-100 text-blue-800 ring-blue-300'
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const criticalCount = notifications.filter(n => n.severity === 'critical').length
  const warningCount = notifications.filter(n => n.severity === 'warning').length

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><Bell className="h-5 w-5" /></div>
        <h1 className="text-xl font-bold text-slate-800">Notifications</h1>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"><RefreshCcw className="h-4 w-4" /> Refresh</button>
          <button onClick={markAll} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"><CheckCircle className="h-4 w-4" /> Mark all read</button>
          <button onClick={generate} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"><AlertTriangle className="h-4 w-4" /> Generate</button>
        </div>
      </div>

      <MiniDashboard cards={[
        { label: 'Total', value: total, icon: List, color: 'bg-indigo-500' },
        { label: 'Unread', value: unreadCount, icon: Bell, color: 'bg-amber-500' },
        { label: 'Critical', value: criticalCount, icon: AlertOctagon, color: 'bg-rose-500' },
        { label: 'Warnings', value: warningCount, icon: AlertTriangle, color: 'bg-orange-500' },
      ]} />

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Filters</div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Severity</label>
            <select value={filter} onChange={e=> { setPage(1); setFilter(e.target.value as any) }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 outline-none">
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="success">Success</option>
              <option value="info">Info</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Per Page</label>
            <select value={limit} onChange={e=> { setPage(1); setLimit(Number(e.target.value)) }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 outline-none">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
          <div>{loading ? 'Loading…' : total > 0 ? `Showing ${start}-${end} of ${total}` : 'No notifications'}</div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1 || loading} onClick={()=> setPage(p=> Math.max(1, p-1))} className="inline-flex items-center rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
            <div className="min-w-16 text-center">Page {page}</div>
            <button disabled={end>=total || loading} onClick={()=> setPage(p=> p+1)} className="inline-flex items-center rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="divide-y divide-slate-200">
          {notifications.length === 0 && !loading && (
            <div className="p-6 text-sm text-slate-500">No notifications</div>
          )}
          {notifications.map(n => (
            <div key={n._id} className={`flex items-start gap-3 p-4 ${!n.read ? 'bg-sky-50/50' : ''}`}>
              <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.read? 'bg-slate-300' : 'bg-indigo-600'}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate font-semibold text-slate-900">{n.title}</div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${pill(n.severity)}`}>{n.severity.toUpperCase()}</span>
                </div>
                <div className="mt-1 text-sm text-slate-700">{n.message}</div>
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3 w-3" />{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              <div className="shrink-0 flex items-center gap-1">
                {!n.read && <button onClick={()=>markOne(n._id)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">Mark read</button>}
                <button onClick={()=>removeOne(n._id)} className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
