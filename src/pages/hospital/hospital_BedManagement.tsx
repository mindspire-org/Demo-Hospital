import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Hospital_AddFloorModal from '../../components/hospital/bed-management/Hospital_AddFloorModal'
import Hospital_AddRoomModal from '../../components/hospital/bed-management/Hospital_AddRoomModal'
import Hospital_AddWardModal from '../../components/hospital/bed-management/Hospital_AddWardModal'
import Hospital_ManageRoomsModal from '../../components/hospital/bed-management/Hospital_ManageRoomsModal'
import Hospital_ManageWardsModal from '../../components/hospital/bed-management/Hospital_ManageWardsModal'
import Hospital_ManageFloorsModal from '../../components/hospital/bed-management/Hospital_ManageFloorsModal'
import Hospital_ManageBedsModal from '../../components/hospital/bed-management/Hospital_ManageBedsModal'
import Hospital_AddBedModal from '../../components/hospital/bed-management/Hospital_AddBedModal'
import { hospitalApi } from '../../utils/api'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { Search, Plus, LayoutGrid, BedDouble, CheckCircle2, AlertCircle, Building2, DoorClosed, RefreshCw, Layers, Settings2, Home, Activity, ArrowRight, MapPin } from 'lucide-react'

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
}

// Remote-backed Bed Management (no localStorage)

export default function Hospital_BedManagement() {
  const navigate = useNavigate()
  const [floors, setFloors] = useState<Floor[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [wards, setWards] = useState<Ward[]>([])
  const [beds, setBeds] = useState<Bed[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{ void loadAll() }, [])
  async function loadAll(){
    setLoading(true)
    try {
      const [fRes, rRes, wRes, bRes] = await Promise.all([
        hospitalApi.listFloors() as any,
        hospitalApi.listRooms() as any,
        hospitalApi.listWards() as any,
        hospitalApi.listBeds() as any,
      ])
      setFloors((fRes.floors||[]).map((x:any)=>({ id: String(x._id), name: x.name, number: x.number })))
      setRooms((rRes.rooms||[]).map((x:any)=>({ id: String(x._id), name: x.name, floorId: String(x.floorId) })))
      setWards((wRes.wards||[]).map((x:any)=>({ id: String(x._id), name: x.name, floorId: String(x.floorId) })))
      setBeds((bRes.beds||[]).map((x:any)=>({ id: String(x._id), label: x.label, floorId: String(x.floorId), locationType: x.locationType, locationId: String(x.locationId), status: x.status, charges: x.charges, category: x.category, occupantName: x.occupantName, occupantMrn: x.occupantMrn, occupantEncounterId: x.occupantEncounterId ? String(x.occupantEncounterId) : undefined })))
    } finally { setLoading(false) }
  }

  const [filterFloor, setFilterFloor] = useState<string>('all')
  const [filterRoom, setFilterRoom] = useState<string>('all')
  const [filterWard, setFilterWard] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'occupied'>('all')
  const [q, setQ] = useState('')

  const filteredBeds = useMemo(() => {
    return beds.filter(b => {
      if (q.trim()){
        const s = q.trim().toLowerCase()
        const t = `${b.label} ${b.occupantName || ''} ${b.occupantMrn || ''} ${b.category || ''}`.toLowerCase()
        if (!t.includes(s)) return false
      }
      if (filterFloor !== 'all' && b.floorId !== filterFloor) return false
      if (filterRoom !== 'all' && b.locationType === 'room' && b.locationId !== filterRoom) return false
      if (filterWard !== 'all' && b.locationType === 'ward' && b.locationId !== filterWard) return false
      if (filterStatus !== 'all' && b.status !== filterStatus) return false
      return true
    })
  }, [beds, filterFloor, filterRoom, filterWard, filterStatus, q])

  const stats = useMemo(()=>{
    const total = beds.length
    const occ = beds.filter(b => b.status === 'occupied').length
    const avail = Math.max(0, total - occ)
    const occRate = total ? Math.round((occ / total) * 100) : 0
    return { total, occ, avail, occRate }
  }, [beds])

  const [openAddFloor, setOpenAddFloor] = useState(false)
  const [openAddRoom, setOpenAddRoom] = useState(false)
  const [openAddWard, setOpenAddWard] = useState(false)
  const [openManageRooms, setOpenManageRooms] = useState(false)
  const [openManageWards, setOpenManageWards] = useState(false)
  const [openAddBed, setOpenAddBed] = useState(false)
  const [openManageFloors, setOpenManageFloors] = useState(false)
  const [openManageBeds, setOpenManageBeds] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'floor'|'room'|'ward'|'bed'; id: string } | null>(null)

  

  const saveFloor = async (data: { name: string; number?: string }) => {
    await hospitalApi.createFloor({ name: data.name, number: data.number })
    setOpenAddFloor(false)
    await loadAll()
  }

  const saveRoom = async (data: { floorId: string; name: string }) => {
    await hospitalApi.createRoom({ floorId: data.floorId, name: data.name })
    setOpenAddRoom(false)
    await loadAll()
  }

  const saveWard = async (data: { floorId: string; name: string }) => {
    await hospitalApi.createWard({ floorId: data.floorId, name: data.name })
    setOpenAddWard(false)
    await loadAll()
  }

  const saveBeds = async (data: { floorId: string; locationType: 'room' | 'ward'; locationId: string; labels: string; charges?: string; category?: string }) => {
    const labels = data.labels.split(/\n|,/).map(s => s.trim()).filter(Boolean)
    if (!labels.length) return
    await hospitalApi.addBeds({ floorId: data.floorId, locationType: data.locationType, locationId: data.locationId, labels, charges: data.charges ? Number(data.charges) : undefined, category: data.category || undefined })
    setOpenAddBed(false)
    await loadAll()
  }

  const floorsMap = useMemo(() => Object.fromEntries(floors.map(f => [f.id, f])), [floors])
  const roomsByFloor = useMemo(() => floors.reduce<Record<string, Room[]>>((acc, f) => { acc[f.id] = rooms.filter(r => r.floorId === f.id); return acc }, {}), [floors, rooms])
  const wardsByFloor = useMemo(() => floors.reduce<Record<string, Ward[]>>((acc, f) => { acc[f.id] = wards.filter(w => w.floorId === f.id); return acc }, {}), [floors, wards])

  const groups = useMemo(() => {
    const byLocation: Record<string, { title: string; items: Bed[] }> = {}
    filteredBeds.forEach(b => {
      const key = `${b.locationType}:${b.locationId}`
      const locName = b.locationType === 'room' ? rooms.find(r => r.id === b.locationId)?.name : wards.find(w => w.id === b.locationId)?.name
      const floorName = floorsMap[b.floorId]?.name
      const title = locName ? `${locName} (${floorName || ''})` : `${b.locationType} (${floorName || ''})`
      if (!byLocation[key]) byLocation[key] = { title, items: [] }
      byLocation[key].items.push(b)
    })
    return byLocation
  }, [filteredBeds, rooms, wards, floorsMap])


  const updateFloor = async (id: string, data: { name?: string; number?: string }) => { await hospitalApi.updateFloor(id, data as any); await loadAll() }
  const removeFloor = async (id: string) => { setConfirmDelete({ kind: 'floor', id }) }

  const updateRoom = async (id: string, data: { name?: string; floorId?: string }) => { await hospitalApi.updateRoom(id, data as any); await loadAll() }
  const removeRoom = async (id: string) => { setConfirmDelete({ kind: 'room', id }) }

  const updateWard = async (id: string, data: { name?: string; floorId?: string }) => { await hospitalApi.updateWard(id, data as any); await loadAll() }
  const removeWard = async (id: string) => { setConfirmDelete({ kind: 'ward', id }) }

  const updateBed = async (id: string, data: { label?: string; charges?: number; category?: string }) => { await hospitalApi.updateBed(id, data as any); await loadAll() }
  const removeBed = async (id: string) => { setConfirmDelete({ kind: 'bed', id }) }

  const [confirmFreeBed, setConfirmFreeBed] = useState<string | null>(null)
  const freeBed = async (id: string) => {
    await hospitalApi.updateBedStatus(id, { status: 'available' })
    setConfirmFreeBed(null)
    await loadAll()
  }

  const confirmDeleteNow = async () => {
    const target = confirmDelete
    setConfirmDelete(null)
    if (!target?.id) return
    if (target.kind === 'floor') await hospitalApi.deleteFloor(target.id)
    if (target.kind === 'room') await hospitalApi.deleteRoom(target.id)
    if (target.kind === 'ward') await hospitalApi.deleteWard(target.id)
    if (target.kind === 'bed') await hospitalApi.deleteBed(target.id)
    await loadAll()
  }

  return (
    <>
    <div className="min-h-screen bg-slate-50/50 p-4 lg:p-6">
      {/* ── Clean Header ── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <BedDouble className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Bed Management</h1>
            <p className="text-xs text-slate-500">Floors · Rooms · Wards · Availability</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={() => setOpenAddBed(true)} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700">
            <Plus className="h-3.5 w-3.5" />
            Add Bed
          </button>
          <button onClick={() => setOpenManageBeds(true)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
            <Settings2 className="h-3.5 w-3.5" />
            Manage
          </button>
        </div>
      </div>

      {/* ── Compact Stats ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, icon: LayoutGrid, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Available', value: stats.avail, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Occupied', value: stats.occ, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Occupancy', value: `${stats.occRate}%`, icon: Building2, color: 'text-amber-600', bg: 'bg-amber-50' }
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3.5">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.bg} ${s.color}`}>
              <s.icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-slate-500">{s.label}</div>
              <div className="text-lg font-bold text-slate-900">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search bed, patient, MRN..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:outline-none"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={filterFloor} onChange={e => setFilterFloor(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:outline-none">
              <option value="all">All Floors</option>
              {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:outline-none">
              <option value="all">All Rooms</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select value={filterWard} onChange={e => setFilterWard(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:outline-none">
              <option value="all">All Wards</option>
              {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:outline-none">
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
            </select>
            <div className="h-6 w-px bg-slate-200" />
            <button onClick={() => setOpenAddFloor(true)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50" title="Add Floor"><Layers className="h-4 w-4" /></button>
            <button onClick={() => setOpenAddRoom(true)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50" title="Add Room"><Home className="h-4 w-4" /></button>
            <button onClick={() => setOpenAddWard(true)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50" title="Add Ward"><Building2 className="h-4 w-4" /></button>
            <button onClick={() => setOpenManageFloors(true)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50" title="Manage Floors/Rooms/Wards"><Settings2 className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* ── Bed Groups ── */}
      <div className="space-y-8">
        {Object.entries(groups).map(([key, group]) => (
          <div key={key}>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-5 w-1 rounded-full bg-blue-500" />
              <h2 className="text-sm font-semibold text-slate-800">{group.title}</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{group.items.length}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {group.items.map(b => (
                <div
                  key={b.id}
                  onClick={() => { if (b.status==='occupied' && b.occupantEncounterId) navigate(`/hospital/patient/${b.occupantEncounterId}`) }}
                  className={`group relative flex flex-col rounded-xl border bg-white p-4 transition-all ${
                    b.status === 'occupied'
                      ? 'border-rose-200/80 hover:border-rose-300 hover:shadow-lg hover:shadow-rose-100/50'
                      : 'border-emerald-200/80 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100/50'
                  } ${b.status==='occupied' && b.occupantEncounterId ? 'cursor-pointer' : ''}`}
                >
                  {/* Top: label + status dot */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-2xl font-bold text-slate-900">{b.label}</div>
                      <div className="text-[11px] text-slate-400">{b.category || 'Standard'}</div>
                    </div>
                    <div className={`mt-1 h-2.5 w-2.5 rounded-full ${b.status === 'occupied' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  </div>

                  {/* Occupant info */}
                  {b.status === 'occupied' ? (
                    <div className="mt-3 rounded-lg bg-slate-50 p-2.5">
                      <div className="truncate text-xs font-semibold text-slate-800">{b.occupantName || 'Unknown'}</div>
                      <div className="text-[11px] text-slate-500">MRN: {b.occupantMrn || 'N/A'}</div>
                      {b.occupantEncounterId && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-blue-600">
                          <span>View Patient</span>
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center justify-center rounded-lg bg-slate-50 p-3">
                      <span className="text-[11px] font-medium text-slate-400">Available</span>
                    </div>
                  )}

                  {/* Free bed action */}
                  {b.status === 'occupied' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmFreeBed(b.id) }}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-rose-50 py-2 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-100"
                    >
                      <DoorClosed className="h-3.5 w-3.5" />
                      Free Bed
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {!Object.keys(groups).length && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <BedDouble className="mb-3 h-12 w-12 text-slate-200" />
            <p className="text-sm font-medium">No beds found</p>
            <p className="text-xs">Add floors, rooms/wards, and beds to get started</p>
          </div>
        )}
      </div>

      <Hospital_AddFloorModal open={openAddFloor} onClose={() => setOpenAddFloor(false)} onSave={saveFloor} />
      <Hospital_ManageFloorsModal open={openManageFloors} onClose={() => setOpenManageFloors(false)} floors={floors} onUpdate={updateFloor} onDelete={removeFloor} />

      <Hospital_AddRoomModal open={openAddRoom} onClose={() => setOpenAddRoom(false)} floors={floors} onSave={saveRoom} />

      <Hospital_AddWardModal open={openAddWard} onClose={() => setOpenAddWard(false)} floors={floors} onSave={saveWard} />

      <Hospital_ManageRoomsModal open={openManageRooms} onClose={() => setOpenManageRooms(false)} rooms={rooms} floors={floors} floorsMap={floorsMap} onUpdate={updateRoom} onDelete={removeRoom} />

      <Hospital_ManageWardsModal open={openManageWards} onClose={() => setOpenManageWards(false)} wards={wards} floors={floors} floorsMap={floorsMap} onUpdate={updateWard} onDelete={removeWard} />

      <Hospital_AddBedModal open={openAddBed} onClose={() => setOpenAddBed(false)} floors={floors} roomsByFloor={roomsByFloor} wardsByFloor={wardsByFloor} onSave={saveBeds} />
      <Hospital_ManageBedsModal open={openManageBeds} onClose={() => setOpenManageBeds(false)} beds={beds} floorsMap={floorsMap} rooms={rooms} wards={wards} onUpdate={updateBed} onDelete={removeBed} />
    </div>
    <ConfirmDialog
      open={!!confirmDelete}
      title="Confirm"
      message={confirmDelete?.kind ? `Delete this ${confirmDelete.kind}?` : 'Delete this item?'}
      confirmText="Delete"
      onCancel={()=>setConfirmDelete(null)}
      onConfirm={confirmDeleteNow}
    />
    <ConfirmDialog
      open={!!confirmFreeBed}
      title="Free Bed"
      message="Mark this bed as available? This will remove the current occupant assignment."
      confirmText="Free Bed"
      onCancel={()=>setConfirmFreeBed(null)}
      onConfirm={()=>freeBed(confirmFreeBed!)}
    />
    </>
  )
}
