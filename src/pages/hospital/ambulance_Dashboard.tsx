import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'

type Ambulance = {
  id: string
  vehicleNumber: string
  type: 'BLS' | 'ALS' | 'Patient Transport' | 'Neonatal'
  driverName: string
  driverContact: string
  status: 'Available' | 'On Duty' | 'Maintenance'
}

type DashboardStats = {
  totalAmbulances: number
  available: number
  onDuty: number
  maintenance: number
  todayTrips: number
  monthTrips: number
  monthDistance: number
  monthFuel: number
  monthExpenses: number
  activeTrips: Array<{
    id: string
    vehicleNumber: string
    patientName?: string
    destination: string
    departureTime: string
  }>
}

export default function Ambulance_Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalAmbulances: 0,
    available: 0,
    onDuty: 0,
    maintenance: 0,
    todayTrips: 0,
    monthTrips: 0,
    monthDistance: 0,
    monthFuel: 0,
    monthExpenses: 0,
    activeTrips: [],
  })
  const [ambulances, setAmbulances] = useState<Ambulance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [dashRes, ambRes] = await Promise.all([
          hospitalApi.ambulanceDashboard() as Promise<any>,
          hospitalApi.listAmbulances() as Promise<any>,
        ])
        if (!cancelled) {
          setStats(dashRes.stats || dashRes || stats)
          setAmbulances((ambRes.ambulances || ambRes || []).map((a: any) => ({
            id: String(a._id || a.id),
            vehicleNumber: a.vehicleNumber,
            type: a.type,
            driverName: a.driverName,
            driverContact: a.driverContact,
            status: a.status || 'Available',
          })))
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

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n)
  const formatNumber = (n: number) => new Intl.NumberFormat('en-PK').format(n)

  const quickLinks = [
    { to: '/hospital/ambulance/trips', label: 'New Trip', color: 'bg-sky-600' },
    { to: '/hospital/ambulance/master', label: 'Ambulances', color: 'bg-violet-600' },
    { to: '/hospital/ambulance/fuel', label: 'Add Fuel', color: 'bg-amber-600' },
    { to: '/hospital/ambulance/expenses', label: 'Expenses', color: 'bg-emerald-600' },
  ]

  const statusColors: Record<string, string> = {
    'Available': 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    'On Duty': 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
    'Maintenance': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  }

  const typeLabels: Record<string, string> = {
    'BLS': 'Basic Life Support',
    'ALS': 'Advanced Life Support',
    'Patient Transport': 'Patient Transport',
    'Neonatal': 'Neonatal',
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Ambulance Management</h2>
      <p className="mt-1 text-slate-500 dark:text-slate-400">Track ambulance movements, trips, fuel, and expenses</p>

      {loading ? (
        <div className="mt-8 text-center text-slate-500 dark:text-slate-400">Loading...</div>
      ) : (
        <>
          {/* Quick Actions */}
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {quickLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center justify-center gap-2 rounded-xl ${link.color} px-4 py-3 text-white shadow-sm transition hover:scale-[1.02] hover:shadow-md`}
              >
                <span className="font-medium">{link.label}</span>
              </Link>
            ))}
          </div>

          {/* Stats Grid - Row 1 */}
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="text-sm text-slate-500 dark:text-slate-400">Total Ambulances</div>
              <div className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.totalAmbulances}</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/30">
              <div className="text-sm text-emerald-600 dark:text-emerald-400">Available</div>
              <div className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.available}</div>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-900/30">
              <div className="text-sm text-sky-600 dark:text-sky-400">On Duty</div>
              <div className="mt-1 text-2xl font-bold text-sky-700 dark:text-sky-400">{stats.onDuty}</div>
            </div>
          </div>

          {/* Stats Grid - Row 2 */}
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/30">
              <div className="text-sm text-amber-600 dark:text-amber-400">Maintenance</div>
              <div className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.maintenance}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="text-sm text-slate-500 dark:text-slate-400">Today's Trips</div>
              <div className="mt-1 text-2xl font-bold text-violet-600 dark:text-violet-400">{stats.todayTrips}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="text-sm text-slate-500 dark:text-slate-400">Total Expenses</div>
              <div className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(stats.monthExpenses)}</div>
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="text-sm text-slate-500 dark:text-slate-400">Monthly Trips</div>
              <div className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">{formatNumber(stats.monthTrips)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="text-sm text-slate-500 dark:text-slate-400">Distance (km)</div>
              <div className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">{formatNumber(stats.monthDistance)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="text-sm text-slate-500 dark:text-slate-400">Fuel Cost</div>
              <div className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(stats.monthFuel)}</div>
            </div>
          </div>

          {/* Active Trips */}
          {stats.activeTrips.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Active Trips</h3>
              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-700 dark:bg-slate-800/50">
                      <th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400">Ambulance</th>
                      <th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400">Patient</th>
                      <th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400">Destination</th>
                      <th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400">Departed</th>
                      <th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.activeTrips.map(trip => (
                      <tr key={trip.id} className="border-b border-slate-100 dark:border-slate-700 dark:hover:bg-slate-700/50 transition">
                        <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">{trip.vehicleNumber}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{trip.patientName || '-'}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{trip.destination}</td>
                        <td className="px-4 py-2 text-slate-500 dark:text-slate-500">{new Date(trip.departureTime).toLocaleString()}</td>
                        <td className="px-4 py-2">
                          <Link to={`/hospital/ambulance/trips?id=${trip.id}`} className="text-sky-600 hover:underline dark:text-sky-400">Complete</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ambulance Fleet Status */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Fleet Status</h3>
              <Link to="/hospital/ambulance/master" className="text-sm text-sky-600 hover:underline dark:text-sky-400">Manage Ambulances →</Link>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {ambulances.map(amb => (
                <div key={amb.id} className={`rounded-lg border p-4 ${statusColors[amb.status]}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-lg font-bold dark:text-slate-100">{amb.vehicleNumber}</div>
                      <div className="text-sm opacity-75 dark:text-slate-400">{typeLabels[amb.type]}</div>
                    </div>
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-white/50 dark:bg-slate-800/50">{amb.status}</span>
                  </div>
                  <div className="mt-3 text-sm">
                    <div className="opacity-75 dark:text-slate-400">Driver: {amb.driverName}</div>
                    <div className="opacity-75 dark:text-slate-400">{amb.driverContact}</div>
                  </div>
                </div>
              ))}
              {ambulances.length === 0 && (
                <div className="col-span-full rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  No ambulances registered. <Link to="/hospital/ambulance/master" className="text-sky-600 hover:underline dark:text-sky-400">Add one now</Link>
                </div>
              )}
            </div>
          </div>

          {/* Reports Links */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Reports & Analytics</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <Link to="/hospital/ambulance/reports?type=usage" className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                Usage Report
              </Link>
              <Link to="/hospital/ambulance/reports?type=trips" className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                Trip History
              </Link>
              <Link to="/hospital/ambulance/reports?type=fuel" className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                Fuel Report
              </Link>
              <Link to="/hospital/ambulance/reports?type=expenses" className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                Expense Report
              </Link>
              <Link to="/hospital/ambulance/reports?type=cost-per-km" className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                Cost/Km Analysis
              </Link>
              <Link to="/hospital/ambulance/reports?type=patient-transport" className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                Patient Transport
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
