import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../../utils/api'
import { ArrowLeft, FileText, BarChart3, Users, Bed, Activity, AlertCircle, Calendar, Download, TrendingUp, Wind, Clock } from 'lucide-react'

export default function ICU_Reports() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [activeTab, setActiveTab] = useState<'overview' | 'admissions' | 'outcomes'>('overview')

  useEffect(() => {
    loadStatistics()
  }, [dateRange])

  async function loadStatistics() {
    setLoading(true)
    try {
      const params: any = {}
      if (dateRange.from) params.from = dateRange.from
      if (dateRange.to) params.to = dateRange.to
      const res = await hospitalApi.getICUStatistics(params) as any
      setStats(res)
    } catch {}
    setLoading(false)
  }

  function exportCSV() {
    if (!stats) return
    const csv = [
      ['Metric', 'Value'],
      ['Total Beds', stats.beds?.total || 0],
      ['Occupied Beds', stats.beds?.occupied || 0],
      ['Available Beds', stats.beds?.available || 0],
      ['Active Admissions', stats.admissions?.active || 0],
      ['Average LOS (hours)', stats.averageLOS?.toFixed(1) || 'N/A'],
      ['Mortality Rate', `${stats.mortalityRate?.toFixed(1) || 0}%`],
    ].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `icu-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const bedOccupancy = stats?.beds ? (stats.beds.occupied / (stats.beds.total || 1)) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/hospital/icu')} className="text-slate-600 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-800">ICU Reports & Analytics</h1>
        <button
          onClick={exportCSV}
          disabled={!stats || loading}
          className="ml-auto inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm text-white hover:bg-rose-700 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Date Filter */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <Calendar className="h-5 w-5 text-slate-500" />
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">From:</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">To:</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        {(dateRange.from || dateRange.to) && (
          <button
            onClick={() => setDateRange({ from: '', to: '' })}
            className="ml-2 text-sm text-slate-500 hover:text-slate-700"
          >
            Clear
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'admissions', label: 'Admissions', icon: Users },
          { key: 'outcomes', label: 'Outcomes', icon: Activity },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === key
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading statistics...</div>
      ) : !stats ? (
        <div className="py-12 text-center text-slate-500">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          Failed to load statistics
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={Bed}
                label="Total Beds"
                value={stats.beds?.total || 0}
                subtext={`${stats.beds?.available || 0} available`}
                color="blue"
              />
              <StatCard
                icon={Users}
                label="Active Admissions"
                value={stats.admissions?.active || 0}
                subtext={`${stats.beds?.occupied || 0} beds occupied`}
                color="green"
              />
              <StatCard
                icon={Clock}
                label="Average LOS"
                value={stats.averageLOS ? `${stats.averageLOS.toFixed(1)}h` : 'N/A'}
                subtext="Length of stay"
                color="purple"
              />
              <StatCard
                icon={Activity}
                label="Mortality Rate"
                value={`${stats.mortalityRate?.toFixed(1) || 0}%`}
                subtext="ICU mortality"
                color={stats.mortalityRate > 10 ? 'red' : 'green'}
              />

              {/* Bed Occupancy */}
              <div className="md:col-span-2 lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-4 flex items-center gap-2 font-medium text-slate-800">
                  <BarChart3 className="h-5 w-5" />
                  Bed Occupancy
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Occupancy Rate</span>
                      <span className="font-medium">{bedOccupancy.toFixed(1)}%</span>
                    </div>
                    <div className="mt-1 h-3 rounded-full bg-slate-100">
                      <div
                        className={`h-3 rounded-full transition-all ${bedOccupancy > 90 ? 'bg-red-500' : bedOccupancy > 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(bedOccupancy, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-lg bg-slate-50 p-2">
                      <div className="text-lg font-bold text-slate-800">{stats.beds?.occupied || 0}</div>
                      <div className="text-xs text-slate-500">Occupied</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <div className="text-lg font-bold text-slate-800">{stats.beds?.available || 0}</div>
                      <div className="text-xs text-slate-500">Available</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <div className="text-lg font-bold text-slate-800">{stats.beds?.maintenance || 0}</div>
                      <div className="text-xs text-slate-500">Maintenance</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ventilator Usage */}
              <div className="md:col-span-2 lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-4 flex items-center gap-2 font-medium text-slate-800">
                  <Wind className="h-5 w-5" />
                  Ventilator Usage
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-blue-50 p-3">
                    <div className="text-2xl font-bold text-blue-700">{stats.admissions?.onVentilator || 0}</div>
                    <div className="text-sm text-blue-600">Patients on Ventilator</div>
                  </div>
                  <div className="rounded-lg bg-orange-50 p-3">
                    <div className="text-2xl font-bold text-orange-700">
                      {stats.admissions?.active ? ((stats.admissions.onVentilator / stats.admissions.active) * 100).toFixed(0) : 0}%
                    </div>
                    <div className="text-sm text-orange-600">Ventilator Utilization</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admissions' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Severity Breakdown */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-4 flex items-center gap-2 font-medium text-slate-800">
                  <AlertCircle className="h-5 w-5" />
                  Severity Distribution
                </h3>
                {stats.admissions?.severityBreakdown ? (
                  <div className="space-y-2">
                    {Object.entries(stats.admissions.severityBreakdown).map(([severity, count]: [string, any]) => {
                      const total = stats.admissions?.active || 1
                      const pct = (count / total) * 100
                      const colors: Record<string, string> = {
                        critical: 'bg-red-500',
                        severe: 'bg-orange-500',
                        moderate: 'bg-yellow-500',
                        mild: 'bg-green-500',
                      }
                      return (
                        <div key={severity}>
                          <div className="flex justify-between text-sm">
                            <span className="capitalize text-slate-600">{severity}</span>
                            <span className="font-medium">{count} ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-slate-100">
                            <div className={`h-2 rounded-full ${colors[severity] || 'bg-slate-500'}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-4 text-center text-sm text-slate-500">No severity data available</div>
                )}
              </div>

              {/* Admission Trends */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-4 flex items-center gap-2 font-medium text-slate-800">
                  <TrendingUp className="h-5 w-5" />
                  Admission Trends
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-green-50 p-3 text-center">
                    <div className="text-2xl font-bold text-green-700">{stats.admissions?.today || 0}</div>
                    <div className="text-sm text-green-600">Today</div>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-3 text-center">
                    <div className="text-2xl font-bold text-blue-700">{stats.admissions?.thisWeek || 0}</div>
                    <div className="text-sm text-blue-600">This Week</div>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-3 text-center">
                    <div className="text-2xl font-bold text-purple-700">{stats.admissions?.thisMonth || 0}</div>
                    <div className="text-sm text-purple-600">This Month</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 text-center">
                    <div className="text-2xl font-bold text-slate-700">{stats.admissions?.total || 0}</div>
                    <div className="text-sm text-slate-600">Total</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'outcomes' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Discharge Destinations */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-4 flex items-center gap-2 font-medium text-slate-800">
                  <FileText className="h-5 w-5" />
                  Discharge Destinations
                </h3>
                {stats.dischargeDestinations ? (
                  <div className="space-y-3">
                    {Object.entries(stats.dischargeDestinations).map(([dest, count]: [string, any]) => {
                      const labels: Record<string, string> = {
                        ward: 'General Ward',
                        home: 'Home',
                        'other-hospital': 'Other Hospital',
                        deceased: 'Deceased',
                      }
                      const colors: Record<string, string> = {
                        ward: 'bg-green-100 text-green-700',
                        home: 'bg-blue-100 text-blue-700',
                        'other-hospital': 'bg-purple-100 text-purple-700',
                        deceased: 'bg-red-100 text-red-700',
                      }
                      return (
                        <div key={dest} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                          <span className={`rounded px-2 py-1 text-sm ${colors[dest] || 'bg-slate-100'}`}>
                            {labels[dest] || dest}
                          </span>
                          <span className="font-medium text-slate-800">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-4 text-center text-sm text-slate-500">No discharge data available</div>
                )}
              </div>

              {/* Mortality Analysis */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-4 flex items-center gap-2 font-medium text-slate-800">
                  <Activity className="h-5 w-5" />
                  Mortality Analysis
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-24 w-24 rounded-full border-4 border-slate-100 relative">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-red-500"
                          strokeDasharray={`${stats.mortalityRate || 0}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold text-slate-800">{stats.mortalityRate?.toFixed(1) || 0}%</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600">ICU Mortality Rate</div>
                      <div className="text-xs text-slate-500">Based on total discharges</div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3">
                    <div className="text-sm text-red-800">
                      <strong>Deceased:</strong> {stats.dischargeDestinations?.deceased || 0} patients
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, subtext, color }: { icon: any; label: string; value: string | number; subtext: string; color: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700' },
    green: { bg: 'bg-green-50', text: 'text-green-700' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700' },
    red: { bg: 'bg-red-50', text: 'text-red-700' },
  }
  const c = colors[color] || colors.blue
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg ${c.bg} p-2`}>
          <Icon className={`h-5 w-5 ${c.text}`} />
        </div>
        <div>
          <div className="text-sm text-slate-600">{label}</div>
          <div className="text-2xl font-bold text-slate-800">{value}</div>
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-500">{subtext}</div>
    </div>
  )
}
