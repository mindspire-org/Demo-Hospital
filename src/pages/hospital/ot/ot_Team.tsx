import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { otApi } from '../../../features/hospital/ot'
import { ArrowLeft, Users, Calendar, Plus, X, Trash2 } from 'lucide-react'

type Booking = {
  _id: string
  procedure: string
  scheduledAt?: string
  status: string
  roomId?: { _id: string; name: string }
  surgeonId?: { _id: string; name: string }
  team?: Array<{ staffId: { _id: string; name: string }; role: string }>
}

const ROLES = [
  'surgeon', 'assistant-surgeon', 'anesthesiologist', 'anesthesia-tech',
  'scrub-nurse', 'circulating-nurse', 'ot-technician'
] as const

export default function OT_Team() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ staffId: '', role: 'scrub-nurse' as typeof ROLES[number] })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [schedRes, progRes, staffRes] = await Promise.all([
        otApi.listOTBookings({ status: 'scheduled', limit: 50 }) as any,
        otApi.listOTBookings({ status: 'in-progress', limit: 50 }) as any,
        fetch('/api/hospital/staff').then(r => r.json()).then((d: any) => d || []),
      ])
      setBookings([...(schedRes?.bookings || []), ...(progRes?.bookings || [])])
      setStaff(Array.isArray(staffRes) ? staffRes : (staffRes?.staff || []))
    } catch {}
    setLoading(false)
  }

  function openAddModal(booking: Booking) {
    setSelectedBooking(booking)
    setForm({ staffId: '', role: 'scrub-nurse' })
    setShowModal(true)
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBooking || !form.staffId) return
    try {
      await otApi.addOTTeamMember(selectedBooking._id, form)
      setShowModal(false)
      load()
    } catch (e: any) {
      alert(e?.message || 'Failed to add team member')
    }
  }

  async function removeMember(bookingId: string, staffId: string) {
    if (!confirm('Remove this team member?')) return
    try {
      await otApi.removeOTTeamMember(bookingId, staffId)
      load()
    } catch (e: any) {
      alert(e?.message || 'Failed to remove')
    }
  }

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    'in-progress': 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/hospital/ot')} className="text-slate-600 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-800">OT Team Assignments</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-500" />
            <span className="font-medium">Scheduled Surgeries</span>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading...</div>
        ) : bookings.length === 0 ? (
          <div className="py-8 text-center text-slate-500">No scheduled surgeries found.</div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking._id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{booking.procedure}</span>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[booking.status] || 'bg-slate-100 text-slate-700'}`}>
                        {booking.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {booking.scheduledAt ? new Date(booking.scheduledAt).toLocaleString() : 'Not scheduled'}
                      </div>
                      {booking.roomId && <span>Room: {booking.roomId.name}</span>}
                      {booking.surgeonId && <span>Surgeon: {booking.surgeonId.name}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => openAddModal(booking)}
                    className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-2 py-1 text-xs text-white hover:bg-purple-700"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>

                {/* Team Members */}
                <div className="mt-3">
                  <div className="text-xs font-medium text-slate-500 mb-1">Team Members:</div>
                  {booking.team && booking.team.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {booking.team.map((member, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm"
                        >
                          <span>{member.staffId?.name || 'Unknown'}</span>
                          <span className="text-xs text-slate-500">({member.role})</span>
                          <button
                            onClick={() => removeMember(booking._id, member.staffId?._id)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">No team members assigned</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Team Member Modal */}
      {showModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Add Team Member</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4 text-sm text-slate-600">
              <strong>Procedure:</strong> {selectedBooking.procedure}
            </div>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Staff Member</label>
                <select
                  value={form.staffId}
                  onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select Staff</option>
                  {staff.map((s: any) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as typeof ROLES[number] })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
