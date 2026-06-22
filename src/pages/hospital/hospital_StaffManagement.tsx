import { useEffect, useMemo, useState } from 'react'
import Hospital_AddStaffDialog, { type PharmacyStaff } from '../../components/hospital/hospital_AddStaffDialog'
import Hospital_StaffEarningsDialog from '../../components/hospital/hospital_StaffEarningsDialog'
import { hospitalApi } from '../../utils/api'
import { 
  Phone, 
  Clock, 
  User, 
  Trash2, 
  PlusCircle, 
  RefreshCw, 
  ChevronDown, 
  Search,
  CheckCircle2,
  XCircle,
  Fingerprint
} from 'lucide-react'
import SearchableSelect from '../../components/common/SearchableSelect'

type Shift = { id: string; name: string }
type BiometricLink = { deviceId: string; enrollId: string; enrollName: string }
type DeviceUser = { enrollId: string; name?: string }
type StaffRow = PharmacyStaff & { 
  biometric?: BiometricLink | null; 
  leaveQuotas?: { annual: number; casual: number; sick: number }; 
  leaveBalances?: { annual: number; casual: number; sick: number } 
}

export default function Hospital_StaffManagement(){
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<PharmacyStaff | null>(null)
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [allStaff, setAllStaff] = useState<StaffRow[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [reloadTick, setReloadTick] = useState(0)
  const [notice, setNotice] = useState<{ text: string; kind: 'success'|'error' } | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [earningsOpen, setEarningsOpen] = useState(false)
  const [earningsStaff, setEarningsStaff] = useState<{ id: string; name: string } | null>(null)

  const [fetchingBio, setFetchingBio] = useState(false)
  const [deviceUsers, setDeviceUsers] = useState<DeviceUser[]>([])
  const [loadingDeviceUsers, setLoadingDeviceUsers] = useState(false)
  const [deviceError, setDeviceError] = useState<string | null>(null)
  const [mappingStaffId, setMappingStaffId] = useState<string | null>(null)
  const [showBioPanel, setShowBioPanel] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All')
  const [sortField, setSortField] = useState<'id' | 'name'>('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  useEffect(()=>{
    let mounted = true
    ;(async () => {
      try {
        const [staffRes, shiftRes] = await Promise.all([
          (hospitalApi as any).listStaff({ 
            page, 
            limit, 
            q: searchQuery, 
            active: statusFilter === 'Active' ? true : statusFilter === 'Inactive' ? false : undefined 
          }),
          (hospitalApi as any).listShifts(),
        ])
        if (!mounted) return
        setTotalPages(Number(staffRes?.totalPages || 1))
        const rawShifts: any[] = (shiftRes?.items || shiftRes?.shifts || shiftRes || [])
        setShifts(rawShifts.map((x:any)=>({ id: x._id, name: x.name })))
      } catch (e) { console.error(e) }
    })()
    return ()=>{ mounted = false }
  }, [page, limit, reloadTick, searchQuery, statusFilter])

  // Fetch all staff once for mapping (searchable dropdown)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await (hospitalApi as any).listStaff({ limit: 0, active: true })
        if (!mounted) return
        const raw: any[] = (res?.staff || res?.items || res || [])
        setAllStaff(raw.map((x:any)=>({
          id: x._id,
          name: x.name,
          position: x.position || x.role || '',
          biometric: x.biometric || null,
          status: x.status || (x.active===false? 'Inactive' : 'Active'),
          phone: x.phone,
          salary: x.salary,
          joinDate: x.joinDate || '',
          address: x.address || '',
          shiftId: x.shiftId,
        })))
        console.log('Total staff for mapping:', raw.length)
      } catch (e) { console.error(e) }
    })()
    return () => { mounted = false }
  }, [reloadTick])

  // Fetch device users only when panel is opened
  useEffect(() => {
    if (!showBioPanel) return
    let mounted = true
    ;(async () => {
      try {
        setLoadingDeviceUsers(true)
        setDeviceError(null)
        const res = await (hospitalApi as any).listBiometricDeviceUsers()
        if (!mounted) return
        const users: DeviceUser[] = (res?.users || []).map((u:any)=>({ enrollId: String(u.enrollId||''), name: String(u.name||'') }))
        setDeviceUsers(users.filter(u => !!u.enrollId))
      } catch (e: any) {
        console.error(e)
        if (mounted) {
          setDeviceUsers([])
          setDeviceError(e?.message || String(e) || 'Biometric device unreachable')
        }
      } finally {
        if (mounted) setLoadingDeviceUsers(false)
      }
    })()
    return () => { mounted = false }
  }, [showBioPanel, reloadTick])

  const addStaff = async (s: PharmacyStaff) => {
    const res = await hospitalApi.createStaff({
      name: s.name,
      role: s.position as any,
      phone: s.phone,
      salary: s.salary,
      shiftId: s.shiftId,
      joinDate: s.joinDate,
      address: s.address,
      active: s.status !== 'Inactive',
      leaveQuotas: s.leaveQuotas,
      biometricEnrollId: s.biometricEnrollId,
    })
    const createdId = res?._id || res?.id || (res?.item?._id) || (res?.doc?._id)
    if (s.biometricEnrollId && createdId) {
      try { await (hospitalApi as any).connectStaffBiometric(createdId, { enrollId: s.biometricEnrollId, enrollName: s.name }) } catch (e) { console.error('Biometric map failed:', e) }
    }
    setReloadTick(t=>t+1)
  }

  const runFetch = async () => {
    try {
      setFetchingBio(true)
      try {
        await (hospitalApi as any).fetchBiometricNow()
      } catch (backendErr: any) {
        const msg = String(backendErr?.message || '').toLowerCase()
        if (msg.includes('unreachable') || msg.includes('biometric is disabled') || msg.includes('econnrefused') || msg.includes('503') || msg.includes('not set')) {
          try {
            await (hospitalApi as any).fetchBiometricViaLocal()
            setNotice({ text: 'Synced via local fetcher', kind: 'success' })
            setReloadTick(t=>t+1)
            return
          } catch (localErr: any) {
            throw new Error('Device unreachable')
          }
        }
        throw backendErr
      }
      setNotice({ text: 'Sync started…', kind: 'success' })
      setReloadTick(t=>t+1)
    } catch (e: any) {
      setNotice({ text: e?.message || 'Failed to fetch biometric logs', kind: 'error' })
    } finally {
      setFetchingBio(false)
      setTimeout(()=> setNotice(null), 3500)
    }
  }

  const handleMapStaff = async (enrollId: string, staffId: string) => {
    if (!enrollId || !staffId) return
    try {
      setMappingStaffId(staffId)
      const selectedUser = deviceUsers.find(u => u.enrollId === enrollId)
      await (hospitalApi as any).connectStaffBiometric(staffId, { enrollId, enrollName: selectedUser?.name || '' })
      setNotice({ text: 'Staff mapped successfully', kind: 'success' })
      setReloadTick(t=>t+1)
    } catch (e) {
      setNotice({ text: 'Failed to map staff', kind: 'error' })
    } finally {
      setMappingStaffId(null)
      setTimeout(()=> setNotice(null), 2500)
    }
  }

  const getStaffOptions = (currentMappedId?: string) => {
    const list = allStaff.filter(s => !s.biometric?.enrollId || s.id === currentMappedId)
    const options = [
      { value: '', label: 'Select staff...' },
      ...list.map(s => ({ value: s.id, label: s.name }))
    ]
    console.log('Dropdown options count:', options.length)
    return options
  }

  const requestDelete = (id: string) => { setDeleteId(id); setDeleteOpen(true) }
  const performDelete = async () => {
    const id = deleteId; if (!id) { setDeleteOpen(false); return }
    try { await hospitalApi.deleteStaff(id); setReloadTick(t=>t+1); setNotice({ text: 'Staff deleted', kind: 'success' }) }
    catch(e){ console.error(e); setNotice({ text: 'Failed to delete staff', kind: 'error' }) }
    finally { setDeleteOpen(false); setDeleteId(null); setTimeout(()=> setNotice(null), 2500) }
  }
  const openEdit = (row: StaffRow) => { setEditing({ ...row, biometricEnrollId: row.biometric?.enrollId || '' }); setEditOpen(true) }
  const saveEdit = async (updated: PharmacyStaff) => {
    await hospitalApi.updateStaff(updated.id, {
      name: updated.name,
      role: updated.position as any,
      phone: updated.phone,
      salary: updated.salary,
      shiftId: updated.shiftId,
      joinDate: updated.joinDate,
      address: updated.address,
      active: updated.status !== 'Inactive',
      leaveQuotas: updated.leaveQuotas,
      biometricEnrollId: updated.biometricEnrollId,
    })
    if (updated.biometricEnrollId) {
      try { await (hospitalApi as any).connectStaffBiometric(updated.id, { enrollId: updated.biometricEnrollId, enrollName: updated.name }) } catch (e) { console.error('Biometric map failed:', e) }
    }
    setReloadTick(t=>t+1)
  }

  const filteredStaff = useMemo(() => {
    // Note: We use allStaff here instead of staff to allow global sorting/searching 
    // across all records regardless of the limit selector.
    const list = allStaff.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (s.position || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'All' || s.status === statusFilter
      return matchesSearch && matchesStatus
    })

    // Sort
    const sorted = [...list].sort((a, b) => {
      let comparison = 0
      if (sortField === 'id') {
        const aid = Number(a.biometric?.enrollId || 999999)
        const bid = Number(b.biometric?.enrollId || 999999)
        comparison = aid - bid
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name)
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    // Manual Pagination on the frontend since we are using allStaff for global sorting
    const startIndex = (page - 1) * limit
    return sorted.slice(startIndex, startIndex + limit)
  }, [allStaff, searchQuery, statusFilter, sortField, sortOrder, page, limit])

  // Update total pages based on filtered allStaff count
  useEffect(() => {
    const list = allStaff.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (s.position || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'All' || s.status === statusFilter
      return matchesSearch && matchesStatus
    })
    setTotalPages(Math.ceil(list.length / limit) || 1)
  }, [allStaff, searchQuery, statusFilter, limit])

  const toggleSort = (field: 'id' | 'name') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  return (
    <div className="space-y-6 p-4 max-w-[1600px] mx-auto">
      {notice && (
        <div className={`fixed top-4 right-4 z-[100] animate-in fade-in slide-in-from-top-4 duration-300 rounded-lg border px-4 py-3 shadow-lg flex items-center gap-3 ${notice.kind==='success'? 'border-emerald-200 bg-white text-emerald-800' : 'border-rose-200 bg-white text-rose-800'}`}>
          {notice.kind === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-rose-500" />}
          <span className="font-medium">{notice.text}</span>
        </div>
      )}

      {/* Biometric Device Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all">
        <button 
          onClick={() => setShowBioPanel(!showBioPanel)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Fingerprint className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-800">Biometric Device (K70)</h3>
              <p className="text-xs text-slate-500">Click arrow to {showBioPanel ? 'hide' : 'view'} machine users</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              {showBioPanel ? 'Close Users' : 'View Users'}
            </span>
            <div className={`p-1.5 rounded-full transition-all ${showBioPanel ? 'bg-blue-50 text-blue-600 rotate-180' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
              <ChevronDown className="h-5 w-5" />
            </div>
          </div>
        </button>
        
        {showBioPanel && (
          <div className="px-6 pb-6 pt-2 space-y-4">
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-sm font-semibold text-slate-700 font-mono">ZKTeco K70 Device</span>
              </div>
              <button 
                onClick={runFetch} 
                disabled={fetchingBio}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 ${fetchingBio ? 'animate-spin' : ''}`} />
                {fetchingBio ? 'Syncing...' : 'Refresh'}
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 pb-64">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Enroll ID</th>
                    <th className="px-4 py-3 font-medium">Device Name</th>
                    <th className="px-4 py-3 font-medium">Mapped To</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingDeviceUsers ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Loading device users...</td></tr>
                  ) : deviceError ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-rose-500">
                        <div className="font-semibold mb-1">Failed to connect to biometric device</div>
                        <div className="text-xs text-slate-500">Reason: {deviceError}</div>
                        <div className="text-xs text-slate-400 mt-2 font-sans">
                          Make sure the device (IP: 192.168.18.100, Port: 4370) is powered on, connected to the same network, and that Windows Firewall is not blocking port 4370.
                        </div>
                      </td>
                    </tr>
                  ) : deviceUsers.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No device users found</td></tr>
                  ) : deviceUsers.map(u => {
                    const mappedStaff = allStaff.find(s => s.biometric?.enrollId === u.enrollId)
                    return (
                      <tr key={u.enrollId} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono text-slate-600">{u.enrollId}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{u.name || '—'}</td>
                        <td className="px-4 py-3">
                          {mappedStaff ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <CheckCircle2 className="h-3 w-3" /> {mappedStaff.name}
                            </span>
                          ) : (
                            <span className="text-slate-400">Not mapped</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right max-w-[200px]">
                          <SearchableSelect
                            value={mappedStaff?.id || ""}
                            onChange={(val) => handleMapStaff(u.enrollId, val)}
                            options={getStaffOptions(mappedStaff?.id)}
                            placeholder="Search staff..."
                            className="text-xs"
                            disabled={!!mappingStaffId}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              Instructions: Enroll fingerprints directly on the K70 device. You can map staff by selecting them above, or by entering the Enroll ID in the Add/Edit Staff dialog. In Cloud mode, the device user list may not load — use the Enroll ID shown on the physical device instead.
            </p>
          </div>
        )}
      </div>

      {/* Main Staff List Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="radio" name="status" checked={statusFilter === 'Active'} onChange={() => setStatusFilter('Active')} className="hidden" />
                <div className={`h-3 w-3 rounded-full ${statusFilter === 'Active' ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-slate-200 group-hover:bg-slate-300'}`}></div>
                <span className={`text-xs font-medium ${statusFilter === 'Active' ? 'text-slate-900' : 'text-slate-500'}`}>Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="radio" name="status" checked={statusFilter === 'Inactive'} onChange={() => setStatusFilter('Inactive')} className="hidden" />
                <div className={`h-3 w-3 rounded-full ${statusFilter === 'Inactive' ? 'bg-slate-400 ring-4 ring-slate-100' : 'bg-slate-200 group-hover:bg-slate-300'}`}></div>
                <span className={`text-xs font-medium ${statusFilter === 'Inactive' ? 'text-slate-900' : 'text-slate-500'}`}>Inactive</span>
              </label>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={limit} 
            onChange={e=>{ setLimit(parseInt(e.target.value)); setPage(1) }} 
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={30}>30 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
            <option value={150}>150 per page</option>
            <option value={10000}>All per page</option>
          </select>
          <button 
            onClick={()=>setAddOpen(true)}
            className="flex items-center gap-2 px-6 py-2 bg-linear-to-r from-fuchsia-600 to-purple-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
          >
            <PlusCircle className="h-5 w-5" />
            Add Staff
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th 
                  className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => toggleSort('id')}
                >
                  <div className="flex items-center gap-1">
                    Biometric ID {sortField === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Name / Role {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Phone / Join Date</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Shift</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 text-center">Leaves</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Salary</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.map(s => (
                <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    {s.biometric?.enrollId ? (
                      <div className="flex items-center gap-2">
                        <div className="bg-amber-50 p-1.5 rounded-lg">
                          <Fingerprint className="h-4 w-4 text-amber-500" />
                        </div>
                        <span className="font-mono font-bold text-slate-700">{s.biometric.enrollId}</span>
                      </div>
                    ) : (
                      <span className="text-slate-300 font-mono">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shrink-0 ${s.status === 'Active' ? 'bg-linear-to-br from-fuchsia-400 to-purple-500' : 'bg-slate-300'}`}>
                        {s.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate">{s.name}</div>
                        <div className="text-xs text-slate-500 truncate">{s.position || 'No Position'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <div className="text-slate-700 font-medium flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {s.phone || '—'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Joined: {s.joinDate ? new Date(s.joinDate).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-medium">
                        {s.shiftId ? (shifts.find(x=>x.id===s.shiftId)?.name || 'Unknown') : '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="flex items-center justify-between w-20">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Annual</span>
                        <span className="text-xs font-bold text-slate-700">{(s.leaveBalances?.annual || 0)}/{(s.leaveQuotas?.annual || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between w-20">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Casual</span>
                        <span className="text-xs font-bold text-slate-700">{(s.leaveBalances?.casual || 0)}/{(s.leaveQuotas?.casual || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between w-20">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Sick</span>
                        <span className="text-xs font-bold text-slate-700">{(s.leaveBalances?.sick || 0)}/{(s.leaveQuotas?.sick || 0)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">
                      {s.salary ? `${Number(s.salary).toLocaleString()} PKR` : '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openEdit(s)}
                        className="px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={()=>{ setEarningsStaff({ id: s.id, name: s.name }); setEarningsOpen(true) }}
                        className="px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                      >
                        Earning
                      </button>
                      <button 
                        onClick={() => requestDelete(s.id)}
                        className="px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-rose-600 bg-rose-50 hover:bg-rose-100 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-full mb-4">
                      <User className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">No staff found</h3>
                    <p className="text-xs text-slate-500">Try adjusting your search or filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-8">
          <button 
            disabled={page <= 1} 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors"
          >
            <ChevronDown className="h-5 w-5 rotate-90 text-slate-600" />
          </button>
          <div className="text-sm font-bold text-slate-700">
            Page {page} of {totalPages}
          </div>
          <button 
            disabled={page >= totalPages} 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors"
          >
            <ChevronDown className="h-5 w-5 -rotate-90 text-slate-600" />
          </button>
        </div>
      )}

      <Hospital_AddStaffDialog open={addOpen} onClose={()=>setAddOpen(false)} onSave={addStaff} />
      <Hospital_AddStaffDialog open={editOpen} onClose={()=>setEditOpen(false)} onSave={saveEdit} initial={editing ?? undefined} title="Edit Staff" submitLabel="Save" />
      {earningsStaff && (
        <Hospital_StaffEarningsDialog
          open={earningsOpen}
          onClose={()=>{ setEarningsOpen(false); setEarningsStaff(null) }}
          staff={{ id: earningsStaff.id, name: earningsStaff.name }}
        />
      )}

      {deleteOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="h-8 w-8 text-rose-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Are you sure?</h3>
            <p className="text-slate-500 mb-6 text-sm">This action will permanently delete this staff member and all associated records.</p>
            <div className="flex items-center gap-3">
              <button 
                onClick={()=>{ setDeleteOpen(false); setDeleteId(null) }} 
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={performDelete} 
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// shiftName helper removed
