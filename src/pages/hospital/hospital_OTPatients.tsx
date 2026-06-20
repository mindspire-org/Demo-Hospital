import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { otApi } from '../../utils/api'
import { Users, Calendar, Search, Filter } from 'lucide-react'

type OTBooking = {
  _id: string
  encounterId?: string | { _id: string }
  patientId?: { _id: string; fullName?: string; mrNumber?: string; age?: number; gender?: string }
  patientData?: { fullName?: string; mrNumber?: string; age?: number; gender?: string }
  procedure: string
  surgeryType?: string
  roomId?: { _id: string; name?: string }
  surgeonId?: { _id: string; name?: string }
  scheduledAt?: string
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'postponed'
  priority?: 'routine' | 'urgent' | 'emergency'
  estimatedDuration?: number
  anesthesiaType?: string
  createdAt?: string
}

export default function Hospital_OTPatients() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookings, setBookings] = useState<OTBooking[]>([])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => { load() }, [statusFilter, from, to])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const params: any = { limit: 200, from, to }
      if (statusFilter) params.status = statusFilter
      const res = await otApi.listOTBookings(params) as any
      setBookings(res?.bookings || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load OT patients')
    } finally {
      setLoading(false)
    }
  }

  const filtered = bookings.filter(b => {
    const patientName = b.patientId?.fullName || b.patientData?.fullName || ''
    const mrNumber = b.patientId?.mrNumber || b.patientData?.mrNumber || ''
    const procedure = b.procedure || ''
    const search = q.toLowerCase()
    return patientName.toLowerCase().includes(search) ||
           mrNumber.toLowerCase().includes(search) ||
           procedure.toLowerCase().includes(search)
  })

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-700',
      'in-progress': 'bg-amber-100 text-amber-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      postponed: 'bg-yellow-100 text-yellow-700',
    }
    return map[status] || 'bg-slate-100 text-slate-700'
  }

  const getPriorityBadge = (p?: string) => {
    const map: Record<string, string> = {
      routine: 'bg-slate-100 text-slate-600',
      urgent: 'bg-orange-100 text-orange-700',
      emergency: 'bg-red-100 text-red-700',
    }
    return map[p || 'routine'] || 'bg-slate-100 text-slate-600'
  }

  const getEncounterId = (b: OTBooking): string => {
    const e = b.encounterId as any
    return String(e?._id || e || '')
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl bg-linear-to-r from-violet-600 via-purple-600 to-indigo-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="max-w-xl">
            <h1 className="text-2xl font-bold">OT Patients</h1>
            <p className="mt-1 text-sm/6 opacity-90">View all surgery bookings and patient cases in the operation theater.</p>
          </div>
          <div className="hidden md:block">
            <Users className="h-16 w-16 opacity-30" />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm">{error}</div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search patient, MR#, procedure..."
            className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="postponed">Postponed</option>
          </select>
        </div>
        <input
          type="date"
          value={from}
          onChange={e => setFrom(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={to}
          onChange={e => setTo(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={() => navigate('/hospital/ot/schedule')}
          className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
        >
          <Calendar className="h-4 w-4" />
          New Booking
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading...</div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-3 py-2 text-left font-medium text-slate-600">Patient</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Procedure</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Type</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Room</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Surgeon</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Scheduled</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Priority</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b._id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-800">
                      {b.patientId?.fullName || b.patientData?.fullName || 'Unknown'}
                    </div>
                    <div className="text-xs text-slate-500">
                      MR#: {b.patientId?.mrNumber || b.patientData?.mrNumber || '-'} | {b.patientId?.age || b.patientData?.age || '?'}y {b.patientId?.gender || b.patientData?.gender || ''}
                    </div>
                  </td>
                  <td className="px-3 py-2 max-w-xs truncate">{b.procedure}</td>
                  <td className="px-3 py-2 capitalize">{b.surgeryType || '-'}</td>
                  <td className="px-3 py-2">{b.roomId?.name || '-'}</td>
                  <td className="px-3 py-2">{b.surgeonId?.name || '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {b.scheduledAt ? new Date(b.scheduledAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${getStatusBadge(b.status)}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${getPriorityBadge(b.priority)}`}>
                      {b.priority || 'routine'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {getEncounterId(b) && (
                        <button
                          onClick={() => navigate(`/hospital/patient/${getEncounterId(b)}`)}
                          className="rounded px-2 py-1 text-xs text-purple-600 hover:bg-purple-50"
                        >
                          Profile
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/hospital/ot/billing?booking=${b._id}`)}
                        className="rounded px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50"
                      >
                        Bill
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                    No OT patients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
