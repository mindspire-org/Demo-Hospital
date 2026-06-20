import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { BedDouble, ArrowLeft, AlertTriangle } from 'lucide-react'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

type Floor = { id: string; name: string; number?: string }
type Room = { id: string; name: string; floorId: string }
type Ward = { id: string; name: string; floorId: string }

type Bed = {
  id: string
  label: string
  floorId: string
  locationType: 'room' | 'ward'
  locationId: string
  status: 'available' | 'occupied'
  charges?: number
  category?: string
  occupantName?: string
  occupantMrn?: string
  occupantEncounterId?: string
  occupantEncounterType?: 'IPD' | 'ER'
}

export default function Hospital_ERBeds() {
  const navigate = useNavigate()
  const [floors, setFloors] = useState<Floor[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [wards, setWards] = useState<Ward[]>([])
  const [beds, setBeds] = useState<Bed[]>([])
  const [loading, setLoading] = useState(false)
  const [confirmFree, setConfirmFree] = useState<string | null>(null)

  useEffect(() => { void loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [fRes, rRes, wRes, bRes] = await Promise.all([
        hospitalApi.listFloors() as any,
        hospitalApi.listRooms() as any,
        hospitalApi.listWards() as any,
        hospitalApi.listBeds() as any,
      ])
      setFloors((fRes.floors || []).map((x: any) => ({ id: String(x._id), name: x.name, number: x.number })))
      setRooms((rRes.rooms || []).map((x: any) => ({ id: String(x._id), name: x.name, floorId: String(x.floorId) })))
      setWards((wRes.wards || []).map((x: any) => ({ id: String(x._id), name: x.name, floorId: String(x.floorId) })))
      setBeds((bRes.beds || []).map((x: any) => ({
        id: String(x._id),
        label: x.label,
        floorId: String(x.floorId),
        locationType: x.locationType,
        locationId: String(x.locationId),
        status: x.status,
        charges: x.charges,
        category: x.category,
        occupantName: x.occupantName,
        occupantMrn: x.occupantMrn,
        occupantEncounterId: x.occupantEncounterId ? String(x.occupantEncounterId) : undefined,
        occupantEncounterType: x.occupantEncounterType,
      })))
    } catch { /* ignore */ }
    setLoading(false)
  }

  const erBeds = useMemo(() => beds.filter(b => String(b.category || '').toUpperCase() === 'ER'), [beds])

  const floorsMap = useMemo(() => Object.fromEntries(floors.map(f => [f.id, f])), [floors])

  const groups = useMemo(() => {
    const byLocation: Record<string, { title: string; items: Bed[] }> = {}
    erBeds.forEach(b => {
      const key = `${b.locationType}:${b.locationId}`
      const locName = b.locationType === 'room'
        ? rooms.find(r => r.id === b.locationId)?.name
        : wards.find(w => w.id === b.locationId)?.name
      const floorName = floorsMap[b.floorId]?.name
      const title = locName ? `${locName} (${floorName || ''})` : `${b.locationType} (${floorName || ''})`
      if (!byLocation[key]) byLocation[key] = { title, items: [] }
      byLocation[key].items.push(b)
    })
    return byLocation
  }, [erBeds, rooms, wards, floorsMap])

  const stats = useMemo(() => {
    const total = erBeds.length
    const occupied = erBeds.filter(b => b.status === 'occupied').length
    const available = total - occupied
    return { total, occupied, available }
  }, [erBeds])

  async function freeBed(id: string) {
    await hospitalApi.updateBedStatus(id, { status: 'available' })
    setConfirmFree(null)
    await loadAll()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/hospital/bed-management')} className="text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BedDouble className="h-6 w-6 text-amber-500" />
            ER Bed Management
          </h1>
          <p className="text-sm text-slate-500">Emergency department bed occupancy and availability</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Total ER Beds</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">Available</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{stats.available}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-rose-600">Occupied</div>
          <div className="mt-1 text-2xl font-bold text-rose-700">{stats.occupied}</div>
        </div>
      </div>

      {loading && <div className="text-sm text-slate-500">Loading ER beds...</div>}

      {Object.entries(groups).map(([key, group]) => (
        <div key={key} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-base font-semibold text-slate-800">{group.title}</div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {group.items.map(b => (
              <div
                key={b.id}
                className={`rounded-xl border p-4 transition-all ${
                  b.status === 'occupied'
                    ? 'border-rose-200 bg-rose-50 cursor-pointer hover:shadow-md'
                    : 'border-emerald-200 bg-emerald-50'
                }`}
                onClick={() => {
                  if (b.status === 'occupied' && b.occupantEncounterId) {
                    navigate(`/hospital/emergency/${b.occupantEncounterId}`)
                  }
                }}
                role={b.status === 'occupied' && b.occupantEncounterId ? 'button' : undefined}
              >
                <div className={`text-3xl ${b.status === 'occupied' ? 'text-rose-500' : 'text-emerald-500'}`}>
                  <BedDouble className="h-8 w-8" />
                </div>
                <div className={`mt-2 text-xl font-bold ${b.status === 'occupied' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {b.label}
                </div>
                <div className={`text-sm font-medium ${b.status === 'occupied' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {b.status === 'occupied' ? 'Occupied' : 'Available'}
                </div>
                {b.charges != null && (
                  <div className="mt-1 text-xs text-slate-500">Rs {b.charges.toLocaleString()}/day</div>
                )}
                {b.status === 'occupied' && (
                  <div className="mt-2">
                    <div className="text-sm font-medium text-rose-700 truncate">{b.occupantName || '—'}</div>
                    {b.occupantMrn && <div className="text-[10px] text-rose-500">{b.occupantMrn}</div>}
                    <button
                      className="mt-2 w-full rounded-md bg-rose-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 hover:bg-rose-200 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setConfirmFree(b.id) }}
                    >
                      Free Bed
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {!loading && erBeds.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-slate-400">
          <AlertTriangle className="h-10 w-10 mb-3 opacity-40" />
          <div className="text-sm font-medium">No ER beds configured</div>
          <div className="mt-1 text-xs">Go to Bed Management and add beds with Category = ER</div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmFree}
        title="Free this bed?"
        message="This will mark the bed as available. Make sure the patient has been discharged or transferred."
        confirmText="Free Bed"
        onConfirm={() => confirmFree && freeBed(confirmFree)}
        onCancel={() => setConfirmFree(null)}
      />
    </div>
  )
}
