import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { 
  Activity, 
  Calendar, 
  Users, 
  AlertTriangle,
  DoorOpen,
  Scissors,
  ClipboardList
} from 'lucide-react'

type OTRoom = {
  _id: string
  name: string
  type?: string
  status: 'available' | 'occupied' | 'maintenance'
}

export default function Hospital_OTDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rooms, setRooms] = useState<OTRoom[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => { load() }, [selectedDate])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const roomsRes = await hospitalApi.listOTRooms({ limit: 50 }) as any
      setRooms(roomsRes?.rooms || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load OT dashboard')
    } finally {
      setLoading(false)
    }
  }

  // Stats
  const stats = {
    availableRooms: rooms.filter(r => r.status === 'available').length,
    occupiedRooms: rooms.filter(r => r.status === 'occupied').length,
    maintenanceRooms: rooms.filter(r => r.status === 'maintenance').length,
  }


  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl bg-linear-to-r from-violet-600 via-purple-600 to-indigo-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="max-w-xl">
            <h1 className="text-2xl font-bold">Operation Theater</h1>
            <p className="mt-1 text-sm/6 opacity-90">Manage surgical scheduling, OT rooms, and team assignments.</p>
          </div>
          <div className="hidden md:block">
            <Scissors className="h-20 w-20 opacity-30" />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading...</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Available Rooms" value={stats.availableRooms} icon={<DoorOpen className="h-5 w-5 text-emerald-500" />} />
        <StatCard label="Occupied Rooms" value={stats.occupiedRooms} icon={<Activity className="h-5 w-5 text-amber-500" />} />
        <StatCard label="Under Maintenance" value={stats.maintenanceRooms} icon={<AlertTriangle className="h-5 w-5 text-slate-500" />} />
      </div>

      {/* Date Selector & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/hospital/ot/rooms')}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <DoorOpen className="h-4 w-4" />
            Manage Rooms
          </button>
          <button
            onClick={() => navigate('/hospital/ot/schedule')}
            className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Calendar className="h-4 w-4" />
            Schedule & Bookings
          </button>
        </div>
      </div>

      {/* OT Rooms Status */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-800">OT Rooms Status</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {rooms.map((room) => (
            <div
              key={room._id}
              className={`rounded-lg border p-3 ${
                room.status === 'available' ? 'border-green-200 bg-green-50' :
                room.status === 'occupied' ? 'border-amber-200 bg-amber-50' :
                'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800">{room.name}</span>
                <span className={`h-2 w-2 rounded-full ${
                  room.status === 'available' ? 'bg-green-500' :
                  room.status === 'occupied' ? 'bg-amber-500' :
                  'bg-slate-400'
                }`} />
              </div>
              <div className="mt-1 text-xs text-slate-500 capitalize">{room.status}</div>
              {room.type && <div className="text-xs text-slate-400">{room.type}</div>}
            </div>
          ))}
          {rooms.length === 0 && (
            <div className="col-span-full py-4 text-center text-sm text-slate-500">
              No OT rooms configured. <button onClick={() => navigate('/hospital/ot/rooms')} className="text-purple-600 hover:underline">Add rooms</button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickLink
          icon={<ClipboardList className="h-6 w-6" />}
          label="Sterilization Logs"
          onClick={() => navigate('/hospital/ot/sterilization')}
        />
        <QuickLink
          icon={<Users className="h-6 w-6" />}
          label="Team Assignments"
          onClick={() => navigate('/hospital/ot/team')}
        />
        <QuickLink
          icon={<Activity className="h-6 w-6" />}
          label="Equipment Status"
          onClick={() => navigate('/hospital/ot/equipment')}
        />
        <QuickLink
          icon={<ClipboardList className="h-6 w-6" />}
          label="PHC Reports"
          onClick={() => navigate('/hospital/ot/reports')}
        />
        <QuickLink
          icon={<Activity className="h-6 w-6" />}
          label="SSI Tracking"
          onClick={() => navigate('/hospital/ot/ssi-tracking')}
        />
        <QuickLink
          icon={<Scissors className="h-6 w-6" />}
          label="Procedures"
          onClick={() => navigate('/hospital/ot/procedures')}
        />
      </div>

        </>
      )}
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) {
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

function QuickLink({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-slate-700 hover:bg-slate-50 hover:border-purple-300"
    >
      <div className="text-purple-500">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
