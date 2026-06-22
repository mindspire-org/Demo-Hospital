import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import {
  Package,
  AlertTriangle,
  AlertCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ClipboardList,
  BarChart3,
  CheckCircle2,
  XCircle,
  Calendar,
  Archive,
  ShoppingCart,
  Send,
  Truck,
  CreditCard,
  ChevronRight,
} from 'lucide-react'

type AlertSummary = {
  lowStock: number
  outOfStock: number
  expiringSoon: number
  expired: number
}

type DashboardStats = {
  totalItems: number
  totalStockValue: number
  totalSuppliers: number
  activeSuppliers: number
  pendingPayments: number
  todayPurchases: number
  todayIssues: number
  weekPurchases: number
  weekIssues: number
  monthPurchases: number
  monthIssues: number
  pendingApprovals: number
  heldPurchases: number
}

type RecentPurchase = {
  id: string
  date: string
  invoiceNo: string
  supplierName: string
  totalAmount: number
  paymentStatus: string
  status?: string
  itemCount: number
}

type StockAlertItem = {
  id: string
  name: string
  category: string
  currentStock: number
  minStock: number
  status: 'outOfStock' | 'lowStock' | 'expiringSoon' | 'expired'
  earliestExpiry?: string
}

export default function Store_Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    totalStockValue: 0,
    totalSuppliers: 0,
    activeSuppliers: 0,
    pendingPayments: 0,
    todayPurchases: 0,
    todayIssues: 0,
    weekPurchases: 0,
    weekIssues: 0,
    monthPurchases: 0,
    monthIssues: 0,
    pendingApprovals: 0,
    heldPurchases: 0,
  })
  const [alerts, setAlerts] = useState<AlertSummary>({
    lowStock: 0,
    outOfStock: 0,
    expiringSoon: 0,
    expired: 0,
  })
  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([])
  const [stockAlerts, setStockAlerts] = useState<StockAlertItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // Load dashboard stats
        const res = await hospitalApi.storeDashboard() as any
        if (!cancelled) {
          setStats(res.stats || stats)
          setAlerts(res.alerts || alerts)
        }

        // Load recent purchases (last 5)
        const purchaseRes = await hospitalApi.listStorePurchases({ limit: 5 }) as any
        if (!cancelled) {
          const purchases = (purchaseRes.purchases || purchaseRes.data || []).map((p: any) => ({
            id: String(p._id || p.id),
            date: p.date,
            invoiceNo: p.invoiceNo,
            supplierName: p.supplierName || 'Unknown',
            totalAmount: p.totalAmount || 0,
            paymentStatus: p.paymentStatus || 'unpaid',
            status: p.status || p.paymentStatus || 'unpaid',
            itemCount: p.items?.length || 0,
          }))
          setRecentPurchases(purchases)
        }

        // Load low stock / out of stock items
        const inventoryRes = await hospitalApi.listStoreInventory({ limit: 1000 }) as any
        if (!cancelled) {
          const items = (inventoryRes.items || inventoryRes.data || []) as any[]
          const alertsList: StockAlertItem[] = []
          const categoryMap = new Map<string, { count: number; value: number }>()

          items.forEach((item: any) => {
            const currentStock = Number(item.currentStock) || 0
            const minStock = Number(item.minStock) || 0
            const category = item.category || 'Uncategorized'
            
            // Build category summary
            if (!categoryMap.has(category)) {
              categoryMap.set(category, { count: 0, value: 0 })
            }
            const cat = categoryMap.get(category)!
            cat.count++
            cat.value += (item.stockValue || 0)

            // Check for alerts
            let status: StockAlertItem['status'] | null = null
            if (currentStock === 0) {
              status = 'outOfStock'
            } else if (minStock > 0 && currentStock <= minStock) {
              status = 'lowStock'
            }

            // Check expiry
            const expiryStr = String(item.earliestExpiry || '').slice(0, 10)
            if (expiryStr && expiryStr !== '-') {
              try {
                const expiryDate = new Date(expiryStr)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const thirtyDaysFromNow = new Date(today)
                thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
                
                if (expiryDate < today) {
                  if (!status) status = 'expired'
                } else if (expiryDate <= thirtyDaysFromNow) {
                  if (!status) status = 'expiringSoon'
                }
              } catch {}
            }

            if (status) {
              alertsList.push({
                id: String(item._id || item.id),
                name: item.name,
                category: item.category || '-',
                currentStock,
                minStock,
                status,
                earliestExpiry: item.earliestExpiry,
              })
            }
          })

          setStockAlerts(alertsList.slice(0, 10))
        }

      } catch {
        // API not ready - show empty state
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const quickLinks = [
    { to: '/hospital/store/inventory', label: 'Add Purchase', icon: ShoppingCart, color: 'bg-sky-600', hoverColor: 'hover:bg-sky-700' },
    { to: '/hospital/store/issues', label: 'Issue to Dept', icon: Send, color: 'bg-emerald-600', hoverColor: 'hover:bg-emerald-700' },
    { to: '/hospital/store/suppliers', label: 'Suppliers', icon: Truck, color: 'bg-violet-600', hoverColor: 'hover:bg-violet-700' },
    { to: '/hospital/store/purchase-history', label: 'Purchase History', icon: ClipboardList, color: 'bg-amber-600', hoverColor: 'hover:bg-amber-700' },
  ]

  const formatCurrency = (n: number) => {
    const value = Number(n) || 0
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(value)
  }
  const formatDate = (d?: string) => {
    if (!d) return '-'
    try {
      return new Date(d).toISOString().slice(0, 10)
    } catch {
      return String(d).slice(0, 10)
    }
  }

  const totalAlerts = alerts.lowStock + alerts.outOfStock + alerts.expiringSoon + alerts.expired

  if (loading) {
    return (
      <div className="p-6 min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-sky-600"></div>
            <p className="text-slate-500 dark:text-slate-400">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Store & Inventory Dashboard</h2>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Manage purchases, stock, and department distribution</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Calendar className="h-4 w-4" />
          {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Alerts Banner */}
      {totalAlerts > 0 && (
        <div className="mt-6 rounded-xl border border-rose-200 dark:border-rose-800 bg-linear-to-r from-rose-50 to-amber-50 dark:from-rose-900/40 dark:to-amber-900/40 p-4">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">Stock Alerts Require Attention</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {alerts.outOfStock > 0 && (
              <Link to="/hospital/store/inventory?status=out" className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-sm text-white shadow-sm transition hover:bg-rose-700">
                <XCircle className="h-4 w-4" />
                {alerts.outOfStock} Out of Stock
              </Link>
            )}
            {alerts.lowStock > 0 && (
              <Link to="/hospital/store/inventory?status=low" className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-sm text-white shadow-sm transition hover:bg-amber-600">
                <AlertTriangle className="h-4 w-4" />
                {alerts.lowStock} Low Stock
              </Link>
            )}
            {alerts.expiringSoon > 0 && (
              <Link to="/hospital/store/inventory?status=expiring" className="flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5 text-sm text-white shadow-sm transition hover:bg-orange-600">
                <Clock className="h-4 w-4" />
                {alerts.expiringSoon} Expiring Soon
              </Link>
            )}
            {alerts.expired > 0 && (
              <Link to="/hospital/store/inventory?status=expired" className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-sm text-white shadow-sm transition hover:bg-red-700">
                <AlertCircle className="h-4 w-4" />
                {alerts.expired} Expired
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {quickLinks.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex items-center gap-3 rounded-xl ${link.color} px-4 py-4 text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 ${link.hoverColor}`}
          >
            <link.icon className="h-6 w-6" />
            <span className="font-medium">{link.label}</span>
          </Link>
        ))}
      </div>

      {/* Main Stats Grid */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Package className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            Total Items
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.totalItems}</div>
          <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">In inventory</div>
        </div>
        
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <DollarSign className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            Stock Value
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.totalStockValue)}</div>
          <div className="mt-1 text-xs text-emerald-600/70 dark:text-emerald-500/70">Total investment</div>
        </div>
        
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Truck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            Suppliers
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.totalSuppliers}</div>
          <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">{stats.activeSuppliers} active</div>
        </div>
        
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <CreditCard className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            Pending Payments
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(stats.pendingPayments)}</div>
          <div className="mt-1 text-xs text-rose-600/70 dark:text-rose-500/70">To suppliers</div>
        </div>
        
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <TrendingUp className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            Today Purchases
          </div>
          <div className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">{formatCurrency(stats.todayPurchases)}</div>
          <div className="mt-1 text-xs text-sky-600/70 dark:text-sky-500/70">{stats.weekPurchases > 0 && `${formatCurrency(stats.weekPurchases)} this week`}</div>
        </div>
        
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <TrendingDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            Today Issues
          </div>
          <div className="mt-2 text-2xl font-bold text-violet-600 dark:text-violet-400">{formatCurrency(stats.todayIssues)}</div>
          <div className="mt-1 text-xs text-violet-600/70 dark:text-violet-500/70">{stats.weekIssues > 0 && `${formatCurrency(stats.weekIssues)} this week`}</div>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-linear-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            Pending Approvals
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{stats.pendingApprovals}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">drafts</span>
          </div>
          {stats.pendingApprovals > 0 && (
            <Link to="/hospital/store/inventory" className="mt-2 inline-flex items-center text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300">
              Review <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-linear-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Archive className="h-4 w-4 text-amber-500 dark:text-amber-400" />
            Held Purchases
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{stats.heldPurchases}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">on hold</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-linear-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <BarChart3 className="h-4 w-4 text-violet-500 dark:text-violet-400" />
            Monthly Purchases
          </div>
          <div className="mt-2 text-xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(stats.monthPurchases)}</div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Stock Alerts */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Stock Alerts</h3>
            </div>
            <Link to="/hospital/store/inventory" className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300">
              View All
            </Link>
          </div>
          <div className="p-5">
            {stockAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
                <CheckCircle2 className="h-12 w-12 text-emerald-400 dark:text-emerald-500" />
                <p className="mt-2 text-sm">All stock levels are healthy</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stockAlerts.slice(0, 5).map(alert => (
                  <Link
                    key={alert.id}
                    to="/hospital/store/inventory"
                    className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3 transition hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        alert.status === 'outOfStock' 
                          ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400'
                          : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
                      }`}>
                        {alert.status === 'outOfStock' ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-200">{alert.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500">{alert.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        alert.status === 'outOfStock'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {alert.currentStock} / {alert.minStock}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        {alert.status === 'outOfStock' ? 'Out of stock' : 'Low stock'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Purchases */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-sky-500" />
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Recent Purchases</h3>
            </div>
            <Link to="/hospital/store/purchase-orders" className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300">
              View All
            </Link>
          </div>
          <div className="p-5">
            {recentPurchases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
                <ClipboardList className="h-12 w-12" />
                <p className="mt-2 text-sm">No recent purchases</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPurchases.map(purchase => (
                  <Link
                    key={purchase.id}
                    to="/hospital/store/purchase-orders"
                    className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3 transition hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{purchase.supplierName}</p>
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs ${
                          purchase.status === 'draft' ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400' :
                          purchase.status === 'ordered' ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400' :
                          purchase.status === 'received' ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' :
                          'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
                        }`}>
                          {purchase.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-500">{purchase.itemCount} items</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(purchase.totalAmount)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">{formatDate(purchase.date)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
