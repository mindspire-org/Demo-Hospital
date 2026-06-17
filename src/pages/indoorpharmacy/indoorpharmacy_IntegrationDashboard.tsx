import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import {
  Activity,
  Package,
  CreditCard,
  RotateCcw,
  Bed,
  Stethoscope,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Clock,
} from 'lucide-react'

export default function IndoorPharmacy_IntegrationDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    pendingOrders: 0,
    urgentOrders: 0,
    todayDispensed: 0,
    todayRevenue: 0,
    returnsPending: 0,
  })
  const [recentOrders, setRecentOrders] = useState<Array<{
    orderId: string
    patientName: string
    bedNumber?: string
    status: string
    priority: string
    requestedAt: string
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [queueStats, ordersRes] = await Promise.allSettled([
          hospitalApi.getQueueStats(),
          hospitalApi.listPendingOrders({ limit: 10 }),
        ])
        if (!mounted) return
        const qs = queueStats.status === 'fulfilled' ? (queueStats.value as any)?.stats : null
        if (qs) {
          setStats({
            pendingOrders: qs.pending || 0,
            urgentOrders: qs.urgent || 0,
            todayDispensed: qs.todayDispensed || 0,
            todayRevenue: 0,
            returnsPending: 0,
          })
        }
        const or = ordersRes.status === 'fulfilled' ? (ordersRes.value as any)?.orders : null
        if (Array.isArray(or)) {
          setRecentOrders(or)
        }
      } catch {}
      if (mounted) setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  const statCards = [
    { label: 'Pending Orders', value: stats.pendingOrders, icon: Package, tone: 'sky' as const },
    { label: 'Urgent / Stat', value: stats.urgentOrders, icon: AlertCircle, tone: 'rose' as const },
    { label: 'Dispensed Today', value: stats.todayDispensed, icon: Activity, tone: 'emerald' as const },
    { label: 'Returns Pending', value: stats.returnsPending, icon: RotateCcw, tone: 'amber' as const },
  ]

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      processing: 'bg-sky-100 text-sky-700',
      dispensed: 'bg-emerald-100 text-emerald-700',
      delivered: 'bg-violet-100 text-violet-700',
      cancelled: 'bg-slate-100 text-slate-600',
    }
    return map[status] || 'bg-slate-100 text-slate-600'
  }

  function priorityBadge(priority: string) {
    if (priority === 'stat') return 'bg-rose-100 text-rose-700'
    if (priority === 'urgent') return 'bg-amber-100 text-amber-700'
    return 'bg-slate-100 text-slate-600'
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
            <TrendingUp className="size-5 text-sky-600" />
            Integration Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">IPD / ER / OT pharmacy orders, billing, and queue overview</p>
        </div>
        <button
          onClick={() => navigate('/indoor-pharmacy/orders')}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 active:bg-sky-800 transition-colors"
        >
          Order Queue
          <ArrowRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
              <div className={`rounded-lg p-2 bg-${s.tone}-50`}>
                <s.icon className={`size-5 text-${s.tone}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock className="size-4 text-slate-500" />
              Recent Orders
            </h2>
            <button
              onClick={() => navigate('/indoor-pharmacy/orders')}
              className="text-sm text-sky-600 hover:text-sky-700 font-medium"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {loading && (
              <div className="p-6 text-center text-sm text-slate-500">Loading orders...</div>
            )}
            {!loading && recentOrders.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-500">No orders found.</div>
            )}
            {recentOrders.map((o) => (
              <div key={o.orderId} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-slate-100 p-2">
                    <Bed className="size-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{o.patientName || 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{o.orderId} {o.bedNumber ? `Bed ${o.bedNumber}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${priorityBadge(o.priority)}`}>
                    {o.priority}
                  </span>
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusBadge(o.status)}`}>
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Stethoscope className="size-4 text-slate-500" />
              Quick Actions
            </h2>
          </div>
          <div className="p-4 space-y-2">
            <button
              onClick={() => navigate('/indoor-pharmacy/pos')}
              className="w-full flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
            >
              <CreditCard className="size-4 text-sky-600" />
              <span className="text-sm font-medium">POS / Dispense</span>
            </button>
            <button
              onClick={() => navigate('/indoor-pharmacy/orders')}
              className="w-full flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
            >
              <Package className="size-4 text-emerald-600" />
              <span className="text-sm font-medium">Manage Order Queue</span>
            </button>
            <button
              onClick={() => navigate('/indoor-pharmacy/inventory')}
              className="w-full flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
            >
              <Bed className="size-4 text-violet-600" />
              <span className="text-sm font-medium">Inventory</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
