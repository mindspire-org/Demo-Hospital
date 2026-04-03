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
  Truck,
  ClipboardList,
  History,
  Building2,
  BarChart3,
  CheckCircle2,
  XCircle,
  Calendar,
  Archive,
  ShoppingCart,
  Send,
  CreditCard,
  FileText,
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
  itemCount: number
}

type RecentIssue = {
  id: string
  date: string
  departmentName: string
  issuedTo?: string
  itemCount: number
  totalAmount: number
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

type SupplierSummary = {
  id: string
  name: string
  totalPurchases: number
  paid: number
  outstanding: number
  lastOrder?: string
}

type CategorySummary = {
  category: string
  itemCount: number
  stockValue: number
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
  const [recentIssues, setRecentIssues] = useState<RecentIssue[]>([])
  const [stockAlerts, setStockAlerts] = useState<StockAlertItem[]>([])
  const [topSuppliers, setTopSuppliers] = useState<SupplierSummary[]>([])
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([])
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
            itemCount: p.items?.length || 0,
          }))
          setRecentPurchases(purchases)
        }

        // Load recent issues (last 5)
        const issueRes = await hospitalApi.listStoreIssues({ limit: 5 }) as any
        if (!cancelled) {
          const issues = (issueRes.issues || issueRes.data || []).map((i: any) => ({
            id: String(i._id || i.id),
            date: i.date,
            departmentName: i.departmentName || 'Unknown',
            issuedTo: i.issuedTo,
            itemCount: i.items?.length || 0,
            totalAmount: i.totalAmount || 0,
          }))
          setRecentIssues(issues)
        }

        // Load inventory for stock alerts
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
          
          // Convert category map to array
          const catSummary: CategorySummary[] = Array.from(categoryMap.entries())
            .map(([category, data]) => ({
              category,
              itemCount: data.count,
              stockValue: data.value,
            }))
            .sort((a, b) => b.stockValue - a.stockValue)
            .slice(0, 6)
          setCategorySummary(catSummary)
        }

        // Load suppliers
        const supplierRes = await hospitalApi.listStoreSuppliers({ limit: 100 }) as any
        if (!cancelled) {
          const suppliers = (supplierRes.suppliers || supplierRes.data || [])
            .map((s: any) => ({
              id: String(s._id || s.id),
              name: s.name,
              totalPurchases: s.totalPurchases || 0,
              paid: s.paid || 0,
              outstanding: (s.totalPurchases || 0) - (s.paid || 0),
              lastOrder: s.lastOrder,
            }))
            .filter((s: SupplierSummary) => s.outstanding > 0)
            .sort((a: SupplierSummary, b: SupplierSummary) => b.outstanding - a.outstanding)
            .slice(0, 5)
          setTopSuppliers(suppliers)
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

  const getAlertIcon = (status: StockAlertItem['status']) => {
    switch (status) {
      case 'outOfStock': return <XCircle className="h-4 w-4 text-rose-600" />
      case 'lowStock': return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case 'expiringSoon': return <Clock className="h-4 w-4 text-orange-500" />
      case 'expired': return <AlertCircle className="h-4 w-4 text-red-600" />
    }
  }

  const getAlertLabel = (status: StockAlertItem['status']) => {
    switch (status) {
      case 'outOfStock': return 'Out of Stock'
      case 'lowStock': return 'Low Stock'
      case 'expiringSoon': return 'Expiring Soon'
      case 'expired': return 'Expired'
    }
  }

  const getAlertClass = (status: StockAlertItem['status']) => {
    switch (status) {
      case 'outOfStock': return 'bg-rose-50 text-rose-700 border-rose-200'
      case 'lowStock': return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'expiringSoon': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'expired': return 'bg-red-50 text-red-700 border-red-200'
    }
  }

  const totalAlerts = alerts.lowStock + alerts.outOfStock + alerts.expiringSoon + alerts.expired

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-sky-600"></div>
            <p className="text-slate-500">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Store & Inventory Dashboard</h2>
          <p className="mt-1 text-slate-500">Manage purchases, stock, and department distribution</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Calendar className="h-4 w-4" />
          {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Alerts Banner */}
      {totalAlerts > 0 && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-amber-50 p-4">
          <div className="flex items-center gap-2 text-rose-700">
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
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Package className="h-4 w-4 text-slate-400" />
            Total Items
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-800">{stats.totalItems}</div>
          <div className="mt-1 text-xs text-slate-400">In inventory</div>
        </div>
        
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <DollarSign className="h-4 w-4 text-slate-400" />
            Stock Value
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalStockValue)}</div>
          <div className="mt-1 text-xs text-emerald-600/70">Total investment</div>
        </div>
        
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Truck className="h-4 w-4 text-slate-400" />
            Suppliers
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-800">{stats.totalSuppliers}</div>
          <div className="mt-1 text-xs text-slate-400">{stats.activeSuppliers} active</div>
        </div>
        
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CreditCard className="h-4 w-4 text-slate-400" />
            Pending Payments
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">{formatCurrency(stats.pendingPayments)}</div>
          <div className="mt-1 text-xs text-rose-600/70">To suppliers</div>
        </div>
        
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            Today Purchases
          </div>
          <div className="mt-2 text-2xl font-bold text-sky-600">{formatCurrency(stats.todayPurchases)}</div>
          <div className="mt-1 text-xs text-sky-600/70">{stats.weekPurchases > 0 && `${formatCurrency(stats.weekPurchases)} this week`}</div>
        </div>
        
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <TrendingDown className="h-4 w-4 text-slate-400" />
            Today Issues
          </div>
          <div className="mt-2 text-2xl font-bold text-violet-600">{formatCurrency(stats.todayIssues)}</div>
          <div className="mt-1 text-xs text-violet-600/70">{stats.weekIssues > 0 && `${formatCurrency(stats.weekIssues)} this week`}</div>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Pending Approvals
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-800">{stats.pendingApprovals}</span>
            <span className="text-xs text-slate-400">drafts</span>
          </div>
          {stats.pendingApprovals > 0 && (
            <Link to="/hospital/store/inventory" className="mt-2 inline-flex items-center text-xs text-sky-600 hover:text-sky-700">
              Review <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Archive className="h-4 w-4 text-amber-500" />
            Held Purchases
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-800">{stats.heldPurchases}</span>
            <span className="text-xs text-slate-400">on hold</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <BarChart3 className="h-4 w-4 text-violet-500" />
            Monthly Purchases
          </div>
          <div className="mt-2 text-xl font-bold text-slate-800">{formatCurrency(stats.monthPurchases)}</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Building2 className="h-4 w-4 text-orange-500" />
            Monthly Issues
          </div>
          <div className="mt-2 text-xl font-bold text-slate-800">{formatCurrency(stats.monthIssues)}</div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Stock Alerts */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              <h3 className="font-semibold text-slate-800">Stock Alerts</h3>
            </div>
            <Link to="/hospital/store/inventory" className="text-sm text-sky-600 hover:text-sky-700">
              View All
            </Link>
          </div>
          <div className="p-5">
            {stockAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                <p className="mt-2 text-sm">All stock levels are healthy</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stockAlerts.map(item => (
                  <Link
                    key={item.id}
                    to={`/hospital/store/inventory?search=${encodeURIComponent(item.name)}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      {getAlertIcon(item.status)}
                      <div>
                        <p className="font-medium text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${getAlertClass(item.status)}`}>
                        {getAlertLabel(item.status)}
                      </span>
                      <p className="mt-1 text-xs text-slate-500">
                        Stock: {item.currentStock} / Min: {item.minStock}
                      </p>
                      {item.earliestExpiry && (
                        <p className="text-xs text-slate-400">Exp: {formatDate(item.earliestExpiry)}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Purchases */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-sky-500" />
              <h3 className="font-semibold text-slate-800">Recent Purchases</h3>
            </div>
            <Link to="/hospital/store/purchase-history" className="text-sm text-sky-600 hover:text-sky-700">
              View All
            </Link>
          </div>
          <div className="p-5">
            {recentPurchases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <Package className="h-12 w-12" />
                <p className="mt-2 text-sm">No recent purchases</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPurchases.map(purchase => (
                  <Link
                    key={purchase.id}
                    to={`/hospital/store/purchase-history`}
                    className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-slate-50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800">{purchase.invoiceNo}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          purchase.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          purchase.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {purchase.paymentStatus}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{purchase.supplierName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-800">{formatCurrency(purchase.totalAmount)}</p>
                      <p className="text-xs text-slate-500">{formatDate(purchase.date)} • {purchase.itemCount} items</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Issues */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-emerald-500" />
              <h3 className="font-semibold text-slate-800">Recent Issues to Departments</h3>
            </div>
            <Link to="/hospital/store/issue-history" className="text-sm text-sky-600 hover:text-sky-700">
              View All
            </Link>
          </div>
          <div className="p-5">
            {recentIssues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <Building2 className="h-12 w-12" />
                <p className="mt-2 text-sm">No recent issues</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentIssues.map(issue => (
                  <Link
                    key={issue.id}
                    to="/hospital/store/issue-history"
                    className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{issue.departmentName}</p>
                      {issue.issuedTo && <p className="text-xs text-slate-500">Issued to: {issue.issuedTo}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-800">{formatCurrency(issue.totalAmount)}</p>
                      <p className="text-xs text-slate-500">{formatDate(issue.date)} • {issue.itemCount} items</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Suppliers with Outstanding */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-violet-500" />
              <h3 className="font-semibold text-slate-800">Suppliers with Outstanding</h3>
            </div>
            <Link to="/hospital/store/suppliers" className="text-sm text-sky-600 hover:text-sky-700">
              View All
            </Link>
          </div>
          <div className="p-5">
            {topSuppliers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                <p className="mt-2 text-sm">No outstanding payments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topSuppliers.map(supplier => (
                  <Link
                    key={supplier.id}
                    to={`/hospital/store/suppliers`}
                    className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{supplier.name}</p>
                      <p className="text-xs text-slate-500">Total: {formatCurrency(supplier.totalPurchases)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-rose-600">{formatCurrency(supplier.outstanding)}</p>
                      <p className="text-xs text-slate-500">Outstanding</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Summary */}
      {categorySummary.length > 0 && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Inventory by Category</h3>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {categorySummary.map(cat => (
              <div key={cat.category} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-700">{cat.category}</p>
                <p className="mt-1 text-lg font-bold text-slate-800">{cat.itemCount}</p>
                <p className="text-xs text-slate-500">{formatCurrency(cat.stockValue)} value</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports Section */}
      <div className="mt-8">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-500" />
          <h3 className="text-lg font-semibold text-slate-800">Reports</h3>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Link to="/hospital/store/reports" className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-sky-300 hover:bg-sky-50 hover:shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-slate-700 group-hover:text-sky-700">Current Stock</p>
              <p className="text-xs text-slate-500">Inventory levels</p>
            </div>
          </Link>
          <Link to="/hospital/store/reports" className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-violet-300 hover:bg-violet-50 hover:shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-slate-700 group-hover:text-violet-700">Department Usage</p>
              <p className="text-xs text-slate-500">Consumption by dept</p>
            </div>
          </Link>
          <Link to="/hospital/store/reports" className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-orange-300 hover:bg-orange-50 hover:shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-slate-700 group-hover:text-orange-700">Expiry Report</p>
              <p className="text-xs text-slate-500">Near expiry items</p>
            </div>
          </Link>
          <Link to="/hospital/store/reports" className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-slate-700 group-hover:text-emerald-700">Monthly Consumption</p>
              <p className="text-xs text-slate-500">Usage trends</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Quick Links Footer */}
      <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-200 pt-6">
        <Link to="/hospital/store/purchase-orders" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-200">
          <ClipboardList className="h-4 w-4" />
          Purchase Orders
        </Link>
        <Link to="/hospital/store/inventory" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-200">
          <Package className="h-4 w-4" />
          Manage Inventory
        </Link>
        <Link to="/hospital/store/issue-history" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-200">
          <History className="h-4 w-4" />
          Issue History
        </Link>
        <Link to="/hospital/store/suppliers" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-200">
          <Truck className="h-4 w-4" />
          Manage Suppliers
        </Link>
      </div>
    </div>
  )
}
