import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { campApi } from '../../features/camp/camp.api'
import {
  LayoutDashboard, Users, Stethoscope, FileText, FlaskConical, Microscope,
  Pill, CalendarDays, ArrowRight, TrendingUp, Activity, MapPin,
} from 'lucide-react'

export default function Camp_Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<any>({})
  const [camps, setCamps] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [s, c, p] = await Promise.all([
          campApi.getDashboardStats(),
          campApi.listCamps({ status: 'active' }),
          campApi.listPatients(),
        ])
        setStats(s || {})
        setCamps((c as any)?.items || [])
        setPatients((p as any)?.items?.slice(0, 10) || [])
      } catch (err: any) {
        setError(err?.message || 'Failed to load dashboard data')
      }
      setLoading(false)
    }
    load()
  }, [])

  const statCards = [
    { label: 'Active Camps', value: stats.activeCamps || 0, icon: LayoutDashboard, tone: 'emerald' },
    { label: 'Total Patients', value: stats.totalPatientsAllTime || 0, icon: Users, tone: 'sky' },
    { label: 'Patients This Month', value: stats.totalPatientsThisMonth || 0, icon: Activity, tone: 'amber' },
    { label: 'Total Camps', value: stats.totalCamps || 0, icon: CalendarDays, tone: 'violet' },
  ]

  const quickActions = [
    { label: 'New Patient', icon: Users, to: '/camp/patients', color: 'bg-emerald-600' },
    { label: 'Consultation', icon: Stethoscope, to: '/camp/consultations', color: 'bg-sky-600' },
    { label: 'Prescription', icon: FileText, to: '/camp/prescriptions', color: 'bg-amber-600' },
    { label: 'Lab Order', icon: FlaskConical, to: '/camp/lab-orders', color: 'bg-violet-600' },
    { label: 'Diagnostic', icon: Microscope, to: '/camp/diagnostics', color: 'bg-teal-600' },
    { label: 'Dispensing', icon: Pill, to: '/camp/dispensing', color: 'bg-rose-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Medical Camp Dashboard</h1>
        <button onClick={() => navigate('/camp/schedule')} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          <CalendarDays className="h-4 w-4" />
          New Camp
        </button>
      </div>

      {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{card.value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${card.tone}-100 text-${card.tone}-600`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-800">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map(action => {
            const Icon = action.icon
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.to)}
                className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:shadow-md hover:scale-[1.02]"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${action.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-slate-700">{action.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Active Camps */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Active Camps
          </h2>
          <button onClick={() => navigate('/camp/schedule')} className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            View All <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">Loading...</div>
          ) : camps.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No active camps</div>
          ) : (
            <div className="space-y-3">
              {camps.map((camp: any) => (
                <div key={camp._id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{camp.name}</p>
                      <p className="text-xs text-slate-500">{camp.location} • {new Date(camp.startDate).toLocaleDateString()} - {new Date(camp.endDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/camp/schedule?id=${camp._id}`)} className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">
                    Open
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Patients */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">Recent Patients</h2>
          <button onClick={() => navigate('/camp/patients')} className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            View All <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Token</th>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Age/Gender</th>
                <th className="px-6 py-3 font-medium">Complaint</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No patients yet</td></tr>
              ) : (
                patients.map((p: any) => (
                  <tr key={p._id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/camp/patients`)}>
                    <td className="px-6 py-3 font-medium text-slate-800">{p.tokenNo}</td>
                    <td className="px-6 py-3">{p.fullName}</td>
                    <td className="px-6 py-3 text-slate-500">{p.age} / {p.gender}</td>
                    <td className="px-6 py-3 text-slate-500 max-w-xs truncate">{p.chiefComplaint || '-'}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${p.consultedBy ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {p.consultedBy ? 'Consulted' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
