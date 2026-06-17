import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Activity, 
  ArrowLeft, 
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  Award,
  Calendar,
  Star
} from 'lucide-react'
import { hospitalApi } from '../../utils/api'

interface PerformanceData {
  items: Array<{
    _id: string
    period: string
    date: string
    performanceScore: number
    rating: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement' | 'poor'
    completionRate: number
    totalTasksCompleted: number
    attendanceRate: number
    patientSatisfactionScore: number
    taskScore: number
    qualityScore: number
    attendanceScore: number
    clinicalScore: number
  }>
  summary: {
    totalTasksCompleted: number
    completionRate: number
    attendanceRate: number
    patientSatisfactionScore: number
    rating: string
  } | null
  averageScore: number
}

const ratingColors: Record<string, string> = {
  excellent: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  good: 'bg-blue-100 text-blue-700 border-blue-200',
  satisfactory: 'bg-amber-100 text-amber-700 border-amber-200',
  needs_improvement: 'bg-orange-100 text-orange-700 border-orange-200',
  poor: 'bg-red-100 text-red-700 border-red-200'
}

const ratingLabels: Record<string, string> = {
  excellent: 'Excellent',
  good: 'Good',
  satisfactory: 'Satisfactory',
  needs_improvement: 'Needs Improvement',
  poor: 'Poor'
}

export default function Hospital_NursePerformance() {
  const navigate = useNavigate()
  const [performance, setPerformance] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly')

  useEffect(() => {
    const session = localStorage.getItem('hospital.session')
    if (!session) {
      navigate('/hospital/nurse/login')
      return
    }
    loadPerformance()
  }, [navigate, period])

  const loadPerformance = async () => {
    try {
      setLoading(true)
      const res: any = await hospitalApi.getMyNursePerformance({ period, limit: 12 })
      setPerformance(res)
    } catch (e) {
      console.error('Failed to load performance:', e)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/hospital/nurse/dashboard')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                <Activity className="w-5 h-5 text-rose-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-800">My Performance</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p 
                    ? 'bg-rose-100 text-rose-700' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
          </div>
        ) : !performance || performance.items.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-700">No performance data</h3>
            <p className="text-slate-500">Performance metrics will be calculated as you complete tasks.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overall Score Card */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1 bg-linear-to-br from-rose-500 to-rose-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-rose-100">Overall Score</h3>
                  <Award className="w-6 h-6 text-rose-200" />
                </div>
                <div className="text-5xl font-bold mb-2">
                  {performance.summary?.rating ? performance.averageScore : 0}
                </div>
                <div className="text-rose-100 text-sm">
                  {performance.summary?.rating ? ratingLabels[performance.summary.rating] : 'No rating yet'}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm text-slate-500">Completion Rate</span>
                </div>
                <div className="text-3xl font-bold text-slate-800">
                  {performance.summary?.completionRate || 0}%
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {performance.summary?.totalTasksCompleted || 0} tasks completed
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-slate-500">Attendance Rate</span>
                </div>
                <div className="text-3xl font-bold text-slate-800">
                  {performance.summary?.attendanceRate || 0}%
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  Shift attendance
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-5 h-5 text-amber-500" />
                  <span className="text-sm text-slate-500">Patient Satisfaction</span>
                </div>
                <div className="text-3xl font-bold text-slate-800">
                  {performance.summary?.patientSatisfactionScore || 0}/5
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  Based on feedback
                </div>
              </div>
            </div>

            {/* Component Scores */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-6">Performance Components</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {performance.items[0] && [
                  { label: 'Task Score', value: performance.items[0].taskScore, icon: CheckCircle2, color: 'emerald' },
                  { label: 'Quality Score', value: performance.items[0].qualityScore, icon: Award, color: 'blue' },
                  { label: 'Attendance', value: performance.items[0].attendanceScore, icon: Clock, color: 'amber' },
                  { label: 'Clinical', value: performance.items[0].clinicalScore, icon: Activity, color: 'rose' },
                ].map((item, index) => {
                  const Icon = item.icon
                  return (
                    <div key={index} className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-4 h-4 text-${item.color}-500`} />
                        <span className="text-sm text-slate-500">{item.label}</span>
                      </div>
                      <div className="text-2xl font-bold text-slate-800">{item.value}</div>
                      <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                        <div 
                          className={`bg-${item.color}-500 h-2 rounded-full transition-all`}
                          style={{ width: `${Math.min(item.value, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-800">Performance History</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rating</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tasks</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Completion</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {performance.items.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-700">{formatDate(item.date)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{item.performanceScore}</span>
                            {item.performanceScore >= performance.averageScore ? (
                              <TrendingUp className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${ratingColors[item.rating]}`}>
                            {ratingLabels[item.rating]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-700">{item.totalTasksCompleted}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-200 rounded-full h-2">
                              <div 
                                className="bg-emerald-500 h-2 rounded-full"
                                style={{ width: `${item.completionRate}%` }}
                              />
                            </div>
                            <span className="text-sm text-slate-600">{item.completionRate}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm ${item.attendanceRate >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {item.attendanceRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Performance Tips */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
              <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <Award className="w-5 h-5" />
                Tips to Improve Your Performance
              </h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li>• Complete tasks within scheduled timeframes</li>
                <li>• Maintain high attendance and punctuality</li>
                <li>• Document all vitals and patient observations accurately</li>
                <li>• Communicate effectively during shift handovers</li>
                <li>• Follow medication administration protocols strictly</li>
                <li>• Seek feedback from supervisors regularly</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
