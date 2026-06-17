import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { otApi } from '../../../features/hospital/ot'
import { ArrowLeft, AlertCircle, Calendar, Clock, Shield } from 'lucide-react'

interface SSICase {
  _id: string
  bookingId: string
  patientId: { fullName: string; mrNumber?: string }
  procedure: string
  surgeryDate: string
  ssiDetected: boolean
  ssiDetectedAt?: string
  daysToDetection?: number
  ssiType: string
  followUpDate30Day?: string
  followUpDate90Day?: string
  followUpCompleted30Day: boolean
  followUpCompleted90Day: boolean
  outcome?: string
}

export default function OT_SSITracking() {
  const navigate = useNavigate()
  const [cases, setCases] = useState<SSICase[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'detected' | 'all'>('pending')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      // Load completed surgeries from last 90 days
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - 90)
      
      const [surgeriesRes, ssiRes] = await Promise.all([
        otApi.listOTBookings({ 
          status: 'completed', 
          from: fromDate.toISOString().split('T')[0],
          limit: 200 
        }) as any,
        otApi.getOTSSITracking?.({ limit: 200 }) as any
      ])
      
      const surgeriesData = surgeriesRes?.bookings || []
      const ssiData = ssiRes?.cases || []
      
      // Merge surgery data with SSI tracking
      const merged = surgeriesData.map((surgery: any) => {
        const existing = ssiData.find((c: any) => c.bookingId === surgery._id)
        return existing || {
          _id: `temp-${surgery._id}`,
          bookingId: surgery._id,
          patientId: surgery.patientId || surgery.patientData,
          procedure: surgery.procedure,
          surgeryDate: surgery.scheduledAt || surgery.createdAt,
          ssiDetected: false,
          ssiType: 'none',
          followUpCompleted30Day: false,
          followUpCompleted90Day: false,
        }
      })
      
      setCases(merged)
    } catch {}
    setLoading(false)
  }

  const pendingCases = cases.filter(c => 
    !c.ssiDetected && 
    (!c.followUpCompleted30Day || !c.followUpCompleted90Day)
  )
  const detectedCases = cases.filter(c => c.ssiDetected)

  const displayCases = activeTab === 'pending' ? pendingCases : 
                       activeTab === 'detected' ? detectedCases : cases

  function openSSIModal(booking: any) {
    // Placeholder for future SSI detail modal
    console.log('Opening SSI modal for', booking._id)
  }

  function daysSinceSurgery(surgeryDate: string) {
    const days = Math.floor((new Date().getTime() - new Date(surgeryDate).getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  function getFollowUpStatus(c: SSICase) {
    const days = daysSinceSurgery(c.surgeryDate)
    if (days >= 90 && !c.followUpCompleted90Day) return { label: '90-day due', urgent: true, color: 'red' }
    if (days >= 30 && !c.followUpCompleted30Day) return { label: '30-day due', urgent: true, color: 'amber' }
    if (days < 30) return { label: `${30 - days} days to 30-day`, urgent: false, color: 'blue' }
    if (days < 90 && c.followUpCompleted30Day) return { label: `${90 - days} days to 90-day`, urgent: false, color: 'green' }
    return { label: 'Complete', urgent: false, color: 'green' }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/hospital/ot')} className="text-slate-600 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-800">SSI Tracking (NHSN/CDC)</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Surgeries (90d)" value={cases.length} icon={<Calendar className="h-5 w-5 text-blue-500" />} />
        <StatCard label="SSI Detected" value={detectedCases.length} icon={<AlertCircle className="h-5 w-5 text-red-500" />} />
        <StatCard label="SSI Rate" value={`${cases.length > 0 ? ((detectedCases.length / cases.length) * 100).toFixed(1) : 0}%`} icon={<Shield className="h-5 w-5 text-amber-500" />} />
        <StatCard label="Pending Follow-up" value={pendingCases.length} icon={<Clock className="h-5 w-5 text-purple-500" />} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <TabButton active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} label={`Pending Follow-up (${pendingCases.length})`} />
        <TabButton active={activeTab === 'detected'} onClick={() => setActiveTab('detected')} label={`SSI Cases (${detectedCases.length})`} />
        <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label={`All (${cases.length})`} />
      </div>

      {/* Cases Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading...</div>
        ) : displayCases.length === 0 ? (
          <div className="py-8 text-center text-slate-500">No cases found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2 text-left">Patient</th>
                  <th className="px-3 py-2 text-left">Procedure</th>
                  <th className="px-3 py-2 text-left">Surgery Date</th>
                  <th className="px-3 py-2 text-left">Days Post-op</th>
                  <th className="px-3 py-2 text-left">SSI Status</th>
                  <th className="px-3 py-2 text-left">Follow-up</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayCases.map((c) => {
                  const days = daysSinceSurgery(c.surgeryDate)
                  const followUp = getFollowUpStatus(c)
                  
                  return (
                    <tr key={c._id} className={`border-b border-slate-100 hover:bg-slate-50 ${c.ssiDetected ? 'bg-red-50' : ''}`}>
                      <td className="px-3 py-2">
                        <div className="font-medium">{c.patientId?.fullName || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{c.patientId?.mrNumber || ''}</div>
                      </td>
                      <td className="px-3 py-2">{c.procedure}</td>
                      <td className="px-3 py-2">{new Date(c.surgeryDate).toLocaleDateString()}</td>
                      <td className="px-3 py-2">{days} days</td>
                      <td className="px-3 py-2">
                        {c.ssiDetected ? (
                          <div className="flex flex-col gap-1">
                            <span className="rounded px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 w-fit">
                              SSI Detected
                            </span>
                            <span className="text-xs text-slate-500">
                              Day {c.daysToDetection} • {c.ssiType?.replace('-', ' ')}
                            </span>
                          </div>
                        ) : (
                          <span className="rounded px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 w-fit">
                            No SSI
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium w-fit ${
                          followUp.color === 'red' ? 'bg-red-100 text-red-700' :
                          followUp.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                          followUp.color === 'green' ? 'bg-green-100 text-green-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {followUp.label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => openSSIModal(c)}
                          className="text-xs rounded-md bg-purple-600 px-2 py-1 text-white hover:bg-purple-700"
                        >
                          {c.ssiDetected ? 'View/Update' : 'Record SSI'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">{label}</div>
        {icon}
      </div>
      <div className="mt-1 text-2xl font-semibold text-slate-800">{value}</div>
    </div>
  )
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  )
}
